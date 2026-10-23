#!/usr/bin/env node
// Standalone setup file: only Node built-ins; never memory/checkout authority. `install`, the default, signs in,
// downloads the project here when the app hands it over, and says what works. The app fills in SERVED_FROM.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, lstatSync, readdirSync, realpathSync, existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Blank in the project's own copy. The app fills it in when it serves this file: setup-file.ts
const SERVED_FROM = '';
const SELF = fileURLToPath(import.meta.url);

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
// A call's answer may reach an action's largest output, 4 MB, with room to spare, and wait out its longest 60 s.
const MAX_ANSWER = 8 * MAX_RESPONSE, ANSWER_WAIT = 75000;
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
/** What the assistant reads when sign-in needs the person: `loginUrl` checked the link, so it is theirs to see. */
export const signInNotice = link => `Show this link to the person now and wait while they sign in with their own company account. It is safe to show: this business's checked sign-in address, not a credential.\n${link}`;
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
export function employeeToken(output) {
  const matches = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  const token = matches.at(-1);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (!payload.email || typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000) throw new Error();
  } catch { throw new Error('Employee session is absent or expired; use company login.'); }
  return token;
}
export async function responseJson(response, limit = MAX_RESPONSE) {
  const reader = response.body?.getReader();
  let text = '', bytes = 0;
  const decoder = new TextDecoder();
  if (reader) try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > limit) throw new Error('Company response exceeds its bound');
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
// Git as a child process. A `token` goes to `address` alone, as a header in its environment, never an argument or file;
// an address alone is the copy's own helper's to answer. No redirect, no prompt, and Git's messages are never printed.
export function git(args, { address, token } = {}) {
  const config = [...(address && !token ? [] : [['credential.helper', '']]), ['http.followRedirects', 'false'],
    ...(token ? [[`http.${address}.extraHeader`, `cf-access-token: ${token}`]] : [])];
  const env = { ...cleanEnvironment(), GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: String(config.length),
    ...Object.fromEntries(config.flatMap(([key, value], index) => [[`GIT_CONFIG_KEY_${index}`, key], [`GIT_CONFIG_VALUE_${index}`, value]])) };
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', () => reject(new Error(missing('Git', 'https://git-scm.com/downloads'))));
    child.on('close', code => resolve({ code, stdout: stdout.trim(), stderr }));
  });
}
/** The copy's own Git asks the helper beside this file for the sign-in, at the app's address alone. The empty entry
 *  first stops a computer-wide helper, which would store the sign-in. */
