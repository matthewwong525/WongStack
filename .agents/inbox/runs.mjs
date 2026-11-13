// The helper's schedule rounds: start the runs the app hands this computer, and mirror Paseo's schedules to the page.
// A run starts only on a version approved here; only that approved text reaches the prompt. wiki/stack/live-line.md
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { helperFiles } from '../skills/reply-link/scripts/lib/computer.mjs';
import { approvedVersion, signedInAs } from './lib/approvals.mjs';
import { appCall, appTiming, heldDefinition, readSchedule, runnableFolder } from './lib/app.mjs';
import { listRecords } from '../skills/daily/skills/schedule/scripts/lib/records.mjs';
import { companyFor } from '../skills/reply-link/scripts/lib/inbox.mjs';
import { inProject } from '../skills/daily/scripts/schedule-runs.mjs';
import { paseoAdapter } from '../skills/daily/skills/schedule/scripts/lib/hosts.mjs';
import { startRun } from '../skills/daily/skills/schedule/scripts/lib/start-run.mjs';
import { appProgress } from './lib/progress.mjs';
import { scheduleVersion } from '../skills/daily/skills/schedule/scripts/lib/version.mjs';

const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/, VERSION = /^[a-f0-9]{64}$/;
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
 *  recomputed here, a sign-in (`not_signed_in`), that person's OK on the version, not ended, and a real folder. */
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
  // No sign-in here is told apart from a missing OK: an OK can not fix it.
  if (!who) return { reason: 'not_signed_in' };
  if (approvedVersion({ origin, email: who, key: run.key }, env) !== version) return { reason: 'not_approved' };
  if (!runnableFolder(schedule.run?.cwd)) return { reason: 'no_folder' };
  return { schedule, origin, email: who };
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

/** The claimed run with its progress when it may start, else `{state, reason}`; a run that then fails to open lets
 *  its progress go. */
async function admitRun(run, { client, env, ledger, now, email }) {
  const found = await checkRun(run, { client, env, email });
  if (!found.schedule) return { state: 'blocked', reason: found.reason };
  const refused = admit(run, found.schedule, { ledger, now: now() });
  if (refused) return { state: 'blocked', reason: refused };
  if (found.schedule.kind === 'background') return { found };
  const held = appProgress(client, run.key);
  let claimed = false;
  try {
    if (!(claimed = await held.claim(run.id))) return { state: 'blocked', reason: 'already_running' };
    return { found: { ...found, progress: (await held.read()).progress }, held };
  } catch {
    if (claimed) await held.release(run.id).catch(() => {});
    return { state: 'blocked', reason: 'no_app' };
  }
}

/** Claims this computer's due runs and starts, hands over or refuses each through Daily's `startRun`; returns how many
 *  it handled. */
export async function runRound(client, { computer, log = () => {}, open, hand, env = process.env,
  ledger = helperFiles(env).runs, now = Date.now, email = signedInAs }) {
  const runs = (await ask(client, 'claim', 'POST', { computer }))?.runs ?? [];
  const report = (id, result) => ask(client, 'run-result', 'POST', { id, ...result });
  for (const run of runs) {
    const { found, held, ...refused } = await admitRun(run, { client, env, ledger, now, email });
    let result = refused;
    if (found) {
      result = await startRun({ ...found, run }, { env, report, ...(open && { open }), ...(hand && { hand }) });
      if (result.state === 'failed') await held?.release(run.id).catch(() => {});
    } else await report(run.id, refused);
    log({ event: 'run', key: run.key, run: run.id, outcome: result.state, reason: result.reason, chat: result.chatTitle, warning: result.warning });
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

// ---------------------------------------------------------------------------
// The worker's side: a background run the helper handed to Daily's worker

/** The app as this worker reads it: its origin, the signed-in email, one schedule, and a run's result. */
export function scheduleApp(project, connect = () => companyFor(project)) {
  let client;
  const company = async () => (client ??= await connect());
  return {
    origin: async () => (await company())?.target() ?? null,
    email: origin => signedInAs(origin),
    schedule: async key => {
      const found = await company();
      if (!found) throw new Error('no app');
      return (await readSchedule(found, key))?.schedule ?? null;
    },
    report: async (id, result) => {
      // On failure the app's two minutes mark it.
      try { await appCall(await company(), 'run-result', 'POST', { id, ...result }); } catch { /* see above */ }
    },
  };
}

/** `{schedule}` when the run may start, else `{reason}`: a sign-in here (`not_signed_in`), the signed-in person's OK
 * on this version, the app's same version, not ended, and a folder in `project`. */
export async function checkHandedRun(event, { app, project, env = process.env }) {
  let origin, held;
  try { origin = await app.origin(); held = origin && await app.schedule(event.key); } catch { return { reason: 'no_app' }; }
  if (!origin) return { reason: 'no_app' };
  const email = String(event.email).toLowerCase();
  const who = app.email(origin);
  if (!who) return { reason: 'not_signed_in' };
  if (who !== email || approvedVersion({ origin, email, key: event.key }, env) !== event.version) return { reason: 'not_approved' };
  if (!held || held.kind !== 'background' || held.version !== event.version || scheduleVersion(heldDefinition(held)) !== event.version) {
    return { reason: 'changed' };
  }
  if (held.ended) return { reason: 'ended' };
  if (!runnableFolder(held.run?.cwd) || !inProject(held.run.cwd, project)) return { reason: 'no_folder' };
  return { schedule: held };
}
