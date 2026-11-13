// The background helper's action log: one JSON line per thing it did, never a message's words. wiki/stack/live-line.md

import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { helperFiles } from './computer.mjs';

const FIELDS = ['event', 'app', 'item', 'tap', 'action', 'outcome', 'key', 'run', 'reason', 'chat', 'message', 'warning'];
// A run's warning can join two of them, a fetch's and a rename's, so it keeps more than the 200 of any other field.
const LONG = { warning: 1000 };
export const LOG_LIMIT = 1024 * 1024;

/** Appends `entry`'s allowed fields to the helper's log.jsonl, rolled to log.1.jsonl at 1 MB: project `root`'s own
 *  helper's, or with none the shared ~/.wong-stack/helper/log.jsonl. Never throws. */
export function logAction(entry, { env = process.env, root = null, now = Date.now } = {}) {
  const line = { at: new Date(now()).toISOString() };
  for (const field of FIELDS) if (entry?.[field] != null) line[field] = String(entry[field]).slice(0, LONG[field] ?? 200);
  try {
    const { dir, log } = helperFiles(env, root);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    let size = 0;
    try { size = statSync(log).size; } catch { /* no log yet */ }
    if (size >= LOG_LIMIT) renameSync(log, log.replace(/\.jsonl$/, '.1.jsonl'));
    appendFileSync(log, `${JSON.stringify(line)}\n`, { mode: 0o600 });
  } catch { /* a log never stops the helper */ }
}
