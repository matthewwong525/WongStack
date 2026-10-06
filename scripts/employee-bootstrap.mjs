#!/usr/bin/env node
// Standalone reviewed bootstrap: only Node built-ins; never memory/checkout authority.
// `install` signs in, downloads the project when the app hands it to this person, and reports what works.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, lstatSync, readdirSync, realpathSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

function refuseExternalReferences(value) {
  if (!value || typeof value !== 'object') return value;
  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && (typeof item !== 'string' || !item.startsWith('#/'))) throw new Error('Untrusted external schema reference');
    refuseExternalReferences(item);
  }
  return value;
}
export function cleanEnvironment() {
  return Object.fromEntries(['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR', 'SYSTEMROOT'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
}
const MAX_RESPONSE = 1048576;
const missing = (program, from) => `Install ${program} from its official distribution (${from}), then run this step again. No account or key is needed.`;
export function companyOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Use the company’s HTTPS origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use the company’s HTTPS origin without a path');
  return url.origin;
}
function readJson(file) { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } }
export function privateDirectory(dir, root) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const resolved = realpathSync(dir);
  const checkout = realpathSync(root);
  const inside = relative(checkout, resolved);
  if (!inside || (!inside.startsWith(`..${sep}`) && inside !== '..' && !isAbsolute(inside))) throw new Error('Company login state must be outside the checkout');
  for (let parent = resolved; dirname(parent) !== parent; parent = dirname(parent)) {
    if (existsSync(join(parent, '.git'))) throw new Error('Company login state must be outside any checkout');
  }
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || (process.getuid && stat.uid !== process.getuid()) || (stat.mode & 0o077)) throw new Error('Company login state must be owned by this user and private (directory mode 0700)');
}
export function safeCache(dir, root) {
  privateDirectory(dir, root);
  for (const file of readdirSync(dir)) {
    const stat = lstatSync(join(dir, file));
    if (stat.isSymbolicLink() || (process.getuid && stat.uid !== process.getuid()) || (stat.isFile() && (stat.mode & 0o077))) throw new Error('Company login cache is not private; protect it before signing in');
  }
}
export function loginUrl(value, origin) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.origin === companyOrigin(origin) && url.pathname === '/cdn-cgi/access/cli' &&
      !url.username && !url.password && !url.hash && (!url.searchParams.has('redirect_url') || new URL(url.searchParams.get('redirect_url')).origin === url.origin) && !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) return url.href;
  } catch { /* never forward arbitrary helper diagnostics */ }
  return null;
}
export function cloudflared(args, { onLoginUrl = () => {}, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const origin = companyOrigin(args.at(-1).replace(/^-app=/, ''));
    const child = spawn('cloudflared', ['access', ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: cleanEnvironment() });
    let output = '', pending = '', size = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error('Sign-in timed out. Complete company login again; no action was called.')); }, timeoutMs);
    const capture = chunk => {
      const text = chunk.toString(); size += chunk.length;
      if (size > MAX_RESPONSE) { child.kill(); return; }
      pending += text;
      const lines = pending.split(/\r?\n/); pending = lines.pop();
      for (const line of lines) for (const match of line.matchAll(/https:\/\/[^\s<>"']+/g)) {
        const link = loginUrl(match[0], origin); if (link) onLoginUrl(link);
      }
    };
    child.stdout.on('data', chunk => { output += chunk.toString(); capture(chunk); });
    child.stderr.on('data', capture);
    child.on('error', () => { clearTimeout(timer); reject(new Error(missing('cloudflared', 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'))); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || size > MAX_RESPONSE) reject(new Error('Company sign-in did not complete. Approve it in a browser as the employee, then run this step again.'));
      else resolve(output);
    });
  });
}
function employeeToken(output) {
  const matches = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  const token = matches.at(-1);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (!payload.email || typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000) throw new Error();
  } catch { throw new Error('Employee session is absent or expired; use company login.'); }
  return token;
}
export async function responseJson(response) {
  const reader = response.body?.getReader();
  let text = '', bytes = 0;
  const decoder = new TextDecoder();
  if (reader) try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > MAX_RESPONSE) throw new Error('Company response exceeds its bound');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch { throw new Error('Company response did not complete; a called action may have an uncertain outcome.'); }
  finally { await reader.cancel(); }
  try { return JSON.parse(text); } catch { throw new Error('Company returned an unreadable response'); }
}

/** Under the company origin: Git's read protocol for the one project, behind the same sign-in. */
const CODE_PATH = '/api/access/code/git/';
const NOT_APPLIED = 'kept your changes; update not applied';
const REFUSED = 'The project download was refused. Ask your admin for access to Connect your assistant, or sign in again. The copy on this computer is unchanged.';
/**
 * Git as a child process. With a `token`, the employee session goes to `address` alone, as a request header set
 * in the child's environment: never an argument, the remote URL or a config file. Redirects are refused, and no
 * credential helper or prompt is asked. Git's own messages are dropped, so nothing it prints reaches a chat.
 */
