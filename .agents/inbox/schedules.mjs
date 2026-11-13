// WongStack's schedule store for Daily's `/schedule`: the person's schedules in the company app, each approved per
// computer. Daily calls it through the profile's `schedules` part. wiki/stack/host-schedules.md
import { existsSync, readFileSync } from 'node:fs';
import { computerId, helperService } from '../skills/reply-link/scripts/lib/computer.mjs';
import { companyFor } from '../skills/reply-link/scripts/lib/inbox.mjs';
import { approveHere, approvalState, approver, appHost, definition, heldDefinition, readSchedule, saveDefinition, send, shownText } from './lib/app.mjs';
import { addDefaults } from './lib/defaults.mjs';
import { appProgress } from './lib/progress.mjs';
import { checkHandedRun, mirrorRound, scheduleApp } from './runs.mjs';
import { paseoAdapter, selectHost, validateReceipt } from '../skills/daily/skills/schedule/scripts/lib/hosts.mjs';
import { listRecords, loadRecord, requireValue, ScheduleError } from '../skills/daily/skills/schedule/scripts/lib/records.mjs';
import { scheduleVersion } from '../skills/daily/skills/schedule/scripts/lib/version.mjs';

const UNREACHABLE = 'The app can not be reached; no times are shown.';
const SIGN_IN = 'Default schedules wait: sign in to the company app (`D who` gives the link).';
const iso = at => (Number.isFinite(at) ? new Date(at).toISOString() : null);
const daily = () => import('../skills/daily/scripts/daily.mjs');
const here = world => ({ computer: world.computer ?? computerId(world.env), email: world.email });

async function connect(world) {
  let client;
  try { client = await (world.company ?? companyFor)(world.root); } catch { /* reported below */ }
  if (!client) throw new ScheduleError('The company app does not answer from this checkout. Sign in first.', 3);
  return client;
}

function signedIn(client, email) {
  try { return approver(client, { email }); } catch { return null; }
}

/** One list row: what it does, its state, where it runs, its next run, its last result, and whether it needs an OK. */
function row(schedule, who, computer, env) {
  return { key: schedule.key, name: schedule.name, kind: schedule.kind, host: schedule.host, state: schedule.ended ? 'ended' : schedule.state,
    nextRunAt: iso(schedule.nextRunAt), lastRun: schedule.lastRun && { state: schedule.lastRun.state, result: schedule.lastRun.result, dueAt: iso(schedule.lastRun.dueAt) },
    runsOn: schedule.computerName ?? null, ...approvalState(schedule, who, computer, env) };
}

/** The schedule as it would run here: a team copy with no folder runs in this primary checkout. */
function localDefinition(schedule, primary) {
  const def = heldDefinition(schedule);
  return def.run.cwd ? def : { ...def, run: { ...def.run, cwd: primary } };
}

async function found(client, key) {
  const held = await readSchedule(client, key);
  if (!held) throw new ScheduleError('The app has no schedule with this key.', 2);
  return held;
}

export async function list(world) {
  const client = await connect(world), { computer, email } = here(world);
  let listed;
  try { listed = await send(client, 'schedules'); } catch (error) { throw error.code === 3 ? new ScheduleError(UNREACHABLE, 3) : error; }
  const who = signedIn(client, email);
  return { schedules: listed.schedules.map(schedule => row(schedule, who, computer, world.env)), computerOnline: listed.computerOnline };
}

export async function get(key, world) {
  const client = await connect(world), { computer, email } = here(world), held = await found(client, key);
  return { schedule: held.schedule, runs: held.runs, approval: approvalState(held.schedule, signedIn(client, email), computer, world.env) };
}

/** The text the person approves: of a saved schedule, or of `raw`, a file not saved yet. */
export async function show(key, world, raw = null) {
  if (raw) {
    const def = definition(raw, { primary: world.primary }), version = scheduleVersion(def);
    return { key: def.key, version, text: shownText(def, version) };
  }
  const held = await found(await connect(world), key), def = localDefinition(held.schedule, world.primary), version = scheduleVersion(def);
  return { key, version, text: shownText(def, version), ...(version !== held.schedule.version ? { binds: world.primary } : {}) };
}

const approveOptions = world => ({ ...here(world), env: world.env, ...(world.hostname ? { name: world.hostname } : {}) });

/** Saves the person's file; `approve` records this computer's OK on the version shown. */
export async function save(raw, { approve = false, version = null, team = null } = {}, world) {
  const client = await connect(world), def = definition(raw, { primary: world.primary, team: Boolean(team) });
  if (team) return saveDefinition(client, def, { team: team.split(',').map(each => each.trim()).filter(Boolean) });
  requireValue(!version || version === scheduleVersion(def), 'The file differs from the version the person saw; show it again.');
  const saved = await saveDefinition(client, def, { computer: here(world).computer });
  return { key: def.key, version: saved.version, ...(approve ? await approveHere(client, saved.schedule, saved.version, approveOptions(world)) : { needsOk: true }) };
}

/** The version the person saw, saved first when this computer fills in a team copy's folder. */
export async function approve(key, version, world) {
  const client = await connect(world), held = await found(client, key), computer = here(world).computer;
  const def = localDefinition(held.schedule, world.primary), now = scheduleVersion(def);
  if (now !== version) throw new ScheduleError('The schedule changed since it was shown; show it again.', 1, { reason: 'changed' });
  requireValue(!held.schedule.computer || held.schedule.computer === computer, `This schedule runs on ${held.schedule.computerName ?? 'another computer'}; approve it there.`);
  const schedule = now === held.schedule.version ? held.schedule : (await saveDefinition(client, def, { computer })).schedule;
  return { key, version, ...(await approveHere(client, schedule, version, approveOptions(world))) };
}

