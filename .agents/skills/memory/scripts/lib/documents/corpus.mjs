// Only public knowledge documents in this checkout enter the derived index.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const COLLECTIONS = {
  wiki: 'Current reusable team guidance; read the original before acting.',
  specs: 'Recorded shipped requirements; compare with current guidance and code.',
  active: 'Proposed work, not necessarily shipped or authoritative.',
  archive: 'Historical decisions and rationale, possibly superseded.',
};
export const SCOPES = { current: ['wiki', 'specs'], history: ['wiki', 'specs', 'archive'], active: ['wiki', 'specs', 'active'], all: Object.keys(COLLECTIONS) };
export const hashText = text => createHash('sha256').update(text).digest('hex');
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sourceRole(path) {
  if (/(?:^|\/)(?:logs?|transcripts?|evidence|cache|\.cache)(?:[./-]|$)/i.test(path)
    || /(?:^|\/)(?:review|evidence|log|transcript)(?:[.-][^/]*)?\.md$/i.test(path)) return null;
  if (/^wiki\/(?!people(?:\/|$))[^\\]*\.md$/.test(path)) return 'wiki';
  if (/^openspec\/specs\/[^\\]*\.md$/.test(path)) return 'specs';
  const match = path.match(/^openspec\/changes\/(archive\/)?([a-z0-9-]+)\/(proposal\.md|design\.md|tasks\.md|specs\/[^\\]+\/spec\.md)$/);
  return match ? match[1] ? 'archive' : 'active' : null;
}
export function sourceChange(path) {
  const slug = path.match(/^openspec\/changes\/(?:archive\/)?([^/]+)\//)?.[1];
  return slug?.replace(/^\d{4}-\d{2}-\d{2}-/, '') || null;
}

export function safeSource(root, path) {
  if (!path || isAbsolute(path) || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) return null;
  if (!sourceRole(path)) return null;
  try {
    const base = realpathSync(root);
    let file = base;
    for (const part of path.split('/')) {
      file = join(file, part);
      if (lstatSync(file).isSymbolicLink()) return null;
    }
    const rel = relative(base, realpathSync(file));
    if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel) || !lstatSync(file).isFile()) return null;
    return file;
  } catch { return null; }
}

export function scanCorpus(ctx, { listFiles, deadline = Date.now() + 4000, maxBytes = 32 * 1024 * 1024, maxFileBytes = 2 * 1024 * 1024 } = {}) {
  const root = realpathSync(ctx.root);
  const paths = listFiles ? listFiles(root) : execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'wiki', 'openspec'],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 3000, windowsHide: true }).split('\0');
  const entries = {};
  let bytes = 0, omitted = 0;
  const priority = { wiki: 0, specs: 1, active: 2, archive: 3 };
  for (const path of [...new Set(paths)].sort((a, b) => (priority[sourceRole(a)] ?? 4) - (priority[sourceRole(b)] ?? 4) || a.localeCompare(b))) {
    const role = sourceRole(path), file = role && safeSource(root, path);
    if (!file) continue;
    try {
      const size = statSync(file).size;
      if (Date.now() >= deadline || size > maxFileBytes || bytes + size > maxBytes) { omitted++; continue; }
      const text = readFileSync(file, 'utf8');
      bytes += size;
      entries[path] = { path, role, hash: hashText(text), bytes: Buffer.byteLength(text), text };
    } catch { omitted++; } // A moved file during the scan never invalidates other sources.
  }
  return { root: resolve(root), entries, omitted };
}

export function scopedEntries(corpus, { scope = 'current', change } = {}) {
  return Object.values(corpus.entries).filter(entry => SCOPES[scope]?.includes(entry.role)
    && (!change || ['wiki', 'specs'].includes(entry.role) || sourceChange(entry.path) === change));
}

// Final validation reopens originals: an index hit is only a candidate.
export function verifyPassage(ctx, candidate, { beforeRead = () => {} } = {}) {
  beforeRead(candidate);
  const file = safeSource(ctx.root, candidate.path);
  if (!file) return null;
  try {
    if (statSync(file).size > 2 * 1024 * 1024) return null;
    const text = readFileSync(file, 'utf8'), hash = hashText(text), lines = text.split(/\r?\n/);
    if (hash !== candidate.hash || !Number.isInteger(candidate.startLine) || !Number.isInteger(candidate.endLine)
      || candidate.startLine < 1 || candidate.endLine < candidate.startLine || candidate.endLine > lines.length) return null;
    const excerpt = lines.slice(candidate.startLine - 1, candidate.endLine).join('\n');
    if (candidate.text !== excerpt) return null;
    return { ...candidate, role: sourceRole(candidate.path), hash, text: excerpt, freshness: 'verified',
      reference: `${candidate.path}:${candidate.startLine}` };
  } catch { return null; }
}
