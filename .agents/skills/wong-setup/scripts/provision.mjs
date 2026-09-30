#!/usr/bin/env node
// Cloudflare provisioning for a WongStack repo: the one set of steps setup's runbook
// (references/cloudflare.md) and the server installer (server/install-wongstack.mjs) both run.
//
//     node provision.mjs widen | accounts | names --repo <owner/name> | provision --repo <owner/name> --base <base>
//
// Each command prints one JSON report and never a token. The token is CLOUDFLARE_API_TOKEN, from the
// environment or the target's .env. WONG_CLOUDFLARE_API points every call at another API base, for tests.
// Every step checks before it acts, so a run that stopped runs again from the top.
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { parseEnv } from '../../memory/scripts/lib/store.mjs';
import { PrimaryRootError, primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { accessOrganization, ownerIdentity, provisionAccess, provisionAccessPolicies } from './private-access.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAGMENTS = join(HERE, '..', '..', 'wong-sync', 'references', 'stack-pack-fragments.md');
const API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT = /^[0-9a-f]{32}$/;
/** The waits, in seconds, while a widened token or a new store takes effect: about a minute. */
export const PROPAGATION = [2, 4, 8, 15, 30];
/** The error Cloudflare returns for an R2 call on an account with no R2 subscription. */
export const R2_OFF = 10042;

// The groups, by name and scope, from references/permission-groups.md; a test holds them to its tables.
// Ids are resolved by name at runtime; the ids here are the tables' fallback, kept for that check.
/** What the user grants on the token screen. Both must survive every widen. */
export const USER_GRANTS = [
  { name: 'API Tokens Write', scope: 'user', id: '686d18d5ac6c441c867cbf6771e58a0a' },
  { name: 'Account API Tokens Write', scope: 'account', id: '5bc3f8b21c554832afc660159ab75fa4' },
];
/** A normal provision: what the widen grants. R2 is always asked for, since only it can tell whether R2 is on. */
export const NORMAL_PROVISION = [
  { name: 'Workers Scripts Write', scope: 'account', id: 'e086da7e2179491d91ee5f35b3ca210a' },
  { name: 'D1 Write', scope: 'account', id: '09b2857d1c31407795e75e3fed8617a1' },
  { name: 'Account Settings Read', scope: 'account', id: 'c1fde68c7bcc44588cbb6ddbc16d6480' },
  { name: 'Workers CI Read', scope: 'account', id: 'ad99c5ae555e45c4bef5bdf2678388ba' },
  { name: 'Workers CI Write', scope: 'account', id: '2e095cf436e2455fa62c9a9c2e18c478' },
  { name: 'User Details Read', scope: 'user', id: '8acbe5bb0d54464ab867149d7f7cf8ac' },
  { name: 'Workers R2 Storage Write', scope: 'account', id: 'bf7481a1826f439697cb59a20b22293e' },
  { name: 'Access: Apps and Policies Write', scope: 'account', id: '1e13c5124ca64b72b1969a67e8829049' },
  { name: 'Access: Organizations, Identity Providers, and Groups Write', scope: 'account', id: 'bfe0d8686a584fa680f4c53b5eb0de6d' },
  { name: 'Access: Service Tokens Write', scope: 'account', id: 'a1c0fec57cf94af79479a6d827fa518c' },
  { name: 'Zero Trust Write', scope: 'account', id: 'b33f02c6f7284e05a6f20741c0bb0567' },
  { name: 'Browser Run Write', scope: 'account', id: 'adddda876faa4a0590f1b23a038976e4' },
];
/** The CI deploy token. `when`: always, with a memory bucket, or with custom-domain routes (never set here). */
export const DEPLOY_TOKEN = [
  { name: 'Access: Apps and Policies Read', scope: 'account', when: 'always', id: '7ea222f6d5064cfa89ea366d7c1fee89' },
  { name: 'Workers Scripts Write', scope: 'account', when: 'always', id: 'e086da7e2179491d91ee5f35b3ca210a' },
  { name: 'D1 Write', scope: 'account', when: 'always', id: '09b2857d1c31407795e75e3fed8617a1' },
  { name: 'Account Settings Read', scope: 'account', when: 'always', id: 'c1fde68c7bcc44588cbb6ddbc16d6480' },
  { name: 'Workers R2 Storage Write', scope: 'account', when: 'bucket', id: 'bf7481a1826f439697cb59a20b22293e' },
  { name: 'Workers Routes Write', scope: 'zone', when: 'routes', id: '28f4b596e7d643029c524985477ae49a' },
];

/** Why a step stopped: `token`, `cloudflare`, or `repo`, with a plain cause. */
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
async function step(reason, fn) {
  try {
    return await fn();
  } catch (error) {
    throw error instanceof ProvisionError ? error : new ProvisionError(reason, error.message);
  }
}

/** Tries `fn` again through the propagation window while `again(error)` holds. */
async function retry(fn, sleep, again) {
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
const pending = (error) => error instanceof CloudflareError && (error.status === 401 || error.status === 403);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const isoDate = () => new Date().toISOString().slice(0, 10);

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

/** A name that Workers and D1 accept: lowercase letters, digits, and `-`, at most 40 characters. */
export function safeName(name) {
  const safe = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');
  return safe || 'wongstack';
}

/** A `.env` file's `KEY=value` lines, read by the memory scripts' parser; `{}` when it is missing. */
export const readEnv = file => (existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {});

const readJson = (file, fallback = null) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

/** Every name one base takes. The memory store's database and bucket share a name. */
export const namesFor = (base) => ({
  worker: base,
  staging: `${base}-staging`,
  db: `${base}-db`,
  stagingDb: `${base}-db-staging`,
  memory: `${base}-memory`,
  deploy: `${base}-deploy`,
});

const isScope = (key, scope) => key.startsWith(`com.cloudflare.api.${scope}.`) && !key.includes('.zone.');
const findGroup = (groups, { name, scope }) => groups.find((group) => group.name === name && group.scopes?.includes(`com.cloudflare.api.${scope}`));

// ── the repo's own files ────────────────────────────────────────────────────

const recordFile = (dir) => join(dir, '.claude', '.wong-stack.json');

/** The clone's shared git folder: provisioning's own state lives there, outside every commit. */
async function commonDir(dir, exec) {
  return (await exec('git', ['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir'])).stdout.trim();
}

const stateFile = async (dir, exec) => join(await commonDir(dir, exec), 'wong-stack-provision.json');

/** The base this repo provisioned under, from provisioning's state or the install record; null when none. */
async function recordedBase(dir, exec) {
  const state = readJson(await stateFile(dir, exec).catch(() => ''), {});
  if (state.base) return state.base;
  const database = readJson(recordFile(dir))?.components?.memory?.database;
  return typeof database === 'string' && database.endsWith('-memory') ? database.slice(0, -'-memory'.length) : null;
}

/**
 * The primary checkout's .env: where the durable secrets and the admin memory key live. Stops when the
 * primary is unknown, rather than write the keys into a worktree that may be deleted.
 */
function durableEnv(dir) {
  try {
    return join(primaryRoot(dir).primary, '.env');
  } catch (error) {
    if (!(error instanceof PrimaryRootError)) throw error;
    throw new ProvisionError('repo', `could not find the main copy of this repo to keep the keys in: ${error.message}`);
  }
}

// ── the widen ───────────────────────────────────────────────────────────────

/**
 * The token grants itself a normal provision's groups, keeping its own two, its `resources`, and its
 * condition, then waits until the new set works on `account`, or on every account it sees.
 */
export async function widen({ token, api, fetch, account, sleep = wait }) {
  const cf = cloudflare(token, { api, fetch });
  const [self, groups] = await step('token', async () => {
    const { id } = await cf('GET', '/user/tokens/verify');
    return Promise.all([cf('GET', `/user/tokens/${id}`), cf('GET', '/user/tokens/permission_groups?per_page=1000')]);
  });
  const held = new Set(self.policies.flatMap((policy) => policy.permission_groups.map((group) => group.id)));
  const wanted = [...USER_GRANTS, ...NORMAL_PROVISION].map((row) => {
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
  const probed = account ? [account] : (await step('cloudflare', () => cf('GET', '/accounts?per_page=50'))).map((each) => each.id);
  for (const id of probed) {
    await step('cloudflare', () => retry(() => cf('GET', `/accounts/${id}/d1/database?per_page=1`), sleep, pending));
    for (const surface of ['apps', 'identity_providers', 'service_tokens']) {
      await step('cloudflare', () => retry(() => cf('GET', `/accounts/${id}/access/${surface}?per_page=1`), sleep, pending));
    }
  }
  return { granted: missing.map(({ name }) => name), held: wanted.filter(({ group }) => held.has(group.id)).map(({ name }) => name), probed };
}

/** The accounts the token sees. Zero with a valid token means Account Resources was left unset. */
export async function accounts({ token, api, fetch }) {
  const list = await step('token', () => cloudflare(token, { api, fetch })('GET', '/accounts?per_page=50'));
  return { accounts: list.map(({ id, name }) => ({ id, name })) };
}

// ── names ───────────────────────────────────────────────────────────────────

/** The account's R2 buckets, or null when R2 is off. Any other failure throws. */
async function r2Buckets(cf, account) {
  try {
    return (await cf('GET', `/accounts/${account}/r2/buckets?per_page=1000`)).buckets ?? [];
  } catch (error) {
    if (error instanceof CloudflareError && (error.codes.includes(R2_OFF) || error.messages.some((m) => /enable R2/i.test(m)))) return null;
    throw error;
  }
}

/** Each name one base takes, by kind. */
const nameList = (base) => {
  const n = namesFor(base);
  return [
    { kind: 'worker', name: n.worker },
    { kind: 'worker', name: n.staging },
    { kind: 'database', name: n.db },
    { kind: 'database', name: n.stagingDb },
    { kind: 'database', name: n.memory },
    { kind: 'bucket', name: n.memory },
    { kind: 'token', name: n.deploy },
  ];
};

/**
 * Derives the names from the repo, and reports each as free, ours (this repo provisioned it), or taken.
 * `base` is the repo's own base on a rerun, else the first base with every name free.
 */
export async function names({ token, api, fetch, account, repo, dir = '.', exec = run }) {
  const cf = cloudflare(token, { api, fetch });
  const derived = safeName(String(repo).split('/').at(-1));
  const recorded = await recordedBase(dir, exec);
  const existing = await step('cloudflare', async () => {
    const [workers, databases, tokens, buckets] = await Promise.all([
      cf('GET', `/accounts/${account}/workers/scripts`),
      cf('GET', `/accounts/${account}/d1/database?per_page=1000`),
      cf('GET', `/accounts/${account}/tokens?per_page=100`),
      r2Buckets(cf, account),
    ]);
    return {
      worker: new Set(workers.map((w) => w.id)),
      database: new Set(databases.map((d) => d.name)),
      token: new Set(tokens.map((t) => t.name)),
      bucket: new Set((buckets ?? []).map((b) => b.name)),
    };
  });
  const check = (base, ours) => nameList(base).map((item) => ({ ...item, status: existing[item.kind].has(item.name) ? (ours ? 'ours' : 'taken') : 'free' }));
  if (recorded) return { derived, base: recorded, names: namesFor(recorded), checked: check(recorded, true) };
  const checked = check(derived, false);
  let base = derived;
  for (let n = 2; check(base, false).some((item) => item.status === 'taken'); n++) base = `${derived}-${n}`;
  return { derived, base, names: namesFor(base), checked };
}

// ── provision ───────────────────────────────────────────────────────────────

/** The database called `name`, made when it does not exist. Returns its id. */
async function database(cf, account, name, note) {
  const found = (await cf('GET', `/accounts/${account}/d1/database?name=${encodeURIComponent(name)}`)).find((d) => d.name === name);
  note(found ? 'reused' : 'created', `database ${name}`);
  return found ? found.uuid : (await cf('POST', `/accounts/${account}/d1/database`, { name })).uuid;
}

/** The account's workers.dev subdomain; an account with none gets one named for the GitHub owner. */
async function subdomain(cf, account, owner, note) {
  const current = await cf('GET', `/accounts/${account}/workers/subdomain`).catch((error) => {
    if (error instanceof CloudflareError && error.status === 404) return {};
    throw error;
  });
  if (current.subdomain) return current.subdomain;
  const slug = safeName(owner);
  for (let n = 1; ; n++) {
    try {
      const made = (await cf('PUT', `/accounts/${account}/workers/subdomain`, { subdomain: n === 1 ? slug : `${slug}-${n}` })).subdomain;
      note('created', `workers.dev subdomain ${made}`);
      return made;
    } catch (error) {
      if (n === 5) throw error;
    }
  }
}

/** The `jsonc` block under the `wrangler.jsonc` heading of the stack pack's fragments. */
export function wranglerFragment(file = FRAGMENTS) {
  const text = readFileSync(file, 'utf8');
  const block = /^## `wrangler\.jsonc`[^\n]*\n[\s\S]*?```jsonc\n([\s\S]*?)```/m.exec(text);
  if (!block) throw new ProvisionError('repo', `${file} has no wrangler.jsonc fragment`);
  return block[1];
}

/** Drops the lines from the one matching `from` through the first after it matching `to`. */
function dropLines(text, from, to) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => from.test(line));
  if (start < 0) return text;
  const end = lines.findIndex((line, i) => i >= start && to.test(line));
  lines.splice(start, end - start + 1);
  return lines.join('\n');
}

/**
 * The app's wrangler config: the fragment, its comments kept, with every placeholder filled. The bucket
 * binding stays only with a bucket, and staging's cron override goes, since production declares no crons.
 */
export function wranglerConfig({ base, ids, bucket, today, access }, fragment = wranglerFragment()) {
  const n = namesFor(base);
  let text = fragment;
  if (!bucket) text = dropLines(text, /\/\/ Only when the memory store has a bucket/, /^\s*\],?\s*$/);
  text = dropLines(text, /\/\/ Only if production declares crons/, /"triggers"/);
  text = text.replace(/,(\s*\n\s*[}\]])/g, '$1');
  const fill = {
    '<your-worker>': n.worker,
    '<today, YYYY-MM-DD>': today,
    '<your-db-name>': n.db,
    '<production database_id>': ids.db,
    '<staging database_id>': ids.stagingDb,
    '<memory database_id>': ids.memory,
    '<your-repo>': base,
    '<access team domain>': access?.teamDomain ?? '',
    '<access audience>': access?.audience ?? '',
    '<access app id>': access?.appId ?? '',
    '<production Worker id>': access?.workers?.[0]?.id ?? '',
    '<staging Worker id>': access?.workers?.[1]?.id ?? '',
  };
  for (const [placeholder, value] of Object.entries(fill)) text = text.replaceAll(placeholder, value);
  const left = /<[^<>\n]+>/.exec(text);
  if (left) throw new ProvisionError('repo', `the wrangler fragment has a placeholder this script does not fill: ${left[0]}`);
  return text.endsWith('\n') ? text : `${text}\n`;
}

