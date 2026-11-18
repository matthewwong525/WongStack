#!/usr/bin/env node
// A finished change as one packed file, `openspec/changes/archive/<date>-<name>.md`: the format's one owner, and how
// every step lists and reads finished changes, packed or a leftover folder. Doc: wiki/development/the-change-loop.md
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { isMain, parseCli, usageError } from './lib/cli.mjs';

const USAGE = `usage: archive.mjs <command> [--root <dir>]
  pack <folder>…               pack each archived change folder into <folder>.md, check it, then remove the folder
  unpack <name> [--to <dir>]   write an archived change's files into <dir> (default .scratch/archive/<folder>)
  unpack <name> --edit         turn it back into its archive folder to change it; the next /save packs it again
  migrate                      pack every archived change folder; a folder that does not come back exactly stays
  check                        every packed file reads back`;
export const ARCHIVE = 'openspec/changes/archive';
const HEAD = /^<!-- openspec-archive v1 (.+) -->$/;
const FILE = /^<!-- file (.+) (utf8|base64) (\d+)(?: fence=(~+))? -->$/;
const FIRST = ['proposal.md', 'design.md', 'tasks.md'];

const posixPath = path => path.split(sep).join('/');
const nameOf = folder => folder.replace(/^\d{4}-\d{2}-\d{2}-/, '');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const rank = path => (FIRST.includes(path) ? FIRST.indexOf(path) : path.startsWith('specs/') ? 3 : 4);
const byOrder = (a, b) => rank(a) - rank(b) || compare(a, b);

/** Every file under `dir`, relative and in packing order. A link can not come back as itself, so it stops the pack. */
function walk(dir, at = dir) {
  return readdirSync(at, { withFileTypes: true }).flatMap(entry => {
    const full = join(at, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`can not pack a link: ${full}`);
    return entry.isDirectory() ? walk(dir, full) : [posixPath(relative(dir, full))];
  });
}

// Text that git keeps as it is goes in raw: valid UTF-8 with no NUL, and no CR, which git's `eol=lf` would rewrite.
const isText = bytes => isUtf8(bytes) && !bytes.includes(0) && !bytes.includes(13);
const longestRun = (text, char) => Math.max(0, ...(text.match(new RegExp(`${char}+`, 'g')) ?? []).map(run => run.length));

/** One file's entry: Markdown raw, other text in a tilde fence GitHub shows as code, anything else one base64 line. */
function entry(path, bytes) {
  const end = Buffer.from(`\n<!-- end ${path} -->\n`);
  if (!isText(bytes)) {
    const line = bytes.toString('base64');
    return [Buffer.from(`<!-- file ${path} base64 ${line.length} -->\n${line}`), end];
  }
  if (path.endsWith('.md')) return [Buffer.from(`<!-- file ${path} utf8 ${bytes.length} -->\n`), bytes, end];
  const fence = '~'.repeat(Math.max(3, longestRun(bytes.toString('utf8'), '~') + 1));
  const lang = path.match(/\.([\w-]+)$/)?.[1] ?? '';
  return [Buffer.from(`<!-- file ${path} utf8 ${bytes.length} fence=${fence} -->\n${fence}${lang}\n`), bytes,
    Buffer.from(`\n${fence}`), end];
}

/** The packed text of an archived change folder, as bytes. */
export function packBytes(folder) {
  const files = walk(folder).sort(byOrder);
  const parts = [Buffer.from(`<!-- openspec-archive v1 ${posixPath(folder).split('/').at(-1)} -->\n`)];
  for (const path of files) parts.push(...entry(path, readFileSync(join(folder, path))));
  return Buffer.concat(parts);
}

