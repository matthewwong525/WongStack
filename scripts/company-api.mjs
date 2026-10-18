#!/usr/bin/env node
// Installed memory remains independent of standalone employee company transport.
import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { primaryRoot } from '../.agents/skills/memory/scripts/lib/primary-root.mjs';
import { isMain, parseCli } from './lib-cli.mjs';
import { memoryOperations, callMemory } from '../.agents/skills/memory/scripts/operations.mjs';
import { selectOperations, parseOperationInput } from '../.agents/skills/memory/scripts/lib/operations.mjs';
import { companyClient as transport, signInNotice } from './employee-bootstrap.mjs';
export { companyOrigin, cloudflared, loginUrl } from './employee-bootstrap.mjs';
export function companyClient(options = {}) { return transport({ root: options.root || primaryRoot().root, onboarding: false, ...options }); }
const CHECKOUT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function combinedList(client, { scope = 'all', ...filters } = {}) {
  // An option nobody gave is left out, never sent as the word "undefined".
  filters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
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

/** One line per match, then where the next page starts. */
export function listLines({ actions, next }) {
  const lines = actions.map(({ operationId, effect, readiness, summary }) => `${operationId}  ${effect === 'read' ? 'read' : 'change'}  ${readiness}  ${summary}`);
  return [...(lines.length ? lines : ['No matches.']), ...(next === null || next === undefined ? [] : [`next: --offset ${next}`])];
}

/** A key gains its notes page in this checkout, whether written yet or not; the app can't see the checkout. */
const noted = (key, root) => (/^[a-z0-9][a-z0-9-]*$/.test(key.id)
  ? { ...key, notes: { path: `wiki/services/${key.id}.md`, exists: existsSync(join(root, 'wiki', 'services', `${key.id}.md`)) } } : key);
/** Each service gains its notes page. */
export function withNotes(answer, root = CHECKOUT) {
  return { ...answer, services: answer.services.map(service => noted(service, root)) };
}
/** Each key a described action uses gains its notes page. A memory operation lists no keys and is left as it is. */
export function withKeyNotes(operation, root = CHECKOUT) {
  return Array.isArray(operation?.keys) ? { ...operation, keys: operation.keys.map(key => noted(key, root)) } : operation;
}
const LEVELS = { read: 'Read', write: 'Read & write' };
function serviceState(service) {
  if (!service.level) return 'needs access: ask the owner';
  return service.ready ? `ready  ${LEVELS[service.level] ?? service.level}` : 'not saved yet: ask the owner';
}
const notesLine = ({ notes, docs }) => `  notes: ${notes.exists ? notes.path : `none yet; start ${notes.path}`}${docs ? `  guide: ${docs}` : ''}`;
/** The services list as a chat reads it: one line per service, its notes page, and the keys left out. */
export function serviceLines({ services, needAccess = 0 }) {
  const width = key => Math.max(0, ...services.map(service => String(service[key] ?? '').length));
  const lines = services.flatMap(service => [
    [service.name.padEnd(width('name')), String(service.purpose ?? '').padEnd(width('purpose')), serviceState(service)].join('  '),
    ...(service.notes ? [notesLine(service)] : [])]);
  if (needAccess && !services.some(service => !service.level)) lines.push(`${needAccess} more key${needAccess === 1 ? ' needs' : 's need'} access: ask the owner`);
  return lines.length ? lines : ['No services yet.'];
}

// A long answer goes whole to a private file and the chat sees its start, so one call can't fill the chat.
export const ANSWER_LIMIT = 20480;
const PREVIEW = 4096, DAY = 86400000;
export const answersDir = () => join(tmpdir(), `wong-answers-${process.getuid?.() ?? userInfo().username}`);
export function saveAnswer(text, dir = answersDir(), now = Date.now()) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const folder = lstatSync(dir);
  if (!folder.isDirectory() || (process.getuid && (folder.uid !== process.getuid() || folder.mode & 0o077))) throw new Error(`${dir} is not a private folder`);
  for (const name of readdirSync(dir)) {
    const old = lstatSync(join(dir, name));
    if (old.isFile() && now - old.mtimeMs > DAY) rmSync(join(dir, name), { force: true });
  }
  const file = join(dir, `${now}-${randomBytes(4).toString('hex')}.json`);
  writeFileSync(file, `${text}\n`, { mode: 0o600, flag: 'wx' });
  return file;
}
export function shortAnswer(text, dir) {
  const bytes = Buffer.byteLength(text);
  if (bytes <= ANSWER_LIMIT) return text;
  const preview = Buffer.from(text).subarray(0, PREVIEW).toString('utf8').replace(/�+$/, '');
  return JSON.stringify({ truncated: true, bytes, file: saveAnswer(text, dir), preview }, null, 2);
}