/** Adds the bucket binding before the top-level `env` key of an existing config. False when there is none. */
function addBucketBinding(file, bucket) {
  const text = readFileSync(file, 'utf8');
  const env = /^([ \t]+)"env"\s*:/m.exec(text);
  if (!env) return false;
  const indent = env[1];
  const unit = indent.startsWith('\t') ? '\t' : indent;
  const block = `${indent}"r2_buckets": [\n${indent}${unit}{ "binding": "MEMORY_BUCKET", "bucket_name": "${bucket}" }\n${indent}],\n`;
  writeFileSync(file, text.slice(0, env.index) + block + text.slice(env.index));
  return true;
}

/** The two `db:migrate:*` scripts, filled with the literal database names, after `build:app`. */
function migrateScripts(dir, n, note) {
  const file = join(dir, 'app', 'package.json');
  const pkg = readJson(file);
  if (!pkg) return;
  const scripts = {
    'db:migrate:staging': `wrangler d1 migrations apply ${n.stagingDb} --remote --env staging`,
    'db:migrate:prod': `wrangler d1 migrations apply ${n.db} --remote`,
  };
  if (Object.entries(scripts).every(([key, value]) => pkg.scripts?.[key] === value)) return;
  const entries = Object.entries(pkg.scripts ?? {}).filter(([key]) => !(key in scripts));
  const at = entries.findIndex(([key]) => key === 'build:app') + 1 || entries.length;
  entries.splice(at, 0, ...Object.entries(scripts));
  pkg.scripts = Object.fromEntries(entries);
  writeJson(file, pkg);
  note('updated', 'app/package.json db:migrate scripts');
}

