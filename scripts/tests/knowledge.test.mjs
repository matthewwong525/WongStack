import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { link, place, restore, save, status, undo, update } from '../../.agents/skills/memory/scripts/knowledge.mjs';

Object.assign(process.env, { GIT_AUTHOR_NAME: 'Ada', GIT_AUTHOR_EMAIL: 'ada@example.com', GIT_COMMITTER_NAME: 'Ada',
  GIT_COMMITTER_EMAIL: 'ada@example.com', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' });
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const HUB = '# Company knowledge\n\nThe pages: [ops](ops.md).\n';
const OPS = '# Ops\n\nHow we ship.\n\nline two\nline three\nline four\nline five\n';

// A published knowledge repository (bare, like the app's) and computers that each hold a code checkout with a copy.
function world(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-knowledge-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const remote = join(dir, 'remote.git');
  git(dir, 'init', '--quiet', '--bare', '--initial-branch=main', remote);
  const seed = join(dir, 'seed');
  git(dir, 'clone', '--quiet', remote, seed);
  writeFileSync(join(seed, 'README.md'), HUB);
  writeFileSync(join(seed, 'ops.md'), OPS);
  git(seed, 'add', '.');
  git(seed, 'commit', '--quiet', '-m', 'First pages');
  git(seed, 'push', '--quiet', 'origin', 'HEAD:main');
  const computer = name => {
    const primary = join(dir, name);
    mkdirSync(primary);
    git(primary, 'init', '--quiet', '--initial-branch=main');
    git(primary, 'commit', '--quiet', '--allow-empty', '-m', 'code');
    const k = place(primary, { WONG_KNOWLEDGE_REMOTE: remote });
    assert.equal(update(k).code, 0);
    return k;
  };
  const published = (path, ref = 'main') => { try { return git(remote, 'show', `${ref}:${path}`); } catch { return null; } };
  return { dir, remote, computer, published };
}
const write = (k, page, text) => { mkdirSync(join(k.copy, page, '..'), { recursive: true }); writeFileSync(join(k.copy, page), text); };
const read = (k, page) => readFileSync(join(k.copy, page), 'utf8');

test('status says copy=absent on an install with no copy and no knowledge repository', t => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-knowledge-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, 'init', '--quiet');
  const result = status(place(dir, {}));
  assert.match(result.text, /^copy=absent\n.*wiki\//);
  assert.equal(update(place(dir, {})).text, result.text);
});

test('update makes the copy, and a save goes live at once with the undo line', t => {
  const { computer, published } = world(t);
  const k = computer('ada');
  assert.equal(read(k, 'ops.md'), OPS);
  write(k, 'ops.md', OPS.replace('How we ship.', 'How we ship, by courier.'));
  const result = save(k, ['knowledge/ops.md'], 'Name the courier');
  assert.equal(result.code, 0, result.text);
  assert.match(result.text, /^saved=[0-9a-f]{40}\npage=knowledge\/ops\.md\nLive for the team now\.\nTo undo it/);
  assert.match(published('ops.md'), /by courier/);
  assert.equal(published('.gitignore'), '*.mine.*');
  assert.match(status(k).text, /copy=present[\s\S]*reachable=yes/);
});

test('a save takes only the named pages; a script or a page outside knowledge/ is refused', t => {
  const { computer, published } = world(t);
  const k = computer('ada');
  write(k, 'ops.md', `${OPS}one more\n`);
  write(k, 'README.md', `${HUB}Another chat's edit.\n`);
  assert.equal(save(k, ['ops.md'], 'Add a line').code, 0);
  assert.match(published('ops.md'), /one more/);
  assert.equal(published('README.md'), HUB.trim());
  assert.match(read(k, 'README.md'), /Another chat's edit/);
  write(k, 'deploy.sh', 'echo hi\n');
  const refused = save(k, ['knowledge/deploy.sh'], 'A script');
  assert.equal(refused.code, 1);
  assert.match(refused.text, /refused=knowledge\/deploy\.sh: company knowledge takes only pages/);
  assert.match(save(k, ['../elsewhere.md'], 'Out').text, /refused=.*not inside knowledge/);
  assert.equal(published('deploy.sh'), null);
});

test('a broken link publishes nothing and leaves the page as an edit', t => {
  const { computer, published } = world(t);
  const k = computer('ada');
  const before = git(k.copy, 'rev-parse', 'HEAD');
  write(k, 'ops.md', `${OPS}See [the rota](rota.md).\n`);
  const result = save(k, ['ops.md'], 'Link the rota');
  assert.equal(result.code, 1);
  assert.match(result.text, /broken=knowledge\/ops\.md:\d+: links to rota\.md, which does not exist/);
  assert.equal(git(k.copy, 'rev-parse', 'HEAD'), before);
  assert.doesNotMatch(published('ops.md'), /rota/);
  assert.match(read(k, 'ops.md'), /rota/);
  write(k, 'rota.md', '# Rota\n\nWho is on call.\n');
  write(k, 'README.md', `${HUB}And the [rota](rota.md).\n`);
  assert.equal(save(k, ['ops.md', 'rota.md', 'README.md'], 'Add the rota').code, 0, 'the pages together link up');
});

test('a link to a page that is only on this computer is refused, even when that page is there', t => {
  const { computer, published } = world(t);
  const k = computer('ada');
  write(k, 'rota.md', '# Rota\n\nWho is on call.\n');
  write(k, 'README.md', `${HUB}And the [rota](rota.md).\n`);
  write(k, 'ops.md', `${OPS}See [the rota](rota.md).\n`);
  const result = save(k, ['ops.md'], 'Link the rota');
  assert.equal(result.code, 1, result.text);
  assert.match(result.text, /^broken=knowledge\/ops\.md:\d+: links to rota\.md, which does not exist$/m);
  assert.doesNotMatch(published('ops.md'), /rota/);
});

test('update never deletes a knowledge/ folder that is not a copy, and a failed clone leaves nothing behind', t => {
  const { dir, remote } = world(t);
  const primary = join(dir, 'kept');
  mkdirSync(join(primary, 'knowledge'), { recursive: true });
  git(primary, 'init', '--quiet', '--initial-branch=main');
  writeFileSync(join(primary, 'knowledge', 'notes.md'), 'mine\n');
  const refused = update(place(primary, { WONG_KNOWLEDGE_REMOTE: remote }));
  assert.equal(refused.code, 1, refused.text);
  assert.match(refused.text, /^copy=blocked\n.*not a copy/);
  assert.equal(readFileSync(join(primary, 'knowledge', 'notes.md'), 'utf8'), 'mine\n');

  const empty = join(dir, 'empty');
  mkdirSync(empty);
  git(empty, 'init', '--quiet', '--initial-branch=main');
  assert.equal(update(place(empty, { WONG_KNOWLEDGE_REMOTE: `${remote}-gone` })).code, 3);
  assert.deepEqual(readdirSync(empty), ['.git']);
});

test('saves to different lines of one page both go live; the same lines leave both versions', t => {
  const { computer, published } = world(t);
  const ada = computer('ada'), bo = computer('bo');
  write(ada, 'ops.md', OPS.replace('line two', 'line two by Ada'));
  assert.equal(save(ada, ['ops.md'], 'Ada').code, 0);
  write(bo, 'ops.md', OPS.replace('line five', 'line five by Bo'));
  const both = save(bo, ['ops.md'], 'Bo');
  assert.equal(both.code, 0, both.text);
  assert.match(published('ops.md'), /line two by Ada[\s\S]*line five by Bo/);
  assert.equal(git(bo.copy, 'log', '-1', '--format=%an %s'), 'Ada Bo', 'the replayed save keeps its author');

  assert.equal(update(ada).code, 0);
  write(ada, 'ops.md', read(ada, 'ops.md').replace('How we ship.', 'Ada ships.'));
  assert.equal(save(ada, ['ops.md'], 'Ada again').code, 0);
  write(bo, 'ops.md', read(bo, 'ops.md').replace('How we ship.', 'Bo ships.'));
  const clash = save(bo, ['ops.md'], 'Bo again');
  assert.equal(clash.code, 1);
  assert.match(clash.text, /^conflict=knowledge\/ops\.md$/m);
  assert.match(read(bo, 'ops.md'), /Ada ships\./);
  assert.match(read(bo, 'ops.mine.md'), /Bo ships\./);
  assert.equal(git(bo.copy, 'rev-parse', 'HEAD'), git(bo.copy, 'rev-parse', 'origin/main'));
  assert.match(published('ops.md'), /Ada ships\./);
  assert.doesNotMatch(status(bo).text, /mine/, 'the copy ignores the other side of a conflict');
});

test('a save that loses a race to another push tries again and lands on top', t => {
  const { dir, remote, computer, published } = world(t);
  const ada = computer('ada'), bo = computer('bo');
  write(bo, 'README.md', HUB.replace('# Company knowledge', '# Our knowledge'));
  git(bo.copy, 'commit', '--quiet', '-am', 'Bo renames the hub');
  // The first push to arrive lets Bo's save land first, as if it came a moment sooner.
  const flag = join(dir, 'race');
  writeFileSync(flag, '');
  const hook = join(remote, 'hooks', 'pre-receive');
  writeFileSync(hook, `#!/bin/sh\nif [ -f "${flag}" ]; then rm "${flag}"\n  env -u GIT_QUARANTINE_PATH -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES -u GIT_DIR git -C "${bo.copy}" push --quiet origin HEAD:main >/dev/null 2>&1\nfi\nexit 0\n`);
  chmodSync(hook, 0o755);
  write(ada, 'ops.md', `${OPS}Ada's line.\n`);
  const result = save(ada, ['ops.md'], 'Ada');
  assert.equal(result.code, 0, result.text);
  assert.equal(existsSync(flag), false, 'the race ran');
  assert.match(published('README.md'), /# Our knowledge/);
  assert.match(published('ops.md'), /Ada's line/);
});

test('an unreachable app leaves the save pending, and the next update publishes it', t => {
  const { remote, computer, published } = world(t);
  const k = computer('ada');
  git(k.copy, 'remote', 'set-url', 'origin', `${remote}-gone`);
  write(k, 'ops.md', `${OPS}offline\n`);
  const result = save(k, ['ops.md'], 'Offline');
  assert.equal(result.code, 3);
  assert.match(result.text, /^pending=[0-9a-f]{40}\nNot live yet/);
  assert.doesNotMatch(published('ops.md'), /offline/);
  assert.match(update(k).text, /pending=/);
  git(k.copy, 'remote', 'set-url', 'origin', remote);
  assert.equal(update(k).code, 0);
  assert.match(published('ops.md'), /offline/);
});

test('undo takes one save back as a new save, live at once', t => {
  const { computer, published } = world(t);
  const k = computer('ada');
  write(k, 'ops.md', `${OPS}a mistake\n`);
  const commit = /saved=(\w+)/.exec(save(k, ['ops.md'], 'Oops').text)[1];
  write(k, 'README.md', `${HUB}kept\n`);
  assert.equal(save(k, ['README.md'], 'Keep this').code, 0);
  const result = undo(k, commit.slice(0, 12));
  assert.equal(result.code, 0, result.text);
  assert.doesNotMatch(published('ops.md'), /a mistake/);
  assert.match(published('README.md'), /kept/);
  assert.equal(git(k.copy, 'log', '-1', '--format=%s'), 'Undo "Oops"');
  assert.equal(undo(k, 'nope').code, 1);
});

test('update finds a forced rewrite, and restore puts the lost saves back with no force', t => {
  const { computer, published } = world(t);
  const ada = computer('ada'), bo = computer('bo');
  const first = git(ada.copy, 'rev-parse', 'HEAD');
  write(ada, 'ops.md', `${OPS}keep me\n`);
  assert.equal(save(ada, ['ops.md'], 'Keep').code, 0);
  assert.equal(update(bo).code, 0);
  git(bo.copy, 'reset', '--quiet', '--hard', first);
  write(bo, 'README.md', `${HUB}Bo's rewrite\n`);
  git(bo.copy, 'commit', '--quiet', '-am', 'Rewrite');
  git(bo.copy, 'push', '--quiet', '--force', 'origin', 'HEAD:main');
  const found = update(ada);
  assert.equal(found.code, 1);
  assert.match(found.text, /^rewritten=/);
  assert.match(status(ada).text, /rewritten=/);
  const result = restore(ada);
  assert.equal(result.code, 0, result.text);
  assert.match(published('ops.md'), /keep me/);
  assert.match(published('README.md'), /Bo's rewrite/);
  assert.doesNotMatch(status(ada).text, /rewritten=/);
  assert.equal(update(ada).code, 0);
});

test('two chats share one copy through a link, and neither saves the other\'s edits', t => {
  const { computer, published } = world(t);
  const k = computer('ada');
  const tree = join(k.primary, '..', 'ada-chat');
  git(k.primary, 'worktree', 'add', '--quiet', tree);
  const chat = place(tree, { WONG_KNOWLEDGE_REMOTE: k.address });
  assert.equal(link(chat).text, 'link=made\n');
  assert.ok(lstatSync(chat.link).isSymbolicLink());
  assert.equal(link(chat).text, 'link=ok\n');
  assert.equal(link(k).text, 'link=primary\n');
  writeFileSync(join(tree, 'knowledge', 'ops.md'), `${OPS}from the chat\n`);
  write(k, 'README.md', `${HUB}from the other chat\n`);
  assert.equal(save(chat, ['knowledge/ops.md'], 'Chat save').code, 0);
  assert.match(published('ops.md'), /from the chat/);
  assert.doesNotMatch(published('README.md'), /other chat/);
  assert.match(status(chat).text, /link=ok[\s\S]*unsaved=knowledge\/README\.md/);
  write(k, 'on call.md', '# On call\n');
  write(k, 'café.md', '# Café\n');
  assert.match(status(k).text, /^unsaved=knowledge\/on call\.md$/m);
  assert.match(status(k).text, /^unsaved=knowledge\/café\.md$/m);
  const kept = update(k);
  assert.match(kept.text, /updated=|saved=/);
  assert.match(read(k, 'README.md'), /from the other chat/);
});
