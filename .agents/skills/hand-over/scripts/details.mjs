#!/usr/bin/env node
// Saved details in `~/.wong-stack/details.json` (0600, clear, beside the logins); exit 0 ok · 1 failed · 2 usage.
// A private set came from a private form, and its values never print.

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { AUTOFILL_TOKENS, keepable, LIMITS } from './form.mjs';

const USAGE = `usage: details.mjs list | save --name <name> --field <kind>=<value>... | forget <name> | forget --all
  list    each saved set: its name, hint, and kinds, with the values of an everyday set only;
          prints DETAILS_SETS=<count> first
  save    keep an everyday answer the person gave in the chat and chose to keep, such as an email,
          a name, an address, or a phone; <kind> is an autofill name, like email or street-address;
          a card or a password never saves this way; prints DETAILS_SAVED=<name>
  forget  delete one set, or all; prints DETAILS_FORGOT=<name>,<name>`;
export const DETAILS_FILE = join(homedir(), '.wong-stack', 'details.json');
/** Kinds that only a private form may keep: the person never gives them in the chat. */
const PRIVATE_KIND = /^cc-|password$/;
const NAME = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** The saved sets, or none when nothing is saved yet. Throws when the file can not be read as a list,
 * with a reason of its own: a parser's message can quote the file. */
export function readDetails(file = DETAILS_FILE) {
  if (!existsSync(file)) return [];
  let sets = null;
  try { sets = JSON.parse(readFileSync(file, 'utf8')); } catch { /* reported below */ }
  if (!Array.isArray(sets)) throw new Error('the saved details file can not be read');
  return sets;
}

/** Replaces the file in one step, so a stopped write never leaves half a file. */
export function writeDetails(sets, file = DETAILS_FILE) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(dirname(file), 0o700);
  const partial = `${file}.${process.pid}.tmp`;
  writeFileSync(partial, `${JSON.stringify(sets, null, 2)}\n`, { mode: 0o600 });
  renameSync(partial, file);
}

/** A set's name from a title: `Pay City of Markham` is `pay-city-of-markham`. */
export function nameOf(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'details';
}

/** What the agent calls a set: `card ending 4242` for a card, else the labels it fills. */
export function hintOf(fields) {
  const card = fields.find(field => field.kind === 'cc-number');
  return card ? `card ending ${card.value.replace(/\D/g, '').slice(-4)}` : fields.map(field => field.label).join(', ');
}

/** Saves `set` in place of any set of the same name, never beside it. Resolves to the set as saved. */
export function keepSet({ name, private: secret, fields }, file = DETAILS_FILE) {
  const set = { name, hint: hintOf(fields), private: secret, fields };
  writeDetails([...readDetails(file).filter(saved => saved.name !== name), set], file);
  return set;
}

/** The private set a sent form keeps: each box with a kind that may be kept, and a dropdown's visible choice
 * beside its value, since a site's own value may mean another choice on the next site. Null when none may. */
export function keepForm(form, values, file = DETAILS_FILE) {
  const fields = form.fields.flatMap(({ label, kind, options }, index) => {
    if (!keepable({ kind })) return [];
    const chosen = options?.find(option => option.value === values[index]);
    return [{ kind, label, value: values[index], ...(chosen && { text: chosen.text ?? chosen.value }) }];
  });
  return fields.length ? keepSet({ name: nameOf(form.title), private: true, fields }, file) : null;
}

/** A value as a dropdown compares it: trimmed and lowercased, a number without leading zeros, and an expiry year
 * by its last two digits, so `03` meets `3` and `2028` meets `28`. */
export function normalise(value, kind) {
  const text = String(value).trim().toLowerCase();
  if (!/^\d+$/.test(text)) return text;
  return String(kind === 'cc-exp-year' ? Number(text) % 100 : Number(text));
}

/** A choice's words, each as `normalise` compares it: `03 - March` is `3` and `march`. */
const wordsOf = (text, kind) => String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => normalise(word, kind));

