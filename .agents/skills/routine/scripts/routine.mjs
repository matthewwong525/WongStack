#!/usr/bin/env node
// Routines for this install: the one door /routine uses. A routine runs in the person's own
// Cloudflare account, in the routine runner (scripts/routine-runner/); this script installs the
// runner on first use, sets the model its runs use, and manages the list over the runner's own API.
// wiki/stack/cloud-routines.md owns how a routine runs. USAGE below lists the commands.
//
// Prints one JSON object on stdout, and never a key's value. Exit codes: 0 ok, 2 bad input,
// 3 not ready (`needs`: cloudflare, paid-plan, project-access, model, model-key, provider, or setup),
// 4 the runner does not answer, 5 its answers have changed.
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
import { ModelError, keyPlan, serviceName, shortlist } from '../../../../scripts/routine-runner/models.mjs';
import { API_VERSION, invalidKeyName } from '../../../../scripts/routine-runner/routines.mjs';
import { keySecret } from '../../../../scripts/routine-runner/run.mjs';
import { invalidCronField, invalidTimezone, nextRun, normalizeCron } from '../../../../scripts/routine-runner/schedule.mjs';
import {
  AI_RUN_TOKEN, CloudflareError, ProvisionError, ROUTINES_PROVISION, cloudflare, commonDir, fillConfig, installRunner, orNull, paidPlan, readJson, recordComponent,
  recordedBase, run as runTool, scopedToken, widenBy, workerSecrets,
} from './lib/cloudflare.mjs';
import { EXIT, PaseoError, git, parseCommand } from './lib/paseo.mjs';

const USAGE = `usage: routine.mjs create --cron <expr> --prompt <text> [--name <n>] [--timezone <iana>] [--keys <NAME,NAME>] [--dry-run]
       routine.mjs ls
       routine.mjs pause|resume|run|logs|delete <name|id>
       routine.mjs change <name|id> [--cron <expr>] [--timezone <iana>] [--prompt <text>]
       routine.mjs model [<id>]
       routine.mjs key [--provider <id>] [--model <id>]
       routine.mjs key --remove
       routine.mjs setup [--dry-run]`;
const VALUE_FLAGS = ['cron', 'prompt', 'name', 'timezone', 'keys', 'provider', 'model'];
const ACTIONS = { pause: 'POST', resume: 'POST', run: 'POST', logs: 'GET', delete: 'DELETE' };
const FOLDER = 'scripts/routine-runner';
const COST = 'about $5 a month for Cloudflare\'s paid plan; runs and model use beyond what the plan includes are billed by Cloudflare';
const PROJECT_KEY = 'WONG_ROUTINE_GITHUB_TOKEN';
const MODEL_KEY = 'WONG_ROUTINE_MODEL_KEY';
const PAGE = 'wiki/stack/cloud-routines.md';
// The positions lib/paseo.mjs's exit codes hold: 3 is not ready, 4 is no answer.
const NOT_READY = 3;
const NO_ANSWER = 4;
const UNKNOWN_KEY_WAITS = [2000, 4000];

export class RoutineError extends PaseoError {}

const notReady = (needs, message, extra = {}) => new RoutineError(NOT_READY, message, { needs, ...extra });
const input = (message, extra) => new RoutineError(EXIT.input, message, extra);

// ---------------------------------------------------------------------------
// Pure helpers

/** `/improve` in MyApp → `improve MyApp`; plain prompts use their first four words. */
export function defaultName(prompt, repoDir) {
  const text = String(prompt).trim();
  const head = text.startsWith('/') ? text.slice(1).split(/\s+/)[0] : text.split(/\s+/).slice(0, 4).join(' ');
  return `${head} ${path.basename(repoDir)}`.trim();
}

/** Who a routine runs as: the git author here, with a short id of their email. */
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
export function buildRoutine({ prompt, cron, timezone, name, keys, maker }) {
  const text = String(prompt ?? '').trim();
  if (!text) throw input('The prompt is empty.');
  const field = invalidCronField(cron);
  if (field) throw input(`Invalid cron "${cron}": ${field}.`, { field });
  const zone = invalidTimezone(timezone);
  if (zone) throw input(zone, { field: 'timezone' });
  const named = String(keys ?? '').split(',').map((key) => key.trim()).filter(Boolean);
  for (const key of named) {
    const why = invalidKeyName(key);
    if (why) throw input(why);
  }
  return { name, prompt: text, cron: normalizeCron(cron), timezone, keys: named, maker };
}

/** The runner's config for this install: the template filled, with no Artifacts binding when the project lives on GitHub. */
export function runnerConfig({ account, runner, route, remote, repo, namespace = '' }, template) {
  const text = route === 'artifacts' ? template : template.replace(/^.*"artifacts":.*\n/m, '');
  return fillConfig(text, { '<runner>': runner, '<account id>': account, '<namespace>': namespace, '<route>': route, '<remote>': remote, '<repo>': repo }, 'routine runner');
}

