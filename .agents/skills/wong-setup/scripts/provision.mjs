#!/usr/bin/env node
// Cloudflare provisioning for a WongStack repo: the one set of steps setup's runbook
// (references/cloudflare.md) runs.
//
//     node provision.mjs widen | accounts | plan | names --repo <owner/name> | provision --repo <owner/name> --base <base> | access
//
// `--route artifacts` on widen, names and provision is the install with no GitHub: its repository and
// check runner live in the person's own Cloudflare account (wiki/stack/artifacts-route.md).
//
// Each command prints one JSON report and never a token. The token is CLOUDFLARE_API_TOKEN, from the
// environment or the target's .env. WONG_CLOUDFLARE_API points every call at another API base, for tests.
// Every step checks before it acts, so a run that stopped runs again from the top.
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { machineId, machineIdFile } from '../../memory/scripts/lib/machine-id.mjs';
import { keyMachine, parseEnv } from '../../memory/scripts/lib/store.mjs';
import { AccessSetupError, accessOrganization, cloudflareReadKey, loginManagementKey, ownerIdentity, provisionAccess, provisionAccessPolicies } from './private-access.mjs';
import { helperConfig } from '../../save/scripts/artifacts-credential.mjs';
import {
  CloudflareError, PROPAGATION, ProvisionError, ROUTINES_PROVISION, accountPolicy, cloudflare, durableEnv, fillConfig, grant, installRunner, orNull, paidPlan, pending,
  readJson, recordComponent, recordFile, recordedBase, retry, run, scopedToken, stateFile, step, wait, widenBy, workerSecrets, writeJson,
} from '../../routine/scripts/lib/cloudflare.mjs';
import { privateDeployment } from '../../../../scripts/lib-access-config.mjs';
import { parseConfig } from '../../../../scripts/lib-wrangler-config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAGMENTS = join(HERE, '..', '..', 'wong-sync', 'references', 'stack-pack-fragments.md');
/** The one Artifacts namespace every install in an account shares: Cloudflare can not delete a namespace. */
export const NAMESPACE = 'wongstack';
/** Days a check run's snapshot stays in the runner's bucket before the bucket's own rule deletes it. */
export const SNAPSHOT_DAYS = 2;
const ACCOUNT = /^[0-9a-f]{32}$/;
/** The error Cloudflare returns for an R2 call on an account with no R2 subscription. */
export const R2_OFF = 10042;
// The steps the check runner and the routine runner share live in the routine skill, which every
// project has; they are exported from here too, where setup's callers and tests find them.
export { CloudflareError, PROPAGATION, ProvisionError, ROUTINES_PROVISION, cloudflare, run, widenBy };
const isoDate = () => new Date().toISOString().slice(0, 10);

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
/** The live app's sign-in list key: Access policy writes on this one account, and nothing the deploy token holds. */
export const ACCESS_KEY = [{ name: 'Access: Apps and Policies Write', scope: 'account', id: '1e13c5124ca64b72b1969a67e8829049' }];
const KEY_LINK_STEP = 'because the saved Cloudflare token can not make keys: send the private key link (wiki/development/secrets.md#receive-a-key-through-a-private-link) for a Cloudflare token with Account API Tokens Write, then run `provision.mjs access`';
/** The to-do a report carries when the token could not make that key. Access still opens and saves app choices. */
export const ACCESS_KEY_TODO = `the live app has no key for its sign-in list, ${KEY_LINK_STEP}`;
/**
 * The app's read-only key for Cloudflare look-ups. An allow-list on purpose: a group joins only by being
 * named here, so no Write group and no product that stores data (D1, KV, R2, Queues, Vectorize,
 * Hyperdrive, Durable Objects, Secrets Store, Stream, Images) is ever in it.
 */
export const CLOUDFLARE_READ_KEY = [
  { name: 'Account Settings Read', scope: 'account', id: 'c1fde68c7bcc44588cbb6ddbc16d6480' },
  { name: 'Workers Scripts Read', scope: 'account', id: '1a71c399035b4950a1bd1466bbe4f420' },
  { name: 'Workers Tail Read', scope: 'account', id: '05880cd1bdc24d8bae0be2136972816b' },
  { name: 'Workers CI Read', scope: 'account', id: 'ad99c5ae555e45c4bef5bdf2678388ba' },
  { name: 'Account Analytics Read', scope: 'account', id: 'b89a480218d04ceb98b4fe57ca29dc1f' },
  { name: 'Access: Apps and Policies Read', scope: 'account', id: '7ea222f6d5064cfa89ea366d7c1fee89' },
  { name: 'Access: Audit Logs Read', scope: 'account', id: 'b05b28e839c54467a7d6cba5d3abb5a3' },
  { name: 'Billing Read', scope: 'account', id: '7cf72faf220841aabcfdfab81c43c4f6' },
  { name: 'Zone Read', scope: 'zone', id: 'c8fed203ed3043cba015a93ad1616f1f' },
  { name: 'DNS Read', scope: 'zone', id: '82e64a83756745bbbb1c9c2701bf816b' },
  { name: 'Analytics Read', scope: 'zone', id: '9c88f9c5bce24ce7af9a958ba9c504db' },
];
/** The to-do a report carries when the token could not make that key. Everything else in Access still works. */
export const CLOUDFLARE_READ_KEY_TODO = `the app has no read-only Cloudflare key for look-ups, ${KEY_LINK_STEP}`;

