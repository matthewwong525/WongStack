// Tests for the Cloudflare token swap after a done install, in server/agent/agent.mjs:
// against a fake Cloudflare, and the `.env` write run for real in a temp folder.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { WRITE_TOKEN, installWongStack, startBackground } from "../../server/agent/agent.mjs";

const PASTED = "cf-pasted-value";
const NEW = "cf-new-value-only-the-server-holds";
const TOKEN_ID = "f".repeat(32);
const SOURCE_COMMIT = "efc5845ab16b12dc4ceab60e7c500663c2bf6b19";
const JOB = { token: PASTED, accountId: "0123456789abcdef0123456789abcdef", repo: "ada/wongstack", ownerEmail: "ada@example.com", sourceRepo: "matthewwong525/WongStack", sourceCommit: SOURCE_COMMIT, managementResult: { version: 1, recipient: { ownerId: "owner", vmId: "vm", jobId: "job", connectionId: "connection", generation: 1 }, path: "/home/wong/.local/state/wongstack/access-results/job.json", cleanupTokenIds: [] } };
const AS_WONG = "runuser -u wong -- env -i HOME=/home/wong USER=wong PATH=/home/wong/.local/bin:/usr/local/bin:/usr/bin:/bin";

/** A fake Cloudflare: each path answers from `replies`, as [status, result]; it records each call. */
function fakeCloudflare(replies = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    const path = url.replace("https://api.cloudflare.com/client/v4", "");
    calls.push({ method: init.method, path, auth: init.headers.Authorization, body: init.body });
    const [status, result] = replies[`${init.method} ${path}`] ?? [404, null];
    return new Response(JSON.stringify({ success: status === 200, result, errors: [] }), { status });
  };
  return { fetch, calls };
}

const WORKS = {
  "GET /user/tokens/verify": [200, { id: TOKEN_ID, status: "active" }],
  [`PUT /user/tokens/${TOKEN_ID}/value`]: [200, NEW],
};

/** A fake `run`: records each command and its stdin; commands containing `fail` exit non-zero. */
function fakeExec(fail = null) {
  const calls = [];
  const exec = async (file, args, options) => {
    const line = [file, ...args].join(" ");
    calls.push({ line, input: options?.input });
    if (fail && line.includes(fail) && args.includes("node")) throw Object.assign(new Error("exit 1"), { stdout: "" });
    return { stdout: args.includes("get-url") ? "https://github.com/matthewwong525/WongStack.git" : args.includes("rev-parse") ? SOURCE_COMMIT : args.includes("status") ? "" : "done\n" };
  };
  return { exec, calls };
}

test("after a done install, the token's value is swapped and the new one goes to the repo's .env on stdin only", async () => {
  const cf = fakeCloudflare(WORKS);
  const box = fakeExec();
  assert.deepEqual(await installWongStack(JOB, box.exec, cf.fetch), { status: "done", rolled: true });
  assert.deepEqual(
    cf.calls.map(({ method, path, auth, body }) => [method, path, auth, body]),
    [
      ["GET", "/user/tokens/verify", `Bearer ${PASTED}`, undefined],
      ["PUT", `/user/tokens/${TOKEN_ID}/value`, `Bearer ${PASTED}`, "{}"],
    ],
  );
  const write = box.calls.at(-1);
  assert.equal(write.line, `${AS_WONG} node --input-type=module -e ${WRITE_TOKEN} /home/wong/wongstack/.env`);
  assert.equal(write.input, NEW);
  assert.ok(box.calls.length > 2);
  for (const { line } of box.calls) for (const value of [PASTED, NEW]) assert.ok(!line.includes(value), "no value in an argument");
});

