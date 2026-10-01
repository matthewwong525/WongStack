// Markdown links and headings, read fresh from the files on each call: what links to a path, and whether the wiki holds.
// The one copy of the link and heading rules: `memory.mjs areas`, `.github/scripts/wiki-links.mjs`, and this repo's
// `scripts/check-payload-links.mjs` all read them here.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { normalizePath } from './areas.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', '.wrangler']);
const ARCHIVE = 'openspec/changes/archive';
const LINK = /\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g;
const FENCE = /(`{3,}|~{3,})[\s\S]*?\1/g;
const toPosix = path => path.split(sep).join('/');
const safeDecode = text => { try { return decodeURI(text); } catch { return text; } };
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
const maskCode = text => text.replace(FENCE, m => m.replace(/[^\n]/g, ' ')).replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));

// Each inline link in a file to a path, not a site: its line, the written target, where it lands (`rel`,
// repo-relative with .claude/ read as .agents/, null outside the repo), and its decoded `#section` (`anchor`, '' when
// none). A pure `#section` link lands on its own page. A folder also lands on its README.md.
export function linksIn(root, file) {
  const text = maskCode(readFileSync(join(root, file), 'utf8'));
  const out = [];
  let line = 1;
  let at = 0;
  for (const match of text.matchAll(LINK)) {
    const written = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(written)) continue;
    for (; at < match.index; at++) if (text[at] === '\n') line++;
    const anchor = safeDecode(written.match(/#(.*)$/)?.[1] ?? '');
    const target = safeDecode(written.replace(/[#?].*$/, ''));
    const abs = !target ? join(root, file) : target.startsWith('/') ? join(root, target) : resolve(root, dirname(file), target);
    const rel = normalizePath(abs, root)?.replace(/\/+$/, '') ?? null;
    out.push({ file, line, written, rel, readme: rel !== null && isDir(abs) ? posix.join(rel, 'README.md') : null, anchor });
  }
  return out;
}

// A heading's anchor as GitHub makes it: the rendered text, lowercased, every character but letters, digits, spaces,
// hyphens, and underscores dropped, and each space a hyphen. `Step 5 — the closing report` -> `step-5--the-closing-report`.
const slug = heading => heading
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/[*`]/g, '')
  .trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');

// Every anchor a Markdown file offers: its headings' slugs (a repeat gets `-1`, `-2`) and explicit `<a id>` ids.
// A heading inside fenced code does not count.
export function headingAnchors(root, file) {
  const text = readFileSync(join(root, file), 'utf8').replace(FENCE, '');
  const anchors = new Set();
  const seen = new Map();
  for (const [, heading] of text.matchAll(/^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm)) {
    const base = slug(heading);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    anchors.add(n ? `${base}-${n}` : base);
  }
  for (const [, id] of text.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) anchors.add(id);
  return anchors;
}

// `file:line` for each link, outside archived changes, that lands on the path or inside it.
export function backlinks(root, path) {
  const want = normalizePath(path, root)?.replace(/\/+$/, '');
  if (!want) return [];
  const hits = ({ rel, readme }) => rel === want || readme === want || (rel ?? '').startsWith(`${want}/`);
  return markdownFiles(root).filter(file => file !== want).flatMap(file => linksIn(root, file).filter(hits)).map(({ file, line }) => `${file}:${line}`);
}

export const wikiPages = root => markdownFiles(root, join(root, 'wiki'));

// The most words a wiki page holds, counted as `scripts/measure-context.mjs` counts them: whitespace-separated,
// across the whole file. A longer page is slow to read and costly to load.
export const WIKI_PAGE_WORDS = 3000;
const countWords = text => (text.trim() ? text.trim().split(/\s+/u).length : 0);

// What a line straight after the title is, when it is not a sentence; null for prose.
const OPENERS = [
  [/^ {0,3}#{1,6}(\s|$)/, 'a heading'], [/^\s*([-*+]|\d+[.)])\s/, 'a list'], [/^\s*\|/, 'a table'], [/^\s*>/, 'a quote'],
  [/^\s*!\[/, 'an image'], [/^\s*(`{3,}|~{3,})/, 'a code block'], [/^\s*</, 'HTML'],
];
const openerOf = line => OPENERS.find(([pattern]) => pattern.test(line))?.[1] ?? null;

// A page's size and opening problems: over the word cap, no `# ` title first, more than one title, or no sentence
// straight after the title saying what the page is. A `# ` line inside fenced code is not a title.
function pageProblems(root, page) {
  const raw = readFileSync(join(root, page), 'utf8');
  const problems = [];
  const words = countWords(raw);
  if (words > WIKI_PAGE_WORDS) problems.push(`${page}: ${words.toLocaleString('en-US')} words, over the ${WIKI_PAGE_WORDS.toLocaleString('en-US')}-word cap; split it by its sections into pages beside it`);
  const lines = raw.split(/\r?\n/);
  const masked = maskCode(raw).split(/\r?\n/);
  const first = masked.findIndex(line => line.trim());
  const titles = masked.filter(line => line.startsWith('# ')).length;
  if (first < 0 || !/^# +\S/.test(lines[first])) problems.push(`${page}: has no # title on its first line`);
  else {
    const next = lines.slice(first + 1).find(line => line.trim());
    if (next === undefined) problems.push(`${page}: has no sentence after its # title saying what the page is`);
    else if (openerOf(next)) problems.push(`${page}: opens with ${openerOf(next)}, not a sentence saying what the page is`);
  }
  if (titles > 1) problems.push(`${page}: has ${titles} # titles`);
  return problems;
}

// The wiki's problems, one line each: a link to nothing or to a heading its page lacks, a page no other wiki page
// links to (the root hub aside), a hub (README.md) that skips a page or a subfolder holding pages beside it, and a
// page over the word cap or not opening with one title and a sentence. No wiki/ has none.
export function checkWiki(root) {
  const pages = wikiPages(root);
  const links = pages.flatMap(file => linksIn(root, file));
  const problems = [];
  for (const { file, line, written, rel, readme, anchor } of links) {
    if (rel === null || !existsSync(join(root, rel))) problems.push(`${file}:${line}: links to ${written}, which does not exist`);
    else if (anchor) {
      const page = readme ?? rel;
      if (page.endsWith('.md') && existsSync(join(root, page)) && !headingAnchors(root, page).has(anchor.toLowerCase())) {
        problems.push(`${file}:${line}: links to ${written}, but ${page} has no heading #${anchor}`);
      }
    }
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
  for (const page of pages) problems.push(...pageProblems(root, page));
  return problems;
}
