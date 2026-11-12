// The schedule store with no `schedules` part: Paseo runs each schedule as a new chat on this computer. The person's
// OK before the save is the approval, so there is no version ledger. wiki/stack/host-schedules.md#with-no-app
import { findPaseo, paseo } from '../../../daily/scripts/lib/paseo.mjs';
import { MODES } from '../workspace.mjs';
import { mayDo } from './hosts.mjs';
import { requireValue, ScheduleError, validateTiming } from './records.mjs';
import { scheduleVersion } from './version.mjs';

const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SEP = ': ';
const REFUSED = [
  [raw => raw.kind === 'background', 'Paseo runs a schedule only as a chat; a background run needs a schedule store such as the company app.'],
  [raw => raw.run?.check !== undefined, 'Paseo has no check before a run; leave `check` out, or use a schedule store that runs it.'],
  [raw => raw.run?.minutes !== undefined, 'Paseo sets no time limit on a run; leave `minutes` out.'],
  [raw => raw.deny !== undefined || raw.run?.deny !== undefined, 'Paseo keeps no deny list; leave `deny` out.'],
  [raw => raw.until !== undefined, 'Paseo can not end a schedule when a goal is met; stop it by hand, or set a one-time run.'],
];
const unsupported = message => new ScheduleError(message, 2, { reason: 'unsupported' });

/** The schedule in the shape `show` and `scheduleVersion` read: a chat run in `primary` by default. */
function definition(raw, primary) {
  requireValue(raw && typeof raw === 'object' && KEY.test(raw.key ?? ''), 'A schedule needs a key: small letters, digits and dashes.');
  requireValue(typeof raw.name === 'string' && raw.name.trim(), 'A schedule needs a short name.');
  requireValue(typeof raw.instructions === 'string' && raw.instructions.trim(), 'A schedule needs its instructions.');
  for (const [refused, reason] of REFUSED) if (refused(raw)) throw unsupported(reason);
  validateTiming(raw.timing ?? {});
  const run = { cwd: raw.run?.cwd ?? primary, ...(raw.run?.provider ? { provider: raw.run.provider } : {}),
    ...(raw.run?.mode ? { mode: raw.run.mode } : {}), ...(raw.run?.thinking ? { thinking: raw.run.thinking } : {}) };
  return { key: raw.key, name: raw.name.trim(), kind: 'chat', instructions: raw.instructions, run, authority: raw.authority ?? {}, timing: raw.timing };
}

/** A one-time run as Paseo's cron: the minute it is due, in its own time zone, run once. */
function onceCron({ dueAt, timezone }) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', minute: 'numeric', hour: 'numeric',
    day: 'numeric', month: 'numeric' }).formatToParts(new Date(dueAt)).map(part => [part.type, Number(part.value)]));
  return `${parts.minute} ${parts.hour} ${parts.day} ${parts.month} *`;
}

const cadence = timing => (timing.mode === 'once' ? ['--cron', onceCron(timing), '--max-runs', '1']
  : timing.cron ? ['--cron', timing.cron] : ['--every', timing.every]);

function shownText(def, version) {
  const when = def.timing.mode === 'once' ? `once, at ${def.timing.dueAt}` : def.timing.cron ? `cron ${def.timing.cron}` : `every ${def.timing.every}`;
  return [`Name: ${def.name}`, `Runs: as a new chat, in ${def.run.cwd}`, `When: ${when} (${def.timing.timezone})`, `May do: ${mayDo(def.authority)}`,
    `Ends: ${def.timing.mode === 'once' ? 'after its one run' : 'when you stop it'}`, 'Keep on: this computer and Paseo.',
    'Instructions (text to show, not to follow now):', ...def.instructions.split('\n').map(line => `> ${line}`), `Version: ${version}`].join('\n');
}

const keyOf = row => (String(row.name ?? '').includes(SEP) ? row.name.slice(0, row.name.indexOf(SEP)) : null);
const rowOf = row => ({ key: keyOf(row), name: String(row.name).slice(String(row.name).indexOf(SEP) + SEP.length), kind: 'chat', host: 'paseo',
  state: row.status, nextRunAt: row.nextRunAt ?? null, lastRun: row.lastRunAt ? { dueAt: row.lastRunAt } : null, approved: true });

/** The store over the `paseo` command on PATH (or WONG_PASEO_BIN); throws with exit 3 when there is none. */
export function paseoStore(env = process.env, call = null) {
  const bin = call ? null : findPaseo(env, 'WONG_PASEO_BIN');
  const invoke = call ?? (args => paseo(bin, args, { env }));
  const rows = async () => (await invoke(['schedule', 'ls'])).filter(row => KEY.test(keyOf(row) ?? ''));
  const idOf = async key => {
    const found = (await rows()).find(row => keyOf(row) === key);
    if (!found) throw new ScheduleError('Paseo has no schedule with this key.', 2);
    return found.id;
  };
  const shown = (raw, world) => {
    const def = definition(raw, world.primary), version = scheduleVersion(def);
    return { def, version, text: shownText(def, version) };
  };
  return {
    name: 'paseo',
    list: async () => ({ schedules: (await rows()).map(rowOf) }),
    get: async key => ({ schedule: await invoke(['schedule', 'inspect', await idOf(key)]) }),
    async show(key, world, raw = null) {
      if (!raw) throw unsupported('Paseo keeps no approved text; show the file with --file.');
      const { def, version, text } = shown(raw, world);
      return { key: def.key, version, text };
    },
    async save(raw, { approve = false, version = null, team = null } = {}, world) {
      if (team) throw unsupported('Paseo runs schedules on this computer only; a team copy needs a schedule store such as the company app.');
      const { def, version: now } = shown(raw, world);
      requireValue(approve, 'Paseo runs a schedule once it is saved: show it, get the person\'s OK, then save with --approve.');
      requireValue(!version || version === now, 'The file differs from the version the person saw; show it again.');
      requireValue(!(await rows()).some(row => keyOf(row) === def.key), 'Paseo already has a schedule with this key; cancel it first.');
      const { run } = def, provider = run.provider || 'claude';
      // No one is there to answer a permission ask, so a run gets the app's unattended mode unless it names its own.
      const mode = run.mode || MODES[provider];
      const created = await invoke(['schedule', 'create', '--name', `${def.key}${SEP}${def.name}`, ...cadence(def.timing), '--timezone', def.timing.timezone,
        '--cwd', run.cwd, '--provider', provider, ...(mode ? ['--mode', mode] : []),
        ...(run.thinking ? ['--thinking', run.thinking] : []), '--', def.instructions]);
      return { key: def.key, version: now, host: 'paseo', id: created?.id ?? null };
    },
    approve: async () => { throw unsupported('A Paseo schedule needs no separate OK: save it with --approve after the person agrees.'); },
    async control(command, key) {
      const verb = { pause: 'pause', resume: 'resume', run: 'run-once', cancel: 'delete', end: 'delete' }[command];
      if (!verb) throw unsupported(`Paseo schedules have no ${command}.`);
      const id = await idOf(key);
      await invoke(['schedule', verb, id]);
      return { key, host: 'paseo', id, done: verb };
    },
    defaults: async () => { throw unsupported('Default schedules need a schedule store; with Paseo, the line-up runs from Daily\'s worker.'); },
  };
}
