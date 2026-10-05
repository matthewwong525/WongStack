#!/usr/bin/env node
// Routines for this install: the one door /routine uses. A routine runs in the person's own
// Cloudflare account, in the routine runner (scripts/routine-runner/); this script installs the
// runner on first use, stores a sign-in there, and manages the list over the runner's own API.
// wiki/stack/cloud-routines.md owns how a routine runs. USAGE below lists the commands.
//
// Prints one JSON object on stdout, and never a key's value. Exit codes: 0 ok, 2 bad input,
// 3 not ready (`needs`: paid-plan, setup, signin, or project-access), 4 the runner does not answer,
// 5 its answers have changed.
//
// Keys come from the primary worktree's .env (wiki/development/secrets.md). For tests,
// WONG_CLOUDFLARE_API points Cloudflare calls, and WONG_ROUTINES_API the runner's, at another address.

import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../../memory/scripts/lib/store.mjs';
import { setKey } from '../../hand-over/scripts/keys.mjs';
import { isIgnored } from '../../ship/scripts/worktree-secrets.mjs';
import { API_VERSION, invalidKeyName } from '../../../../scripts/routine-runner/routines.mjs';
import { SIGNINS, keySecret, signinSecret, signinValue } from '../../../../scripts/routine-runner/run.mjs';
import { invalidCronField, invalidTimezone, nextRun, normalizeCron } from '../../../../scripts/routine-runner/schedule.mjs';
import { CliError, EXIT, git, parseCommand } from './lib/cli.mjs';
import {
  CloudflareError, ProvisionError, ROUTINES_PROVISION, cloudflare, commonDir, fillConfig, installRunner, paidPlan, readJson, recordComponent, recordedBase,
  run as runTool, widenBy, workerSecrets,
} from './lib/cloudflare.mjs';

const USAGE = `usage: routine.mjs create --cron <expr> --prompt <text> --agent claude|codex
                          [--name <n>] [--timezone <iana>] [--model <m>] [--keys <NAME,NAME>] [--dry-run]
       routine.mjs ls
       routine.mjs pause|resume|run|logs|delete <name|id>
       routine.mjs change <name|id> [--cron <expr>] [--timezone <iana>] [--prompt <text>]
       routine.mjs setup [--dry-run]
       routine.mjs signin --agent claude|codex`;
const VALUE_FLAGS = ['cron', 'prompt', 'agent', 'name', 'timezone', 'model', 'keys'];
const ACTIONS = { pause: 'POST', resume: 'POST', run: 'POST', logs: 'GET', delete: 'DELETE' };
const FOLDER = 'scripts/routine-runner';
const COST = 'about $5 a month for Cloudflare\'s paid plan; runs beyond what the plan includes are billed by use';
const PROJECT_KEY = 'WONG_ROUTINE_GITHUB_TOKEN';
const PAGE = 'wiki/stack/cloud-routines.md';

export class RoutineError extends CliError {}

const notReady = (needs, message, extra = {}) => new RoutineError(EXIT.notReady, message, { needs, ...extra });
const input = (message, extra) => new RoutineError(EXIT.input, message, extra);

// ---------------------------------------------------------------------------
// Pure helpers

/** `/improve` in MyApp → `improve MyApp`; plain prompts use their first four words. */
export function defaultName(prompt, repoDir) {
  const text = String(prompt).trim();
  const head = text.startsWith('/') ? text.slice(1).split(/\s+/)[0] : text.split(/\s+/).slice(0, 4).join(' ');
  return `${head} ${path.basename(repoDir)}`.trim();
}

/** Who a routine runs as: the git author here, and the short id their stored sign-in is filed under. */
export function makerOf(email, name) {
  const address = String(email ?? '').trim();
  if (!address) throw input('Git has no user.email here, so a routine would have nobody to run as. Set it with `git config user.email`.');
  return { id: createHash('sha256').update(address.toLowerCase()).digest('hex').slice(0, 12), name: String(name ?? '').trim() || address, email: address };
}