/** Each file a packed file holds, `[{ path, bytes }]` in order. A count that misses its end line throws, naming it. */
export function parsePacked(bytes, label = 'packed file') {
  let at = 0;
  const fail = why => { throw new Error(`${label}: ${why}`); };
  const line = () => {
    const end = bytes.indexOf(10, at);
    if (end < 0) fail(`no line end at byte ${at}`);
    const text = bytes.toString('utf8', at, end);
    at = end + 1;
    return text;
  };
  const folder = HEAD.exec(line())?.[1] ?? fail('not an openspec-archive v1 file');
  const files = [];
  while (at < bytes.length) {
    const [, path, encoding, count, fence] = FILE.exec(line()) ?? fail(`no file line at byte ${at}`);
    if (path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe path ${path}`);
    if (fence && !line().startsWith(fence)) fail(`${path}: no opening fence`);
    const size = Number(count);
    if (at + size > bytes.length) fail(`${path}: ${size} bytes run past the end`);
    const body = bytes.subarray(at, at + size);
    at += size;
    if (bytes[at] !== 10) fail(`${path}: the byte count does not land on a line end`);
    at += 1;
    if (fence && line() !== fence) fail(`${path}: no closing fence`);
    if (line() !== `<!-- end ${path} -->`) fail(`${path}: the byte count does not land on its end line`);
    // A picture decodes only when asked for: a reader of the plan's text never pays for it.
    files.push(encoding === 'base64' ? { path, get bytes() { return Buffer.from(body.toString('latin1'), 'base64'); } } : { path, bytes: body });
  }
  return { folder, files };
}

const cache = new Map();
/** A packed file's entries, read once per size and time it was written. */
function packedFiles(file) {
  const { size, mtimeMs } = statSync(file);
  const kept = cache.get(file);
  if (kept && kept.size === size && kept.mtimeMs === mtimeMs) return kept.files;
  const files = parsePacked(readFileSync(file), file).files;
  cache.set(file, { size, mtimeMs, files });
  return files;
}

/** One file inside a packed file, as UTF-8 text, or null. */
export const readPacked = (file, path) => packedFiles(file).find(each => each.path === path)?.bytes.toString('utf8') ?? null;

/** Write a packed file's files into `dir`; returns their paths. */
export function unpack(file, dir) {
  const files = packedFiles(file);
  for (const { path, bytes } of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), bytes);
  }
  return files.map(each => each.path);
}

// Every file of a folder, by its hash: what a round trip must give back.
const hashes = dir => new Map(walk(dir).sort(compare).map(path => [path, sha(readFileSync(join(dir, path)))]));
const sameFiles = (a, b) => a.size === b.size && [...a].every(([path, hash]) => b.get(path) === hash);

/** Pack one archived change folder into `<folder>.md`, unpack it to a temp folder, compare every file's hash, then
 *  remove the folder. A difference removes the packed file, keeps the folder, and throws. Returns the packed path. */
export function pack(folder, { encode = packBytes } = {}) {
  const dir = resolve(folder).replace(/[\\/]+$/, '');
  const file = `${dir}.md`;
  writeFileSync(file, encode(dir));
  const temp = mkdtempSync(join(tmpdir(), 'openspec-archive-'));
  try {
    unpack(file, temp);
    if (!sameFiles(hashes(dir), hashes(temp))) throw new Error(`${dir}: the packed file does not give back the same files`);
  } catch (error) {
    rmSync(file, { force: true });
    cache.delete(file);
    throw error;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  rmSync(dir, { recursive: true, force: true });
  return file;
}

const isDir = path => { try { return statSync(path).isDirectory(); } catch { return false; } };

/** Every archived change, newest first: `{ folder, name, file, packed }`, a leftover folder before its packed twin. */
export function listArchived(root) {
  const dir = join(root, ARCHIVE);
  if (!existsSync(dir)) return [];
  const found = new Map();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.set(entry.name, { folder: entry.name, name: nameOf(entry.name), file: full, packed: false });
    else if (/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name) && !found.has(entry.name.slice(0, -3))) {
      const folder = entry.name.slice(0, -3);
      if (!isDir(join(dir, folder))) found.set(folder, { folder, name: nameOf(folder), file: full, packed: true });
    }
  }
  return [...found.values()].sort((a, b) => compare(b.folder, a.folder));
}

const isFile = path => { try { return statSync(path).isFile(); } catch { return false; } };
/** One archived change by its folder name, found by its two possible paths, not by a listing of the whole archive. */
function archived(root, folder) {
  if (!folder || /[\\/]/.test(folder) || folder === '.' || folder === '..') return null;
  const file = join(root, ARCHIVE, folder);
  if (isDir(file)) return { folder, file, packed: false };
  return /^\d{4}-\d{2}-\d{2}-./.test(folder) && isFile(`${file}.md`) ? { folder, file: `${file}.md`, packed: true } : null;
}
// A reader skips a packed file that does not read back, as if the change were missing; `check` names it.
const readable = file => { try { return packedFiles(file); } catch { return null; } };

/** The files an archived change holds, relative to its folder, or null when there is no such change. */
export function filesOf(root, folder) {
  const found = archived(root, folder);
  if (!found) return null;
  return found.packed ? readable(found.file)?.map(each => each.path) ?? null : walk(found.file).sort(byOrder);
}

/** One file of an archived change, as UTF-8 text, or null when the change or the file is missing. */
export function readArchived(root, folder, path) {
  const found = archived(root, folder);
  if (!found) return null;
  if (!found.packed) {
    const file = join(found.file, path);
    return !relative(found.file, file).startsWith('..') && existsSync(file) && lstatSync(file).isFile() ? readFileSync(file, 'utf8') : null;
  }
  return readable(found.file)?.find(each => each.path === path)?.bytes.toString('utf8') ?? null;
}

/** An old path, `openspec/changes/archive/<folder>/<file>`, as `{ folder, path, text }`; null when it is not one or
 *  the file is missing. */
export function resolveArchivePath(root, path) {
  const [, folder, file] = posixPath(String(path)).match(/^openspec\/changes\/archive\/([^/]+)\/(.+)$/) ?? [];
  const text = folder ? readArchived(root, folder, file) : null;
  return text === null ? null : { folder, path: file, text };
}

/** A reader bound to one checkout, for a step that takes the archive as a slot. */
export const archiveReader = root => ({
  list: () => listArchived(root),
  files: folder => filesOf(root, folder),
  read: (folder, path) => readArchived(root, folder, path),
});

/** The archived change named by `<date>-<name>`, `<name>`, or `.../<folder>[.md]`, newest first, or null. */
export function findArchived(root, word) {
  const key = posixPath(String(word)).replace(/\/+$/, '').split('/').at(-1).replace(/\.md$/, '');
  return listArchived(root).find(each => each.folder === key || each.name === key) ?? null;
}

/** Pack every leftover folder in `root`'s archive: `{ packed, kept: [{ folder, error }] }`. */
export function migrate(root, options) {
  const result = { packed: [], kept: [] };
  for (const { folder, file, packed } of listArchived(root).reverse()) {
    if (packed) continue;
    try { result.packed.push(posixPath(relative(root, pack(file, options)))); } catch (error) { result.kept.push({ folder, error: error.message }); }
  }
  return result;
}

/** Every packed file that does not read back: `[{ file, error }]`. */
export function checkArchive(root) {
  return listArchived(root).filter(each => each.packed).flatMap(({ file }) => {
    try { packedFiles(file); return []; } catch (error) { return [{ file: posixPath(relative(root, file)), error: error.message }]; }
  });
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true,
    options: { root: { type: 'string' }, to: { type: 'string' }, edit: { type: 'boolean' } } });
  const [command, ...rest] = positionals;
  const root = resolve(values.root ?? '.');
  if (command === 'pack' && rest.length) {
    for (const folder of rest) console.log(`packed=${posixPath(relative(root, pack(resolve(root, folder))))}`);
  } else if (command === 'unpack' && rest.length === 1) {
    const found = findArchived(root, rest[0]);
    if (!found) { console.error(`archive.mjs: no archived change named ${rest[0]}`); process.exit(1); }
    const to = values.edit ? join(root, ARCHIVE, found.folder) : resolve(root, values.to ?? join('.scratch', 'archive', found.folder));
    if (found.packed) unpack(found.file, to);
    if (found.packed && values.edit) rmSync(found.file);
    console.log(`folder=${found.packed ? to : found.file}`);
  } else if (command === 'migrate' && !rest.length) {
    const { packed, kept } = migrate(root);
    console.log(`packed=${packed.length}`);
    for (const { folder, error } of kept) console.log(`kept=${folder}: ${error}`);
    if (kept.length) process.exitCode = 1;
  } else if (command === 'check' && !rest.length) {
    const bad = checkArchive(root);
    for (const { file, error } of bad) console.log(`corrupt=${file}: ${error}`);
    console.log(bad.length ? `check=fail ${bad.length}` : 'check=ok');
    if (bad.length) process.exitCode = 1;
  } else usageError(USAGE);
}
