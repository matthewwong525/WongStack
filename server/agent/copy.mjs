// A copy of this server's home folder straight to a new server of the
// owner's, for the agent (./agent.mjs). The new server makes an X25519 key
// pair and keeps the private half (`copy-key`). The old one listens on one
// port, which the control plane opened to the new server's address only,
// takes one connection that proves the pull token, and streams its home
// folder through `tar`, locked to the new server's key (`copy-send`). The new
// one pulls it, unlocks it, and unpacks it as wong (`copy-restore`). Nothing
// passes through the control plane, and no key or token is ever logged or
// reported: only the public key is.
//
// The lock: an ephemeral X25519 key and the new server's give a shared
// secret; HKDF-SHA256 (salt: the copy's id) makes a 32-byte AES-256-GCM key.
// The stream is a header (format version, the ephemeral public key, the part
// size), then frames of a flag byte (1 on the last), the length, the sealed
// part, and its tag. Each part's nonce counts up from zero, and the frame's
// head is its additional data, so a flipped, dropped, reordered, or cut-off
// part fails before `tar` gets anything past it.
import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, timingSafeEqual } from "node:crypto";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import { connect, createServer } from "node:net";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const HOME = "/home/wong";
/** The new server's private key, readable by root only, deleted after a good restore. */
export const KEY_FILE = "/etc/wongstack/copy.key";
/** The plaintext in each sealed part. */
export const PART = 64 * 1024 * 1024;
/** A copy's door stays open 6 hours at most; the jobs give up with it. */
export const COPY_TIMEOUT_MS = 6 * 60 * 60_000;
const VERSION = 1;
/** An X25519 public key as SPKI DER is 44 bytes. */
const SPKI_LENGTH = 44;
const HEADER = 1 + SPKI_LENGTH + 4;
const FRAME_HEAD = 5;
const TAG = 16;
/** How long a connection has to send the pull token. */
const TOKEN_WAIT_MS = 10_000;
/** The new server tries the old one this often, this many times, while the old one gets its job: 10 minutes. */
export const CONNECT_WAIT_MS = 5_000;
export const CONNECT_TRIES = 120;

/**
 * What the copy leaves out, under the home folder, without opening it: the
 * AI logins, Paseo's identity, sign-in, push tokens, and a running daemon's
 * state, and what rebuilds itself. `node_modules` goes at any depth.
 */
export const EXCLUDES = [
  ".claude/.credentials.json",
  ".codex/auth.json",
  ".local/share/opencode/auth.json",
  ".paseo/daemon-keypair.json",
  ".paseo/server-id",
  ".paseo/local-credential",
  ".paseo/cli-client-id",
  ".paseo/push-tokens.json",
  ".paseo/runtime",
  ".paseo/paseo.pid",
  ".paseo/*.log",
  ".cache",
  ".npm",
  ".agent-browser/browsers",
];
const ANYWHERE = ["node_modules"];

/** `tar`'s arguments to pack `home`: the home paths are anchored at its top, and `node_modules` matches anywhere. */
export const packArgs = (home) => [
  "-czf",
  "-",
  "--anchored",
  ...EXCLUDES.map((path) => `--exclude=./${path}`),
  "--no-anchored",
  ...ANYWHERE.map((name) => `--exclude=${name}`),
  "-C",
  home,
  ".",
];

const HEX64 = /^[0-9a-f]{64}$/;
const COPY_ID = /^[0-9a-f-]{36}$/;
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const KEY = /^MCowBQYDK2VuAyEA[A-Za-z0-9+/]{43}=$/;
const validPort = (port) => Number.isInteger(port) && port > 0 && port < 65536;

/** A part's nonce: the count, big-endian, in 12 bytes. */
function nonce(count) {
  const iv = Buffer.alloc(12);
  iv.writeBigUInt64BE(count, 4);
  return iv;
}

/** The AES-256-GCM key the two X25519 keys share for this copy. */
const sharedKey = (privateKey, publicKey, copyId) =>
  Buffer.from(hkdfSync("sha256", diffieHellman({ privateKey, publicKey }), Buffer.from(copyId), "wongstack-copy", 32));

const spkiOf = (key) => key.export({ type: "spki", format: "der" });
const publicKeyOf = (der) => createPublicKey({ key: der, format: "der", type: "spki" });