/** `https://github.com/<owner>/<name>.git` for a GitHub origin in any of its spellings, else null. */
export function githubRemote(origin) {
  const match = /^(?:https:\/\/(?:[^@/]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(String(origin ?? '').trim());
  return match ? { repo: `${match[1]}/${match[2]}`, remote: `https://github.com/${match[1]}/${match[2]}.git` } : null;
}

/** What a create sends, checked here first so a typo costs no round trip. The runner checks again. */
export function buildRoutine({ prompt, cron, timezone, name, agent, model, keys, maker }) {
  const text = String(prompt ?? '').trim();
  if (!text) throw input('The prompt is empty.');
  const field = invalidCronField(cron);
  if (field) throw input(`Invalid cron "${cron}": ${field}.`, { field });
  const zone = invalidTimezone(timezone);
  if (zone) throw input(zone, { field: 'timezone' });
  if (!SIGNINS[agent]) throw input(`Unknown agent "${agent ?? ''}". Pass --agent claude or --agent codex.`);
  const named = String(keys ?? '').split(',').map((key) => key.trim()).filter(Boolean);
  for (const key of named) {
    const why = invalidKeyName(key);
    if (why) throw input(why);
  }
  return { name, prompt: text, cron: normalizeCron(cron), timezone, agent, ...(model ? { model } : {}), keys: named, maker };
}

/** The runner's config for this install: the template filled, with no Artifacts binding when the project lives on GitHub. */
export function runnerConfig({ account, runner, route, remote, repo, namespace = '' }, template) {
  const text = route === 'artifacts' ? template : template.replace(/^.*"artifacts":.*\n/m, '');
  return fillConfig(text, { '<runner>': runner, '<account id>': account, '<namespace>': namespace, '<route>': route, '<remote>': remote, '<repo>': repo }, 'routine runner');
}

// ---------------------------------------------------------------------------
// This install

/** The checkout, its primary, its keys (names to values, the primary's winning), and its install record. */
function install(cwd, env) {
  let roots;
  try {
    roots = primaryRoot(cwd);
  } catch (error) {
    if (error instanceof PrimaryRootError) throw input(error.message);
    throw error;
  }
  const read = (dir) => (existsSync(path.join(dir, '.env')) ? parseEnv(readFileSync(path.join(dir, '.env'), 'utf8')) : {});
  const keys = { ...read(roots.root), ...read(roots.primary) };
  const record = (dir) => readJson(path.join(dir, '.claude', '.wong-stack.json'), {})?.components ?? {};
  const components = { ...record(roots.primary), ...record(roots.root) };
  return { ...roots, env, keys, components, routines: components.routines ?? null };
}

function maker(root) {
  const read = (key) => {
    try { return git(root, 'config', key); } catch { return ''; }
  };
  return makerOf(read('user.email'), read('user.name'));
}

/** The person's Cloudflare token and account, or exit 2 saying which is missing. */
function cloudflareOf(ctx, deps) {
  const token = ctx.env.CLOUDFLARE_API_TOKEN || ctx.keys.CLOUDFLARE_API_TOKEN;
  const account = ctx.env.CLOUDFLARE_ACCOUNT_ID || ctx.keys.CLOUDFLARE_ACCOUNT_ID || ctx.routines?.accountId || ctx.components.memory?.accountId;
  if (!token) throw input('CLOUDFLARE_API_TOKEN is not in this install\'s .env, so nothing can be added to Cloudflare. Send the key link for it first.', { keys: ['CLOUDFLARE_API_TOKEN'] });
  if (!account) throw input('This install records no Cloudflare account. Run setup\'s Cloudflare step first.');
  return { token, account, cf: cloudflare(token, { api: ctx.env.WONG_CLOUDFLARE_API, fetch: deps.fetch }) };
}

/** What the first routine adds, in the words the confirm shows. */
function additions(route) {
  return [
    'One small program in your Cloudflare account that keeps the list of routines and the clock.',
    'A short-lived cloud computer that starts for each run and is deleted after it, at most two at once.',
    'A private key for this install, saved on this computer and in your Cloudflare account, so only you can change routines.',
    ...(route === 'github' ? ['Two more permissions on your Cloudflare token: Workers Containers Write and Billing Read.'] : []),
  ];
}

const routeOf = (ctx) => (ctx.components.delivery?.route === 'artifacts' ? 'artifacts' : 'github');

/** Where runs get the project: the install's Artifacts repository, or its GitHub one. */
function project(ctx) {
  const delivery = ctx.components.delivery ?? {};
  if (routeOf(ctx) === 'artifacts') return { route: 'artifacts', remote: delivery.remote, repo: delivery.repo, namespace: delivery.namespace };
  let origin = '';
  try { origin = git(ctx.root, 'remote', 'get-url', 'origin'); } catch { /* no origin */ }
  const github = githubRemote(origin);
  if (!github) throw input('This project has no GitHub or Cloudflare repository to run from: `origin` is not a GitHub address.');
  return { route: 'github', ...github };
}

/** Stops before a key could be written where git would commit it. */
function keysAreIgnored(ctx) {
  if (!isIgnored(ctx.primary, '.env')) throw input('.env is not git-ignored in the main copy of this repo, so no key was saved. Fix that first (wiki/development/secrets.md).');
}

/** Writes one key to the primary's .env and a linked worktree's own copy. */
function saveKey(ctx, name, value) {
  keysAreIgnored(ctx);
  setKey(path.join(ctx.primary, '.env'), name, `${name}=${value}`);
  const copy = path.join(ctx.root, '.env');
  if (ctx.root !== ctx.primary && existsSync(copy)) setKey(copy, name, `${name}=${value}`);
}

/**
 * Keeps what setup generates in the runner's folder out of git, in this clone's own exclude file:
 * its installed tools, and the config that carries the account's ids.
 */
async function ignoreGenerated(ctx, exec) {
  const file = path.join(await commonDir(ctx.root, exec), 'info', 'exclude');
  const have = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lacking = ['wrangler.jsonc', 'node_modules/', '.wrangler/'].map((name) => `${FOLDER}/${name}`).filter((line) => !have.split('\n').includes(line));
  if (!lacking.length) return;
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${have && !have.endsWith('\n') ? '\n' : ''}${lacking.join('\n')}\n`);
}

/** A failed Cloudflare or tool step, in /routine's own exit codes. */
function cloudStop(error) {
  if (error instanceof RoutineError) return error;
  if (error instanceof ProvisionError || error instanceof CloudflareError) return new RoutineError(EXIT.noAnswer, `Cloudflare did not take the change: ${error.message}. Nothing was recorded; try again.`, { reason: error.reason ?? 'cloudflare' });
  return error;
}

// ---------------------------------------------------------------------------
// setup and signin

async function setup(ctx, flags, deps) {
  const route = routeOf(ctx);
  const plan = { adds: additions(route), cost: COST, fullPermissions: 'Each run starts an assistant with full permissions inside its cloud computer.' };
  if (flags.dryRun) return { ok: true, dryRun: true, installed: Boolean(ctx.routines), ...plan };

  const { token, account, cf } = cloudflareOf(ctx, deps);
  keysAreIgnored(ctx);
  const base = await recordedBase(ctx.root, deps.exec);
  if (!base) throw input('This install has not been set up on Cloudflare yet, so it has no name to install routines under.');
  const source = project(ctx);
  const runner = `${base}-routines`;
  const created = [];
  const updated = [];
  const note = (kind, what) => (kind === 'created' ? created : updated).push(what);
  try {
    // The plan can only be read with Billing Read, so the token widens first. On a free account that is all that changes.
    const widened = await widenBy({ token, api: ctx.env.WONG_CLOUDFLARE_API, fetch: deps.fetch, account, rows: ROUTINES_PROVISION, sleep: deps.sleep });
    const paid = await paidPlan(cf, account, deps.sleep);
    if (!paid) {
      throw notReady('paid-plan', 'Routines need Cloudflare\'s paid plan, and this account is on the free one. Nothing was added.', {
        cost: 'about $5 a month', upgrade: `https://dash.cloudflare.com/${account}/workers/plans`, granted: widened.granted,
      });
    }
    const { subdomain } = await cf('GET', `/accounts/${account}/workers/subdomain`);
    const folder = path.join(ctx.root, FOLDER);
    await ignoreGenerated(ctx, deps.exec);
    const text = runnerConfig({ account, runner, ...source }, readFileSync(path.join(folder, 'wrangler.template.jsonc'), 'utf8'));
    await installRunner({ folder, shown: FOLDER, text, token, account, env: ctx.env, exec: deps.exec, note });
    note('updated', `routine runner ${runner}`);

    const key = ctx.keys.WONG_ROUTINES_KEY || randomBytes(32).toString('base64url');
    const { put } = await workerSecrets(cf, account, runner);
    await put('ROUTINES_KEY', key);
    if (ctx.keys.CLOUDFLARE_MEMORY_TOKEN) await put('MEMORY_TOKEN', ctx.keys.CLOUDFLARE_MEMORY_TOKEN);
    const projectKey = route === 'github' ? ctx.keys[PROJECT_KEY] : null;
    if (projectKey) await put('GITHUB_TOKEN', projectKey);

    // Recorded last: a run that stopped above left nothing half-written here.
    if (!ctx.keys.WONG_ROUTINES_KEY) {
      saveKey(ctx, 'WONG_ROUTINES_KEY', key);
      note('created', 'WONG_ROUTINES_KEY in .env');
    }
    const routines = { worker: runner, url: `https://${runner}.${subdomain}.workers.dev`, accountId: account, route };
    recordComponent(ctx.root, 'routines', routines, note);
    const waits = route === 'github' && !projectKey;
    return {
      ok: true, routines, created, updated, granted: widened.granted, plan: paid, cost: COST,
      ...(ctx.keys.CLOUDFLARE_MEMORY_TOKEN ? {} : { todo: ['this install has no memory key in .env, so a run can leave no note; add one, then run setup again'] }),
      ...(waits ? { needs: 'project-access', keys: [PROJECT_KEY] } : {}),
    };
  } catch (error) {
    throw cloudStop(error);
  }
}

