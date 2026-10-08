// The saved logins file: `~/.wong-stack/logins.json`, mode 0600 in a 0700 folder, outside every repo.
// It holds `[{name, url, username, password}]` in clear. Only the password link (passwords.mjs) writes
// it, and only `browse.mjs login` reads a password from it. Nothing here logs.

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const LOGINS_FILE = join(homedir(), '.wong-stack', 'logins.json');

/** A URL's host, lowercased, with `www.` stripped; '' when it isn't an http(s) URL. */
export function hostOf(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return /^https?:$/.test(protocol) ? hostname.toLowerCase().replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

/**
 * The saved logins, or none when nothing is saved yet. Throws when the file can not be read as a list,
 * with a reason of its own: a parser's message can quote the file.
 */
export function readLogins(file = LOGINS_FILE) {
  if (!existsSync(file)) return [];
  let logins = null;
  try { logins = JSON.parse(readFileSync(file, 'utf8')); } catch { /* reported below */ }
  if (!Array.isArray(logins)) throw new Error('the saved logins file can not be read');
  return logins;
}

/** Replaces the file in one step, so a stopped write never leaves half a file. */
export function writeLogins(logins, file = LOGINS_FILE) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(dirname(file), 0o700);
  const partial = `${file}.${process.pid}.tmp`;
  writeFileSync(partial, `${JSON.stringify(logins, null, 2)}\n`, { mode: 0o600 });
  renameSync(partial, file);
}
