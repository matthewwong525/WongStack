#!/usr/bin/env node
// Reads a check run of an Artifacts install: the run the check runner started for one exact commit on one branch
// (wiki/stack/artifacts-route.md). An unreadable, mismatched or cut-off run is UNKNOWN: never passed, never FAILURE.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../../memory/scripts/lib/store.mjs';
import { runId } from '../../../../scripts/check-runner/run-id.mjs';
import { delivery } from './delivery-route.mjs';

const API = 'https://api.cloudflare.com/client/v4';
const USAGE = 'usage: artifacts-run.mjs wait [minutes] | preview | live <sha> | result <sha> <ref> | restart <sha> <ref>';
const CUT_OFF = 'the check run was cut off';
const MAIN = 'refs/heads/main';
const ADDRESS = /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/\S*)?$/;
const RUNNING = new Set(['queued', 'running', 'paused', 'waiting', 'waitingForPause', 'rollingBack']);

/** One read of a run: `missing`, `pending`, `done` with its output, `errored`, or `unreadable`. */
export async function readRun({ api = API, token, account, workflow, id, fetch: fetchFn = globalThis.fetch }) {
  let response;
  try {
    response = await fetchFn(instanceUrl({ api, account, workflow, id }), { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return { state: 'unreadable', why: 'Cloudflare could not be reached' };
  }
  if (response.status === 404) return { state: 'missing' };
  const data = await response.json().catch(() => ({}));
  // Cloudflare can answer a finished run with its whole result and an error flag beside it, when one step's detail
  // fails to load. The run still finished; `verdict` holds its output to the commit and branch.
  const finished = data.result?.status === 'complete' && data.result.success === true && data.result.output !== null && typeof data.result.output === 'object';
  // The same flag beside a run still going says nothing about its result: keep waiting.
  if (response.ok && !data.success && RUNNING.has(data.result?.status)) return { state: 'pending' };
  if (!response.ok || !data.result || (!data.success && !finished)) return { state: 'unreadable', why: `Cloudflare answered HTTP ${response.status}` };
  const { status, output, error } = data.result;
  if (status === 'complete') return { state: 'done', output };
  if (status === 'errored' || status === 'terminated') return { state: 'errored', why: String(error?.message ?? status) };
  return RUNNING.has(status) ? { state: 'pending' } : { state: 'unreadable', why: `the run is in an unknown state: ${status}` };
}

/** The address of one run, and of the call that changes its status. */
const instanceUrl = ({ api = API, account, workflow, id }) => `${api.replace(/\/$/, '')}/accounts/${account}/workflows/${encodeURIComponent(workflow)}/instances/${id}`;

// Starts one run again under its own name, through Cloudflare's instance-status call, so every reader still finds
// it by commit and branch: `{ ok }` or `{ ok: false, why }`. The caller decides whether a run may restart.
export async function restartRun({ token, fetch: fetchFn = globalThis.fetch, ...run }) {
  let response;
  try {
    response = await fetchFn(`${instanceUrl(run)}/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'restart' }) });
  } catch {
    return { ok: false, why: 'Cloudflare could not be reached' };
  }
  if (response.ok) return { ok: true };
  const refused = response.status === 401 || response.status === 403 ? '; the saved Cloudflare token may not restart a check run' : '';
  return { ok: false, why: `Cloudflare answered HTTP ${response.status}${refused}` };
}

// What one read means for `sha` on `ref`: `{ result, lines, address }`; `result` is null while missing or running.
// A pass needs the run's own word for this commit and branch. A cut-off run is UNKNOWN with `cutOff`, never FAILURE.
export function verdict(run, { sha, ref }) {
  if (run.state === 'missing' || run.state === 'pending') return { result: null, lines: [] };
  if (run.state === 'unreadable') return { result: 'UNKNOWN', lines: [run.why] };
  if (run.state === 'errored') return { result: 'UNKNOWN', cutOff: true, lines: [CUT_OFF, `the run stopped: ${run.why}`] };
  const output = run.output;
  if (!output || typeof output !== 'object' || output.commit !== sha || output.ref !== ref) return { result: 'UNKNOWN', lines: ['the run answered for another commit or branch'] };
  if (output.result === 'none') return { result: 'NONE', lines: [] };
  if (output.result === 'failure') return { result: 'FAILURE', lines: [`${output.stage ?? 'checks'} failed`, ...String(output.reason ?? '').split('\n')] };
  if (output.result === 'interrupted') return { result: 'UNKNOWN', cutOff: true, retry: true, lines: [CUT_OFF, `${output.stage ?? 'a stage'} did not finish`, ...String(output.reason ?? '').split('\n')] };
  if (output.result !== 'success') return { result: 'UNKNOWN', lines: ['the run reported no result'] };
  const address = output[ref === MAIN ? 'production' : 'preview'];
  if (output.deployed && !ADDRESS.test(address ?? '')) return { result: 'UNKNOWN', lines: ['the run passed but reported no address for its deploy'] };
  return { result: 'SUCCESS', lines: [], address: output.deployed ? address : null };
}

const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** The install's recorded runner, the person's token, and this checkout's commit and branch. */
export function context(cwd = process.cwd(), env = process.env) {
  const { route, root, delivery: recorded } = delivery(cwd);
  if (route !== 'artifacts') throw new Error('this checkout is not an Artifacts install');
  let token = env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    const file = join(primaryRoot(root).primary, '.env');
    token = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')).CLOUDFLARE_API_TOKEN : '';
  }
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not set in the primary worktree .env');
  if (!recorded.accountId || !recorded.workflow) throw new Error('the install record names no check runner');
  const branch = git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD');
  return { token, account: recorded.accountId, workflow: recorded.workflow, api: env.WONG_CLOUDFLARE_API || API, sha: git(root, 'rev-parse', 'HEAD'), ref: branch ? `refs/heads/${branch}` : '' };
}

// Why a run may not be started again, or '' when it may: only a cut-off run. A failed check stands, a finished
// run is finished, and a run still going needs no second start.
export function restartRefusal(run, read) {
  if (read.cutOff) return '';
  if (run.state === 'missing') return 'no check run exists for that commit on that branch';
  if (run.state === 'pending') return 'the run is still going';
  if (read.result === 'FAILURE') return 'the run failed its checks, and that failure stands; fix the commit and save again';
  if (read.result === 'UNKNOWN') return `the run could not be read: ${read.lines[0]}`;
  return 'the run finished; only a run that was cut off is started again';
}

// Polls one run until it settles; `grace` bounds the wait for a missing run. A run the runner reported as
// interrupted is started again once, inside the same limit.
export async function waitRun(target, head, { fetch: fetchFn, ...timing }) {
  const run = { ...target, id: await runId(head.sha, head.ref), fetch: fetchFn };
  return waitFor({ read: () => readRun(run), restart: () => restartRun(run) }, head, timing);
}

/** The wait itself, over any reader of one run: `read()` gives the run, `restart()` gives `{ ok, why }`. */
export async function waitFor({ read: readOnce, restart }, { sha, ref }, { minutes, grace, interval, sleep, now = () => Date.now() }) {
  const start = now();
  let restarted = false;
  for (;;) {
    const run = await readOnce();
    const read = verdict(run, { sha, ref });
    if (read.retry && !restarted) {
      restarted = true;
      const again = await restart();
      if (!again.ok) return { ...read, lines: [...read.lines, `it could not be started again: ${again.why}`] };
      await sleep(interval * 1000);
      continue;
    }
    if (read.result) return read;
    const waited = (now() - start) / 1000;
    if (run.state === 'missing' && waited >= grace) return { result: 'UNKNOWN', lines: [`no check run appeared for ${sha} within ${grace}s; push HEAD first.`] };
    if (waited >= minutes * 60) return { result: 'TIMEOUT', lines: ['- checks (still running)'] };
    await sleep(interval * 1000);
  }
}

export const print = (out, { result, lines }, label = 'RESULT') => {
  out(`${label}: ${result}`);
  for (const line of lines.filter(Boolean)) out(`  ${line}`);
};

/** Runs one command; returns the exit code. Every answer is on stdout, as the shell scripts expect. */
export async function cli(argv, { cwd = process.cwd(), env = process.env, out = console.log, err = console.error, fetch: fetchFn, sleep = (ms) => new Promise((done) => setTimeout(done, ms)) } = {}) {
  const [command, ...rest] = argv;
  const timing = { grace: Number(env.WAIT_FOR_CHECKS_GRACE ?? 60), interval: Number(env.WAIT_FOR_CHECKS_INTERVAL ?? 10), fetch: fetchFn, sleep };
  if (!['wait', 'preview', 'live', 'result', 'restart'].includes(command)) {
    err(USAGE);
    return 2;
  }
  let target;
  try {
    target = context(cwd, env);
  } catch (error) {
    if (command === 'wait') print(out, { result: 'UNKNOWN', lines: [error.message] });
    else if (command === 'live') out('unknown');
    else if (command === 'result') out('UNKNOWN');
    else if (command === 'restart') print(out, { result: 'failed', lines: [error.message] }, 'RESTART');
    return command === 'restart' ? 1 : 0;
  }
  const head = { sha: target.sha, ref: target.ref };
  if (command === 'wait') {
    const answer = head.sha && head.ref
      ? await waitRun(target, head, { ...timing, minutes: Number(rest[0] ?? 20) })
      : { result: 'UNKNOWN', lines: ['this checkout is not on a branch, so no run can be named for it.'] };
    print(out, answer);
    return 0;
  }
  if (command === 'preview') {
    if (!head.sha || !head.ref || head.ref === MAIN) return 0;
    const read = verdict(await readRun({ ...target, id: await runId(head.sha, head.ref), fetch: fetchFn }), head);
    if (read.result === 'SUCCESS' && read.address) {
      err('via: check run');
      out(read.address);
    }
    return 0;
  }
  const [sha, ref = MAIN] = rest;
  if (!/^[0-9a-f]{40}$/.test(sha ?? '') || !ref.startsWith('refs/heads/')) {
    err(USAGE);
    return 2;
  }
  if (command === 'result' || command === 'restart') {
    const id = await runId(sha, ref);
    const run = await readRun({ ...target, id, fetch: fetchFn });
    const read = verdict(run, { sha, ref });
    if (command === 'result') {
      out(read.cutOff ? 'INTERRUPTED' : read.result ?? 'PENDING');
      return 0;
    }
    const refusal = restartRefusal(run, read);
    if (refusal) {
      print(out, { result: 'refused', lines: [refusal] }, 'RESTART');
      return 1;
    }
    const again = await restartRun({ ...target, id, fetch: fetchFn });
    print(out, again.ok ? { result: 'started', lines: [`wait for it with: artifacts-run.mjs ${ref === MAIN ? `live ${sha}` : 'wait'}`] } : { result: 'failed', lines: [again.why] }, 'RESTART');
    return again.ok ? 0 : 1;
  }
  const minutes = Number(env.LIVE_LOOK_WAIT_SECONDS ?? 600) / 60;
  const read = await waitRun(target, { sha, ref: MAIN }, { ...timing, interval: Number(env.LIVE_LOOK_POLL_SECONDS ?? 15), minutes });
  const words = { SUCCESS: read.address ?? 'none', NONE: 'none', FAILURE: 'failed' };
  out(read.cutOff ? 'interrupted' : words[read.result] ?? 'unknown');
  return 0;
}

if (isMain(import.meta.url)) process.exitCode = await cli(process.argv.slice(2));