async function signin(ctx, flags, deps) {
  const choices = SIGNINS[flags.agent];
  if (!choices) throw input(`Unknown agent "${flags.agent ?? ''}". Pass --agent claude or --agent codex.`);
  if (!ctx.routines) throw notReady('setup', 'The routine pieces are not installed yet. Run setup first.', additionsOf(ctx));
  const who = maker(ctx.root);
  const found = choices.find((choice) => ctx.keys[choice.from]);
  const names = choices.map((choice) => choice.from);
  if (!found) throw notReady('signin', `No sign-in for ${flags.agent} is saved on this computer. Send the key link for one of: ${names.join(', ')}.`, { keys: names });
  const { account, cf } = cloudflareOf(ctx, deps);
  try {
    const { put } = await workerSecrets(cf, account, ctx.routines.worker);
    await put(signinSecret(flags.agent, who.id), signinValue(found.as, ctx.keys[found.from]));
  } catch (error) {
    throw cloudStop(error);
  }
  return { ok: true, action: 'signin', agent: flags.agent, stored: found.from, for: { name: who.name, email: who.email } };
}

const additionsOf = (ctx) => ({ adds: additions(routeOf(ctx)), cost: COST });

// ---------------------------------------------------------------------------
// The runner's API

const NEEDS_KEYS = { signin: (agent) => SIGNINS[agent]?.map((choice) => choice.from) ?? [], 'project-access': () => [PROJECT_KEY] };

