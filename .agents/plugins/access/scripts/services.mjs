#!/usr/bin/env node
// The services helper, through the app as this computer's person: skills/services/SKILL.md. A project with its own
// helper runs these through `runServices` with its own client (WongStack: scripts/company-api.mjs).
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { accessClient } from './lib/client.mjs';
import { sealedBody } from './lib/seal-keys.mjs';
import { SLOTS, apiCommand, callCount, layout, missingPlace, notesPage, record, refresh } from './lib/services.mjs';

/** The repo this folder is installed in: .agents/skills/access/scripts is four folders down. */
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const COMMANDS = ['services', 'api', 'record', 'key', 'tool'];
/** What a project with no place named for its services' records is told to fill. */
export const KEYS_UNSET = `The keys are not set up yet: give the app's Access slots \`keys\` and \`secret\`, and add "definitions" to ${SLOTS}. See .claude/skills/access/references/setup.md#8-keys-for-services.`;
export const usage = helper => `usage: ${helper} <command>
  services [--all] [--json]          the services you can use, and how ready each is
  api <key> [<call>]                 a service's calls, or how we use one; api company: the app's own
  record <key> <name> --file -       save a look-up through <key>.read as an example, and add its call
  record <key> <name> --last         save the last change made, never sending it again
  record --refresh [<key>]           ask each saved look-up again; the check names what no longer fits
  tool add <id> --file <JSON or ->   add a tool to the live app, owner or Admin: wiki/stack/connect-your-tools.md
  tool remove <id>
  key send <NAME> --value-stdin      seal a key read from stdin with the app's public key, here, and send it to the
                                     live app, owner or Admin; it goes live at the next publish
  key send <NAME> --sealed-file <file or ->   send a key sealed already, as {"sealed":{...},"ends":"abcd"}`;

/** Each service gains its notes page, and one used directly the number of calls its definition holds. */
export function withNotes(answer, root = REPO) {
  return { ...answer, services: answer.services.map(service => {
    const notes = notesPage(root, service.id);
    return { ...service, ...(notes && { notes }), ...(service.direct && /^[a-z][a-z0-9-]*$/.test(service.id) && layout(root).definitions && { calls: callCount(root, service.id) }) };
  }) };
}
const LEVELS = { read: 'Read', write: 'Read & write' };
function serviceState(service) {
  if (!service.level) return 'needs access: ask the owner';
  return service.ready ? `ready  ${LEVELS[service.level] ?? service.level}` : 'not saved yet: ask the owner';
}
const notesLine = ({ notes, docs }) => `  notes: ${notes.exists ? notes.path : `none yet; start ${notes.path}`}${docs ? `  guide: ${docs}` : ''}`;
/** The services list as a chat reads it: one line per service, its notes page, and the keys left out. */
export function serviceLines({ services, needAccess = 0 }, helper = layout(REPO).helper) {
  const width = key => Math.max(0, ...services.map(service => String(service[key] ?? '').length));
  const lines = services.flatMap(service => [
    [service.name.padEnd(width('name')), String(service.purpose ?? '').padEnd(width('purpose')), serviceState(service)].join('  '),
    ...(service.notes ? [notesLine(service)] : []), ...(service.calls === undefined ? [] : [`  calls: ${service.calls} · ${helper} api ${service.id}`])]);
  if (needAccess && !services.some(service => !service.level)) lines.push(`${needAccess} more key${needAccess === 1 ? ' needs' : 's need'} access: ask the owner`);
  return lines.length ? lines : ['No services yet.'];
}

/** Adds or removes a tool kept in the app's data, with no publish. The app checks the entry and who asks. */
async function toolCommand(client, action, [id, ...rest], input, wrong) {
  if (!['add', 'remove'].includes(action) || !/^[a-z][a-z0-9-]*$/.test(id ?? '') || rest.length) throw wrong();
  const origin = client.target();
  const init = action === 'add' ? { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input()) }
    : { method: 'DELETE', headers: { Origin: origin } };
  const { value } = await client.http(`/api/access/tools/${id}`, init, origin, undefined, { check: ' Check with `services --all` before repeating.' });
  return value;
}

