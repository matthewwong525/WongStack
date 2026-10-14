#!/usr/bin/env node
// Saves a change through the app and reads its checks, in a copy installed through Connect your assistant
// (wiki/stack/employee-project.md). The app sign-in is the only login. Commands: `USAGE` below.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { companyClient, installState, neutralRoot } from '../../../../scripts/employee-bootstrap.mjs';
import { print, verdict, waitFor } from './artifacts-run.mjs';

const USAGE = 'usage: app-change.mjs wait [minutes] | preview | result <sha> <ref> | log <job> | change | push | open <title> <body file> | heads [ref] | can-publish | publish';
const CHANGE = '/api/access/code/change';
const LOG_LINES = 60;
/** The app's own refusals of a push, word for word (app/worker/employee-access). */
export const NOT_SET_UP = 'Saving through the app is not set up yet. Ask the owner to finish it in Access.';
export const NEVER_PUBLISHES = 'The app saves a change and never publishes. Push one branch that is not main.';
export const CHECK_FILES = 'This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.';
const REFUSED = 'The save was refused. Ask your admin for access to Connect your assistant, or sign in again.';
export const NO_PUBLISH = 'Publishing needs the Can publish tick. Ask your admin to give it to you in Access.';

/** The one line to show for a failed push: the app's own when Git's messages hold it, else the plain one. */
export const refusal = stderr => [NOT_SET_UP, NEVER_PUBLISHES, CHECK_FILES].find(line => String(stderr ?? '').includes(line)) ?? REFUSED;

const git = (cwd, ...args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: result.status === 0, text: (result.stdout ?? '').trim() };
};

// The connection this copy was installed through, made on first use. Never the client's root: its install
// record is the owner's and may name another origin.
function connection(root) {
  let made;
  const client = () => made ??= companyClient({ root: neutralRoot(), stateDir: installState(new URL(git(root, 'config', '--get', 'remote.origin.url').text).origin) });
  return { http: (...args) => client().http(...args), git: (...args) => client().git(...args) };
}