test("a failed swap still reports the install done, with rolled false and no detail", async () => {
  const cases = [
    ["a refused verify", { ...WORKS, "GET /user/tokens/verify": [401, null] }, null],
    ["a verify with no token id", { ...WORKS, "GET /user/tokens/verify": [200, { id: "nope" }] }, null],
    ["a refused roll", { ...WORKS, [`PUT /user/tokens/${TOKEN_ID}/value`]: [403, null] }, null],
    ["a roll with no value", { ...WORKS, [`PUT /user/tokens/${TOKEN_ID}/value`]: [200, ""] }, null],
    ["a roll with a value that is not text", { ...WORKS, [`PUT /user/tokens/${TOKEN_ID}/value`]: [200, { value: NEW }] }, null],
    ["a failed .env write", WORKS, "--input-type=module"],
  ];
  for (const [name, replies, fail] of cases) {
    const outcome = await installWongStack(JOB, fakeExec(fail).exec, fakeCloudflare(replies).fetch);
    assert.deepEqual(outcome, { status: "done", rolled: false }, name);
  }
});

test("a failed install swaps nothing", async () => {
  const cf = fakeCloudflare(WORKS);
  const outcome = await installWongStack(JOB, fakeExec("install-wongstack.mjs").exec, cf.fetch);
  assert.deepEqual(outcome, { status: "failed", reason: "cloudflare" });
  assert.deepEqual(cf.calls, []);
});

test("a background install reports rolled, and neither value, to the control plane", async () => {
  const reports = [];
  await startBackground({ id: "c1", type: "cloudflare", payload: JOB }, fakeExec().exec, async (outcome) => reports.push(outcome), fakeCloudflare(WORKS).fetch);
  assert.deepEqual(reports, [{ status: "done", rolled: true }]);
  for (const value of [PASTED, NEW]) assert.ok(!JSON.stringify(reports).includes(value));
});

test("the .env write replaces only the token's line, keeps the rest, and leaves the file wong's alone", () => {
  const dir = mkdtempSync(join(tmpdir(), "roll-"));
  try {
    const file = join(dir, ".env");
    writeFileSync(file, `CLOUDFLARE_API_TOKEN=${PASTED}\nCLOUDFLARE_ACCOUNT_ID=abc\nCLOUDFLARE_MEMORY_TOKEN=mem\n`, { mode: 0o644 });
    // The snippet imports the installer beside the agent, in this same source: no host path to swap.
    const installer = pathToFileURL(fileURLToPath(new URL("../../server/install-wongstack.mjs", import.meta.url))).href;
    assert.ok(WRITE_TOKEN.includes(JSON.stringify(installer)));
    assert.ok(!WRITE_TOKEN.includes("/opt/wongstack"));
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", WRITE_TOKEN, file], { input: NEW, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "");
    assert.equal(readFileSync(file, "utf8"), `CLOUDFLARE_API_TOKEN=${NEW}\nCLOUDFLARE_ACCOUNT_ID=abc\nCLOUDFLARE_MEMORY_TOKEN=mem\n`);
    assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the actual source child receives private stdin but cannot inherit AGENT_TOKEN", async () => {
  const root = mkdtempSync(join(tmpdir(), "source-env-"));
  const probe = join(root, "probe.mjs");
  writeFileSync(probe, `let input='';for await(const part of process.stdin)input+=part;const job=JSON.parse(input);if(process.env.AGENT_TOKEN||!job.managementResult||!job.ownerEmail)process.exit(2);process.stdout.write('private-child-ok');`);
  const fake = fakeExec(); let checked = false;
  try {
    const result = await installWongStack(JOB, async (file, args, options) => {
      if (args.includes("-u") && args.includes("AGENT_TOKEN")) {
        const start = args.indexOf("-u", args.indexOf("--") + 1) - 1;
        const childArgs = args.slice(start + 1); childArgs[childArgs.length - 1] = probe;
        const child = spawnSync(args[start], childArgs, { input: options.input, encoding: "utf8", env: {...process.env, AGENT_TOKEN: "root-agent-secret"} });
        assert.equal(child.status, 0); assert.equal(child.stdout, "private-child-ok"); checked = true;
        return {stdout:child.stdout};
      }
      return fake.exec(file, args, options);
    }, fakeCloudflare().fetch);
    assert.equal(checked, true); assert.deepEqual(result, {status:"done",rolled:false});
  } finally { rmSync(root,{recursive:true,force:true}); }
});
