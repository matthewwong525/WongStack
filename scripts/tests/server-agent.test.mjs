// Tests for server/agent/agent.mjs against a fake control plane: a local HTTP server that
// records every request and answers polls from a script.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";

import { CONTRACT, INSTALL_TIMEOUT_MS, INVITE_POLL_MS, INVITE_TRIES, installWongStack, main, paseoHealth, runJob, startBackground, tick as actualTick } from "../../server/agent/agent.mjs";

// Installer/HTTP orchestration here; private filesystem delivery has its own real-file suite.
const management = { execute: async (job, install) => install(), report: async (job, outcome, post) => { await post(`/api/agent/jobs/${job.id}`, outcome); }, resume: async () => {} };
const tick = (options) => actualTick({ ...options, management });
const LINK = "https://app.paseo.sh/#offer=abc";
let server;
let appUrl;
let requests;
let pollReply;

before(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      requests.push({ path: req.url, auth: req.headers.authorization, body: JSON.parse(body) });
      const reply = req.url === "/api/agent/poll" ? pollReply : { status: 200, body: { ok: true } };
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  appUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => {
  requests = [];
  pollReply = { status: 200, body: { jobs: [], interval: 10 } };
});

/** A fake `run`: records each command and its stdin; `fail` names commands that exit non-zero. */
function fakeExec({ fail = [], stdout = JSON.stringify({ relayEnabled: true, url: LINK, qr: "..." }) } = {}) {
  const calls = [];
  const inputs = [];
  const exec = async (file, args, options) => {
    calls.push([file, ...args].join(" "));
    inputs.push(options?.input);
    if (fail.some((f) => calls.at(-1).includes(f))) throw new Error(`exit 1: ${stdout}`);
    return { stdout, stderr: "" };
  };
  return { exec, calls, inputs };
}

const TOKEN = "gho_secret";
const GITHUB = { token: TOKEN, repo: "ada/wongstack", name: "Ada Lovelace", email: "7+ada@users.noreply.github.com" };
const AS_WONG = "runuser -u wong -- env HOME=/home/wong PATH=/home/wong/.local/bin:/usr/local/bin:/usr/bin:/bin";

test("pair runs the relay pairing command as wong and returns the link", async () => {
  const { exec, calls } = fakeExec();
  assert.deepEqual(await runJob({ type: "pair" }, exec), { status: "done", result: LINK });
  assert.deepEqual(calls, ["runuser -u wong -- paseo daemon pair --relay --json --home /home/wong/.paseo"]);
});

test("suspend stops and resume starts the Paseo service", async () => {
  const { exec, calls } = fakeExec();
  assert.deepEqual(await runJob({ type: "suspend" }, exec), { status: "done" });
  assert.deepEqual(await runJob({ type: "resume" }, exec), { status: "done" });
  assert.deepEqual(calls, ["systemctl stop paseo.service", "systemctl start paseo.service"]);
});

test("a copy's send and restore reject a payload that is not a whole copy job, and run nothing", async () => {
  const { exec, calls } = fakeExec();
  for (const type of ["copy-send", "copy-restore"]) {
    assert.deepEqual(await runJob({ type, payload: { copyId: "x", port: 47000 } }, exec), { status: "rejected" });
    assert.deepEqual(await runJob({ type }, exec), { status: "rejected" });
  }
  assert.deepEqual(calls, []);
});

test("a copy's send and restore run in the background, so polling goes on during a long copy", async () => {
  pollReply = { status: 200, body: { jobs: [{ id: "s1", type: "copy-send", payload: {} }, { id: "r1", type: "copy-restore", payload: {} }] } };
  const lines = [];
  await tick({ appUrl, token: "tok", fetch, exec: fakeExec().exec, log: (l) => lines.push(l) });
  await until(() => requests.length === 3);
  assert.deepEqual(lines.slice(0, 2), ["job s1 copy-send: started", "job r1 copy-restore: started"]);
  assert.deepEqual(requests.slice(1).map((r) => r.body), [{ status: "rejected" }, { status: "rejected" }]);
});

test("an unknown job type runs nothing and is rejected", async () => {
  const { exec, calls } = fakeExec();
  for (const type of ["clone", "shell", "", undefined]) {
    assert.deepEqual(await runJob({ type }, exec), { status: "rejected" });
  }
  assert.deepEqual(calls, []);
});

test("health is up when the service is active and down when it is not", async () => {
  const up = fakeExec();
  assert.equal(await paseoHealth(up.exec), "up");
  assert.deepEqual(up.calls, ["systemctl is-active --quiet paseo.service"]);
  assert.equal(await paseoHealth(fakeExec({ fail: ["is-active"] }).exec), "down");
});

test("a poll sends the contract, the source commit, and health with the token, and returns the interval hint", async () => {
  pollReply = { status: 200, body: { jobs: [], interval: 2 } };
  const interval = await tick({ appUrl, token: "tok", commit: SOURCE_COMMIT, fetch, exec: fakeExec().exec, log: () => {} });
  assert.equal(interval, 2);
  assert.equal(CONTRACT, 3);
  assert.deepEqual(requests, [{ path: "/api/agent/poll", auth: "Bearer tok", body: { contract: 3, commit: SOURCE_COMMIT, paseo: "up" } }]);
});

