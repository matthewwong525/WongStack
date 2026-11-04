#!/usr/bin/env node
// Company knowledge on this computer: one copy in the primary checkout, linked into each workspace, and a save that
// goes live at once. The agent picks pages and words; this does every git step. wiki/stack/company-knowledge.md
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { isMain } from './lib/cli.mjs';
import { checkWiki } from './lib/links.mjs';
import { primaryRoot } from './lib/primary-root.mjs';

/** The app's address for company knowledge, under its own origin. */
export const KNOWLEDGE_PATH = '/api/access/knowledge/git/';
/** What a save takes: pages and pictures. Anything else belongs in the code repository. */
export const SAVED = /\.(md|png|jpe?g|gif|webp)$/i;
const LOCK_STALE_MS = 120_000;
const LOCK_WAIT_MS = 30_000;
const RETRIES = 3;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const NETWORK_MS = 60_000;
// Kept in the copy's own .git: the last tip seen published, and the tip a rewrite dropped.
const PUBLISHED = 'wong-knowledge-published';
const REWRITTEN = 'wong-knowledge-rewritten';
const IGNORE = '*.mine.*\n';
const UNDO_LINE = commit => `To undo it, say "undo that save" (node .claude/skills/memory/scripts/knowledge.mjs undo ${commit.slice(0, 12)}).`;

export class KnowledgeError extends Error {}

/** Where everything is for the workspace at `cwd`. `address` is null when this install records no knowledge. */
export function place(cwd = process.cwd(), env = process.env) {
  const { root, primary, linked } = primaryRoot(cwd);
  let record = null;
  try { record = JSON.parse(readFileSync(join(primary, '.claude', '.wong-stack.json'), 'utf8')); } catch { /* none */ }
  let address = env.WONG_KNOWLEDGE_REMOTE || null;
  if (!address && record?.components?.knowledge) {
    try { address = `${new URL(record.components.memory?.worker).origin}${KNOWLEDGE_PATH}`; } catch { /* none */ }
  }
  return { root, primary, linked, copy: join(primary, 'knowledge'), link: join(root, 'knowledge'), address };
}

const run = (cwd, args, { env = {}, timeout = 15_000, input } = {}) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', input, timeout, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } });
  return { code: result.status ?? 1, stdout: (result.stdout ?? '').trim(), stderr: result.stderr ?? '' };
};
const out = (k, ...args) => run(k.copy, args).stdout;
const ok = (k, ...args) => run(k.copy, args).code === 0;
const sha = (k, ref) => { const found = run(k.copy, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return found.code ? null : found.stdout; };
const ancestor = (k, older, newer) => ok(k, 'merge-base', '--is-ancestor', older, newer);
const present = k => existsSync(join(k.copy, '.git'));

// Git reaches the app with the copy's own helper, which reads the saved company sign-in, at that address alone.
// The empty entry first stops a computer-wide helper, which would store the sign-in.
function helperConfig(k) {
  if (!(k.address ?? '').startsWith('https://')) return [];
  const scope = `credential.${k.address.replace(/\/$/, '')}`;
  const helper = `!"${process.execPath}" "${join(k.primary, 'scripts', 'company-git-credential.mjs')}"`;
  return [[`${scope}.helper`, ''], [`${scope}.helper`, helper], [`${scope}.useHttpPath`, 'true'], [`http.${k.address}.followRedirects`, 'false']];
}
const asEnv = config => ({ GIT_CONFIG_COUNT: String(config.length),
  ...Object.fromEntries(config.flatMap(([key, value], index) => [[`GIT_CONFIG_KEY_${index}`, key], [`GIT_CONFIG_VALUE_${index}`, value]])) });
const remote = (k, args) => run(k.copy, args, { timeout: NETWORK_MS });

function readMark(k, name) { try { return readFileSync(join(k.copy, '.git', name), 'utf8').trim() || null; } catch { return null; } }
function mark(k, name, value) {
  const file = join(k.copy, '.git', name);
  if (value) writeFileSync(file, `${value}\n`); else rmSync(file, { force: true });
}

/** Pages with edits not saved yet, relative to the copy. */
export function unsaved(k) {
  // -z keeps names with spaces or non-ASCII unquoted; a rename's second entry is its old name.
  const listed = spawnSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], { cwd: k.copy, encoding: 'utf8' }).stdout ?? '';
  const entries = listed.split('\0').filter(Boolean);
  const pages = [];
  for (let at = 0; at < entries.length; at++) {
    pages.push(entries[at].slice(3));
    if (/^[RC]/.test(entries[at])) at++;
  }
  return pages;
}

