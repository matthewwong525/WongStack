#!/usr/bin/env node
// Saved details in `~/.wong-stack/details.json` (0600, clear, beside the logins); exit 0 ok · 1 failed · 2 usage.
// Only everyday answers the person gave in the chat save here; a card, password, or code never does.

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { AUTOFILL_TOKENS, LIMITS } from './form.mjs';

const USAGE = `usage: details.mjs list | save --name <name> --field <kind>=<value>... | forget <name> | forget --all
  list    each saved set: its name, hint, and kinds, then each value; prints DETAILS_SETS=<count> first
  save    keep an everyday answer the person gave in the chat and chose to keep, such as an email,
          a name, an address, or a phone; <kind> is an autofill name, like email or street-address;
          a card, a password, or a code never saves; prints DETAILS_SAVED=<name>
  forget  delete one set, or all; prints DETAILS_FORGOT=<name>,<name>`;
export const DETAILS_FILE = join(homedir(), '.wong-stack', 'details.json');
/** Kinds never saved: a card and a password go through private links, and a code dies in minutes. */
const NEVER_SAVED = /^cc-|password$|^one-time-code$/;
const NAME = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** The saved sets, or none yet; throws with its own reason, since a parser's message can quote the file.
 * A private set, a card an earlier version kept from a private form, is deleted from the file. */
export function readDetails(file = DETAILS_FILE) {
  if (!existsSync(file)) return [];
  let sets = null;
  try { sets = JSON.parse(readFileSync(file, 'utf8')); } catch { /* reported below */ }
  if (!Array.isArray(sets)) throw new Error('the saved details file can not be read');
  const everyday = sets.filter(set => !set?.private);
  if (everyday.length < sets.length) writeDetails(everyday, file);
  return everyday;
}

/** Replaces the file in one step, so a stopped write never leaves half a file. */
export function writeDetails(sets, file = DETAILS_FILE) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(dirname(file), 0o700);
  const partial = `${file}.${process.pid}.tmp`;
  writeFileSync(partial, `${JSON.stringify(sets, null, 2)}\n`, { mode: 0o600 });
  renameSync(partial, file);
}

/** What the agent calls a set: the labels it fills. */
export function hintOf(fields) {
  return fields.map(field => field.label).join(', ');
}

/** Saves `set` in place of any set of the same name, never beside it. Resolves to the set as saved. */
export function keepSet({ name, fields }, file = DETAILS_FILE) {
  const set = { name, hint: hintOf(fields), fields };
  writeDetails([...readDetails(file).filter(saved => saved.name !== name), set], file);
  return set;
}

/** Prints each set and its values. */
function list(file) {
  const sets = readDetails(file);
  console.log(`DETAILS_SETS=${sets.length}`);
  for (const set of sets) {
    console.log([set.name, set.hint, set.fields.map(field => field.kind).join(',')].join('\t'));
    for (const { kind, value } of set.fields) console.log(`  ${kind}=${value}`);
  }
}

/** `--field kind=value` pairs as fields, or a usage error: an autofill kind once each, a value on one line. */
function chatFields(pairs) {
  const fields = pairs.map(pair => {
    const [, kind, value] = /^([a-z0-9-]+)=(.*)$/.exec(pair) ?? [];
    if (!AUTOFILL_TOKENS.has(kind)) usageError(USAGE, `--field takes <kind>=<value> with an autofill kind, like email: '${pair.split('=')[0]}'`);
    if (NEVER_SAVED.test(kind)) usageError(USAGE, `${kind} is never saved: a card or a password goes through a private link each time`);
    if (!value.trim() || value.length > LIMITS.value || /[\r\n]/.test(value)) usageError(USAGE, `${kind} takes one line of up to ${LIMITS.value} characters`);
    return { kind, label: kind, value };
  });
  if (new Set(fields.map(field => field.kind)).size !== fields.length) usageError(USAGE, 'each kind goes once');
  return fields;
}

function save(name, pairs, file) {
  if (!NAME.test(name ?? '')) usageError(USAGE, '--name takes lowercase letters, digits, and dashes, like home-address');
  if (!pairs?.length) usageError(USAGE, 'save takes at least one --field');
  keepSet({ name, fields: chatFields(pairs) }, file);
  console.log(`DETAILS_SAVED=${name}`);
  return 0;
}

function forget(name, all, file) {
  if (Boolean(all) === Boolean(name)) usageError(USAGE, 'forget takes one name, or --all');
  const sets = readDetails(file);
  const gone = sets.filter(set => all || set.name === name);
  if (gone.length) writeDetails(sets.filter(set => !gone.includes(set)), file);
  console.log(`DETAILS_FORGOT=${gone.map(set => set.name).join(',')}`);
  return 0;
}

if (isMain(import.meta.url)) {
  const { values, positionals: [command, ...words] } = parseCli({ usage: USAGE, allowPositionals: true, options: { name: { type: 'string' }, field: { type: 'string', multiple: true }, all: { type: 'boolean' } } });
  const fits = { list: words.length === 0, save: words.length === 0, forget: words.length <= 1 }[command];
  if (!fits) usageError(USAGE, command ? `unknown command: ${[command, ...words].join(' ')}` : 'missing command');
  try {
    process.exitCode = { list: () => (list(DETAILS_FILE), 0), save: () => save(values.name, values.field, DETAILS_FILE), forget: () => forget(words[0], values.all, DETAILS_FILE) }[command]();
  } catch (error) {
    console.log(`DETAILS_ERROR=${error.message}`);
    process.exitCode = 1;
  }
}