test("a poll sends a null commit when SOURCE_COMMIT is missing or not a full commit", async () => {
  for (const commit of [undefined, "", "abc1234", SOURCE_COMMIT.toUpperCase(), `${SOURCE_COMMIT}\n`]) {
    requests = [];
    await tick({ appUrl, token: "tok", commit, fetch, exec: fakeExec({ fail: ["is-active"] }).exec, log: () => {} });
    assert.deepEqual(requests[0].body, { contract: 3, commit: null, paseo: "down" }, String(commit));
  }
});

test("a reply without jobs or an interval means no work and the default wait", async () => {
  pollReply = { status: 200, body: { name: "Cloudflare" } };
  const { exec, calls } = fakeExec();
  assert.equal(await tick({ appUrl, token: "tok", fetch, exec, log: () => {} }), 10);
  assert.equal(requests.length, 1);
  assert.deepEqual(calls, ["systemctl is-active --quiet paseo.service"]);
});

test("a poll runs each job and reports each result, rejecting unknown types", async () => {
  pollReply = {
    status: 200,
    body: { jobs: [{ id: "j1", type: "pair" }, { id: "j2", type: "rm -rf" }, { id: "j3", type: "suspend" }], interval: 10 },
  };
  const { exec, calls } = fakeExec();
  const lines = [];
  await tick({ appUrl, token: "tok", fetch, exec, log: (l) => lines.push(l) });
  assert.deepEqual(requests.slice(1), [
    { path: "/api/agent/jobs/j1", auth: "Bearer tok", body: { status: "done", result: LINK } },
    { path: "/api/agent/jobs/j2", auth: "Bearer tok", body: { status: "rejected" } },
    { path: "/api/agent/jobs/j3", auth: "Bearer tok", body: { status: "done" } },
  ]);
  assert.equal(calls.filter((c) => c.includes("rm")).length, 0);
  assert.deepEqual(lines, ["job j1 pair: done", "job j2 rm -rf: rejected", "job j3 suspend: done"]);
});

test("a failed job is reported as failed without its output", async () => {
  pollReply = { status: 200, body: { jobs: [{ id: "j1", type: "pair" }], interval: 10 } };
  const lines = [];
  await tick({ appUrl, token: "tok", fetch, exec: fakeExec({ fail: ["pair"] }).exec, log: (l) => lines.push(l) });
  assert.deepEqual(requests[1].body, { status: "failed" });
  assert.deepEqual(lines, ["job j1 pair: failed"]);
  assert.ok(!JSON.stringify(requests).includes(LINK));
});

test("a refused poll throws with the status", async () => {
  pollReply = { status: 401, body: { error: "unauthorized" } };
  await assert.rejects(tick({ appUrl, token: "bad", fetch, exec: fakeExec().exec, log: () => {} }), /poll failed: HTTP 401/);
});

test("main polls in a loop, waits the hinted interval, and keeps going after an error", async () => {
  const waits = [];
  const lines = [];
  let polls = 0;
  const flaky = async (url, init) => {
    polls += 1;
    if (polls === 2) throw new Error("network down");
    return fetch(url, init);
  };
  pollReply = { status: 200, body: { jobs: [], interval: 2 } };
  const stop = new Error("stop");
  const sleep = async (ms) => {
    waits.push(ms);
    if (waits.length === 3) throw stop;
  };
  const run = main({ env: { APP_URL: appUrl, AGENT_TOKEN: "tok", SOURCE_COMMIT }, fetch: flaky, exec: fakeExec().exec, sleep, log: (l) => lines.push(l) });
  await assert.rejects(run, stop);
  assert.deepEqual(waits, [2000, 10000, 2000]);
  assert.deepEqual(lines, ["poll error: network down"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].auth, "Bearer tok");
  assert.deepEqual(requests[0].body, { contract: 3, commit: SOURCE_COMMIT, paseo: "up" });
});

test("github signs gh in with the token on stdin, sets git up, and clones the repo", async () => {
  const { exec, calls, inputs } = fakeExec({ fail: ["test -d", "paseo"] });
  assert.deepEqual(await runJob({ type: "github", payload: GITHUB }, exec), { status: "done" });
  assert.deepEqual(calls.slice(0, 6), [
    `${AS_WONG} gh auth login --hostname github.com --git-protocol https --with-token`,
    `${AS_WONG} gh auth setup-git`,
    `${AS_WONG} git config --global user.name Ada Lovelace`,
    `${AS_WONG} git config --global user.email 7+ada@users.noreply.github.com`,
    "test -d /home/wong/wongstack/.git",
    `${AS_WONG} gh repo clone ada/wongstack /home/wong/wongstack`,
  ]);
  assert.deepEqual(inputs.slice(0, 6), [TOKEN, undefined, undefined, undefined, undefined, undefined]);
  assert.ok(!calls.join(" ").includes(TOKEN));
});

test("github signs in again but does not clone over an existing clone", async () => {
  const { exec, calls } = fakeExec({ fail: ["paseo"] });
  assert.deepEqual(await runJob({ type: "github", payload: GITHUB }, exec), { status: "done" });
  assert.equal(calls[4], "test -d /home/wong/wongstack/.git");
  assert.ok(!calls.some((call) => call.includes("repo clone")));
});