async function useHelper(here, dir, address) {
  const scope = `credential.${address.replace(/\/$/, '')}`;
  const helper = `!"${process.execPath}" "${join(dir, 'scripts', 'company-git-credential.mjs')}"`;
  for (const args of [['--replace-all', `${scope}.helper`, ''], ['--add', `${scope}.helper`, helper], [`${scope}.useHttpPath`, 'true']]) await here(['config', ...args]);
}
// Put the project in `folder`, or update the copy there. `self`, a downloaded setup file, goes first: Git refuses a
// non-empty folder. An update moves the default branch forward only when nothing changed; it never resets or forces.
export async function projectCopy({ address, folder, token, self, run = git }) {
  const dir = resolve(folder);
  const here = (args, session) => run(['-C', dir, ...args], session);
  // The app must answer with the project itself first. A sign-in page or a redirect lists no branch, and Git
  // would take that for an empty project.
  const reached = async () => {
    if ((await run(['ls-remote', '--quiet', '--exit-code', address, 'HEAD'], { address, token })).code !== 0) throw new Error(REFUSED);
  };
  if (!existsSync(join(dir, '.git'))) {
    if (existsSync(dir) && readdirSync(dir).some(name => join(realpathSync(dir), name) !== self)) throw new Error(`${dir} already holds other files. Choose an empty folder with --dir; nothing was changed.`);
    await reached();
    if (self) rmSync(self, { force: true });
    if ((await run(['clone', '--quiet', '--origin', 'origin', address, dir], { address, token })).code !== 0) throw new Error(REFUSED);
    await useHelper(here, dir, address);
    return { project: 'installed', folder: dir };
  }
  if ((await here(['config', '--get', 'remote.origin.url'])).stdout !== address) throw new Error(`${dir} holds a different project. Choose an empty folder with --dir; nothing was changed.`);
  await reached();
  if ((await here(['fetch', '--quiet', 'origin'], { address, token })).code !== 0) throw new Error(REFUSED);
  await useHelper(here, dir, address);
  const said = async (...args) => (await here(args)).stdout;
  const latest = await said('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
  const branch = await said('symbolic-ref', '--quiet', '--short', 'HEAD');
  const changed = await said('status', '--porcelain', '--untracked-files=no');
  const applied = latest === `origin/${branch}` && !changed && (await here(['merge', '--quiet', '--ff-only', latest])).code === 0;
  return applied ? { project: 'up to date', folder: dir } : { project: NOT_APPLIED, folder: dir, applied: false };
}
/** The app's address a project copy records for itself. */
const recorded = root => readJson(join(root, '.claude', '.wong-stack.json')).components?.companyApi?.origin;
/** The app a copy's memory runs on: an older install, and the source repo, record only that address. */
const memoryApp = root => { try { return companyOrigin(new URL(readJson(join(root, '.claude', '.wong-stack.json')).components?.memory?.worker).origin); } catch { return undefined; } };
/** The main copy a workspace's copy belongs to, read from its `.git` file; a main copy has no such file. */
function mainCopy(root) {
  try {
    const gitdir = resolve(root, /^gitdir: (.+)$/m.exec(readFileSync(join(root, '.git'), 'utf8'))[1].trim());
    return dirname(resolve(gitdir, readFileSync(join(gitdir, 'commondir'), 'utf8').trim()));
  } catch { return undefined; }
}
/** The project copy this file sits in as `scripts/employee-bootstrap.mjs`; a downloaded file sits in none. */
export function ownCopy(self = SELF) {
  const root = resolve(dirname(self), '..');
  return self === join(root, 'scripts', 'employee-bootstrap.mjs') && existsSync(join(root, '.git')) ? root : undefined;
}
/** True when `folder` is a copy of the project that came from somewhere other than the app: it updates its own way. */
export async function otherCopy(folder, address, run = git) {
  return existsSync(join(folder, '.git')) && existsSync(join(folder, 'scripts', 'employee-bootstrap.mjs')) &&
    (await run(['-C', folder, 'config', '--get', 'remote.origin.url'])).stdout !== address;
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
  const keyed = path => join(homedir(), '.local', 'state', 'wong-company', createHash('sha256').update(path).digest('hex'));
  const own = keyed(root), signedIn = state => readJson(join(state, 'target.json')).origin;
  let dir = stateDir || own;
  let file = join(dir, 'target.json'), signIn;
  const record = () => recorded(root);
  // The copy's app: the company origin it records, else the origin its memory runs on.
  const app = () => record() || memoryApp(root);
  // Setup and `login` save the sign-in by origin, so every copy of the project finds it through the app it records.
  function installed() {
    try { const state = installState(app()); return signedIn(state) === companyOrigin(app()) ? state : undefined; } catch { return undefined; }
  }
  // A main copy signed in before `login` kept the app's folder holds the sign-in in its own: a workspace borrows it.
  function borrowed() {
    const main = mainCopy(root);
    try { return main && signedIn(keyed(main)) === companyOrigin(app()) ? keyed(main) : undefined; } catch { return undefined; }
  }
  // A recorded company origin uses the app's sign-in when there is one. Otherwise a copy uses its own sign-in when it
  // has one, such as a preview check's, then the app's, then its main copy's.
  function directory() {
    if (!stateDir) dir = connectionState(root, routesDir) || (record() && installed()) || (signedIn(own) ? own : installed() || borrowed()) || own;
    file = join(dir, 'target.json'); return dir;
  }
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
    // A person needs longer than a token read. No link shown means the computer's existing sign-in was used.
    if (login) { signIn = 'reused'; await run(['login', origin], { onLoginUrl: link => { signIn = 'new'; onLoginUrl(link); }, timeoutMs: 600000 }); }
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
      response = await request(new URL(path, origin), { ...init, redirect: 'manual', headers: { 'cf-access-token': credential, ...init.headers }, signal: AbortSignal.timeout(business ? ANSWER_WAIT : 20000) });
    } catch {
      throw new Error(business ? `Company call did not complete; its outcome may be unknown. Do not automatically repeat it.${business.check}` : 'Company discovery is unreachable; no business action was called.');
    }
    if (response.status >= 300 && response.status < 400) throw new Error('Company redirect refused; use company login.');
    if (response.status === 401 || response.status === 403) throw new Error('Company session expired or access was denied; use the employee’s own login.');
    let value;
    try { value = await responseJson(response, business ? MAX_ANSWER : MAX_RESPONSE); }
    catch { throw new Error(business ? `Company response did not complete; its outcome may be unknown. Do not automatically repeat the action.${business.check}` : 'Company discovery did not complete; no business action was called.'); }
    // Headers/session values must never become agent context, even on a bad server response.
    if (JSON.stringify(value).includes(credential)) throw new Error('Company response contained authentication material');
    if (!response.ok && !value.error) throw new Error(`Company request failed (HTTP ${response.status})`);
    return { value, status: response.status };
  }
  async function login(origin) {
    safeCache(directory(), root);
    const chosen = companyOrigin(origin || app());
    // Setup's saved sign-in serves this copy's git updates too: another company never overwrites it. A copy known
    // only by its memory keeps a sign-in to another address, such as a preview, in its own folder.
    if (!stateDir && dir === installed() && chosen !== companyOrigin(app())) {
      if (record()) throw new Error(`This copy belongs to ${companyOrigin(record())}; sign in to another company with --state <private directory>`);
      safeCache(dir = own, root); file = join(dir, 'target.json');
    }
    // A workspace signs in for itself and the app, never into its main copy's folder.
    if (!stateDir && dir === borrowed()) { safeCache(dir = own, root); file = join(dir, 'target.json'); }
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
    const saved = `${JSON.stringify({ origin: chosen, installedOrigin: record() || null, ...(identity && { identity }) })}\n`;
    writeFileSync(file, saved, { mode: 0o600 });
    // One sign-in per app per computer: the app's folder gains it too, so a workspace's copy finds it with no login.
    if (!stateDir && dir === own && app() && chosen === companyOrigin(app()) && !installed()) {
      safeCache(installState(chosen), root); writeFileSync(join(installState(chosen), 'target.json'), saved, { mode: 0o600 });
    }
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
  async function code(folder, copy = projectCopy, self) {
    const origin = target();
    return copy({ address: `${origin}${CODE_PATH}`, folder, token: await session(origin), ...(self && { self }) });
  }
  /** Git in the copy at `cwd`, against the app, with the copy's own helper; a copy from elsewhere is refused first. */
  async function projectGit(args, cwd, runGit = git) {
    const address = `${target()}${CODE_PATH}`;
    if ((await runGit(['-C', cwd, 'config', '--get', 'remote.origin.url'])).stdout !== address) throw new Error('This copy did not come from the connected company; nothing was sent.');
    return runGit(['-C', cwd, ...args], { address });
  }
  /** One call to memory with the same sign-in: whether it answers this person. */
  async function memory(origin) {
    try {
      const response = await request(new URL('/_memory/caller', origin), { redirect: 'manual', headers: { 'cf-access-token': await session(origin) }, signal: AbortSignal.timeout(20000) });
      await response.body?.cancel();
      return response.ok ? 'works' : 'not reachable yet';
    } catch { return 'not reachable yet'; }
  }
  // One step: sign in, then look at `folder`. A copy from elsewhere is left as it is; otherwise download or update
  // the project when the app hands it to this person. Either way, say what works.
  async function install(origin, folder, copy, self, other = otherCopy) {
    const { connected } = await login(origin);
    const status = await setup();
    const titles = status.apps.map(app => status.titles?.[app] ?? app);
    const report = { connected, signedInAs: status.identity.email, signIn, apps: status.apps, memory: await memory(connected), state: dir };
    const done = (result, found = true) => ({ ...result, summary: summary(result, titles, found) });
    if (await other(resolve(folder), `${connected}${CODE_PATH}`)) return done({ ...report, project: 'already on this computer; left as it is', folder: resolve(folder) });
    if (status.code !== 'ready') return done({ ...report, project: status.code === 'lacked' ? 'not included. Ask your admin for access to Connect your assistant.' : 'not handed out by this app; apps only' });
    const copied = await code(folder, copy, self);
    return done({ ...report, ...copied }, finds(copied.folder));
  }
  /** Whether the project's own tools, run in `folder` with no option, reach the sign-in just saved. */
  function finds(folder) {
    try { return companyClient({ root: folder, routesDir, cacheDir }).stateDirectory === directory(); } catch { return false; }
  }
  return { login, list, describe, call, setup, code, install, target, git: projectGit, http, get stateDirectory() { return directory(); } };
}
/** Setup's last words, for the assistant to repeat: who, which apps, memory, the project, and what is left. */
function summary({ signedInAs, signIn, memory, project, folder, applied }, titles, found) {
  const current = folder && ['installed', 'up to date'].includes(project);
  return [signIn === 'reused' ? `Used this computer's existing sign-in as ${signedInAs}.` : `Signed in as ${signedInAs}.`, titles.length ? `Apps that work: ${titles.join(', ')}.` : 'No apps yet: ask your admin.',
    memory === 'works' ? 'Memory works.' : 'Memory is not reachable yet; chats still work without it.',
    current ? `The project is in ${folder}, and new chats keep it up to date.` : `Project: ${project}${folder ? `, in ${folder}` : ''}.`,
    applied === false ? 'Your changes were kept, so the update waits.' : found ? 'Nothing else is needed.' : 'The project\'s own tools can\'t find this sign-in yet.'].join(' ');
}
const USAGE = 'employee-bootstrap.mjs [install] [--origin <HTTPS origin>] [--dir <folder>] | login --origin <HTTPS origin> | status | code --dir <folder> | list | describe <id> | call <id> --file <JSON file or -> [--state <private directory>]';
/** `install` keeps one private directory per company, so a second run finds the first. */
const installBase = () => join(homedir(), '.local', 'state', 'wong-company');
export const installState = origin => join(installBase(), createHash('sha256').update(companyOrigin(origin)).digest('hex'));
/** `install` and `code` run from any folder, the home folder included, so they work from an empty one. */
export function neutralRoot() {
  const root = join(installBase(), 'anywhere');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  return root;
}
// With no project on the device, a downloaded setup file is the person's client: keep a copy beside their
// sign-in, served from nowhere so it stays, and name where it is.
function keptClient(state) {
  const file = join(state, 'bootstrap.mjs');
  writeFileSync(file, readFileSync(SELF, 'utf8').replace(JSON.stringify(SERVED_FROM), "''"), { mode: 0o600 });
  return file;
}
// The command line. No command means `install`. Its app is `--origin`, else the one that served this file, else the
// copy's record; its folder is `--dir`, else that copy, else the folder it is run in.
async function run(args) {
  if (args.includes('--help')) { console.log(`usage: ${USAGE}`); return; }
  const { positionals: [command = 'install', ...rest], values } = parseArgs({ args, allowPositionals: true, options: Object.fromEntries(['origin', 'state', 'dir', 'file', 'q', 'app', 'limit', 'offset'].map(key => [key, { type: 'string' }])) });
  const install = command === 'install' && !rest.length, project = ownCopy();
  const origin = values.origin || SERVED_FROM || (install && project ? recorded(project) : undefined);
  if (install && !origin) throw new Error(USAGE);
  const stateDir = values.state || (install ? installState(origin) : undefined);
  const client = companyClient({ ...(['install', 'code'].includes(command) && { root: neutralRoot() }), stateDir, onLoginUrl: link => console.error(signInNotice(link)) });
  let result;
  if (command === 'login' && !rest.length) result = await client.login(origin);
  else if (install) {
    result = await client.install(origin, values.dir || project || process.cwd(), undefined, SERVED_FROM && SELF);
    if (SERVED_FROM && !result.folder) result.client = keptClient(result.state);
  }
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
/** A downloaded setup file removes itself when it ends, pass or fail; the project's own copy stays. */
export async function main(args = process.argv.slice(2)) {
  try { await run(args); }
  finally { if (SERVED_FROM) rmSync(SELF, { force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof SyntaxError ? 'Invalid command input' : error.message); process.exitCode = error.code?.startsWith('ERR_PARSE_ARGS') ? 2 : 1; });
}
