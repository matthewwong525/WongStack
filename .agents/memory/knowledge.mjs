#!/usr/bin/env node
// Company knowledge: one shared copy in the primary checkout, a folder of its own per workspace, and a save that goes
// live at once. The agent picks pages and words; this does every git step. wiki/stack/company-knowledge.md
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { isMain } from '../skills/memory/scripts/lib/cli.mjs';
import { checkWiki } from './lib/links.mjs';
import { primaryRoot } from '../skills/memory/scripts/lib/primary-root.mjs';

/** The app's address for company knowledge, under its own origin. */
export const KNOWLEDGE_PATH = '/api/access/knowledge/git/';
/** What a save takes: pages and pictures. Anything else belongs in the code repository. */
export const SAVED = /\.(md|png|jpe?g|gif|webp)$/i;
const LOCK_STALE_MS = 120_000;
const LOCK_WAIT_MS = 30_000;
const RETRIES = 3;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const NETWORK_MS = 60_000;
// Kept in the shared copy's own .git: the last tip seen published, and the tip a rewrite dropped.
const PUBLISHED = 'wong-knowledge-published';
const REWRITTEN = 'wong-knowledge-rewritten';
// Kept in each folder's own git dir while its edits move forward, so a stopped run can finish the move.
export const WIP = 'wong-knowledge-wip';
const IGNORE = '*.mine.*\n';
const MINE = /\.mine(\.[^./]+)$/;
const UNDO_LINE = commit => `To undo it, say "undo that save" (node .claude/memory/knowledge.mjs undo ${commit.slice(0, 12)}).`;

export class KnowledgeError extends Error {}

/** Where everything is for the workspace at `cwd`: `dir` is its own folder. `address` is null with no knowledge. */
export function place(cwd = process.cwd(), env = process.env) {
  const { root, primary, linked } = primaryRoot(cwd);
  let record = null;
  try { record = JSON.parse(readFileSync(join(primary, '.claude', '.wong-stack.json'), 'utf8')); } catch { /* none */ }
  let address = env.WONG_KNOWLEDGE_REMOTE || null;
  if (!address && record?.components?.knowledge) {
    try { address = `${new URL(record.components.memory?.worker).origin}${KNOWLEDGE_PATH}`; } catch { /* none */ }
  }
  const copy = join(primary, 'knowledge'), link = join(root, 'knowledge');
  return { root, primary, linked, copy, link, dir: linked ? link : copy, address };
}

const run = (cwd, args, { env = {}, timeout = 15_000, input } = {}) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', input, timeout, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } });
  return { code: result.status ?? 1, stdout: (result.stdout ?? '').trim(), stderr: result.stderr ?? '' };
};
// Refs and objects are shared by every folder; HEAD and the working tree are the folder's own.
const out = (k, ...args) => run(k.dir, args).stdout;
const ok = (k, ...args) => run(k.dir, args).code === 0;
const sha = (k, ref) => { const found = run(k.dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return found.code ? null : found.stdout; };
const blobId = (k, spec) => { const found = run(k.dir, ['rev-parse', '--verify', '--quiet', spec]); return found.code ? null : found.stdout; };
const ancestor = (k, older, newer) => ok(k, 'merge-base', '--is-ancestor', older, newer);
const present = k => existsSync(join(k.copy, '.git'));
const shared = k => ({ ...k, dir: k.copy });
const nul = text => text.split('\0').filter(Boolean);

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
const remote = (k, args) => run(k.dir, args, { timeout: NETWORK_MS });

function readMark(k, name) { try { return readFileSync(join(k.copy, '.git', name), 'utf8').trim() || null; } catch { return null; } }
function mark(k, name, value) {
  const file = join(k.copy, '.git', name);
  if (value) writeFileSync(file, `${value}\n`); else rmSync(file, { force: true });
}
/** The folder's wip mark: in its own git dir, so each folder keeps its own. */
export const wipMark = k => join(run(k.dir, ['rev-parse', '--absolute-git-dir']).stdout || join(k.dir, '.git'), WIP);

/** Pages with edits not saved yet, relative to the folder. */
export function unsaved(k) {
  // -z keeps names with spaces or non-ASCII unquoted; a rename's second entry is its old name.
  const listed = spawnSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], { cwd: k.dir, encoding: 'utf8' }).stdout ?? '';
  const entries = nul(listed);
  const pages = [];
  for (let at = 0; at < entries.length; at++) {
    pages.push(entries[at].slice(3));
    if (/^[RC]/.test(entries[at])) at++;
  }
  return pages;
}

/** Pages with a `.mine` version beside them: a clash the chat still has to merge. */
export function clashes(k) {
  const listed = spawnSync('git', ['ls-files', '-z', '--others', '--ignored', '--exclude-standard'], { cwd: k.dir, encoding: 'utf8' }).stdout ?? '';
  return nul(listed).filter(file => MINE.test(file)).map(file => file.replace(MINE, '$1'));
}

