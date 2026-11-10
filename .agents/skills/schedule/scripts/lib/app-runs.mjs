// The helper's schedule rounds: start the runs the app hands this computer, and mirror Paseo's schedules to the page.
// A run starts only on a version approved here; only that approved text reaches the prompt. wiki/stack/live-line.md
import { spawn as spawnChild } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { helperFiles } from '../../../hand-over/scripts/lib/computer.mjs';
import { agentEvents } from '../../../daily/scripts/chief.mjs';
import { SCHEDULE_LABEL } from '../../../daily/scripts/chats.mjs';
import { approvedVersion, signedInAs } from './approvals.mjs';
import { appCall, appTiming, heldDefinition, readSchedule, runnableFolder } from './app.mjs';
import { listRecords } from './records.mjs';
import { firstMessage, paseoAdapter } from './hosts.mjs';
import { appProgress } from './progress.mjs';
import { scheduleVersion } from './version.mjs';
import { EXIT, PaseoError, findPaseo, git, paseo, runPaseo } from './paseo.mjs';
import { MODES, childEnv, defaultBranch, flooredThinking, freshBase, nameWorkspace, parseCreated, workspaceTitle } from '../workspace.mjs';

const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/, VERSION = /^[a-f0-9]{64}$/;
/** How long a chat run's fetch of the default branch may take before the run starts from the last fetched copy. */
export const FETCH_TIMEOUT_MS = 60_000;
/** The least gap between two starts of one schedule when it sets no `authority.minIntervalMs`. */
export const RUN_FLOOR_MS = 10 * 60_000;
const KEEP_MS = 30 * 86_400_000;

/** One call's answer, or null when it was not a success. */
async function ask(client, route, method, body) {
  try {
    const { value, status } = await appCall(client, route, method, body);
    return status >= 200 && status < 300 ? value : null;
  } catch { return null; }
}

/** `{schedule, origin, email}` when the claimed run may start, else `{reason}`: the app's schedule, its version
 *  recomputed here, the signed-in person's OK on that version, not ended, and a real folder. */
export async function checkRun(run, { client, env = process.env, email = signedInAs }) {
  if (!KEY.test(run?.key ?? '') || !VERSION.test(run?.revision ?? '')) return { reason: 'unknown_key' };
  let found;
  try { found = await readSchedule(client, run.key); } catch { return { reason: 'no_app' }; }
  const schedule = found?.schedule;
  if (!schedule) return { reason: 'unknown_key' };
  if (schedule.host !== 'app') return { reason: 'not_app' };
  if (schedule.ended) return { reason: 'ended' };
  const version = scheduleVersion(heldDefinition(schedule));
  if (version !== schedule.version || version !== run.revision) return { reason: 'changed' };
  const origin = client.target(), who = origin && email(origin);
  if (!who || approvedVersion({ origin, email: who, key: run.key }, env) !== version) return { reason: 'not_approved' };
  if (!runnableFolder(schedule.run?.cwd)) return { reason: 'no_folder' };
  return { schedule, origin, email: who };
}

/** Where a chat run's workspace opens: a fresh worktree from the fetched default branch in a git project, so the
 *  run never works on the main copy; else the folder itself, since a worktree needs git. Returns any warning. */
async function workspacePlace(cwd) {
  let inGit = false;
  try { inGit = git(cwd, 'rev-parse', '--is-inside-work-tree') === 'true'; } catch { /* not a git project */ }
  if (!inGit) return { args: ['--new-workspace', 'local'], warning: null };
  try {
    const { base, warning } = await freshBase(cwd, await defaultBranch(cwd), { fetch: true, timeout: FETCH_TIMEOUT_MS });
    return { args: ['--new-workspace', 'worktree', '--worktree-mode', 'branch-off', '--base', base], warning };
  } catch (error) {
    // The run must still start: with no default branch to copy, it opens in its folder.
    return { args: ['--new-workspace', 'local'], warning: `The run opened in its folder, not a fresh copy: ${error.message}` };
  }
}

/** Opens a chat run's own workspace through Paseo, with the approved instructions, then names the workspace after
 *  the schedule; a fetch or rename problem comes back as `warning`, and the run still starts. */
