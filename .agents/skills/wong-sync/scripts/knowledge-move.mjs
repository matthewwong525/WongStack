#!/usr/bin/env node
// An older install's own wiki pages move to its knowledge repo: `plan` lists and writes nothing, `move` copies and
// relinks, `recopy` carries edits made while the update waits. references/catch-up.md runs it, step `own-pages`.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { checkWiki, linksIn, MOVES_FILE, readMoves } from '../../memory/scripts/lib/links.mjs';
import { SAVED } from '../../memory/scripts/knowledge.mjs';
import { compareSelection, ownWikiFiles, shippedPaths, wikiRoot } from './preflight.mjs';

const VERSION = 1;
/** The live reader's app: when the source ships it, an app that bundles the whole wiki no longer holds the move. */
export const READER_APP = 'app/src/apps/knowledge/App.tsx';
const USAGE = `usage: knowledge-move.mjs plan|move --target <dir> --source <dir> [--record <path>]
       knowledge-move.mjs recopy --target <dir> --main <ref>`;
const SKIPPED = [/^openspec\/changes\/archive\//, /^CHANGELOG\.md$/, /^knowledge\//, /(^|\/)node_modules\//, /\.wong-stack\.json$/];
const CONFIG = /\.(json|jsonc|ya?ml|toml)$/;
const READS = /readFile|createReadStream|readdir|\?raw|\bimport\b|require\(|\bglob\b/;
const TOKEN = /(?:[\w.~@-]|\$\{[^}\n]*\}|\*|\{[^}\s]*\})*\/(?:[\w.~@/-]|\$\{[^}\n]*\}|\*|\{[^}\s]*\})*/g;
const MAX_BYTES = 1024 * 1024;
const COMMENT_WIDTH = 120;
const LINTED = /\.[cm]?[jt]sx?$/;
// Where a line's comment starts: a path named there is prose, never a reader.
const COMMENT = /(?:^|\s)(?:\/\/|#|--|\/\*+|\*)(?=\s|$)|"\$comment"/;
// Another repo's wiki pages, named from this one: `~/<repo>/docs/…`.
const OTHER_WIKI = /^(?:docs|wiki)\/(?:[^/]+\/)*(?:[^/]+\.md)?$/;
const commentAt = text => COMMENT.exec(text)?.index ?? Infinity;

export class MoveError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new MoveError(code, message); };

const git = (cwd, args, input) => spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', input, maxBuffer: 256 * 1024 * 1024 });
const hash = text => createHash('sha256').update(text).digest('hex');
const isMarkdown = file => file.endsWith('.md');
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const relativeLink = (fromFile, to) => posix.relative(posix.dirname(fromFile), to) || posix.basename(to);

// A glob or a path built with `${…}` as a test on repo paths, and the folder it starts in.
function pattern(token) {
  const glob = token.replace(/\$\{[^}]*\}/g, '*');
  const prefix = glob.slice(0, glob.search(/[*{]/)).replace(/[^/]*$/, '').replace(/\/$/, '');
  const source = glob.split(/(\*\*\/|\*|\{[^}]*\})/).map(part => {
    if (part === '**/') return '(?:.*/)?';
    if (part === '*') return '[^/]*';
    if (/^\{.*\}$/.test(part)) return `(?:${part.slice(1, -1).split(',').map(escape).join('|')})`;
    return escape(part);
  }).join('');
  return { prefix, test: path => new RegExp(`^${source}$`).test(path) };
}

// Each text file the scan reads: tracked and new, never archives, history, the knowledge copy or binaries.
function textFiles(target) {
  const listed = git(target, ['ls-files', '-co', '--exclude-standard', '-z']);
  if (listed.status !== 0) fail('git-failed', 'the target is not a git repository');
  return [...new Set(listed.stdout.split('\0').filter(Boolean))].sort().flatMap(file => {
    if (file === MOVES_FILE || SKIPPED.some(rule => rule.test(file))) return [];
    const abs = join(target, file);
    const stat = existsSync(abs) && lstatSync(abs);
    if (!stat?.isFile() || stat.size > MAX_BYTES) return [];
    const text = readFileSync(abs, 'utf8');
    return text.includes('\0') ? [] : [{ file, lines: text.split('\n') }];
  });
}