/** Merges `components.memory` into the install record, writing only on a change. */
function recordMemory(dir, memory, note) {
  const file = recordFile(dir);
  const record = readJson(file, {});
  const next = { ...record, components: { ...record.components, memory: { ...record.components?.memory, ...memory } } };
  if (JSON.stringify(next) === JSON.stringify(record)) return;
  writeJson(file, next);
  note('updated', '.claude/.wong-stack.json components.memory');
}

/** One allow policy on this account alone, with the named groups. */
const accountPolicy = (account, groups, rows) => [
  {
    effect: 'allow',
    resources: { [`com.cloudflare.api.account.${account}`]: '*' },
    permission_groups: rows.map((row) => {
      const group = findGroup(groups, row);
      if (!group) throw new ProvisionError('token', `Cloudflare lists no ${row.scope} permission group named ${row.name}`);
      return { id: group.id };
    }),
  },
];

/**
 * The CI deploy token: made when missing, given any group it lacks, and its value rolled into the GitHub
 * secret when the secret is missing. The value goes straight to `gh` on stdin.
 */
async function deployToken(cf, account, name, rows, groups, { secretSet, setSecret, note }) {
  const base = `/accounts/${account}/tokens`;
  const policies = accountPolicy(account, groups, rows);
  const found = (await cf('GET', `${base}?per_page=100`)).find((t) => t.name === name);
  if (!found) {
    await setSecret((await cf('POST', base, { name, policies })).value);
    note('created', `deploy token ${name}`);
    return;
  }
  const current = await cf('GET', `${base}/${found.id}`);
  const have = new Set(current.policies.flatMap((p) => p.permission_groups.map((g) => g.id)));
  const lacking = policies[0].permission_groups.filter((g) => !have.has(g.id));
  if (lacking.length) {
    const kept = current.policies.map((p, i) => (i === 0 ? { ...p, permission_groups: [...p.permission_groups, ...lacking] } : p));
    await cf('PUT', `${base}/${found.id}`, { name: current.name, status: current.status, policies: kept, ...(current.condition && { condition: current.condition }) });
    note('updated', `deploy token ${name}: ${rows.filter((row) => lacking.some((g) => g.id === findGroup(groups, row).id)).map((row) => row.name).join(', ')}`);
  }
  if (secretSet) return note('reused', `deploy token ${name}`);
  await setSecret(await cf('PUT', `${base}/${found.id}/value`, {}));
  note('updated', `deploy token ${name}: new value sent to GitHub`);
}