export async function openSession({ schedule, run, title, progress = null, env = process.env }) {
  const settings = schedule.run;
  const bin = findPaseo(env, 'WONG_PASEO_BIN');
  // Paseo refuses a run with no provider; a schedule that names none runs on Claude.
  const named = settings.provider || 'claude';
  const place = await workspacePlace(settings.cwd);
  // The label lets the Inbox keep a schedule's chat off the list while it runs.
  const args = ['run', '-d', ...place.args, '--cwd', settings.cwd, '--title', title, '--provider', named, '--label', `${SCHEDULE_LABEL}=${schedule.key}`];
  const [provider, model = null] = named.split('/');
  const thinking = await flooredThinking(more => paseo(bin, more, { env: childEnv(env) }), { provider, model, thinking: settings.thinking ?? null });
  if (thinking) args.push('--thinking', thinking);
  // No one is there to allow a step, so an unattended run takes the provider's full mode unless the schedule sets one.
  const mode = settings.mode || MODES[provider];
  if (mode) args.push('--mode', mode);
  const { data, stderr } = await runPaseo(bin, [...args, '--', firstMessage({ schedule, run, progress })], { env: childEnv(env) });
  // Without a rename, Paseo names the workspace after its git branch, so every run shows as `main`.
  const renamed = await nameWorkspace(bin, parseCreated(stderr), title, env);
  const warning = [place.warning, renamed.warning].filter(Boolean).join('\n');
  return { agentId: data?.agentId ?? null, chatTitle: data?.title ?? title, ...(warning ? { warning } : {}) };
}

/** Hands a background run to the worker in its checkout: one event file, then `D ensure`. The worker reports the
 *  run's result; when the file can not be written, no worker will. */
export function handOver({ schedule, run, origin, email }, { env = process.env, spawn = spawnChild, now = Date.now } = {}) {
  const cwd = schedule.run.cwd, file = join(agentEvents(env), `schedule-run-${run.id}.json`);
  const event = { event: 'schedule-run', key: schedule.key, run: run.id, version: schedule.version, origin, email, cwd };
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, `${JSON.stringify({ event, at: new Date(now()).toISOString() })}\n`, { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
  } catch { return { state: 'failed', reason: 'no_worker' }; }
  try {
    spawn(process.execPath, [join(cwd, '.agents/skills/daily/scripts/daily.mjs'), 'ensure'], { cwd, detached: true, stdio: 'ignore', env: childEnv(env) }).unref();
  } catch { /* the worker's own start picks the file up */ }
  return { state: 'handed' };
}

function titleOf(schedule) {
  try { return workspaceTitle(schedule.name); } catch { return `Scheduled work: ${schedule.key}`; }
}

const placeOf = dir => { try { return realpathSync(dir); } catch { return dir; } };

/** The ledger of started runs, or null when it can not be read: then nothing starts. */
function readLedger(file) {
  if (!existsSync(file)) return { ids: {}, keys: {} };
  try { const kept = JSON.parse(readFileSync(file, 'utf8')); return { ids: kept.ids ?? {}, keys: kept.keys ?? {} }; } catch { return null; }
}

/** Notes the run as started before it opens, or says why it may not: an app can not start one run twice, nor one
 *  schedule more often than it allows. */
function admit(run, schedule, { ledger, now }) {
  const kept = readLedger(ledger);
  if (!kept) return 'no_ledger';
  if (kept.ids[run.id]) return 'repeat';
  const least = schedule.authority?.minIntervalMs;
  // Keyed by the folder the run opens in, so a second app with the same key can't reset the gap.
  const slot = `${placeOf(schedule.run.cwd)}:${run.key}`;
  if (now - (kept.keys[slot] ?? -Infinity) < (Number.isFinite(least) ? least : RUN_FLOOR_MS)) return 'too_soon';
  for (const [id, at] of Object.entries(kept.ids)) if (now - at > KEEP_MS) delete kept.ids[id];
  kept.ids[run.id] = now;
  kept.keys[slot] = now;
  try {
    mkdirSync(dirname(ledger), { recursive: true, mode: 0o700 });
    const draft = `${ledger}.${process.pid}.tmp`;
    writeFileSync(draft, `${JSON.stringify(kept)}\n`, { mode: 0o600 });
    renameSync(draft, ledger);
  } catch { return 'no_ledger'; }
  return null;
}

