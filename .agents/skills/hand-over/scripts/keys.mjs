// The key link's routes, mounted by `hand-over.mjs open --keys NAME[,NAME] [--guide <file>]`, which
// checks the key and the guide first.
//
// `resolveKeys` runs at `open`, before any link exists. Each name must be declared, uncommented, in
// exactly one of the active checkout's example files: `.env.example` sends it to `.env`, and
// `app/.dev.vars.example` to `app/.dev.vars`. It then proves each destination is git-ignored in the
// primary worktree, and in this one when it is linked. A key's hint is the first sentence of the
// comment block directly above its declaration.
//
// `checkGuide` runs there too, on the `--guide` file: a JSON object keyed by asked-for name, each entry
// any of `title` and `open` (40 characters), `url` (an `https` address with a host name, never an IP
// literal, `localhost`, or one carrying a login), `steps` (6 lines of 140 characters), and `check`, a
// `{url, auth}` test with `auth` one of `bearer`, `basic` (the key as the username), `header:<Name>`,
// or `query:<name>`. The first bad entry is returned as `<name>: <reason>`.
//
// `GET /keys` lists `{name, hint, set}` and a guide's `title`, `url`, `open`, `steps`, and `checkHost`,
// the test's host and never its path; `set` is only whether a value is there now. It also gives
// `closesAt` and `now`, the watcher's clock, and its first call marks the link opened. `POST /save`
// takes `{keys: {NAME: value}, force: [NAME]}` for asked-for names, a 16 KB body, and one save at a
// time. Each value is trimmed; an empty one, or one over 4,096 characters, is refused for that name. A
// value over several lines is stored on one: JSON compacted, other text in double quotes with each line
// break as `\n`, which dotenv and wrangler read back as a line break; text holding `"`, `\`, `$`, or a
// backtick is refused, since no quoting keeps it whole.
//
// A key with a `check` is tested before it is written, unless `force` names it: one `GET` to the
// check's address with the key placed by `auth`, no redirect followed, the body cancelled unread, 8
// seconds at most. 2xx is `works`; 401 or 403 is `refused`, and the key is not written; anything else,
// or no check, is `untested`. An accepted key replaces its line in the primary worktree's file, or is
// appended, and goes the same way to a linked worktree's seeded branch copy (worktree-secrets.mjs
// `seed` recorded it). Each write goes to a temp file beside the target, mode 0600, then renames over
// it. The reply is `{saved: [NAME], failed: [NAME], refused: [NAME], checked: {NAME: 'works' |
// 'untested'}}`; the link ends once every asked-for name is saved, or on `POST /done`. Nothing here
// logs, and no value reaches argv, env, or any file but the live ones: only a check's own address.

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { ENTRY, isIgnored, loadBase } from '../../ship/scripts/worktree-secrets.mjs';

export const LIMITS = { names: 20, body: 16 * 1024, value: 4096, hint: 200, title: 40, steps: 6, step: 140 };
const CHECK_TIMEOUT_MS = 8000;
export const KEY_ROUTES = new Set(['/keys', '/save', '/continue', '/done']);
export const NAME = /^[A-Z_][A-Z0-9_]*$/;
/** Where each example file's names are written. */
export const DESTINATIONS = [
  { example: '.env.example', live: '.env' },
  { example: 'app/.dev.vars.example', live: 'app/.dev.vars' },
];
/** The Worker's own file: a key saved here must reach both Workers through `npm run secrets:push`. */
export const APP_FILE = 'app/.dev.vars';
// Written bare, a value of only these reads back unchanged in dotenv, wrangler, the memory parser, and a
// shell's `source`; `~` is left out, since a shell expands it.
const BARE = /^[A-Za-z0-9_\-.:/+=@]+$/;

// ---------------------------------------------------------------------------
// Reading the example and live files

