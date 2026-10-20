// Who uses a code path: each outside file whose import lines load it — directly, through .claude/ or .codex/,
// a re-export, or a tsconfig path alias — with the lines and names they use. Node built-ins only, read fresh.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { normalizePath } from './areas.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', '.wrangler']);
const ARCHIVE = 'openspec/changes/archive';
const CODE = /\.(mjs|cjs|js|ts|tsx|mts)$/;
const DECLARATION = /\.d\.[cm]?ts$/;
const CONFIG = /^(tsconfig[^/]*|jsconfig)\.json$/;
const EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js', '.mts', '.cjs'];
const LINES_SHOWN = 3;
const toPosix = path => path.split(sep).join('/');

// Code files under dir, repo-relative, skipping declarations, symlinks, and archived changes; `configs`
// collects each folder's tsconfig*/jsconfig file names for alias lookups.
function codeFiles(root, dir, configs) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = toPosix(relative(root, full));
    if (SKIP.has(entry) || rel === ARCHIVE || lstatSync(full).isSymbolicLink()) continue;
    if (statSync(full).isDirectory()) out.push(...codeFiles(root, full, configs));
    else if (CONFIG.test(entry)) configs.set(posix.dirname(rel), [...(configs.get(posix.dirname(rel)) || []), entry]);
    else if (CODE.test(entry) && !DECLARATION.test(entry)) out.push(rel);
  }
  return out.sort();
}

const blank = (out, from, to) => { for (let i = from; i < to && i < out.length; i += 1) if (out[i] !== '\n') out[i] = ' '; };

function maskString(text, out, open, quote) {
  let i = open + 1;
  while (i < text.length && text[i] !== quote && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1;
  blank(out, open + 1, i);
  return i + 1;
}

function maskTemplate(text, out, open) {
  let i = open + 1;
  while (i < text.length && text[i] !== '`') {
    if (text[i] === '\\') { blank(out, i, i + 2); i += 2; continue; }
    if (text[i] === '$' && text[i + 1] === '{') { i = maskBetween(text, out, i + 2, true) + 1; continue; }
    blank(out, i, i + 1);
    i += 1;
  }
  return i + 1;
}

const REGEX_AFTER_WORD = /\b(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

// Whether a `/` at i opens a regex: not after an operand (a name, number, `)`, `]`, a string's quote, or `x++`), nor
// a JSX `</` or `{…} />`. Reads `out`, where earlier comments and string bodies are already blank.
function opensRegex(out, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(out[j])) j -= 1;
  if (j < 0) return true;
  if (/[\w$]/.test(out[j])) return REGEX_AFTER_WORD.test(out.slice(Math.max(0, j - 10), j + 1).join(''));
  if (/[+-]/.test(out[j]) && out[j - 1] === out[j]) return false;
  if (out[j] === '}' && out[i + 1] === '>') return false;
  return !/[)\]'"`<]/.test(out[j]);
}

// Blank a regex body, classes and escapes included; a `/` with no close on its line is no regex.
function maskRegex(text, out, open) {
  let inClass = false;
  for (let i = open + 1; i < text.length && text[i] !== '\n'; i += 1) {
    if (text[i] === '\\') { i += 1; continue; }
    if (text[i] === '[') inClass = true;
    else if (text[i] === ']') inClass = false;
    else if (text[i] === '/' && !inClass) { blank(out, open + 1, i); return i + 1; }
  }
  return open + 1;
}

