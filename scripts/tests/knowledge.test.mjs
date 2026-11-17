import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { folderFor, folders, link, place, remove, restore, save, snapshot, status, undo, update, wipMark } from '../../.agents/memory/knowledge.mjs';

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
  // A chat workspace: a worktree of the computer's code checkout, with its own folder of company knowledge.
  const chat = (k, name, made = true) => {
    const tree = join(dir, name);
    git(k.primary, 'worktree', 'add', '--quiet', '--detach', tree);
    const c = place(tree, { WONG_KNOWLEDGE_REMOTE: remote });
    if (made) assert.equal(folderFor(c), 'made');
    return c;
  };
  const published = (path, ref = 'main') => { try { return git(remote, 'show', `${ref}:${path}`); } catch { return null; } };
  // Another computer saves a page, so the published tip moves on.
  const elsewhere = (page, text) => {
    const other = join(dir, `other-${Math.random().toString(36).slice(2)}`);
    git(dir, 'clone', '--quiet', remote, other);
    writeFileSync(join(other, page), text(readFileSync(join(other, page), 'utf8')));
    git(other, 'commit', '--quiet', '-am', `Edit ${page}`);
    git(other, 'push', '--quiet', 'origin', 'HEAD:main');
  };
  const offline = k => git(k.copy, 'remote', 'set-url', 'origin', `${remote}-gone`);
  const online = k => git(k.copy, 'remote', 'set-url', 'origin', remote);
  return { dir, remote, computer, chat, published, elsewhere, offline, online };
}
const write = (k, page, text) => { mkdirSync(join(k.dir, page, '..'), { recursive: true }); writeFileSync(join(k.dir, page), text); };
const read = (k, page) => readFileSync(join(k.dir, page), 'utf8');
const refs = k => git(k.copy, 'for-each-ref', '--format=%(refname) %(objectname)');

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

