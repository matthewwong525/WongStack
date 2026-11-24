// /close's script: it runs Daily's and the browser's scripts by path, and keeps a knowledge folder that holds work.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { closeWorkspace } from '../../.agents/skills/close/scripts/close.mjs';
import { folderFor, place, update } from '../../.agents/memory/knowledge.mjs';

const root = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

/** Runs `part` with a stand-in `node` first on PATH, and returns each script path it was given. */
function scriptsRun(t, part) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-close-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = join(dir, 'ran.txt');
  writeFileSync(join(dir, 'node'), `#!/bin/sh\nprintf '%s\\n' "$1" >> '${log}'\n`);
  chmodSync(join(dir, 'node'), 0o755);
  const path = process.env.PATH;
  process.env.PATH = `${dir}:${path}`;
  try { part(); } finally { process.env.PATH = path; }
  return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
}

test('closeWorkspace runs only scripts that exist', t => {
  const ran = scriptsRun(t, () => closeWorkspace(root, []));
  assert.ok(ran.length > 0, 'it runs a script');
  for (const file of ran) assert.ok(existsSync(file), `${file} exists`);
});

test('/plan opens a workspace with scripts that exist', () => {
  const doc = readFileSync(join(root, '.agents/skills/plan/references/new-workspace.md'), 'utf8');
  const dir = doc.match(/^W="\$\(git rev-parse --show-toplevel\)\/\.claude\/(\S+)"$/m)[1];
  assert.doesNotMatch(doc, /node "\$W"/, 'each node "$W…" line names its script');
  for (const [, script] of doc.matchAll(/node "\$W\/([\w.-]+)"/g)) assert.ok(existsSync(join(root, '.agents', dir, script)), script);
});

/** Runs `work` with stdout caught; returns what it wrote and its result. */
function caught(work) {
  const written = [], write = process.stdout.write;
  process.stdout.write = chunk => { written.push(String(chunk)); return true; };
  let code;
  try { code = work(); } finally { process.stdout.write = write; }
  return { code, said: written.join('') };
}

/** A shared knowledge copy, a chat workspace, and a stand-in tidy.mjs whose real close leaves a mark. */
function knowledgeComputer(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-close-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const saved = { ...process.env };
  Object.assign(process.env, { GIT_AUTHOR_NAME: 'Ada', GIT_AUTHOR_EMAIL: 'ada@example.com', GIT_COMMITTER_NAME: 'Ada',
    GIT_COMMITTER_EMAIL: 'ada@example.com', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' });
  t.after(() => { process.env = saved; });
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const remote = join(dir, 'remote.git'), seed = join(dir, 'seed'), primary = join(dir, 'primary'), tree = join(dir, 'chat');
  git(dir, 'init', '--quiet', '--bare', '--initial-branch=main', remote);
  git(dir, 'clone', '--quiet', remote, seed);
  writeFileSync(join(seed, 'README.md'), '# Knowledge\n\nThe pages.\n');
  git(seed, 'add', '.');
  git(seed, 'commit', '--quiet', '-m', 'First');
  git(seed, 'push', '--quiet', 'origin', 'HEAD:main');
  mkdirSync(primary);
  git(primary, 'init', '--quiet', '--initial-branch=main');
  git(primary, 'commit', '--quiet', '--allow-empty', '-m', 'code');
  process.env.WONG_KNOWLEDGE_REMOTE = remote;
  assert.equal(update(place(primary)).code, 0);
  git(primary, 'worktree', 'add', '--quiet', '--detach', tree);
  const tidy = join(tree, '.claude/skills/schedule/scripts');
  mkdirSync(tidy, { recursive: true });
  const closed = join(dir, 'closed');
  writeFileSync(join(tidy, 'tidy.mjs'), `import { writeFileSync } from 'node:fs';\nif (!process.argv.includes('--dry-run')) writeFileSync(${JSON.stringify(closed)}, '');\n`);
  const close = () => ({ ...caught(() => closeWorkspace(tree, [])), closed: existsSync(closed) });
  return { tree, copy: join(primary, 'knowledge'), close };
}

test('closeWorkspace stops with exit 7 and the page names while the knowledge folder holds unsaved pages', t => {
  const { tree, close } = knowledgeComputer(t);
  assert.equal(folderFor(place(tree)), 'made');
  writeFileSync(join(tree, 'knowledge', 'README.md'), 'not saved\n');
  const { code, said, closed } = close();
  assert.equal(code, 7);
  assert.match(said, /^unsaved=knowledge\/README\.md$/m);
  assert.ok(existsSync(join(tree, 'knowledge', 'README.md')), 'the folder stays');
  assert.equal(closed, false, 'the workspace did not close');
});

test('closeWorkspace removes a clean knowledge folder and closes', t => {
  const { tree, close } = knowledgeComputer(t);
  assert.equal(folderFor(place(tree)), 'made');
  const { code, said, closed } = close();
  assert.equal(code, 0, said);
  assert.equal(existsSync(join(tree, 'knowledge')), false);
  assert.ok(closed);
});

test('closeWorkspace leaves a knowledge/ folder that is not the copy\'s as it is, and closes', t => {
  const { tree, close } = knowledgeComputer(t);
  mkdirSync(join(tree, 'knowledge'));
  writeFileSync(join(tree, 'knowledge', 'notes.md'), 'mine\n');
  const { code, said, closed } = close();
  assert.equal(code, 0, said);
  assert.match(said, /^folder=blocked$/m);
  assert.equal(readFileSync(join(tree, 'knowledge', 'notes.md'), 'utf8'), 'mine\n');
  assert.ok(closed, 'the workspace closed');
});

test('closeWorkspace removes an old link and closes, never touching the shared copy\'s drafts', t => {
  const { tree, copy, close } = knowledgeComputer(t);
  writeFileSync(join(copy, 'README.md'), 'a draft in the shared copy\n');
  symlinkSync(copy, join(tree, 'knowledge'), 'dir');
  const { code, said, closed } = close();
  assert.equal(code, 0, said);
  assert.equal(existsSync(join(tree, 'knowledge')), false);
  assert.equal(readFileSync(join(copy, 'README.md'), 'utf8'), 'a draft in the shared copy\n');
  assert.ok(closed);
});

test('closeWorkspace says busy with exit 8, not exit 7, while another save runs', t => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-close-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = join(dir, 'ran.txt');
  // A stand-in node: knowledge.mjs remove answers as it does while another save holds the lock; the rest pass.
  writeFileSync(join(dir, 'node'), `#!/bin/sh\nprintf '%s\\n' "$1" >> '${log}'\ncase "$1" in *knowledge.mjs) printf 'busy=yes\\n'; exit 1;; esac\n`);
  chmodSync(join(dir, 'node'), 0o755);
  const path = process.env.PATH;
  process.env.PATH = `${dir}:${path}`;
  let result;
  try { result = caught(() => closeWorkspace(root, [])); } finally { process.env.PATH = path; }
  assert.equal(result.code, 8);
  assert.match(result.said, /^busy=yes$/m);
  assert.ok(!readFileSync(log, 'utf8').includes('hand-over.mjs'), 'the close stopped before the workspace closed');
});