test("github rejects a bad repo or a missing token and runs nothing", async () => {
  for (const payload of [
    undefined,
    { ...GITHUB, token: "" },
    { ...GITHUB, repo: "wongstack" },
    { ...GITHUB, repo: "ada/../etc" },
    { ...GITHUB, repo: "ada/." },
    { ...GITHUB, repo: "ada/.." },
    { ...GITHUB, repo: "ada/a b" },
    { ...GITHUB, repo: "ada/wongstack\nx" },
    { ...GITHUB, repo: `ada/${"x".repeat(101)}` },
    { ...GITHUB, repo: `${"a".repeat(40)}/wongstack` },
  ]) {
    const { exec, calls } = fakeExec();
    assert.deepEqual(await runJob({ type: "github", payload }, exec), { status: "rejected" }, JSON.stringify(payload));
    assert.deepEqual(calls, []);
  }
});

test("a failed github step is reported as failed, with no token in the report or the log", async () => {
  pollReply = { status: 200, body: { jobs: [{ id: "j1", type: "github", payload: GITHUB }], interval: 10 } };
  const lines = [];
  await tick({ appUrl, token: "tok", fetch, exec: fakeExec({ fail: ["gh repo clone", "test -d"] }).exec, log: (l) => lines.push(l) });
  assert.deepEqual(requests[1].body, { status: "failed" });
  assert.deepEqual(lines, ["job j1 github: failed"]);
  assert.ok(!JSON.stringify(requests.slice(1)).includes(TOKEN));
});

// ── Paseo's sign-in workspaces and Start here ───────────────────────────────

const DIR = "/home/wong/wongstack";
const PASEO = `${AS_WONG} paseo`;
const HOME_JSON = "--home /home/wong/.paseo --json";
const WORKSPACE = (title) => `${PASEO} workspace create --path ${DIR} --isolation local --title ${title} ${HOME_JSON}`;

/** A fake `run` that answers each Paseo command as Paseo 0.9.2 does. `fail` names commands that exit non-zero. */
function paseoExec({ projects = [], fail = [] } = {}) {
  const calls = [];
  const exec = async (file, args, options) => {
    const line = [file, ...args].join(" ");
    calls.push({ line, options });
    if (fail.some((f) => line.includes(f))) throw Object.assign(new Error("exit 1"), { stdout: "some output" });
    const answer = (value) => ({ stdout: JSON.stringify(value), stderr: "" });
    if (line.includes("paseo project ls")) return answer(projects);
    if (line.includes("paseo project create")) return answer({ projectId: "prj_1", name: "wongstack", kind: "git", path: DIR });
    if (line.includes("paseo workspace create")) return answer({ workspaceId: line.includes("Claude") ? "wks_claude" : line.includes("Codex") ? "wks_codex" : "wks_start", name: "x", isolation: "local", cwd: DIR });
    if (line.includes("paseo terminal create")) return answer({ id: line.includes("wks_claude") ? "t-claude" : "t-codex", workspaceId: "w", cwd: DIR });
    if (line.includes("paseo terminal send-keys")) return answer({ terminalId: "t", keysSent: 6 });
    return { stdout: "", stderr: "" };
  };
  return { exec, calls, lines: () => calls.map((c) => c.line) };
}

const connect = (exec, lines = []) => runJob({ type: "github", payload: GITHUB }, exec, (l) => lines.push(l));

test("after a clone, the repo becomes a Paseo project with a sign-in workspace per AI, each with one terminal running its sign-in, and Start here", async () => {
  const box = paseoExec();
  const lines = [];
  assert.deepEqual(await connect(box.exec, lines), { status: "done" });
  assert.deepEqual(box.lines().filter((l) => l.includes(" paseo ")), [
    `${PASEO} project ls ${HOME_JSON}`,
    `${PASEO} project create ${DIR} ${HOME_JSON}`,
    WORKSPACE("Sign in to Claude"),
    `${PASEO} terminal create --workspace wks_claude --cwd ${DIR} ${HOME_JSON}`,
    `${PASEO} terminal send-keys t-claude claude auth login Enter ${HOME_JSON}`,
    WORKSPACE("Sign in to Codex"),
    `${PASEO} terminal create --workspace wks_codex --cwd ${DIR} ${HOME_JSON}`,
    `${PASEO} terminal send-keys t-codex codex login --device-auth Enter ${HOME_JSON}`,
    WORKSPACE("Start here (after you sign in)"),
  ]);
  assert.deepEqual(lines, []);
  assert.ok(!box.lines().some((l) => l.includes("capture") || l.includes(" paseo run ")), "the agent never reads a sign-in terminal or starts a session");
});

test("a project that Paseo has already adds no workspace or terminal", async () => {
  const box = paseoExec({ projects: [{ projectId: "p", name: "other", kind: "git", path: "/home/wong/other" }, { projectId: "prj_1", name: "wongstack", kind: "git", path: DIR }] });
  assert.deepEqual(await connect(box.exec), { status: "done" });
  assert.deepEqual(box.lines().filter((l) => l.includes(" paseo ")), [`${PASEO} project ls ${HOME_JSON}`]);
});