/** Bytes as they arrive, taken in whole pieces: joined once per piece, not once per packet. */
function byteQueue() {
  let parts = [];
  let size = 0;
  return {
    get size() {
      return size;
    },
    push(data) {
      parts.push(data);
      size += data.length;
    },
    /** The next `n` bytes, or null until that many have come. */
    take(n) {
      if (size < n) return null;
      const all = parts.length === 1 ? parts[0] : Buffer.concat(parts);
      parts = [all.subarray(n)];
      size -= n;
      return all.subarray(0, n);
    },
  };
}

/** Locks a stream to the new server's public key (SPKI, base64), in parts of `part` bytes. */
export function lockStream(publicKey, copyId, part = PART) {
  const ephemeral = generateKeyPairSync("x25519");
  const key = sharedKey(ephemeral.privateKey, publicKeyOf(Buffer.from(publicKey, "base64")), copyId);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(part);
  const queue = byteQueue();
  let count = 0n;
  const frame = (plain, last) => {
    const head = Buffer.alloc(FRAME_HEAD);
    head[0] = last ? 1 : 0;
    head.writeUInt32BE(plain.length, 1);
    const cipher = createCipheriv("aes-256-gcm", key, nonce(count++));
    cipher.setAAD(head);
    return Buffer.concat([head, cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  };
  const stream = new Transform({
    transform(data, _encoding, done) {
      queue.push(data);
      for (let plain; (plain = queue.take(part)); ) this.push(frame(plain, false));
      done();
    },
    flush(done) {
      this.push(frame(queue.take(queue.size), true));
      done();
    },
  });
  stream.push(Buffer.concat([Buffer.from([VERSION]), spkiOf(ephemeral.publicKey), size]));
  return stream;
}

/** Unlocks a stream `lockStream` made, with the new server's private key; any damage is an error. */
export function unlockStream(privateKey, copyId) {
  const queue = byteQueue();
  let key = null;
  let part = 0;
  let head = null;
  let count = 0n;
  let ended = false;
  const bad = (why) => new Error(`bad copy: ${why}`);
  /** Reads the header once, then one frame; false until enough has come. */
  const step = (push) => {
    if (ended) {
      if (queue.size) throw bad("data after the end");
      return false;
    }
    if (!key) {
      const header = queue.take(HEADER);
      if (!header) return false;
      if (header[0] !== VERSION) throw bad("version");
      key = sharedKey(privateKey, publicKeyOf(header.subarray(1, 1 + SPKI_LENGTH)), copyId);
      part = header.readUInt32BE(1 + SPKI_LENGTH);
      return true;
    }
    head ??= queue.take(FRAME_HEAD);
    if (!head) return false;
    const length = head.readUInt32BE(1);
    if (head[0] > 1 || length > part) throw bad("frame");
    const body = queue.take(length + TAG);
    if (!body) return false;
    const decipher = createDecipheriv("aes-256-gcm", key, nonce(count++));
    decipher.setAAD(head);
    decipher.setAuthTag(body.subarray(length));
    push(Buffer.concat([decipher.update(body.subarray(0, length)), decipher.final()]));
    ended = head[0] === 1;
    head = null;
    return true;
  };
  return new Transform({
    transform(data, _encoding, done) {
      queue.push(data);
      try {
        while (step((plain) => this.push(plain)));
        done();
      } catch (error) {
        done(error);
      }
    },
    flush(done) {
      done(ended ? null : bad("cut off"));
    },
  });
}

/** Resolves when a child process exits with one of `codes`, and rejects otherwise. */
const exited = (child, codes = [0]) =>
  new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (codes.includes(code) ? resolve() : reject(new Error(`${child.spawnfile} exited with ${code}`))));
  });

