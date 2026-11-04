// Files a page sends with its notes: the types it may send, how each is checked by its first bytes, and where the
// chat finds it. A file is checked here, on the computer, whichever way it came. wiki/development/reply-links.md

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const MB = 1024 * 1024;
export const FILE_LIMITS = { file: 25 * MB, total: 100 * MB, name: 200, question: 300 };

const starts = (bytes, ...marks) => marks.some(mark => Buffer.from(mark, 'latin1').equals(bytes.subarray(0, mark.length)));
const zip = bytes => starts(bytes, 'PK\x03\x04', 'PK\x05\x06');
// Each extension's check of a file's first bytes, at most its first 4096.
const CHECKS = {
  png: bytes => starts(bytes, '\x89PNG\r\n\x1a\n'),
  jpg: bytes => starts(bytes, '\xff\xd8\xff'),
  webp: bytes => starts(bytes, 'RIFF') && bytes.toString('latin1', 8, 12) === 'WEBP',
  gif: bytes => starts(bytes, 'GIF87a', 'GIF89a'),
  pdf: bytes => starts(bytes, '%PDF-'),
  txt: bytes => !bytes.subarray(0, 4096).includes(0),
  docx: zip,
  zip,
};
Object.assign(CHECKS, { jpeg: CHECKS.jpg, csv: CHECKS.txt, md: CHECKS.txt, json: CHECKS.txt, xlsx: zip, pptx: zip });

const extension = name => /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase() ?? '';

/** Why the name can't be sent, or null when it is one of the allowed types. */
export function nameRefused(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > FILE_LIMITS.name) return 'a file needs a name of 1 to 200 characters';
  return Object.hasOwn(CHECKS, extension(name)) ? null : `${extension(name) || 'a file with no extension'} is not a type a page may send`;
}

/** Why these first bytes are not what the name says, or null when they are. */
export function bytesRefused(name, bytes) {
  if (!bytes.length) return 'the file is empty';
  return CHECKS[extension(name)]?.(bytes) ? null : `${basename(name)} is not what its name says`;
}

/** The name with only letters, digits, `_`, `.` and `-`, at most 100 characters, its extension kept. */
export function safeName(name) {
  const clean = basename(name).replace(/[^\w.-]/g, '_').replace(/^\.+/, '_');
  const ext = extension(clean);
  return clean.length <= 100 ? clean : `${clean.slice(0, 99 - ext.length)}.${ext}`;
}

/** Where file `id` named `name` is saved in `dir`; the folder is made private first. */
export function savedPath(dir, id, name) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return join(dir, `${id}-${safeName(name)}`);
}

/** Saves `bytes` as file `id` in `dir`, readable by this computer's user alone; resolves to its path. */
export function saveFile(dir, id, name, bytes) {
  const path = savedPath(dir, id, name);
  writeFileSync(path, bytes, { mode: 0o600 });
  return path;
}

export const removeFile = path => rmSync(path, { force: true });

/** A size the chat reads: `12 KB`, rounded up, under 1 MB; else `1.5 MB`. */
export const sizeText = size => (size < MB ? `${Math.max(1, Math.ceil(size / 1024))} KB` : `${Number((size / MB).toFixed(1))} MB`);

/** The lines after a message's text that name each file: its question, name, size, and place on this computer. */
export const filesLines = files => (files.length ? ['Files:', ...files.map(file => `- ${file.question}: ${file.name}, ${sizeText(file.size)}, at ${file.path}`)].join('\n') : '');

/** The folder a page's files go to: `.scratch/<page folder>-uploads` in the checkout of `cwd`, else in `cwd`. */
export function uploadsFor(file, cwd = process.cwd()) {
  let root = resolve(cwd);
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { /* not a checkout */ }
  return join(root, '.scratch', `${basename(dirname(resolve(file)))}-uploads`);
}