/** One call to the runner. Returns its answer, or stops with the exit code that says what went wrong. */
async function ask(ctx, deps, method, route, body) {
  if (!ctx.routines) throw notReady('setup', 'The routine pieces are not installed yet. The first routine installs them.', additionsOf(ctx));
  const key = ctx.keys.WONG_ROUTINES_KEY;
  if (!key) throw notReady('setup', 'This computer has no WONG_ROUTINES_KEY in .env, so it can not manage this install\'s routines. Run setup here.', additionsOf(ctx));
  const base = (ctx.env.WONG_ROUTINES_API || ctx.routines.url).replace(/\/$/, '');
  const silent = (why) => new RoutineError(EXIT.noAnswer, `The routine pieces did not answer (${why}). Nothing changed. Try again; if it keeps failing, run setup again (${PAGE}).`);
  let response;
  let text;
  try {
    response = await deps.fetch(`${base}${route}`, {
      method, signal: AbortSignal.timeout(deps.timeoutMs ?? 30_000),
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    text = await response.text();
  } catch {
    throw silent('no reply');
  }
  if (response.status >= 500 || (response.status === 404 && !text)) throw silent(response.status === 404 ? 'not found, or this computer\'s key is not theirs' : `HTTP ${response.status}`);
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!data || typeof data.ok !== 'boolean' || data.version !== API_VERSION) {
    throw new RoutineError(EXIT.client, `The routine pieces answered in a way this version does not understand. Nothing changed. Run setup again to update them (${PAGE}).`);
  }
  if (data.ok) return data;
  if (data.needs) throw notReady(data.needs, data.error, { keys: NEEDS_KEYS[data.needs]?.(body?.agent) ?? [] });
  throw input(data.error, without(data, 'ok', 'version', 'error', 'code'));
}

const without = (object, ...keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
const named = (key) => `/routines/${encodeURIComponent(String(key ?? '').trim())}`;
/** A runner's answer as this script prints it. */
const shown = (answer) => without(answer, 'version');

// ---------------------------------------------------------------------------
// Commands

async function create(ctx, flags, deps) {
  const timezone = flags.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const who = maker(ctx.root);
  const name = flags.name || defaultName(flags.prompt ?? '', ctx.primary);
  const request = buildRoutine({ ...flags, timezone, name, maker: who });
  if (flags.dryRun) {
    const next = nextRun(request.cron, timezone, deps.now());
    return { ok: true, dryRun: true, installed: Boolean(ctx.routines), request, runsAs: { name: who.name, email: who.email }, nextRunAt: next === null ? null : new Date(next).toISOString(), ...(ctx.routines ? {} : additionsOf(ctx)) };
  }
  if (!ctx.routines) throw notReady('setup', 'The routine pieces are not installed yet. Show what they add, then run setup.', additionsOf(ctx));
  if (request.keys.length) {
    const lacking = request.keys.filter((key) => !ctx.keys[key]);
    if (lacking.length) throw input(`Not in this install's .env: ${lacking.join(', ')}. Send the key link for it first.`, { keys: lacking });
    const { account, cf } = cloudflareOf(ctx, deps);
    try {
      const { put } = await workerSecrets(cf, account, ctx.routines.worker);
      for (const key of request.keys) await put(keySecret(key), ctx.keys[key]);
    } catch (error) {
      throw cloudStop(error);
    }
  }
  return shown(await ask(ctx, deps, 'POST', '/routines', request));
}

async function change(ctx, key, flags, deps) {
  if (!flags.cron && !flags.timezone && !flags.prompt) throw input('Nothing to change. Pass --cron, --timezone, or --prompt.');
  if (flags.cron) {
    const field = invalidCronField(flags.cron);
    if (field) throw input(`Invalid cron "${flags.cron}": ${field}.`, { field });
  }
  const body = { ...(flags.cron ? { cron: flags.cron } : {}), ...(flags.timezone ? { timezone: flags.timezone } : {}), ...(flags.prompt ? { prompt: flags.prompt } : {}) };
  return shown(await ask(ctx, deps, 'PATCH', named(key), body));
}

async function run(argv, env, deps) {
  const { command = 'ls', flags, positional } = parseCommand(argv, {
    values: VALUE_FLAGS, booleans: { '--dry-run': 'dryRun' }, positional: true, unknown: (arg) => `Unknown flag ${arg}.`,
  });
  const known = ['create', 'ls', 'change', 'setup', 'signin', ...Object.keys(ACTIONS)];
  if (!known.includes(command)) throw input(`Unknown command "${command}". Use create, ls, pause, resume, run, logs, change, delete, setup, or signin.`);
  const ctx = install(deps.cwd, env);
  if (command === 'setup') return setup(ctx, flags, deps);
  if (command === 'signin') return signin(ctx, flags, deps);
  if (command === 'create') return create(ctx, flags, deps);
  if (command === 'ls') return ctx.routines ? shown(await ask(ctx, deps, 'GET', '/routines')) : { ok: true, installed: false, routines: [] };
  if (!String(positional[0] ?? '').trim()) throw input('Name or id a routine.');
  if (command === 'change') return change(ctx, positional[0], flags, deps);
  return shown(await ask(ctx, deps, ACTIONS[command], command === 'delete' ? named(positional[0]) : `${named(positional[0])}/${command}`));
}

/**
 * Runs one command and returns its exit code. `deps` replaces the outside world in tests: `fetch`,
 * `exec` (npm, wrangler, git), `sleep`, `now`, `cwd`, and `out`.
 */
export async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const out = deps.out ?? ((text) => process.stdout.write(text));
  if (argv.slice(0, 2).includes('--help')) { out(`${USAGE}\n`); return EXIT.ok; }
  const world = { fetch: globalThis.fetch, exec: runTool, sleep: (ms) => new Promise((done) => setTimeout(done, ms)), now: () => Date.now(), cwd: process.cwd(), ...deps };
  try {
    out(`${JSON.stringify(await run(argv, env, world), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof CliError ? error.code : 1;
    out(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
