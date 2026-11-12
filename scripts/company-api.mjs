#!/usr/bin/env node
// Installed memory remains independent of standalone employee company transport. Memory and Access are modules:
// each loads only where it is added, so this helper runs in a project with neither.
import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { companyClient as transport, signInNotice } from './employee-bootstrap.mjs';
export { companyOrigin, cloudflared, loginUrl } from './employee-bootstrap.mjs';
const CHECKOUT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const added = path => existsSync(join(CHECKOUT, path));
const memory = added('.agents/memory/operations.mjs') ? {
  ...await import('../.agents/memory/operations.mjs'), ...await import('../.agents/memory/lib/operations.mjs'),
  ...await import('../.agents/skills/memory/scripts/lib/primary-root.mjs') } : null;
const access = added('.agents/skills/access/scripts/services.mjs')
  ? { ...await import('../.agents/skills/access/scripts/services.mjs'), ...await import('../.agents/skills/access/scripts/lib/services.mjs') } : null;
const NO_MEMORY = 'Memory is not added to this project.';
const NO_ACCESS = 'Access is not added to this project, so it has no services, api, record, tool or key commands.';
export function companyClient(options = {}) { return transport({ root: options.root || (memory ? memory.primaryRoot().root : CHECKOUT), onboarding: false, ...options }); }

/** Memory's own filter check, or the same bounds where memory is not added. */
function selectOperations(operations, filters) {
  if (memory) return memory.selectOperations(operations, filters);
  const { q = '', limit = 20, offset = 0 } = filters;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0 || q.length > 200) throw new Error('Invalid catalogue filter');
  return { actions: [], total: 0 };
}
const addedMemory = () => { if (!memory) throw new Error(NO_MEMORY); return memory; };

export async function combinedList(client, { scope = 'all', ...filters } = {}) {
  // An option nobody gave is left out, never sent as the word "undefined".
  filters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
  if (!['all', 'company', 'memory'].includes(scope)) throw new Error('Use company, memory or all scope');
  if (scope === 'memory') addedMemory();
  const { limit = 20, offset = 0 } = filters;
  const memoryList = selectOperations(memory?.memoryOperations ?? [], { ...filters, limit: 50, offset: 0 });
  // Validate requested bounds even when a company connection is absent.
  selectOperations([], { ...filters, limit, offset });
  if (scope === 'company') return client.list(filters);
  let company = { actions: [], total: 0, revision: null }, companyStatus = 'not_requested';
  if (scope === 'all') try {
    company = await client.list({ ...filters, limit, offset });
    companyStatus = 'available';
  } catch { companyStatus = 'unavailable; use company login'; }
  const memoryOffset = Math.max(0, offset - company.total);
  const actions = [...company.actions, ...memoryList.actions.slice(memoryOffset, memoryOffset + Math.max(0, limit - company.actions.length))];
  const total = company.total + memoryList.total;
  const ids = new Set();
  for (const item of actions) { if (ids.has(item.operationId)) throw new Error('Operation ID collision'); ids.add(item.operationId); }
  return { total, offset, next: offset + limit < total ? offset + limit : null, actions, companyStatus,
    revisions: { company: company.revision, memory: memory?.memoryOperations[0].revision ?? null } };
}

/** One line per match, then where the next page starts. */
export function listLines({ actions, next }) {
  const lines = actions.map(({ operationId, effect, readiness, summary }) => `${operationId}  ${effect === 'read' ? 'read' : 'change'}  ${readiness}  ${summary}`);
  return [...(lines.length ? lines : ['No matches.']), ...(next === null || next === undefined ? [] : [`next: --offset ${next}`])];
}