// Blank comments and string and regex bodies from `from` on, keeping newlines, quotes, and `${…}` bodies, so
// offsets and lines hold. With `inExpr`, stop at the `}` closing a template's `${`.
function maskBetween(text, out, from, inExpr = false) {
  let depth = 0;
  for (let i = from; i < text.length;) {
    const c = text[i];
    if (inExpr && c === '{') { depth += 1; i += 1; continue; }
    if (inExpr && c === '}') { if (!depth) return i; depth -= 1; i += 1; continue; }
    if (c === '/' && text[i + 1] === '/') { const nl = text.indexOf('\n', i); const to = nl === -1 ? text.length : nl; blank(out, i, to); i = to; continue; }
    if (c === '/' && text[i + 1] === '*') { const close = text.indexOf('*/', i + 2); const to = close === -1 ? text.length : close + 2; blank(out, i, to); i = to; continue; }
    if (c === '/' && opensRegex(out, i)) { i = maskRegex(text, out, i); continue; }
    if (c === "'" || c === '"') { i = maskString(text, out, i, c); continue; }
    if (c === '`') { i = maskTemplate(text, out, i); continue; }
    i += 1;
  }
  return text.length;
}

// A copy with comments, string, and regex bodies blanked: a name in a comment, a string, or a regex is not a use.
export function maskCode(text) {
  const out = text.split('');
  maskBetween(text, out, 0);
  return out.join('');
}