// One save, update or undo at a time on this computer. A lock older than two minutes was left by a stopped run.
function locked(k, work) {
  const lock = join(k.copy, '.git', 'wong-knowledge.lock');
  const until = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try { if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) { rmSync(lock, { recursive: true, force: true }); continue; } } catch { continue; }
      if (Date.now() > until) return { state: 'busy' };
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
  try { return work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

/** The published tip after a fetch, `null` for a repository with no main yet, or `false` when the app can't answer. */
function fetched(k) {
  if (remote(k, ['fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main']).code !== 0) {
    return run(k.copy, ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], { timeout: NETWORK_MS }).code === 2 ? null : false;
  }
  return sha(k, 'refs/remotes/origin/main');
}

/** True when the published history no longer holds the tip this copy last saw: someone forced an older one. */
function rewrote(k, tip) {
  const seen = readMark(k, PUBLISHED);
  const lost = Boolean(seen && tip && seen !== tip && sha(k, seen) && !ancestor(k, seen, tip));
  if (lost) mark(k, REWRITTEN, readMark(k, REWRITTEN) ?? seen);
  return lost;
}

const commitOf = (k, tree, parents, message, from) => {
  const [name, email, date] = from ? out(k, 'log', '-1', '--format=%an%x00%ae%x00%aI', from).split('\0') : [];
  const env = from ? { GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_AUTHOR_DATE: date } : {};
  const made = run(k.copy, ['commit-tree', tree, ...parents.flatMap(parent => ['-p', parent])], { env, input: message });
  if (made.code) throw new KnowledgeError(`git could not record the save: ${made.stderr.trim().split('\n')[0]}`);
  return made.stdout;
};
/** A three-way merge with no working tree: the tree, and the paths with lines both sides changed. */
function merged(k, base, ours, theirs) {
  const result = run(k.copy, ['merge-tree', '--write-tree', '--name-only', '--no-messages', `--merge-base=${base}`, ours, theirs]);
  if (result.code > 1) throw new KnowledgeError(`git could not merge (it needs Git 2.38 or newer): ${result.stderr.trim().split('\n')[0]}`);
  const [tree, ...conflicts] = result.stdout.split('\n').filter(Boolean);
  return { tree, conflicts: result.code ? conflicts : [] };
}
/** Moves main to `tip`, changing only files that differ, and refusing when one of those has unsaved edits. */
const moved = (k, tip) => run(k.copy, ['reset', '--quiet', '--keep', tip]).code === 0;

const blob = (k, spec) => { const found = spawnSync('git', ['cat-file', 'blob', spec], { cwd: k.copy }); return found.status === 0 ? found.stdout : null; };
const mineName = page => page.replace(/(\.[^./]+)$/, '.mine$1');