test('a broken link someone else already published never stops a save; a new one still does', t => {
  const { computer, published, elsewhere } = world(t);
  const k = computer('ada');
  elsewhere('ops.md', () => `${OPS}See [the rota](rota.md).\n`);
  write(k, 'README.md', `${HUB}Ask in chat.\n`);
  const saved = save(k, ['README.md'], 'Hub note');
  assert.equal(saved.code, 0, saved.text);
  assert.match(published('README.md'), /Ask in chat/);
  write(k, 'README.md', `${HUB}Ask in chat.\nSee [the pager](pager.md).\n`);
  const broken = save(k, ['README.md'], 'Link the pager');
  assert.equal(broken.code, 1);
  assert.match(broken.text, /broken=knowledge\/README\.md:\d+: links to pager\.md/);
  assert.doesNotMatch(broken.text, /rota/, 'the published broken link is not this save\'s problem');
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
  assert.equal(clash.code, 4, clash.text);
  assert.match(clash.text, /^saved=none\nconflict=knowledge\/ops\.md$/m);
  assert.match(read(bo, 'ops.md'), /Ada ships\./);
  assert.match(read(bo, 'ops.mine.md'), /Bo ships\./);
  assert.equal(git(bo.copy, 'rev-parse', 'HEAD'), git(bo.copy, 'rev-parse', 'origin/main'));
  assert.match(published('ops.md'), /Ada ships\./);
  assert.doesNotMatch(status(bo).text, /mine|unsaved=/, 'the copy ignores the other side of a conflict');
  assert.match(status(bo).text, /^conflict=knowledge\/ops\.md$/m, 'status names the page to merge');
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

test('a save goes live while the same folder has an unsaved edit on a page the tip changed', t => {
  const { computer, elsewhere, published } = world(t);
  const k = computer('ada');
  write(k, 'ops.md', OPS.replace('line five', 'line five, unsaved'));
  elsewhere('ops.md', text => text.replace('line two', 'line two, published'));
  write(k, 'README.md', `${HUB}Saved now.\n`);
  const result = save(k, ['README.md'], 'Save the hub');
  assert.equal(result.code, 0, result.text);
  assert.match(published('README.md'), /Saved now/);
  assert.doesNotMatch(published('ops.md'), /unsaved/);
  assert.match(read(k, 'ops.md'), /line two, published[\s\S]*line five, unsaved/, 'the edit stays, on the newest page');
  assert.match(status(k).text, /^unsaved=knowledge\/ops\.md$/m);
  assert.equal(git(k.copy, 'rev-parse', 'HEAD'), git(k.copy, 'rev-parse', 'origin/main'));
});

test('a held save that clashes publishes the other saves and names the page', t => {
  const { computer, elsewhere, offline, online, published } = world(t);
  const k = computer('ada');
  offline(k);
  write(k, 'ops.md', OPS.replace('How we ship.', 'Ada ships.'));
  assert.equal(save(k, ['ops.md'], 'Ada ships').code, 3);
  write(k, 'README.md', `${HUB}Held too.\n`);
  assert.equal(save(k, ['README.md'], 'Hub').code, 3);
  elsewhere('ops.md', text => text.replace('How we ship.', 'Bo ships.'));
  online(k);
  const result = update(k);
  assert.equal(result.code, 4, result.text);
  assert.match(result.text, /^saved=[0-9a-f]{40}$/m);
  assert.match(result.text, /^conflict=knowledge\/ops\.md$/m);
  assert.match(published('README.md'), /Held too/);
  assert.match(published('ops.md'), /Bo ships/);
  assert.match(read(k, 'ops.md'), /Bo ships/);
  assert.match(read(k, 'ops.mine.md'), /Ada ships/);
  assert.doesNotMatch(status(k).text, /pending=|behind=/);
});

test('an unsaved edit on other lines moves forward merged', t => {
  const { computer, elsewhere } = world(t);
  const k = computer('ada');
  write(k, 'ops.md', OPS.replace('line five', 'line five, mine'));
  elsewhere('ops.md', text => text.replace('line two', 'line two, theirs'));
  const result = update(k);
  assert.equal(result.code, 0, result.text);
  assert.match(result.text, /^updated=/);
  assert.match(read(k, 'ops.md'), /line two, theirs[\s\S]*line five, mine/);
  assert.match(status(k).text, /^unsaved=knowledge\/ops\.md$/m);
});

test('same lines: the folder holds the published text, with its own beside it as .mine', t => {
  const { computer, elsewhere } = world(t);
  const k = computer('ada');
  write(k, 'ops.md', OPS.replace('How we ship.', 'Mine.'));
  elsewhere('ops.md', text => text.replace('How we ship.', 'Theirs.'));
  const result = update(k);
  assert.equal(result.code, 4, result.text);
  assert.match(result.text, /^conflict=knowledge\/ops\.md$/m);
  assert.match(read(k, 'ops.md'), /Theirs\./);
  assert.match(read(k, 'ops.mine.md'), /Mine\./);
});

test('an untracked new page survives the move', t => {
  const { computer, elsewhere } = world(t);
  const k = computer('ada');
  write(k, 'new.md', '# New\n\nNot saved yet.\n');
  write(k, join('deep', 'page.md'), '# Deep\n\nNot saved yet.\n');
  elsewhere('ops.md', text => `${text}more\n`);
  assert.equal(update(k).code, 0);
  assert.equal(read(k, 'new.md'), '# New\n\nNot saved yet.\n');
  assert.equal(read(k, join('deep', 'page.md')), '# Deep\n\nNot saved yet.\n');
  assert.match(read(k, 'ops.md'), /more/);
  assert.match(status(k).text, /^unsaved=knowledge\/new\.md$/m);
});

test('a leftover wip mark is finished on the next run', t => {
  const { computer, elsewhere } = world(t);
  const k = computer('ada');
  const from = git(k.dir, 'rev-parse', 'HEAD');
  write(k, 'ops.md', OPS.replace('line five', 'line five, mine'));
  elsewhere('README.md', text => `${text}Newer.\n`);
  git(k.dir, 'fetch', '--quiet', 'origin');
  const to = git(k.dir, 'rev-parse', 'origin/main');
  writeFileSync(wipMark(k), JSON.stringify({ from, wip: snapshot(k, from), to, clash: [] }));
  git(k.dir, 'reset', '--quiet', '--hard', to);
  assert.doesNotMatch(read(k, 'ops.md'), /mine/, 'the stopped run had moved the folder');
  assert.equal(update(k).code, 0);
  assert.match(read(k, 'ops.md'), /line five, mine/);
  assert.match(read(k, 'README.md'), /Newer/);
  assert.equal(existsSync(wipMark(k)), false);
});

test('a save with a clash prints saved= and conflict= together and exits 4', t => {
  const { computer, elsewhere, offline, online, published } = world(t);
  const k = computer('ada');
  offline(k);
  write(k, 'ops.md', OPS.replace('How we ship.', 'Ada ships.'));
  assert.equal(save(k, ['ops.md'], 'Ada ships').code, 3);
  elsewhere('ops.md', text => text.replace('How we ship.', 'Bo ships.'));
  online(k);
  write(k, 'README.md', `${HUB}Ada's hub line.\n`);
  const result = save(k, ['README.md'], 'Hub');
  assert.equal(result.code, 4, result.text);
  assert.match(result.text, /^saved=[0-9a-f]{40}\npage=knowledge\/README\.md\nLive for the team now\.\nTo undo it.*\nconflict=knowledge\/ops\.md\n/);
  assert.match(published('README.md'), /Ada's hub line/);
});

test('two chats get their own folders, and A\'s unsaved edit is not in B', t => {
  const { computer, chat, published } = world(t);
  const k = computer('ada');
  const a = chat(k, 'chat-a', false), b = chat(k, 'chat-b');
  assert.equal(link(a).text, 'folder=made\n');
  assert.equal(link(a).text, 'folder=ok\n');
  assert.equal(link(k).text, 'folder=primary\n');
  assert.ok(lstatSync(a.link).isDirectory() && !lstatSync(a.link).isSymbolicLink());
  assert.equal(git(a.dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'chat/chat-a');
  write(a, 'ops.md', OPS.replace('line two', 'line two by A'));
  assert.equal(read(b, 'ops.md'), OPS);
  write(b, 'ops.md', OPS.replace('line five', 'line five by B'));
  const saved = save(b, ['knowledge/ops.md'], 'B saves');
  assert.equal(saved.code, 0, saved.text);
  assert.match(published('ops.md'), /line five by B/);
  assert.doesNotMatch(published('ops.md'), /by A/);
  assert.equal(read(a, 'ops.md'), OPS.replace('line two', 'line two by A'), 'A sees its own edit, not B\'s');
  assert.match(status(a).text, /folder=ok[\s\S]*^unsaved=knowledge\/ops\.md$/m);
  assert.doesNotMatch(status(k).text, /unsaved=/, 'the shared copy holds no draft');
  assert.match(read(k, 'ops.md'), /line five by B/, 'the clean shared copy follows the published version');
});

test('a symlinked workspace switches and the shared copy keeps every file and save', t => {
  const { computer, chat, offline, online } = world(t);
  const k = computer('ada');
  offline(k);
  write(k, 'ops.md', `${OPS}held\n`);
  assert.equal(save(k, ['ops.md'], 'Held').code, 3);
  write(k, 'README.md', `${HUB}a draft\n`);
  online(k);
  const before = { head: git(k.copy, 'rev-parse', 'HEAD'), refs: refs(k) };
  const c = chat(k, 'old-chat', false);
  symlinkSync(k.copy, c.link, 'dir');
  assert.equal(link(c).text, 'folder=switched\n');
  assert.ok(!lstatSync(c.link).isSymbolicLink());
  assert.equal(read(c, 'README.md'), HUB, 'the new folder starts from the published version');
  assert.equal(git(k.copy, 'rev-parse', 'HEAD'), before.head);
  assert.match(read(k, 'README.md'), /a draft/);
  assert.match(read(k, 'ops.md'), /held/);
  assert.deepEqual(refs(k).split('\n').filter(line => !line.includes('refs/heads/chat/')), before.refs.split('\n'));
});

test('a taken branch with held saves gets -2, and a free one is made again', t => {
  const { computer, chat } = world(t);
  const k = computer('ada');
  const c = chat(k, 'busy');
  write(c, 'ops.md', `${OPS}held on the branch\n`);
  git(c.dir, 'commit', '--quiet', '-am', 'Held');
  git(k.copy, 'worktree', 'remove', '--force', c.link);
  assert.equal(folderFor(c), 'made');
  assert.equal(git(c.dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'chat/busy-2');
  assert.match(git(k.copy, 'show', 'chat/busy:ops.md'), /held on the branch/, 'the held save keeps its branch');
  git(k.copy, 'worktree', 'remove', '--force', c.link);
  assert.equal(folderFor(c), 'made');
  assert.equal(git(c.dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'chat/busy-2', 'a branch with nothing held is made again');
});

test('remove refuses with unsaved pages, and never removes the shared copy', t => {
  const { computer, chat } = world(t);
  const k = computer('ada');
  const c = chat(k, 'chat');
  write(c, 'ops.md', `${OPS}unsaved\n`);
  const refused = remove(c);
  assert.equal(refused.code, 1);
  assert.match(refused.text, /^removed=none\nunsaved=knowledge\/ops\.md\n/);
  assert.ok(existsSync(join(c.dir, 'ops.md')));
  assert.match(remove(k, { discard: true }).text, /^removed=none\n/);
  assert.ok(existsSync(join(k.copy, '.git')));
  write(c, 'ops.md', OPS);
  assert.equal(remove(c).code, 0);
  assert.equal(existsSync(c.link), false);
  assert.equal(git(k.copy, 'branch', '--list', 'chat/chat'), '', 'a branch with nothing held is deleted');
});

test('remove --discard keeps a branch that holds a save, and folders --send publishes it and prunes the branch', t => {
  const { computer, chat, offline, online, published } = world(t);
  const k = computer('ada');
  const c = chat(k, 'gone');
  offline(k);
  write(c, 'ops.md', `${OPS}held in a chat\n`);
  assert.equal(save(c, ['ops.md'], 'Held in a chat').code, 3);
  write(c, 'README.md', `${HUB}dropped\n`);
  online(k);
  const removed = remove(c, { discard: true });
  assert.equal(removed.code, 0, removed.text);
  assert.match(removed.text, /^held=1$/m);
  assert.equal(existsSync(c.link), false);
  assert.match(git(k.copy, 'show', 'chat/gone:ops.md'), /held in a chat/);
  assert.match(folders(k).text, /^folder=chat\/gone path=none held=1 unsaved=0$/m);
  const sent = folders(k, { send: true });
  assert.equal(sent.code, 0, sent.text);
  assert.match(sent.text, /^sent=chat\/gone saved /m);
  assert.match(sent.text, /^pruned=chat\/gone$/m);
  assert.match(published('ops.md'), /held in a chat/);
  assert.doesNotMatch(published('README.md'), /dropped/);
  assert.equal(git(k.copy, 'branch', '--list', 'chat/gone'), '');
});

test('a symlinked workspace never lists or publishes the shared copy\'s drafts', t => {
  const { computer, chat } = world(t);
  const k = computer('ada');
  write(k, 'README.md', `${HUB}a draft in the shared copy\n`);
  const c = chat(k, 'old-link', false);
  symlinkSync(k.copy, c.link, 'dir');
  const said = status(c);
  assert.match(said.text, /^folder=switched$/m, 'status first makes the chat its own folder');
  assert.doesNotMatch(said.text, /unsaved=/);
  assert.ok(!lstatSync(c.link).isSymbolicLink());
  assert.match(read(k, 'README.md'), /a draft in the shared copy/, 'the shared copy keeps its draft');
  // A git folder that is not the copy's is no folder: nothing is listed or saved from it.
  const e = chat(k, 'own-repo', false);
  mkdirSync(e.link);
  git(e.link, 'init', '--quiet');
  write(e, 'README.md', 'another repository\n');
  assert.doesNotMatch(status(e).text, /unsaved=/);
  const refused = save(e, ['README.md'], 'Not ours');
  assert.equal(refused.code, 1, refused.text);
  assert.match(refused.text, /^folder=blocked$/m);
});

// The chat edited its page through the old link, so the edit is in the shared copy's tree; the save carries it over.
// The fetch is the chat start's: the new folder starts from the newest published version.
test('a save that switches an old link publishes the page the chat edited through it, and no other draft', t => {
  const { computer, chat, elsewhere, published } = world(t);
  const k = computer('ada');
  write(k, 'README.md', `${HUB}another chat's draft\n`);
  const c = chat(k, 'old-link', false);
  symlinkSync(k.copy, c.link, 'dir');
  write(c, 'ops.md', OPS.replace('line five', 'line five by the chat'));
  elsewhere('ops.md', text => text.replace('line two', 'line two, published'));
  git(k.copy, 'fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  const saved = save(c, ['knowledge/ops.md'], 'Close the chat');
  assert.equal(saved.code, 0, saved.text);
  assert.match(saved.text, /^folder=switched\nsaved=[0-9a-f]{40}\npage=knowledge\/ops\.md\n/);
  assert.match(published('ops.md'), /line two, published[\s\S]*line five by the chat/);
  assert.equal(published('README.md'), HUB.trim(), 'a draft the save does not name is never published');
  assert.ok(!lstatSync(c.link).isSymbolicLink());
  assert.match(read(k, 'README.md'), /another chat's draft/, 'the shared copy keeps the other draft');
  assert.equal(read(k, 'ops.md'), OPS.replace('line five', 'line five by the chat'), 'the shared copy keeps the carried page as it was');
  assert.doesNotMatch(status(c).text, /unsaved=|conflict=/);
});

test('a carried page that clashes keeps the published text, with the chat\'s as .mine, and the other named pages publish', t => {
  const { computer, chat, elsewhere, published } = world(t);
  const k = computer('ada');
  write(k, 'draft.md', '# Draft\n\nAnother chat\'s page.\n');
  const c = chat(k, 'old-link', false);
  symlinkSync(k.copy, c.link, 'dir');
  write(c, 'ops.md', OPS.replace('How we ship.', 'The chat ships.'));
  write(c, 'README.md', `${HUB}The chat's hub line.\n`);
  elsewhere('ops.md', text => text.replace('How we ship.', 'Bo ships.'));
  git(k.copy, 'fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  const saved = save(c, ['ops.md', 'README.md'], 'Close the chat');
  assert.equal(saved.code, 4, saved.text);
  assert.match(saved.text, /^folder=switched\nsaved=[0-9a-f]{40}\npage=knowledge\/README\.md\n/);
  assert.match(saved.text, /^conflict=knowledge\/ops\.md$/m);
  assert.match(published('README.md'), /The chat's hub line/);
  assert.match(published('ops.md'), /Bo ships\./);
  assert.equal(published('draft.md'), null);
  assert.match(read(c, 'ops.md'), /Bo ships\./);
  assert.match(read(c, 'ops.mine.md'), /The chat ships\./);
  assert.match(status(c).text, /^conflict=knowledge\/ops\.md$/m);
  assert.match(read(k, 'ops.md'), /The chat ships\./, 'the shared copy keeps the chat\'s text');
  assert.ok(existsSync(join(k.copy, 'draft.md')));
});

test('folders --send puts a closed chat\'s clash beside the newest published page in the tidy\'s folder', t => {
  const { computer, chat, elsewhere, offline, online, published } = world(t);
  const k = computer('ada');
  const tidy = chat(k, 'tidy');
  const gone = chat(k, 'gone');
  offline(k);
  write(gone, 'ops.md', OPS.replace('How we ship.', 'The chat ships.'));
  assert.equal(save(gone, ['ops.md'], 'The chat ships').code, 3);
  online(k);
  assert.equal(remove(gone).code, 0);
  elsewhere('ops.md', text => text.replace('How we ship.', 'Bo ships.'));
  const sent = folders(tidy, { send: true });
  assert.equal(sent.code, 4, sent.text);
  assert.match(sent.text, /^sent=chat\/gone saved /m, 'the chat\'s .gitignore save goes live');
  assert.match(sent.text, /^conflict=knowledge\/ops\.md$/m);
  assert.match(read(tidy, 'ops.md'), /Bo ships\./, 'the tidy\'s page holds the newest published text');
  assert.match(read(tidy, 'ops.mine.md'), /The chat ships\./);
  assert.match(published('ops.md'), /Bo ships\./);
});
