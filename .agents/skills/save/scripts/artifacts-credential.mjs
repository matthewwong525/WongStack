#!/usr/bin/env node
// Git's credential helper for an Artifacts install: Git asks, this answers with a short-lived
// token for the one repository, and nobody types or stores a password.
//
//     git config credential.https://<account>.artifacts.cloudflare.net.helper '!node …/artifacts-credential.mjs'
//     node artifacts-credential.mjs install [dir]     # writes that config for a checkout
//
// On `get` it reads Git's request from stdin. For this install's Artifacts host it answers with a
// cached token, or mints a one-day one from CLOUDFLARE_API_TOKEN in the primary worktree's ignored
// `.env`, and caches it, mode 0600, under ~/.local/state/wongstack/. Any other host gets no answer,
// so Git carries on as it would without this helper. `erase` forgets the cached token. The token
// goes only to Git on stdout and to the cache file: never to stderr, an argument, or the address.
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { PrimaryRootError, primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../../memory/scripts/lib/store.mjs';
import { ARTIFACTS_HOST, RouteError, delivery } from './delivery-route.mjs';

const API = 'https://api.cloudflare.com/client/v4';
const TTL_SECONDS = 24 * 60 * 60;
/** A cached token this close to its expiry is renewed, so a long push never outlives it. */
const RENEW_SECONDS = 10 * 60;
// Cloudflare has changed the prefix once already (`art_v1_…`, then `art_v2_x_…`), so only its shape is held.
const TOKEN = /^(art_v\d+_(?:[a-z0-9]+_)*[0-9a-f]{40})\?expires=(\d+)$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class CredentialError extends Error {}

/** Git's `key=value` request lines as an object. */
export const parseRequest = (text) => Object.fromEntries(String(text).split('\n').filter((line) => line.includes('=')).map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

/** The repository a request names: `{ account, namespace, repo }`, or null for any other remote. */
export function repositoryOf(request, recorded) {
  const host = ARTIFACTS_HOST.exec(String(request.host ?? '').toLowerCase());
  if (request.protocol !== 'https' || !host) return null;
  const path = /^git\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(request.path ?? '');
  // With no path from Git, the checkout's own record names the repository, on its own account only.
  const own = !request.path && recorded?.accountId === host[1] && { namespace: recorded.namespace, repo: recorded.repo };
  const named = path ? { namespace: path[1], repo: path[2] } : own;
  if (!named || !NAME.test(named.namespace ?? '') || !NAME.test(named.repo ?? '')) return null;
  return { account: host[1], ...named };
}

/** Where one repository's token is cached. */
export const cacheFile = (home, { account, namespace, repo }) => join(home, '.local', 'state', 'wongstack', `artifacts-${account}-${namespace}-${repo}.json`);

/**
 * The cached token when it is safe and still good, else null. A link is refused outright: the
 * helper would otherwise read, or later overwrite, a file someone else chose. A file others can
 * read is thrown away.
 */
export function readCache(file, now) {
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    return null;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) throw new CredentialError(`the token cache ${file} is a link or not a file; remove it`);
  if (stat.mode & 0o077) {
    rmSync(file, { force: true });
    return null;
  }
  try {
    const match = TOKEN.exec(JSON.parse(readFileSync(file, 'utf8')).token ?? '');
    return match && Number(match[2]) - now > RENEW_SECONDS ? match[0] : null;
  } catch {
    return null;
  }
}

/** Writes the cache through a private temporary file, so it is never readable by others. */
function writeCache(file, token) {
  const dir = join(file, '..');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const next = `${file}.${process.pid}.next`;
  writeFileSync(next, `${JSON.stringify({ token })}\n`, { mode: 0o600, flag: 'wx' });
  chmodSync(next, 0o600);
  renameSync(next, file);
}

/** The person's Cloudflare token: the environment, else the primary worktree's `.env`. Never printed. */
function cloudflareToken(cwd, env) {
  if (env.CLOUDFLARE_API_TOKEN) return env.CLOUDFLARE_API_TOKEN;
  let file;
  try {
    file = join(primaryRoot(cwd).primary, '.env');
  } catch (error) {
    if (!(error instanceof PrimaryRootError)) throw error;
    throw new CredentialError(`could not find this repo's main copy to read .env from: ${error.message}`);
  }
  const token = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')).CLOUDFLARE_API_TOKEN : '';
  if (!token) throw new CredentialError(`CLOUDFLARE_API_TOKEN is not set in ${file}; add your Cloudflare token there`);
  return token;
}

/** A fresh write token for one repository, from Cloudflare. */
async function mint(repository, token, { api, fetch: fetchFn }) {
  const url = `${api.replace(/\/$/, '')}/accounts/${repository.account}/artifacts/namespaces/${encodeURIComponent(repository.namespace)}/tokens`;
  let response;
  try {
    response = await fetchFn(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: repository.repo, scope: 'write', ttl: TTL_SECONDS }) });
  } catch {
    throw new CredentialError('Cloudflare could not be reached for a repository token');
  }
  const data = await response.json().catch(() => ({}));
  const plaintext = data?.result?.plaintext;
  if (!response.ok || !data.success || !TOKEN.test(plaintext ?? '')) throw new CredentialError(`Cloudflare refused a repository token: HTTP ${response.status} ${(data.errors ?? []).map((error) => error.code).filter(Boolean).join(',')}`.trim());
  return plaintext;
}

