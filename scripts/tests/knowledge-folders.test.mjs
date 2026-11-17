// A chat's own company folder, past knowledge.test.mjs: held saves sent from open or ended chats, undo, branch names,
// the daily tidy's prepare and cleanup, and the chat-start line. Every repository here is temporary.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { folderFor, folders, place, save, status, undo, update } from '../../.agents/memory/knowledge.mjs';
import { knowledgeLine } from '../../.agents/memory/session-start.mjs';
import { tidyCleanup, tidyPrepare } from '../../.agents/memory/tidy-pages.mjs';

Object.assign(process.env, { GIT_AUTHOR_NAME: 'Ada', GIT_AUTHOR_EMAIL: 'ada@example.com', GIT_COMMITTER_NAME: 'Ada',
  GIT_COMMITTER_EMAIL: 'ada@example.com', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' });
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const HUB = '# Company knowledge\n\nThe pages: [ops](ops.md).\n';
const OPS = '# Ops\n\nHow we ship.\n\nline two\nline three\nline four\nline five\n';

// A published knowledge repository, one computer's code checkout with the shared copy, and chat workspaces beside it.
function world(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-knowledge-folders-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const remote = join(dir, 'remote.git');
  git(dir, 'init', '--quiet', '--bare', '--initial-branch=main', remote);
  const seed = join(dir, 'seed');
  git(dir, 'clone', '--quiet', remote, seed);
  writeFileSync(join(seed, 'README.md'), HUB);
  writeFileSync(join(seed, 'ops.md'), OPS);
  // The published repository already ignores a clash's other version, so a first save adds no .gitignore.
  writeFileSync(join(seed, '.gitignore'), '*.mine.*\n');
  git(seed, 'add', '.');
  git(seed, 'commit', '--quiet', '-m', 'First pages');
  git(seed, 'push', '--quiet', 'origin', 'HEAD:main');
  const primary = join(dir, 'primary');
  mkdirSync(primary);
  git(primary, 'init', '--quiet', '--initial-branch=main');
  git(primary, 'commit', '--quiet', '--allow-empty', '-m', 'code');
  const k = place(primary, { WONG_KNOWLEDGE_REMOTE: remote });
  assert.equal(update(k).code, 0);
  const chat = name => {
    const tree = join(dir, name);
    git(primary, 'worktree', 'add', '--quiet', '--detach', tree);
    const c = place(tree, { WONG_KNOWLEDGE_REMOTE: remote });
    assert.equal(folderFor(c), 'made');
    return c;
  };
  const published = page => git(remote, 'show', `main:${page}`);
  const offline = () => git(k.copy, 'remote', 'set-url', 'origin', `${remote}-gone`);
  const online = () => git(k.copy, 'remote', 'set-url', 'origin', remote);
  return { dir, remote, k, chat, published, offline, online };
}
const write = (k, page, text) => writeFileSync(join(k.dir, page), text);
const read = (k, page) => readFileSync(join(k.dir, page), 'utf8');

test('folders --send publishes a held save from a folder still open, moves that folder, and keeps its unsaved page', t => {
  const { k, chat, published, offline, online } = world(t);
  const tidy = chat('tidy'), open = chat('open-chat');
  offline();
  write(open, 'ops.md', OPS.replace('line two', 'line two, held'));
  assert.equal(save(open, ['ops.md'], 'Held while offline').code, 3);
  write(open, 'README.md', `${HUB}not saved yet\n`);
  online();
  assert.match(folders(tidy).text, /^folder=chat\/open-chat path=\S+ held=1 unsaved=1$/m);
  const sent = folders(tidy, { send: true });
  assert.equal(sent.code, 0, sent.text);
  assert.match(sent.text, /^sent=chat\/open-chat saved [0-9a-f]{40}$/m);
  assert.doesNotMatch(sent.text, /^pruned=chat\/open-chat$/m, 'a branch with a live folder is never pruned');
  assert.match(sent.text, /^folder=chat\/open-chat path=\S+ held=0 unsaved=1$/m);
  assert.match(published('ops.md'), /line two, held/);
  assert.doesNotMatch(published('README.md'), /not saved yet/, 'only the held save goes out');
  assert.equal(read(open, 'README.md'), `${HUB}not saved yet\n`, 'the open chat keeps its unsaved page');
  assert.equal(git(open.dir, 'rev-parse', 'HEAD'), git(k.copy, 'rev-parse', 'origin/main'), 'the open folder sits on the published tip');
  assert.doesNotMatch(status(open).text, /pending=|behind=/);
});

test('undo from a chat\'s folder takes back a save made there, and the folder holds the undone page', t => {
  const { chat, published } = world(t);
  const c = chat('undo-chat');
  write(c, 'ops.md', OPS.replace('line four', 'line four, to undo'));
  const saved = save(c, ['ops.md'], 'Save to undo');
  assert.equal(saved.code, 0, saved.text);
  const commit = /^saved=([0-9a-f]{40})$/m.exec(saved.text)?.[1];
  assert.ok(commit, saved.text);
  const undone = undo(c, commit);
  assert.equal(undone.code, 0, undone.text);
  assert.match(undone.text, /^saved=[0-9a-f]{40}\npage=knowledge\/ops\.md\nLive for the team now\.$/m);
  assert.equal(published('.gitignore'), '*.mine.*', 'the undo takes back only the page');
  assert.doesNotMatch(published('ops.md'), /to undo/);
  assert.doesNotMatch(read(c, 'ops.md'), /to undo/, 'the folder moved to the undo');
  assert.doesNotMatch(status(c).text, /unsaved=|pending=|behind=/);
});

test('a workspace name with spaces, dots or git\'s own marks still gets a branch git takes', t => {
  const { chat } = world(t);
  for (const [name, branch] of [['My Chat..x', 'chat/My-Chat.x'], ['-dash-', 'chat/dash'], ['a@{b', 'chat/a-b'], ['robust-bear', 'chat/robust-bear']]) {
    assert.equal(git(chat(name).dir, 'rev-parse', '--abbrev-ref', 'HEAD'), branch, name);
  }
});

test('the daily tidy\'s cleanup removes its folder, drops an unsaved edit, and keeps a held save for the next tidy', async t => {
  const { k, chat, published, offline, online } = world(t);
  const run = chat('tidy-run');
  offline();
  write(run, 'ops.md', OPS.replace('line two', 'line two, held by the tidy'));
  assert.equal(save(run, ['ops.md'], 'Held while offline').code, 3);
  write(run, 'README.md', `${HUB}never saved\n`);
  online();
  await tidyCleanup({ root: run.root });
  assert.equal(existsSync(run.dir), false, 'the run\'s folder is gone');
  assert.equal(readFileSync(join(k.copy, 'README.md'), 'utf8'), HUB, 'the shared copy is untouched');
  assert.match(git(k.copy, 'branch', '--list', 'chat/tidy-run'), /chat\/tidy-run/, 'the held save keeps its branch');
  const sent = folders(chat('next-tidy'), { send: true });
  assert.match(sent.text, /^sent=chat\/tidy-run saved [0-9a-f]{40}$/m, sent.text);
  assert.match(published('ops.md'), /held by the tidy/);
  assert.doesNotMatch(published('README.md'), /never saved/);
});

test('the daily tidy\'s prepare makes its folder and sends a held save a chat left when it ended with no /close', async t => {
  const { dir, remote, k, chat, published, offline, online } = world(t);
  const ended = chat('ended-chat');
  offline();
  write(ended, 'ops.md', OPS.replace('line three', 'line three, held'));
  assert.equal(save(ended, ['ops.md'], 'Held while offline').code, 3);
  online();
  rmSync(ended.root, { recursive: true, force: true });
  const run = join(dir, 'tidy-copy');
  git(k.primary, 'worktree', 'add', '--quiet', '--detach', run);
  const saved = process.env.WONG_KNOWLEDGE_REMOTE;
  process.env.WONG_KNOWLEDGE_REMOTE = remote;
  t.after(() => { if (saved === undefined) delete process.env.WONG_KNOWLEDGE_REMOTE; else process.env.WONG_KNOWLEDGE_REMOTE = saved; });
  await tidyPrepare({ root: run });
  assert.ok(existsSync(join(run, 'knowledge', '.git')), 'the run has its own folder');
  assert.match(published('ops.md'), /line three, held/);
  assert.equal(git(k.copy, 'branch', '--list', 'chat/ended-chat'), '', 'the ended chat\'s branch is pruned once sent');
});

test('a job copy deleted outright leaves the shared copy as it was, and folders prunes its branch', t => {
  const { k, chat } = world(t);
  writeFileSync(join(k.copy, 'README.md'), 'a draft in the shared copy\n');
  const before = { refs: git(k.copy, 'for-each-ref'), status: git(k.copy, 'status', '--porcelain') };
  const job = chat('job-run');
  write(job, 'README.md', 'the job left this unsaved\n');
  rmSync(job.root, { recursive: true, force: true });
  assert.equal(git(k.copy, 'status', '--porcelain'), before.status);
  assert.equal(readFileSync(join(k.copy, 'README.md'), 'utf8'), 'a draft in the shared copy\n');
  assert.match(folders(k).text, /^pruned=chat\/job-run$/m);
  assert.equal(git(k.copy, 'for-each-ref'), before.refs);
});

const QUIET = remote => ({ ...process.env, WONG_KNOWLEDGE_REMOTE: remote, WONG_KNOWLEDGE_UPDATE: '0' });

test('the start note gives an old linked workspace its own folder and names only its unsaved pages and clashes', async t => {
  const { dir, remote, k } = world(t);
  writeFileSync(join(k.copy, 'README.md'), 'a draft in the shared copy\n');
  const tree = join(dir, 'linked-chat');
  git(k.primary, 'worktree', 'add', '--quiet', '--detach', tree);
  symlinkSync(k.copy, join(tree, 'knowledge'), 'dir');
  assert.equal(await knowledgeLine({ root: tree }, QUIET(remote)), '', 'the shared copy\'s draft is not this chat\'s');
  assert.ok(!lstatSync(join(tree, 'knowledge')).isSymbolicLink(), 'the old link became a folder');
  writeFileSync(join(tree, 'knowledge', 'README.md'), 'mine\n');
  writeFileSync(join(tree, 'knowledge', 'ops.mine.md'), 'my other version\n');
  assert.equal(await knowledgeLine({ root: tree }, QUIET(remote)),
    'Knowledge: 1 page with edits not saved yet: knowledge/README.md.\n'
    + 'Knowledge: a newer save changed the same lines of knowledge/ops.md; your version is beside each as <page>.mine.<ext>. Merge them, then save.');
});

test('the start note names no pages when knowledge/ is a folder that is not the copy\'s', async t => {
  const { dir, remote, k } = world(t);
  const tree = join(dir, 'blocked-chat');
  git(k.primary, 'worktree', 'add', '--quiet', '--detach', tree);
  mkdirSync(join(tree, 'knowledge'));
  writeFileSync(join(tree, 'knowledge', 'notes.md'), 'not a folder of the copy\n');
  writeFileSync(join(tree, 'code.mjs'), 'export {};\n');
  assert.equal(await knowledgeLine({ root: tree }, QUIET(remote)), '', 'git never walks up to name the code checkout\'s files');
});