const hasKey = (env) => (env.CLOUDFLARE_MEMORY_TOKEN ?? '').startsWith('wongm_');

/**
 * Everything after the one billable ask, under `base`: the memory store (R2 check, database, bucket),
 * the subdomain, the record's `components.memory`, the memory schema, the admin key, both app databases,
 * the config, and the deploy token in the GitHub secret. `keepConfig` leaves an installed repo's
 * committed files as they are, and adds no new bucket they would need.
 */
export async function provision({ token, api, fetch, account, repo, base, ownerEmail, teammateEmails, dir = '.', today = isoDate(), keepConfig = false, sleep = wait, exec = run, env = process.env }) {
  const cf = cloudflare(token, { api, fetch });
  const n = namesFor(base);
  const report = { base, names: n, r2: false, created: [], reused: [], updated: [], todo: [] };
  const note = (list, what) => report[list].push(what);
  const git = (args) => exec('git', ['-C', dir, ...args], { env });
  const envFile = durableEnv(dir);
  const needsKey = !hasKey(readEnv(envFile));
  const email = needsKey ? (await git(['config', 'user.email']).catch(() => ({ stdout: '' }))).stdout.trim() : null;
  if (needsKey && !email) throw new ProvisionError('repo', 'git has no user.email here, and the admin memory key is made for it; set it with `git config --global user.email <your email>` and run again');
  const loginEmail = ownerIdentity(ownerEmail ?? email ?? (await git(['config', 'user.email']).catch(() => ({ stdout: '' }))).stdout);
  const provisionStateFile = await stateFile(dir, exec);
  const state = readJson(provisionStateFile, {});
  if (state.account && (state.account !== account || state.repo !== repo || state.base !== base)) {
    throw new ProvisionError('access', 'private provisioning state belongs to another account or repository');
  }
  Object.assign(state, { base, account, repo });
  const checkpoint = () => writeJson(provisionStateFile, state);
  await step('repo', checkpoint);

  report.access = await accessOrganization(cf, { account, base, note });
  report.access.ownerEmail = loginEmail;
  report.access.humanLogin = 'unverified';
  const groups = await step('cloudflare', () => cf('GET', '/user/tokens/permission_groups?per_page=1000'));
  const recordedBucket = readJson(recordFile(dir))?.components?.memory?.bucket ?? null;

  // The memory store: is R2 on, the database, then the bucket.
  const buckets = await step('cloudflare', () => r2Buckets(cf, account));
  report.r2 = buckets !== null;
  const memoryId = await step('cloudflare', () => database(cf, account, n.memory, note));
  let bucket = null;
  if (buckets && (!keepConfig || recordedBucket)) {
    bucket = n.memory;
    if (buckets.some((b) => b.name === bucket)) note('reused', `bucket ${bucket}`);
    else {
      await step('cloudflare', () => cf('POST', `/accounts/${account}/r2/buckets`, { name: bucket }));
      note('created', `bucket ${bucket}`);
    }
  }
  const sub = await step('cloudflare', () => subdomain(cf, account, String(repo).split('/')[0], note));
  Object.assign(report.access, await provisionAccess(cf, {
    account, repo, base, names: n, subdomain: sub, state, checkpoint, note, today,
    adoptExisting: readJson(recordFile(dir))?.components?.memory?.accountId === account
      && readJson(recordFile(dir))?.components?.memory?.worker === `https://${n.worker}.${sub}.workers.dev/_memory`,
  }));
  await step('repo', () => exec('git', ['-C', dirname(envFile), 'check-ignore', '-q', '.env'], { env }));
  report.access = await provisionAccessPolicies(cf, {
    account, ownerEmail: loginEmail, teammateEmails, access: report.access, state, checkpoint, note,
    credentials: readEnv(envFile),
    saveCredentials: async ({ client_id, client_secret }) => {
      if (![client_id, client_secret].every(value => typeof value === 'string' && /^[a-zA-Z0-9_.=-]+$/.test(value))) {
        throw new ProvisionError('access', 'Cloudflare did not return safe verification credentials; run private setup again');
      }
      for (const file of new Set([envFile, join(dir, '.env')])) {
        await step('repo', () => exec('git', ['-C', dirname(file), 'check-ignore', '-q', '.env'], { env }));
        let text = existsSync(file) ? readFileSync(file, 'utf8') : '';
        for (const [key, value] of Object.entries({ CF_ACCESS_CLIENT_ID: client_id, CF_ACCESS_CLIENT_SECRET: client_secret })) {
          text = text.split('\n').filter(line => !new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line)).join('\n');
          text = `${text}${text && !text.endsWith('\n') ? '\n' : ''}${key}=${value}\n`;
        }
        writeFileSync(file, text, { mode: 0o600 });
        chmodSync(file, 0o600);
      }
    },
  });
  if (!keepConfig) {
    const record = readJson(recordFile(dir), {});
    if (!isDeepStrictEqual(record.components?.access, report.access)) {
      writeJson(recordFile(dir), { ...record, components: { ...record.components, access: report.access } });
      note('updated', '.claude/.wong-stack.json components.access');
    }
  }
  const worker = `https://${n.worker}.${sub}.workers.dev/_memory`;
  recordMemory(dir, { accountId: account, databaseId: memoryId, database: n.memory, bucket, worker }, note);

  // The schema, retried while a new database or a widened token takes effect, then the admin key.
  const memory = join(dir, '.claude', 'skills', 'memory', 'scripts', 'memory.mjs');
  const admin = { cwd: dir, env: { ...env, CLOUDFLARE_API_TOKEN: token } };
  await step('cloudflare', () => retry(() => exec('node', [memory, 'migrate'], admin), sleep, () => true));
  if (needsKey) {
    await step('cloudflare', () => exec('node', [memory, 'member', 'admin'], admin));
    note('created', `admin memory key for ${email}, in .env`);
  } else note('reused', 'admin memory key in .env');

  // The app's databases and config.
  const db = await step('cloudflare', () => database(cf, account, n.db, note));
  const stagingDb = await step('cloudflare', () => database(cf, account, n.stagingDb, note));
  const config = join(dir, 'app', 'wrangler.jsonc');
  if (!keepConfig) {
    if (!existsSync(config)) {
      writeFileSync(config, wranglerConfig({ base, ids: { db, stagingDb, memory: memoryId }, bucket, today, access: report.access }));
      note('created', 'app/wrangler.jsonc');
    } else if (bucket && !readFileSync(config, 'utf8').includes('MEMORY_BUCKET')) {
      if (addBucketBinding(config, bucket)) note('updated', 'app/wrangler.jsonc MEMORY_BUCKET');
      else report.todo.push(`add MEMORY_BUCKET for ${bucket} to app/wrangler.jsonc`);
    }
    migrateScripts(dir, n, note);
  }

  // The deploy token and the two GitHub secrets.
  const gh = (args, input) => exec('gh', [...args, '-R', repo], { cwd: dir, env, input });
  const secrets = (await step('cloudflare', () => gh(['secret', 'list']))).stdout;
  const listed = (name) => new RegExp(`^${name}\\s`, 'm').test(secrets);
  const rows = DEPLOY_TOKEN.filter((row) => row.when === 'always' || (row.when === 'bucket' && bucket));
  await step('cloudflare', () =>
    deployToken(cf, account, n.deploy, rows, groups, {
      secretSet: listed('CLOUDFLARE_API_TOKEN'),
      setSecret: (value) => gh(['secret', 'set', 'CLOUDFLARE_API_TOKEN'], value),
      note,
    }),
  );
  if (!listed('CLOUDFLARE_ACCOUNT_ID')) {
    await step('cloudflare', () => gh(['secret', 'set', 'CLOUDFLARE_ACCOUNT_ID'], account));
    note('created', 'GitHub secret CLOUDFLARE_ACCOUNT_ID');
  }

  report.memory = { database: n.memory, bucket, worker };
  report.urls = { production: `https://${n.worker}.${sub}.workers.dev`, previews: `https://<branch>-${n.staging}.${sub}.workers.dev` };
  return report;
}

