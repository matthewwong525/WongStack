#!/usr/bin/env node
// The person's schedules in the company app: show, save and approve here, manage, start a run, and the move to the
// app. No git. wiki/stack/host-schedules.md
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { computerId, helperService } from '../../hand-over/scripts/lib/computer.mjs';
import { companyFor } from '../../hand-over/scripts/lib/inbox.mjs';
import { approveHere, approvalState, approver, appHost, definition, heldDefinition, readSchedule, saveDefinition, send, shownText } from './lib/app.mjs';
import { checkRun, mirrorRound } from './lib/app-runs.mjs';
import { paseoAdapter, selectHost, validateReceipt } from './lib/hosts.mjs';
import { legacyAdapter, legacyContext, teardownLegacy } from './lib/legacy.mjs';
import { addDefaults } from './lib/defaults.mjs';
import { moveIn } from './lib/move-in.mjs';
import { appProgress } from './lib/progress.mjs';
import { listRecords, loadRecord, requireValue, ScheduleError } from './lib/records.mjs';
import { scheduleVersion } from './lib/version.mjs';

const USAGE = 'usage: schedule.mjs list | inspect|show <key> | show --file <json> | save --file <json> [--approve [--version <sha>]] [--team <emails>] | approve <key> --version <sha> | pause|resume|run <key> | cancel <key> [--run <id>] | end <key> --evidence <text> | start --key <key> --run <id> --version <sha> | progress --key <key> --run <id> --file <json> | release --key <key> --run <id> | move-in [--unattended] [--dry-run] [--keep <id>] [--drop <id>] | move <key> | defaults [--unattended] [--dry-run] | hosts | mirror | legacy list|inspect|pause|resume|cancel|teardown [native-id]';
const COMMANDS = ['list', 'ls', 'inspect', 'show', 'save', 'approve', 'pause', 'resume', 'run', 'cancel', 'end', 'start', 'progress', 'release', 'move-in', 'move',
  'defaults', 'hosts', 'mirror', 'legacy'];
const UNREACHABLE = 'The app can not be reached; no times are shown.';
const iso = at => (Number.isFinite(at) ? new Date(at).toISOString() : null);
const primaryOf = root => { try { return primaryRoot(root).primary; } catch { return root; } };
const quote = text => text.split('\n').map(line => `> ${line}`).join('\n');

