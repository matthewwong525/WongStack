#!/usr/bin/env node
// The pair of locks for keys sent to the app, and the publish's step that opens the waiting ones. No value ever
// reaches a command line or this script's output. wiki/stack/connect-your-tools.md#how-a-key-reaches-the-app
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { parseEnv } from 'node:util';
import { primaryRoot } from '../.claude/skills/memory/scripts/lib/primary-root.mjs';
import { databaseName, findWranglerConfig, parseConfig, repoRoot, stripJsonc } from './lib-wrangler-config.mjs';
import { isMain, parseCli, usageError } from './lib-cli.mjs';

const USAGE = `usage: node scripts/seal-keys.mjs <pair|put>
  pair  make the pair of locks once: the public half goes in app/wrangler.jsonc as WONG_KEY_SEAL_PUBLIC, the
        private half only where publishing runs, as WONG_KEY_SEAL_PRIVATE: a GitHub secret, or the check
        runner's secret on the Artifacts route. Running it again makes a new pair; keys sent before then stay waiting.
  put   the publish's step, on the live app alone: open each waiting key with WONG_KEY_SEAL_PRIVATE, put them in
        the live app's secrets at once, then delete only the rows put. A key it can not open stays, named.`;
const PUBLIC = 'WONG_KEY_SEAL_PUBLIC';
const PRIVATE = 'WONG_KEY_SEAL_PRIVATE';
/** A secret's name as the app takes one, never the app's own, Cloudflare's or the sign-in's. */
const NAME = /^[A-Z][A-Z0-9_]{0,99}$/;
const OWN = /^(?:WONG_|CLOUDFLARE_|CF_)/;

const seal = () => import('../app/src/lib/seal.ts');

/** One wrangler call in the app's folder, as the deploy scripts make it; `input` goes on stdin. Never production's
 *  environment by accident: CLOUDFLARE_ENV is dropped, so the top-level Worker is meant. */