// One save, update or undo at a time on this computer, across every folder. A lock older than two minutes was left
// by a stopped run. A move a stopped run left half done is finished first.
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
  try { recover(k); return work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

/** The published tip after a fetch, `null` for a repository with no main yet, or `false` when the app can't answer. */
function fetched(k) {
  if (remote(k, ['fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main']).code !== 0) {
    return run(k.dir, ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], { timeout: NETWORK_MS }).code === 2 ? null : false;
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

const STAND_IN = { GIT_AUTHOR_NAME: 'knowledge', GIT_AUTHOR_EMAIL: 'knowledge@localhost', GIT_COMMITTER_NAME: 'knowledge', GIT_COMMITTER_EMAIL: 'knowledge@localhost' };
const commitOf = (k, tree, parents, message, from, env = {}) => {
  const [name, email, date] = from ? out(k, 'log', '-1', '--format=%an%x00%ae%x00%aI', from).split('\0') : [];
  const author = from ? { GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_AUTHOR_DATE: date } : {};
  const made = run(k.dir, ['commit-tree', tree, ...parents.flatMap(parent => ['-p', parent])], { env: { ...env, ...author }, input: message });
  if (made.code) throw new KnowledgeError(`git could not record the save: ${made.stderr.trim().split('\n')[0]}`);
  return made.stdout;
};
/** A three-way merge with no working tree: the tree, and the paths with lines both sides changed. */
function merged(k, base, ours, theirs) {
  const merge = ['-c', 'core.quotePath=false', 'merge-tree', '--write-tree', '--name-only', '--no-messages'];
  const result = run(k.dir, [...merge, `--merge-base=${base}`, ours, theirs]);
  if (result.code > 1) throw new KnowledgeError(`git could not merge (it needs Git 2.38 or newer): ${result.stderr.trim().split('\n')[0]}`);
  const [tree, ...conflicts] = result.stdout.split('\n').filter(Boolean);
  return { tree, conflicts: result.code ? conflicts : [] };
}
const treeOf = (k, ref) => out(k, 'rev-parse', `${ref}^{tree}`);

function withIndex(work) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-knowledge-index-'));
  try { return work({ GIT_INDEX_FILE: join(dir, 'index') }); } finally { rmSync(dir, { recursive: true, force: true }); }
}
/** `tree` with each of `pages` as `from` holds it, or gone where `from` has none. */
function withPages(k, tree, from, pages) {
  return withIndex(env => {
    run(k.dir, ['read-tree', tree], { env });
    for (const page of pages) {
      const [entry] = nul(out(k, 'ls-tree', '-z', from, '--', page));
      const [mode, , id] = (entry ?? '').split('\t')[0].split(' ');
      run(k.dir, entry ? ['update-index', '--add', '--cacheinfo', `${mode},${id},${page}`] : ['update-index', '--force-remove', '--', page], { env });
    }
    return run(k.dir, ['write-tree'], { env }).stdout;
  });
}

const content = (k, id) => { const found = spawnSync('git', ['cat-file', 'blob', id], { cwd: k.dir }); return found.status === 0 ? found.stdout : null; };
const mineName = page => page.replace(/(\.[^./]+)$/, '.mine$1');
function writeFile(k, page, data) {
  const file = join(k.dir, page);
  if (data === null) { rmSync(file, { force: true }); return; }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}
/** Each clash's other version beside its page, as `<page>.mine.<ext>`; the pages named. */
function writeMine(k, list) {
  for (const { page, blob } of list) if (blob) writeFile(k, mineName(page), content(k, blob));
  return [...new Set(list.map(({ page }) => page))];
}

/** The folder's edits, untracked pages included, as a commit on `from`; `from` itself when there are none. */
export function snapshot(k, from) {
  return withIndex(env => {
    for (const args of [['read-tree', from], ['add', '--all']]) {
      const step = run(k.dir, args, { env });
      if (step.code) throw new KnowledgeError(`git could not read the edits here: ${step.stderr.trim().split('\n')[0]}`);
    }
    const tree = run(k.dir, ['write-tree'], { env }).stdout;
    return tree === treeOf(k, from) ? from : commitOf(k, tree, [from], 'Edits not saved yet\n', null, STAND_IN);
  });
}

// Moves the folder from `from` to `to` and puts its own edits back on top, merged. Where both changed the same lines,
// the page keeps `to`'s text and the folder's goes beside it; so does each clash a replayed save brought.
function forward(k, from, to, clash = []) {
  if (from === to && !clash.length) return [];
  const file = wipMark(k);
  writeFileSync(file, `${JSON.stringify({ from, wip: snapshot(k, from), to, clash })}\n`);
  return finish(k, file);
}
function finish(k, file) {
  const { from, wip, to, clash } = JSON.parse(readFileSync(file, 'utf8'));
  const { tree, conflicts } = wip === from ? { tree: treeOf(k, to), conflicts: [] } : merged(k, from, to, wip);
  const reset = run(k.dir, ['reset', '--quiet', '--hard', to]);
  if (reset.code) throw new KnowledgeError(`git could not move the folder: ${reset.stderr.trim().split('\n')[0]}`);
  for (const page of nul(out(k, 'diff', '--name-only', '--no-renames', '-z', to, tree))) {
    if (!conflicts.includes(page)) writeFile(k, page, content(k, `${tree}:${page}`));
  }
  const pages = writeMine(k, [...conflicts.map(page => ({ page, blob: blobId(k, `${wip}:${page}`) })), ...clash]);
  rmSync(file, { force: true });
  return pages;
}
function recover(k) {
  if (!existsSync(join(k.dir, '.git'))) return;
  const file = wipMark(k);
  if (existsSync(file)) finish(k, file);
}

// This folder's saves not yet published, rebuilt one by one on the published tip, in memory. A page two saves changed
// on the same lines keeps the tip's text there; the branch's own final text goes in `clash`.
function rebuild(k, tip, head) {
  const base = out(k, 'merge-base', tip, head);
  const local = out(k, 'rev-list', '--reverse', '--no-merges', `${base}..${head}`).split('\n').filter(Boolean);
  const clash = new Map();
  let at = tip;
  for (const commit of local) {
    let { tree, conflicts } = merged(k, `${commit}^`, at, commit);
    if (conflicts.length) {
      tree = withPages(k, tree, at, conflicts);
      for (const page of conflicts) clash.set(page, blobId(k, `${head}:${page}`));
    }
    if (tree !== treeOf(k, at)) at = commitOf(k, tree, [at], `${out(k, 'log', '-1', '--format=%B', commit)}\n`, commit);
  }
  return { next: at, clash: [...clash].map(([page, blob]) => ({ page, blob })) };
}

// The shared copy follows the published version when it holds nothing of its own, so a search there stays current.
function catchUp(k, tip) {
  const copy = shared(k);
  if (k.dir === k.copy || unsaved(copy).length) return;
  const head = sha(copy, 'HEAD');
  if (head && head !== tip && ancestor(copy, head, tip)) run(k.copy, ['reset', '--quiet', '--keep', tip]);
}

/** Publishes `head` (default HEAD): rebuilds its saves on the fetched tip in memory, checks that, pushes it with no
 *  force, and only then moves the folder there with `land`. A lost race tries again. */
function publish(k, check = () => [], { head = sha(k, 'HEAD'), from = sha(k, 'HEAD'), land } = {}) {
  land ??= (next, clash) => { const pages = forward(k, from, next, clash); catchUp(k, next); return pages; };
  // A new save that can't go out yet still stays on the branch, to go with the next update.
  const hold = () => { if (head !== from) land(head, []); };
  for (let round = 0; round <= RETRIES; round++) {
    const tip = fetched(k);
    if (tip === false) { hold(); return { state: 'pending', commit: head }; }
    if (rewrote(k, tip)) { hold(); return { state: 'rewritten', lost: readMark(k, REWRITTEN) }; }
    if (!head) return { state: 'current', commit: tip ?? 'none' };
    if (tip && ancestor(k, head, tip)) {
      mark(k, PUBLISHED, tip);
      return { state: head === tip ? 'current' : 'updated', commit: tip, conflict: land(tip, []) };
    }
    const { next, clash } = tip && !ancestor(k, tip, head) ? rebuild(k, tip, head) : { next: head, clash: [] };
    if (next === tip) {
      mark(k, PUBLISHED, tip);
      return { state: clash.length ? 'conflict' : 'current', commit: tip, conflict: land(tip, clash) };
    }
    const problems = check(next, tip);
    if (problems.length) return { state: 'broken', problems };
    const pushed = remote(k, ['push', '--quiet', '--porcelain', 'origin', `${next}:refs/heads/main`]);
    if (pushed.code === 0) {
      mark(k, PUBLISHED, next);
      run(k.dir, ['update-ref', 'refs/remotes/origin/main', next]);
      return { state: 'saved', commit: next, conflict: land(next, clash) };
    }
    if (!/\[rejected\]|non-fast-forward|fetch first|stale info|cannot lock ref|failed to (update|lock)|incorrect old value/.test(`${pushed.stdout}\n${pushed.stderr}`)) {
      hold();
      const refused = /^!\s.*$/m.exec(pushed.stdout)?.[0] ?? '';
      return refused ? { state: 'refused', reason: refused } : { state: 'pending', commit: head };
    }
  }
  hold();
  return { state: 'pending', commit: head, reason: 'other saves kept landing first' };
}

// A path a save may take, relative to the folder, or why not. `knowledge/x.md`, `x.md` and a full path all work.
function pagePath(k, given) {
  const full = isAbsolute(given) ? given : given.split(/[\\/]/)[0] === 'knowledge' ? join(k.root, given) : join(k.dir, given);
  let base = resolve(full);
  for (const from of [k.dir, k.link, k.copy]) {
    const rel = relative(from, base);
    if (!rel.startsWith('..') && !isAbsolute(rel)) { base = rel; break; }
  }
  if (isAbsolute(base) || base.startsWith('..') || !base) return { refused: `${given} is not inside knowledge/` };
  const rel = base.split(sep).join('/');
  if (rel.split('/').includes('.git')) return { refused: `${given} is git's own file` };
  if (!SAVED.test(rel) || MINE.test(rel)) return { refused: `${given}: company knowledge takes only pages (.md) and pictures; code and scripts go in the code repository, through a pull request` };
  return { rel };
}

// A problem without its line number, so a line moved by an edit above it reads as the same problem.
const sameProblem = problem => problem.replace(/^([^:]+):\d+:/, '$1:');
/** Link problems a push would add: the pages at `commit`, less any problem `base` (the published tip) already has, so a
 *  broken link someone else published never stops another save. Read from git, never from the working folder. */
export function saveProblems(k, commit = 'HEAD', base = null) {
  const found = wikiProblems(k, commit);
  if (!base || !found.length) return found;
  const known = new Set(wikiProblems(k, base).map(sameProblem));
  return found.filter(problem => !known.has(sameProblem(problem)));
}
function wikiProblems(k, commit) {
  if (!sha(k, commit)) return [];
  const root = mkdtempSync(join(tmpdir(), 'wong-knowledge-check-'));
  try {
    const env = { GIT_INDEX_FILE: join(root, 'index') };
    const read = [['read-tree', commit], ['checkout-index', '--all', '--force', `--prefix=${join(root, 'knowledge')}${sep}`]]
      .map(args => run(k.dir, args, { env })).find(step => step.code);
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
const clashLines = (pages = []) => (pages.length ? [...pages.map(page => `conflict=knowledge/${page}`),
  'Someone saved the same lines first. Each page named here holds the published version, with yours beside it as <page>.mine.<ext>.',
  'Write one page that keeps both, delete the .mine file, then save it again.'] : []);
/** What a publish result says, for the person's assistant to repeat. */
function told(result, pages = []) {
  switch (result.state) {
    case 'saved': return lines(`saved=${result.commit}`, pages.map(page => `page=knowledge/${page}`), 'Live for the team now.', UNDO_LINE(result.commit), clashLines(result.conflict));
    case 'current': return lines(`saved=${result.commit}`, 'Nothing new to save: this is already live.', clashLines(result.conflict));
    case 'updated': return lines(`updated=${result.commit}`, clashLines(result.conflict));
    case 'conflict': return lines('saved=none', clashLines(result.conflict));
    case 'pending': return lines(`pending=${result.commit}`, `Not live yet: ${result.reason ?? 'the company app could not be reached, or the sign-in ran out'}. The next save or update publishes it.`);
    case 'broken': return lines('saved=none', result.problems.map(problem => `broken=${problem}`), 'Nothing was published. Fix each link, then save again.');
    case 'rewritten': return lines(`rewritten=${result.lost}`, 'The published history lost saves this computer holds. Run `node .claude/memory/knowledge.mjs restore` to put them back.');
    case 'refused': return lines('saved=none', `refused=${result.reason}`, 'The company app refused the save.');
    case 'busy': return lines('busy=yes', 'Another save on this computer is running. Try again in a minute.');
    default: return lines(`state=${result.state}`);
  }
}
const EXIT = { saved: 0, current: 0, updated: 0, pending: 3, conflict: 4 };
/** 4 when a page clashed, so a script can tell a clean save from one that left a page to merge. */
const exitOf = result => (result.conflict?.length ? 4 : EXIT[result.state] ?? 1);

const absent = k => lines('copy=absent', k.address ? 'This install has company knowledge, but no copy is on this computer yet: run update.' : 'This install keeps its own pages in wiki/, published through a pull request.');
const noFolder = k => {
  const state = k.linked ? folderState(k) : 'missing';
  return { text: lines(`folder=${state}`, state === 'blocked' ? FOLDER_TEXT.blocked : `${k.link} is not this workspace's folder of company knowledge yet: run update.`), code: 1 };
};
// In a workspace, only its own worktree counts: an old link's .git is the shared copy's, with other chats' drafts.
const hasFolder = k => (k.linked ? folderState(k) === 'ok' : existsSync(join(k.dir, '.git')));
/** Turns an old link into this workspace's own folder first, so no command works in the shared copy's tree. */
function ownFolder(k) {
  if (!k.linked || !present(k)) return null;
  try { return folderFor(k); } catch { return null; }
}
const realOr = path => { try { return realpathSync(path); } catch { return path; } };

/** `status`: the copy, this folder, unsaved pages, clashes, saves not published yet, and whether the app answers. */
export function status(k) {
  if (!present(k)) {
    if (!k.address) return { text: absent(k), code: 0 };
    const reach = run(k.primary, ['ls-remote', '--exit-code', k.address, 'HEAD'], { env: asEnv(helperConfig(k)), timeout: NETWORK_MS });
    return { text: lines('copy=absent', reach.code === 0 ? 'reachable=yes' : 'reachable=not reachable yet', 'Run update to make the copy.'), code: 0 };
  }
  const made = ownFolder(k);
  const tip = fetched(shared(k));
  const own = hasFolder(k);
  const head = own ? sha(k, 'HEAD') : null;
  return { text: lines('copy=present', `path=${realOr(own ? k.dir : k.copy)}`,
    `folder=${!k.linked ? 'primary' : ['made', 'switched'].includes(made) ? made : folderState(k)}`,
    tip === false ? 'reachable=no' : 'reachable=yes',
    own ? unsaved(k).map(page => `unsaved=knowledge/${page}`) : [],
    own ? clashes(k).map(page => `conflict=knowledge/${page}`) : [],
    tip && head && !ancestor(k, head, tip) ? `pending=${out(k, 'rev-list', '--count', '--no-merges', `${tip}..${head}`)}` : '',
    tip && head && !ancestor(k, tip, head) ? `behind=${out(k, 'rev-list', '--count', `${head}..${tip}`)}` : '',
    readMark(k, REWRITTEN) ? `rewritten=${readMark(k, REWRITTEN)}` : ''), code: 0 };
}

/** What `knowledge/` is in a workspace: ok (its own folder), link (the old link), elsewhere, missing or blocked. */
function folderState(k) {
  let stat;
  try { stat = lstatSync(k.link); } catch { return 'missing'; }
  if (stat.isSymbolicLink()) return realOr(k.link) === realOr(k.copy) ? 'link' : 'elsewhere';
  if (!stat.isDirectory() || !existsSync(join(k.link, '.git'))) return 'blocked';
  const common = run(k.link, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return !common.code && realOr(common.stdout) === realOr(join(k.copy, '.git')) ? 'ok' : 'blocked';
}

/** Saves on `ref` the published version does not hold yet. */
function heldCount(k, ref) {
  const tip = sha(k, 'refs/remotes/origin/main');
  return Number(out(k, 'rev-list', '--count', '--no-merges', ref, ...(tip ? [`^${tip}`] : []))) || 0;
}
/** Each folder of the shared copy by its branch: `refs/heads/<branch>` → path. */
function foldersByBranch(k) {
  const found = new Map();
  let path = null;
  for (const line of out(shared(k), 'worktree', 'list', '--porcelain').split('\n')) {
    if (line.startsWith('worktree ')) path = line.slice(9);
    else if (line.startsWith('branch refs/heads/')) found.set(line.slice(18), path);
  }
  return found;
}

// `chat/<workspace folder>`. A name a live folder uses, or one that still holds saves, gets -2, -3 and so on; the tidy
// sends the old one. A name with nothing held and no folder is made again.
function branchFor(k) {
  const copy = shared(k);
  const name = `chat/${basename(k.root).replace(/[^\w.-]+/g, '-').replace(/\.\.+/g, '.').replace(/^[.-]+|[.-]+$/g, '') || 'workspace'}`;
  const used = foldersByBranch(k);
  for (let n = 1; n < 100; n++) {
    const branch = n === 1 ? name : `${name}-${n}`;
    if (!sha(copy, `refs/heads/${branch}`)) return branch;
    if (used.has(branch) || heldCount(copy, branch)) continue;
    run(k.copy, ['branch', '-D', branch]);
    return branch;
  }
  throw new KnowledgeError(`no free branch name for ${name}`);
}

/** This workspace's own folder: a worktree of the shared copy on `chat/<workspace>`, from the newest published
 *  version. primary, none, ok, made, switched (an old link replaced) or blocked. */
export function folderFor(k) {
  if (!k.linked) return 'primary';
  if (!present(k)) return 'none';
  const state = folderState(k);
  if (state === 'ok' || state === 'blocked') return state;
  run(k.copy, ['worktree', 'prune']);
  const copy = shared(k);
  const branch = branchFor(k);
  const start = sha(copy, 'refs/remotes/origin/main') ?? sha(copy, 'HEAD');
  const was = state === 'missing' ? null : readlinkSync(k.link);
  // Only the link goes: unlinkSync never reaches into the copy it points at.
  if (was !== null) unlinkSync(k.link);
  const made = run(k.copy, ['worktree', 'add', '--quiet', '-b', branch, k.link, start]);
  if (made.code) {
    if (was !== null && !existsSync(k.link)) symlinkSync(was, k.link, process.platform === 'win32' ? 'junction' : 'dir');
    throw new KnowledgeError(`git could not make this workspace's folder: ${made.stderr.trim().split('\n')[0]}`);
  }
  return was === null ? 'made' : 'switched';
}

const FOLDER_TEXT = { none: 'No copy on this computer yet.', blocked: 'knowledge/ here is a folder, but not a folder of the shared copy; it was left as it is.' };
/** `link`: as folderFor, for the person's assistant. A folder there already is left alone. */
export function link(k) {
  const state = folderFor(k);
  return { text: lines(`folder=${state}`, FOLDER_TEXT[state]), code: state === 'blocked' ? 1 : 0 };
}

// Clones beside the copy's place, then renames it in: a run deletes only the folder it made, never one already there.
function clone(k) {
  if (existsSync(k.copy)) return { text: lines('copy=blocked', `${k.copy} is a folder, but not a copy of company knowledge; it was left as it is. Move it away, then run update.`), code: 1 };
  const temp = mkdtempSync(join(dirname(k.copy), '.knowledge-clone-'));
  const fresh = { ...k, copy: temp, dir: temp };
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
  return { text: lines('copy=made', `path=${realpathSync(k.copy)}`, `folder=${folderFor(k)}`), code: 0 };
}

/** `update`: makes the copy and this workspace's folder when missing, sends the folder's held saves, and moves it to
 *  the newest version with its unsaved edits merged on top. */
export function update(k) {
  if (!present(k)) return k.address ? clone(k) : { text: absent(k), code: 0 };
  const folder = folderFor(k);
  if (folder === 'blocked') return { text: lines('folder=blocked', FOLDER_TEXT.blocked), code: 1 };
  if (!hasFolder(k)) return noFolder(k);
  const result = locked(k, () => publish(k, (commit, base) => saveProblems(k, commit, base)));
  const said = ['made', 'switched'].includes(folder) ? `folder=${folder}\n` : '';
  const shown = result.state === 'current' ? { ...result, state: 'updated' } : result;
  return { text: said + told(shown), code: exitOf(result) };
}

/** `ours` merged with `theirs` from `base`, three-way, or null where both changed the same lines or git can't. */
function mergedText(base, ours, theirs) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-knowledge-carry-'));
  try {
    const files = [['mine', ours], ['base', base], ['published', theirs]].map(([name, data]) => {
      const file = join(dir, name);
      writeFileSync(file, data ?? '');
      return file;
    });
    const result = spawnSync('git', ['merge-file', '-p', ...files], { windowsHide: true });
    return result.status === 0 ? result.stdout : null;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
// After a switch, only the pages a save names come over from the shared copy, merged onto the published text; every
// other draft stays there. A clash keeps the published text, the chat's beside it. Returns the clashed pages.
function carry(k, rels) {
  const copy = shared(k);
  const fileOr = path => { try { return statSync(path).isFile() ? readFileSync(path) : null; } catch { return null; } };
  const same = (a, b) => (a === null ? b === null : b !== null && a.equals(b));
  const clash = [];
  for (const page of rels) {
    const id = blobId(copy, `HEAD:${page}`);
    const base = id ? content(copy, id) : null;
    const ours = fileOr(join(k.copy, page)), theirs = fileOr(join(k.dir, page));
    if (same(ours, base) || same(ours, theirs)) continue;
    if (same(theirs, base)) { writeFile(k, page, ours); continue; }
    const text = ours && mergedText(base, ours, theirs);
    if (text) { writeFile(k, page, text); continue; }
    if (ours) writeFile(k, mineName(page), ours);
    clash.push(page);
  }
  return clash;
}

/** `save`: publishes the named pages and nothing else, live at once. */
export function save(k, given, message) {
  if (!present(k)) return { text: absent(k), code: 1 };
  const folder = ownFolder(k);
  if (!hasFolder(k)) return noFolder(k);
  if (!given.length || !message?.trim()) return { text: lines('saved=none', 'Name the pages and a message: save <pages…> -m "<what changed>".'), code: 2 };
  const pages = given.map(path => pagePath(k, path));
  const refused = pages.filter(page => page.refused);
  if (refused.length) return { text: lines('saved=none', refused.map(page => `refused=${page.refused}`)), code: 1 };
  const check = (commit, base) => saveProblems(k, commit, base);
  let carried = [];
  const result = locked(k, () => {
    const rels = pages.map(page => page.rel);
    // An old link's edits to these pages are still in the shared copy: they come over now, so the save publishes them.
    if (folder === 'switched') carried = carry(k, rels);
    if (!existsSync(join(k.dir, '.gitignore'))) { writeFileSync(join(k.dir, '.gitignore'), IGNORE); rels.push('.gitignore'); }
    const added = run(k.dir, ['add', '--all', '--', ...rels]);
    if (added.code) return { state: 'refused', reason: added.stderr.trim().split('\n')[0] };
    if (ok(k, 'diff', '--cached', '--quiet', '--', ...rels)) {
      const sent = publish(k, check);
      return sent.state === 'updated' ? { ...sent, state: 'current' } : sent;
    }
    const before = sha(k, 'HEAD');
    const made = run(k.dir, ['commit', '--quiet', '--only', '-m', message.trim(), '--', ...rels]);
    if (made.code) return { state: 'refused', reason: made.stderr.trim().split('\n')[0] };
    const result = publish(k, check);
    // A broken link takes the save back off the branch; its pages stay as edits here to fix.
    if (result.state === 'broken' && before) {
      run(k.dir, ['reset', '--quiet', '--soft', 'HEAD~1']);
      run(k.dir, ['reset', '--quiet', '--', ...rels]);
    }
    return result;
  });
  const said = ['made', 'switched'].includes(folder) ? `folder=${folder}\n` : '';
  // A carried page that clashed is named like any clash; a save with nothing else to publish saved none.
  if (carried.length && ['saved', 'current', 'conflict'].includes(result.state)) {
    const shown = { ...result, state: result.state === 'current' ? 'conflict' : result.state, conflict: [...new Set([...(result.conflict ?? []), ...carried])] };
    return { text: said + told(shown, pages.map(page => page.rel).filter(page => !carried.includes(page))), code: exitOf(shown) };
  }
  return { text: said + told(result, pages.map(page => page.rel)) + (carried.length ? lines(clashLines(carried)) : ''), code: exitOf(result) };
}

/** `undo <commit>`: one save taken back as a new save, live at once like any other. */
export function undo(k, commit) {
  if (!present(k)) return { text: absent(k), code: 1 };
  if (!hasFolder(k)) return noFolder(k);
  const result = locked(k, () => {
    const tip = fetched(k);
    const target = commit && sha(k, commit);
    if (!target) return { state: 'unknown' };
    const head = sha(k, 'HEAD');
    const on = ancestor(k, target, head) ? head : tip && ancestor(k, target, tip) && ancestor(k, head, tip) ? tip : null;
    if (!on || out(k, 'rev-list', '--parents', '-n', '1', target).split(' ').length !== 2) return { state: 'unknown' };
    const { tree, conflicts } = merged(k, target, on, `${target}^`);
    if (conflicts.length) return { state: 'tangled', pages: conflicts };
    const subject = out(k, 'log', '-1', '--format=%s', target);
    const pages = out(k, 'diff', '--name-only', `${target}^`, target).split('\n').filter(Boolean);
    const made = commitOf(k, tree, [on], `Undo "${subject}"\n\nThis takes back ${target}.\n`);
    return { ...publish(k, (next, base) => saveProblems(k, next, base), { head: made }), pages };
  });
  if (result.state === 'unknown') return { text: lines('undone=none', `${commit ?? 'That'} is not a save in this copy's history.`), code: 1 };
  if (result.state === 'tangled') return { text: lines('undone=none', result.pages.map(page => `conflict=knowledge/${page}`), 'A later save changed the same lines. Edit the page by hand, then save it.'), code: 1 };
  return { text: told(result, result.pages), code: exitOf(result) };
}

/** `restore`: puts back saves a forced push dropped, as a merge on top of what is published now: no force. */
export function restore(k) {
  if (!present(k)) return { text: absent(k), code: 1 };
  if (!hasFolder(k)) return noFolder(k);
  const result = locked(k, () => {
    const tip = fetched(k);
    if (tip === false) return { state: 'pending', commit: sha(k, 'HEAD') };
    const head = sha(k, 'HEAD');
    if (tip && ancestor(k, head, tip)) { mark(k, REWRITTEN, null); mark(k, PUBLISHED, tip); return { state: 'whole' }; }
    let made = head;
    if (tip) {
      const { tree, conflicts } = merged(k, out(k, 'merge-base', head, tip) || EMPTY_TREE, head, tip);
      if (conflicts.length) return { state: 'tangled', pages: conflicts };
      made = commitOf(k, tree, [head, tip], 'Restore saves a rewritten history dropped\n');
    }
    mark(k, PUBLISHED, tip);
    const published = publish(k, () => [], { head: made });
    if (published.state === 'saved') mark(k, REWRITTEN, null);
    return published;
  });
  if (result.state === 'whole') return { text: lines('restored=nothing', 'The published history already holds every save here.'), code: 0 };
  if (result.state === 'tangled') return { text: lines('restored=none', result.pages.map(page => `conflict=knowledge/${page}`), 'The two histories changed the same lines. Merge those pages by hand.'), code: 1 };
  return { text: told(result), code: exitOf(result) };
}

/** `remove [--discard]`: removes this workspace's folder. Unsaved pages or clashes stop it unless `discard`; a branch
 *  that holds a save not sent yet stays, for `folders --send`. The shared copy is never removed. */
export function remove(k, { discard = false } = {}) {
  if (!k.linked) return { text: lines('removed=none', 'This is the shared copy of the primary checkout; it stays.'), code: 0 };
  const state = folderState(k);
  if (state === 'missing') return { text: lines('removed=none', 'This workspace has no knowledge folder.'), code: 0 };
  if (state === 'link' || state === 'elsewhere') { unlinkSync(k.link); return { text: lines('removed=link'), code: 0 }; }
  if (state === 'blocked') return { text: lines('removed=none', 'folder=blocked', FOLDER_TEXT.blocked), code: 1 };
  const result = locked(k, () => {
    const pages = unsaved(k), clashed = clashes(k);
    if (!discard && (pages.length || clashed.length)) return { state: 'kept', pages, clashed };
    const branch = out(k, 'symbolic-ref', '--quiet', '--short', 'HEAD');
    const held = heldCount(k, 'HEAD');
    const gone = run(k.copy, ['worktree', 'remove', '--force', k.link]);
    if (gone.code) return { state: 'refused', reason: gone.stderr.trim().split('\n')[0] };
    if (branch && !held) run(k.copy, ['branch', '-D', branch]);
    return { state: 'removed', branch, held };
  });
  if (result.state === 'kept') {
    return { text: lines('removed=none', result.pages.map(page => `unsaved=knowledge/${page}`), result.clashed.map(page => `conflict=knowledge/${page}`),
      'Save these pages first: merge each conflict= page, then node .claude/memory/knowledge.mjs save <pages…> -m "<what changed>".',
      'Or run remove --discard to drop them.'), code: 1 };
  }
  if (result.state !== 'removed') return { text: told(result), code: 1 };
  return { text: lines(`removed=${k.link}`, result.held ? [`held=${result.held}`, `Its saves not sent yet stay on ${result.branch}; folders --send sends them.`] : 'branch=deleted'), code: 0 };
}

const ageOf = file => { try { return `${Math.floor((Date.now() - statSync(file).mtimeMs) / 3_600_000)}h`; } catch { return 'gone'; } };
/** A folder of the shared copy as its own place: its folder, its HEAD, and the code checkout around it. */
const at = (k, path) => ({ ...k, dir: path, link: path, root: dirname(path), linked: path !== k.copy });

// A branch whose folder is gone sends its saves with no folder to move. A clash goes beside the page in this folder,
// for the tidy to merge as a chat would; the folder first moves to the newest version, so the page holds its text.
function sendBranch(k, branch) {
  const head = sha(k, `refs/heads/${branch}`);
  const check = (commit, base) => saveProblems(k, commit, base);
  return publish(k, check, { head, from: head, land: (next, clash) => {
    run(k.dir, ['update-ref', `refs/heads/${branch}`, next]);
    if (!clash.length) return [];
    const own = publish(k, check).conflict ?? [];
    return [...new Set([...own, ...writeMine(k, clash)])];
  } });
}

/** `folders [--send]`: every folder on this computer with its held saves and unsaved pages. `send` publishes the held
 *  saves; a branch with no folder and nothing held is deleted. */
export function folders(k, { send = false } = {}) {
  if (!present(k)) return { text: absent(k), code: 1 };
  run(k.copy, ['worktree', 'prune']);
  // A clash is written in the calling folder: never through an old link into the shared copy's tree.
  if (send) ownFolder(k);
  const here = hasFolder(k) ? k : shared(k);
  const copy = shared(k);
  const where = foldersByBranch(k);
  const branches = [out(copy, 'symbolic-ref', '--quiet', '--short', 'HEAD'),
    ...out(copy, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/chat/').split('\n')].filter(Boolean);
  const said = [];
  let code = 0;
  const each = () => {
    for (const branch of branches) {
      const path = where.get(branch) ?? null;
      if (send && heldCount(copy, branch)) {
        if (path) recover(at(k, path));
        const result = path ? publish(at(k, path), (commit, base) => saveProblems(at(k, path), commit, base)) : sendBranch(here, branch);
        said.push(`sent=${branch} ${result.state}${result.commit ? ` ${result.commit}` : ''}`, ...(result.conflict ?? []).map(page => `conflict=knowledge/${page}`));
        if (exitOf(result)) code = Math.max(code, exitOf(result));
      }
      const held = heldCount(copy, branch);
      if (!path && !held && branch.startsWith('chat/')) { run(k.copy, ['branch', '-D', branch]); said.push(`pruned=${branch}`); continue; }
      const pages = path ? unsaved({ dir: path }) : [];
      said.push(`folder=${branch} path=${path ?? 'none'} held=${held} unsaved=${pages.length}`,
        ...pages.map(page => `unsaved=${join(path, page)} age=${ageOf(join(path, page))}`));
    }
    return { state: 'listed' };
  };
  const result = send ? locked(k, each) : each();
  if (result.state === 'busy') return { text: told(result), code: 1 };
  return { text: lines(said.length ? said : 'folders=none'), code };
}

const USAGE = `usage: knowledge.mjs <command>
  status                         the copy, this workspace's folder, unsaved pages, and whether the app answers
  link                           give this workspace its own folder of the shared copy
  update                         make the copy or folder, send held saves, and move to the newest version
  save <pages…> -m "<message>"   publish those pages, live at once, after a link check
  undo <commit>                  take one save back, live at once
  restore                        put back saves a forced push dropped
  remove [--discard]             remove this workspace's folder; unsaved pages stop it unless --discard
  folders [--send]               list every folder's held saves and unsaved pages; --send publishes the held saves`;

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
  const commands = { status, link, update, restore, undo: k => undo(k, rest[0]),
    remove: k => remove(k, { discard: rest.includes('--discard') }), folders: k => folders(k, { send: rest.includes('--send') }) };
  if (!commands[command]) return { text: `${USAGE}\n`, code: 2 };
  return commands[command](k);
}

if (isMain(import.meta.url)) {
  let result;
  try { result = main(process.argv.slice(2)); } catch (error) { result = { text: `knowledge: ${error.message}\n`, code: 1 }; }
  process.stdout.write(result.text);
  process.exitCode = result.code;
}
