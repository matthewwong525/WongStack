// The password link's routes, mounted by `hand-over.mjs open --passwords`, which checks the key first.
//
// `POST /save` takes `{logins: [{url, username, password}]}`, at most 500 logins, a 256 KB body, and
// 1,024 characters a field. It reads the saved logins file once (logins.mjs owns it:
// `~/.wong-stack/logins.json`, mode 0600 in a 0700 folder), names each login (the same host and
// username reuse their name, so a new password replaces the old; otherwise `slug(host)`, then `-2`,
// `-3` for another account), and replaces the file in one step for each. It replies
// `{saved: [{name, host}], failed: [index]}`, the indexes into the request's logins; a file that can
// not be read answers 503. `POST /done` ends the link. Nothing here logs, and no password reaches
// argv, env, or any other file.

import { hostOf, readLogins, writeLogins } from '../../browser/scripts/logins.mjs';

export { hostOf };
export const LIMITS = { logins: 500, body: 256 * 1024, field: 1024 };
export const PASSWORD_ROUTES = new Set(['/save', '/continue', '/done']);

/** The name a host's login saves under: each run of anything but letters and digits becomes `-`. */
export function slug(host) {
  return host.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'login';
}

/** The name a login saves under, given the saved `{name, url, username}` logins. */
export function chooseName(profiles, { host, username }) {
  const same = profiles.find(profile => hostOf(profile.url) === host && profile.username === username);
  if (same) return same.name;
  const taken = new Set(profiles.map(profile => profile.name));
  const base = slug(host);
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
  return name;
}

const fieldOk = value => typeof value === 'string' && value.length > 0 && value.length <= LIMITS.field;

/** The request's logins with their hosts, or a status: 413 for too many, 400 for a bad one. */
export function checkLogins(body) {
  const logins = body?.logins;
  if (!Array.isArray(logins) || !logins.length) return 400;
  if (logins.length > LIMITS.logins) return 413;
  const checked = [];
  for (const login of logins) {
    const { url, username, password } = login ?? {};
    if (![url, username, password].every(fieldOk) || /[\r\n]/.test(username)) return 400;
    const host = hostOf(url);
    if (!host) return 400;
    checked.push({ url, username, password, host });
  }
  return checked;
}

/** A request's JSON body, or a status: 413 past the byte limit, 400 when it isn't JSON. */
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= LIMITS.body) chunks.push(chunk);
  }
  if (size > LIMITS.body) return 413;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return 400;
  }
}

function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/** Saves each login in order, so a second account in one request sees the first's name taken. Null when the file can not be read. */
function saveAll(logins, onSaved, isOpen) {
  let file;
  try { file = readLogins(); } catch { return null; }
  const saved = [];
  const failed = [];
  for (const [index, { url, username, password, host }] of logins.entries()) {
    if (!isOpen()) { failed.push(...logins.slice(index).map((_, at) => at + index)); break; }
    const name = chooseName(file, { host, username });
    const next = [...file.filter(login => login.name !== name), { name, url, username, password }];
    try { writeLogins(next); } catch { failed.push(index); continue; }
    file = next;
    saved.push({ name, host });
    onSaved(name);
  }
  return { saved, failed };
}

/**
 * The password routes. `onSaved(name)` hears each saved name; `onDone()` runs once `/done`'s reply
 * has gone. Saves run one request at a time.
 */
export function passwordRoutes({ onSaved = () => {}, onDone = () => {}, onContinue = async () => null, isOpen = () => true } = {}) {
  let queue = Promise.resolve();
  let terminal = false;
  const savedNames = new Set();
  const serial = job => {
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };
  const route = async (pathname, request, response) => {
    if (request.method !== 'POST') return reply(response, 405);
    const body = pathname === '/done' ? null : await readBody(request);
    const outcome = await serial(async () => {
      if (terminal || !isOpen()) return { status: 410 };
      if (pathname === '/done') {
        terminal = true;
        return { cancelled: true };
      }
      const logins = typeof body === 'number' ? body : (pathname === '/continue' && Array.isArray(body?.logins) && !body.logins.length ? [] : checkLogins(body));
      if (typeof logins === 'number') return { status: logins };
      const result = logins.length ? await saveAll(logins, name => { savedNames.add(name); onSaved(name); }, isOpen) : { saved: [], failed: [] };
      if (!result) return { status: 503 };
      const ready = pathname === '/continue' && !result.failed.length && savedNames.size > 0;
      if (ready) terminal = true;
      return { result, ready };
    });
    if (outcome.status) return reply(response, outcome.status);
    if (outcome.cancelled) {
      response.once('finish', () => onDone(false));
      return reply(response, 200, { ok: true });
    }
    const receipt = outcome.ready ? await onContinue() : null;
    reply(response, 200, { ...outcome.result, ...(pathname === '/continue' && { ready: outcome.ready, ...(receipt && { receipt }) }) });
  };
  route.drain = () => queue;
  return route;
}
