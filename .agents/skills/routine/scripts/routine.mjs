#!/usr/bin/env node
// Paseo schedules for this repo — the one door /routine uses for every Paseo call.
// USAGE below lists the commands.
//
// Prints one JSON object on stdout. Exit codes: 0 ok, 2 bad input, 3 Paseo not
// installed, 4 daemon not answering, 5 Paseo's client module missing or changed.
//
// Why a private module: `paseo schedule create` (0.9.2) has no isolation flag,
// so a schedule it makes runs in the primary checkout itself. The daemon's
// schedule/create request takes `isolation: "worktree"`, and the CLI reaches it
// through connectScheduleClient(). createThroughClient() is the only code that
// touches that module; when Paseo gains a CLI flag, replace that one function.
// A missing or changed module creates nothing — never a local schedule.
//
// Node built-ins only. ROUTINE_PASEO_BIN overrides the `paseo` found on PATH.

import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { EXIT, PaseoError as RoutineError, findPaseo as findPaseoBin, paseo, parseCommand } from './lib/paseo.mjs';
const USAGE = `usage: routine.mjs create --cron <expr> --prompt <text> --agent claude|codex
                          [--name <n>] [--timezone <iana>] [--model <m>] [--dry-run]
       routine.mjs ls
       routine.mjs pause|resume|run|logs|delete <name|id>
       routine.mjs change <name|id> [--cron <expr>] [--timezone <iana>] [--prompt <text>]`;
const VALUE_FLAGS = ['cron', 'prompt', 'agent', 'name', 'timezone', 'model'];

const MODES = { claude: 'bypassPermissions', codex: 'full-access' };

const CRON_FIELDS = [
  ['minute', 0, 59],
  ['hour', 0, 23],
  ['day of month', 1, 31],
  ['month', 1, 12],
  ['day of week', 0, 7],
];

// ---------------------------------------------------------------------------
// Pure helpers

/** Returns null when the expression is a valid five-field cron, else the first bad field's name. */
export function invalidCronField(expression) {
  const fields = String(expression ?? '').trim().split(/\s+/);
  if (fields.length !== 5) return `field count (${fields.length}, expected 5)`;
  for (let i = 0; i < 5; i++) {
    const [name, min, max] = CRON_FIELDS[i];
    if (!fields[i].split(',').every(part => cronPartOk(part, min, max))) return name;
  }
  return null;
}

/** Validates and normalizes a cron expression, or throws exit 2 naming the bad field. */
function cronExpression(cron) {
  const bad = invalidCronField(cron);
  if (bad) throw new RoutineError(EXIT.input, `Invalid cron "${cron}": ${bad}.`, { field: bad });
  return String(cron).trim().split(/\s+/).join(' ');
}

function cronPartOk(part, min, max) {
  const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(part);
  if (!m) return false;
  const [, base, lo, hi, step] = m;
  if (step !== undefined && Number(step) < 1) return false;
  if (base === '*') return true;
  const a = Number(lo);
  const b = hi === undefined ? a : Number(hi);
  return a >= min && b <= max && a <= b;
}

export function modeFor(agent) {
  const mode = MODES[agent];
  if (!mode) {
    throw new RoutineError(EXIT.input, `Unknown agent "${agent ?? ''}". Pass --agent claude or --agent codex.`);
  }
  return mode;
}

/** `/improve` in MyApp → `improve MyApp`; plain prompts use their first four words. */
export function defaultName(prompt, repoDir) {
  const text = String(prompt).trim();
  const head = text.startsWith('/')
    ? text.slice(1).split(/\s+/)[0]
    : text.split(/\s+/).slice(0, 4).join(' ');
  return `${head} ${path.basename(repoDir)}`.trim();
}

/** Exact id, then case-insensitive exact name, then a unique id prefix. */
export function matchRoutine(routines, key) {
  const k = String(key ?? '').trim();
  if (!k) throw new RoutineError(EXIT.input, 'Name or id a routine.');
  const byId = routines.filter(r => r.id === k);
  if (byId.length === 1) return byId[0];
  const lower = k.toLowerCase();
  const byName = routines.filter(r => (r.name ?? '').toLowerCase() === lower);
  const found = byName.length ? byName : routines.filter(r => r.id.startsWith(k));
  if (found.length === 1) return found[0];
  if (found.length === 0) {
    throw new RoutineError(EXIT.input, `No routine in this repo matches "${k}".`, {
      routines: routines.map(r => ({ id: r.id, name: r.name })),
    });
  }
  throw new RoutineError(EXIT.input, `"${k}" matches more than one routine. Use an id.`, {
    matches: found.map(r => ({ id: r.id, name: r.name })),
  });
}