function wrangler(args, { cwd, input, env = process.env }) {
  const [command, ...first] = env.WONG_WRANGLER ? [env.WONG_WRANGLER] : ['npx', 'wrangler'];
  const { CLOUDFLARE_ENV: _dropped, ...rest } = env;
  return execFileSync(command, [...first, ...args], { cwd, input, env: rest, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

/** The last line a failed call printed, with every value in `hidden` cut out. */
const why = (error, hidden = []) => hidden.reduce((text, value) => text.split(value).join('****'),
  `${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split('\n').at(-1) || error.message);

/** `text`, the app's wrangler config, with `key` as WONG_KEY_SEAL_PUBLIC: replaced where it is, else the first entry
 *  of the first `vars`, which the caller checks is the top level's. Null when there is no `vars` to write it in. */
function withPublicKey(text, key) {
  // Every `vars` block, top level and each environment's: named environments don't inherit vars, and the parity check
  // fails a top-level var that env.staging lacks. A public half on staging is harmless: a preview refuses a key first.
  const line = new RegExp(`("${PUBLIC}":\\s*)"[^"]*"`, 'g');
  if (line.test(text)) return text.replace(line, (_, start) => `${start}"${key}"`);
  let found = false;
  const done = text.replace(/"vars":\s*\{(\s*)/g, (block, gap, at) => {
    if (text.slice(text.lastIndexOf('\n', at) + 1, at).trimStart().startsWith('//')) return block;
    found = true;
    return `${block}"${PUBLIC}": "${key}",${gap.includes('\n') ? gap : ' '}`;
  });
  return found ? done : null;
}

/** Where the private half goes: the install record's check runner on the Artifacts route, else GitHub. */
function publishing(root) {
  const file = join(root, '.claude', '.wong-stack.json');
  const record = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const runner = record.components?.delivery;
  return runner?.route === 'artifacts' ? { route: 'artifacts', runner: runner.workflow, account: runner.accountId } : { route: 'github' };
}

/** The person's Cloudflare login, from the environment or the primary checkout's `.env`, for the runner's secret. */
function cloudflareLogin(root) {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  let primary = root;
  try { ({ primary } = primaryRoot(root)); } catch { /* not a git checkout: this folder is the primary one */ }
  const file = join(primary, '.env');
  return (existsSync(file) && parseEnv(readFileSync(file, 'utf8')).CLOUDFLARE_API_TOKEN) || null;
}

/** Makes the pair; the private half goes where publishing runs first, so a failure there writes no public half. */
async function pair() {
  const configPath = findWranglerConfig();
  const { publicKey, privateKey } = await (await seal()).makePair();
  const text = withPublicKey(readFileSync(configPath, 'utf8'), publicKey);
  if (!text || JSON.parse(stripJsonc(text)).vars?.[PUBLIC] !== publicKey) {
    throw new Error(`${relative(repoRoot, configPath)} needs a top-level "vars" first, to hold ${PUBLIC}: add one, then run pair again.`);
  }
  const where = publishing(repoRoot);
  try {
    if (where.route === 'github') execFileSync('gh', ['secret', 'set', PRIVATE], { cwd: repoRoot, input: privateKey, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    else {
      const token = cloudflareLogin(repoRoot);
      if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not set here or in the primary checkout\'s .env');
      wrangler(['secret', 'put', PRIVATE, '--name', where.runner], { cwd: dirname(configPath), input: privateKey,
        env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: where.account } });
    }
  } catch (error) {
    throw new Error(`${PRIVATE} was not set on ${where.route === 'github' ? 'GitHub' : `the check runner ${where.runner}`}, so nothing changed: ${why(error, [privateKey])}`);
  }
  writeFileSync(configPath, text);
  return `${PUBLIC} written to ${relative(repoRoot, configPath)}; ${PRIVATE} set on ${where.route === 'github' ? 'GitHub' : `the check runner ${where.runner}`}. It works from the next publish.`;
}

/** The waiting rows, each opened, or named when it can not be: a bad name, a bad time or another pair's lock. */
async function opened(rows, privateKey) {
  const { open } = await seal();
  const keys = [];
  const stay = [];
  for (const row of rows) {
    const value = NAME.test(row.name) && !OWN.test(row.name) && Number.isSafeInteger(row.sent_at) ? await open(row.sealed, privateKey).catch(() => null) : null;
    if (value) keys.push({ name: row.name, at: row.sent_at, value });
    else stay.push(String(row.name).slice(0, 100));
  }
  return { keys, stay };
}

/** The publish's step: every waiting key it can open goes in the live app's secrets in one new version, then its row
 *  goes, matched on its name and time, so a key sent meanwhile stays. Resolves to the exit code. */
async function put() {
  const privateKey = process.env[PRIVATE];
  const { CF_BRANCH: branch, CF_PRODUCTION_BRANCH: production } = process.env;
  if (branch && production && branch !== production) throw new Error('only the live app\'s publish opens waiting keys, never a preview');
  if (!privateKey) return [0, `seal-keys: no ${PRIVATE} here, so waiting keys stay waiting`];
  const configPath = findWranglerConfig();
  const cwd = dirname(configPath);
  const database = databaseName(parseConfig(configPath));
  const read = JSON.parse(wrangler(['d1', 'execute', database, '--remote', '--json', '--command', 'SELECT name, sealed, sent_at FROM sealed_keys'], { cwd }));
  const rows = read.flatMap(answer => answer.results ?? []);
  const { keys, stay } = await opened(rows, privateKey);
  const lines = stay.length ? [`seal-keys: could not open ${stay.join(', ')}; ${stay.length === 1 ? 'it stays' : 'they stay'} waiting`] : [];
  if (!keys.length) return [stay.length ? 1 : 0, [...lines, ...(rows.length ? [] : ['seal-keys: no keys wait'])].join('\n')];
  const dir = mkdtempSync(join(tmpdir(), 'seal-keys-'));
  const values = keys.map(key => key.value);
  try {
    writeFileSync(join(dir, 'keys.json'), JSON.stringify(Object.fromEntries(keys.map(key => [key.name, key.value]))), { mode: 0o600 });
    wrangler(['secret', 'bulk', join(dir, 'keys.json')], { cwd });
  } catch (error) {
    throw new Error(`the waiting keys were not put, so all stay waiting: ${why(error, values)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const where = keys.map(key => `(name = '${key.name}' AND sent_at = ${key.at})`).join(' OR ');
  wrangler(['d1', 'execute', database, '--remote', '--command', `DELETE FROM sealed_keys WHERE ${where}`], { cwd });
  return [stay.length ? 1 : 0, [...lines, `seal-keys: put ${keys.map(key => key.name).join(', ')} in the live app's secrets`].join('\n')];
}

if (isMain(import.meta.url)) {
  const { positionals } = parseCli({ usage: USAGE, allowPositionals: true });
  if (positionals.length !== 1 || !['pair', 'put'].includes(positionals[0])) usageError(USAGE);
  try {
    const [code, text] = positionals[0] === 'pair' ? [0, await pair()] : await put();
    console.log(text);
    process.exitCode = code;
  } catch (error) {
    console.error(`seal-keys: ${error.message}`);
    process.exitCode = 1;
  }
}