/** The steps the owner follows on GitHub for the key that lets the app hand the project out. */
export const CODE_KEY = {
  name: 'WONG_CODE_READ',
  url: 'https://github.com/settings/personal-access-tokens/new',
  steps: (repository) => [
    `Repository access: Only select repositories, then pick ${repository}`,
    'Permissions: Repository permissions, Contents, Read-only',
    'Add no other permission',
    'Expiration: No expiration, or renew it before it ends',
    'Tap Generate token and copy it',
  ],
};

/** What an Artifacts install adds to the widen: its repository, its check runner, and the read that sees the plan. */
export const ARTIFACTS_PROVISION = [
  { name: 'Artifacts Write', scope: 'account', id: 'f9e1ba803b8d4d52b4d4184825b07a28' },
  { name: 'Workers Containers Write', scope: 'account', id: 'bdbcd690c763475a985e8641dddc09f7' },
  { name: 'Billing Read', scope: 'account', id: '7cf72faf220841aabcfdfab81c43c4f6' },
];
/** The check runner's storage key: the objects of its one bucket, and nothing else. */
export const STORAGE_TOKEN = { name: 'Workers R2 Storage Bucket Item Write', scope: 'com.cloudflare.edge.r2.bucket', id: '2efd5506f9c8494dacb1fa10a3e7d5b6' };

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

/** Every name one base takes. The memory store's database and bucket share a name. */
export const namesFor = (base) => ({
  worker: base,
  staging: `${base}-staging`,
  db: `${base}-db`,
  stagingDb: `${base}-db-staging`,
  memory: `${base}-memory`,
  deploy: `${base}-deploy`,
});

/** What an Artifacts install adds under one base: its repository, its check runner (Worker, Workflow, bucket), and the runner's storage key. */
export const artifactNamesFor = (base) => ({ repo: base, runner: `${base}-checks`, storage: `${base}-checks-storage` });

// ── the widen ───────────────────────────────────────────────────────────────

/**
 * The token grants itself a normal provision's groups, keeping its own two, its `resources`, and its
 * condition, then waits until the new set works on `account`, or on every account it sees.
 * `openWithoutLogin`, for a caller that finishes open when Zero Trust needs onboarding: an Access probe
 * still refused after the full wait goes in `accessPending` instead of stopping, and the later ones get
 * one try each, since that wait already covered propagation; provision's Zero Trust step then decides.
 */
export async function widen({ token, api, fetch, account, route = 'github', openWithoutLogin = false, sleep = wait }) {
  const cf = cloudflare(token, { api, fetch });
  const { granted, held } = await grant(cf, [...USER_GRANTS, ...NORMAL_PROVISION, ...(route === 'artifacts' ? ARTIFACTS_PROVISION : [])]);
  const probed = account ? [account] : (await step('cloudflare', () => cf('GET', '/accounts?per_page=50'))).map((each) => each.id);
  const accessPending = [];
  for (const id of probed) {
    await step('cloudflare', () => retry(() => cf('GET', `/accounts/${id}/d1/database?per_page=1`), sleep, pending));
    // Artifacts and Containers answer only on a paid account, so the plan read is the one probe here.
    if (route === 'artifacts') await step('cloudflare', () => retry(() => cf('GET', `/accounts/${id}/subscriptions`), sleep, pending));
    for (const surface of ['apps', 'identity_providers', 'service_tokens']) {
      const probe = () => cf('GET', `/accounts/${id}/access/${surface}?per_page=1`);
      await step('cloudflare', async () => {
        try {
          await (accessPending.length ? probe() : retry(probe, sleep, pending));
        } catch (error) {
          if (!openWithoutLogin || !pending(error)) throw error;
          if (!accessPending.includes(surface)) accessPending.push(surface);
        }
      });
    }
  }
  return {
    granted,
    held,
    probed,
    ...(openWithoutLogin && { accessPending }),
  };
}

/** The accounts the token sees. Zero with a valid token means Account Resources was left unset. */
export async function accounts({ token, api, fetch }) {
  const list = await step('token', () => cloudflare(token, { api, fetch })('GET', '/accounts?per_page=50'));
  return { accounts: list.map(({ id, name }) => ({ id, name })) };
}

// ── the plan ────────────────────────────────────────────────────────────────

/**
 * Which route a new install takes, before anything is created: `artifacts` on Mac or Linux with the
 * paid plan seen, else `github` with the reason. Anything but a seen paid plan counts as not paid.
 */
