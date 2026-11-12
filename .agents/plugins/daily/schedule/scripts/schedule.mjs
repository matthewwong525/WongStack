#!/usr/bin/env node
// The person's schedules: show, save and approve here, manage, finish a run. The store is the profile's `schedules`
// part, else Paseo; with neither, `/schedule` is off. No git. wiki/stack/host-schedules.md
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { isMain } from '../../daily/scripts/lib/cli.mjs';
import { primaryRoot } from '../../daily/scripts/lib/primary-root.mjs';
import { slotResult } from '../../daily/scripts/lib/slot.mjs';
import { paseoStore } from './lib/paseo-store.mjs';
import { requireValue, ScheduleError } from './lib/records.mjs';

const USAGE = 'usage: schedule.mjs list | inspect|show <key> | show --file <json> | save --file <json> [--approve [--version <sha>]] [--team <emails>] | approve <key> --version <sha> | pause|resume|run <key> | cancel <key> [--run <id>] | end <key> --evidence <text> | finish --key <key> --run <id> [--progress <json file>] [--done <proof>] | defaults [--unattended] [--dry-run] | store | a command the store adds, such as move-in, move, hosts, mirror or legacy';
const CORE = ['list', 'ls', 'inspect', 'show', 'save', 'approve', 'pause', 'resume', 'run', 'cancel', 'end', 'finish', 'defaults', 'store'];
const shellQuote = text => `'${String(text).replace(/'/g, "'\\''")}'`;

/** With no store: what is needed, and the line the person adds to the computer's own timer to run a script. */
function noStore(world, file) {
  let timing = {};
  try { timing = JSON.parse(readFileSync(file, 'utf8')).timing ?? {}; } catch { /* no plan: a blank time */ }
  const crontab = `${timing.cron ?? '<minute> <hour> <day> <month> <weekday>'} cd ${shellQuote(world.primary)} && <command>`;
  // The computer's timer reads the time in its own timezone, not the plan's.
  const zone = timing.timezone ? ` The time is in ${timing.timezone}: change it if the computer's clock uses another timezone.` : '';
  return new ScheduleError('No schedule store: this repo has no `schedules` part, and Paseo is not installed. Install Paseo, or add a store. '
    + `To run a script on a clock, add this line to the computer's own timer with \`crontab -e\`, with your command.${zone} ${crontab}`, 3, { code: 'no-store', crontab, timezone: timing.timezone ?? null });
}
const primaryOf = root => { try { return primaryRoot(root).primary; } catch { return root; } };

/** The profile's store, else Paseo's, else null. */
export async function findStore(world) {
  if (world.store !== undefined) return world.store;
  // A profile that fails stops here: falling back to Paseo would hide the app's schedules and save new ones outside it.
  const found = await slotResult('schedules', [], { env: world.env });
  if (found.error) throw new ScheduleError(`The repo's schedule store failed, so nothing moved to Paseo: ${found.error.message}`, 3, { code: 'store-failed' });
  if (found.value) return found.value;
  try { return paseoStore(world.env); } catch { return null; }
}

async function run(command, values, args, world) {
  const store = await findStore(world);
  if (command === 'store') return { store: store?.name ?? 'off' };
  if (!store) throw noStore(world, values.file);
  const key = values.key ?? args[0];
  if (!CORE.includes(command)) {
    requireValue(store.extra, `Unknown schedule command ${command}.`);
    return store.extra(command, values, args, world);
  }
  if (['list', 'ls'].includes(command)) return store.list(world);
  if (command === 'defaults') return store.defaults(values, world);
  const raw = values.file ? JSON.parse(readFileSync(values.file, 'utf8')) : null;
  if (command === 'show' && raw) return store.show(null, world, raw);
  if (command === 'save') {
    requireValue(raw, 'Save needs --file.');
    return store.save(raw, { approve: values.approve, version: values.version, team: values.team }, world);
  }
  requireValue(key, 'Name a schedule key.');
  if (command === 'inspect') return store.get(key, world);
  if (command === 'show') return store.show(key, world);
  if (command === 'approve') {
    requireValue(values.version, 'Name the version the person approved, from show.');
    return store.approve(key, values.version, world);
  }
  return store.control(command, key, values, world);
}

export async function main(argv = process.argv.slice(2), world = {}) {
  world = { root: process.cwd(), env: process.env, out: text => process.stdout.write(text), ...world };
  try {
    const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
      key: { type: 'string' }, file: { type: 'string' }, root: { type: 'string' }, version: { type: 'string' }, run: { type: 'string' }, evidence: { type: 'string' }, progress: { type: 'string' }, done: { type: 'string' },
      team: { type: 'string' }, approve: { type: 'boolean' }, unattended: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, keep: { type: 'string', multiple: true },
      drop: { type: 'string', multiple: true }, resources: { type: 'string' }, help: { type: 'boolean' },
    } });
    if (values.help) { world.out(`${USAGE}\n`); return 0; }
    const [command = 'list', ...args] = positionals;
    world = { ...world, root: values.root ?? world.root };
    world.primary ??= primaryOf(world.root);
    const result = await run(command, values, args, world);
    world.out(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`); return 0;
  } catch (error) {
    const code = error instanceof ScheduleError ? error.code : String(error.code).startsWith('ERR_PARSE_ARGS') ? 2 : 1;
    world.out(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra })}\n`); return code;
  }
}
if (isMain(import.meta.url)) process.exitCode = await main();