const CLAUSE = String.raw`[\w$]+(?:\s*,\s*(?:\{[^}]*\}|\*\s*as\s+[\w$]+))?|\{[^}]*\}|\*\s*as\s+[\w$]+`;
const STATEMENTS = [
  { kind: 'import', re: new RegExp(String.raw`\bimport\s+(?:type\s+)?(${CLAUSE})\s*from\s*(['"])`, 'g') },
  { kind: 'reexport', re: /\bexport\s+(?:type\s+)?(\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(['"])/g },
  { kind: 'load', re: /\bimport\s*\(?\s*(['"])/g },
  { kind: 'load', re: /\brequire\s*\(\s*(['"])/g },
];

// A file's masked text and import statements: kind, clause, the raw specifier, and the statement's span.
function parseFile(root, file) {
  const raw = readFileSync(join(root, file), 'utf8');
  const masked = maskCode(raw);
  const imports = [];
  for (const { kind, re } of STATEMENTS) {
    for (const match of masked.matchAll(re)) {
      const open = match.index + match[0].length - 1;
      const close = masked.indexOf(match[match.length - 1], open + 1);
      if (close === -1) continue;
      imports.push({ kind, clause: kind === 'load' ? '' : match[1], spec: raw.slice(open + 1, close), start: match.index, end: close + 1 });
    }
  }
  return { file, masked, imports };
}

// One pass over the repo's code, reusable across the paths of one call; targets, exports, and use text fill lazily.
export function scanCode(root) {
  const configs = new Map();
  const files = existsSync(root) ? codeFiles(root, root, configs) : [];
  return { root, set: new Set(files), records: files.map(file => parseFile(root, file)), configs, aliases: new Map(), loaded: new Map(), covering: new Map() };
}

// Parse JSON that may carry comments and trailing commas, as tsconfig allows; null when it still fails.
function looseJson(text) {
  let clean = '';
  for (let i = 0; i < text.length;) {
    const c = text[i];
    if (c === '"') { let j = i + 1; while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1; clean += text.slice(i, j + 1); i = j + 1; continue; }
    if (c === '/' && text[i + 1] === '/') { const nl = text.indexOf('\n', i); i = nl === -1 ? text.length : nl; continue; }
    if (c === '/' && text[i + 1] === '*') { const close = text.indexOf('*/', i + 2); i = close === -1 ? text.length : close + 2; continue; }
    clean += c;
    i += 1;
  }
  for (const candidate of [clean, clean.replace(/,\s*([}\]])/g, '$1')]) {
    try { return JSON.parse(candidate); } catch { /* try the next shape */ }
  }
  return null;
}

// A config with its relative `extends` applied, as TypeScript resolves it: paths against baseUrl, else the
// folder that set them; globs against the folder that set them. Package extends and cycles end the chain.
function loadConfig(rel, scan, seen = new Set()) {
  if (scan.loaded.has(rel)) return scan.loaded.get(rel);
  const full = join(scan.root, rel);
  const json = !seen.has(rel) && existsSync(full) ? looseJson(readFileSync(full, 'utf8')) : null;
  seen.add(rel);
  const config = { paths: null, pathsDir: null, baseUrl: null, include: null, files: null };
  if (json) {
    const dir = posix.dirname(rel);
    for (const parent of [json.extends ?? []].flat()) {
      if (typeof parent !== 'string' || !parent.startsWith('.')) continue;
      const path = posix.normalize(posix.join(dir, parent));
      const base = loadConfig(path.endsWith('.json') ? path : `${path}.json`, scan, seen);
      for (const key of Object.keys(config)) config[key] = base[key] ?? config[key];
    }
    const options = json.compilerOptions || {};
    if (options.paths) Object.assign(config, { paths: options.paths, pathsDir: dir });
    if (options.baseUrl) config.baseUrl = posix.normalize(posix.join(dir, options.baseUrl));
    for (const key of ['include', 'files']) {
      if (Array.isArray(json[key])) config[key] = json[key].map(pattern => globOf(dir, String(pattern), key === 'files')).filter(Boolean);
    }
  }
  config.aliases = config.paths ? aliasPatterns(config.paths, config.baseUrl ?? config.pathsDir) : null;
  scan.loaded.set(rel, config);
  return config;
}

// The alias patterns of a `paths` map, longest prefix first, resolved against `base`.
function aliasPatterns(paths, base) {
  const out = [];
  for (const [pattern, targets] of Object.entries(paths)) {
    const star = pattern.includes('*');
    const [prefix, suffix = ''] = pattern.split('*');
    const target = String([targets ?? []].flat()[0] ?? '');
    if (target) out.push({ prefix, suffix, star, target, base });
  }
  return out.sort((a, b) => b.prefix.length - a.prefix.length);
}

// A tsconfig glob as a regex over repo paths: a plain entry covers that file or folder; `**/`, `*`, and `?`
// match as TypeScript reads them. Null for a pattern outside the repo.
function globOf(dir, pattern, exact) {
  const rel = posix.normalize(posix.join(dir, pattern)).replace(/\/+$/, '');
  if (rel.startsWith('..')) return null;
  if (rel === '.') return /^/;
  const body = rel.replace(/\*\*\/|\*\*|[*?]|[.+^${}()|[\]\\]/g, part =>
    ({ '**/': '(?:.*/)?', '**': '.*', '*': '[^/]*', '?': '[^/]' })[part] ?? `\\${part}`);
  return new RegExp(exact ? `^${body}$` : /[*?]/.test(rel) ? `^${body}$` : `^${body}(?:/.*)?$`);
}

// Whether a config claims a file. `exclude` is ignored: it mostly drops test files, which still load the
// code through the test runner's own copy of the alias.
function covers(config, dir, file) {
  const globs = config.include || config.files ? [...config.include || [], ...config.files || []] : [globOf(dir, '.', false)];
  return globs.some(glob => glob.test(file));
}

// The configs at `dir`, each loaded once.
function configsIn(dir, scan) {
  return (scan.configs.get(dir) || []).map(name => loadConfig(dir === '.' ? name : `${dir}/${name}`, scan));
}

// The alias patterns of the nearest folder at or above `dir` whose configs define paths, memoized per folder.
function aliasesFor(dir, scan) {
  if (!scan.aliases.has(dir)) {
    const own = configsIn(dir, scan).flatMap(config => config.aliases || []);
    scan.aliases.set(dir, own.length ? own.sort((a, b) => b.prefix.length - a.prefix.length)
      : dir === '.' ? [] : aliasesFor(posix.dirname(dir), scan));
  }
  return scan.aliases.get(dir);
}

// Alias lists to try for an importer: the nearest config's, then each config whose include or files cover the
// file, as a TypeScript project would claim it.
function aliasListsFor(file, scan) {
  if (!scan.covering.has(file)) {
    const lists = [aliasesFor(posix.dirname(file), scan)];
    for (const dir of [...scan.configs.keys()].sort()) {
      for (const config of configsIn(dir, scan)) if (config.aliases && covers(config, dir, file)) lists.push(config.aliases);
    }
    scan.covering.set(file, lists);
  }
  return scan.covering.get(file);
}

function aliasTarget(spec, aliases) {
  for (const { prefix, suffix, star, target, base } of aliases) {
    const hits = star ? spec.startsWith(prefix) && spec.endsWith(suffix) && spec.length >= prefix.length + suffix.length : spec === prefix;
    if (hits) return posix.join(base, target.replace('*', star ? spec.slice(prefix.length, spec.length - suffix.length) : ''));
  }
  return null;
}

// A specifier's repo file: relative paths and configured aliases, .claude/.codex read as .agents/, with
// TypeScript's extension swap and index files; null for a package or an unmapped alias.
function resolveSpec(spec, file, scan) {
  const clean = spec.split(/[?#]/)[0];
  if (clean.startsWith('.')) return landOn(posix.join(posix.dirname(file), clean), scan);
  for (const aliases of aliasListsFor(file, scan)) {
    const joined = aliasTarget(clean, aliases);
    const hit = joined && landOn(joined, scan);
    if (hit) return hit;
  }
  return null;
}

function landOn(joined, scan) {
  const rel = normalizePath(posix.normalize(joined));
  if (!rel || rel.startsWith('..')) return null;
  return findFile(rel.replace(/\/+$/, ''), scan.set);
}

function findFile(rel, set) {
  if (set.has(rel)) return rel;
  if (rel.endsWith('.js')) for (const to of ['.ts', '.tsx']) if (set.has(rel.slice(0, -3) + to)) return rel.slice(0, -3) + to;
  for (const ext of EXTENSIONS) if (set.has(rel + ext)) return rel + ext;
  for (const ext of EXTENSIONS) if (set.has(`${rel}/index${ext}`)) return `${rel}/index${ext}`;
  return null;
}

function targetOf(imp, record, scan) {
  if (imp.target === undefined) imp.target = resolveSpec(imp.spec, record.file, scan);
  return imp.target;
}

// The local bindings of an import clause: named, default, and `* as ns`, with the name each one imports.
function bindings(clause) {
  const out = [];
  const named = clause.match(/\{([^}]*)\}/)?.[1] ?? '';
  for (const part of clause.replace(/\{[^}]*\}/, '').split(',')) {
    const name = part.trim();
    if (name.startsWith('*')) out.push({ local: name.replace(/^\*\s*as\s+/, ''), imported: '*' });
    else if (name) out.push({ local: name, imported: 'default' });
  }
  for (const item of named.split(',')) {
    const [from, to] = item.replace(/^\s*type\s+/, '').split(/\s+as\s+/).map(word => word.trim());
    if (from) out.push({ local: to || from, imported: from });
  }
  return out;
}

const EXPORT_DECLS = [
  /\bexport\s+(?:async\s+)?function\s*\*?\s*([\w$]+)/g,
  /\bexport\s+(?:abstract\s+)?(?:class|const|let|var|enum|interface|type)\s+([\w$]+)/g,
];

// The names a file exports, by its declaration lines; a default export counts as `default`.
function exportNames(masked) {
  const names = new Set();
  for (const re of EXPORT_DECLS) for (const [, name] of masked.matchAll(re)) names.add(name);
  for (const [, list] of masked.matchAll(/\bexport\s*(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of list.split(',')) {
      const name = item.replace(/^\s*type\s+/, '').split(/\s+as\s+/).at(-1)?.trim();
      if (name) names.add(name);
    }
  }
  if (/\bexport\s+default\b/.test(masked)) names.add('default');
  return names;
}

// Files outside the path that re-export from it, or from another such file, to a fixed point.
function conduitsOf(scan, inside) {
  const conduits = new Set();
  const reaches = target => target && (inside(target) || conduits.has(target));
  for (let grew = true; grew;) {
    grew = false;
    for (const record of scan.records) {
      if (inside(record.file) || conduits.has(record.file)) continue;
      if (record.imports.some(imp => imp.kind === 'reexport' && reaches(targetOf(imp, record, scan)))) {
        conduits.add(record.file);
        grew = true;
      }
    }
  }
  return conduits;
}

// Every name a file under the path exports: the check for names that arrive through a re-exporter.
function exportedBy(scan, inside) {
  const names = new Set();
  for (const record of scan.records) {
    if (!inside(record.file)) continue;
    record.exports ??= exportNames(record.masked);
    for (const name of record.exports) names.add(name);
  }
  return names;
}

// The masked text with every import statement blanked, so a name inside one is not a use.
function bodyOf(record) {
  if (record.body === undefined) {
    const out = record.masked.split('');
    for (const { start, end } of record.imports) blank(out, start, end);
    record.body = out.join('');
  }
  return record.body;
}

function lineOf(record, offset) {
  if (!record.newlines) {
    record.newlines = [];
    for (let at = record.masked.indexOf('\n'); at !== -1; at = record.masked.indexOf('\n', at + 1)) record.newlines.push(at);
  }
  let low = 0;
  let high = record.newlines.length;
  while (low < high) { const mid = (low + high) >> 1; if (record.newlines[mid] < offset) low = mid + 1; else high = mid; }
  return low + 1;
}

const escapeName = name => name.replace(/\$/g, '\\$');

// Where the imported names appear outside the file's import lines; a namespace import counts as `ns.`.
function usesIn(record, locals) {
  const offsets = [];
  const names = new Set();
  if (!locals.length) return { offsets, names };
  const body = bodyOf(record);
  const seen = new Set();
  for (const { local, imported } of locals) {
    const key = `${local}\n${imported}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const re = new RegExp(`(?<![\\w$.])${escapeName(local)}${imported === '*' ? '\\s*\\.' : '(?![\\w$])'}`, 'g');
    for (const match of body.matchAll(re)) {
      offsets.push(match.index);
      names.add(imported === '*' || imported === 'default' ? local : imported);
    }
  }
  return { offsets, names };
}

// One file's claim on the path: null, or its lines (up to three), the imported names it uses, and the
// re-exporting file a name came through.
function userOf(record, scan, { inside, conduits, exported }) {
  const locals = [];
  const loadOffsets = [];
  let via = null;
  let direct = false;
  for (const imp of record.imports) {
    const target = targetOf(imp, record, scan);
    if (!target) continue;
    if (imp.kind === 'load' && inside(target)) loadOffsets.push(imp.start);
    if (imp.kind !== 'import') continue;
    if (inside(target)) { locals.push(...bindings(imp.clause)); direct = true; continue; }
    if (!conduits.has(target)) continue;
    const passed = bindings(imp.clause).filter(({ imported }) => (imported === '*' ? exported.size > 0 : exported.has(imported)));
    if (passed.length) { locals.push(...passed); via ||= target; }
  }
  const { offsets, names } = usesIn(record, locals);
  if (!offsets.length && !loadOffsets.length) return null;
  const lines = [];
  for (const offset of [...new Set([...offsets, ...loadOffsets])].sort((a, b) => a - b)) {
    const line = lineOf(record, offset);
    if (!lines.includes(line)) lines.push(line);
    if (lines.length === LINES_SHOWN) break;
  }
  return { file: record.file, lines, names: [...names].sort(), via: direct ? null : via };
}

// The code files outside `path` that import from it and use what they import, read fresh; nothing for a
// Markdown or missing path. Pass one `cache` Map across paths to scan the repo once.
export function codeUsers(root, path, cache = new Map()) {
  const want = normalizePath(path, root)?.replace(/\/+$/, '');
  if (!want || want.endsWith('.md') || !existsSync(join(root, want))) return [];
  if (!cache.has(root)) cache.set(root, scanCode(root));
  const scan = cache.get(root);
  const inside = file => file === want || file.startsWith(`${want}/`);
  const context = { inside, conduits: conduitsOf(scan, inside), exported: exportedBy(scan, inside) };
  const users = [];
  for (const record of scan.records) {
    if (inside(record.file)) continue;
    const user = userOf(record, scan, context);
    if (user) users.push(user);
  }
  return users;
}