/** True when one text's words all appear in the other's: `March` agrees with `03 - March`, never `02 - February`. */
function agrees(text, saved, kind) {
  const [a, b] = [wordsOf(text, kind), wordsOf(saved, kind)];
  return a.length > 0 && b.length > 0 && (a.every(word => b.includes(word)) || b.every(word => a.includes(word)));
}

/** The one choice a saved value fits, by value or by text; null when none or several do. A saved visible
 * choice, `text`, decides: the pick must agree with it, and a value that fits another choice refuses both. */
export function choiceFor(value, { kind, options }, text) {
  const fitting = wanted => options.filter(option => [option.value, option.text ?? option.value].some(side => normalise(side, kind) === normalise(wanted, kind)));
  const byValue = fitting(value);
  if (text == null) return byValue.length === 1 ? byValue[0].value : null;
  const byText = options.filter(option => agrees(option.text ?? option.value, text, kind));
  const both = byText.filter(option => byValue.includes(option));
  const picks = both.length ? both : byText;
  if (picks.length !== 1 || (byValue.length === 1 && byValue[0] !== picks[0])) return null;
  return picks[0].value;
}

/** A form's values from a saved set, by each field's kind: `{values}`, or `{missing: label}` for the first field
 * with no saved kind or no one fitting choice. */
export function valuesFor(form, set) {
  const values = [];
  for (const field of form.fields) {
    const saved = field.kind && set.fields.find(kept => kept.kind === field.kind);
    const value = saved && (field.options ? choiceFor(saved.value, field, saved.text) : saved.value);
    if (!value) return { missing: field.label };
    values.push(value);
  }
  return { values };
}

/** Prints each set; a private set's values never. */
function list(file) {
  const sets = readDetails(file);
  console.log(`DETAILS_SETS=${sets.length}`);
  for (const set of sets) {
    console.log([set.name, set.hint, set.fields.map(field => field.kind).join(',')].join('\t'));
    if (!set.private) for (const { kind, value } of set.fields) console.log(`  ${kind}=${value}`);
  }
}

/** `--field kind=value` pairs as fields, or a usage error: an autofill kind once each, a value on one line. */
function chatFields(pairs) {
  const fields = pairs.map(pair => {
    const [, kind, value] = /^([a-z0-9-]+)=(.*)$/.exec(pair) ?? [];
    if (!AUTOFILL_TOKENS.has(kind) || !keepable({ kind })) usageError(USAGE, `--field takes <kind>=<value> with an autofill kind, like email: '${pair.split('=')[0]}'`);
    if (PRIVATE_KIND.test(kind)) usageError(USAGE, `${kind} saves only through a private form's Save for next time, never from the chat`);
    if (!value.trim() || value.length > LIMITS.value || /[\r\n]/.test(value)) usageError(USAGE, `${kind} takes one line of up to ${LIMITS.value} characters`);
    return { kind, label: kind, value };
  });
  if (new Set(fields.map(field => field.kind)).size !== fields.length) usageError(USAGE, 'each kind goes once');
  return fields;
}

function save(name, pairs, file) {
  if (!NAME.test(name ?? '')) usageError(USAGE, '--name takes lowercase letters, digits, and dashes, like home-address');
  if (!pairs?.length) usageError(USAGE, 'save takes at least one --field');
  const fields = chatFields(pairs);
  if (readDetails(file).some(set => set.name === name && set.private)) {
    console.error(`${name} came from a private form; pick another name, or forget it first.`);
    return 1;
  }
  keepSet({ name, private: false, fields }, file);
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
    process.exitCode = { list: () => (list(), 0), save: () => save(values.name, values.field, DETAILS_FILE), forget: () => forget(words[0], values.all, DETAILS_FILE) }[command]();
  } catch (error) {
    console.log(`DETAILS_ERROR=${error.message}`);
    process.exitCode = 1;
  }
}