export function git(args, { address, token } = {}) {
  const config = [['credential.helper', ''], ['http.followRedirects', 'false'], ...(token ? [[`http.${address}.extraHeader`, `cf-access-token: ${token}`]] : [])];
  const env = { ...cleanEnvironment(), GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: String(config.length),
    ...Object.fromEntries(config.flatMap(([key, value], index) => [[`GIT_CONFIG_KEY_${index}`, key], [`GIT_CONFIG_VALUE_${index}`, value]])) };
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, env });
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.on('error', () => reject(new Error(missing('Git', 'https://git-scm.com/downloads'))));
    child.on('close', code => resolve({ code, stdout: stdout.trim() }));
  });
}
/**
 * Put the project in `folder`, or bring the copy there up to date. A new copy goes only into a missing or empty
 * folder. An update fetches, then moves the checked-out default branch forward when nothing tracked was changed
 * and nothing was committed on top; otherwise everything is kept as it is and the result says so. It never
 * resets, cleans, stashes or forces a checkout.
 */
export async function projectCopy({ address, folder, token, run = git }) {
  const dir = resolve(folder);
  const here = (args, session) => run(['-C', dir, ...args], session);
  // The app must answer with the project itself first. A sign-in page or a redirect lists no branch, and Git
  // would take that for an empty project.
  const reached = async () => {
    if ((await run(['ls-remote', '--quiet', '--exit-code', address, 'HEAD'], { address, token })).code !== 0) throw new Error(REFUSED);
  };
  if (!existsSync(join(dir, '.git'))) {
    if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} already holds other files. Choose an empty folder with --dir; nothing was changed.`);
    await reached();
    if ((await run(['clone', '--quiet', '--origin', 'origin', address, dir], { address, token })).code !== 0) throw new Error(REFUSED);
    return { project: 'installed', folder: dir };
  }
  if ((await here(['config', '--get', 'remote.origin.url'])).stdout !== address) throw new Error(`${dir} holds a different project. Choose an empty folder with --dir; nothing was changed.`);
  await reached();
  if ((await here(['fetch', '--quiet', 'origin'], { address, token })).code !== 0) throw new Error(REFUSED);
  const said = async (...args) => (await here(args)).stdout;
  const latest = await said('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
  const branch = await said('symbolic-ref', '--quiet', '--short', 'HEAD');
  const changed = await said('status', '--porcelain', '--untracked-files=no');
  const applied = latest === `origin/${branch}` && !changed && (await here(['merge', '--quiet', '--ff-only', latest])).code === 0;
  return applied ? { project: 'up to date', folder: dir } : { project: NOT_APPLIED, folder: dir, applied: false };
}

const defaultRoutes = () => join(homedir(), '.local', 'state', 'wong-company', 'projects');
const routeName = root => `${createHash('sha256').update(realpathSync(root)).digest('hex')}.json`;
export function connectionState(root = process.cwd(), routesDir = defaultRoutes()) {
  if (!existsSync(routesDir)) return null;
  safeCache(routesDir, root);
  const locator = readJson(join(routesDir, routeName(root)));
  if (!locator.stateDir) return null;
  if (typeof locator.stateDir !== 'string' || !isAbsolute(locator.stateDir) || companyOrigin(locator.origin) !== readJson(join(locator.stateDir, 'target.json')).origin) throw new Error('Private project connection changed; use explicit company login');
  safeCache(locator.stateDir, root);
  return locator.stateDir;
}

export function companyClient({ root = process.cwd(), stateDir, routesDir = defaultRoutes(), cacheDir = join(homedir(), '.cloudflared'),
  run = cloudflared, request = fetch, onLoginUrl = () => {}, onboarding = true } = {}) {
  let dir = stateDir || join(homedir(), '.local', 'state', 'wong-company', createHash('sha256').update(root).digest('hex'));
  let file = join(dir, 'target.json');
  function directory() {
    if (!stateDir) dir = connectionState(root, routesDir) || dir;
    file = join(dir, 'target.json'); return dir;
  }
  const record = () => readJson(join(root, '.claude', '.wong-stack.json')).components?.companyApi?.origin;
  function target() {
    safeCache(directory(), root);
    const saved = readJson(file).origin;
    if (!saved) throw new Error('Connect first: company-api.mjs login --origin <company HTTPS origin>');
    const suggestion = record();
    if (suggestion && companyOrigin(suggestion) !== saved && readJson(file).installedOrigin !== suggestion) throw new Error('The recorded company origin changed. Confirm the target with company login before sending credentials.');
    return companyOrigin(saved);
  }
  async function token(origin, login = false) {
    safeCache(cacheDir, root);
    if (login) await run(['login', origin], { onLoginUrl });
    return employeeToken(await run(['token', `-app=${origin}`], { onLoginUrl }));
  }
  /** The saved connection's session: the same person who connected, or nothing. */
  async function session(origin) {
    const credential = await token(origin);
    const pinned = readJson(file).identity;
    if (pinned) {
      const claims = JSON.parse(Buffer.from(credential.split('.')[1], 'base64url').toString('utf8'));
      if (claims.email.trim().toLowerCase() !== pinned.email.trim().toLowerCase() || claims.sub !== pinned.subject) throw new Error('The signed-in person changed; use a separate private company connection');
    }
    return credential;
  }
  // `business` marks a call that may change something; its `check` names the read to run before repeating it.
  async function http(path, init = {}, origin = target(), suppliedToken, business) {
    if (!/^\/(?:api\/|apps\/)[^#]*$/.test(path) || new URL(path, origin).origin !== origin || path.includes('..') || path.includes('\\')) throw new Error('Refused an arbitrary server URL');
    const credential = suppliedToken || await session(origin);
    let response;
    try {
      response = await request(new URL(path, origin), { ...init, redirect: 'manual', headers: { 'cf-access-token': credential, ...init.headers }, signal: AbortSignal.timeout(20000) });
    } catch {
      throw new Error(business ? `Company call did not complete; its outcome may be unknown. Do not automatically repeat it.${business.check}` : 'Company discovery is unreachable; no business action was called.');
    }
    if (response.status >= 300 && response.status < 400) throw new Error('Company redirect refused; use company login.');
    if (response.status === 401 || response.status === 403) throw new Error('Company session expired or access was denied; use the employee’s own login.');
    let value;
    try { value = await responseJson(response); }
    catch { throw new Error(business ? `Company response did not complete; its outcome may be unknown. Do not automatically repeat the action.${business.check}` : 'Company discovery did not complete; no business action was called.'); }
    // Headers/session values must never become agent context, even on a bad server response.
    if (JSON.stringify(value).includes(credential)) throw new Error('Company response contained authentication material');
    if (!response.ok && !value.error) throw new Error(`Company request failed (HTTP ${response.status})`);
    return { value, status: response.status };
  }
  async function login(origin) {
    safeCache(directory(), root);
    const chosen = companyOrigin(origin || record());
    const credential = await token(chosen, true);
    let identity;
    if (onboarding) {
      const probe = await http('/api/access/setup', {}, chosen, credential);
      if (probe.status !== 200 || probe.value.api !== 'authenticated') throw new Error('Employee setup is unavailable; no API readiness was established');
      identity = probe.value.identity;
      if (!identity || typeof identity.email !== 'string' || typeof identity.subject !== 'string' || !identity.subject) throw new Error('Verified employee identity is unavailable');
    } else {
      const probe = await http('/api/actions?limit=1', {}, chosen, credential);
      if (probe.status !== 200 || !Array.isArray(probe.value.actions)) throw new Error('Company discovery is unavailable; the target was not connected');
    }
    const previous = readJson(file).identity;
    if (previous && identity && (previous.email !== identity.email || previous.subject !== identity.subject)) throw new Error('The signed-in person changed; use a separate private company connection');
    writeFileSync(file, `${JSON.stringify({ origin: chosen, installedOrigin: record() || null, ...(identity && { identity }) })}\n`, { mode: 0o600 });
    return onboarding ? { connected: chosen, connection: 'employee_setup' } : { connected: chosen };
  }
  async function describe(id) {
    const { value } = await http(`/api/actions?id=${encodeURIComponent(id)}`);
    refuseExternalReferences(value);
    if (['servers', 'command', 'args', 'adapter', 'executable'].some(key => Object.hasOwn(value, key)) || value.operationId !== id || id.startsWith('memory.') || value.source !== 'company' || value.transport !== 'http' ||
      !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(value.method) || !['none', 'query', 'json'].includes(value.encoding) ||
      typeof value.path !== 'string' || !/^\/(?:api\/[A-Za-z0-9/_-]+|apps\/[a-z0-9-]+\/api\/[A-Za-z0-9/_-]+)$/.test(value.path) ||
      (value.confirmWith !== undefined && (typeof value.confirmWith !== 'string' || !/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(value.confirmWith)))) throw new Error('Invalid live company operation');
    return value;
  }
  async function list(filters = {}) {
    const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]));
    const { value } = await http(`/api/actions?${query}`);
    refuseExternalReferences(value);
    if (!Array.isArray(value.actions) || value.actions.length > 50 || value.actions.some(action => action.operationId.startsWith('memory.') || action.source !== 'company' || action.transport !== 'http')) throw new Error('Invalid company catalogue');
    return value;
  }
  async function call(id, input) {
    const operation = await describe(id); // Always consult the live selected action; no stale route replay.
    const init = { method: operation.method };
    let path = operation.path;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Supply a JSON object as input');
    if (operation.encoding === 'query') {
      if (Object.values(input).some(value => !['string', 'number', 'boolean'].includes(typeof value))) throw new Error('Query input supports scalar fields only');
      path += `?${new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]))}`;
    } else if (operation.encoding === 'json') { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(input); }
    else if (Object.keys(input).length) throw new Error('This operation has no input');
    // The helper names the confirming read and calls nothing again: the assistant decides.
    const { confirmWith } = operation;
    const { value } = await http(path, init, target(), undefined, { check: confirmWith ? ` Check with ${confirmWith} before repeating.` : '' });
    if (confirmWith && value?.error?.code === 'timeout') value.error.confirmWith = confirmWith;
    return value;
  }
  async function setup() {
    const result = await http('/api/access/setup');
    if (result.status !== 200 || result.value.api !== 'authenticated') throw new Error('Employee setup is unavailable; ask the owner to finish setup');
    return result.value;
  }
  /** Download the project into `folder`, or update the copy there, as the signed-in person. */
  async function code(folder, copy = projectCopy) {
    const origin = target();
    return copy({ address: `${origin}${CODE_PATH}`, folder, token: await session(origin) });
  }
  /**
   * One step: sign in, download or update the project when the app hands it to this person, and say what works.
   * The folder is the one given, else the one used last time, else a folder in the home directory named for the app.
   */
  async function install(origin, folder, copy) {
    const { connected } = await login(origin);
    const status = await setup();
    const report = { connected, signedInAs: status.identity.email, apps: status.apps, state: dir };
    if (status.code !== 'ready') return { ...report, project: status.code === 'lacked' ? 'not included. Ask your admin for access to Connect your assistant.' : 'not handed out by this app; apps only' };
    const noted = join(dir, 'project.json');
    const result = await code(folder || readJson(noted).folder || join(homedir(), new URL(connected).hostname.split('.')[0]), copy);
    writeFileSync(noted, `${JSON.stringify({ folder: result.folder })}\n`, { mode: 0o600 });
    return { ...report, ...result, next: `cd ${result.folder} && node scripts/company-api.mjs list --state ${dir}` };
  }
  return { login, list, describe, call, setup, code, install, target, get stateDirectory() { return directory(); } };
}
const USAGE = 'employee-bootstrap.mjs install --origin <HTTPS origin> [--dir <folder>] | login --origin <HTTPS origin> | status | code --dir <folder> | list | describe <id> | call <id> --file <JSON file or -> [--state <private directory>]';
/** `install` keeps one private directory per company, so a second run finds the first. */
const installBase = () => join(homedir(), '.local', 'state', 'wong-company');
const installState = origin => join(installBase(), createHash('sha256').update(companyOrigin(origin)).digest('hex'));
/** `install` and `code` run from any folder, the home folder included, so they work from an empty one beside the state. */
function neutralRoot() {
  const root = join(installBase(), 'anywhere');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  return root;
}
export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) { console.log(`usage: ${USAGE}`); return; }
  const { positionals: [command, ...rest], values } = parseArgs({ args, allowPositionals: true, options: Object.fromEntries(['origin', 'state', 'dir', 'file', 'q', 'app', 'limit', 'offset'].map(key => [key, { type: 'string' }])) });
  const stateDir = values.state || (command === 'install' && values.origin ? installState(values.origin) : undefined);
  const client = companyClient({ ...(['install', 'code'].includes(command) && { root: neutralRoot() }), stateDir, onLoginUrl: link => console.error(`Sign in with your own company account: ${link}`) });
  let result;
  if (command === 'login' && !rest.length) result = await client.login(values.origin);
  else if (command === 'install' && !rest.length && values.origin) result = await client.install(values.origin, values.dir);
  else if (command === 'code' && !rest.length && values.dir) result = await client.code(values.dir);
  else if (command === 'status' && !rest.length) result = await client.setup();
  else if (command === 'list' && !rest.length) result = await client.list(Object.fromEntries(['q', 'app', 'limit', 'offset'].filter(key => values[key] !== undefined).map(key => [key, values[key]])));
  else if (command === 'describe' && rest.length === 1) result = await client.describe(rest[0]);
  else if (command === 'call' && rest.length === 1 && values.file) result = await client.call(rest[0], JSON.parse(readFileSync(values.file === '-' ? 0 : values.file, 'utf8')));
  else throw new Error(USAGE);
  console.log(JSON.stringify(result, null, 2));
  // A returned error is still printed, and ends as a failure a script can see.
  if ((command === 'call' && result?.error && typeof result.error === 'object') || result?.applied === false) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof SyntaxError ? 'Invalid command input' : error.message); process.exitCode = error.code?.startsWith('ERR_PARSE_ARGS') ? 2 : 1; });
}