/** Sends one key to the live app, sealed here with the app's public key, or sealed already. The app checks the name
 *  and who asks. */
async function keyCommand(client, action, [name, ...rest], values, wrong) {
  if (action !== 'send' || !/^[A-Z][A-Z0-9_]*$/.test(name ?? '') || rest.length || Boolean(values['value-stdin']) === (values['sealed-file'] !== undefined)) throw wrong();
  const { body, refused } = await sealedBody(client, name, { valueStdin: values['value-stdin'], sealedFile: values['sealed-file'] });
  if (refused) return refused;
  const origin = client.target();
  const { value } = await client.http(`/api/access/keys/${name}`, { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    origin, undefined, { check: ' Check with `services --all` before repeating.' });
  return value;
}

/** A refusal is printed whole, and ends as a failure a script can see. */
function printed(value) {
  console.log(JSON.stringify(value, null, 2));
  if (value?.error && typeof value.error === 'object') process.exitCode = 1;
}

/** One command, parsed already: `command`, `args` (the words after it) and `values` (its options). `input()` reads
 *  `--file`. Prints the answer; a failure sets the exit code. */
export async function runServices({ command, args = [], values = {} }, { client, root = REPO, input } = {}) {
  const where = layout(root);
  const wrong = () => new Error(usage(where.helper));
  const [id, ...extra] = args;
  input ??= () => { try { return JSON.parse(readFileSync(values.file === '-' ? 0 : values.file, 'utf8')); } catch { throw new Error('Invalid JSON input; use a JSON file or stdin'); } };
  if (!COMMANDS.includes(command)) throw wrong();
  if (command === 'services') {
    if (args.length) throw wrong();
    // No place named for the keys' records: the keys are not set up, so nothing asks an app that may not be there.
    if (missingPlace(root)) { console.log(KEYS_UNSET); return; }
    const { value } = await client.http(`/api/services${values.all ? '?all=1' : ''}`);
    if (value.error) throw new Error(value.error.message || 'The app could not list its services; it may need an update.');
    if (!Array.isArray(value.services)) throw new Error('Invalid services list');
    const answer = withNotes(value, root);
    console.log(values.json ? JSON.stringify(answer, null, 2) : serviceLines(answer, where.helper).join('\n'));
  } else if (command === 'api') {
    if (extra.length > 1) throw wrong();
    if (id !== 'company' && missingPlace(root)) throw new Error(missingPlace(root));
    console.log(await apiCommand(client, root, id, extra[0]));
  } else if (command === 'record') {
    if (missingPlace(root)) throw new Error(missingPlace(root));
    if (values.refresh) {
      if (extra.length) throw wrong();
      const { text, ok } = await refresh(client, root, id);
      console.log(text);
      if (!ok) process.exitCode = 1;
      return;
    }
    if (extra.length !== 1 || Boolean(values.last) === (values.file !== undefined)) throw wrong();
    console.log(await record(client, root, id, extra[0], { input: values.last ? undefined : input(), last: values.last }));
  } else if (command === 'tool') printed(await toolCommand(client, id, extra, input, wrong));
  else printed(await keyCommand(client, id, extra, values, wrong));
}

const main = () => { try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; } };
if (main()) {
  const helper = layout(REPO).helper;
  let parsed;
  try {
    parsed = parseArgs({ allowPositionals: true, options: { file: { type: 'string' }, 'sealed-file': { type: 'string' },
      ...Object.fromEntries(['all', 'json', 'last', 'refresh', 'value-stdin', 'help'].map(name => [name, { type: 'boolean' }])) } });
  } catch (error) { console.error(`${error.message}\n\n${usage(helper)}`); process.exit(2); }
  const { positionals: [command, ...args], values } = parsed;
  if (values.help || !command) console.log(usage(helper));
  else {
    try { await runServices({ command, args, values }, { client: accessClient({ root: REPO }) }); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
