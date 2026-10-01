// Markdown links, read fresh from the files on each call: what links to a path, and whether the wiki's links hold.
// The one copy of the link rules: `memory.mjs areas` and `.github/scripts/wiki-links.mjs` both read them here.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { normalizePath } from './areas.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', '.wrangler']);
const ARCHIVE = 'openspec/changes/archive';
const LINK = /\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g;
const toPosix = path => path.split(sep).join('/');
const isDir = abs => { try { return statSync(abs).isDirectory(); } catch { return false; } };

// Every real .md file under dir, repo-relative; symlinks (.claude, .codex, CLAUDE.md) are read through their real path.
export function markdownFiles(root, dir = root) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = toPosix(relative(root, full));
    if (SKIP.has(entry) || rel === ARCHIVE || lstatSync(full).isSymbolicLink()) continue;
    if (statSync(full).isDirectory()) out.push(...markdownFiles(root, full));
    else if (entry.endsWith('.md')) out.push(rel);
  }
  return out.sort();
}

// Blank fenced code and code spans, keeping every newline: a command in backticks is not a link.
const maskCode = text => text.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, m => m.replace(/[^\n]/g, ' ')).replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));

// Each inline link in a file to a path, not a site or a pure #anchor: its line, the written target, and where it
// lands (`rel`, repo-relative with .claude/ read as .agents/, null outside the repo). A folder also lands on its README.md.
export function linksIn(root, file) {
  const text = maskCode(readFileSync(join(root, file), 'utf8'));
  const out = [];
  let line = 1;
  let at = 0;
  for (const match of text.matchAll(LINK)) {
    const written = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(written) || written.startsWith('#')) continue;
    for (; at < match.index; at++) if (text[at] === '\n') line++;
    let target = written.replace(/[#?].*$/, '');
    try { target = decodeURI(target); } catch { /* keep it as written */ }
    const abs = target.startsWith('/') ? join(root, target) : resolve(root, dirname(file), target);
    const rel = normalizePath(abs, root)?.replace(/\/+$/, '') ?? null;
    out.push({ file, line, written, rel, readme: rel !== null && isDir(abs) ? posix.join(rel, 'README.md') : null });
  }
  return out;
}

// `file:line` for each link, outside archived changes, that lands on the path or inside it.
export function backlinks(root, path) {
  const want = normalizePath(path, root)?.replace(/\/+$/, '');
  if (!want) return [];
  const hits = ({ rel, readme }) => rel === want || readme === want || (rel ?? '').startsWith(`${want}/`);
  return markdownFiles(root).filter(file => file !== want).flatMap(file => linksIn(root, file).filter(hits)).map(({ file, line }) => `${file}:${line}`);
}

export const wikiPages = root => markdownFiles(root, join(root, 'wiki'));

// The wiki's link problems, one line each: a link to nothing, a page no other wiki page links to (the root hub
// aside), and a hub (README.md) that skips a page or a subfolder holding pages beside it. No wiki/ has none.
export function checkWiki(root) {
  const pages = wikiPages(root);
  const links = pages.flatMap(file => linksIn(root, file));
  const problems = [];
  for (const { file, line, written, rel } of links) {
    if (rel === null || !existsSync(join(root, rel))) problems.push(`${file}:${line}: links to ${written}, which does not exist`);
  }
  const linked = new Set(links.flatMap(({ file, rel, readme }) => [rel, readme].filter(to => to && to !== file)));
  for (const page of pages) if (page !== 'wiki/README.md' && !linked.has(page)) problems.push(`${page}: no other wiki page links to it`);
  for (const hub of pages.filter(page => posix.basename(page) === 'README.md')) {
    const dir = posix.dirname(hub);
    const own = links.filter(link => link.file === hub).flatMap(({ rel, readme }) => [rel, readme]).filter(Boolean);
    for (const entry of readdirSync(join(root, dir)).sort()) {
      const child = `${dir}/${entry}`;
      const folder = isDir(join(root, child));
      if (folder ? !pages.some(page => page.startsWith(`${child}/`)) : !entry.endsWith('.md') || entry === 'README.md') continue;
      if (!own.some(to => to === child || (folder && to.startsWith(`${child}/`)))) problems.push(`${hub}: does not link ${entry}${folder ? '/' : ''}`);
    }
  }
  return problems;
}
