#!/usr/bin/env node
// The WongStack agent on each workspace server. It only calls out: every 10 s
// it polls the control plane with this server's own token, reports whether
// Paseo is up, and runs the jobs it gets. The switch in runJob is the only
// way it runs a command; any other job type is reported as rejected. No
// dependencies: the host unpacks this source at the build's commit and runs
// this file as root under systemd; it shares the command runner and job check
// of the installer beside it, and never changes itself. server/README.md holds
// the contract, the messages it and the control plane agree on.
// After the clone it sets up Paseo: a sign-in workspace per AI and "Start here".
// On an owner's server, `team-add` and `team-remove` give a teammate's GitHub
// login push access to the owner's repo and take it away, with the owner's gh.
// After a done install it swaps the pasted Cloudflare token's value, which
// passed through the control plane, for a new one only this server holds.
// For a copy to the owner's own Hetzner, it runs ./copy.mjs: this server's
// home folder goes straight to the new server, locked, and never through the
// control plane.
import { fileURLToPath, pathToFileURL } from "node:url";

import { cloudflare } from "../../.agents/skills/wong-setup/scripts/provision.mjs";
import { CLOUDFLARE_CALL, jobFolder, repoFolder, run } from "../install-wongstack.mjs";
import { copyKey, copyRestore, copySend } from "./copy.mjs";
import { sourceInstaller } from "./source.mjs";
import { createManagementStore } from "./management.mjs";
const managementStore = createManagementStore();

/** The contract this agent follows with the control plane: server/README.md#the-agent. A changed message shape raises it. */
export const CONTRACT = 3;
const PASEO_HOME = "/home/wong/.paseo";
/** The installer beside this agent, in the same unpacked source, which wong can read. */
const INSTALLER = fileURLToPath(new URL("../install-wongstack.mjs", import.meta.url));
/** An install normally takes a few minutes; one still running after this is stopped. */
export const INSTALL_TIMEOUT_MS = 20 * 60_000;
const DEFAULT_INTERVAL = 10;
/** The reasons the installer prints as its last line when it stops. */
const REASONS = new Set(["token", "repo", "cloudflare", "push", "access"]);
/** A GitHub login: letters, digits, and inner hyphens, at most 39 characters. */
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
/** A teammate's server looks for the owner's invitation this often, this many times: 10 minutes. */
export const INVITE_POLL_MS = 10_000;
export const INVITE_TRIES = 60;
/** The repo's memory, and the file that shows it supports `member remove` (WongStack after 20.0.0). */
const MEMORY = ".agents/skills/memory/scripts/memory.mjs";
const MEMBERS = ".agents/skills/memory/scripts/lib/members.mjs";

/** Job types that run in the background, one of each type at a time, so polling goes on around them. */
const BACKGROUND = new Set(["cloudflare", "artifacts", "copy-send", "copy-restore"]);
/** A full git commit, as the host records `SOURCE_COMMIT`. */
const COMMIT = /^[0-9a-f]{40}$/;

/**
 * A workspace per AI, named for it, with one terminal that runs only that AI's
 * own sign-in. The agent never reads them.
 */
const SIGN_INS = [
  ["Sign in to Claude", "claude auth login"],
  ["Sign in to Codex", "codex login --device-auth"],
];
/** Where the person goes after the sign-in to send their first message, which the dashboard gives them. */
const START_HERE = "Start here (after you sign in)";

/**
 * Runs a command as wong, in wong's home, with the PATH that paseo.service
 * gives wong: Claude Code installs itself in ~/.local/bin.
 */
const asWong = (exec, args, options) =>
  exec("runuser", ["-u", "wong", "--", "env", "HOME=/home/wong", "PATH=/home/wong/.local/bin:/usr/local/bin:/usr/bin:/bin", ...args], options);
/** Runs a Paseo command as wong against wong's daemon, and returns its JSON reply. */
const paseo = async (exec, args) => JSON.parse((await asWong(exec, ["paseo", ...args, "--home", PASEO_HOME, "--json"])).stdout);

/** A workspace on the clone with this title, and its id. */
const workspace = async (exec, dir, title) => (await paseo(exec, ["workspace", "create", "--path", dir, "--isolation", "local", "--title", title])).workspaceId;

/**
 * Makes the clone a Paseo project with a sign-in workspace per AI, each with
 * one terminal running that AI's sign-in, and "Start here". Only on a new
 * project, so a reconnect adds nothing. A failure is logged by its step only,
 * and never fails the clone.
 */