// This copy's saves not yet published, put on top of the published tip one by one. When two saves changed the same
// lines, main goes back to the published tip: each such page keeps its published text, with this copy's beside it.
function replay(k, tip) {
  const base = out(k, 'merge-base', tip, 'HEAD');
  const local = out(k, 'rev-list', '--reverse', '--no-merges', `${base}..HEAD`).split('\n').filter(Boolean);
  let at = tip;
  for (const commit of local) {
    const { tree, conflicts } = merged(k, `${commit}^`, at, commit);
    if (!conflicts.length) {
      if (tree !== out(k, 'rev-parse', `${at}^{tree}`)) at = commitOf(k, tree, [at], `${out(k, 'log', '-1', '--format=%B', commit)}\n`, commit);
      continue;
    }
    const rest = merged(k, `${commit}^`, at, 'HEAD');
    const changed = out(k, 'diff', '--name-only', '--no-renames', `${commit}^`, 'HEAD').split('\n').filter(Boolean);
    const mine = new Map(changed.map(page => [page, blob(k, `HEAD:${page}`)]));
    const clean = new Map(changed.map(page => [page, blob(k, `${rest.tree}:${page}`)]));
    if (!moved(k, at)) return { state: 'blocked', pages: unsaved(k) };
    const conflict = [], back = [];
    for (const page of changed) {
      const file = join(k.copy, page);
      if (rest.conflicts.includes(page)) {
        conflict.push(page);
        if (mine.get(page) !== null) writeFileSync(join(k.copy, mineName(page)), mine.get(page));
        continue;
      }
      back.push(page);
      mkdirSync(dirname(file), { recursive: true });
      if (clean.get(page) !== null) writeFileSync(file, clean.get(page)); else rmSync(file, { force: true });
    }
    return { state: 'conflict', conflict, back };
  }
  if (at !== sha(k, 'HEAD') && !moved(k, at)) return { state: 'blocked', pages: unsaved(k) };
  return { state: 'replayed' };
}

/** Publishes this copy's saves: fetch, put them on top, check, push without force; a lost race tries again. */
function publish(k, check = () => []) {
  for (let round = 0; round <= RETRIES; round++) {
    const tip = fetched(k);
    if (tip === false) return { state: 'pending', commit: sha(k, 'HEAD') };
    if (rewrote(k, tip)) return { state: 'rewritten', lost: readMark(k, REWRITTEN) };
    const head = sha(k, 'HEAD');
    if (tip && head === tip) { mark(k, PUBLISHED, tip); return { state: 'current', commit: tip }; }
    if (tip && ancestor(k, head, tip)) return { state: 'behind', commit: tip };
    if (tip && !ancestor(k, tip, head)) {
      const result = replay(k, tip);
      if (result.state !== 'replayed') return result;
      if (sha(k, 'HEAD') === tip) { mark(k, PUBLISHED, tip); return { state: 'current', commit: tip }; }
    }
    const problems = check();
    if (problems.length) return { state: 'broken', problems };
    const pushed = remote(k, ['push', '--quiet', '--porcelain', 'origin', 'HEAD:refs/heads/main']);
    if (pushed.code === 0) {
      const commit = sha(k, 'HEAD');
      mark(k, PUBLISHED, commit);
      run(k.copy, ['update-ref', 'refs/remotes/origin/main', commit]);
      return { state: 'saved', commit };
    }
    if (!/\[rejected\]|non-fast-forward|fetch first|stale info|cannot lock ref|failed to (update|lock)|incorrect old value/.test(`${pushed.stdout}\n${pushed.stderr}`)) {
      const refused = /^!\s.*$/m.exec(pushed.stdout)?.[0] ?? '';
      return refused ? { state: 'refused', reason: refused } : { state: 'pending', commit: sha(k, 'HEAD') };
    }
  }
  return { state: 'pending', commit: sha(k, 'HEAD'), reason: 'other saves kept landing first' };
}

// A path a save may take, relative to the copy, or why not. `knowledge/x.md`, `x.md` and a full path all work.
function pagePath(k, given) {
  const full = isAbsolute(given) ? given : given.split(/[\\/]/)[0] === 'knowledge' ? join(k.root, given) : join(k.copy, given);
  let base = resolve(full);
  for (const from of [k.link, k.copy]) {
    const rel = relative(from, base);
    if (!rel.startsWith('..') && !isAbsolute(rel)) { base = rel; break; }
  }
  if (isAbsolute(base) || base.startsWith('..') || !base) return { refused: `${given} is not inside knowledge/` };
  const rel = base.split(sep).join('/');
  if (rel.split('/').includes('.git')) return { refused: `${given} is git's own file` };
  if (!SAVED.test(rel) || /\.mine\.[^./]+$/.test(rel)) return { refused: `${given}: company knowledge takes only pages (.md) and pictures; code and scripts go in the code repository, through a pull request` };
  return { rel };
}