// ── the command line ────────────────────────────────────────────────────────

const USAGE = `usage: provision.mjs <command> [--dir <repo>] [--account <id>]
  widen                                   grant the token a normal provision's groups, then wait until they work
  accounts                                list the accounts the token sees
  names --repo <owner/name>               derive the names; report each as free, ours, or taken, and the first free base
  provision --repo <owner/name> --base <base> [--owner-email <email>] [--keep-config]
                                          make or reuse the memory store, databases, config, and deploy token
--dir is the target repo (default: here). The token is CLOUDFLARE_API_TOKEN and the account CLOUDFLARE_ACCOUNT_ID,
from the environment or the target's .env. Each command prints one JSON report, never a token.`;

const NEEDS = { widen: [], accounts: [], names: ['account', 'repo'], provision: ['account', 'repo', 'base'] };

/** Runs one command and returns the exit code: 0 done, 1 stopped (with a JSON reason), 2 usage. */
export async function cli(argv, { env = process.env, out = console.log, err = console.error, fetch, sleep } = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { dir: { type: 'string' }, account: { type: 'string' }, repo: { type: 'string' }, base: { type: 'string' }, 'owner-email': { type: 'string' }, 'keep-config': { type: 'boolean' }, help: { type: 'boolean' } },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    err(`${error.message}\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    out(USAGE);
    return 0;
  }
  const [command, ...extra] = positionals;
  if (!(command in NEEDS) || extra.length) {
    err(command ? `unknown command: ${[command, ...extra].join(' ')}\n${USAGE}` : USAGE);
    return 2;
  }
  const dir = resolve(values.dir ?? '.');
  const fileEnv = readEnv(join(dir, '.env'));
  const token = env.CLOUDFLARE_API_TOKEN || fileEnv.CLOUDFLARE_API_TOKEN;
  const options = { ...values, account: values.account || env.CLOUDFLARE_ACCOUNT_ID || fileEnv.CLOUDFLARE_ACCOUNT_ID };
  const missing = NEEDS[command].filter((key) => !options[key]);
  if (missing.length) {
    err(`${command} needs ${missing.map((key) => `--${key}`).join(' and ')}\n${USAGE}`);
    return 2;
  }
  const stop = (reason, cause) => {
    out(JSON.stringify({ error: { reason, cause } }, null, 2));
    err(`provision: ${cause}`);
    return 1;
  };
  if (!token) return stop('token', 'CLOUDFLARE_API_TOKEN is not set in the environment or the target .env');
  if (options.account && !ACCOUNT.test(options.account)) return stop('token', 'the account id is not 32 hex characters');
  const common = { token, api: env.WONG_CLOUDFLARE_API, fetch, account: options.account, repo: options.repo, dir, env, ...(sleep && { sleep }) };
  const commands = {
    widen: () => widen(common),
    accounts: () => accounts(common),
    names: () => names(common),
    provision: () => provision({ ...common, base: safeName(options.base), ownerEmail: values['owner-email'], keepConfig: Boolean(values['keep-config']) }),
  };
  try {
    out(JSON.stringify(await commands[command](), null, 2));
    return 0;
  } catch (error) {
    return stop(error.reason ?? 'cloudflare', error.message);
  }
}

if (isMain(import.meta.url)) process.exitCode = await cli(process.argv.slice(2));