async function setUpPaseo(dir, exec, log) {
  const step = (name, run) => run().catch(() => Promise.reject(Object.assign(new Error(name), { step: name })));
  try {
    const projects = await step("project ls", () => paseo(exec, ["project", "ls"]));
    if (projects.some((project) => project.path === dir)) return;
    await step("project create", () => paseo(exec, ["project", "create", dir]));
    for (const [title, command] of SIGN_INS) {
      const id = await step(title, () => workspace(exec, dir, title));
      const terminal = await step(title, () => paseo(exec, ["terminal", "create", "--workspace", id, "--cwd", dir]));
      await step(title, () => paseo(exec, ["terminal", "send-keys", terminal.id, command, "Enter"]));
    }
    await step("Start here", () => workspace(exec, dir, START_HERE));
  } catch (error) {
    log(`paseo setup failed at ${error.step}`);
  }
}

/** Calls the GitHub API as wong with wong's gh login, and returns the parsed reply. */
const ghApi = async (exec, args) => JSON.parse((await asWong(exec, ["gh", "api", ...args])).stdout || "null");
const sameName = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/**
 * A teammate's server: accepts the owner's invitation to `repo` with the
 * teammate's own gh login, looking every 10 seconds for 10 minutes. True as
 * soon as the repo is readable, which it already is once accepted.
 */
async function acceptInvitation(repo, exec, sleep) {
  const readable = () => asWong(exec, ["gh", "repo", "view", repo, "--json", "name"]).then(() => true, () => false);
  for (let tries = 0; tries < INVITE_TRIES; tries++) {
    if (await readable()) return true;
    const invite = (await ghApi(exec, ["user/repository_invitations"])).find((i) => sameName(i.repository?.full_name, repo));
    if (invite) await ghApi(exec, ["-X", "PATCH", `user/repository_invitations/${Number(invite.id)}`]);
    await sleep(INVITE_POLL_MS);
  }
  return readable();
}

/**
 * Signs `gh` in as wong with the person's token, sets git up, clones their
 * repo once, and sets up Paseo. A teammate's job is `invited`: their server
 * accepts the owner's invitation first, and fails with `repo` without one.
 */
async function connectGitHub({ token, repo, name, email, invited }, exec, log, sleep) {
  const folder = repoFolder(repo);
  if (!token || !folder) return { status: "rejected" };
  const dir = `/home/wong/${folder}`;
  await asWong(exec, ["gh", "auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--with-token"], { input: token });
  await asWong(exec, ["gh", "auth", "setup-git"]);
  await asWong(exec, ["git", "config", "--global", "user.name", name]);
  await asWong(exec, ["git", "config", "--global", "user.email", email]);
  if (invited && !(await acceptInvitation(repo, exec, sleep))) return { status: "failed", reason: "repo" };
  // Clone only when there is no clone yet: a reconnect keeps the person's work.
  await exec("test", ["-d", `${dir}/.git`]).catch(() => asWong(exec, ["gh", "repo", "clone", repo, dir]));
  await setUpPaseo(dir, exec, log);
  return { status: "done" };
}

/** The owner's repo folder for a team job, or null when the job is not a valid one. */
const teamFolder = (job) => (LOGIN.test(job?.login ?? "") ? repoFolder(job.repo) : null);

/** An owner's server: gives the teammate's login push access, which GitHub sends as an invitation. */
async function addTeammate(job, exec) {
  if (!teamFolder(job)) return { status: "rejected" };
  await ghApi(exec, ["-X", "PUT", `repos/${job.repo}/collaborators/${job.login}`, "-f", "permission=push"]);
  return { status: "done" };
}

/** GitHub's answer for a login or invitation that is already gone: the removal is done. */
const gone = (error) => {
  if (!/"Not Found"/.test(String(error.stdout))) throw error;
};

/**
 * An owner's server: withdraws the teammate's pending invitation, removes
 * their push access, and, where the repo's memory supports it, stops their
 * memory keys by their GitHub noreply address, the one they commit with.
 */
