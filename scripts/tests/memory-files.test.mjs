// The files behind facts: the ranked merge of change files, named paths, and topic paths; and WongStack's history
// read of the files each change touched, against a throwaway git repo.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { filesBehind, namedPaths } from '../../.agents/plugins/memory/scripts/lib/files.mjs';
import { changeFiles } from '../../.agents/memory/lookup.mjs';
import { tempDir } from './fixtures/memory/harness.mjs';

const files = (root, map) => Object.entries(map).forEach(([path, body]) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
});
const lookupOf = map => ({ lookup: { files: async (_ctx, slugs) => new Map(slugs.filter(slug => map[slug]).map(slug => [slug, map[slug]])) } });
const touched = (...paths) => paths.map((path, n) => ({ path, churn: 100 - n }));
const fact = (id, slug, body = 'A fact.', tags = []) => ({ id, slug, body, tags });

test('a file three changes share ranks first with every fact id; a missing named path is dropped', async t => {
  const root = tempDir(t, 'files-shared-');
  files(root, { 'src/shared.mjs': '', 'src/a.mjs': '', 'src/b.mjs': '', 'src/c.mjs': '' });
  const profile = lookupOf({ a: touched('src/a.mjs', 'src/shared.mjs'), b: touched('src/b.mjs', 'src/shared.mjs'), c: touched('src/c.mjs', 'src/shared.mjs') });
  const facts = [fact(1, 'a', 'See src/gone.mjs.'), fact(2, 'b'), fact(3, 'c')];
  const { files: list, state } = await filesBehind({ root }, facts, { profile });
  assert.equal(state, 'ok');
  assert.deepEqual(list[0], { path: 'src/shared.mjs', facts: [1, 2, 3], via: 'change' });
  assert.deepEqual(list.map(file => file.path).sort(), ['src/a.mjs', 'src/b.mjs', 'src/c.mjs', 'src/shared.mjs']);
});

test('a named path outranks a touched one, and one change adds ten files at most', async t => {
  const root = tempDir(t, 'files-named-');
  const many = Array.from({ length: 14 }, (_, n) => `src/f${n}.mjs`);
  files(root, Object.fromEntries([...many, 'wiki/page.md'].map(path => [path, ''])));
  const { files: list } = await filesBehind({ root }, [fact(1, 'big', 'Read `wiki/page.md#a-part` first.')],
    { profile: lookupOf({ big: touched(...many) }), limit: 30 });
  assert.deepEqual(list[0], { path: 'wiki/page.md', facts: [1], via: 'named' });
  assert.equal(list.filter(file => file.via === 'change').length, 10);
  assert.ok(!list.some(file => ['src/f10.mjs', 'src/f13.mjs'].includes(file.path)), 'the ten with the most changed lines');
});

test('a fact with no change file and no named path gets its topic docs and folders; no lookup part still answers', async t => {
  const root = tempDir(t, 'files-topic-');
  files(root, { 'wiki/memory.md': '', 'lib/memory/x.mjs': '' });
  const areas = { memory: { paths: ['lib/memory/', 'lib/missing/'], docs: ['wiki/memory.md', 'wiki/absent.md'] } };
  const { files: list, state } = await filesBehind({ root }, [fact(4, 'chat-only', 'No path here.', ['memory'])], { profile: {}, areas });
  assert.equal(state, 'ok');
  assert.deepEqual(list, [{ path: 'lib/memory/', facts: [4], via: 'topic' }, { path: 'wiki/memory.md', facts: [4], via: 'topic' }]);
  const none = await filesBehind({ root }, [fact(5, null, 'Nothing.')], { profile: null, areas });
  assert.deepEqual(none, { files: [], state: 'empty' });
});

test('a lookup that never settles or throws leaves named paths and says unavailable', async t => {
  const root = tempDir(t, 'files-late-');
  files(root, { 'wiki/page.md': '' });
  for (const files of [() => new Promise(() => {}), () => { throw new Error('boom'); }]) {
    const result = await filesBehind({ root }, [fact(1, 'x', 'See wiki/page.md.')], { profile: { lookup: { files } }, deadline: Date.now() + 50 });
    assert.deepEqual(result, { files: [{ path: 'wiki/page.md', facts: [1], via: 'named' }], state: 'unavailable' });
  }
});

test('namedPaths keeps existing repo paths only, with .claude/ read as .agents/', t => {
  const root = tempDir(t, 'files-words-');
  files(root, { '.agents/skills/x/SKILL.md': '', 'app/a.ts': '' });
  assert.deepEqual(namedPaths('Edit .claude/skills/x/SKILL.md and app/a.ts:12, not app/b.ts or https://example.com/a.', root),
    ['.agents/skills/x/SKILL.md', 'app/a.ts']);
});