async function startRun(run, { client, open, hand, env, ledger, now, email }) {
  const found = await checkRun(run, { client, env, email });
  if (!found.schedule) return { state: 'blocked', reason: found.reason };
  const refused = admit(run, found.schedule, { ledger, now: now() });
  if (refused) return { state: 'blocked', reason: refused };
  if (found.schedule.kind === 'background') return hand({ ...found, run }, { env });
  const held = appProgress(client, run.key);
  let progress, claimed = false;
  try {
    if (!(claimed = await held.claim(run.id))) return { state: 'blocked', reason: 'already_running' };
    ({ progress } = await held.read());
  } catch {
    if (claimed) await held.release(run.id).catch(() => {});
    return { state: 'blocked', reason: 'no_app' };
  }
  try {
    const { agentId, chatTitle, warning } = await open({ schedule: found.schedule, run, title: titleOf(found.schedule), progress, env });
    return { state: 'started', agentId: agentId ?? undefined, chatTitle: chatTitle ?? undefined, warning: warning || undefined };
  } catch (error) {
    await held.release(run.id).catch(() => {});
    return { state: 'failed', reason: error instanceof PaseoError && error.code === EXIT.noPaseo ? 'no_opener' : 'open_failed' };
  }
}

/** Claims this computer's due runs and starts, hands over or refuses each; returns how many it handled. */
export async function runRound(client, { computer, log = () => {}, open = openSession, hand = handOver, env = process.env,
  ledger = helperFiles(env).runs, now = Date.now, email = signedInAs }) {
  const runs = (await ask(client, 'claim', 'POST', { computer }))?.runs ?? [];
  for (const run of runs) {
    // The warning stays in this computer's log; the app records only the outcome.
    const { warning, ...result } = await startRun(run, { client, open, hand, env, ledger, now, email });
    // A handed run's worker reports it.
    if (result.state !== 'handed') await ask(client, 'run-result', 'POST', { id: run.id, ...result });
    log({ event: 'run', key: run.key, run: run.id, outcome: result.state, reason: result.reason, chat: result.chatTitle, warning });
  }
  return runs.length;
}

const ENDED = ['cancelled', 'completed', 'superseded'];
const firstLine = text => String(text ?? '').split('\n').map(part => part.trim()).find(Boolean) ?? '';

/** One page row for a record Paseo runs, with its next run as Paseo reports it. */
async function mirrorRow(item, inspect) {
  let observed = null;
  try { observed = await inspect(item.binding.execution.nativeId); } catch { /* the record's own state stands in */ }
  const paused = observed ? observed.status === 'paused' : item.binding.lifecycle.state === 'paused';
  const next = Date.parse(observed?.nextRunAt);
  return { key: item.key, name: firstLine(item.name ?? item.key).slice(0, 200), summary: firstLine(item.record?.summary ?? item.record?.instructions).slice(0, 300),
    timing: appTiming(item.binding.timing), nextRunAt: Number.isFinite(next) ? next : null, state: paused ? 'paused' : 'on' };
}

/** Uploads one row per repo record bound to Paseo, from every folder signed in to the app, replacing this computer's
 *  mirror; returns the count, or null. One folder that can not be read sends nothing, so its rows are not dropped. */
export async function mirrorRound(client, { computer, root, roots = [root], log = () => {}, list = folder => listRecords(folder), inspect,
  env = process.env }) {
  const read = inspect ?? (id => paseoAdapter({ env }).inspect(id));
  const records = new Map();
  try {
    for (const folder of roots) for (const item of (await list(folder)).records) if (!records.has(item.key)) records.set(item.key, item);
  } catch { log({ event: 'mirror', outcome: 'failed', reason: 'no_records' }); return null; }
  const bound = [...records.values()].filter(item => item.binding.execution.host === 'paseo' && item.binding.execution.nativeId
    && !ENDED.includes(item.binding.lifecycle.state));
  const schedules = [];
  for (const item of bound) schedules.push(await mirrorRow(item, read));
  const answer = await ask(client, 'mirror', 'PUT', { computer, schedules });
  log({ event: 'mirror', outcome: answer ? 'sent' : 'failed' });
  return answer ? answer.mirrored ?? schedules.length : null;
}