test("a Paseo failure at any step is logged by its step name only, and the clone is still done", async () => {
  for (const [fail, step] of [
    ["project ls", "project ls"],
    ["project create", "project create"],
    ["--title Sign in to Claude", "Sign in to Claude"],
    ["--workspace wks_claude", "Sign in to Claude"],
    ["send-keys t-claude", "Sign in to Claude"],
    ["--title Sign in to Codex", "Sign in to Codex"],
    ["send-keys t-codex", "Sign in to Codex"],
    ["--title Start here", "Start here"],
  ]) {
    const lines = [];
    assert.deepEqual(await connect(paseoExec({ fail: [fail] }).exec, lines), { status: "done" }, fail);
    assert.deepEqual(lines, [`paseo setup failed at ${step}`], fail);
  }
});

test("commands run as wong with the PATH that paseo.service gives, where Claude Code lives", async () => {
  const box = paseoExec();
  await connect(box.exec);
  assert.ok(box.lines().every((l) => !l.startsWith("runuser") || l.startsWith("runuser -u wong -- env HOME=/home/wong PATH=/home/wong/.local/bin:/usr/local/bin:/usr/bin:/bin ")));
});

// ── the WongStack install ───────────────────────────────────────────────────

const CF_TOKEN = "cf-user-secret";
const SOURCE_COMMIT = "efc5845ab16b12dc4ceab60e7c500663c2bf6b19";
const INSTALLER_PATH = `/home/wong/.cache/wong-stack/source-${SOURCE_COMMIT}/server/install-wongstack.mjs`;
const CLOUDFLARE = { token: CF_TOKEN, accountId: "0123456789abcdef0123456789abcdef", repo: "ada/wongstack", ownerEmail: "ada@example.com", sourceRepo: "matthewwong525/WongStack", sourceCommit: SOURCE_COMMIT, managementResult: { version: 1, recipient: { ownerId: "owner", vmId: "vm", jobId: "job", connectionId: "connection", generation: 1 }, path: "/home/wong/.local/state/wongstack/access-results/job.json", cleanupTokenIds: [] } };
const sourceReply = (args) => args.includes("get-url") ? { stdout: "https://github.com/matthewwong525/WongStack.git" } : args.includes("rev-parse") ? { stdout: SOURCE_COMMIT } : !args.includes("node") ? { stdout: "" } : null;
const INSTALL = `${AS_WONG} env -u AGENT_TOKEN node ${INSTALLER_PATH}`;