/** pause or resume: the app's routes, or the Paseo job of a schedule that still runs there. */
async function pauseOrRun(command, key, world, client) {
  try { return { schedule: (await send(client, command === 'run' ? 'run-now' : command, 'POST', { key })).schedule }; } catch (error) {
    if (error.extra?.reason !== 'not_app' || command === 'run') throw error;
  }
  const item = loadRecord(world.root, `schedules/${key}.json`), id = item.binding.execution.nativeId;
  const receipt = validateReceipt(await (world.paseo ?? paseoAdapter({ env: world.env }))[command](id), { host: 'paseo', nativeId: id, action: command });
  return { host: 'paseo', receipt };
}

async function finish(key, values, client) {
  requireValue(values.run, 'A finish names its run.');
  const progress = appProgress(client, key);
  requireValue((await progress.read()).claim?.run === values.run, 'This run does not hold the schedule\'s progress.');
  if (values.progress) await progress.write(values.run, JSON.parse(readFileSync(values.progress, 'utf8')));
  const ended = values.done ? (await send(client, 'schedule-end', 'POST', { key, reason: values.done.slice(0, 300) })).schedule.ended : null;
  return { key, run: values.run, released: !(await progress.release(values.run)), ...(ended ? { ended } : {}) };
}

/** pause, resume, run, cancel, end, or finish one schedule. */
export async function control(command, key, values, world) {
  const client = await connect(world);
  if (command === 'finish') return finish(key, values, client);
  if (command === 'end') {
    requireValue(values.evidence, 'Ending a schedule needs the proof that its work is done, or the person\'s request.');
    return send(client, 'schedule-end', 'POST', { key, reason: values.evidence.slice(0, 300) });
  }
  if (command === 'cancel') {
    if (values.run) return send(client, 'run-cancel', 'POST', { id: values.run });
    return send(client, 'schedule-end', 'POST', { key, reason: (values.evidence ?? 'Cancelled at the person\'s request.').slice(0, 300) });
  }
  return pauseOrRun(command, key, world, client);
}

const notSetUp = each => each.state === 'failed' || each.state === 'refused';

/** WongStack's default schedules for this person, added and approved here. A run that sets up every default marks
 *  the day done; an unattended one that fails, with no sign-in included, journals why. */
export async function defaults(values, world) {
  const { root, primary, env } = world, { computer, email } = here(world);
  const { defaultsDone, defaultsFailed, defaultsStamp, offFile, personSettings, stateOf } = await daily();
  const { config } = (world.settings ?? personSettings)({ repo: root });
  requireValue(config, 'No daily settings and no sign-in: nothing to add the default schedules for.');
  const stateDir = world.stateDir ?? stateOf(config, root), list = world.list;
  // The run marks the stamp it applies, read with the off switch before it starts, not one that changed meanwhile.
  const off = existsSync(offFile(stateDir)), stamp = defaultsStamp(stateDir, list, off);
  const at = { stateDir, timezone: config.timezone, stamp };
  if (values['dry-run']) return addDefaults({ root, primary, config, stateDir, client: null, computer, env, email, dryRun: true, list });
  try {
    let client;
    try { client = await connect(world); approver(client, { email }); } catch (error) {
      if (!values.unattended) throw error;
      defaultsFailed({ ...at, reason: 'no_sign_in', line: SIGN_IN });
      return { skipped: 'no_sign_in' };
    }
    const result = await addDefaults({ root, primary, config, stateDir, client, computer, env, email, list, off });
    const failed = result.results.filter(notSetUp);
    if (!failed.length) defaultsDone(at);
    else if (values.unattended) defaultsFailed({ ...at, reason: failed.map(each => `${each.key ?? each.id}: ${each.reason}`).join('; ') });
    return result;
  } catch (error) {
    if (!values.unattended) throw error;
    defaultsFailed({ ...at, reason: error.message });
    return { failed: error.message };
  }
}

/** A background run's result, back to the app; the app's two minutes mark a failed send. */
export const report = (id, result, { project }) => scheduleApp(project).report(id, result);

/** `{schedule}` when a run the helper handed to the worker may start here, else `{reason}`. */
export const check = (event, { project, env }) => checkHandedRun(event, { app: scheduleApp(project), project, env });

/** WongStack-only commands: `hosts` and `mirror`. */
export async function extra(command, values, args, world) {
  const { root, env } = world;
  if (command === 'hosts') {
    const app = await (world.appHost ?? appHost)({ service: () => helperService(env, {}, root), client: () => connect(world) });
    return { preferred: selectHost({ enclosing: 'paseo', available: [app, { name: 'paseo', supported: true }] }).name, app };
  }
  if (command === 'mirror') {
    const mirrored = await mirrorRound(await connect(world), { computer: here(world).computer, root, list: () => listRecords(root),
      ...(world.paseo && { inspect: id => world.paseo.inspect(id) }), env });
    if (mirrored === null) throw new ScheduleError('The app did not take the mirror.', 1);
    return { mirrored };
  }
  throw new ScheduleError(`Unknown schedule command ${command}.`, 2);
}
