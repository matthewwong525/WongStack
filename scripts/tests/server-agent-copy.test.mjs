// Tests for server/agent/copy.mjs: a real copy between a sender and a receiver on
// localhost, through real `tar`, with temp home folders, and the lock's
// refusals of a damaged stream.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createPrivateKey, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { afterEach, beforeEach, test } from "node:test";

import { EXCLUDES, copyKey, copyRestore, copySend, lockStream, packArgs, unlockStream } from "../../server/agent/copy.mjs";

const COPY_ID = "0f0e0d0c-0b0a-4908-8706-050403020100";
const TOKEN = "e".repeat(64);
let dir;
let keyFile;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "copy-"));
  keyFile = join(dir, "copy.key");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Writes `files` ({path: text}) under `root`. */
function write(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

/** A port nothing listens on now. */
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** A fake `run`: records each command. */
function fakeExec() {
  const calls = [];
  return { calls, exec: async (file, args) => void calls.push([file, ...args].join(" ")) };
}

/** Connects to the sender, sends `token`, and resolves with every byte it got back. */
function fetchCopy(port, token = TOKEN) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const socket = connect(port, "127.0.0.1", () => socket.write(token));
    socket.on("data", (data) => chunks.push(data));
    socket.on("close", () => resolve(Buffer.concat(chunks)));
    socket.on("error", reject);
  });
}