/** Waits until `ready()` holds: a background report goes over HTTP. */
async function until(ready) {
  for (let i = 0; i < 100 && !ready(); i++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(ready(), "timed out");
}

/** An exec whose installer run waits for `finish(stdout, ok)`; every other command returns at once. */
function pausedInstaller() {
  const box = { calls: [], inputs: [] };
  box.exec = (file, args, options) => {
    box.calls.push([file, ...args].join(" "));
    box.inputs.push(options?.input);
    if (!args.includes("node") || !args.includes(INSTALLER_PATH)) return Promise.resolve(args.includes("git") ? sourceReply(args) : { stdout: JSON.stringify({ url: LINK }) });
    return new Promise((resolve, reject) => {
      box.finish = (stdout, ok) => (ok ? resolve({ stdout }) : reject(Object.assign(new Error("node exited with 1"), { stdout })));
    });
  };
  return box;
}

test("the install runs the installer as wong with the job on stdin, never in argv, with a time limit", async () => {
  const calls = [];
  const exec = async (file, args, options) => {
    calls.push({ line: [file, ...args].join(" "), options });
    return sourceReply(args) ?? { stdout: "done\n" };
  };
  // With no way to reach Cloudflare, the swap fails after the install: the step is still done.
  assert.deepEqual(await runJob({ type: "cloudflare", payload: { ...CLOUDFLARE, extra: "dropped" } }, exec), { status: "done", rolled: false });
  const installed = calls.filter((call) => call.line === INSTALL);
  assert.equal(installed.length, 1);
  assert.equal(installed[0].line, INSTALL);
  assert.deepEqual(JSON.parse(installed[0].options.input), { token: CF_TOKEN, accountId: CLOUDFLARE.accountId, repo: CLOUDFLARE.repo, ownerEmail: CLOUDFLARE.ownerEmail, managementResult: CLOUDFLARE.managementResult, openWithoutLogin: true });
  assert.ok(!installed[0].options.input.includes("AGENT_TOKEN"));
  assert.equal(installed[0].options.timeout, INSTALL_TIMEOUT_MS);
  assert.equal(INSTALL_TIMEOUT_MS, 1_200_000);
  assert.ok(!installed[0].line.includes(CF_TOKEN));
});

test("a failed install reports the installer's last line when it is a reason, else cloudflare", async () => {
  for (const [stdout, reason] of [["step one\ntoken\n", "token"], ["repo", "repo"], ["push\n", "push"], ["cloudflare", "cloudflare"], ["secret output", "cloudflare"], [undefined, "cloudflare"]]) {
    const exec = async (file, args) => {
      if (sourceReply(args)) return sourceReply(args);
      throw Object.assign(new Error("node exited with 1"), { stdout });
    };
    assert.deepEqual(await installWongStack(CLOUDFLARE, exec), { status: "failed", reason }, String(stdout));
  }
});

test("a failed install passes on a refused Cloudflare call on the line before the reason, and nothing else", async () => {
  const fail = (stdout) => async (file, args) => {
    if (sourceReply(args)) return sourceReply(args);
    throw Object.assign(new Error("node exited with 1"), { stdout });
  };
  const call = "Cloudflare GET /accounts/abc/d1/database: HTTP 401 10000";
  assert.deepEqual(await installWongStack(CLOUDFLARE, fail(`${call}\ncloudflare\n`)), { status: "failed", reason: "cloudflare", detail: call });
  assert.deepEqual(await installWongStack(CLOUDFLARE, fail(`${call}\ntoken`)), { status: "failed", reason: "token", detail: call });
  assert.deepEqual(await installWongStack(CLOUDFLARE, fail("some output\npush")), { status: "failed", reason: "push" });
  // Only the exact shape leaves the server, not any line that starts like one.
  assert.deepEqual(await installWongStack(CLOUDFLARE, fail("Cloudflare says: token=abc\ncloudflare")), { status: "failed", reason: "cloudflare" });
  assert.deepEqual(await installWongStack(CLOUDFLARE, fail("push")), { status: "failed", reason: "push" });
});

test("a bad install job is rejected and runs nothing", async () => {
  const { exec, calls } = fakeExec();
  for (const payload of [{ ...CLOUDFLARE, token: "" }, { ...CLOUDFLARE, accountId: "nope" }, { ...CLOUDFLARE, accountId: undefined }, { ...CLOUDFLARE, repo: "ada/.." }, { ...CLOUDFLARE, repo: "ada/." }, { ...CLOUDFLARE, repo: undefined }]) {
    assert.deepEqual(await runJob({ type: "cloudflare", payload }, exec), { status: "rejected" });
  }
  assert.deepEqual(calls, []);
});

test("an install job without an owner email or a result destination fails with access, and runs nothing", async () => {
  const { exec, calls } = fakeExec();
  for (const payload of [{ ...CLOUDFLARE, ownerEmail: undefined }, { ...CLOUDFLARE, ownerEmail: "" }, { ...CLOUDFLARE, managementResult: undefined }, undefined]) {
    assert.deepEqual(await runJob({ type: "cloudflare", payload }, exec), { status: "failed", reason: "access" });
  }
  assert.deepEqual(calls, []);
});

test("an install job whose owner email no one can reach, a GitHub noreply, is rejected and runs nothing", async () => {
  const { exec, calls } = fakeExec();
  for (const ownerEmail of ["7+ada@users.noreply.github.com", "ada@example.invalid", "not-an-email"]) {
    assert.deepEqual(await runJob({ type: "cloudflare", payload: { ...CLOUDFLARE, ownerEmail } }, exec), { status: "rejected" });
  }
  assert.deepEqual(calls, []);
});

/** The fake control plane, with Cloudflare unreachable: no test calls the real API. */
const offline = (url, init) => (String(url).startsWith("https://api.cloudflare.com/") ? Promise.reject(new Error("offline")) : fetch(url, init));

test("a cloudflare job starts in the background: a pair job in the same poll reports first", async () => {
  pollReply = { status: 200, body: { jobs: [{ id: "c1", type: "cloudflare", payload: CLOUDFLARE }, { id: "p1", type: "pair" }], interval: 10 } };
  const box = pausedInstaller();
  const lines = [];
  const fetch = offline;
  await tick({ appUrl, token: "tok", fetch, exec: box.exec, log: (l) => lines.push(l) });
  assert.deepEqual(requests.slice(1), [{ path: "/api/agent/jobs/p1", auth: "Bearer tok", body: { status: "done", result: LINK } }]);

  // A second install while the first runs fails at once, and starts nothing.
  pollReply = { status: 200, body: { jobs: [{ id: "c2", type: "cloudflare", payload: CLOUDFLARE }], interval: 10 } };
  await tick({ appUrl, token: "tok", fetch, exec: box.exec, log: (l) => lines.push(l) });
  await until(() => requests.at(-1).path === "/api/agent/jobs/c2");
  assert.deepEqual(requests.at(-1), { path: "/api/agent/jobs/c2", auth: "Bearer tok", body: { status: "failed" } });
  assert.equal(box.calls.filter((c) => c === INSTALL).length, 1);

  box.finish("widening\ntoken\n", false);
  await until(() => requests.at(-1).path === "/api/agent/jobs/c1");
  assert.deepEqual(requests.at(-1), { path: "/api/agent/jobs/c1", auth: "Bearer tok", body: { status: "failed", reason: "token" } });
  assert.deepEqual(lines, ["job c1 cloudflare: started", "job p1 pair: done", "job c2 cloudflare: started", "job c2 cloudflare: failed", "job c1 cloudflare: failed"]);
  assert.ok(!JSON.stringify(requests).includes("widening"), "no installer output is reported");

  // Once it ends, the next install may start.
  pollReply = { status: 200, body: { jobs: [{ id: "c3", type: "cloudflare", payload: CLOUDFLARE }], interval: 10 } };
  await tick({ appUrl, token: "tok", fetch, exec: box.exec, log: () => {} });
  await until(() => box.calls.filter((call) => call === INSTALL).length === 2);
  box.finish("done\n", true);
  await until(() => requests.at(-1).path === "/api/agent/jobs/c3");
  assert.deepEqual(requests.at(-1), { path: "/api/agent/jobs/c3", auth: "Bearer tok", body: { status: "done", rolled: false } });
});

test("a report that fails after an install is logged, not thrown", async () => {
  pollReply = { status: 200, body: { jobs: [{ id: "c4", type: "cloudflare", payload: CLOUDFLARE }], interval: 10 } };
  const box = pausedInstaller();
  const lines = [];
  let polls = 0;
  const flaky = async (url, init) => (url.endsWith("/poll") && polls++ === 0 ? fetch(url, init) : Promise.reject(new Error("network down")));
  await tick({ appUrl, token: "tok", fetch: flaky, exec: box.exec, log: (l) => lines.push(l) });
  await until(() => box.finish !== undefined);
  box.finish("done\n", true);
  await until(() => lines.length === 3);
  assert.deepEqual(lines, ["job c4 cloudflare: started", "job c4 cloudflare: done", "job c4 report failed: access"]);
});

test("a background job that throws is reported as failed, and its type is free again", async () => {
  const outcomes = [];
  const exec = async () => {
    throw new Error("boom");
  };
  const job = { id: "b1", type: "cloudflare", payload: CLOUDFLARE };
  await startBackground({ ...job, type: "pair" }, exec, async (o) => outcomes.push(o));
  await startBackground(job, exec, async (o) => outcomes.push(o));
  await startBackground(job, exec, async (o) => outcomes.push(o));
  assert.deepEqual(outcomes, [{ status: "failed" }, { status: "failed", reason: "access" }, { status: "failed", reason: "access" }]);
});

// ── teams: an owner's server adds and removes a teammate; a teammate's server accepts ──

const TEAM = { repo: "shop/wongstack", login: "ana-gh" };
const GH_API = `${AS_WONG} gh api`;

/**
 * A fake `run` for gh: each rule is [part of the command, stdout] and the
 * first that matches answers; a rule whose stdout is `{ fail }` exits non-zero
 * with that output. Any other command succeeds with no output.
 */
function ghExec(rules = []) {
  const calls = [];
  const exec = async (file, args, options) => {
    const line = [file, ...args].join(" ");
    calls.push({ line, options });
    const [, out = ""] = rules.find(([part]) => line.includes(part)) ?? [];
    if (out.fail !== undefined) throw Object.assign(new Error("exit 1"), { stdout: out.fail });
    return { stdout: out, stderr: "" };
  };
  return { exec, calls, lines: () => calls.map((c) => c.line) };
}

test("team-add gives the teammate's login push access to the owner's repo, as wong", async () => {
  const box = ghExec([["collaborators", JSON.stringify({ id: 1, invitee: { login: "ana-gh" } })]]);
  assert.deepEqual(await runJob({ type: "team-add", payload: TEAM }, box.exec), { status: "done" });
  assert.deepEqual(box.lines(), [`${GH_API} -X PUT repos/shop/wongstack/collaborators/ana-gh -f permission=push`]);
});

test("team-add counts an empty reply, an existing collaborator, as done", async () => {
  assert.deepEqual(await runJob({ type: "team-add", payload: TEAM }, ghExec().exec), { status: "done" });
});

test("a team job with a bad repo or login is rejected and runs nothing", async () => {
  for (const type of ["team-add", "team-remove"]) {
    for (const payload of [
      undefined,
      { ...TEAM, repo: "wongstack" },
      { ...TEAM, repo: "shop/.." },
      { ...TEAM, login: undefined },
      { ...TEAM, login: "" },
      { ...TEAM, login: "-ana" },
      { ...TEAM, login: "ana-" },
      { ...TEAM, login: "ana/../x" },
      { ...TEAM, login: "ana gh" },
      { ...TEAM, login: "a".repeat(40) },
    ]) {
      const box = ghExec();
      assert.deepEqual(await runJob({ type, payload }, box.exec), { status: "rejected" }, `${type} ${JSON.stringify(payload)}`);
      assert.deepEqual(box.lines(), []);
    }
  }
  assert.deepEqual(await runJob({ type: "team-add", payload: { ...TEAM, login: "a".repeat(39) } }, ghExec().exec), { status: "done" });
  assert.deepEqual(await runJob({ type: "team-add", payload: { ...TEAM, login: "A-1" } }, ghExec().exec), { status: "done" });
});

const INVITATIONS = JSON.stringify([
  { id: 11, invitee: { login: "Ana-GH" } },
  { id: 12, invitee: { login: "ben-gh" } },
  { id: 13, invitee: null },
]);

test("team-remove withdraws the pending invitation and removes access, and leaves memory alone where it has no members", async () => {
  const box = ghExec([["api repos/shop/wongstack/invitations", INVITATIONS], ["test -f", { fail: "" }]]);
  assert.deepEqual(await runJob({ type: "team-remove", payload: TEAM }, box.exec), { status: "done" });
  assert.deepEqual(box.lines(), [
    `${GH_API} repos/shop/wongstack/invitations`,
    `${GH_API} -X DELETE repos/shop/wongstack/invitations/11`,
    `${GH_API} -X DELETE repos/shop/wongstack/collaborators/ana-gh`,
    "test -f /home/wong/wongstack/.agents/skills/memory/scripts/lib/members.mjs",
  ]);
});

test("team-remove stops the teammate's memory keys by their noreply address where the repo's memory has members", async () => {
  const box = ghExec([["invitations", "[]"], ["users/ana-gh", "9\n"]]);
  assert.deepEqual(await runJob({ type: "team-remove", payload: TEAM }, box.exec), { status: "done" });
  assert.deepEqual(box.lines().slice(2), [
    "test -f /home/wong/wongstack/.agents/skills/memory/scripts/lib/members.mjs",
    `${GH_API} users/ana-gh --jq .id`,
    `${AS_WONG} node .agents/skills/memory/scripts/memory.mjs member remove 9+ana-gh@users.noreply.github.com`,
  ]);
  assert.deepEqual(box.calls.at(-1).options, { cwd: "/home/wong/wongstack" });
});

test("team-remove counts a login that is no longer a collaborator as done", async () => {
  const box = ghExec([["invitations", "[]"], ["collaborators", { fail: '{"message":"Not Found","status":"404"}' }], ["test -f", { fail: "" }]]);
  assert.deepEqual(await runJob({ type: "team-remove", payload: TEAM }, box.exec), { status: "done" });
});

test("a failed team job is reported as failed with no command output", async () => {
  const secret = '{"message":"Bad credentials","token":"gho_x"}';
  pollReply = {
    status: 200,
    body: {
      jobs: [
        { id: "r1", type: "team-remove", payload: TEAM },
        { id: "a1", type: "team-add", payload: TEAM },
      ],
      interval: 10,
    },
  };
  const box = ghExec([["invitations", "[]"], ["collaborators", { fail: secret }]]);
  const lines = [];
  await tick({ appUrl, token: "tok", fetch, exec: box.exec, log: (l) => lines.push(l) });
  assert.deepEqual(requests.slice(1), [
    { path: "/api/agent/jobs/r1", auth: "Bearer tok", body: { status: "failed" } },
    { path: "/api/agent/jobs/a1", auth: "Bearer tok", body: { status: "failed" } },
  ]);
  assert.deepEqual(lines, ["job r1 team-remove: failed", "job a1 team-add: failed"]);
  assert.ok(!JSON.stringify(requests).includes("gho_x"));
});

const INVITED = { ...GITHUB, repo: "shop/wongstack", invited: true };
const VIEW = `${AS_WONG} gh repo view shop/wongstack --json name`;
const LIST = `${GH_API} user/repository_invitations`;

/** A teammate's server: `view` fails until an invitation is accepted, or for `readableAfter` looks. */
function invitedExec({ invitations = "[]", readableAfter = Infinity } = {}) {
  let accepted = false;
  let views = 0;
  const box = ghExec([["test -d", { fail: "" }], [" paseo ", { fail: "" }]]);
  const inner = box.exec;
  box.exec = async (file, args, options) => {
    const line = [file, ...args].join(" ");
    if (line === VIEW && !accepted && ++views <= readableAfter) {
      box.calls.push({ line, options });
      throw Object.assign(new Error("exit 1"), { stdout: "" });
    }
    if (line === LIST) {
      box.calls.push({ line, options });
      return { stdout: invitations, stderr: "" };
    }
    if (line.includes("-X PATCH")) accepted = true;
    return inner(file, args, options);
  };
  return box;
}

test("an invited teammate's server accepts the invitation to the owner's repo by name, then clones it", async () => {
  const invitations = JSON.stringify([
    { id: 5, repository: { full_name: "other/repo" } },
    { id: 6, repository: { full_name: "Shop/WongStack" } },
  ]);
  const box = invitedExec({ invitations });
  const waits = [];
  const sleep = async (ms) => waits.push(ms);
  assert.deepEqual(await runJob({ type: "github", payload: INVITED }, box.exec, () => {}, sleep), { status: "done" });
  assert.deepEqual(box.lines().slice(4, 9), [VIEW, LIST, `${GH_API} -X PATCH user/repository_invitations/6`, VIEW, "test -d /home/wong/wongstack/.git"]);
  assert.equal(box.lines()[9], `${AS_WONG} gh repo clone shop/wongstack /home/wong/wongstack`);
  assert.deepEqual(waits, [10_000]);
});

test("an invited teammate's server stops waiting at once when the repo is already readable", async () => {
  const box = invitedExec({ readableAfter: 0 });
  const sleep = async () => assert.fail("no wait");
  assert.deepEqual(await runJob({ type: "github", payload: INVITED }, box.exec, () => {}, sleep), { status: "done" });
  assert.deepEqual(box.lines().slice(4, 6), [VIEW, "test -d /home/wong/wongstack/.git"]);
});

test("an invited teammate's server looks every 10 seconds until the repo is readable", async () => {
  const box = invitedExec({ readableAfter: 3 });
  const waits = [];
  assert.deepEqual(await runJob({ type: "github", payload: INVITED }, box.exec, () => {}, async (ms) => waits.push(ms)), { status: "done" });
  assert.deepEqual(waits, [10_000, 10_000, 10_000]);
  assert.equal(box.lines().filter((l) => l === LIST).length, 3);
});

test("an invited teammate's server fails with repo after 10 minutes with no invitation, and clones nothing", async () => {
  const box = invitedExec();
  let waited = 0;
  const outcome = await runJob({ type: "github", payload: INVITED }, box.exec, () => {}, async (ms) => (waited += ms));
  assert.deepEqual(outcome, { status: "failed", reason: "repo" });
  assert.equal(INVITE_TRIES * INVITE_POLL_MS, 600_000);
  assert.equal(waited, 600_000);
  assert.equal(box.lines().filter((l) => l === VIEW).length, INVITE_TRIES + 1);
  assert.ok(!box.lines().some((l) => l.includes("repo clone")));
});

test("a poll passes its sleep to a teammate's wait, and reports the timeout's reason alone", async () => {
  pollReply = { status: 200, body: { jobs: [{ id: "g1", type: "github", payload: INVITED }], interval: 10 } };
  let waits = 0;
  await tick({ appUrl, token: "tok", fetch, exec: invitedExec().exec, log: () => {}, sleep: async () => waits++ });
  assert.equal(waits, INVITE_TRIES);
  assert.deepEqual(requests[1].body, { status: "failed", reason: "repo" });
  assert.ok(!JSON.stringify(requests).includes(TOKEN));
});

test("an owner's own github job does not wait for an invitation", async () => {
  const box = ghExec([["test -d", { fail: "" }], [" paseo ", { fail: "" }]]);
  await runJob({ type: "github", payload: { ...GITHUB, invited: false } }, box.exec, () => {}, async () => assert.fail("no wait"));
  assert.ok(!box.lines().some((l) => l.includes("repo view") || l.includes("invitations")));
});

test('Artifacts preparation runs only pinned source as wong without the agent token and registers its actual clone', async () => {
  const payload = { serviceUrl: 'https://service.example.com', projectId: '11111111-1111-1111-1111-111111111111', token: 'private-project-grant', gitUrl: 'https://git.example.com/account/project.git', sourceRepo: 'matthewwong525/WongStack', sourceCommit: SOURCE_COMMIT, ownerEmail: 'owner@example.com', subject: 'owner', role: 'owner' };
  const hosted = { projectId: payload.projectId, sourceCommit: SOURCE_COMMIT, verified: true, dir: '/home/wong/wongstack' };
  const calls = [];
  const exec = async (file,args,options) => {
    calls.push({file,args,options});
    const command=args.join(' ');
    if(command.includes('remote get-url origin')) return {stdout:'https://github.com/matthewwong525/WongStack.git'};
    if(command.includes('rev-parse HEAD')) return {stdout:SOURCE_COMMIT};
    if(command.includes('prepare-hosted.mjs')) return {stdout:JSON.stringify(hosted)};
    if(command.includes('project ls')) return {stdout:JSON.stringify([{path:hosted.dir}])};
    return {stdout:''};
  };
  assert.deepEqual(await runJob({type:'artifacts',payload},exec),{status:'done',hosted});
  const preparation=calls.find(call=>call.args.includes(INSTALLER_PATH.replace('install-wongstack.mjs','prepare-hosted.mjs')));
  assert.ok(preparation.args.includes('-u'));assert.ok(preparation.args.includes('AGENT_TOKEN'));
  assert.equal(preparation.options.input,JSON.stringify(payload));
  assert.equal(calls.some(call=>call.args.includes(payload.token)),false);
  assert.equal(calls.some(call=>call.args.includes('gh')),false);
});

test('an Artifacts job that names a GitHub repository is rejected and runs nothing', async () => {
  const payload = { serviceUrl: 'https://service.example.com', projectId: '11111111-1111-1111-1111-111111111111', token: 'private-project-grant', gitUrl: 'https://git.example.com/account/project.git', sourceRepo: 'matthewwong525/WongStack', sourceCommit: SOURCE_COMMIT, ownerEmail: 'owner@example.com', subject: 'owner', role: 'owner' };
  for (const move of [{ githubRepo: 'owner/Existing' }, { legacyRepo: 'owner/Existing' }]) {
    const calls = [];
    const exec = async (file, args) => { calls.push([file, ...args]); return { stdout: '' }; };
    assert.deepEqual(await runJob({ type: 'artifacts', payload: { ...payload, ...move } }, exec), { status: 'rejected' });
    assert.deepEqual(calls, [], 'no clone, preparation, or remote change');
  }
});

test('a refused Artifacts preparation reports a failed job and registers no workspace', async () => {
  const payload = { serviceUrl: 'https://service.example.com', projectId: '11111111-1111-1111-1111-111111111111', token: 'private-project-grant', gitUrl: 'https://git.example.com/account/project.git', sourceRepo: 'matthewwong525/WongStack', sourceCommit: SOURCE_COMMIT, ownerEmail: 'owner@example.com', subject: 'owner', role: 'owner' };
  const calls = [];
  const exec = async (file, args) => {
    const command = args.join(' ');
    calls.push(command);
    if (command.includes('remote get-url origin')) return { stdout: 'https://github.com/matthewwong525/WongStack.git' };
    if (command.includes('rev-parse HEAD')) return { stdout: SOURCE_COMMIT };
    // The folder holds a GitHub clone: preparation refuses and exits non-zero.
    if (command.includes('prepare-hosted.mjs')) throw Object.assign(new Error('exit 1'), { stderr: 'This workspace is on GitHub and stays there: save opens a pull request. Nothing was changed.' });
    return { stdout: '' };
  };
  assert.deepEqual(await runJob({ type: 'artifacts', payload }, exec), { status: 'failed', reason: 'repo' });
  assert.equal(calls.some(command => command.includes('paseo')), false);
  assert.equal(calls.some(command => command.includes('set-url')), false);
});