/** Each key a described action uses gains its notes page, where Access is added. A memory operation lists no keys. */
export function withKeyNotes(operation, root = CHECKOUT) {
  if (!access || !Array.isArray(operation?.keys)) return operation;
  return { ...operation, keys: operation.keys.map(key => { const notes = access.notesPage(root, key.id); return notes ? { ...key, notes } : key; }) };
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
  list [--scope all|company|memory] [--q words] [--app name] [--limit 1..50] [--offset n] [--json]
  describe <id> [--json]
  call <id> --file <JSON file or -> [--full]
${access ? access.usage('').split('\n').slice(1).join('\n') : `  ${NO_ACCESS}`}
call prints at most 20 KB; a longer answer is saved to a private file it names. --full prints it all.`;
const SERVICES = ['services', 'api', 'record', 'tool', 'key'];

function printCall(id, result, values) {
  const packet = ['memory.documents', 'memory.recall'].includes(id);
  const text = JSON.stringify(result, null, packet ? undefined : 2);
  // A returned error is printed whole, and ends as a failure a script can see.
  if (result.error && typeof result.error === 'object') {
    console.log(text);
    process.exitCode = 1;
    return;
  }
  printAnswer(text, values);
}

/** An answer, bounded unless `--full`; when it can't be saved aside, the whole answer follows the reason. */
function printAnswer(text, values) {
  let output = text;
  if (!values.full) try { output = shortAnswer(text); } catch (error) { console.error(`${error.message}, so the whole answer follows.`); }
  console.log(output);
}

/** After a direct call: keep a change for `record --last`, and say when its call isn't in the definition yet. */
function afterCall(id, input, result) {
  if (!access) return;
  const sent = input();
  access.keepLast(CHECKOUT, id, sent, result);
  const hint = access.notAddedHint(CHECKOUT, id, sent, result);
  if (hint) console.error(hint);
}
const once = value => () => value;
const parseInput = text => { try { return JSON.parse(text); } catch { throw new Error('Invalid JSON input; use a JSON file or stdin'); } };

// lib-cli.mjs's convention, written here: it lives in memory, which a project may not have added.
const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
function parseCli(options) {
  let parsed;
  try { parsed = parseArgs({ allowPositionals: true, options: { ...options, help: { type: 'boolean' } } }); }
  catch (error) { console.error(`${error.message}\n${USAGE}`); process.exit(2); }
  if (parsed.values.help) { console.log(USAGE); process.exit(0); }
  return parsed;
}

if (isMain()) {
  const { positionals: [command, id, ...extra], values } = parseCli({
    ...Object.fromEntries(['origin', 'state', 'scope', 'q', 'app', 'limit', 'offset', 'file'].map(name => [name, { type: 'string' }])),
    'sealed-file': { type: 'string' }, ...Object.fromEntries(['all', 'json', 'full', 'last', 'refresh', 'value-stdin'].map(name => [name, { type: 'boolean' }])) });
  try {
    if (extra.length && !SERVICES.includes(command)) throw new Error(USAGE);
    if (SERVICES.includes(command) && !access) throw new Error(NO_ACCESS);
    const client = companyClient({ stateDir: values.state, onLoginUrl: link => console.error(signInNotice(link)) });
    let input = () => parseInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8'));
    if (SERVICES.includes(command)) await access.runServices({ command, args: id === undefined ? [] : [id, ...extra], values }, { client, root: CHECKOUT, input });
    else {
      let result;
      if (command === 'login') result = await client.login(values.origin);
      else if (command === 'list') result = await combinedList(client, { scope: values.scope, q: values.q, app: values.app, limit: values.limit === undefined ? 20 : Number(values.limit), offset: values.offset === undefined ? 0 : Number(values.offset) });
      else if (command === 'describe') result = id?.startsWith('memory.') ? addedMemory().memoryOperations.find(operation => operation.operationId === id) : withKeyNotes(await client.describe(id));
      else if (command === 'call') {
        const sent = input();
        input = once(sent);
        result = id?.startsWith('memory.') ? await addedMemory().callMemory(id, sent) : await client.call(id, sent);
      }
      else throw new Error(USAGE);
      if (!result) throw new Error('Unknown operation');
      if (result.companyStatus?.startsWith('unavailable')) console.error(`Company actions are missing: not signed in. ${SIGN_IN_AGAIN}`);
      // The shared error shape is the same for every action, so a short description leaves it out.
      const { errorSchema: _shared, ...brief } = result;
      if (command === 'call') { printCall(id, result, values); afterCall(id, input, result); }
      else if (command === 'list' && !values.json) console.log(listLines(result).join('\n'));
      else if (command === 'describe' && !values.json) console.log(JSON.stringify(brief));
      else console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) { console.error(command !== 'login' && SIGNED_OUT.test(error.message) ? `${error.message}\n${SIGN_IN_AGAIN}` : error.message); process.exitCode = 1; }
}
