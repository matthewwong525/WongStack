// The Cloudflare steps setup's provisioning and /routine's first-use setup share: one API caller, the
// errors a step stops with, the token's widen, the paid-plan read, a token scoped to named groups, and
// a runner's install from the pack's own pinned tools. They live in this skill because it is
// installed in every project, and setup's own scripts are not; setup's provision.mjs imports them
// from here.
//
// Nothing here prints, and no error names a token.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PrimaryRootError, primaryRoot } from '../../../memory/scripts/lib/primary-root.mjs';

// A Workers Paid subscription, by the plan's id or name, as the account's subscriptions list it.
const PAID_PLAN = /workers.*(paid|standard)/i;
const API = 'https://api.cloudflare.com/client/v4';
/** The waits, in seconds, while a widened token or a new store takes effect: about a minute. */
export const PROPAGATION = [2, 4, 8, 15, 30];

// The groups, by name and scope, from wiki/stack/cloud-routines.md; a test holds them to its tables.
// Ids are resolved by name at runtime; the ids here are the tables' fallback, kept for that check.
/** What the first routine adds to the token: the short-lived computer, the read that sees the plan, and the AI Gateway with the models behind it. */
export const ROUTINES_PROVISION = [
  { name: 'Workers Containers Write', scope: 'account', id: 'bdbcd690c763475a985e8641dddc09f7' },
  { name: 'Billing Read', scope: 'account', id: '7cf72faf220841aabcfdfab81c43c4f6' },
  { name: 'AI Gateway Write', scope: 'account', id: '6c8a3737f07f46369c1ea1f22138daaf' },
  { name: 'AI Gateway Run', scope: 'account', id: '644535f4ed854494a59cb289d634b257' },
  { name: 'Workers AI Read', scope: 'account', id: 'a92d2450e05d4e7bb7d0a64968f83d11' },
];
/** The model-only token a run holds: it can run models through the gateway, and nothing else in the account. */
export const AI_RUN_TOKEN = [
  { name: 'AI Gateway Run', scope: 'account', id: '644535f4ed854494a59cb289d634b257' },
  { name: 'Workers AI Read', scope: 'account', id: 'a92d2450e05d4e7bb7d0a64968f83d11' },
];

/** Why a step stopped: `token`, `cloudflare`, `repo`, or `plan` (the account lacks the paid plan), with a plain cause. */
export class ProvisionError extends Error {
  constructor(reason, cause) {
    super(cause);
    this.reason = reason;
  }
}

/** A refused Cloudflare call. The message names the call and the error codes only, never a query or a token. */
export class CloudflareError extends Error {
  constructor(method, path, status, errors = []) {
    const codes = errors.map((error) => error.code).filter(Boolean);
    super(`Cloudflare ${method} ${path.split('?')[0]}: ${status ? `HTTP ${status}` : 'unreachable'} ${codes.join(',')}`.trim());
    this.status = status;
    this.codes = codes;
    this.messages = errors.map((error) => String(error.message ?? ''));
  }
}

/** Runs `fn`; a failure that is not already a ProvisionError becomes one with `reason`. */
export async function step(reason, fn) {
  try {
    return await fn();
  } catch (error) {
    throw error instanceof ProvisionError ? error : new ProvisionError(reason, error.message);
  }
}

/** Tries `fn` again through the propagation window while `again(error)` holds. */
export async function retry(fn, sleep, again) {
  for (const wait of PROPAGATION) {
    try {
      return await fn();
    } catch (error) {
      if (!again(error)) throw error;
      await sleep(wait * 1000);
    }
  }
  return fn();
}

// Right after a widen, Cloudflare can refuse the new groups for a few seconds with 401 (code 10000) or 403.
export const pending = (error) => error instanceof CloudflareError && (error.status === 401 || error.status === 403);
export const wait = (ms) => new Promise((done) => setTimeout(done, ms));
/** `fn()`, or null when Cloudflare answers 404. */
export const orNull = (fn) => fn().catch((error) => (error instanceof CloudflareError && error.status === 404 ? null : Promise.reject(error)));

/**
 * Runs a command with no shell and resolves with its output; a non-zero exit rejects with the last line
 * of stderr. `input` goes to stdin, so a secret never sits in the process list.
 */
export function run(file, args, { cwd, input, env, timeout } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(file, args, { cwd, env, timeout, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.stdin.on('error', () => {});
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolveRun({ stdout, stderr });
      const last = stderr.trim().split('\n').at(-1);
      reject(Object.assign(new Error(`${file} exited with ${code}${last ? `: ${last}` : ''}`), { stdout, stderr }));
    });
    child.stdin.end(input);
  });
}