export function buildCreateRequest({ prompt, cron, timezone, name, agent, model, cwd }) {
  const text = String(prompt ?? '').trim();
  if (!text) throw new RoutineError(EXIT.input, 'The prompt is empty.');
  const expression = cronExpression(cron);
  const modeId = modeFor(agent);
  return {
    prompt: text,
    name,
    runOnCreate: false,
    cadence: { type: 'cron', expression, timezone },
    target: {
      type: 'new-agent',
      config: {
        provider: agent,
        cwd,
        modeId,
        isolation: 'worktree',
        archiveOnFinish: false,
        title: name,
        ...(model ? { model } : {}),
      },
    },
  };
}

/** Steps to make the same schedule by hand, for when the script cannot. */
function appSteps(request) {
  const c = request.target.config;
  return [
    'Create it in the Paseo app instead, with these settings:',
    `- Prompt: ${request.prompt}`,
    `- Cron: ${request.cadence.expression} (${request.cadence.timezone})`,
    `- Name: ${request.name}`,
    `- Directory: ${c.cwd}`,
    `- Provider: ${c.provider}${c.model ? `/${c.model}` : ''}, mode ${c.modeId}`,
    '- Isolation: worktree (not local)',
    '- Archive when finished: off',
  ].join('\n');
}

/** The command to run later, once Paseo is installed or its daemon is up. */
function retryCommand(opts) {
  const q = s => `'${String(s).replaceAll("'", "'\\''")}'`;
  const parts = [
    'node "$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/routine.mjs" create',
    `--cron ${q(opts.cron)}`, `--timezone ${q(opts.timezone)}`, `--name ${q(opts.name)}`,
    `--agent ${opts.agent}`, ...(opts.model ? [`--model ${q(opts.model)}`] : []),
    `--prompt ${q(opts.prompt)}`,
  ];
  return parts.join(' ');
}

function summarize(schedule) {
  const runs = schedule.runs ?? [];
  const last = runs[runs.length - 1];
  return {
    id: schedule.id,
    name: schedule.name ?? null,
    cadence: schedule.cadence?.type === 'cron'
      ? `${schedule.cadence.expression} (${schedule.cadence.timezone ?? 'UTC'})`
      : schedule.cadence,
    status: schedule.status,
    nextRunAt: schedule.nextRunAt ?? null,
    lastRun: last ? { status: last.status, startedAt: last.startedAt, error: last.error ?? null } : null,
    prompt: schedule.prompt,
  };
}

// ---------------------------------------------------------------------------
// Environment

function primaryWorktree() {
  try {
    return primaryRoot().primary;
  } catch (error) {
    if (error instanceof PrimaryRootError) throw new RoutineError(EXIT.input, error.message);
    throw error;
  }
}

function sameDir(a, b) {
  const real = p => { try { return realpathSync(p); } catch { return path.resolve(p); } };
  return real(a) === real(b);
}

/** The `paseo` binary; exit 3 when it is not installed. */
function findPaseo(env) {
  return findPaseoBin(env, 'ROUTINE_PASEO_BIN');
}

async function listSchedules(bin) {
  const list = await paseo(bin, ['schedule', 'ls']);
  return Array.isArray(list) ? list : [];
}

/** This repo's routines: every schedule whose new-agent cwd is the primary worktree. */
async function repoRoutines(bin) {
  const primary = primaryWorktree();
  const ids = (await listSchedules(bin)).map(s => s.id);
  const full = await Promise.all(ids.map(id => paseo(bin, ['schedule', 'inspect', id])));
  return full.filter(s => s?.target?.type === 'new-agent' && s.target.config?.cwd && sameDir(s.target.config.cwd, primary));
}