// What one path-like token on a line names: a page, a folder of pages, a pattern, a route, a site URL, or another repo.
function readToken(token, file, context) {
  const { root, target, candidates } = context;
  if (token.startsWith('//')) {
    const page = [...candidates.keys()].find(old => token.endsWith(`/${old}`));
    return page ? { kind: 'url', pages: [page] } : null;
  }
  const home = /^(?:~|\$HOME)\/([\w.-]+)\/(.+)$/.exec(token);
  if (home) return !home[1].startsWith('.') && home[1] !== posix.basename(target) && OTHER_WIKI.test(home[2]) ? { kind: 'outside' } : null;
  if (token.startsWith('/')) {
    const slug = /^\/docs\/([\w./-]+)$/.exec(token)?.[1];
    const page = slug && !/\.\w+$/.test(slug) && [`${root}/${slug}.md`, `${root}/${slug}/README.md`].find(path => candidates.has(path));
    return page ? { kind: 'route', pages: [page] } : null;
  }
  const relative = /^\.\.?\//.test(token);
  const path = posix.normalize(relative ? posix.join(posix.dirname(file), token) : token).replace(/\/$/, '');
  if (path.startsWith('../')) return relative && OTHER_WIKI.test(path.replace(/^(\.\.\/)+[^/]+\//, '')) && !isMarkdown(file) ? { kind: 'outside' } : null;
  if (/[*{]/.test(path)) {
    const { prefix, test } = pattern(path);
    if (prefix !== root && !prefix.startsWith(`${root}/`)) return null;
    const pages = [...candidates.keys()].filter(test);
    if (prefix === root) return { kind: 'whole', pages, built: token.includes('${') };
    return pages.length ? { kind: 'pattern', pages, built: token.includes('${') } : null;
  }
  if (candidates.has(path)) return { kind: 'page', pages: [path], path, relative };
  if (path === root) return null;
  const pages = [...candidates.keys()].filter(old => old.startsWith(`${path}/`));
  return pages.length ? { kind: 'folder', pages, path, relative } : null;
}

// Every token on every line that names an own page, and how each line reads it.
function scanHits(files, context, shipped) {
  const hits = [];
  for (const { file, lines } of files) {
    if (shipped.has(file)) continue;
    const markdown = isMarkdown(file);
    lines.forEach((text, index) => {
      for (const match of text.matchAll(TOKEN)) {
        const token = match[0].replace(/[.,:;]+$/, '');
        const inLink = /\]\(<?$/.test(text.slice(0, match.index));
        const found = token.includes('/') && readToken(token, file, context);
        if (!found || (markdown && inLink && found.kind !== 'route')) continue;
        const after = text.slice(match.index + token.length);
        const code = !markdown && match.index < commentAt(text);
        const config = CONFIG.test(file) && found.kind !== 'folder';
        const quote = text[match.index - 1];
        hits.push({ ...found, file, line: index + 1, token, text: text.trim(), markdown,
          reader: code && (config || READS.test(text) || after.startsWith('?raw')),
          literal: code && /['"`]/.test(quote ?? '') && after.startsWith(quote) });
      }
      if (markdown) return;
      for (const [, slug] of text.matchAll(/\bslug:\s*['"]([^'"]+)['"]/g)) {
        const page = `${context.root}/${slug}.md`;
        if (context.candidates.has(page)) hits.push({ kind: 'slug', pages: [page], file, line: index + 1, token: slug, text: text.trim() });
      }
      const literals = [...text.matchAll(/['"]([\w./-]+)['"]/g)].map(found => found[1]);
      if (/\b(?:join|resolve)\(/.test(text) && literals.some(value => value === context.root || value.startsWith(`${context.root}/`))) {
        hits.push({ kind: 'built', pages: [], file, line: index + 1, token: '', text: text.trim() });
      }
    });
  }
  return hits;
}

// The pages a reader keeps in the code repo, the docs view the live reader replaces, and what needs a hand.
function classifyReaders(hits) {
  const stays = new Map();
  const replacedReaders = [];
  const hand = [];
  const outside = [];
  const at = hit => `${hit.file}:${hit.line}`;
  const handStep = (hit, reason) => hand.push({ file: hit.file, line: hit.line, text: hit.text, reason });
  for (const hit of hits) {
    if (hit.kind === 'outside') outside.push({ file: hit.file, line: hit.line, text: hit.text });
    else if (hit.kind === 'url') handStep(hit, 'a link to a hosting site');
    else if (hit.kind === 'route' || hit.kind === 'slug') handStep(hit, 'an app docs route; the live reader replaces it');
    else if (hit.kind === 'built') handStep(hit, 'a page path built from parts as the code runs');
    else if (hit.markdown) continue;
    else if (hit.kind === 'whole') {
      if (hit.reader && /\bglob\b/.test(hit.text)) replacedReaders.push({ file: hit.file, line: hit.line, text: hit.text });
      else handStep(hit, 'a pattern over the whole wiki');
    } else if (hit.reader) {
      const reason = CONFIG.test(hit.file) ? 'config' : hit.kind === 'pattern' ? 'pattern' : 'read';
      for (const page of hit.pages) {
        if (!stays.has(page)) stays.set(page, { path: page, reason, reader: at(hit), place: posix.join(posix.dirname(hit.file), posix.basename(page)) });
      }
    } else if (hit.kind === 'pattern') handStep(hit, hit.built ? 'a page path built from parts as the code runs' : 'a pattern over pages');
  }
  return { stays, replacedReaders, hand, outside };
}

// A folder moves whole when every file under it is a moving page.
function folderMoves(moves, all, root) {
  const folders = new Map();
  for (const old of moves.keys()) {
    for (let dir = posix.dirname(old); dir !== root && dir !== '.'; dir = posix.dirname(dir)) folders.set(dir, `knowledge/${dir.slice(root.length + 1)}`);
  }
  for (const dir of folders.keys()) if (all.some(path => path.startsWith(`${dir}/`) && !moves.has(path))) folders.delete(dir);
  return folders;
}

// Each link and bare path to a moving page, rewritten from the file's new place to the page's new place.
function rewritesFor(target, files, hits, moves, folders) {
  const out = new Map();
  const add = (file, line, old, now, kind) => { if (old !== now) out.set(`${file}\0${line}\0${old}`, { file, line, old, new: now, kind }); };
  const placeOf = path => moves.get(path) ?? folders.get(path) ?? path;
  for (const { file } of files.filter(({ file }) => isMarkdown(file))) {
    for (const { line, written, rel } of linksIn(target, file)) {
      const path = written.replace(/[#?].*$/, '');
      if (!path || rel === null || written.startsWith('/')) continue;
      const from = placeOf(file);
      const to = placeOf(rel);
      if (from === file && to === rel) continue;
      add(file, line, written, `${relativeLink(from, to)}${path.endsWith('/') ? '/' : ''}${written.slice(path.length)}`, 'link');
    }
  }
  for (const hit of hits) {
    if (!['page', 'folder'].includes(hit.kind) || hit.reader || hit.literal || (hit.kind === 'folder' && !folders.has(hit.path))) continue;
    if (!moves.has(hit.pages[0]) && hit.kind === 'page') continue;
    const now = hit.relative ? relativeLink(placeOf(hit.file), placeOf(hit.path)) : placeOf(hit.path);
    add(hit.file, hit.line, hit.token, `${now}${hit.token.endsWith('/') ? '/' : ''}`, 'path');
  }
  return [...out.values()].sort((a, b) => byText(a.file, b.file) || a.line - b.line);
}

const countBy = (paths, root) => paths.reduce((counts, path) => {
  const rest = path.slice(root.length + 1);
  const folder = rest.includes('/') ? rest.split('/')[0] : '.';
  counts[folder] = (counts[folder] ?? 0) + 1;
  return counts;
}, {});

/** Lists what moves, what stays and why, the rewrites, and the hand steps; writes nothing. */
export function plan({ target: targetInput, source, record: recordInput }) {
  const compared = compareSelection({ target: targetInput, source, record: recordInput });
  const { target, record } = compared;
  const root = wikiRoot(record);
  const shipped = shippedPaths(compared);
  const own = ownWikiFiles(target, record, shipped);
  const candidates = new Map(own.filter(path => SAVED.test(path)).map(path => [path, `knowledge/${path.slice(root.length + 1)}`]));
  const differs = (old, now) => !readFileSync(join(target, old)).equals(readFileSync(join(target, now)));
  const clashes = [...candidates].filter(([old, now]) => now !== 'knowledge/README.md' && existsSync(join(target, now)) && differs(old, now));
  if (clashes.length) fail('collision', `the knowledge copy already holds other text at ${clashes.map(([, now]) => now).join(', ')}`);

  const files = textFiles(target);
  // WongStack's own files keep upstream's text; only their Markdown links follow the move.
  const upstream = new Set([...shippedPaths(compared, { withSeeded: false })].flatMap(path => [path, path.replace(/^\.claude\//, '.agents/')]));
  const hits = scanHits(files, { root, target, candidates }, upstream);
  const { stays, replacedReaders, hand, outside } = classifyReaders(hits);
  const moves = new Map([...candidates].filter(([old]) => !stays.has(old)));
  const folders = folderMoves(moves, ownWikiFiles(target, record, new Set()), root);
  for (const hit of hits.filter(hit => ['page', 'folder'].includes(hit.kind) && !hit.markdown && !hit.reader)) {
    const moving = hit.kind === 'page' ? moves.has(hit.path) : folders.has(hit.path);
    if (hit.kind === 'folder' && !moving) hand.push({ file: hit.file, line: hit.line, text: hit.text, reason: 'a folder that only partly moves' });
    else if (hit.literal && moving) hand.push({ file: hit.file, line: hit.line, text: hit.text, reason: 'a path in code; code may read it on another line' });
  }
  const rewrites = rewritesFor(target, files, hits, moves, folders);
  hand.push(...widened(files, rewrites));
  const handSteps = [...new Map(hand.map(step => [`${step.file}\0${step.line}\0${step.reason}`, step])).values()]
    .sort((x, y) => byText(x.file, y.file) || x.line - y.line);
  const readerShipped = compared.currentTree.has(READER_APP);
  const held = replacedReaders.length > 0 && !readerShipped;
  const stayList = [...own.filter(path => !SAVED.test(path)).map(path => ({ path, reason: 'not-a-page', reader: null, place: null })), ...stays.values()]
    .sort((a, b) => byText(a.path, b.path));
  return {
    version: VERSION,
    status: held ? 'held' : moves.size ? 'ready' : 'none',
    target,
    root,
    moves: Object.fromEntries(moves),
    stays: stayList,
    replacedReaders,
    readerShipped,
    held,
    rewrites,
    hand: handSteps,
    outside,
    counts: { moves: countBy([...moves.keys()], root), stays: countBy(stayList.map(stay => stay.path), root) },
  };
}

const rewriteLine = (text, { old, new: now, kind }) => (kind === 'link'
  ? text.replace(new RegExp(`\\]\\((<?)${escape(old)}(?=[>)\\s])`, 'g'), (_, angle) => `](${angle}${now}`)
  : text.replace(new RegExp(`(?<![\\w.~@/-])${escape(old)}(?![\\w~@/-]|\\.\\w)`, 'g'), now));

const byFile = rewrites => rewrites.reduce((map, rewrite) => map.set(rewrite.file, [...map.get(rewrite.file) ?? [], rewrite]), new Map());

// A code comment the longer path pushes past the comment lint's width: a hand step to rewrap it.
function widened(files, rewrites) {
  const texts = new Map(files.map(({ file, lines }) => [file, lines]));
  return [...byFile(rewrites)].filter(([file]) => LINTED.test(file)).flatMap(([file, list]) =>
    [...new Set(list.map(rewrite => rewrite.line))].flatMap(line => {
      const before = texts.get(file)[line - 1];
      const after = list.filter(rewrite => rewrite.line === line).reduce(rewriteLine, before);
      return commentAt(after) < Infinity && after.length > COMMENT_WIDTH && before.length <= COMMENT_WIDTH
        ? [{ file, line, text: after.trim(), reason: `the new path makes this comment longer than ${COMMENT_WIDTH} characters` }]
        : [];
    }));
}

function applyRewrites(target, rewrites) {
  for (const [file, list] of byFile(rewrites)) {
    const lines = readFileSync(join(target, file), 'utf8').split('\n');
    for (const rewrite of list) lines[rewrite.line - 1] = rewriteLine(lines[rewrite.line - 1], rewrite);
    writeFileSync(join(target, file), lines.join('\n'));
  }
}

const HUB = '# Company knowledge\n\nThe team\'s own pages: people, customers, and how the company works.\n';

// The knowledge root hub links each top-level page and folder, so no moved page is an orphan there.
function linkHub(target) {
  const hub = 'knowledge/README.md';
  if (!existsSync(join(target, hub))) writeFileSync(join(target, hub), HUB);
  const pages = [];
  const walk = dir => readdirSync(join(target, dir), { withFileTypes: true }).forEach(entry => {
    if (entry.name.startsWith('.')) return;
    if (entry.isDirectory()) walk(`${dir}/${entry.name}`);
    else if (entry.name.endsWith('.md') && !entry.name.endsWith('.mine.md')) pages.push(`${dir}/${entry.name}`);
  });
  walk('knowledge');
  const links = pages.flatMap(page => linksIn(target, page));
  const fromHub = links.filter(link => link.file === hub).flatMap(link => [link.rel, link.readme]);
  const linked = new Set(links.flatMap(link => [link.rel, link.readme]));
  const title = page => /^# +(.+)$/m.exec(readFileSync(join(target, page), 'utf8'))?.[1].trim() ?? posix.basename(page, '.md');
  const lines = [];
  for (const entry of readdirSync(join(target, 'knowledge'), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `knowledge/${entry.name}`;
    if (entry.name.startsWith('.') || entry.name === 'README.md') continue;
    if (!entry.isDirectory()) {
      if (entry.name.endsWith('.md') && !entry.name.endsWith('.mine.md') && !fromHub.includes(path)) lines.push(`- [${title(path)}](${entry.name})`);
    } else if (existsSync(join(target, path, 'README.md'))) {
      if (!fromHub.some(to => to === path || to?.startsWith(`${path}/`))) lines.push(`- [${title(`${path}/README.md`)}](${entry.name}/README.md)`);
    } else {
      for (const page of pages.filter(page => page.startsWith(`${path}/`) && !linked.has(page))) lines.push(`- [${title(page)}](${page.slice('knowledge/'.length)})`);
    }
  }
  if (!lines.length) return;
  const text = readFileSync(join(target, hub), 'utf8');
  writeFileSync(join(target, hub), `${text.replace(/\n*$/, '\n\n')}${lines.join('\n')}\n`);
}

function prune(target, dir, root) {
  for (let at = dir; at !== root && at.startsWith(`${root}/`); at = posix.dirname(at)) {
    try { rmdirSync(join(target, at)); } catch { return; }
  }
}

/** Moves the planned pages into `knowledge/`, fixes links, writes the moves list, and reports both wikis' problems. */
export function move(options) {
  const report = plan(options);
  if (report.held) fail('held', 'the app shows the whole wiki from the code repo; the move waits for the live reader');
  const { target } = report;
  if (!existsSync(join(target, 'knowledge')) || !statSync(join(target, 'knowledge')).isDirectory()) {
    fail('no-knowledge-copy', 'no knowledge/ copy here; run knowledge.mjs update first');
  }
  const moves = Object.entries(report.moves);
  if (!moves.length) return { status: 'none', moved: 0, rewritten: 0, save: [], problems: { [report.root]: [], knowledge: [] } };
  applyRewrites(target, report.rewrites);
  for (const [old, now] of moves) {
    mkdirSync(dirname(join(target, now)), { recursive: true });
    if (now === 'knowledge/README.md' && existsSync(join(target, now))) {
      const mine = readFileSync(join(target, old), 'utf8').replace(/^# /m, '## ');
      writeFileSync(join(target, now), `${readFileSync(join(target, now), 'utf8').replace(/\n*$/, '\n\n')}${mine}`);
    } else copyFileSync(join(target, old), join(target, now));
  }
  for (const [old] of moves) {
    rmSync(join(target, old));
    prune(target, posix.dirname(old), report.root);
  }
  linkHub(target);
  const before = readMoves(target);
  const base = git(target, ['rev-parse', 'HEAD']).stdout.trim();
  const copied = Object.fromEntries(moves.map(([, now]) => [now, { hash: hash(readFileSync(join(target, now))), from: base }]));
  const list = { version: VERSION, base, moves: { ...before?.moves, ...report.moves }, copied: { ...before?.copied, ...copied } };
  mkdirSync(join(target, '.agents'), { recursive: true });
  writeFileSync(join(target, MOVES_FILE), `${JSON.stringify(list, null, 2)}\n`);
  return {
    status: 'moved',
    moved: moves.length,
    rewritten: new Set(report.rewrites.map(rewrite => rewrite.file)).size,
    save: [...new Set([...moves.map(([, now]) => now), 'knowledge/README.md'])].sort(),
    problems: { [report.root]: checkWiki(target, report.root), knowledge: checkWiki(target, 'knowledge') },
  };
}

const show = (target, ref, path) => {
  const shown = spawnSync('git', ['-C', target, 'show', `${ref}:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  return shown.status === 0 ? shown.stdout : null;
};

// The knowledge text with the code repo's edit since the copy: git's three-way merge of the two.
function carry(knowledge, base, code) {
  const dir = mkdtempSync(join(tmpdir(), 'knowledge-recopy-'));
  try {
    const files = ['mine', 'base', 'theirs'].map((name, index) => {
      writeFileSync(join(dir, name), [knowledge, base, code][index]);
      return join(dir, name);
    });
    const merged = spawnSync('git', ['merge-file', '-p', ...files], { maxBuffer: 64 * 1024 * 1024 });
    return merged.status === 0 ? merged.stdout : null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Carries each moved page's code-repo edits since the copy to `knowledge/`; a page changed in both stops it all. */
export function recopy({ target, main }) {
  const list = readMoves(target);
  if (!list) fail('no-moves', `no ${MOVES_FILE} here; nothing was moved`);
  const ref = git(target, ['rev-parse', '--verify', `${main}^{commit}`]);
  if (ref.status !== 0) fail('invalid-argument', `${main} is not a commit`);
  const head = ref.stdout.trim();
  const carried = [];
  const conflicts = [];
  for (const [old, now] of Object.entries(list.moves)) {
    const copy = list.copied?.[now];
    const from = copy?.from ?? list.base;
    const base = show(target, from, old);
    const code = show(target, head, old);
    if (!base || !code || base.equals(code) || !existsSync(join(target, now))) continue;
    const knowledge = readFileSync(join(target, now));
    if (copy && hash(knowledge) !== copy.hash) { conflicts.push({ page: now, from: old, reason: 'changed in both places' }); continue; }
    const merged = carry(knowledge, base, code);
    if (!merged) conflicts.push({ page: now, from: old, reason: 'the code repo edit touches a fixed link' });
    else carried.push({ page: now, text: merged });
  }
  if (conflicts.length) return { status: 'conflict', carried: [], conflicts };
  for (const { page, text } of carried) {
    writeFileSync(join(target, page), text);
    list.copied = { ...list.copied, [page]: { hash: hash(text), from: head } };
  }
  if (carried.length) writeFileSync(join(target, MOVES_FILE), `${JSON.stringify(list, null, 2)}\n`);
  return { status: carried.length ? 'carried' : 'current', carried: carried.map(({ page }) => page), conflicts };
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  if (!['plan', 'move', 'recopy'].includes(mode)) fail('invalid-argument', USAGE);
  const options = { mode };
  for (let index = 0; index < rest.length; index += 2) {
    if (!['--target', '--source', '--record', '--main'].includes(rest[index]) || rest[index + 1] === undefined) fail('invalid-argument', USAGE);
    options[rest[index].slice(2)] = rest[index + 1];
  }
  return options;
}

if (isMain(import.meta.url)) {
  try {
    const { mode, ...options } = parseArgs(process.argv.slice(2));
    const result = { plan, move, recopy }[mode](options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status === 'conflict') process.exitCode = 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ version: VERSION, status: 'error', code: error?.code ?? 'unexpected-error', message: error?.message })}\n`);
    process.exitCode = 2;
  }
}