async function connect(world) {
  let client;
  try { client = await (world.company ?? companyFor)(world.root); } catch { /* reported below */ }
  if (!client) throw new ScheduleError('The company app does not answer from this checkout. Sign in first.', 3);
  return client;
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

// The run's report reaches the app just after its chat opens, so a quick first start looks again before refusing.
async function startedByApp(client, key, run, agentId, sleep) {
  for (let tries = 0; tries < 3; tries += 1) {
    if (tries) await sleep(2000);
    if ((await readSchedule(client, key))?.runs?.some(each => each.id === run && each.state === 'started' && each.agentId === agentId)) return true;
  }
  return false;
}

/** pause or resume: the app's routes, or the Paseo job of a schedule that still runs there. */
async function control(command, key, world, client) {
  try { return { schedule: (await send(client, command === 'run' ? 'run-now' : command, 'POST', { key })).schedule }; } catch (error) {
    if (error.extra?.reason !== 'not_app' || command === 'run') throw error;
  }
  const item = loadRecord(world.root, `schedules/${key}.json`), id = item.binding.execution.nativeId;
  const receipt = validateReceipt(await (world.paseo ?? paseoAdapter({ env: world.env }))[command](id), { host: 'paseo', nativeId: id, action: command });
  return { host: 'paseo', receipt };
}

/** `defaults`: WongStack's default schedules for this person, added and approved here. Unattended with no sign-in, it
 *  adds nothing and journals why. */
async function defaults(values, world) {
  const { root, primary, computer, env, email } = world;
  const [{ offFile, personSettings, stateOf }, { addLine }] = await Promise.all([import('../../daily/scripts/daily.mjs'), import('../../daily/scripts/journal.mjs')]);
  const { config } = (world.settings ?? personSettings)({ repo: root });
  requireValue(config, 'No daily settings and no sign-in: nothing to add the default schedules for.');
  const stateDir = world.stateDir ?? stateOf(config, root);
  let client = null;
  if (!values['dry-run']) {
    try { client = await connect(world); approver(client, { email }); } catch (error) {
      if (!values.unattended) throw error;
      addLine({ stateDir, timezone: config.timezone, line: 'Default schedules wait: sign in to the company app (`D who` gives the link).', kind: 'defaults' });
      return { skipped: 'no_sign_in' };
    }
  }
  return addDefaults({ root, primary, config, stateDir, client, computer, env, email, dryRun: values['dry-run'], off: existsSync(offFile(stateDir)) });
}

async function run(command, values, key, world) {
  const { root, env } = world, primary = world.primary ?? primaryOf(root);
  const computer = world.computer ?? computerId(env), email = world.email;
  const options = { computer, env, email, ...(world.hostname ? { name: world.hostname } : {}) };
  if (command === 'hosts') {
    const app = await (world.appHost ?? appHost)({ service: () => helperService(env), client: () => connect(world) });
    return { preferred: selectHost({ enclosing: 'paseo', available: [app, { name: 'paseo', supported: true }] }).name, app };
  }
  if (command === 'show' && values.file) {
    const def = definition(JSON.parse(readFileSync(values.file, 'utf8')), { primary }), version = scheduleVersion(def);
    return { key: def.key, version, text: shownText(def, version) };
  }
  if (command === 'move-in' || command === 'move') {
    requireValue(command === 'move-in' || key, 'Name the schedule record to move.');
    const me = (world.who ?? (await import('../../daily/scripts/daily.mjs')).who)({ repo: root });
    const config = me.file ? (world.settings ?? (await import('../../daily/scripts/config.mjs')).loadSettings)(me.file, root) : null;
    const client = values['dry-run'] ? null : await connect(world);
    const note = world.note ?? (async line => {
      const [{ stateOf }, { addLine }] = await Promise.all([import('../../daily/scripts/daily.mjs'), import('../../daily/scripts/journal.mjs')]);
      if (config) addLine({ stateDir: stateOf(config, root), timezone: config.timezone, line, kind: 'move-in' });
    });
    return moveIn({ root, primary, me, config, records: listRecords(root), client, computer, env, email, paseo: world.paseo ?? paseoAdapter({ env }),
      note, unattended: values.unattended, dryRun: values['dry-run'], keep: values.keep, drop: values.drop, only: command === 'move' ? `record:${key}` : null });
  }
  if (command === 'defaults') return defaults(values, { ...world, primary, computer, email });
  const client = await connect(world);
  if (['list', 'ls'].includes(command)) {
    let listed;
    try { listed = await send(client, 'schedules'); } catch (error) { throw error.code === 3 ? new ScheduleError(UNREACHABLE, 3) : error; }
    let who = null;
    try { who = approver(client, { email }); } catch { /* not signed in: no row counts as approved */ }
    return { schedules: listed.schedules.map(schedule => row(schedule, who, computer, env)), computerOnline: listed.computerOnline };
  }
  if (command === 'mirror') {
    const mirrored = await mirrorRound(client, { computer, root, list: () => listRecords(root), ...(world.paseo && { inspect: id => world.paseo.inspect(id) }), env });
    if (mirrored === null) throw new ScheduleError('The app did not take the mirror.', 1);
    return { mirrored };
  }
  if (command === 'save') {
    const def = definition(JSON.parse(readFileSync(values.file, 'utf8')), { primary, team: Boolean(values.team) });
    if (values.team) return saveDefinition(client, def, { team: values.team.split(',').map(each => each.trim()).filter(Boolean) });
    requireValue(!values.version || values.version === scheduleVersion(def), 'The file differs from the version the person saw; show it again.');
    const { version, schedule } = await saveDefinition(client, def, { computer });
    return { key: def.key, version, ...(values.approve ? await approveHere(client, schedule, version, options) : { needsOk: true }) };
  }
  requireValue(key, 'Name a schedule key.');
  if (command === 'start') {
    requireValue(values.run && values.version, 'A start names its run and version.');
    const agentId = env.PASEO_AGENT_ID;
    requireValue(agentId && await startedByApp(client, key, values.run, agentId, world.sleep), 'The current chat is not a run the app started for this schedule.');
    const found = await checkRun({ key, revision: values.version }, { client, env, ...(email ? { email } : {}) });
    if (!found.schedule) throw new ScheduleError(`This run may not start: ${found.reason}.`, 1, { reason: found.reason });
    const progress = appProgress(client, key);
    requireValue(await progress.claim(values.run), 'Another run holds this schedule\'s progress.');
    const { schedule } = found;
    return { key, run: values.run, version: schedule.version, authority: schedule.authority, until: schedule.until, progress: (await progress.read()).progress,
      instructions: quote(schedule.instructions),
      next: 'Do the quoted instructions within the authority shown. Save progress with progress, end a finished goal with end, then release.' };
  }
  if (command === 'progress') {
    requireValue(values.run && values.file, 'Progress names its run and a JSON file.');
    return appProgress(client, key).write(values.run, JSON.parse(readFileSync(values.file, 'utf8')));
  }
  if (command === 'release') { requireValue(values.run, 'Name the run that holds the progress.'); return { claimed: await appProgress(client, key).release(values.run) }; }
  if (command === 'end') {
    requireValue(values.evidence, 'Ending a schedule needs the proof that its work is done, or the person\'s request.');
    return send(client, 'schedule-end', 'POST', { key, reason: values.evidence.slice(0, 300) });
  }
  if (command === 'cancel') {
    if (values.run) return send(client, 'run-cancel', 'POST', { id: values.run });
    return send(client, 'schedule-end', 'POST', { key, reason: (values.evidence ?? 'Cancelled at the person\'s request.').slice(0, 300) });
  }
  if (['pause', 'resume', 'run'].includes(command)) return control(command, key, world, client);
  const found = await readSchedule(client, key);
  if (!found) throw new ScheduleError('The app has no schedule with this key.', 2);
  if (command === 'inspect') {
    let who = null;
    try { who = approver(client, { email }); } catch { /* shown as needing an OK */ }
    return { schedule: found.schedule, runs: found.runs, approval: approvalState(found.schedule, who, computer, env) };
  }
  const def = localDefinition(found.schedule, primary), version = scheduleVersion(def);
  if (command === 'show') return { key, version, text: shownText(def, version), ...(version !== found.schedule.version ? { binds: primary } : {}) };
  // approve: the version the person saw, saved first when this computer fills in a team copy's folder.
  requireValue(values.version, 'Name the version the person approved, from show.');
  if (version !== values.version) throw new ScheduleError('The schedule changed since it was shown; show it again.', 1, { reason: 'changed' });
  requireValue(!found.schedule.computer || found.schedule.computer === computer, `This schedule runs on ${found.schedule.computerName ?? 'another computer'}; approve it there.`);
  const schedule = version === found.schedule.version ? found.schedule : (await saveDefinition(client, def, { computer })).schedule;
  return { key, version, ...(await approveHere(client, schedule, version, options)) };
}

export async function main(argv = process.argv.slice(2), world = {}) {
  world = { root: process.cwd(), env: process.env, out: text => process.stdout.write(text), sleep: ms => new Promise(done => setTimeout(done, ms)), ...world };
  try {
    const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
      key: { type: 'string' }, file: { type: 'string' }, root: { type: 'string' }, version: { type: 'string' }, run: { type: 'string' }, evidence: { type: 'string' },
      team: { type: 'string' }, approve: { type: 'boolean' }, unattended: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, keep: { type: 'string', multiple: true },
      drop: { type: 'string', multiple: true }, resources: { type: 'string' }, help: { type: 'boolean' },
    } });
    if (values.help) { world.out(`${USAGE}\n`); return 0; }
    const [command = 'list', action, nativeId] = positionals;
    world = { ...world, root: values.root ?? world.root };
    requireValue(COMMANDS.includes(command), `Unknown schedule command ${command}.`);
    let result;
    if (command === 'legacy') {
      const context = world.legacyContext ?? legacyContext(world.root, world.env);
      if (action === 'teardown') result = await teardownLegacy(context, values.resources?.split(','), world);
      else {
        const host = legacyAdapter(context, world);
        requireValue(['list', 'inspect', 'pause', 'resume', 'cancel'].includes(action), 'Legacy supports only list/inspect/pause/resume/cancel/explicit teardown.');
        result = action === 'list' ? await host.list() : await host[action](nativeId);
      }
    } else result = await run(command, values, values.key ?? action, world);
    world.out(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`); return 0;
  } catch (error) {
    const code = error instanceof ScheduleError ? error.code : String(error.code).startsWith('ERR_PARSE_ARGS') ? 2 : 1;
    world.out(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra })}\n`); return code;
  }
}
if (isMain(import.meta.url)) process.exitCode = await main();