// The one function that uses Paseo's private client. See the header.
async function createThroughClient(bin, request) {
  const root = path.dirname(path.dirname(realpathSync(bin)));
  const load = rel => import(pathToFileURL(path.join(root, 'dist', rel)).href);
  let connectScheduleClient, selectDaemonTarget;
  try {
    [{ connectScheduleClient }, { selectDaemonTarget }] = await Promise.all([
      load('commands/schedule/shared.js'),
      load('utils/daemon-target.js'),
    ]);
  } catch (error) {
    throw new RoutineError(EXIT.client, `Paseo's schedule client was not found under ${root} (${error.code ?? error.message}).`);
  }
  if (typeof connectScheduleClient !== 'function' || typeof selectDaemonTarget !== 'function') {
    throw new RoutineError(EXIT.client, "Paseo's schedule client has changed: connectScheduleClient or selectDaemonTarget is missing.");
  }
  let client;
  try {
    ({ client } = await connectScheduleClient(selectDaemonTarget({})));
  } catch (error) {
    throw new RoutineError(EXIT.noDaemon, `The Paseo daemon does not answer: ${error?.message ?? error}`);
  }
  try {
    if (typeof client?.scheduleCreate !== 'function') {
      throw new RoutineError(EXIT.client, "Paseo's schedule client has changed: scheduleCreate is missing.");
    }
    const payload = await client.scheduleCreate(request);
    if (payload?.error || !payload?.schedule) {
      throw new RoutineError(EXIT.input, `Paseo refused the schedule: ${payload?.error ?? 'no schedule returned'}`);
    }
    return payload.schedule;
  } finally {
    try { await client?.close?.(); } catch { /* closing is best effort */ }
  }
}

// ---------------------------------------------------------------------------
// Commands

async function create(flags, env) {
  const primary = primaryWorktree();
  const timezone = flags.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const name = flags.name || defaultName(flags.prompt ?? '', primary);
  const opts = { prompt: flags.prompt, cron: flags.cron, timezone, name, agent: flags.agent, model: flags.model };
  const request = buildCreateRequest({ ...opts, cwd: primary });
  if (flags.dryRun) return { ok: true, dryRun: true, request };
  try {
    const bin = findPaseo(env);
    const clash = (await listSchedules(bin)).find(s => (s.name ?? '').toLowerCase() === name.toLowerCase());
    if (clash) throw new RoutineError(EXIT.input, `A schedule named "${name}" already exists (${clash.id}). Pass --name.`);
    const schedule = await createThroughClient(bin, request);
    return { ok: true, routine: summarize(schedule), mode: request.target.config.modeId, isolation: 'worktree' };
  } catch (error) {
    if (error instanceof RoutineError && error.code !== EXIT.input) {
      error.extra.fallback = { retry: retryCommand(opts), app: appSteps(request) };
    }
    throw error;
  }
}

async function change(bin, routine, flags) {
  if (!flags.cron && !flags.timezone && !flags.prompt) {
    throw new RoutineError(EXIT.input, 'Nothing to change. Pass --cron, --timezone, or --prompt.');
  }
  const args = ['schedule', 'update', routine.id];
  // The CLI takes --timezone only with --cron, so a timezone change resends the cron.
  if (flags.cron || flags.timezone) {
    args.push('--cron', cronExpression(flags.cron ?? routine.cadence?.expression),
      '--timezone', flags.timezone ?? routine.cadence?.timezone ?? 'UTC');
  }
  if (flags.prompt) args.push('--prompt', flags.prompt);
  await paseo(bin, args);
  return { ok: true, action: 'change', routine: summarize(await paseo(bin, ['schedule', 'inspect', routine.id])) };
}

const ACTIONS = { pause: 'pause', resume: 'resume', run: 'run-once', logs: 'logs', delete: 'delete' };

async function run(argv, env) {
  const { command = 'ls', flags, positional } = parseCommand(argv, {
    values: VALUE_FLAGS, booleans: { '--dry-run': 'dryRun' }, positional: true, unknown: arg => `Unknown flag ${arg}.`,
  });
  if (command === 'create') return create(flags, env);
  if (command !== 'ls' && command !== 'change' && !ACTIONS[command]) {
    throw new RoutineError(EXIT.input, `Unknown command "${command}". Use create, ls, pause, resume, run, logs, change, or delete.`);
  }
  const bin = findPaseo(env);
  const routines = await repoRoutines(bin);
  if (command === 'ls') return { ok: true, routines: routines.map(summarize) };
  const routine = matchRoutine(routines, positional[0]);
  if (command === 'change') return change(bin, routine, flags);
  const result = await paseo(bin, ['schedule', ACTIONS[command], routine.id]);
  return { ok: true, action: command, routine: { id: routine.id, name: routine.name }, result };
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.slice(0, 2).includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  try {
    const result = await run(argv, env);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof RoutineError ? error.code : 1;
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