async function removeTeammate(job, exec) {
  const folder = teamFolder(job);
  if (!folder) return { status: "rejected" };
  const { repo, login } = job;
  for (const invite of (await ghApi(exec, [`repos/${repo}/invitations`])).filter((i) => sameName(i.invitee?.login, login))) {
    await ghApi(exec, ["-X", "DELETE", `repos/${repo}/invitations/${Number(invite.id)}`]);
  }
  await ghApi(exec, ["-X", "DELETE", `repos/${repo}/collaborators/${login}`]).catch(gone);
  const dir = `/home/wong/${folder}`;
  if (await exec("test", ["-f", `${dir}/${MEMBERS}`]).then(() => true, () => false)) {
    const id = Number(await ghApi(exec, [`users/${login}`, "--jq", ".id"]));
    await asWong(exec, ["node", MEMORY, "member", "remove", `${id}+${login}@users.noreply.github.com`], { cwd: dir });
  }
  return { status: "done" };
}

/** A Cloudflare token's id. */
const TOKEN_ID = /^[0-9a-f]{32}$/;

/**
 * Run as wong with the new value on stdin: replaces the `CLOUDFLARE_API_TOKEN`
 * line of the `.env` named in its argument with the installer's `setEnv`,
 * which keeps every other line and the file readable by wong alone.
 */
export const WRITE_TOKEN = `import { setEnv } from ${JSON.stringify(pathToFileURL(INSTALLER).href)};
let value = "";
for await (const chunk of process.stdin) value += chunk;
setEnv(process.argv[1], { CLOUDFLARE_API_TOKEN: value });`;

/**
 * Swaps the token's value with Cloudflare, so the value the person pasted
 * stops working, and writes the new value to the repo's `.env`, and nowhere
 * else: on stdin, never in an argument. True once both are done. Any failure
 * is false, with no detail, since a message could hold a value.
 */
