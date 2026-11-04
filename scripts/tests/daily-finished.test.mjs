import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finished, lookFolder } from '../../.agents/skills/daily/scripts/finished.mjs';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

// One merged, clean, stopped chat: `flashy-crab` in a worktree of `/repo`. Each test changes one thing.
function rig() {
  const world = {
    agent: { id: 'crab', name: 'Fix the invoice total', status: 'idle', cwd: '/wt/flashy-crab' },
    folders: {
      '/repo': { top: '/repo', commonDir: '/repo/.git', branch: 'main', tip: 'm1', porcelain: '', unpushed: '' },
      '/wt/flashy-crab': { top: '/wt/flashy-crab', commonDir: '/repo/.git', branch: 'flashy-crab', tip: 'abc', porcelain: '', unpushed: 'abc\n' },
    },
    pr: { number: 7, state: 'MERGED', headRefOid: 'abc' }, detail: { ParentAgentId: null },
  };
  const check = () => finished({ agent: world.agent, project: '/repo', look: cwd => world.folders[cwd] ?? null, prOf: () => world.pr,
    inspect: async () => { if (world.detail instanceof Error) throw world.detail; return world.detail; } });
  return { world, check };
}

test('a stopped chat merged at its last commit, with a clean folder, is finished', async () => {
  const { world, check } = rig();
  assert.equal(await check(), true);
  world.agent.status = 'error';
  assert.equal(await check(), true);
});

const unfinished = [
  ['a new commit after the merge', world => { world.folders['/wt/flashy-crab'].tip = 'def'; }],
  ['an unsaved folder', world => { world.folders['/wt/flashy-crab'].porcelain = ' M wiki/a.md\n'; }],
  ['git that can not read the folder', world => { world.folders['/wt/flashy-crab'] = undefined; }],
  ['an open pull request', world => { world.pr = { state: 'OPEN', headRefOid: 'abc' }; }],
  ['no pull request', world => { world.pr = null; }],
  ['a working chat', world => { world.agent.status = 'running'; }],
  ['the main checkout', world => { world.agent.cwd = '/repo'; Object.assign(world.folders['/repo'], { branch: 'flashy-crab', tip: 'abc' }); }],
  ['the default branch', world => { world.folders['/wt/flashy-crab'].branch = 'main'; }],
  ['the Daily chat', world => { world.agent.name = 'Daily'; }],
  ['a sub-agent', world => { world.detail = { ParentAgentId: 'boss' }; }],
  ['a chat Paseo can not inspect', world => { world.detail = new Error('gone'); }],
  ['an archived chat', world => { world.agent.archivedAt = '2026-11-04T10:00:00Z'; }],
];
for (const [name, change] of unfinished) {
  test(`not finished: ${name}`, async () => {
    const { world, check } = rig();
    change(world);
    assert.equal(await check(), false);
  });
}

test('lookFolder reads a worktree: its top, the shared git folder, its branch and a clean tree', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'finished-')));
  roots.push(root);
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  git(root, 'init', '-q', '-b', 'main');
  writeFileSync(join(root, 'a.md'), 'a\n');
  git(root, 'add', 'a.md');
  git(root, '-c', 'user.email=a@example.com', '-c', 'user.name=A', 'commit', '-q', '-m', 'a');
  const tree = join(root, '..', `${root.split('/').pop()}-wt`);
  roots.push(tree);
  git(root, 'worktree', 'add', '-q', '-b', 'flashy-crab', tree);
  const seen = lookFolder(tree);
  assert.deepEqual([seen.top, seen.commonDir, seen.branch, seen.porcelain, seen.tip], [tree, join(root, '.git'), 'flashy-crab', '', git(root, 'rev-parse', 'HEAD')]);
  assert.equal(lookFolder(join(root, '..', 'no-such-folder')), null);
});
