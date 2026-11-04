// The helper's schedule rounds: start the runs the app hands this computer, and mirror Paseo's schedules to the page.
// A run starts only from the repo's own record; the app sends just its id, key and revision. wiki/stack/live-line.md
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { helperFiles } from '../../../hand-over/scripts/lib/computer.mjs';
import { loadRecord, listRecords } from './records.mjs';
import { appCall, appFields, paseoAdapter, startupPrompt } from './hosts.mjs';
import { EXIT, PaseoError, findPaseo, paseo, runPaseo } from './paseo.mjs';
import { childEnv, flooredThinking, workspaceTitle } from '../workspace.mjs';

const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DISABLED = ['registering', 'paused', 'cancelled', 'completed', 'superseded', 'cleanup-pending'];
/** The least gap between two starts of one schedule when its record sets no `authority.minIntervalMs`. */
export const RUN_FLOOR_MS = 10 * 60_000;
const KEEP_MS = 30 * 86_400_000;

/** One call's answer, or null when it was not a success. */
async function ask(client, route, method, body) {
  try {
    const { value, status } = await appCall(client, route, method, body);
    return status >= 200 && status < 300 ? value : null;
  } catch { return null; }
}

/** The record a claimed run may start from, or the reason it may not. */
export async function checkRun(run, root) {
  if (!KEY.test(run?.key ?? '')) return { reason: 'unknown_key' };
  const reference = `schedules/${run.key}.json`;
  if (!existsSync(join(root, reference))) return { reason: 'unknown_key' };
  let item;
  try { item = await loadRecord(root, reference); } catch { return { reason: 'changed' }; }
  const binding = item.binding, cwd = binding.execution.context.cwd;
  if (binding.revision !== run.revision) return { reason: 'changed' };
  if (binding.execution.host !== 'app' || binding.execution.nativeId !== run.key) return { reason: 'not_app' };
  if (!binding.lifecycle.published) return { reason: 'not_published' };
  if (DISABLED.includes(binding.lifecycle.state)) return { reason: 'disabled' };
  if (!cwd || /[/\\]worktrees[/\\]/.test(cwd)) return { reason: 'worktree' };
  return { item };
}

/** Opens the run's chat as a Paseo schedule would: in the record's checkout, with the guarded startup prompt. */
export async function openSession({ binding, title, env = process.env }) {
  const context = binding.execution.context;
  const bin = findPaseo(env, 'WONG_PASEO_BIN');
  const args = ['run', '-d', '--cwd', context.cwd, '--title', title];
  if (context.provider) args.push('--provider', context.provider);
  // A provider may name its model (`codex/gpt-6.1-sol`); Paseo's default provider is Claude.
  const [provider, model = null] = String(context.provider || 'claude').split('/');
  const thinking = await flooredThinking(more => paseo(bin, more, { env: childEnv(env) }), { provider, model, thinking: null });
  if (thinking) args.push('--thinking', thinking);
  if (context.mode) args.push('--mode', context.mode);
  const { data } = await runPaseo(bin, [...args, '--', startupPrompt(binding)], { env: childEnv(env) });
  return { agentId: data?.agentId ?? null, chatTitle: data?.title ?? title };
}

function titleOf(item) {
  try { return workspaceTitle(item.name); } catch { return `Scheduled work: ${item.key}`; }
}

const placeOf = dir => { try { return realpathSync(dir); } catch { return dir; } };
const sameDir = (a, b) => { try { return realpathSync(a) === realpathSync(b); } catch { return false; } };

/** Checks the run against every folder signed in to its app: the one whose binding names it wins, else the first
 *  that holds a startable record, else the first refusal. */
async function checkIn(run, roots) {
  const checked = [];
  for (const root of roots) {
    const found = { ...(await checkRun(run, root)), root };
    if (found.item && sameDir(found.item.binding.execution.context.cwd, root)) return found;
    checked.push(found);
  }
  return checked.find(found => found.item) ?? checked.find(found => found.reason !== 'unknown_key') ?? { reason: 'unknown_key' };
}

/** The ledger of started runs, or null when it can not be read: then nothing starts. */
function readLedger(file) {
  if (!existsSync(file)) return { ids: {}, keys: {} };
  try { const kept = JSON.parse(readFileSync(file, 'utf8')); return { ids: kept.ids ?? {}, keys: kept.keys ?? {} }; } catch { return null; }
}

/** Notes the run as started before it opens, or says why it may not: an app can not start one run twice, nor one
 *  schedule more often than its record allows. */
function admit(run, { item }, { ledger, now }) {
  const kept = readLedger(ledger);
  if (!kept) return 'no_ledger';
  if (kept.ids[run.id]) return 'repeat';
  const least = item.binding.authority?.minIntervalMs;
  // Keyed by the folder the chat opens in, so a clone holding the same record can't reset the gap.
  const slot = `${placeOf(item.binding.execution.context.cwd)}:${run.key}`;
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

async function startRun(run, { roots, open, env, ledger, now }) {
  const found = await checkIn(run, roots);
  if (!found.item) return { state: 'blocked', reason: found.reason };
  const refused = admit(run, found, { ledger, now: now() });
  if (refused) return { state: 'blocked', reason: refused };
  try {
    const { agentId, chatTitle } = await open({ binding: found.item.binding, title: titleOf(found.item), env });
    return { state: 'started', agentId: agentId ?? undefined, chatTitle: chatTitle ?? undefined };
  } catch (error) {
    return { state: 'failed', reason: error instanceof PaseoError && error.code === EXIT.noPaseo ? 'no_opener' : 'open_failed' };
  }
}

/** Claims this computer's due runs and starts or refuses each, from whichever of `roots` holds its record; returns
 *  how many it handled. */
export async function runRound(client, { computer, root, roots = [root], log = () => {}, open = openSession, env = process.env,
  ledger = helperFiles(env).runs, now = Date.now }) {
  const runs = (await ask(client, 'claim', 'POST', { computer }))?.runs ?? [];
  for (const run of runs) {
    const result = await startRun(run, { roots, open, env, ledger, now });
    await ask(client, 'run-result', 'POST', { id: run.id, ...result });
    log({ event: 'run', key: run.key, run: run.id, outcome: result.state, reason: result.reason, chat: result.chatTitle });
  }
  return runs.length;
}

const ENDED = ['cancelled', 'completed', 'superseded'];

/** One page row for a record Paseo runs, with its next run as Paseo reports it. */
async function mirrorRow(item, inspect) {
  const fields = appFields(item);
  let observed = null;
  try { observed = await inspect(item.binding.execution.nativeId); } catch { /* the record's own state stands in */ }
  const paused = observed ? observed.status === 'paused' : item.binding.lifecycle.state === 'paused';
  const next = Date.parse(observed?.nextRunAt);
  return { key: item.key, name: fields.name, summary: fields.summary, timing: fields.timing, nextRunAt: Number.isFinite(next) ? next : null, state: paused ? 'paused' : 'on' };
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