/** Waits until the sender listens. */
async function listening(port) {
  for (;;) {
    const up = await new Promise((resolve) => {
      const socket = connect(port, "127.0.0.1", () => (socket.destroy(), resolve(true)));
      socket.on("error", () => resolve(false));
    });
    if (up) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const HOME_FILES = {
  "shop/README.md": "the repo\n",
  "shop/draft.txt": "not committed yet\n",
  "shop/node_modules/left/index.js": "packages\n",
  ".claude/.credentials.json": "CLAUDE-LOGIN",
  ".claude/projects/chat.jsonl": "a past chat\n",
  ".codex/auth.json": "CHATGPT-LOGIN",
  ".local/share/opencode/auth.json": "OPENCODE-LOGIN",
  ".config/gh/hosts.yml": "github sign-in\n",
  ".paseo/daemon-keypair.json": "OLD-PAIRING",
  ".paseo/server-id": "OLD-ID",
  ".paseo/local-credential": "OLD-LOCAL",
  ".paseo/cli-client-id": "OLD-CLI",
  ".paseo/push-tokens.json": "OLD-PUSH",
  ".paseo/runtime/state": "running\n",
  ".paseo/paseo.pid": "123",
  ".paseo/daemon.log": "log\n",
  ".paseo/agents/a.json": "an agent's chat\n",
  ".cache/big": "cache\n",
  ".npm/_cacache/x": "npm\n",
  ".agent-browser/browsers/chrome": "browser build\n",
  ".agent-browser/profiles/shop.json": "a saved browser login\n",
};

test("a copy goes from sender to receiver on localhost: everything but the left-out paths, and the key goes after", async () => {
  const [from, to] = [join(dir, "old"), join(dir, "new")];
  write(from, { ...HOME_FILES, "shop/big.bin": randomBytes(300_000).toString("hex") });
  write(to, { ".paseo/daemon-keypair.json": "NEW-PAIRING", ".claude/settings.json": "new server's own\n" });
  const key = await copyKey({ keyFile });
  assert.equal(key.status, "done");
  assert.equal(statSync(keyFile).mode & 0o777, 0o600);
  const port = await freePort();
  const tars = [];
  const spawnFn = (file, args, options) => (tars.push([file, ...args]), spawn(file, args, options));
  const sent = copySend({ copyId: COPY_ID, publicKey: key.result, port, peer: "127.0.0.1", pullToken: TOKEN }, { home: from, part: 4096, timeoutMs: 20_000, spawnFn });
  const { exec, calls } = fakeExec();
  const restored = await copyRestore({ copyId: COPY_ID, host: "127.0.0.1", port, pullToken: TOKEN }, exec, { home: to, keyFile, user: null, waitMs: 20, spawnFn });
  assert.deepEqual([await sent, restored], [{ status: "done" }, { status: "done" }]);
  assert.deepEqual(tars.sort(), [
    ["tar", ...packArgs(from)],
    ["tar", "-xzf", "-", "-C", to],
  ]);
  assert.equal(readFileSync(join(to, "shop/big.bin"), "utf8"), readFileSync(join(from, "shop/big.bin"), "utf8"));
  for (const path of ["shop/README.md", "shop/draft.txt", ".claude/projects/chat.jsonl", ".config/gh/hosts.yml", ".paseo/agents/a.json", ".agent-browser/profiles/shop.json"]) {
    assert.equal(readFileSync(join(to, path), "utf8"), HOME_FILES[path], path);
  }
  for (const path of [...EXCLUDES.filter((p) => !p.includes("*")), ".paseo/daemon.log", "shop/node_modules", ".npm/_cacache/x"]) {
    if (path === ".paseo/daemon-keypair.json") continue;
    assert.equal(existsSync(join(to, path)), false, path);
  }
  // The new server keeps its own pairing and settings.
  assert.equal(readFileSync(join(to, ".paseo/daemon-keypair.json"), "utf8"), "NEW-PAIRING");
  assert.equal(readFileSync(join(to, ".claude/settings.json"), "utf8"), "new server's own\n");
  assert.equal(existsSync(keyFile), false);
  assert.deepEqual(calls, ["systemctl stop paseo.service", "systemctl start paseo.service"]);
});

test("tar is told to leave out each login and identity file by its path from the home folder, so it never opens them", () => {
  const args = packArgs("/home/wong");
  assert.deepEqual(args.slice(0, 3), ["-czf", "-", "--anchored"]);
  for (const path of [".claude/.credentials.json", ".codex/auth.json", ".local/share/opencode/auth.json", ".paseo/daemon-keypair.json", ".paseo/server-id"]) {
    assert.ok(args.indexOf(`--exclude=./${path}`) > args.indexOf("--anchored"), path);
    assert.ok(args.indexOf(`--exclude=./${path}`) < args.indexOf("--no-anchored"), path);
  }
  assert.ok(args.indexOf("--exclude=node_modules") > args.indexOf("--no-anchored"));
  assert.deepEqual(args.slice(-3), ["-C", "/home/wong", "."]);
});

test("the sender closes a connection from another address with nothing sent, and keeps listening until its time runs out", async () => {
  const port = await freePort();
  const key = await copyKey({ keyFile });
  let spawned = false;
  const sent = copySend(
    { copyId: COPY_ID, publicKey: key.result, port, peer: "192.0.2.1", pullToken: TOKEN },
    { home: dir, timeoutMs: 600, spawnFn: () => ((spawned = true), spawn("true")) },
  );
  await listening(port);
  assert.equal((await fetchCopy(port)).length, 0);
  assert.equal((await fetchCopy(port)).length, 0);
  assert.deepEqual(await sent, { status: "failed" });
  assert.equal(spawned, false);
});

test("the sender sends nothing for a wrong or late token, then sends once to the right one, and stops listening", async () => {
  const port = await freePort();
  write(dir, { "home/a.txt": "a\n" });
  const key = await copyKey({ keyFile });
  const sent = copySend({ copyId: COPY_ID, publicKey: key.result, port, peer: "127.0.0.1", pullToken: TOKEN }, { home: join(dir, "home"), timeoutMs: 20_000 });
  await listening(port);
  assert.equal((await fetchCopy(port, "f".repeat(64))).length, 0);
  assert.equal((await fetchCopy(port, `${TOKEN}x`)).length, 0);
  const copy = await fetchCopy(port);
  assert.ok(copy.length > 49);
  assert.deepEqual(await sent, { status: "done" });
  await assert.rejects(fetchCopy(port), { code: "ECONNREFUSED" });
});

test("the sender fails when tar fails, or when the port is taken", async () => {
  const key = await copyKey({ keyFile });
  const job = { copyId: COPY_ID, publicKey: key.result, peer: "127.0.0.1", pullToken: TOKEN };
  const port = await freePort();
  const sent = copySend({ ...job, port }, { home: join(dir, "missing"), timeoutMs: 20_000 });
  await listening(port);
  await fetchCopy(port);
  assert.deepEqual(await sent, { status: "failed" });
  const taken = createServer();
  await new Promise((resolve) => taken.listen(0, resolve));
  assert.deepEqual(await copySend({ ...job, port: taken.address().port }), { status: "failed" });
  taken.close();
});

test("the jobs reject a payload that is not a whole, valid copy job", async () => {
  const key = (await copyKey({ keyFile })).result;
  const send = { copyId: COPY_ID, publicKey: key, port: 47000, peer: "203.0.113.9", pullToken: TOKEN };
  for (const bad of [{ copyId: "../x" }, { publicKey: "a" }, { port: 0 }, { port: "47000" }, { peer: "evil.test" }, { pullToken: "short" }]) {
    assert.deepEqual(await copySend({ ...send, ...bad }), { status: "rejected" }, JSON.stringify(bad));
  }
  assert.deepEqual(await copySend(undefined), { status: "rejected" });
  const { exec, calls } = fakeExec();
  const restore = { copyId: COPY_ID, host: "203.0.113.9", port: 47000, pullToken: TOKEN };
  for (const bad of [{ copyId: "x" }, { host: "::1" }, { port: 70000 }, { pullToken: "z".repeat(64) }]) {
    assert.deepEqual(await copyRestore({ ...restore, ...bad }, exec), { status: "rejected" }, JSON.stringify(bad));
  }
  assert.deepEqual(await copyRestore(undefined, exec), { status: "rejected" });
  assert.deepEqual(calls, []);
});

test("a restore that fails keeps the key and starts Paseo again", async () => {
  const { exec, calls } = fakeExec();
  const job = { copyId: COPY_ID, host: "127.0.0.1", port: await freePort(), pullToken: TOKEN };
  // No key yet.
  assert.deepEqual(await copyRestore(job, exec, { home: dir, keyFile, user: null, tries: 1 }), { status: "failed" });
  // The old server never listens.
  await copyKey({ keyFile });
  assert.deepEqual(await copyRestore(job, exec, { home: dir, keyFile, user: null, tries: 2, waitMs: 10 }), { status: "failed" });
  assert.equal(existsSync(keyFile), true);
  assert.deepEqual(calls, Array(2).fill(["systemctl stop paseo.service", "systemctl start paseo.service"]).flat());
});

test("a restore unpacks as wong", async () => {
  const port = await freePort();
  await copyKey({ keyFile });
  // The old server takes the connection and closes it: the copy is cut off, and nothing is unpacked.
  const server = createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(port, resolve));
  const commands = [];
  const spawnFn = (file, args, options) => (commands.push([file, ...args]), spawn("true", [], options));
  const job = { copyId: COPY_ID, host: "127.0.0.1", port, pullToken: TOKEN };
  assert.deepEqual(await copyRestore(job, fakeExec().exec, { home: dir, keyFile, spawnFn }), { status: "failed" });
  server.close();
  assert.deepEqual(commands, [["runuser", "-u", "wong", "--", "tar", "-xzf", "-", "-C", dir]]);
});

test("no report holds the private key or the pull token", async () => {
  const key = await copyKey({ keyFile });
  const pem = readFileSync(keyFile, "utf8");
  assert.match(pem, /PRIVATE KEY/);
  assert.deepEqual(Object.keys(key), ["status", "result"]);
  assert.match(key.result, /^MCowBQYDK2VuAyEA[A-Za-z0-9+/]{43}=$/);
  assert.ok(!key.result.includes(pem.split("\n")[1]));
  const outcome = await copyRestore({ copyId: COPY_ID, host: "127.0.0.1", port: await freePort(), pullToken: TOKEN }, fakeExec().exec, { keyFile, user: null, tries: 1 });
  assert.equal(JSON.stringify(outcome).includes(TOKEN), false);
});

// ── the lock ──

/** A locked stream of `plain`, in parts of `part` bytes, and the private key that opens it. */
async function locked(plain, part = 16) {
  const key = await copyKey({ keyFile });
  const bytes = await buffer(Readable.from([plain]).pipe(lockStream(key.result, COPY_ID, part)));
  return { bytes, privateKey: createPrivateKey(readFileSync(keyFile)) };
}

const unlock = (bytes, privateKey, copyId = COPY_ID) => buffer(Readable.from([bytes]).pipe(unlockStream(privateKey, copyId)));

/** The header, and each frame's bytes, of a locked stream. */
function frames(bytes) {
  const out = [];
  for (let at = 49; at < bytes.length; ) {
    const end = at + 5 + bytes.readUInt32BE(at + 1) + 16;
    out.push(bytes.subarray(at, end));
    at = end;
  }
  return [bytes.subarray(0, 49), out];
}

test("the lock round-trips in parts, whatever the packets, and ends with a last part", async () => {
  const plain = randomBytes(100);
  const { bytes, privateKey } = await locked(plain);
  const [header, parts] = frames(bytes);
  assert.equal(header[0], 1);
  assert.equal(header.readUInt32BE(45), 16);
  assert.deepEqual(parts.map((f) => f[0]), [0, 0, 0, 0, 0, 0, 1]);
  assert.ok(!bytes.includes(plain.subarray(0, 16)));
  assert.deepEqual(await unlock(bytes, privateKey), plain);
  const trickle = Readable.from(Array.from(bytes, (b) => Buffer.from([b]))).pipe(unlockStream(privateKey, COPY_ID));
  assert.deepEqual(await buffer(trickle), plain);
  // An empty home folder is one empty last part.
  const empty = await locked(Buffer.alloc(0));
  assert.deepEqual(frames(empty.bytes)[1].map((f) => f.length), [21]);
  assert.deepEqual(await unlock(empty.bytes, empty.privateKey), Buffer.alloc(0));
});

test("a flipped byte, a dropped, reordered, or extra part, a cut-off stream, another copy's id, or another version fails", async () => {
  const { bytes, privateKey } = await locked(randomBytes(64));
  const [header, parts] = frames(bytes);
  const flipped = Buffer.from(bytes);
  flipped[60] ^= 1;
  const flag = Buffer.from(bytes);
  flag[49] = 1;
  const version = Buffer.from(bytes);
  version[0] = 2;
  const long = Buffer.from(bytes);
  long.writeUInt32BE(17, 50);
  for (const [name, damaged, copyId] of [
    ["flipped", flipped],
    ["last flag set early", flag],
    ["part longer than the header says", long],
    ["dropped", Buffer.concat([header, ...parts.slice(1)])],
    ["reordered", Buffer.concat([header, parts[1], parts[0], ...parts.slice(2)])],
    ["cut off", Buffer.concat([header, ...parts.slice(0, -1)])],
    ["cut in a part", bytes.subarray(0, bytes.length - 3)],
    ["extra after the end", Buffer.concat([bytes, parts[0]])],
    ["another copy", bytes, "1f0e0d0c-0b0a-4908-8706-050403020100"],
    ["another version", version],
  ]) {
    await assert.rejects(unlock(damaged, privateKey, copyId), undefined, name);
  }
});

test("another server's key cannot open the copy", async () => {
  const { bytes } = await locked(randomBytes(40));
  await copyKey({ keyFile });
  await assert.rejects(unlock(bytes, createPrivateKey(readFileSync(keyFile))));
});
