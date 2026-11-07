// The saved first and upstream proxy lines: from the repo's keys, else this computer's saved files. Only the
// forwarder holds them; the browser sees just the local forwarder.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../../memory/scripts/lib/store.mjs';

/** The repo key of the upstream proxy line, `[http://]login:password@host:port` (wiki/development/browser-proxy.md). */
export const PROXY_KEY = 'BROWSE_UPSTREAM_PROXY';
/** The line saved for the whole computer: the browser is shared, so a start from any repo uses it. */
export const UPSTREAM_FILE = join(homedir(), '.wong-stack', 'camoufox', 'upstream-proxy');
/** The old camofox browser's file, read when the new one is missing. */
export const OLD_UPSTREAM_FILE = join(homedir(), '.wong-stack', 'camofox', 'upstream-proxy');
/** The repo key for the proxy tried before the upstream, `[http://][login:password@]host:port`: a home proxy, such as a
 * Raspberry Pi (wiki/development/browser-proxy.md). The upstream is its backup. */
export const FIRST_KEY = 'BROWSE_FIRST_PROXY';
/** The first proxy line saved for the whole computer, by the same rules as the upstream file. */
export const FIRST_FILE = join(homedir(), '.wong-stack', 'camoufox', 'first-proxy');
/** The old camofox browser's first proxy file, read when the new one is missing. */
export const OLD_FIRST_FILE = join(homedir(), '.wong-stack', 'camofox', 'first-proxy');

/** The forwarder's route from a proxy line, or null when blank or not that shape. The last `@` splits the login, so a
 * password may hold `@` or `:`; with `loginOptional`, a line with no `@` gives an address with no login. */
export function parseUpstream(line, { loginOptional = false } = {}) {
  const text = line?.trim().replace(/^http:\/\//i, '').replace(/\/$/, '');
  if (!text || /^[a-z][\w+.-]*:\/\//i.test(text)) return null;
  const at = text.lastIndexOf('@');
  if (at < 0 && !loginOptional) return null;
  const address = /^(\[[0-9a-f:]+\]|[^\s:/@[\]]+):(\d+)$/i.exec(text.slice(at + 1));
  const port = Number(address?.[2]);
  if (!address || port < 1 || port > 65535) return null;
  const host = address[1].replace(/^\[|\]$/g, '');
  if (at < 0) return { host, port };
  const login = text.slice(0, at);
  const colon = login.indexOf(':');
  if (colon < 1 || colon === login.length - 1 || /\s/.test(login)) return null;
  return { host, port, username: login.slice(0, colon), password: login.slice(colon + 1) };
}

/** The first proxy from its line: the upstream's shape, with the login optional. */
export const parseFirst = line => parseUpstream(line, { loginOptional: true });

/** The key from the environment, else the primary worktree's `.env`; blank when neither holds it. */
export function repoLine(env = process.env, envFile = primaryEnvFile(), key = PROXY_KEY) {
  if (env[key]?.trim()) return env[key].trim();
  try {
    if (envFile && existsSync(envFile)) return parseEnv(readFileSync(envFile, 'utf8'))[key]?.trim() ?? '';
  } catch { /* none */ }
  return '';
}

const readLine = file => { try { return readFileSync(file, 'utf8').trim(); } catch { return ''; } };

/** Saves a line only this user can read; the temporary file makes it whole or absent. */
function saveLine(file, line) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${line}\n`, { mode: 0o600 });
  renameSync(temp, file);
}

/** The upstream for this start. A valid repo line wins and is saved for the computer when it differs, so a rotated
 * key spreads; with none, the computer file decides, or the old camofox file while the new one is missing. */
export function resolveUpstream({ env = process.env, envFile = primaryEnvFile(), file = UPSTREAM_FILE, oldFile = OLD_UPSTREAM_FILE, key = PROXY_KEY, parse = parseUpstream } = {}) {
  const line = repoLine(env, envFile, key) || (!existsSync(file) && readLine(oldFile));
  if (!line) return parse(readLine(file));
  const upstream = parse(line);
  if (upstream && readLine(file) !== line) {
    try { saveLine(file, line); } catch { /* this start still uses it */ }
  }
  return upstream;
}

/** The first proxy for this start, by the upstream's rules, from `BROWSE_FIRST_PROXY` and its computer file, or the old
 * camofox file while the new one is missing. */
export function resolveFirst(options = {}) {
  return resolveUpstream({ file: FIRST_FILE, oldFile: OLD_FIRST_FILE, ...options, key: FIRST_KEY, parse: parseFirst });
}

function primaryEnvFile() {
  try { return join(primaryRoot(fileURLToPath(new URL('.', import.meta.url))).primary, '.env'); } catch { return null; }
}
