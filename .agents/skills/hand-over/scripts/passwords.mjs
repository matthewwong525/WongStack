// The password link's routes, mounted by `hand-over.mjs open --passwords`, which checks the key first.
//
// `POST /save` takes `{logins: [{url, username, password}]}`, at most 500 logins, a 256 KB body, and
// 1,024 characters a field. It reads `agent-browser auth list --json` once, names each login (the same
// host and username reuse their name, so a new password replaces the old; otherwise `slug(host)`, then
// `-2`, `-3` for another account), and runs `agent-browser auth save <name> --url <url> --username
// <user> --password-stdin` through execFile with the password on stdin only. It replies
// `{saved: [{name, host}], failed: [index]}`, the indexes into the request's logins. `POST /done` ends
// the link. Nothing here logs, and no password reaches argv, env, or a file.

import { execFile } from 'node:child_process';

export const LIMITS = { logins: 500, body: 256 * 1024, field: 1024 };
export const PASSWORD_ROUTES = new Set(['/save', '/continue', '/done']);
const TOOL_TIMEOUT_MS = 15_000;

/** A URL's host, lowercased, with `www.` stripped; '' when it isn't an http(s) URL. */
export function hostOf(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return /^https?:$/.test(protocol) ? hostname.toLowerCase().replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

/** The vault name for a host: each run of anything but letters and digits becomes `-`. */
export function slug(host) {
  return host.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'login';
}

/** The name a login saves under, given the vault's `{name, url, username}` profiles. */
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

/** Runs agent-browser with `input` on stdin; resolves to stdout, or null when it fails. */
const children = new Set();
const abortTools = () => { for (const child of children) child.kill('SIGKILL'); };

function tool(args, input = '') {
  return new Promise(done => {
    const child = execFile('agent-browser', args, { encoding: 'utf8', timeout: TOOL_TIMEOUT_MS }, (error, stdout) => done(error ? null : stdout));
    children.add(child);
    child.once('close', () => children.delete(child));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

/** The vault's `{name, url, username}` profiles, or null when agent-browser can't list them. */
async function profiles() {
  try {
    const list = JSON.parse((await tool(['auth', 'list', '--json'])) ?? '').data?.profiles;
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

/** Saves each login in order, so a second account in one request sees the first's name taken. */
async function saveAll(logins, onSaved, isOpen) {
  const vault = await profiles();
  if (!vault) return null;
  const saved = [];
  const failed = [];
  for (const [index, { url, username, password, host }] of logins.entries()) {
    if (!isOpen()) { failed.push(...logins.slice(index).map((_, at) => at + index)); break; }
    const name = chooseName(vault, { host, username });
    if ((await tool(['auth', 'save', name, '--url', url, '--username', username, '--password-stdin'], password)) === null) {
      failed.push(index);
      continue;
    }
    if (!vault.some(profile => profile.name === name)) vault.push({ name, url, username });
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
  route.abort = abortTools;
  return route;
}