/**
 * Answers one helper call. Returns the text for stdout: the credential for `get` on this install's
 * host, and nothing for a foreign remote or for `store`.
 */
export async function credential(operation, input, { cwd = process.cwd(), env = process.env, home = homedir(), now = Math.floor(Date.now() / 1000), fetch: fetchFn = globalThis.fetch } = {}) {
  if (operation !== 'get' && operation !== 'erase') return '';
  let recorded = null;
  try {
    recorded = delivery(cwd).delivery;
  } catch {
    // A checkout whose route is unclear still gets an answer when Git names the repository itself.
  }
  const repository = repositoryOf(parseRequest(input), recorded);
  if (!repository) return '';
  const file = cacheFile(home, repository);
  if (operation === 'erase') {
    if (!lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) rmSync(file, { force: true });
    return '';
  }
  let token = readCache(file, now);
  if (!token) {
    token = await mint(repository, cloudflareToken(cwd, env), { api: env.WONG_CLOUDFLARE_API || API, fetch: fetchFn });
    writeCache(file, token);
  }
  const [, secret, expires] = TOKEN.exec(token);
  return `username=x\npassword=${secret}\npassword_expiry_utc=${expires}\n`;
}

/**
 * The Git config that points one account's Artifacts host at this helper, as `[key, value]` pairs:
 * the helper, found from whichever checkout Git runs in, and the setting that makes Git send the
 * repository's path, so one helper serves every repository on the host.
 */
export function helperConfig(account) {
  const scope = `credential.https://${account}.artifacts.cloudflare.net`;
  return [
    [`${scope}.helper`, '!f() { node "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/artifacts-credential.mjs" "$@"; }; f'],
    [`${scope}.useHttpPath`, 'true'],
  ];
}

/** Writes that config for a checkout: what a second computer runs once after its first clone. */
export function install(cwd = process.cwd(), exec = execFileSync) {
  let found;
  try {
    found = delivery(cwd);
  } catch (error) {
    if (!(error instanceof RouteError)) throw error;
    throw new CredentialError(error.message);
  }
  const { route, root, delivery: recorded } = found;
  if (route !== 'artifacts') throw new CredentialError('this checkout is not an Artifacts install');
  for (const [key, value] of helperConfig(recorded.accountId)) exec('git', ['config', '--replace-all', key, value], { cwd: root });
  return `https://${recorded.accountId}.artifacts.cloudflare.net`;
}

async function main(argv) {
  const operation = argv.at(0);
  try {
    if (operation === 'install') return void console.log(`Git now asks this helper for ${install(argv[1] || process.cwd())}.`);
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    process.stdout.write(await credential(operation, input));
  } catch (error) {
    if (!(error instanceof CredentialError)) throw error;
    console.error(`artifacts-credential: ${error.message}`);
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) await main(process.argv.slice(2));