/** Why a model test was refused, in plain words, from its HTTP status. */
export function refusalReason(status) {
  if (status === 401 || status === 403) return 'the service refused it';
  if (status === 402 || status === 429) return 'the account behind it has no credit left, or is over its limit';
  if (status === 404) return 'the service does not list that model';
  return status ? `the service answered HTTP ${status}` : 'the service could not be reached';
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

/** The person's Cloudflare token and account, or exit 3 saying this install has no Cloudflare to add routines to. */
function cloudflareOf(ctx, deps) {
  const token = ctx.env.CLOUDFLARE_API_TOKEN || ctx.keys.CLOUDFLARE_API_TOKEN;
  const account = ctx.env.CLOUDFLARE_ACCOUNT_ID || ctx.keys.CLOUDFLARE_ACCOUNT_ID || ctx.routines?.accountId || ctx.components.memory?.accountId;
  if (!token) throw notReady('cloudflare', 'CLOUDFLARE_API_TOKEN is not in this install\'s .env, so nothing can be added to Cloudflare. Send the key link for it first.', { keys: ['CLOUDFLARE_API_TOKEN'] });
  if (!account) throw notReady('cloudflare', 'This install records no Cloudflare account, and routines run in one. Run setup\'s Cloudflare step first.');
  return { token, account, cf: cloudflare(token, { api: ctx.env.WONG_CLOUDFLARE_API, fetch: deps.fetch }) };
}

/** What the first routine adds, in the words the confirm shows. */
const additions = () => [
  'One small program in your Cloudflare account that keeps the list of routines and the clock.',
  'A short-lived cloud computer that starts for each run and is deleted after it, at most two at once.',
  'A gateway to Cloudflare\'s AI models, and a key for it that can only run models.',
  'A private key for this install, saved on this computer and in your Cloudflare account, so only you can change routines.',
  `Permissions your Cloudflare token gives itself where it lacks them: ${ROUTINES_PROVISION.map((row) => row.name).join(', ')}.`,
];
const plan = () => ({ adds: additions(), cost: COST });

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
  if (error instanceof ProvisionError || error instanceof CloudflareError) return new RoutineError(NO_ANSWER, `Cloudflare did not take the change: ${error.message}. Nothing was recorded; try again.`, { reason: error.reason ?? 'cloudflare' });
  return error;
}

/** One Worker's secrets, with a Cloudflare refusal turned into /routine's own stop. */
async function secretsOf(ctx, deps) {
  const { account, cf } = cloudflareOf(ctx, deps);
  const secrets = await workerSecrets(cf, account, ctx.routines.worker).catch((error) => { throw cloudStop(error); });
  const guarded = (call) => (...args) => call(...args).catch((error) => { throw cloudStop(error); });
  return { held: secrets.held, put: guarded(secrets.put), remove: guarded(secrets.remove) };
}

// ---------------------------------------------------------------------------
// setup

/** The install's AI Gateway, made when missing: it takes only requests that carry a key of this account. */
async function gateway(cf, account, id, note) {
  const gateways = `/accounts/${account}/ai-gateway/gateways`;
  if (await orNull(() => cf('GET', `${gateways}/${id}`))) return note('reused', `AI Gateway ${id}`);
  await cf('POST', gateways, { id, authentication: true, collect_logs: false, cache_ttl: 0, cache_invalidate_on_update: false, rate_limiting_interval: 0, rate_limiting_limit: 0, rate_limiting_technique: 'fixed' });
  note('created', `AI Gateway ${id}`);
}