// A repo whose main branch holds squash commits, one a change, as /ship makes them.
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
function commit(root, map, message, removed = []) {
  files(root, map);
  for (const path of removed) rmSync(join(root, path));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
}
function history(t) {
  const root = tempDir(t, 'files-history-');
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'dev@example.com');
  git(root, 'config', 'user.name', 'Dev');
  const lines = n => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n');
  commit(root, { 'README.md': 'x\n' }, 'init');
  commit(root, {
    'openspec/changes/archive/2026-01-01-old-change/proposal.md': '# Old\n\nTouches `src/big.mjs`.\n',
    'src/big.mjs': lines(50), 'src/small.mjs': lines(3), 'src/moved.mjs': lines(20), 'src/deleted.mjs': lines(10),
    'CHANGELOG.md': 'x', VERSION: '1.0.0', 'app/package-lock.json': '{}',
  }, 'feat: old change');
  return root;
}
const counting = () => {
  const calls = [];
  const run = promisify(execFile);
  return { calls, run: (command, args, options) => { calls.push(args.join(' ')); return run(command, args, options); } };
};
const renameReads = calls => calls.filter(call => call.includes(' -M ')).length;

test('a squash commit gives its files by changed lines, without the plan, release files, or a lockfile', async t => {
  const root = history(t);
  const { calls, run } = counting();
  const found = await changeFiles({ root }, ['old-change'], { run });
  assert.deepEqual(found.get('old-change'), [
    { path: 'src/big.mjs', churn: 50 }, { path: 'src/moved.mjs', churn: 20 }, { path: 'src/deleted.mjs', churn: 10 }, { path: 'src/small.mjs', churn: 3 },
  ]);
  assert.equal(renameReads(calls), 0, 'no rename read when every path exists');
});

test('a file renamed twice comes back at its newest path, a deleted one drops, in one rename read', async t => {
  const root = history(t);
  mkdirSync(join(root, 'lib'));
  git(root, 'mv', 'src/moved.mjs', 'lib/moved.mjs');
  git(root, 'commit', '-q', '-m', 'move once');
  git(root, 'mv', 'lib/moved.mjs', 'lib/final.mjs');
  commit(root, {}, 'move twice', ['src/deleted.mjs']);
  const { calls, run } = counting();
  const found = await changeFiles({ root }, ['old-change', 'never-seen'], { run });
  assert.deepEqual(found.get('old-change').map(file => file.path), ['src/big.mjs', 'lib/final.mjs', 'src/small.mjs']);
  assert.deepEqual(found.get('never-seen'), []);
  assert.equal(renameReads(calls), 1);
});

test('a path that exists now is never followed, even when its old name moved before', async t => {
  const root = history(t);
  commit(root, {}, 'drop a file', ['src/deleted.mjs']);
  git(root, 'mv', 'src/small.mjs', 'src/other.mjs');
  git(root, 'commit', '-q', '-m', 'move');
  commit(root, { 'openspec/changes/archive/2026-02-01-new-change/proposal.md': '# New\n', 'src/small.mjs': 'fresh\n' }, 'feat: new change');
  const found = await changeFiles({ root }, ['old-change', 'new-change']);
  assert.deepEqual(found.get('new-change'), [{ path: 'src/small.mjs', churn: 1 }]);
});

test('one name moved twice follows each change to its own file', async t => {
  const root = history(t);
  mkdirSync(join(root, 'lib'));
  git(root, 'mv', 'src/moved.mjs', 'lib/first.mjs');
  git(root, 'commit', '-q', '-m', 'move once');
  commit(root, { 'openspec/changes/archive/2026-02-01-reuse/proposal.md': '# Reuse\n', 'src/moved.mjs': 'a new file\n' }, 'feat: reuse');
  git(root, 'mv', 'src/moved.mjs', 'lib/second.mjs');
  git(root, 'commit', '-q', '-m', 'move again');
  const found = await changeFiles({ root }, ['old-change', 'reuse']);
  assert.deepEqual(found.get('old-change').map(file => file.path), ['src/big.mjs', 'lib/first.mjs', 'src/deleted.mjs', 'src/small.mjs']);
  assert.deepEqual(found.get('reuse'), [{ path: 'lib/second.mjs', churn: 1 }]);
});

test('an active change gives its plan paths that exist; a repo with no git gives the archive plan paths', async t => {
  const root = history(t);
  files(root, { 'openspec/changes/now/proposal.md': '# Now\n\nEdit `src/small.mjs` and `src/none.mjs`; run `npm test`.\n' });
  assert.deepEqual((await changeFiles({ root }, ['now'])).get('now'), [{ path: 'src/small.mjs', churn: 0 }]);
  rmSync(join(root, '.git'), { recursive: true, force: true });
  const found = await changeFiles({ root }, ['old-change']);
  assert.deepEqual(found.get('old-change'), [{ path: 'src/big.mjs', churn: 0 }]);
});
