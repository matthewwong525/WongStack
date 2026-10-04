#!/usr/bin/env node
// Employee company calls and installed memory reads have separate credentials/targets.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, lstatSync, readdirSync, realpathSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { primaryRoot } from '../.agents/skills/memory/scripts/lib/primary-root.mjs';
import { isMain, parseCli } from './lib-cli.mjs';
import { memoryOperations, callMemory } from '../.agents/skills/memory/scripts/operations.mjs';
import { selectOperations, refuseExternalReferences, parseOperationInput } from '../.agents/skills/memory/scripts/lib/operations.mjs';

const MAX_RESPONSE = 1048576;
export function companyOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Use the company’s HTTPS origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use the company’s HTTPS origin without a path');
  return url.origin;
}
function readJson(file) { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } }
function privateDirectory(dir, root) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const resolved = realpathSync(dir);
  const checkout = realpathSync(root);
  if (resolved === checkout || resolved.startsWith(`${checkout}/`)) throw new Error('Company login state must be outside the checkout');
  for (let parent = resolved; dirname(parent) !== parent; parent = dirname(parent)) {
    if (existsSync(join(parent, '.git'))) throw new Error('Company login state must be outside any checkout');
  }
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || (process.getuid && stat.uid !== process.getuid()) || (stat.mode & 0o077)) throw new Error('Company login state must be owned by this user and private (directory mode 0700)');
}
function safeCache(dir, root) {
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
    const child = spawn('cloudflared', ['access', ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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
    child.on('error', () => { clearTimeout(timer); reject(new Error('Install cloudflared using wiki/development/required-tools.md, then use company login. No key is needed.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || size > MAX_RESPONSE) reject(new Error('Company sign-in did not complete. Use the employee’s browser or the private browser hand-over procedure.'));
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
async function responseJson(response) {
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

export function companyClient({ root = primaryRoot().root, stateDir, cacheDir = join(homedir(), '.cloudflared'),
  run = cloudflared, request = fetch, onLoginUrl = () => {} } = {}) {
  const dir = stateDir || join(homedir(), '.local', 'state', 'wong-company', createHash('sha256').update(root).digest('hex'));
  const file = join(dir, 'target.json');
  const record = () => readJson(join(root, '.claude', '.wong-stack.json')).components?.companyApi?.origin;
  function target() {
    safeCache(dir, root);
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
  async function http(path, init = {}, origin = target(), suppliedToken, businessCall = false) {
    if (!/^\/(?:api\/|apps\/)[^#]*$/.test(path) || new URL(path, origin).origin !== origin) throw new Error('Refused an arbitrary server URL');
    const credential = suppliedToken || await token(origin);
    let response;
    try {
      response = await request(new URL(path, origin), { ...init, redirect: 'manual', headers: { 'cf-access-token': credential, ...init.headers }, signal: AbortSignal.timeout(20000) });
    } catch {
      throw new Error(businessCall ? 'Company call did not complete; its outcome may be unknown. Do not automatically repeat it.' : 'Company discovery is unreachable; no business action was called.');
    }
    if (response.status >= 300 && response.status < 400) throw new Error('Company redirect refused; use company login.');
    if (response.status === 401 || response.status === 403) throw new Error('Company session expired or access was denied; use the employee’s own login.');
    let value;
    try { value = await responseJson(response); }
    catch { throw new Error(businessCall ? 'Company response did not complete; its outcome may be unknown. Do not automatically repeat the action.' : 'Company discovery did not complete; no business action was called.'); }
    // Headers/session values must never become agent context, even on a bad server response.
    if (JSON.stringify(value).includes(credential)) throw new Error('Company response contained authentication material');
    if (!response.ok && !value.error) throw new Error(`Company request failed (HTTP ${response.status})`);
    return { value, status: response.status };
  }
  async function login(origin) {
    safeCache(dir, root);
    const chosen = companyOrigin(origin || record());
    const credential = await token(chosen, true);
    const probe = await http('/api/actions?limit=1', {}, chosen, credential);
    if (probe.status !== 200 || !Array.isArray(probe.value.actions)) throw new Error('Company discovery is unavailable; the target was not connected');
    writeFileSync(file, `${JSON.stringify({ origin: chosen, installedOrigin: record() || null })}\n`, { mode: 0o600 });
    return { connected: chosen };
  }
  async function describe(id) {
    const { value } = await http(`/api/actions?id=${encodeURIComponent(id)}`);
    refuseExternalReferences(value);
    if (['servers', 'command', 'args', 'adapter', 'executable'].some(key => Object.hasOwn(value, key)) || value.operationId !== id || id.startsWith('memory.') || value.source !== 'company' || value.transport !== 'http' ||
      !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(value.method) || !['none', 'query', 'json'].includes(value.encoding) ||
      typeof value.path !== 'string' || !/^\/(?:api\/[A-Za-z0-9/_-]+|apps\/[a-z0-9-]+\/api\/[A-Za-z0-9/_-]+)$/.test(value.path)) throw new Error('Invalid live company operation');
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
    return (await http(path, init, target(), undefined, true)).value;
  }
  return { login, list, describe, call };
}

export async function combinedList(client, { scope = 'all', ...filters } = {}) {
  if (!['all', 'company', 'memory'].includes(scope)) throw new Error('Use company, memory or all scope');
  const { limit = 20, offset = 0 } = filters;
  const memory = selectOperations(memoryOperations, { ...filters, limit: 50, offset: 0 });
  // Validate requested bounds even when a company connection is absent.
  selectOperations([], { ...filters, limit, offset });
  if (scope === 'company') return client.list(filters);
  let company = { actions: [], total: 0, revision: null }, companyStatus = 'not_requested';
  if (scope === 'all') try {
    company = await client.list({ ...filters, limit, offset });
    companyStatus = 'available';
  } catch { companyStatus = 'unavailable; use company login'; }
  const memoryOffset = Math.max(0, offset - company.total);
  const actions = [...company.actions, ...memory.actions.slice(memoryOffset, memoryOffset + Math.max(0, limit - company.actions.length))];
  const total = company.total + memory.total;
  const ids = new Set();
  for (const item of actions) { if (ids.has(item.operationId)) throw new Error('Operation ID collision'); ids.add(item.operationId); }
  return { total, offset, next: offset + limit < total ? offset + limit : null, actions, companyStatus,
    revisions: { company: company.revision, memory: memoryOperations[0].revision } };
}
const USAGE = 'usage: company-api.mjs login [--origin <HTTPS origin>] | list [--scope all|company|memory] [--q words] [--app name] [--limit 1..50] [--offset n] | describe <id> | call <id> --file <JSON file or ->';
if (isMain(import.meta.url)) {
  const { positionals: [command, id, ...extra], values } = parseCli({ usage: USAGE, allowPositionals: true, options: Object.fromEntries(['origin', 'scope', 'q', 'app', 'limit', 'offset', 'file'].map(name => [name, { type: 'string' }])) });
  try {
    if (extra.length) throw new Error(USAGE);
    const client = companyClient({ onLoginUrl: link => console.error(`Sign in with your own company account: ${link}`) });
    let result;
    if (command === 'login') result = await client.login(values.origin);
    else if (command === 'list') result = await combinedList(client, { scope: values.scope, q: values.q, app: values.app, limit: values.limit === undefined ? 20 : Number(values.limit), offset: values.offset === undefined ? 0 : Number(values.offset) });
    else if (command === 'describe') result = id?.startsWith('memory.') ? memoryOperations.find(operation => operation.operationId === id) : await client.describe(id);
    else if (command === 'call') result = id?.startsWith('memory.') ? await callMemory(id, parseOperationInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8'))) : await client.call(id, parseOperationInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8')));
    else throw new Error(USAGE);
    if (!result) throw new Error('Unknown operation');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