/** The new server makes its key pair, keeps the private half for root alone, and reports the public half. */
export async function copyKey({ keyFile = KEY_FILE } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  await writeFile(keyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  await chmod(keyFile, 0o600);
  return { status: "done", result: spkiOf(publicKey).toString("base64") };
}

/** A connection's address, without the IPv4-in-IPv6 prefix a dual-stack listener gives it. */
const addressOf = (socket) => String(socket.remoteAddress).replace(/^::ffff:/, "");

/** Whether the connection's first bytes are the pull token, within 10 seconds. */
function provesToken(socket, token) {
  return new Promise((resolve) => {
    const queue = byteQueue();
    const expected = Buffer.from(token);
    const end = (ok) => {
      clearTimeout(timer);
      socket.removeListener("data", onData);
      socket.pause();
      resolve(ok);
    };
    const onData = (data) => {
      queue.push(data);
      const sent = queue.take(expected.length);
      if (sent) end(timingSafeEqual(sent, expected) && queue.size === 0);
    };
    const timer = setTimeout(() => end(false), TOKEN_WAIT_MS);
    socket.on("data", onData);
    socket.on("error", () => end(false));
    socket.on("close", () => end(false));
  });
}

/**
 * The old server: listens on `port` for the new server at `peer`, and sends
 * its home folder, locked, to the first connection from there that proves
 * the pull token, then stops listening. Any other connection is closed with
 * nothing sent, and the listener waits on, until the job's time runs out.
 */
export function copySend(job, { home = HOME, part = PART, timeoutMs = COPY_TIMEOUT_MS, spawnFn = spawn } = {}) {
  const { copyId, publicKey, port, peer, pullToken } = job ?? {};
  if (!COPY_ID.test(copyId) || !KEY.test(publicKey) || !validPort(port) || !IPV4.test(peer) || !HEX64.test(pullToken)) return Promise.resolve({ status: "rejected" });
  return new Promise((resolve) => {
    let taken = false;
    const finish = (status) => {
      clearTimeout(timer);
      server.close();
      resolve({ status });
    };
    const send = async (socket) => {
      const tar = spawnFn("tar", packArgs(home), { stdio: ["ignore", "pipe", "ignore"] });
      // tar's 1 means a file changed while it was read: a live home folder, still a good copy.
      await Promise.all([pipeline(tar.stdout, lockStream(publicKey, copyId, part), socket), exited(tar, [0, 1])]);
    };
    const server = createServer(async (socket) => {
      socket.on("error", () => undefined);
      if (taken || addressOf(socket) !== peer || !(await provesToken(socket, pullToken)) || taken) return socket.destroy();
      taken = true;
      server.close();
      send(socket).then(
        () => finish("done"),
        () => finish("failed"),
      );
    });
    const timer = setTimeout(() => finish("failed"), timeoutMs);
    server.on("error", () => finish("failed"));
    server.listen(port);
  });
}

/** A connection to the old server, tried every `waitMs` while it gets its job and starts listening. */
async function reach(host, port, tries, waitMs) {
  for (let left = tries; ; left--) {
    try {
      return await new Promise((resolve, reject) => {
        const socket = connect(port, host, () => resolve(socket));
        socket.once("error", reject);
      });
    } catch (error) {
      if (left <= 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

/**
 * The new server: stops Paseo, pulls the copy from the old server with the
 * pull token, unlocks it, and unpacks it into the home folder as wong. After
 * a good restore it deletes its private key. Paseo starts again either way.
 */
export async function copyRestore(job, exec, options = {}) {
  const { home = HOME, keyFile = KEY_FILE, user = "wong", tries = CONNECT_TRIES, waitMs = CONNECT_WAIT_MS, spawnFn = spawn } = options;
  const { copyId, host, port, pullToken } = job ?? {};
  if (!COPY_ID.test(copyId) || !IPV4.test(host) || !validPort(port) || !HEX64.test(pullToken)) return { status: "rejected" };
  await exec("systemctl", ["stop", "paseo.service"]);
  try {
    const privateKey = createPrivateKey(await readFile(keyFile));
    const socket = await reach(host, port, tries, waitMs);
    socket.write(pullToken);
    const unpack = ["tar", "-xzf", "-", "-C", home];
    const [file, ...args] = user ? ["runuser", "-u", user, "--", ...unpack] : unpack;
    const tar = spawnFn(file, args, { stdio: ["pipe", "ignore", "ignore"] });
    await Promise.all([pipeline(socket, unlockStream(privateKey, copyId), tar.stdin), exited(tar)]);
    await rm(keyFile, { force: true });
    return { status: "done" };
  } catch {
    return { status: "failed" };
  } finally {
    await exec("systemctl", ["start", "paseo.service"]).catch(() => undefined);
  }
}