/** Link problems in what a push would publish: the pages at HEAD, read from git, never from the working folder. */
export function saveProblems(k) {
  if (!sha(k, 'HEAD')) return [];
  const root = mkdtempSync(join(tmpdir(), 'wong-knowledge-check-'));
  try {
    const env = { GIT_INDEX_FILE: join(root, 'index') };
    const read = [['read-tree', 'HEAD'], ['checkout-index', '--all', '--force', `--prefix=${join(root, 'knowledge')}${sep}`]]
      .map(args => run(k.copy, args, { env })).find(step => step.code);
    if (read) throw new KnowledgeError(`git could not read the save to check its links: ${read.stderr.trim().split('\n')[0]}`);
    rmSync(env.GIT_INDEX_FILE, { force: true });
    // A page may link into the code checkout: its folders are seen through junctions, and its top-level files are
    // copied, since a link to a file needs admin rights on Windows.
    for (const entry of readdirSync(k.root)) {
      if (entry === 'knowledge' || entry === '.git') continue;
      const from = join(k.root, entry);
      try {
        if (statSync(from).isDirectory()) symlinkSync(from, join(root, entry), 'junction');
        else copyFileSync(from, join(root, entry));
      } catch { /* not seen */ }
    }
    return checkWiki(root, 'knowledge');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const lines = (...each) => `${each.flat().filter(Boolean).join('\n')}\n`;
/** What a publish result says, for the person's assistant to repeat. */
function told(result, pages = []) {
  switch (result.state) {
    case 'saved': return lines(`saved=${result.commit}`, pages.map(page => `page=knowledge/${page}`), 'Live for the team now.', UNDO_LINE(result.commit));
    case 'current': return lines(`saved=${result.commit}`, 'Nothing new to save: this is already live.');
    case 'pending': return lines(`pending=${result.commit}`, `Not live yet: ${result.reason ?? 'the company app could not be reached, or the sign-in ran out'}. The next save or update publishes it.`);
    case 'broken': return lines('saved=none', result.problems.map(problem => `broken=${problem}`), 'Nothing was published. Fix each link, then save again.');
    case 'conflict': return lines(result.conflict.map(page => `conflict=knowledge/${page}`), result.back.map(page => `unsaved=knowledge/${page}`),
      'Someone saved the same lines first. Each conflict page now holds their version, with yours beside it as <page>.mine.<ext>.',
      'Write one page that keeps both, delete the .mine file, then save every page named here again.');
    case 'blocked': return lines('saved=none', result.pages.map(page => `unsaved=knowledge/${page}`), 'The newest version changes pages with edits not saved yet. Save or drop those first.');
    case 'rewritten': return lines(`rewritten=${result.lost}`, 'The published history lost saves this computer holds. Run `node .claude/skills/memory/scripts/knowledge.mjs restore` to put them back.');
    case 'behind': return lines(`behind=${result.commit}`, 'This copy is behind: run update first.');
    case 'refused': return lines('saved=none', `refused=${result.reason}`, 'The company app refused the save.');
    case 'busy': return lines('busy=yes', 'Another save on this computer is running. Try again in a minute.');
    default: return lines(`state=${result.state}`);
  }
}
const EXIT = { saved: 0, current: 0, updated: 0, pending: 3 };

const absent = k => lines('copy=absent', k.address ? 'This install has company knowledge, but no copy is on this computer yet: run update.' : 'This install keeps its own pages in wiki/, published through a pull request.');

/** `status`: the copy, its link, unsaved pages, saves not published yet, and whether the app answers. */
export function status(k) {
  if (!present(k)) {
    if (!k.address) return { text: absent(k), code: 0 };
    const reach = run(k.primary, ['ls-remote', '--exit-code', k.address, 'HEAD'], { env: asEnv(helperConfig(k)), timeout: NETWORK_MS });
    return { text: lines('copy=absent', reach.code === 0 ? 'reachable=yes' : 'reachable=not reachable yet', 'Run update to make the copy.'), code: 0 };
  }
  const tip = fetched(k);
  const head = sha(k, 'HEAD');
  const linkState = !k.linked ? 'primary' : linkOf(k);
  return { text: lines('copy=present', `path=${realpathSync(k.copy)}`, `link=${linkState}`,
    tip === false ? 'reachable=no' : 'reachable=yes',
    unsaved(k).map(page => `unsaved=knowledge/${page}`),
    tip && head && !ancestor(k, head, tip) ? `pending=${out(k, 'rev-list', '--count', `${tip}..HEAD`)}` : '',
    tip && head && !ancestor(k, tip, head) ? `behind=${out(k, 'rev-list', '--count', `HEAD..${tip}`)}` : '',
    readMark(k, REWRITTEN) ? `rewritten=${readMark(k, REWRITTEN)}` : ''), code: 0 };
}

function linkOf(k) {
  try {
    if (!lstatSync(k.link).isSymbolicLink() && !(process.platform === 'win32' && lstatSync(k.link).isDirectory())) return 'blocked';
    return realpathSync(k.link) === realpathSync(k.copy) ? 'ok' : 'elsewhere';
  } catch { return existsSync(k.link) ? 'blocked' : 'missing'; }
}

/** Points this workspace's `knowledge/` at the computer's one copy: primary, none, ok, made or blocked. */
export function linkCopy(k) {
  if (!k.linked) return 'primary';
  if (!present(k)) return 'none';
  const state = linkOf(k);
  if (state === 'ok' || state === 'blocked') return state;
  if (state === 'elsewhere') unlinkSync(k.link);
  // A junction needs no admin rights on Windows.
  symlinkSync(realpathSync(k.copy), k.link, process.platform === 'win32' ? 'junction' : 'dir');
  return 'made';
}

const LINK_TEXT = { none: 'No copy on this computer yet.', blocked: 'knowledge/ here is a folder, not the link; it was left as it is.' };
/** `link`: as linkCopy, for the person's assistant. A folder there already is left alone. */
export function link(k) {
  const state = linkCopy(k);
  return { text: lines(`link=${state}`, LINK_TEXT[state]), code: state === 'blocked' ? 1 : 0 };
}

// Clones beside the copy's place, then renames it in: a run deletes only the folder it made, never one already there.
function clone(k) {
  if (existsSync(k.copy)) return { text: lines('copy=blocked', `${k.copy} is a folder, but not a copy of company knowledge; it was left as it is. Move it away, then run update.`), code: 1 };
  const temp = mkdtempSync(join(dirname(k.copy), '.knowledge-clone-'));
  const fresh = { ...k, copy: temp };
  const made = run(k.primary, ['clone', '--quiet', '--origin', 'origin', k.address, temp], { env: asEnv(helperConfig(k)), timeout: NETWORK_MS });
  if (made.code !== 0) {
    rmSync(temp, { recursive: true, force: true });
    return { text: lines('copy=absent', 'reachable=not reachable yet', 'The company app did not hand out the knowledge: sign in, or wait for the first publish.'), code: 3 };
  }
  for (const [index, [key, value]] of helperConfig(k).entries()) run(temp, ['config', index ? '--add' : '--replace-all', key, value]);
  mark(fresh, PUBLISHED, sha(fresh, 'HEAD'));
  try { renameSync(temp, k.copy); } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    // Another chat made the copy first: that copy serves.
    if (!present(k)) throw error;
  }
  return { text: lines('copy=made', `path=${realpathSync(k.copy)}`, `link=${linkCopy(k)}`), code: 0 };
}

/** `update`: makes the copy when missing, then moves it to the newest saved version and publishes saves left behind. */
export function update(k) {
  if (!present(k)) return k.address ? clone(k) : { text: absent(k), code: 0 };
  const result = locked(k, () => {
    const tip = fetched(k);
    if (tip === false) return { state: 'pending', commit: sha(k, 'HEAD'), reason: 'the company app could not be reached, or the sign-in ran out' };
    if (rewrote(k, tip)) return { state: 'rewritten', lost: readMark(k, REWRITTEN) };
    const edits = unsaved(k);
    const head = sha(k, 'HEAD');
    if (!tip || head === tip) return publish(k);
    if (ancestor(k, head, tip)) {
      if (edits.length) return { state: 'kept', pages: edits };
      if (!moved(k, tip)) return { state: 'blocked', pages: edits };
      mark(k, PUBLISHED, tip);
      return { state: 'updated', commit: tip };
    }
    // Saves made here and not published yet: a push changes no file in the copy, so edits there don't stop it.
    return edits.length && !ancestor(k, tip, head) ? { state: 'kept', pages: edits } : publish(k, () => saveProblems(k));
  });
  if (result.state === 'updated') return { text: lines(`updated=${result.commit}`), code: 0 };
  if (result.state === 'kept') return { text: lines('updated=no', result.pages.map(page => `unsaved=knowledge/${page}`), 'The copy has edits not saved yet, so it was left as it is.'), code: 0 };
  return { text: told(result), code: EXIT[result.state] ?? 1 };
}

/** `save`: publishes the named pages and nothing else, live at once. */
export function save(k, given, message) {
  if (!present(k)) return { text: absent(k), code: 1 };
  if (!given.length || !message?.trim()) return { text: lines('saved=none', 'Name the pages and a message: save <pages…> -m "<what changed>".'), code: 2 };
  const pages = given.map(path => pagePath(k, path));
  const refused = pages.filter(page => page.refused);
  if (refused.length) return { text: lines('saved=none', refused.map(page => `refused=${page.refused}`)), code: 1 };
  const result = locked(k, () => {
    const rels = pages.map(page => page.rel);
    if (!existsSync(join(k.copy, '.gitignore'))) { writeFileSync(join(k.copy, '.gitignore'), IGNORE); rels.push('.gitignore'); }
    const added = run(k.copy, ['add', '--all', '--', ...rels]);
    if (added.code) return { state: 'refused', reason: added.stderr.trim().split('\n')[0] };
    if (ok(k, 'diff', '--cached', '--quiet', '--', ...rels)) return publish(k, () => saveProblems(k));
    const before = sha(k, 'HEAD');
    const made = run(k.copy, ['commit', '--quiet', '--only', '-m', message.trim(), '--', ...rels]);
    if (made.code) return { state: 'refused', reason: made.stderr.trim().split('\n')[0] };
    const result = publish(k, () => saveProblems(k));
    // A broken link takes the save back off main; its pages stay as edits here to fix.
    if (result.state === 'broken' && before) {
      run(k.copy, ['reset', '--quiet', '--soft', 'HEAD~1']);
      run(k.copy, ['reset', '--quiet', '--', ...rels]);
    }
    return result;
  });
  return { text: told(result, pages.map(page => page.rel)), code: EXIT[result.state] ?? 1 };
}

/** `undo <commit>`: one save taken back as a new save, live at once like any other. */
export function undo(k, commit) {
  if (!present(k)) return { text: absent(k), code: 1 };
  const result = locked(k, () => {
    const tip = fetched(k);
    const target = commit && sha(k, commit);
    if (!target) return { state: 'unknown' };
    if (!ancestor(k, target, 'HEAD') && tip && ancestor(k, target, tip) && ancestor(k, 'HEAD', tip) && !moved(k, tip)) return { state: 'blocked', pages: unsaved(k) };
    if (!ancestor(k, target, 'HEAD') || out(k, 'rev-list', '--parents', '-n', '1', target).split(' ').length !== 2) return { state: 'unknown' };
    const { tree, conflicts } = merged(k, target, 'HEAD', `${target}^`);
    if (conflicts.length) return { state: 'tangled', pages: conflicts };
    const subject = out(k, 'log', '-1', '--format=%s', target);
    const pages = out(k, 'diff', '--name-only', `${target}^`, target).split('\n').filter(Boolean);
    if (!moved(k, commitOf(k, tree, [sha(k, 'HEAD')], `Undo "${subject}"\n\nThis takes back ${target}.\n`))) return { state: 'blocked', pages: unsaved(k) };
    return { ...publish(k, () => saveProblems(k)), pages };
  });
  if (result.state === 'unknown') return { text: lines('undone=none', `${commit ?? 'That'} is not a save in this copy's history.`), code: 1 };
  if (result.state === 'tangled') return { text: lines('undone=none', result.pages.map(page => `conflict=knowledge/${page}`), 'A later save changed the same lines. Edit the page by hand, then save it.'), code: 1 };
  return { text: told(result, result.pages), code: EXIT[result.state] ?? 1 };
}

/** `restore`: puts back saves a forced push dropped, as a merge on top of what is published now: no force. */
export function restore(k) {
  if (!present(k)) return { text: absent(k), code: 1 };
  const result = locked(k, () => {
    const tip = fetched(k);
    if (tip === false) return { state: 'pending', commit: sha(k, 'HEAD') };
    const head = sha(k, 'HEAD');
    if (tip && ancestor(k, head, tip)) { mark(k, REWRITTEN, null); mark(k, PUBLISHED, tip); return { state: 'whole' }; }
    if (tip) {
      const { tree, conflicts } = merged(k, out(k, 'merge-base', head, tip) || EMPTY_TREE, head, tip);
      if (conflicts.length) return { state: 'tangled', pages: conflicts };
      if (!moved(k, commitOf(k, tree, [head, tip], 'Restore saves a rewritten history dropped\n'))) return { state: 'blocked', pages: unsaved(k) };
    }
    mark(k, PUBLISHED, tip);
    const published = publish(k);
    if (published.state === 'saved') mark(k, REWRITTEN, null);
    return published;
  });
  if (result.state === 'whole') return { text: lines('restored=nothing', 'The published history already holds every save here.'), code: 0 };
  if (result.state === 'tangled') return { text: lines('restored=none', result.pages.map(page => `conflict=knowledge/${page}`), 'The two histories changed the same lines. Merge those pages by hand.'), code: 1 };
  return { text: told(result), code: EXIT[result.state] ?? 1 };
}

const USAGE = `usage: knowledge.mjs <command>
  status                         the copy, its link, unsaved pages, and whether the app answers
  link                           point this workspace's knowledge/ at the computer's one copy
  update                         make the copy, or move it to the newest saved version
  save <pages…> -m "<message>"   publish those pages, live at once, after a link check
  undo <commit>                  take one save back, live at once
  restore                        put back saves a forced push dropped`;

export function main(argv, cwd = process.cwd()) {
  const [command, ...rest] = argv;
  if (!command || command === '--help') return { text: `${USAGE}\n`, code: command ? 0 : 2 };
  let k;
  try { k = place(cwd); } catch (error) { return { text: `knowledge: ${error.message}\n`, code: 1 }; }
  if (command === 'save') {
    const at = rest.findIndex(arg => arg === '-m' || arg === '--message');
    const message = at >= 0 ? rest[at + 1] : '';
    return save(k, at >= 0 ? [...rest.slice(0, at), ...rest.slice(at + 2)] : rest, message);
  }
  const commands = { status, link, update, restore, undo: k => undo(k, rest[0]) };
  if (!commands[command]) return { text: `${USAGE}\n`, code: 2 };
  return commands[command](k);
}

if (isMain(import.meta.url)) {
  let result;
  try { result = main(process.argv.slice(2)); } catch (error) { result = { text: `knowledge: ${error.message}\n`, code: 1 }; }
  process.stdout.write(result.text);
  process.exitCode = result.code;
}