async function setup(ctx, flags, deps) {
  if (flags.dryRun) return { ok: true, dryRun: true, installed: Boolean(ctx.routines), ...plan(), fullPermissions: 'Each run starts an assistant with full permissions inside its cloud computer.' };

  const { token, account, cf } = cloudflareOf(ctx, deps);
  keysAreIgnored(ctx);
  const base = await recordedBase(ctx.root, deps.exec);
  if (!base) throw notReady('cloudflare', 'This install has not been set up on Cloudflare yet, so it has no name to install routines under. Run setup\'s Cloudflare step first.');
  const route = routeOf(ctx);
  const source = project(ctx);
  const runner = `${base}-routines`;
  const created = [];
  const updated = [];
  const note = (kind, what) => (kind === 'created' ? created : kind === 'updated' ? updated : []).push(what);
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
    await gateway(cf, account, runner, note);

    const key = ctx.keys.WONG_ROUTINES_KEY || randomBytes(32).toString('base64url');
    const { held, put } = await workerSecrets(cf, account, runner);
    await put('ROUTINES_KEY', key);
    const groups = await cf('GET', '/user/tokens/permission_groups?per_page=1000');
    await scopedToken(cf, account, `${runner}-ai`, AI_RUN_TOKEN, groups, { secretSet: held.has('AI_RUN_TOKEN'), setSecret: (value) => put('AI_RUN_TOKEN', value), note, label: 'model-only key', sentTo: 'the routine runner' });
    if (ctx.keys.CLOUDFLARE_MEMORY_TOKEN) await put('MEMORY_TOKEN', ctx.keys.CLOUDFLARE_MEMORY_TOKEN);
    const projectKey = route === 'github' ? ctx.keys[PROJECT_KEY] : null;
    if (projectKey) await put('GITHUB_TOKEN', projectKey);

    // Recorded last: a run that stopped above left nothing half-written here.
    if (!ctx.keys.WONG_ROUTINES_KEY) {
      saveKey(ctx, 'WONG_ROUTINES_KEY', key);
      note('created', 'WONG_ROUTINES_KEY in .env');
    }
    const routines = { worker: runner, url: `https://${runner}.${subdomain}.workers.dev`, accountId: account, route, gateway: runner };
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

// ---------------------------------------------------------------------------
// The runner's API

const NEEDS_KEYS = { 'model-key': [MODEL_KEY], 'project-access': [PROJECT_KEY] };
const notInstalled = () => notReady('setup', 'The routine pieces are not installed yet. The first routine installs them.', plan());

/** One call to the runner. Returns its answer, or stops with the exit code that says what went wrong. */
async function ask(ctx, deps, method, route, body) {
  if (!ctx.routines) throw notInstalled();
  const key = ctx.keys.WONG_ROUTINES_KEY;
  if (!key) throw notReady('setup', 'This computer has no WONG_ROUTINES_KEY in .env, so it can not manage this install\'s routines. Run setup here.', plan());
  const base = (ctx.env.WONG_ROUTINES_API || ctx.routines.url).replace(/\/$/, '');
  const silent = (why) => new RoutineError(NO_ANSWER, `The routine pieces did not answer (${why}). Nothing changed. Try again; if it keeps failing, run setup again (${PAGE}).`);
  let response;
  let text;
  // A key just sent to Cloudflare takes a few seconds to reach every location, and until then the
  // runner answers as if it were not there: an empty 404 is tried again, twice.
  for (const wait of [...UNKNOWN_KEY_WAITS, null]) {
    try {
      response = await deps.fetch(`${base}${route}`, {
        method, signal: AbortSignal.timeout(deps.timeoutMs ?? 120_000),
        headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      text = await response.text();
    } catch {
      throw silent('no reply');
    }
    if (wait === null || response.status !== 404 || text) break;
    await deps.sleep(wait);
  }
  if (response.status >= 500 || (response.status === 404 && !text)) throw silent(response.status === 404 ? 'not found, or this computer\'s key is not theirs' : `HTTP ${response.status}`);
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!data || typeof data.ok !== 'boolean' || data.version !== API_VERSION) {
    throw new RoutineError(EXIT.client, `The routine pieces answered in a way this version does not understand. Nothing changed. Run setup again to update them (${PAGE}).`);
  }
  if (data.ok) return data;
  if (data.needs) throw notReady(data.needs, data.error, { ...(NEEDS_KEYS[data.needs] ? { keys: NEEDS_KEYS[data.needs] } : {}), ...(data.shortlist ? { shortlist: data.shortlist } : {}) });
  throw input(data.error, without(data, 'ok', 'version', 'error', 'code'));
}

const without = (object, ...keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
const named = (key) => `/routines/${encodeURIComponent(String(key ?? '').trim())}`;
/** A runner's answer as this script prints it. */
const shown = (answer) => without(answer, 'version');
/** The model in use, with its service's name. */
const withService = (model) => model && { ...model, service: serviceName(model.provider) };

// ---------------------------------------------------------------------------
// model and key

/** With no id, the model in use and what can be picked. With one, a test request, then the pick. */
async function model(ctx, id, deps) {
  if (!id) {
    if (!ctx.routines) return { ok: true, installed: false, model: null, shortlist: shortlist(), models: [] };
    const listed = await ask(ctx, deps, 'GET', '/models');
    return { ok: true, installed: true, model: withService(listed.model), shortlist: listed.shortlist, models: listed.models };
  }
  const { accepted, refusals } = await ask(ctx, deps, 'POST', '/model/test', { model: id });
  if (!accepted) {
    const [{ status, message }] = refusals;
    throw input(`Cloudflare refused ${id}: ${refusalReason(status)}. A model like Claude or GPT needs credit loaded in your Cloudflare account, or your own key. Routines keep the model they had.`, { refused: true, status, said: message, model: withService((await ask(ctx, deps, 'GET', '/model')).model) });
  }
  const stored = await ask(ctx, deps, 'POST', '/model', { via: 'cloudflare', model: id });
  return { ok: true, action: 'model', model: withService(stored.model) };
}

/** Tests the pasted key against the services its shape points to, then stores it. A refused key stores nothing. */
async function pastedKey(ctx, flags, deps) {
  if (!ctx.routines) throw notInstalled();
  if (flags.remove) {
    const stored = await ask(ctx, deps, 'DELETE', '/model/key');
    await (await secretsOf(ctx, deps)).remove('MODEL_KEY');
    return { ok: true, action: 'forget-key', model: withService(stored.model), ...(stored.model ? {} : { needs: 'model', shortlist: shortlist() }) };
  }
  const key = ctx.keys[MODEL_KEY];
  if (!key) throw notReady('model-key', `No model key is saved on this computer. Send the key link for ${MODEL_KEY}.`, { keys: [MODEL_KEY] });
  let candidates;
  try {
    candidates = keyPlan({ key, provider: flags.provider, model: flags.model });
  } catch (error) {
    if (!(error instanceof ModelError)) throw error;
    throw error.code === 'provider' ? notReady('provider', error.message, error.extra) : input(error.message, error.extra);
  }
  const { accepted, refusals } = await ask(ctx, deps, 'POST', '/model/test', { key, candidates });
  if (!accepted) {
    const tried = refusals.map(({ provider, model: each, status }) => ({ service: serviceName(provider), provider, model: each, status, reason: refusalReason(status) }));
    throw input(`The key was refused: ${tried.map((each) => `${each.service}, ${each.reason}`).join('; ')}. Nothing was stored, and routines keep the model they had.`, { refused: true, tried });
  }
  await (await secretsOf(ctx, deps)).put('MODEL_KEY', key);
  const stored = await ask(ctx, deps, 'POST', '/model', { via: 'key', ...accepted });
  return { ok: true, action: 'key', model: withService(stored.model) };
}

// ---------------------------------------------------------------------------
// Commands

async function create(ctx, flags, deps) {
  const timezone = flags.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const who = maker(ctx.root);
  const name = flags.name || defaultName(flags.prompt ?? '', ctx.primary);
  const request = buildRoutine({ ...flags, timezone, name, maker: who });
  if (flags.dryRun) {
    const next = nextRun(request.cron, timezone, deps.now());
    const using = ctx.routines ? withService((await ask(ctx, deps, 'GET', '/model')).model) : null;
    return {
      ok: true, dryRun: true, installed: Boolean(ctx.routines), request, runsAs: { name: who.name, email: who.email }, nextRunAt: next === null ? null : new Date(next).toISOString(),
      model: using, ...(using ? {} : { shortlist: shortlist() }), ...(ctx.routines ? {} : plan()),
    };
  }
  const lacking = request.keys.filter((key) => !ctx.keys[key]);
  if (lacking.length) throw input(`Not in this install's .env: ${lacking.join(', ')}. Send the key link for it first.`, { keys: lacking });
  // The first routine installs the pieces: /routine has shown what they add and asked.
  let installed = null;
  if (!ctx.routines) {
    installed = await setup(ctx, {}, deps);
    if (installed.needs) throw notReady(installed.needs, 'The routine pieces are installed, but the runner has no access to the project yet. Send the key link for the project key, then run setup.', { keys: installed.keys, setup: without(installed, 'ok', 'needs', 'keys') });
    ctx = install(deps.cwd, ctx.env);
  }
  if (request.keys.length) {
    const { put } = await secretsOf(ctx, deps);
    for (const key of request.keys) await put(keySecret(key), ctx.keys[key]);
  }
  const report = installed ? { setup: without(installed, 'ok') } : {};
  try {
    return { ...shown(await ask(ctx, deps, 'POST', '/routines', request)), ...report };
  } catch (error) {
    // A first routine that still waits on a model has installed the pieces: the stop names them too.
    if (error instanceof RoutineError) Object.assign(error.extra, report);
    throw error;
  }
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
    values: VALUE_FLAGS, booleans: { '--dry-run': 'dryRun', '--remove': 'remove' }, positional: true, unknown: (arg) => `Unknown flag ${arg}.`,
  });
  const known = ['create', 'ls', 'change', 'model', 'key', 'setup', ...Object.keys(ACTIONS)];
  if (!known.includes(command)) throw input(`Unknown command "${command}". Use create, ls, pause, resume, run, logs, change, delete, model, key, or setup.`);
  const ctx = install(deps.cwd, env);
  if (command === 'setup') return setup(ctx, flags, deps);
  if (command === 'model') return model(ctx, String(positional[0] ?? '').trim(), deps);
  if (command === 'key') return pastedKey(ctx, flags, deps);
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
    const code = error instanceof PaseoError ? error.code : 1;
    out(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