/** The first sentence of a comment block, `#` marks stripped, capped at LIMITS.hint; '' for none. */
export function firstSentence(comments) {
  const text = comments.map(line => line.replace(/^\s*#+\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();
  const sentence = /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
  return sentence.length > LIMITS.hint ? `${sentence.slice(0, LIMITS.hint - 1).trimEnd()}…` : sentence;
}

/** An example file's declared names, each with its hint: the comment block directly above it. */
export function declarations(text) {
  const found = new Map();
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const name = line.match(ENTRY)?.[1];
    if (!name || found.has(name)) return;
    let top = index;
    while (top > 0 && /^\s*#/.test(lines[top - 1])) top--;
    found.set(name, firstSentence(lines.slice(top, index)));
  });
  return found;
}

const readText = file => (existsSync(file) ? readFileSync(file, 'utf8') : '');

/** True when `file` has a non-empty value for `name`. */
function hasValue(file, name) {
  return readText(file).split(/\r?\n/).some(line => {
    const match = line.match(ENTRY);
    return match?.[1] === name && !/^\s*(''|""|)\s*(#.*)?$/.test(match[2]);
  });
}

/** The branch copy of `rel` in a linked worktree, or null when `seed` never recorded one. */
function branchCopy(ctx, rel) {
  if (!ctx.linked) return null;
  try {
    return loadBase(ctx)?.files?.[rel] ? join(ctx.root, rel) : null;
  } catch {
    return null;
  }
}

/**
 * Where each name goes, from the active checkout's example files. Resolves to `{keys: [{name, file,
 * hint}], undeclared, ambiguous, unignored}`; the link may open only when the last three are empty.
 * `ctx` is primary-root.mjs's `{root, primary, linked, gitDir}`.
 */
export function resolveKeys(names, ctx) {
  const declared = DESTINATIONS.map(destination => ({ ...destination, names: declarations(readText(join(ctx.root, destination.example))) }));
  const keys = [];
  const undeclared = [];
  const ambiguous = [];
  for (const name of names) {
    const where = declared.filter(destination => destination.names.has(name));
    if (!where.length) undeclared.push(name);
    else if (where.length > 1) ambiguous.push(name);
    else keys.push({ name, file: where[0].live, hint: where[0].names.get(name) });
  }
  const roots = ctx.linked ? [ctx.primary, ctx.root] : [ctx.primary];
  const unignored = [...new Set(keys.map(key => key.file))].flatMap(file => roots
    .filter(root => !existsSync(dirname(join(root, file))) || !isIgnored(root, file))
    .map(root => join(root, file)));
  return { keys, undeclared, ambiguous, unignored };
}

/** The page's list: each asked-for key's name, hint, whether a value is set now, and its guide, the test as its host alone. */
export function describeKeys(config) {
  return config.keys.map(({ name, file, hint, guide }) => {
    const copy = branchCopy(config, file);
    const { check, ...shown } = guide ?? {};
    return { name, hint, set: hasValue(join(config.primary, file), name) || Boolean(copy && hasValue(copy, name)), ...shown, ...(check && { checkHost: new URL(check.url).host }) };
  });
}

// ---------------------------------------------------------------------------
// The guide

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isText = (value, most) => typeof value === 'string' && Boolean(value.trim()) && value.length <= most && !/[\r\n\0]/.test(value);
const HEADER = /^[A-Za-z][A-Za-z0-9-]*$/;
const BANNED_HEADERS = new Set(['host', 'cookie', 'content-length']);
const QUERY = /^[A-Za-z0-9_.-]+$/;

/** An `https` address with a dotted host name as a URL; null for an IP literal, `localhost`, or one carrying a login. */
export function httpsUrl(address) {
  if (typeof address !== 'string' || !URL.canParse(address)) return null;
  const url = new URL(address);
  const host = url.hostname;
  const named = host.includes('.') && !host.endsWith('.') && !host.startsWith('[') && !/^[\d.]+$/.test(host) && !host.endsWith('.localhost');
  return url.protocol === 'https:' && named && !url.username && !url.password ? url : null;
}

/** Where a check's `auth` puts the key, `{header}` or `{query}`; null for a shape a guide may not use. */
export function authPlace(auth) {
  if (auth === 'bearer' || auth === 'basic') return { header: 'authorization' };
  const [kind, name, ...rest] = typeof auth === 'string' ? auth.split(':') : [];
  if (!name || rest.length) return null;
  if (kind === 'header') return HEADER.test(name) && !BANNED_HEADERS.has(name.toLowerCase()) ? { header: name } : null;
  return kind === 'query' && QUERY.test(name) ? { query: name } : null;
}

const GUIDE_FIELDS = new Set(['title', 'url', 'open', 'steps', 'check']);
const CHECK_FIELDS = new Set(['url', 'auth']);
/** Each reason a guide entry is refused, with the test that finds it. */
const GUIDE_FAULTS = [
  ['takes only title, url, open, steps, and check', entry => Object.keys(entry).some(field => !GUIDE_FIELDS.has(field))],
  [`title and open take 1 to ${LIMITS.title} characters on one line`, ({ title, open }) => [title, open].some(text => text !== undefined && !isText(text, LIMITS.title))],
  ['url takes an https address with a host name', ({ url }) => url !== undefined && !httpsUrl(url)],
  ['open needs a url', ({ url, open }) => open !== undefined && url === undefined],
  [`steps takes at most ${LIMITS.steps} lines of 1 to ${LIMITS.step} characters`, ({ steps }) => steps !== undefined && !(Array.isArray(steps) && steps.length <= LIMITS.steps && steps.every(step => isText(step, LIMITS.step)))],
  ['check takes an https url with a host name and an auth of bearer, basic, header:<Name>, or query:<name>', ({ check }) => check !== undefined && !(isObject(check) && Object.keys(check).every(field => CHECK_FIELDS.has(field)) && httpsUrl(check.url) && authPlace(check.auth))],
];

/**
 * Checks the parsed `--guide` file against the asked-for names. Resolves to `{guide}`, or to
 * `{fault: '<name>: <reason>'}` for the first entry that is not asked for or is badly shaped.
 */
export function checkGuide(guide, names) {
  if (!isObject(guide)) return { fault: 'guide: takes a JSON object keyed by key name' };
  for (const [name, entry] of Object.entries(guide)) {
    const reason = !names.includes(name) ? 'not an asked-for key' : !isObject(entry) ? 'takes an object' : GUIDE_FAULTS.find(([, found]) => found(entry))?.[0];
    if (reason) return { fault: `${name}: ${reason}` };
  }
  return { guide };
}

/** The one request that tests `value`: the check's address and headers, the key placed by its `auth`. */
function checkRequest({ url, auth }, value) {
  const target = new URL(url);
  const place = authPlace(auth);
  if (place.query) target.searchParams.set(place.query, value);
  const sent = auth === 'bearer' ? `Bearer ${value}` : auth === 'basic' ? `Basic ${Buffer.from(`${value}:`).toString('base64')}` : value;
  return { url: target.href, headers: place.header ? { [place.header]: sent } : {} };
}

/**
 * Asks the service once whether it takes `value`: 'works' on 2xx, 'refused' on 401 or 403, else
 * 'untested', as for a redirect, a timeout, or a value no header can carry. It follows no redirect,
 * cancels the body unread, and keeps nothing.
 */
export async function checkKey(check, value, ask = globalThis.fetch) {
  try {
    const { url, headers } = checkRequest(check, value);
    const response = await ask(url, { method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    await response.body?.cancel().catch(() => {});
    if (response.status >= 200 && response.status < 300) return 'works';
    return response.status === 401 || response.status === 403 ? 'refused' : 'untested';
  } catch {
    return 'untested';
  }
}

// ---------------------------------------------------------------------------
// Writing a key

/** Text over several lines as one storable value: JSON compacted, other text as it is. */
function compact(text) {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
}

/**
 * A value as the page sent it, trimmed, its line breaks as `\n` and a JSON file's taken out; null when
 * it is empty or its stored form is too long.
 */
export function cleanValue(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\r\n?/g, '\n').trim();
  const clean = text.includes('\n') ? compact(text) : text;
  return clean && clean.replaceAll('\n', '\\n').length <= LIMITS.value && !clean.includes('\0') ? clean : null;
}

/**
 * The live-file line for a key: bare when it can be, else in single quotes, else in double quotes; null
 * for a value no quoting keeps whole. Neither dotenv nor the memory parser unescapes a quoted value, so
 * quoting picks a mark the value lacks rather than escaping one. The one escape is a line break, as
 * `\n` in double quotes, which dotenv and wrangler turn back.
 */
export function formatLine(name, value) {
  if (value.includes('\n')) return /["\\$`]/.test(value) ? null : `${name}="${value.replaceAll('\n', '\\n')}"`;
  if (BARE.test(value)) return `${name}=${value}`;
  if (!value.includes("'")) return `${name}='${value}'`;
  if (!/["\\$`]/.test(value)) return `${name}="${value}"`;
  return null;
}

/**
 * Sets `name` in the dotenv file at `path`: its first line is replaced in place, keeping any `export`,
 * and any later duplicates dropped; otherwise the line is appended. Every other line stays. The file
 * is written whole to a temp file beside it, mode 0600, then renamed over it.
 */
export function setKey(path, name, line) {
  const lines = readText(path).split('\n');
  let found = false;
  const next = [];
  for (const each of lines) {
    if (each.match(ENTRY)?.[1] !== name) next.push(each);
    else if (!found) {
      found = true;
      next.push(`${/^\s*export\s/.test(each) ? 'export ' : ''}${line}`);
    }
  }
  if (!found) {
    if (next.at(-1) === '') next.pop();
    next.push(line, '');
  }
  const temp = join(dirname(path), `${basename(path)}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    writeFileSync(temp, next.join('\n'), { mode: 0o600, flag: 'wx' });
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}

/** Writes one key's line to the primary worktree's file and any seeded branch copy; false when it can't. */
function writeKey(config, { name, file }, line) {
  try {
    setKey(join(config.primary, file), name, line);
    const copy = branchCopy(config, file);
    if (copy) setKey(copy, name, line);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Routes

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

/**
 * A save request's `[name, value]` pairs, or 400 unless it names at least one asked-for key and no
 * other, in `keys` and in any `force` list.
 */
export function checkKeys(body, asked) {
  if (!isObject(body) || !isObject(body.keys)) return 400;
  const force = body.force ?? [];
  if (!Array.isArray(force) || !force.every(name => asked.has(name))) return 400;
  const pairs = Object.entries(body.keys);
  return pairs.length && pairs.every(([name]) => asked.has(name)) ? pairs : 400;
}

/**
 * The key routes for `config`, the state's `{root, primary, linked, gitDir, keys}`. `onSaved(name)`
 * hears each saved name; `onDone()` runs once the reply has gone, on `/done` or when a save leaves no
 * asked-for key unsaved. `onOpened()` hears each `GET /keys`, `closesAt` is the deadline that route
 * reports, and `fetch` runs a key's test.
 */
export function keyRoutes(config, { onSaved = () => {}, onDone = () => {}, onContinue = async () => null, isOpen = () => true, onOpened = () => {}, closesAt, fetch: ask = globalThis.fetch } = {}) {
  const asked = new Map(config.keys.map(key => [key.name, key]));
  const saved = new Set();
  let terminal = false;
  let queue = Promise.resolve();
  const serial = job => {
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };
  /** One key's outcome: 'works' or 'untested' once written, 'refused' by its test and not written, or 'failed'. */
  const saveKey = async (key, value, forced) => {
    const clean = cleanValue(value);
    const line = clean === null ? null : formatLine(key.name, clean);
    if (!line) return 'failed';
    const verdict = key.guide?.check && !forced ? await checkKey(key.guide.check, clean, ask) : 'untested';
    return verdict === 'refused' || writeKey(config, key, line) ? verdict : 'failed';
  };
  const route = async (pathname, request, response) => {
    if (pathname === '/keys') {
      if (request.method !== 'GET') return reply(response, 405);
      onOpened();
      return reply(response, 200, { keys: describeKeys(config), closesAt, now: Date.now() });
    }
    if (request.method !== 'POST') return reply(response, 405);
    const body = pathname === '/done' ? null : await readBody(request);
    const outcome = await serial(async () => {
      if (terminal || !isOpen()) return { status: 410 };
      if (pathname === '/done') { terminal = true; return { cancelled: true }; }
      const pairs = typeof body === 'number' ? body : (pathname === '/continue' && isObject(body?.keys) && !Object.keys(body.keys).length ? [] : checkKeys(body, asked));
      if (typeof pairs === 'number') return { status: pairs };
      const result = { saved: [], failed: [], refused: [], checked: {} };
      for (const [name, value] of pairs) {
        const verdict = await saveKey(asked.get(name), value, body.force?.includes(name));
        if (verdict === 'failed' || verdict === 'refused') { result[verdict].push(name); continue; }
        result.saved.push(name);
        result.checked[name] = verdict;
        saved.add(name);
        onSaved(name);
      }
      const missing = [...asked.keys()].filter(name => !saved.has(name));
      const ready = !missing.length && !result.failed.length;
      if (ready) terminal = true;
      return { result, ready, missing };
    });
    if (outcome.status) return reply(response, outcome.status);
    if (outcome.cancelled) {
      response.once('finish', () => onDone(false));
      return reply(response, 200, { ok: true });
    }
    const receipt = outcome.ready && pathname === '/continue' ? await onContinue() : null;
    if (outcome.ready && pathname === '/save') response.once('finish', () => onDone(true));
    reply(response, 200, { ...outcome.result, ...(pathname === '/continue' && { ready: outcome.ready, missing: outcome.missing, ...(receipt && { receipt }) }) });
  };
  route.drain = () => queue;
  return route;
}