/** Calls the Cloudflare API with `token` and returns `result`. */
export function cloudflare(token, { api, fetch: fetchFn = globalThis.fetch } = {}) {
  const base = (api || process.env.WONG_CLOUDFLARE_API || API).replace(/\/$/, '');
  return async (method, path, body) => {
    let response;
    try {
      response = await fetchFn(`${base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch {
      throw new CloudflareError(method, path, 0);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new CloudflareError(method, path, response.status, data.errors);
    return data.result;
  };
}

export const readJson = (file, fallback = null) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
export const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const isScope = (key, scope) => key.startsWith(`com.cloudflare.api.${scope}.`) && !key.includes('.zone.');
// Cloudflare files a zone group under the account: `com.cloudflare.api.account.zone`.
export const findGroup = (groups, { name, scope }) => groups.find((group) => group.name === name && group.scopes?.includes(`com.cloudflare.api.${scope === 'zone' ? 'account.zone' : scope}`));

// ── the repo's own files ────────────────────────────────────────────────────

export const recordFile = (dir) => join(dir, '.claude', '.wong-stack.json');

/** The clone's shared git folder: provisioning's own state lives there, outside every commit. */
export async function commonDir(dir, exec) {
  return (await exec('git', ['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir'])).stdout.trim();
}

export const stateFile = async (dir, exec) => join(await commonDir(dir, exec), 'wong-stack-provision.json');

/** The base this repo provisioned under, from provisioning's state or the install record; null when none. */
export async function recordedBase(dir, exec) {
  const state = readJson(await stateFile(dir, exec).catch(() => ''), {});
  if (state.base) return state.base;
  const database = readJson(recordFile(dir))?.components?.memory?.database;
  return typeof database === 'string' && database.endsWith('-memory') ? database.slice(0, -'-memory'.length) : null;
}

/**
 * The primary checkout's .env: where the durable secrets and the admin memory key live. Stops when the
 * primary is unknown, rather than write the keys into a worktree that may be deleted.
 */
export function durableEnv(dir) {
  try {
    return join(primaryRoot(dir).primary, '.env');
  } catch (error) {
    if (!(error instanceof PrimaryRootError)) throw error;
    throw new ProvisionError('repo', `could not find the main copy of this repo to keep the keys in: ${error.message}`);
  }
}

/** Merge a public component into the install record, writing only on a change. */
export function recordComponent(dir, component, data, note) {
  const file = recordFile(dir);
  const record = readJson(file, {});
  const next = { ...record, components: { ...record.components, [component]: { ...record.components?.[component], ...data } } };
  if (JSON.stringify(next) === JSON.stringify(record)) return;
  writeJson(file, next);
  note('updated', `.claude/.wong-stack.json components.${component}`);
}

// ── the token and the plan ──────────────────────────────────────────────────

/**
 * The token grants itself each of `rows` it lacks, in its own policy of that row's scope, keeping
 * every group, `resources`, and condition it has. Returns the names `granted` and already `held`.
 * The caller probes that the new set took.
 */
export async function grant(cf, rows) {
  const [self, groups] = await step('token', async () => {
    const { id } = await cf('GET', '/user/tokens/verify');
    return Promise.all([cf('GET', `/user/tokens/${id}`), cf('GET', '/user/tokens/permission_groups?per_page=1000')]);
  });
  const held = new Set(self.policies.flatMap((policy) => policy.permission_groups.map((group) => group.id)));
  const wanted = rows.map((row) => {
    const group = findGroup(groups, row);
    if (!group) throw new ProvisionError('token', `Cloudflare lists no ${row.scope} permission group named ${row.name}`);
    const policy = self.policies.find((p) => p.effect === 'allow' && Object.keys(p.resources).some((key) => isScope(key, row.scope)));
    if (!policy) throw new ProvisionError('token', `the token has no ${row.scope} policy for ${row.name}`);
    return { name: row.name, group, policy };
  });
  const missing = wanted.filter(({ group }) => !held.has(group.id));
  for (const { group, policy } of missing) policy.permission_groups.push({ id: group.id });
  if (missing.length) {
    const { name, status, policies, condition } = self;
    await step('cloudflare', () => cf('PUT', `/user/tokens/${self.id}`, { name, status, policies, ...(condition && { condition }) }));
  }
  return { granted: missing.map(({ name }) => name), held: wanted.filter(({ group }) => held.has(group.id)).map(({ name }) => name) };
}

/**
 * A widen by `rows` alone, on one account: the token gains what it lacks of them and keeps the rest,
 * then the plan read is tried until the new set works. Containers answer only on a paid account, so
 * that read is the one probe.
 */
export async function widenBy({ token, api, fetch, account, rows, sleep = wait }) {
  const cf = cloudflare(token, { api, fetch });
  const report = await grant(cf, rows);
  await step('cloudflare', () => retry(() => cf('GET', `/accounts/${account}/subscriptions`), sleep, pending));
  return { ...report, probed: [account] };
}

/** The account's Workers Paid plan as its subscriptions name it, or null. Reads only. */
export async function paidPlan(cf, account, sleep) {
  const subscriptions = await retry(() => cf('GET', `/accounts/${account}/subscriptions`), sleep, pending);
  for (const { rate_plan: rate } of subscriptions ?? []) {
    if (PAID_PLAN.test(`${rate?.id ?? ''} ${rate?.public_name ?? ''}`)) return rate.public_name || rate.id;
  }
  return null;
}

/** One allow policy on this account alone, with the named groups; `within` narrows it to part of the account. */
export const accountPolicy = (account, groups, rows, within = '*') => [
  {
    effect: 'allow',
    resources: { [`com.cloudflare.api.account.${account}`]: within },
    permission_groups: rows.map((row) => {
      const group = findGroup(groups, row);
      if (!group) throw new ProvisionError('token', `Cloudflare lists no ${row.scope} permission group named ${row.name}`);
      return { id: group.id };
    }),
  },
];

/**
 * An account token scoped to `rows`, named `name`: made when missing, given any group it lacks, and
 * its value rolled into its one holder when the holder has none. The value goes straight to
 * `setSecret`. `label` is what reports call it, `sentTo` its holder.
 */
export async function scopedToken(cf, account, name, rows, groups, { secretSet, setSecret, note, label = 'deploy token', sentTo = 'GitHub' }) {
  const base = `/accounts/${account}/tokens`;
  const policies = accountPolicy(account, groups, rows);
  const found = (await cf('GET', `${base}?per_page=100`)).find((t) => t.name === name);
  if (!found) {
    await setSecret((await cf('POST', base, { name, policies })).value);
    note('created', `${label} ${name}`);
    return;
  }
  const current = await cf('GET', `${base}/${found.id}`);
  const have = new Set(current.policies.flatMap((p) => p.permission_groups.map((g) => g.id)));
  const lacking = policies[0].permission_groups.filter((g) => !have.has(g.id));
  if (lacking.length) {
    const kept = current.policies.map((p, i) => (i === 0 ? { ...p, permission_groups: [...p.permission_groups, ...lacking] } : p));
    await cf('PUT', `${base}/${found.id}`, { name: current.name, status: current.status, policies: kept, ...(current.condition && { condition: current.condition }) });
    note('updated', `${label} ${name}: ${rows.filter((row) => lacking.some((g) => g.id === findGroup(groups, row).id)).map((row) => row.name).join(', ')}`);
  }
  if (secretSet) return note('reused', `${label} ${name}`);
  await setSecret(await cf('PUT', `${base}/${found.id}/value`, {}));
  note('updated', `${label} ${name}: new value sent to ${sentTo}`);
}

// ── a runner, from the pack's own pinned tools ──────────────────────────────

/** A runner's Wrangler config: `template` with every placeholder in `fill` filled, comments dropped. `what` names the runner in the error. */
export function fillConfig(template, fill, what) {
  let text = template.replace(/^\/\/.*\n/gm, '');
  for (const [placeholder, value] of Object.entries(fill)) text = text.replaceAll(placeholder, value);
  const left = /<[^<>\n"]+>/.exec(text);
  if (left) throw new ProvisionError('repo', `the ${what}'s config has a placeholder this script does not fill: ${left[0]}`);
  return text;
}

/**
 * Installs and deploys one runner from its pack folder: writes `text` as its wrangler.jsonc when it
 * differs, installs the folder's locked tools with no install scripts, and deploys with the token in
 * the environment only. `shown` is the folder as reports name it.
 */
export async function installRunner({ folder, shown, text, token, account, env, exec, note }) {
  const config = join(folder, 'wrangler.jsonc');
  const had = existsSync(config);
  if (!had || readFileSync(config, 'utf8') !== text) {
    writeFileSync(config, text);
    note(had ? 'updated' : 'created', `${shown}/wrangler.jsonc`);
  }
  const tools = { cwd: folder, env: { ...env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, WRANGLER_SEND_METRICS: 'false' } };
  await step('repo', () => exec('npm', ['ci', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: folder, env }));
  await step('cloudflare', () => exec('npx', ['--no-install', 'wrangler', 'deploy', '--config', 'wrangler.jsonc'], tools));
}

/** One Worker's secrets: the names it `held` when asked, `put(name, text)` to set one, and `remove(name)`. */
export async function workerSecrets(cf, account, script) {
  const path = `/accounts/${account}/workers/scripts/${script}/secrets`;
  const held = new Set((await step('cloudflare', () => cf('GET', path))).map((secret) => secret.name));
  return { held, put: (name, text) => cf('PUT', path, { name, text, type: 'secret_text' }), remove: (name) => orNull(() => cf('DELETE', `${path}/${name}`)) };
}