// An ended or refused sign-in names the one step that gets a new one: login prints the link to show the person.
const SIGNED_OUT = /session (?:is absent or )?expired|access was denied/i;
export const SIGN_IN_AGAIN = 'Sign in again: run `node scripts/company-api.mjs login`, which prints a link to show the person.';
const USAGE = `usage: company-api.mjs <command> [--state <private directory>]
  login [--origin <HTTPS origin>]
  services [--all] [--json]          the services you can use, and how ready each is
  list [--scope all|company|memory] [--q words] [--app name] [--limit 1..50] [--offset n] [--json]
  describe <id> [--json]
  call <id> --file <JSON file or -> [--full]
call prints at most 20 KB; a longer answer is saved to a private file it names. --full prints it all.`;

async function services(client, values) {
  const { value } = await client.http(`/api/services${values.all ? '?all=1' : ''}`);
  if (value.error) throw new Error(value.error.message || 'The app could not list its services; it may need an update.');
  if (!Array.isArray(value.services)) throw new Error('Invalid services list');
  const answer = withNotes(value);
  console.log(values.json ? JSON.stringify(answer, null, 2) : serviceLines(answer).join('\n'));
}

function printCall(id, result, values) {
  const packet = ['memory.documents', 'memory.recall'].includes(id);
  const text = JSON.stringify(result, null, packet ? undefined : 2);
  // A returned error is printed whole, and ends as a failure a script can see.
  if (result.error && typeof result.error === 'object') {
    console.log(text);
    process.exitCode = 1;
    return;
  }
  let output = text;
  if (!values.full) try { output = shortAnswer(text); } catch (error) { console.error(`${error.message}, so the whole answer follows.`); }
  console.log(output);
}

if (isMain(import.meta.url)) {
  const { positionals: [command, id, ...extra], values } = parseCli({ usage: USAGE, allowPositionals: true, options: {
    ...Object.fromEntries(['origin', 'state', 'scope', 'q', 'app', 'limit', 'offset', 'file'].map(name => [name, { type: 'string' }])),
    ...Object.fromEntries(['all', 'json', 'full'].map(name => [name, { type: 'boolean' }])) } });
  try {
    if (extra.length) throw new Error(USAGE);
    const client = companyClient({ stateDir: values.state, onLoginUrl: link => console.error(signInNotice(link)) });
    const input = () => parseOperationInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8'));
    if (command === 'services') await services(client, values);
    else {
      let result;
      if (command === 'login') result = await client.login(values.origin);
      else if (command === 'list') result = await combinedList(client, { scope: values.scope, q: values.q, app: values.app, limit: values.limit === undefined ? 20 : Number(values.limit), offset: values.offset === undefined ? 0 : Number(values.offset) });
      else if (command === 'describe') result = id?.startsWith('memory.') ? memoryOperations.find(operation => operation.operationId === id) : withKeyNotes(await client.describe(id));
      else if (command === 'call') result = id?.startsWith('memory.') ? await callMemory(id, input()) : await client.call(id, input());
      else throw new Error(USAGE);
      if (!result) throw new Error('Unknown operation');
      if (result.companyStatus?.startsWith('unavailable')) console.error(`Company actions are missing: not signed in. ${SIGN_IN_AGAIN}`);
      // The shared error shape is the same for every action, so a short description leaves it out.
      const { errorSchema: _shared, ...brief } = result;
      if (command === 'call') printCall(id, result, values);
      else if (command === 'list' && !values.json) console.log(listLines(result).join('\n'));
      else if (command === 'describe' && !values.json) console.log(JSON.stringify(brief));
      else console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) { console.error(command !== 'login' && SIGNED_OUT.test(error.message) ? `${error.message}\n${SIGN_IN_AGAIN}` : error.message); process.exitCode = 1; }
}
