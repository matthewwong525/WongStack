// The key link's routes, mounted by `hand-over.mjs open --keys NAME[,NAME]`, which checks the key first.
//
// `resolveKeys` runs at `open`, before any link exists. Each name must be declared, uncommented, in
// exactly one of the active checkout's example files: `.env.example` sends it to `.env`, and
// `app/.dev.vars.example` to `app/.dev.vars`. It then proves each destination is git-ignored in the
// primary worktree, and in this one when it is linked. A key's hint is the first sentence of the
// comment block directly above its declaration.
//
// `GET /keys` lists `{name, hint, set}`, `set` being only whether a value is there now. `POST /save`
// takes `{keys: {NAME: value}}` for asked-for names, a 16 KB body, and one save at a time. Each value
// is trimmed; an empty one, one over 4,096 characters, or one holding a line break is refused for that
// name. An accepted key replaces its line in the primary worktree's file, or is appended, and goes the
// same way to a linked worktree's seeded branch copy (worktree-secrets.mjs `seed` recorded it). Each
// write goes to a temp file beside the target, mode 0600, then renames over it. The reply is
// `{saved: [NAME], failed: [NAME]}`; the link ends once every asked-for name is saved, or on
// `POST /done`. Nothing here logs, and no value reaches argv, env, or any file but the live ones.

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { ENTRY, isIgnored, loadBase } from '../../ship/scripts/worktree-secrets.mjs';

export const LIMITS = { names: 20, body: 16 * 1024, value: 4096, hint: 200 };
export const KEY_ROUTES = new Set(['/keys', '/save', '/done']);
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

/** The page's list: each asked-for key's name, hint, and whether a value is set now. */
export function describeKeys(config) {
  return config.keys.map(({ name, file, hint }) => {
    const copy = branchCopy(config, file);
    return { name, hint, set: hasValue(join(config.primary, file), name) || Boolean(copy && hasValue(copy, name)) };
  });
}

// ---------------------------------------------------------------------------
// Writing a key

/** A value as the page sent it, trimmed; null when it is empty, too long, or holds a line break. */
export function cleanValue(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= LIMITS.value && !/[\r\n\0]/.test(clean) ? clean : null;
}

/**
 * The live-file line for a key: bare when it can be, else in single quotes, else in double quotes; null
 * for a value no quoting keeps whole. Neither dotenv nor the memory parser unescapes a quoted value, so
 * quoting picks a mark the value lacks rather than escaping one.
 */
export function formatLine(name, value) {
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

/** Writes one key to the primary worktree's file and any seeded branch copy; false when it can't. */
function writeKey(config, { name, file }, value) {
  const line = formatLine(name, value);
  if (!line) return false;
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

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** A save request's `[name, value]` pairs, or 400 unless it names at least one asked-for key and no other. */
export function checkKeys(body, asked) {
  if (!isObject(body) || !isObject(body.keys)) return 400;
  const pairs = Object.entries(body.keys);
  return pairs.length && pairs.every(([name]) => asked.has(name)) ? pairs : 400;
}

/**
 * The key routes for `config`, the state's `{root, primary, linked, gitDir, keys}`. `onSaved(name)`
 * hears each saved name; `onDone()` runs once the reply has gone, on `/done` or when a save leaves no
 * asked-for key unsaved.
 */
export function keyRoutes(config, { onSaved = () => {}, onDone = () => {} } = {}) {
  const asked = new Map(config.keys.map(key => [key.name, key]));
  const saved = new Set();
  let queue = Promise.resolve();
  const serial = job => {
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };
  return async (pathname, request, response) => {
    if (pathname === '/keys') return request.method === 'GET' ? reply(response, 200, { keys: describeKeys(config) }) : reply(response, 405);
    if (request.method !== 'POST') return reply(response, 405);
    if (pathname === '/done') {
      response.once('finish', onDone);
      return reply(response, 200, { ok: true });
    }
    const body = await readBody(request);
    const pairs = typeof body === 'number' ? body : checkKeys(body, asked);
    if (typeof pairs === 'number') return reply(response, pairs);
    const result = await serial(() => {
      const outcome = { saved: [], failed: [] };
      for (const [name, value] of pairs) {
        const clean = cleanValue(value);
        const ok = clean !== null && writeKey(config, asked.get(name), clean);
        outcome[ok ? 'saved' : 'failed'].push(name);
        if (ok) {
          saved.add(name);
          onSaved(name);
        }
      }
      return outcome;
    });
    if ([...asked.keys()].every(name => saved.has(name))) response.once('finish', onDone);
    return reply(response, 200, result);
  };
}