/** One call to the app: its answer, or `{ why, status }` when it refused or could not be read. */
async function ask(client, path, body) {
  try {
    const { value, status } = await client.http(path, body && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return status === 200 ? value : { why: value?.error?.message ?? `the app answered HTTP ${status}`, status };
  } catch (error) {
    return { why: error.message };
  }
}

const readChange = (client, branch, sha) => ask(client, `${CHANGE}?branch=${encodeURIComponent(branch)}&sha=${sha}`);
const red = row => row.bucket === 'fail' || row.bucket === 'cancel';
const unknown = line => ({ result: 'UNKNOWN', lines: [line] });

// The rules of wait-for-checks.sh over the app's rows: `{ result, lines }`. The head must first reach `sha`, so
// an earlier commit's green rows never answer for this push.
export async function waitRows(read, { sha, guard }, { minutes, grace, interval, sleep, now = () => Date.now() }) {
  const deadline = now() + minutes * 60_000;
  let since = now();
  let registered = false;
  let previous = null;
  for (;;) {
    const answer = await read();
    if (answer.why) return unknown(answer.why);
    if (!Array.isArray(answer.rows)) return unknown('the app returned no checks and no error; the gate is unverified.');
    const late = () => now() - since >= grace * 1000;
    // The grace for the checks starts when the head is this commit.
    if (!registered && answer.head === sha) [registered, since] = [true, now()];
    if (!registered) {
      if (late()) return unknown(`the change's head is ${answer.head ?? 'not there yet'}, not local HEAD ${sha}, after ${grace}s; push HEAD first.`);
    } else if (!answer.rows.length) {
      // No check workflow: nothing will ever report. With one, the rows may not be listed yet.
      if (!answer.workflows) return { result: 'NONE', lines: [] };
      if (late()) return unknown(`no check appeared for ${sha} within ${grace}s, but the project has check workflows.`);
    } else {
      const pending = answer.rows.filter(row => row.bucket === 'pending');
      const failed = answer.rows.filter(red);
      if (!pending.length && failed.length) return { result: 'FAILURE', lines: failed.map(row => `- ${row.name}  ${row.link}`) };
      const settled = pending.length ? null : answer.rows.map(row => `${row.bucket}\t${row.name}\t${row.link}`).sort().join('\n');
      const complete = answer.rows.some(row => row.bucket !== 'skipping') && (!guard || answer.rows.some(row => row.name === 'guard'));
      if (settled !== null && settled === previous && (complete || late())) return { result: 'SUCCESS', lines: [] };
      previous = settled;
      if (now() >= deadline) return { result: 'TIMEOUT', lines: pending.map(row => `- ${row.name} (still running)`) };
    }
    await sleep(interval * 1000);
  }
}

/** Waits for the checks of `sha` on `branch`, whichever shape the app answers in. */
export async function waitChange(client, { root, sha, branch }, timing) {
  const read = () => readChange(client, branch, sha);
  if (!(await read()).run) {
    const guard = ['origin/HEAD', 'origin/main'].some(ref => git(root, 'cat-file', '-e', `${ref}:.github/workflows/guard.yml`).ok);
    return waitRows(read, { sha, guard }, timing);
  }
  const restart = async () => {
    const answer = await ask(client, `${CHANGE}/restart`, { branch, sha });
    return answer.restart === 'started' ? { ok: true } : { ok: false, why: answer.why ?? `the app answered ${answer.restart ?? 'nothing'}` };
  };
  const readRun = async () => {
    const answer = await read();
    return answer.run ?? { state: 'unreadable', why: answer.why ?? 'the app returned no check run' };
  };
  return waitFor({ read: readRun, restart }, { sha, ref: `refs/heads/${branch}` }, timing);
}

/** Runs one command; returns the exit code. `client` has the connection's `git` and `http`. */
export async function cli(argv, { cwd = process.cwd(), env = process.env, out = console.log, err = console.error, client, sleep = (ms) => new Promise((done) => setTimeout(done, ms)), now } = {}) {
  const [command, ...rest] = argv;
  const root = git(cwd, 'rev-parse', '--show-toplevel').text || cwd;
  client ??= connection(root);
  const sha = git(root, 'rev-parse', 'HEAD').text;
  const branch = git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD').text;
  const usage = () => { err(USAGE); return 2; };
  const refused = line => { err(line); return 1; };
  const shown = (answer, more) => JSON.stringify({ state: answer.state ?? null, url: answer.url ?? null, number: answer.number ?? null, ...more });

  if (command === 'result') {
    const [commit, ref = ''] = rest;
    if (!/^[0-9a-f]{40}$/.test(commit ?? '') || !ref.startsWith('refs/heads/')) return usage();
    const answer = await readChange(client, ref.slice('refs/heads/'.length), commit);
    const read = answer.run && verdict(answer.run, { sha: commit, ref });
    // Rows settle a pass only in the waiter, on two reads; one read can still say a check is red.
    if (read) out(read.cutOff ? 'INTERRUPTED' : read.result ?? 'PENDING');
    else out(Array.isArray(answer.rows) && answer.rows.some(red) ? 'FAILURE' : 'UNKNOWN');
    return 0;
  }
  if (command === 'log') {
    if (!/^\d+$/.test(rest[0] ?? '')) return usage();
    const answer = await ask(client, `${CHANGE}/log?job=${rest[0]}`);
    const lines = (Array.isArray(answer.lines) ? answer.lines : []).filter(Boolean).slice(-LOG_LINES);
    out(lines.length ? `CAUSE: last ${lines.length} lines of the failed log` : `CAUSE=the log could not be read (${answer.why ?? 'empty'}); open LINK`);
    for (const line of lines) out(`  | ${line}`);
    return 0;
  }
  if (command === 'heads') {
    try {
      const listed = await client.git(['ls-remote', '--heads', 'origin', ...rest], root);
      if (listed.code !== 0) return refused(refusal(listed.stderr));
      if (listed.stdout) out(listed.stdout);
      return 0;
    } catch (error) {
      return refused(error.message);
    }
  }
  if (command === 'can-publish') {
    const answer = await ask(client, '/api/access/apps');
    if (answer.why) return refused(answer.why);
    out(answer.keys?.some(key => key.id === 'code' && key.level === 'write') ? 'yes' : 'no');
    return 0;
  }
  if (!['wait', 'preview', 'change', 'push', 'open', 'publish'].includes(command)) return usage();
  const named = sha && branch;
  if (command === 'wait') {
    const timing = { minutes: Number(rest[0] ?? 20), grace: Number(env.WAIT_FOR_CHECKS_GRACE ?? 60), interval: Number(env.WAIT_FOR_CHECKS_INTERVAL ?? 10), sleep, now };
    print(out, named ? await waitChange(client, { root, sha, branch }, timing) : unknown('this checkout is not on a branch, so no change can be named for it.'));
    return 0;
  }
  if (command === 'preview') {
    const answer = named ? await readChange(client, branch, sha) : {};
    const read = answer.run && verdict(answer.run, { sha, ref: `refs/heads/${branch}` });
    const address = read ? read.result === 'SUCCESS' && read.address : answer.preview;
    if (typeof address === 'string' && address) {
      err(`via: ${read ? 'check run' : 'the app'}`);
      out(address);
    }
    return 0;
  }
  if (!named) return refused('this checkout is not on a branch, so it has no change to save.');
  if (command === 'push') {
    try {
      const sent = await client.git(['push', '-u', 'origin', 'HEAD'], root);
      return sent.code === 0 ? 0 : refused(refusal(sent.stderr));
    } catch (error) {
      return refused(error.message);
    }
  }
  if (command === 'publish') {
    const answer = await ask(client, `${CHANGE}/publish`, { branch, sha });
    if (answer.why) return refused(answer.status === 403 ? NO_PUBLISH : answer.why);
    out(`published=yes\ncommit=${answer.commit}\nchange=${answer.url ?? 'none'}`);
    // Best effort: the copy learns the new main now, and the next save brings it in anyway.
    try { await client.git(['fetch', 'origin'], root); } catch { /* the publish stands */ }
    return 0;
  }
  if (command === 'open' && rest.length !== 2) return usage();
  const answer = command === 'open'
    ? await ask(client, CHANGE, { branch, title: rest[0], body: readFileSync(rest[1], 'utf8') })
    : await readChange(client, branch, sha);
  if (answer.why) return refused(answer.why);
  out(shown(answer, command === 'change' && { rows: Array.isArray(answer.rows) }));
  return 0;
}

if (isMain(import.meta.url)) process.exitCode = await cli(process.argv.slice(2));