async function rollToken({ token, repo }, exec, fetchFn) {
  try {
    const cf = cloudflare(token, { fetch: fetchFn });
    const { id } = await cf("GET", "/user/tokens/verify");
    if (!TOKEN_ID.test(String(id))) return false;
    const value = await cf("PUT", `/user/tokens/${id}/value`, {});
    if (typeof value !== "string" || !value) return false;
    await asWong(exec, ["node", "--input-type=module", "-e", WRITE_TOKEN, `/home/wong/${repoFolder(repo)}/.env`], { input: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Installs WongStack into the person's repo as wong, with the job on stdin,
 * then swaps the token's value, reporting whether it `rolled`. Only the
 * installer's last line, one reason word, is reported, and the line before it
 * when it has the exact shape of a refused Cloudflare call: never other
 * output. The Worker checks the shape again.
 */
export async function installWongStack(job, exec, fetchFn) {
  // Before jobFolder, which also refuses a missing email: a job without these fails `access`, and
  // only a present but unreachable email (a GitHub noreply) is `rejected`.
  if (!job?.ownerEmail || !job?.managementResult) return { status: "failed", reason: "access" };
  if (!jobFolder(job)) return { status: "rejected" };
  const { token, accountId, repo, ownerEmail, managementResult } = job;
  let installer;
  try { installer = await sourceInstaller(job, (args) => asWong(exec, args)); }
  catch { return { status: "failed", reason: "access" }; }
  try {
    await asWong(exec, ["env", "-u", "AGENT_TOKEN", "node", installer], { input: JSON.stringify({ token, accountId, repo, ownerEmail, managementResult, openWithoutLogin: true }), timeout: INSTALL_TIMEOUT_MS });
  } catch (error) {
    const lines = String(error.stdout ?? "").trim().split("\n");
    const reason = lines.at(-1);
    const call = lines.at(-2);
    return { status: "failed", reason: REASONS.has(reason) ? reason : "cloudflare", ...(CLOUDFLARE_CALL.test(call) && { detail: call }) };
  }
  return { status: "done", rolled: await rollToken(job, exec, fetchFn) };
}

/** The background job types running now. */
const running = new Set();

/**
 * Runs a background job without holding up the poll; `report` gets the
 * outcome when it ends. A second job of a type that is running fails at once.
 * Returns the running job, for tests.
 */
export function startBackground(job, exec, report, fetchFn, management, post) {
  if (running.has(job.type)) return report({ status: "failed" });
  running.add(job.type);
  const execute = () => runJob(job, exec, undefined, undefined, fetchFn);
  return (job.type === "cloudflare" && management ? management.execute(job, execute, post) : execute())
    .catch(() => ({ status: "failed" }))
    .then((outcome) => outcome && report(outcome))
    .finally(() => running.delete(job.type));
}

/**
 * Runs one job. A pairing link goes back as the result and nowhere else.
 * `sleep` paces a teammate's wait for their invitation; `fetchFn` swaps the
 * Cloudflare token after an install.
 */
export async function runJob(job, exec, log = () => {}, sleep, fetchFn) {
  switch (job.type) {
    case "pair": {
      const { stdout } = await exec("runuser", ["-u", "wong", "--", "paseo", "daemon", "pair", "--relay", "--json", "--home", PASEO_HOME]);
      return { status: "done", result: JSON.parse(stdout).url };
    }
    case "suspend":
      await exec("systemctl", ["stop", "paseo.service"]);
      return { status: "done" };
    case "resume":
      await exec("systemctl", ["start", "paseo.service"]);
      return { status: "done" };
    case "artifacts": {
      const payload = job.payload;
      let installer;
      try { installer = await sourceInstaller(payload, (args) => asWong(exec, ["env", "-u", "AGENT_TOKEN", ...args])); }
      catch { return { status: "failed", reason: "repo" }; }
      const prepare = installer.replace(/install-wongstack\.mjs$/, "prepare-hosted.mjs");
      try {
        const result = await asWong(exec, ["env", "-u", "AGENT_TOKEN", "node", prepare], { input: JSON.stringify(payload), timeout: INSTALL_TIMEOUT_MS });
        const hosted = JSON.parse(result.stdout.trim().split("\n").at(-1));
        if (hosted.projectId !== payload.projectId || hosted.sourceCommit !== payload.sourceCommit || hosted.verified !== true || !/^\/home\/wong\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(hosted.dir || "")) throw new Error("bad acknowledgment");
        await setUpPaseo(hosted.dir, exec, log);
        return { status: "done", hosted };
      } catch { return { status: "failed", reason: "repo" }; }
    }
    case "github":
      return connectGitHub(job.payload ?? {}, exec, log, sleep);
    case "cloudflare":
      return installWongStack(job.payload, exec, fetchFn);
    case "team-add":
      return addTeammate(job.payload, exec);
    case "team-remove":
      return removeTeammate(job.payload, exec);
    case "copy-key":
      return copyKey();
    case "copy-send":
      return copySend(job.payload);
    case "copy-restore":
      return copyRestore(job.payload, exec);
    default:
      return { status: "rejected" };
  }
}

export async function paseoHealth(exec) {
  try {
    await exec("systemctl", ["is-active", "--quiet", "paseo.service"]);
    return "up";
  } catch {
    return "down";
  }
}

/** One poll and its jobs. Returns the seconds to wait before the next poll. */
export async function tick({ appUrl, token, commit, fetch, exec, log, sleep, management = managementStore }) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const post = (path, body) => fetch(`${appUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  // Journal recovery never reruns source export or token rolling, and cannot
  // block pairing/health polling while an HTTP receipt is delayed.
  void management.resume(post);

  const response = await post("/api/agent/poll", { contract: CONTRACT, commit: COMMIT.test(commit ?? "") ? commit : null, paseo: await paseoHealth(exec) });
  if (!response.ok) throw new Error(`poll failed: HTTP ${response.status}`);
  // A reply without these (an older Worker during a rollout) means no work.
  const { jobs = [], interval = DEFAULT_INTERVAL } = await response.json();
  const report = async (job, outcome) => {
    log(`job ${job.id} ${job.type}: ${outcome.status}`);
    if (job.type === "cloudflare") await management.report(job, outcome, post);
    else await post(`/api/agent/jobs/${job.id}`, outcome);
  };
  for (const job of jobs) {
    if (BACKGROUND.has(job.type)) {
      log(`job ${job.id} ${job.type}: started`);
      // Not awaited: pairing and the other jobs keep running during the install.
      void startBackground(job, exec, (outcome) => report(job, outcome), fetch, management, post).catch(() => log(`job ${job.id} report failed: access`));
      continue;
    }
    // A failure's message can hold command output, so only the job id is logged.
    const outcome = await runJob(job, exec, log, sleep).catch(() => ({ status: "failed" }));
    await report(job, outcome);
  }
  return interval;
}

export async function main({ env, fetch, exec, sleep, log }) {
  for (;;) {
    let interval = DEFAULT_INTERVAL;
    try {
      interval = await tick({ appUrl: env.APP_URL, token: env.AGENT_TOKEN, commit: env.SOURCE_COMMIT, fetch, exec, log, sleep });
    } catch (error) {
      log(`poll error: ${error.message}`);
    }
    await sleep(interval * 1000);
  }
}

/* c8 ignore next 9 -- the process entry point, run only by systemd */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({
    env: process.env,
    fetch: globalThis.fetch,
    exec: run,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(`wongstack-agent: ${line}`),
  });
}
