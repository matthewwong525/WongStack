// The private form's timing record: one JSON line per step or link ending, kept beside result.json and never committed.
// It takes only the fields named here, so no typed value or error text can reach it.

import { readFileSync, writeFileSync } from 'node:fs';

export const KEEP = 500;
const FIELDS = ['link', 'step', 'index', 'kind', 'ms', 'ok', 'ended', 'cause'];

/** Appends `entry` to `file` with the time, keeping the last `keep` lines, readable by its owner alone. */
export function appendTiming(file, entry, { keep = KEEP, now = Date.now() } = {}) {
  const line = JSON.stringify({ at: new Date(now).toISOString(), ...Object.fromEntries(FIELDS.filter(name => entry[name] !== undefined).map(name => [name, entry[name]])) });
  let lines = [];
  try { lines = readFileSync(file, 'utf8').split('\n').filter(Boolean); } catch { /* the first entry */ }
  writeFileSync(file, `${[...lines, line].slice(-keep).join('\n')}\n`, { mode: 0o600 });
}

/** A link's short name in the record: its completion id's first 8 characters. */
export const linkOf = completionId => String(completionId ?? '').slice(0, 8);