export async function plan({ token, api, fetch, account, platform = process.platform, sleep = wait }) {
  if (platform === 'win32') return { route: 'github', reason: 'windows' };
  const seen = await step('cloudflare', () => paidPlan(cloudflare(token, { api, fetch }), account, sleep));
  return seen ? { route: 'artifacts', plan: seen } : { route: 'github', reason: 'free-plan', needs: 'Workers Paid', cost: 'about $5 a month' };
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

/** The names an Artifacts install adds under one base, by kind. */
const artifactNameList = (base) => {
  const a = artifactNamesFor(base);
  return [
    { kind: 'repository', name: a.repo },
    { kind: 'worker', name: a.runner },
    { kind: 'bucket', name: a.runner },
    { kind: 'token', name: a.storage },
  ];
};

/** The install's Artifacts repositories by name; none when the shared namespace does not exist yet. */
async function repositories(cf, account) {
  try {
    return await cf('GET', `/accounts/${account}/artifacts/namespaces/${NAMESPACE}/repos?limit=200`);
  } catch (error) {
    if (error instanceof CloudflareError && error.status === 404) return [];
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
export async function names({ token, api, fetch, account, repo, route = 'github', dir = '.', exec = run }) {
  const cf = cloudflare(token, { api, fetch });
  const artifacts = route === 'artifacts';
  const all = (base) => [...nameList(base), ...(artifacts ? artifactNameList(base) : [])];
  const named = (base) => ({ ...namesFor(base), ...(artifacts && artifactNamesFor(base)) });
  const derived = safeName(String(repo).split('/').at(-1));
  const recorded = await recordedBase(dir, exec);
  const existing = await step('cloudflare', async () => {
    const [workers, databases, tokens, buckets, repos] = await Promise.all([
      cf('GET', `/accounts/${account}/workers/scripts`),
      cf('GET', `/accounts/${account}/d1/database?per_page=1000`),
      cf('GET', `/accounts/${account}/tokens?per_page=100`),
      r2Buckets(cf, account),
      artifacts ? repositories(cf, account) : [],
    ]);
    return {
      repository: new Set(repos.map((r) => r.name)),
      worker: new Set(workers.map((w) => w.id)),
      database: new Set(databases.map((d) => d.name)),
      token: new Set(tokens.map((t) => t.name)),
      bucket: new Set((buckets ?? []).map((b) => b.name)),
    };
  });
  const check = (base, ours) => all(base).map((item) => ({ ...item, status: existing[item.kind].has(item.name) ? (ours ? 'ours' : 'taken') : 'free' }));
  if (recorded) return { derived, base: recorded, names: named(recorded), checked: check(recorded, true) };
  const checked = check(derived, false);
  let base = derived;
  for (let n = 2; check(base, false).some((item) => item.status === 'taken'); n++) base = `${derived}-${n}`;
  return { derived, base, names: named(base), checked };
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
 * An open `access` (no Zero Trust yet) leaves the Access ids blank and adds `WORKSPACE_LOGIN: "off"` to
 * production's and staging's vars: the committed switch the Worker and the deploy check both read.
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
    // The owner Access knows. An open site has no sign-in to know anyone by, so it stays blank there.
    '<owner email>': access?.mode === 'open' ? '' : (access?.ownerEmail ?? ''),
  };
  for (const [placeholder, value] of Object.entries(fill)) text = text.replaceAll(placeholder, value);
  if (access?.mode === 'open') text = text.replace(/^(\s*)"WONG_ENVIRONMENT": "(production|staging)",[ \t]*$/gm, '$&\n$1"WORKSPACE_LOGIN": "off",');
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

/**
 * Turns an open config private in place, keeping its comments: fills the four `CF_ACCESS_*` vars, production's
 * then staging's, and drops `WORKSPACE_LOGIN`. Restores the file and returns false when the result doesn't
 * parse to exactly the private config `access` describes.
 */
function closeOpenConfig(file, access) {
  const before = readFileSync(file, 'utf8');
  const values = {
    CF_ACCESS_TEAM_DOMAIN: [access.teamDomain, access.teamDomain],
    CF_ACCESS_AUD: [access.audience, access.audience],
    CF_ACCESS_APP_ID: [access.appId, access.appId],
    CF_ACCESS_WORKER_ID: [access.workers?.[0]?.id, access.workers?.[1]?.id],
  };
  let text = before.replace(/^[ \t]*"WORKSPACE_LOGIN"\s*:\s*"[^"\n]*",?[ \t]*\n/gm, '');
  for (const [key, [production, staging]] of Object.entries(values)) {
    let seen = 0;
    text = text.replace(new RegExp(`("${key}"\\s*:\\s*)"[^"\\n]*"`, 'g'), (_, head) => `${head}"${[production, staging][seen++] ?? ''}"`);
    if (seen !== 2) return false;
  }
  writeFileSync(file, text);
  try {
    const config = parseConfig(file);
    const [production, staging] = ['production', 'staging'].map((environment) => privateDeployment(config, environment));
    const expected = (deployment, worker) => deployment.appId === access.appId && deployment.audience === access.audience && deployment.teamDomain === access.teamDomain && deployment.workerId === worker?.id;
    if (expected(production, access.workers?.[0]) && expected(staging, access.workers?.[1])) return true;
  } catch {
    // Falls through to restore the file.
  }
  writeFileSync(file, before);
  return false;
}

/**
 * Sets one text var in production's and staging's vars of an existing config, in place, comments kept:
 * a value already there is replaced, else the line goes after `WONG_ENVIRONMENT`. Returns `updated`,
 * `current`, or false when the config has neither place twice.
 */
function setVar(file, name, value) {
  const before = readFileSync(file, 'utf8');
  let seen = 0;
  const count = (text) => {
    seen++;
    return text;
  };
  let text = before.replace(new RegExp(`("${name}"\\s*:\\s*)"[^"\\n]*"`, 'g'), (_, head) => count(`${head}"${value}"`));
  if (!seen) text = before.replace(/^([ \t]*)"WONG_ENVIRONMENT": "(?:production|staging)",[ \t]*$/gm, (line, indent) => count(`${line}\n${indent}"${name}": "${value}",`));
  if (seen !== 2) return false;
  if (text === before) return 'current';
  writeFileSync(file, text);
  return 'updated';
}
const setOwnerEmail = (file, email) => setVar(file, 'WONG_OWNER_EMAIL', email);

/** `owner/name` from a GitHub remote address, or null for any other address. */
export const githubRepo = (url) => /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9-]+\/[A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(String(url ?? '').trim())?.[1] ?? null;

/**
 * Binds production and staging to the account's Artifacts namespace in an existing config, in place, comments
 * kept, so the app can read its own repository with no key. Returns `updated`, `current`, or false, with the
 * file restored, when the config has no place for both.
 */
function addCodeBinding(file) {
  const bound = (config) => Boolean(config?.artifacts?.some((each) => each.binding === 'ARTIFACTS' && each.namespace === NAMESPACE));
  const both = () => {
    const config = parseConfig(file);
    return [bound(config), bound(config.env?.staging)];
  };
  const [production, staging] = both();
  if (production && staging) return 'current';
  const before = readFileSync(file, 'utf8');
  const line = `"artifacts": [{ "binding": "ARTIFACTS", "namespace": "${NAMESPACE}" }],`;
  let text = before;
  if (!production) text = text.replace(/^([ \t]+)"env"\s*:/m, (match, indent) => `${indent}// The project's own repository, which Connect your assistant hands out. wiki/stack/employee-project.md\n${indent}${line}\n${match}`);
  if (!staging) text = text.replace(/^([ \t]+)"staging"\s*:\s*\{[ \t]*$/m, (match, indent) => `${match}\n${indent}${indent.startsWith('\t') ? '\t' : indent.slice(indent.length / 2)}${line}`);
  writeFileSync(file, text);
  try {
    if (both().every(Boolean)) return 'updated';
  } catch {
    // Falls through to restore the file.
  }
  writeFileSync(file, before);
  return false;
}

/**
 * Tells the app which project Connect your assistant hands out: the name in both Workers' vars, and on a
 * project kept in Cloudflare the binding to its repository, so no key is made. On GitHub the read-only key is
 * the owner's one step: `ready` once both Workers hold it, else `missing` with the steps. It is no to-do: Access
 * asks for it when the owner first lets someone install the project. Changes nothing that is already right.
 */
async function projectCode(cf, { account, config, repository, artifacts, workers, note, todo }) {
  const named = repository && existsSync(config) ? setVar(config, 'WONG_CODE_REPOSITORY', repository) : false;
  if (named === 'updated') note('updated', 'app/wrangler.jsonc WONG_CODE_REPOSITORY');
  const bound = named && artifacts ? addCodeBinding(config) : false;
  if (bound === 'updated') note('updated', 'app/wrangler.jsonc ARTIFACTS');
  if (!named || (artifacts && !bound)) {
    todo.push(`add "WONG_CODE_REPOSITORY"${artifacts ? ` and the "artifacts" binding ARTIFACTS for the ${NAMESPACE} namespace` : ''} to production and staging in app/wrangler.jsonc, as wiki/stack/employee-project.md describes`);
    return { status: 'missing' };
  }
  if (artifacts) return { status: 'ready', kept: 'cloudflare', repository };
  const held = await Promise.all(workers.map((worker) => orNull(() => cf('GET', `/accounts/${account}/workers/scripts/${worker}/secrets`))));
  if (held.every((list) => list?.some((secret) => secret.name === CODE_KEY.name))) return { status: 'ready', kept: 'github', repository };
  return { status: 'missing', kept: 'github', repository, key: CODE_KEY.name, url: CODE_KEY.url, steps: CODE_KEY.steps(repository) };
}

/** Notes the owner email in an existing config, or leaves a to-do when the config has no place for it. */
function ownerEmailInConfig(config, email, { note, todo }) {
  const result = setOwnerEmail(config, email);
  if (result === 'updated') note('updated', 'app/wrangler.jsonc WONG_OWNER_EMAIL');
  if (!result) todo.push('add "WONG_OWNER_EMAIL" with the owner sign-in email to the production and staging vars in app/wrangler.jsonc');
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

/** The read-only key's record. `waiting` is replaced whole, so a Worker that has taken the key since is no longer listed. */
const recordReadKey = (dir, key, note) => recordComponent(dir, 'cloudflareReadKey', { waiting: undefined, ...key }, note);

/** The read-only key's two policies: its account groups on the account, its zone groups on every zone in it. */
const readKeyPolicies = (account, groups) => [
  ...accountPolicy(account, groups, CLOUDFLARE_READ_KEY.filter((row) => row.scope === 'account')),
  ...accountPolicy(account, groups, CLOUDFLARE_READ_KEY.filter((row) => row.scope === 'zone'), { 'com.cloudflare.api.account.zone.*': '*' }),
];

/**
 * The CI deploy token: made when missing, given any group it lacks, and its value rolled into the GitHub
 * secret when the secret is missing. The value goes straight to `gh` on stdin.
 */
const deployToken = scopedToken;

// ── the Artifacts route: the repository and its check runner ────────────────

/** The runner's Wrangler config: the pack's template with every placeholder filled, comments dropped. */
export function runnerConfig({ account, repo, runner }, template) {
  return fillConfig(template, { '<runner>': runner, '<account id>': account, '<namespace>': NAMESPACE, '<repo>': repo }, 'check runner');
}

/** The install's repository in the shared namespace, made when missing. A same-named one this install did not make stops. */
async function repository(cf, account, name, { state, checkpoint, note, sleep }) {
  const spaces = `/accounts/${account}/artifacts/namespaces`;
  if (!(await retry(() => orNull(() => cf('GET', `${spaces}/${NAMESPACE}`)), sleep, pending))) {
    await cf('POST', spaces, { namespace: NAMESPACE });
    note('created', `Artifacts namespace ${NAMESPACE}`);
  }
  const repos = `${spaces}/${NAMESPACE}/repos`;
  const found = await orNull(() => cf('GET', `${repos}/${name}`));
  const resumed = state.delivery?.creating === name;
  const ours = resumed || (found?.id !== undefined && state.delivery?.repoId === found.id);
  if (found && !ours) throw new ProvisionError('cloudflare', `this account already has a repository named ${name} that this install did not make; pick another name`);
  if (found && !resumed) note('reused', `repository ${name}`);
  else if (!found) {
    state.delivery = { creating: name };
    checkpoint();
  }
  const repo = found ?? (await cf('POST', repos, { name, default_branch: 'main', description: 'A WongStack install' }));
  if (!found || resumed) {
    // Creating a repository returns a ready-made token. Nothing keeps it, so it is revoked.
    for (const made of await cf('GET', `${repos}/${name}/tokens?state=active&per_page=100`)) await cf('DELETE', `${spaces}/${NAMESPACE}/tokens/${made.id}`);
    note('created', `repository ${name}`);
  }
  state.delivery = { repoId: repo.id };
  checkpoint();
  return repo.remote ?? `https://${account}.artifacts.cloudflare.net/git/${NAMESPACE}/${name}.git`;
}

/** The runner's bucket, made when missing, with the rule that deletes old snapshots. */
async function snapshotBucket(cf, account, name, buckets, note) {
  if (!buckets) throw new ProvisionError('cloudflare', 'the check runner keeps its working files in R2 storage, which is off on this account; turn R2 on, then run setup again');
  if (buckets.some((b) => b.name === name)) note('reused', `bucket ${name}`);
  else {
    await cf('POST', `/accounts/${account}/r2/buckets`, { name });
    note('created', `bucket ${name}`);
  }
  const rule = { id: 'delete-old-snapshots', enabled: true, conditions: { prefix: '' }, deleteObjectsTransition: { condition: { type: 'Age', maxAge: SNAPSHOT_DAYS * 86_400 } } };
  await cf('PUT', `/accounts/${account}/r2/buckets/${name}/lifecycle`, { rules: [rule] });
}

/**
 * The runner's storage key: an account token for the one bucket's objects. Its id and the SHA-256 of
 * its value are the pair R2 takes, and go straight into the runner's secrets.
 */
async function storageToken(cf, account, name, bucket, groups, { secretSet, setKeys, note }) {
  const group = groups.find((each) => each.name === STORAGE_TOKEN.name && each.scopes?.includes(STORAGE_TOKEN.scope));
  if (!group) throw new ProvisionError('token', `Cloudflare lists no permission group named ${STORAGE_TOKEN.name}`);
  const base = `/accounts/${account}/tokens`;
  const found = (await cf('GET', `${base}?per_page=100`)).find((t) => t.name === name);
  if (found && secretSet) return note('reused', `storage key ${name}`);
  const policies = [{ effect: 'allow', resources: { [`com.cloudflare.edge.r2.bucket.${account}_default_${bucket}`]: '*' }, permission_groups: [{ id: group.id }] }];
  const made = found ? { id: found.id, value: await cf('PUT', `${base}/${found.id}/value`, {}) } : await cf('POST', base, { name, policies });
  await setKeys(made.id, createHash('sha256').update(made.value).digest('hex'));
  note(found ? 'updated' : 'created', `storage key ${name}`);
}

/** Points `origin` at the repository and Git at the credential helper. An origin set elsewhere stops. */
async function gitRemote(git, account, remote) {
  const origin = (await git(['remote', 'get-url', 'origin']).catch(() => ({ stdout: '' }))).stdout.trim();
  if (origin && origin !== remote) throw new ProvisionError('repo', 'origin already points at another repository; this install keeps its repository in Cloudflare');
  if (!origin) await git(['remote', 'add', 'origin', remote]);
  for (const [key, value] of helperConfig(account)) await git(['config', '--replace-all', key, value]);
}

/**
 * Main's first commit, an empty one, so a first change has a main to be published onto. A folder
 * with no commit yet starts from it. Never touches a file or an existing commit.
 */
async function firstPush(git, note, todo) {
  let head = (await git(['ls-remote', 'origin', 'refs/heads/main'])).stdout.split(/\s/)[0];
  const born = await git(['rev-parse', '--verify', '--quiet', 'HEAD']).then(() => true, () => false);
  if (!head && born) return void todo.push('this folder already has commits: push its main to the new repository with `git push origin main`');
  if (!head) {
    const has = (key) => git(['config', key]).then(() => true, () => false);
    const who = [...((await has('user.name')) ? [] : ['-c', 'user.name=WongStack setup']), ...((await has('user.email')) ? [] : ['-c', 'user.email=setup@wongstack.invalid'])];
    const tree = (await git(['mktree'], '')).stdout.trim();
    head = (await git([...who, 'commit-tree', tree, '-m', 'Start the project'])).stdout.trim();
    await git(['push', 'origin', `${head}:refs/heads/main`]);
    note('created', 'the first, empty commit on main');
  }
  if (!born) {
    await git(['fetch', 'origin', 'main']);
    await git(['update-ref', 'HEAD', head]);
  }
}

/**
 * The Artifacts route's delivery, in place of the GitHub secrets: the repository, the runner's bucket,
 * `origin` and the credential helper, the check runner installed from the pack's own pinned tools and
 * deployed, its two keys as its secrets, the install record, and main's first commit. Safe to run again.
 */
async function artifactsDelivery(cf, { account, base, token, groups, buckets, deployRows, dir, env, exec, state, checkpoint, note, todo, sleep }) {
  const n = artifactNamesFor(base);
  const git = (args, input) => exec('git', ['-C', dir, ...args], { env, input });
  const remote = await step('cloudflare', () => repository(cf, account, n.repo, { state, checkpoint, note, sleep }));
  await step('cloudflare', () => snapshotBucket(cf, account, n.runner, buckets, note));
  recordComponent(dir, 'delivery', { route: 'artifacts', accountId: account, namespace: NAMESPACE, repo: n.repo, remote, runner: n.runner, workflow: n.runner, bucket: n.runner }, note);
  await step('repo', () => gitRemote(git, account, remote));

  const folder = join(dir, 'scripts', 'check-runner');
  const text = await step('repo', () => runnerConfig({ account, ...n }, readFileSync(join(folder, 'wrangler.template.jsonc'), 'utf8')));
  await installRunner({ folder, shown: 'scripts/check-runner', text, token, account, env, exec, note });
  note('updated', `check runner ${n.runner}`);

  const { held, put } = await workerSecrets(cf, account, n.runner);
  await step('cloudflare', () => deployToken(cf, account, namesFor(base).deploy, deployRows, groups, { secretSet: held.has('CF_TOKEN'), setSecret: (value) => put('CF_TOKEN', value), note, sentTo: 'the check runner' }));
  await step('cloudflare', () => storageToken(cf, account, n.storage, n.runner, groups, {
    secretSet: held.has('R2_ACCESS_KEY_ID') && held.has('R2_SECRET_ACCESS_KEY'),
    setKeys: async (id, secret) => {
      await put('R2_ACCESS_KEY_ID', id);
      await put('R2_SECRET_ACCESS_KEY', secret);
    },
    note,
  }));
  await step('repo', () => firstPush(git, note, todo));
  return { route: 'artifacts', remote, runner: n.runner, monthlyCost: 'about $5 a month for Cloudflare\'s paid plan; check runs beyond what the plan includes are billed by use', pullRequests: false };
}

const hasKey = (env, localId) => keyMachine(env.CLOUDFLARE_MEMORY_TOKEN) === localId;

/**
 * Everything after the one billable ask, under `base`: the memory store (R2 check, database, bucket),
 * the subdomain, the record's `components.memory`, the memory schema, the admin key, both app databases,
 * the config, the deploy token in the GitHub secret, the live app's key for its sign-in list, and both
 * Workers' read-only key for Cloudflare look-ups. `keepConfig` leaves an installed repo's
 * committed files as they are, and adds no new bucket they would need. `openWithoutLogin` lets a Zero
 * Trust organization Cloudflare refuses (onboarding, usually a card) record `access.mode: 'open'` and go
 * on without Access; a site already private never opens, and a rerun that gets the organization turns an
 * open config private.
 */
export async function provision({ token, api, fetch, account, repo, base, route = 'github', ownerEmail, teammateEmails, dir = '.', today = isoDate(), keepConfig = false, openWithoutLogin = false, sleep = wait, exec = run, env = process.env }) {
  const cf = cloudflare(token, { api, fetch });
  // An Artifacts install needs the paid plan: look before anything is created or written.
  if (route === 'artifacts' && !(await step('cloudflare', () => paidPlan(cf, account, sleep)))) {
    throw new ProvisionError('plan', 'this Cloudflare account is not on the Workers Paid plan (about $5 a month), which keeping the project in Cloudflare needs; turn it on, or set up with GitHub for free');
  }
  const n = namesFor(base);
  const report = { base, names: n, r2: false, created: [], reused: [], updated: [], todo: [] };
  const note = (list, what) => report[list].push(what);
  const git = (args) => exec('git', ['-C', dir, ...args], { env });
  const envFile = durableEnv(dir);
  const needsKey = !hasKey(readEnv(envFile), machineId(machineIdFile(env)));
  const loginEmail = ownerIdentity(ownerEmail ?? (await git(['config', 'user.email']).catch(() => ({ stdout: '' }))).stdout);
  const provisionStateFile = await stateFile(dir, exec);
  const state = readJson(provisionStateFile, {});
  if (state.account && (state.account !== account || state.repo !== repo || state.base !== base)) {
    throw new ProvisionError('access', 'private provisioning state belongs to another account or repository');
  }
  Object.assign(state, { base, account, repo });
  const checkpoint = () => writeJson(provisionStateFile, state);
  await step('repo', checkpoint);

  const wasPrivate = Boolean(state.access?.appId || readJson(recordFile(dir))?.components?.access?.appId);
  try {
    report.access = await accessOrganization(cf, { account, base, note });
    report.access.ownerEmail = loginEmail;
    report.access.humanLogin = 'unverified';
  } catch (error) {
    // A flaky connection or a Cloudflare outage is not a refusal: only a refusal opens the site.
    const status = error.cause?.status;
    const transient = status !== undefined && (status === 0 || status === 429 || status >= 500);
    if (!openWithoutLogin || wasPrivate || !(error instanceof AccessSetupError) || transient) throw error;
    report.access = { mode: 'open', reason: 'zero-trust-onboarding', onboardingUrl: `https://one.dash.cloudflare.com/${account}/`, ownerEmail: loginEmail, humanLogin: 'none' };
  }
  const open = report.access.mode === 'open';
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
  if (!open) Object.assign(report.access, await provisionAccess(cf, {
    account, repo, base, names: n, subdomain: sub, state, checkpoint, note, today,
    adoptExisting: readJson(recordFile(dir))?.components?.memory?.accountId === account
      && readJson(recordFile(dir))?.components?.memory?.worker === `https://${n.worker}.${sub}.workers.dev/_memory`,
  }));
  await step('repo', () => exec('git', ['-C', dirname(envFile), 'check-ignore', '-q', '.env'], { env }));
  if (!open) report.access = await provisionAccessPolicies(cf, {
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
  recordComponent(dir, 'memory', { accountId: account, databaseId: memoryId, database: n.memory, bucket, worker }, note);
  // `sub` was read back from the account; never copy an upstream installation's origin.
  recordComponent(dir, 'companyApi', { origin: `https://${n.worker}.${sub}.workers.dev` }, note);

  // The schema, retried while a new database or a widened token takes effect, then the admin key.
  const memory = join(dir, '.claude', 'skills', 'memory', 'scripts', 'memory.mjs');
  const admin = { cwd: dir, env: { ...env, CLOUDFLARE_API_TOKEN: token } };
  await step('cloudflare', () => retry(() => exec('node', [memory, 'migrate'], admin), sleep, () => true));
  if (needsKey) {
    const issued = await step('cloudflare', () => exec('node', [memory, 'member', 'admin'], admin));
    const appUrl = issued.stdout?.match(/Open the app and sign in normally: (\S+)/)?.[1];
    if (appUrl) report.appUrl = appUrl;
    note('created', 'admin machine memory key in .env');
  } else note('reused', 'admin memory key in .env');

  // The app's databases and config.
  const db = await step('cloudflare', () => database(cf, account, n.db, note));
  const stagingDb = await step('cloudflare', () => database(cf, account, n.stagingDb, note));
  const config = join(dir, 'app', 'wrangler.jsonc');
  if (!keepConfig) {
    if (!existsSync(config)) {
      writeFileSync(config, wranglerConfig({ base, ids: { db, stagingDb, memory: memoryId }, bucket, today, access: report.access }));
      note('created', 'app/wrangler.jsonc');
    } else {
      if (!open && /"WORKSPACE_LOGIN"/.test(readFileSync(config, 'utf8'))) {
        if (closeOpenConfig(config, report.access)) note('updated', 'app/wrangler.jsonc: private login on, WORKSPACE_LOGIN removed');
        else report.todo.push('fill the CF_ACCESS_* vars from components.access and remove WORKSPACE_LOGIN in app/wrangler.jsonc');
      }
      // Access knows its owner only on a private site; a config still open is left as it is.
      if (!open && !/"WORKSPACE_LOGIN"/.test(readFileSync(config, 'utf8'))) ownerEmailInConfig(config, loginEmail, { note, todo: report.todo });
      if (bucket && !readFileSync(config, 'utf8').includes('MEMORY_BUCKET')) {
        if (addBucketBinding(config, bucket)) note('updated', 'app/wrangler.jsonc MEMORY_BUCKET');
        else report.todo.push(`add MEMORY_BUCKET for ${bucket} to app/wrangler.jsonc`);
      }
    }
    migrateScripts(dir, n, note);
  }

  const rows = DEPLOY_TOKEN.filter((row) => row.when === 'always' || (row.when === 'bucket' && bucket));
  report.memory = { database: n.memory, bucket, worker };
  report.urls = { production: `https://${n.worker}.${sub}.workers.dev`, previews: `https://<branch>-${n.staging}.${sub}.workers.dev` };
  // What Access needs last, on either route: the live app's own key. The deploy token is never reused and gains no Access write.
  const accessKey = async () => {
    if (open) return;
    report.accessKey = await step('cloudflare', () => loginManagementKey(cf, {
      account, name: `${n.worker}-access`, worker: n.worker, policyId: report.access.humanPolicyId,
      policies: () => accountPolicy(account, groups, ACCESS_KEY), state, checkpoint, note,
    }));
    if (report.accessKey.status === 'missing') report.todo.push(ACCESS_KEY_TODO);
    recordComponent(dir, 'accessKey', report.accessKey, note);
    // The key for Cloudflare look-ups waits for sign-in too: only then do both Workers exist, with an owner to give levels.
    report.cloudflareReadKey = await step('cloudflare', () => cloudflareReadKey(cf, {
      account, name: `${n.worker}-cloudflare-read`, workers: [n.worker, n.staging],
      policies: () => readKeyPolicies(account, groups), state, checkpoint, note,
    }));
    if (report.cloudflareReadKey.status === 'missing') report.todo.push(CLOUDFLARE_READ_KEY_TODO);
    recordReadKey(dir, report.cloudflareReadKey, note);
    // Which project Connect your assistant hands out: named for both Workers, and bound when Cloudflare keeps it.
    // Like the owner email, it waits while the config is still open.
    if (!keepConfig && !/"WORKSPACE_LOGIN"/.test(readFileSync(config, 'utf8'))) report.codeKey = await step('cloudflare', () => projectCode(cf, {
      account, config, repository: route === 'artifacts' ? artifactNamesFor(base).repo : githubRepo(`https://github.com/${repo}`),
      artifacts: route === 'artifacts', workers: [n.worker, n.staging], note, todo: report.todo,
    }));
  };
  if (route === 'artifacts') {
    report.delivery = await artifactsDelivery(cf, { account, base, token, groups, buckets, deployRows: rows, dir, env, exec, state, checkpoint, note, todo: report.todo, sleep });
    await accessKey();
    return report;
  }

  // The deploy token and the two GitHub secrets.
  const gh = (args, input) => exec('gh', [...args, '-R', repo], { cwd: dir, env, input });
  const secrets = (await step('cloudflare', () => gh(['secret', 'list']))).stdout;
  const listed = (name) => new RegExp(`^${name}\\s`, 'm').test(secrets);
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

  await accessKey();
  return report;
}

/**
 * What Access needs on a repo installed before it knew its owner: the recorded owner's email in both
 * Workers' vars, the live app's own key, and the read-only key for Cloudflare look-ups: in the live app,
 * and in the preview app when Cloudflare takes it. It also names the project Connect your assistant hands
 * out, from the install record on a project kept in Cloudflare and from `origin` on GitHub. Reads the install
 * record and makes nothing else, so an update runs it alone. A site with no sign-in on record has nothing to do.
 */
export async function accessSetup({ token, api, fetch, account, ownerEmail, dir = '.', exec = run }) {
  const cf = cloudflare(token, { api, fetch });
  const report = { created: [], reused: [], updated: [], todo: [] };
  const note = (list, what) => report[list].push(what);
  const { access, delivery } = readJson(recordFile(dir))?.components ?? {};
  const worker = access?.workers?.[0]?.name;
  if (!access?.appId || !access.humanPolicyId || !worker) throw new ProvisionError('repo', 'this repo has no private sign-in on record; run provision first');
  const email = ownerIdentity(ownerEmail ?? access.ownerEmail);
  const provisionStateFile = await stateFile(dir, exec);
  const state = readJson(provisionStateFile, {});
  const key = await step('cloudflare', () => loginManagementKey(cf, {
    account, name: `${worker}-access`, worker, policyId: access.humanPolicyId, state, note,
    policies: async () => accountPolicy(account, await cf('GET', '/user/tokens/permission_groups?per_page=1000'), ACCESS_KEY),
    checkpoint: () => writeJson(provisionStateFile, state),
  }));
  if (key.status === 'missing') report.todo.push(ACCESS_KEY_TODO);
  const readKey = await step('cloudflare', () => cloudflareReadKey(cf, {
    account, name: `${worker}-cloudflare-read`, workers: access.workers.map((each) => each.name), state, note,
    policies: async () => readKeyPolicies(account, await cf('GET', '/user/tokens/permission_groups?per_page=1000')),
    checkpoint: () => writeJson(provisionStateFile, state),
  }));
  if (readKey.status === 'missing') report.todo.push(CLOUDFLARE_READ_KEY_TODO);
  const config = join(dir, 'app', 'wrangler.jsonc');
  if (existsSync(config)) ownerEmailInConfig(config, email, { note, todo: report.todo });
  const artifacts = delivery?.route === 'artifacts';
  const origin = artifacts ? '' : (await exec('git', ['-C', dir, 'remote', 'get-url', 'origin']).catch(() => ({ stdout: '' }))).stdout;
  const codeKey = await step('cloudflare', () => projectCode(cf, {
    account, config, repository: artifacts ? delivery.repo : (githubRepo(origin) ?? githubRepo(`https://github.com/${state.repo}`)),
    artifacts, workers: access.workers.map((each) => each.name), note, todo: report.todo,
  }));
  recordComponent(dir, 'access', { ownerEmail: email }, note);
  recordComponent(dir, 'accessKey', key, note);
  recordReadKey(dir, readKey, note);
  return { ...report, ownerEmail: email, accessKey: key, cloudflareReadKey: readKey, codeKey };
}

// ── the command line ────────────────────────────────────────────────────────

const USAGE = `usage: provision.mjs <command> [--dir <repo>] [--account <id>] [--route github|artifacts]
  widen                                   grant the token a normal provision's groups, then wait until they work
  accounts                                list the accounts the token sees
  plan                                    say which route a new install takes: artifacts on Mac or Linux with
                                          the paid plan seen, else github with the reason; creates nothing
  names --repo <owner/name>               derive the names; report each as free, ours, or taken, and the first free base
  provision --repo <owner/name> --base <base> [--owner-email <email>] [--keep-config] [--open-without-login]
                                          make or reuse the memory store, databases, config, and deploy token;
                                          --open-without-login goes on, open, when Zero Trust needs onboarding
  access [--owner-email <email>]          on an installed repo with sign-in on: put the owner's email in both Workers'
                                          vars, give the live app its own key for the sign-in list and the read-only
                                          key for Cloudflare look-ups; the preview app gets the read-only key when
                                          Cloudflare takes it, and is reported as waiting when not. It also names
                                          the project Connect your assistant hands out: codeKey is ready, or
                                          missing with the owner's steps on GitHub, which Access asks for later
--route artifacts keeps the project in Cloudflare with no GitHub: widen adds its groups, names checks its
names, and provision makes the repository and the check runner in place of the GitHub secrets.
--dir is the target repo (default: here). The token is CLOUDFLARE_API_TOKEN and the account CLOUDFLARE_ACCOUNT_ID,
from the environment or the target's .env. Each command prints one JSON report, never a token.`;

const NEEDS = { widen: [], accounts: [], plan: ['account'], names: ['account', 'repo'], provision: ['account', 'repo', 'base'], access: ['account'] };

/** Runs one command and returns the exit code: 0 done, 1 stopped (with a JSON reason), 2 usage. */
export async function cli(argv, { env = process.env, out = console.log, err = console.error, fetch, sleep } = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { dir: { type: 'string' }, account: { type: 'string' }, route: { type: 'string' }, repo: { type: 'string' }, base: { type: 'string' }, 'owner-email': { type: 'string' }, 'keep-config': { type: 'boolean' }, 'open-without-login': { type: 'boolean' }, help: { type: 'boolean' } },
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
  if (!['github', 'artifacts', undefined].includes(values.route)) {
    err(`--route is github or artifacts\n${USAGE}`);
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
  const common = { token, api: env.WONG_CLOUDFLARE_API, fetch, account: options.account, repo: options.repo, route: values.route ?? 'github', dir, env, ...(sleep && { sleep }) };
  const commands = {
    widen: () => widen(common),
    accounts: () => accounts(common),
    plan: () => plan(common),
    names: () => names(common),
    provision: () => provision({ ...common, base: safeName(options.base), ownerEmail: values['owner-email'], keepConfig: Boolean(values['keep-config']), openWithoutLogin: Boolean(values['open-without-login']) }),
    access: () => accessSetup({ ...common, ownerEmail: values['owner-email'] }),
  };
  try {
    out(JSON.stringify(await commands[command](), null, 2));
    return 0;
  } catch (error) {
    return stop(error.reason ?? 'cloudflare', error.message);
  }
}

if (isMain(import.meta.url)) process.exitCode = await cli(process.argv.slice(2));
