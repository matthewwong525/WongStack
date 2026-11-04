import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { addLine, readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { todosFile, wrapUpFile } from '../../.agents/skills/daily/scripts/todos.mjs';
import { lookFolder, wrapUp } from '../../.agents/skills/daily/scripts/wrap-up.mjs';

const TZ = 'America/Toronto';
const NOW = Date.parse('2026-11-03T15:00:00Z');
const MIN = 60e3;
const ago = minutes => new Date(NOW - minutes * MIN).toISOString();
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'wrap-up-')); roots.push(dir); return dir; };

// One merged, clean chat, quiet 20 minutes: `flashy-crab` in a worktree of `/repo`. Each test changes one thing.
function rig() {
  const stateDir = temp();
  const world = {
    agent: { id: 'crab', name: 'Fix the invoice total', status: 'idle', cwd: '/wt/flashy-crab' },
    folders: {
      '/repo': { top: '/repo', commonDir: '/repo/.git', branch: 'main', tip: 'm1', porcelain: '', unpushed: '' },
      '/wt/flashy-crab': { top: '/wt/flashy-crab', commonDir: '/repo/.git', branch: 'flashy-crab', tip: 'abc', porcelain: '', unpushed: '' },
    },
    pr: { number: 7, state: 'MERGED', headRefOid: 'abc' }, typed: ago(20), pending: [], busy: false, detail: { UpdatedAt: ago(20) },
    sent: [], prAsked: 0, fail: null, t: NOW,
  };
  const pass = () => wrapUp({ stateDir, project: '/repo', now: new Date(world.t),
    rows: [{ agentId: 'crab', title: 'Fix the invoice total', workspace: 'flashy-crab', source: 'own' }], list: [world.agent], pending: world.pending,
    busy: () => world.busy, typedAt: () => world.typed, look: cwd => world.folders[cwd] ?? null,
    prOf: () => { world.prAsked += 1; return world.pr; }, inspect: async () => world.detail,
    send: async id => { if (world.fail) throw new Error(world.fail); world.sent.push(id); },
    journal: (line, more = {}) => addLine({ stateDir, timezone: TZ, line, now: new Date(world.t), ...more }) });
  const lines = () => readLines({ stateDir }).map(entry => entry.line);
  return { stateDir, world, pass, lines };
}

test('a merged, clean chat quiet 20 minutes gets /close once, and the journal says so', async () => {
  const { world, pass, lines, stateDir } = rig();
  await pass();
  assert.deepEqual(world.sent, ['crab']);
  assert.deepEqual(lines(), ['Wrapped up: Fix the invoice total']);
  assert.deepEqual(readJson(wrapUpFile(stateDir), {}).asked.crab, { at: new Date(NOW).toISOString(), head: 'abc', title: 'Fix the invoice total', tries: 0 });
  world.t += 5 * MIN;
  await pass();
  assert.deepEqual(world.sent, ['crab']);
});

const unchanged = [
  ['a new commit after the merge', world => { world.folders['/wt/flashy-crab'].tip = 'def'; }],
  ['a dirty tree', world => { world.folders['/wt/flashy-crab'].porcelain = ' M wiki/a.md\n'; }],
  ['git that can not read the folder', world => { world.folders['/wt/flashy-crab'] = undefined; }],
  ['an open pull request', world => { world.pr = { state: 'OPEN', headRefOid: 'abc' }; }],
  ['an open question', world => { world.pending = [{ id: 'q1', agentId: 'crab' }]; }],
  ['a running chat', world => { world.agent.status = 'running'; }],
  ['a judge run for it', world => { world.busy = true; }],
  ['the main checkout', world => { world.agent.cwd = '/repo'; Object.assign(world.folders['/repo'], { branch: 'flashy-crab', tip: 'abc' }); }],
  ['a branch named main', world => { world.folders['/wt/flashy-crab'].branch = 'main'; }],
  ['the Daily chat', world => { world.agent.name = 'Daily'; }],
  ['a sub-agent', world => { world.detail = { ParentAgentId: 'boss', UpdatedAt: ago(20) }; }],
  ['a person who wrote 5 minutes ago', world => { world.typed = ago(5); }],
  ['no message time and an update 5 minutes ago', world => { world.typed = null; world.detail = { UpdatedAt: ago(5) }; }],
  ['an archived chat', world => { world.agent.archivedAt = ago(1); }],
];
for (const [name, change] of unchanged) {
  test(`no /close for ${name}`, async () => {
    const { world, pass, lines } = rig();
    change(world);
    await pass();
    assert.deepEqual([world.sent, lines()], [[], []]);
  });
}

test("with no message time, the chat's own last update 20 minutes ago stands in", async () => {
  const { world, pass } = rig();
  world.typed = null;
  await pass();
  assert.deepEqual(world.sent, ['crab']);
});

test('gh is asked once per 10 minutes for the same commit, and again when the commit moves', async () => {
  const { world, pass } = rig();
  world.pr = { state: 'OPEN', headRefOid: 'abc' };
  await pass();
  world.t += 5 * MIN;
  await pass();
  assert.equal(world.prAsked, 1);
  world.folders['/wt/flashy-crab'].tip = 'def';
  world.pr = { state: 'MERGED', headRefOid: 'def' };
  await pass();
  assert.equal(world.prAsked, 2);
  assert.deepEqual(world.sent, ['crab']);
});

test('three failed sends give one Not closed line, and then it stops trying', async () => {
  const { world, pass, lines } = rig();
  world.fail = 'paseo send: no daemon';
  for (let each = 0; each < 4; each += 1) { await pass(); world.t += 5 * MIN; }
  assert.deepEqual(lines(), ['Not closed: Fix the invoice total — paseo send: no daemon']);
  world.fail = null;
  await pass();
  assert.deepEqual(world.sent, []);
});

test("a chat Done already asked to close gets no second /close; a gone chat's entry leaves after 60 days", async () => {
  const { world, pass, stateDir } = rig();
  writeJson(todosFile(stateDir), { crab: { state: 'done-open', closeAsked: ago(30) } });
  await pass();
  assert.deepEqual(world.sent, []);
  writeJson(wrapUpFile(stateDir), { asked: { gone: { at: ago(61 * 24 * 60), head: 'x', title: 'Old', tries: 0 },
    left: { at: ago(59 * 24 * 60), head: 'y', title: 'Newer', tries: 0 } }, gh: { gone: { at: ago(1), head: 'x', merged: true } } });
  await pass();
  const record = readJson(wrapUpFile(stateDir), {});
  assert.deepEqual([Object.keys(record.asked), Object.keys(record.gh)], [['left'], []]);
});

test('lookFolder reads a worktree: its top, the shared git folder, its branch and a clean tree', () => {
  const root = realpathSync(temp());
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
