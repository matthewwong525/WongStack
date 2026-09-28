import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  emptyReport, formatBytes, inside, isIdle, isOldTemp, mergeReports, mergedAtTip, orphanPids, ownWorkspace,
  reportLine, savedState, takeLock,
} from '../../.agents/skills/routine/scripts/tidy.mjs';

const cli = new URL('../../.agents/skills/routine/scripts/tidy.mjs', import.meta.url).pathname;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-09-27T12:00:00Z');
const ago = ms => new Date(Date.now() - ms).toISOString();

function tmp(t, prefix = 'tidy-') {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `wong-test-${prefix}`)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function commit(cwd, file) {
  writeFileSync(path.join(cwd, file), `${file}\n`);
  git(cwd, 'add', '--all');
  git(cwd, 'commit', '-q', '-m', file);
  return git(cwd, 'rev-parse', 'HEAD');
}

function age(file, ms) {
  const time = new Date(Date.now() - ms);
  utimesSync(file, time, time);
}

// A bare origin, a primary clone, and worktrees under a fake Paseo home, as
// Paseo lays them out: <PASEO_HOME>/worktrees/<repo hash>/<name>.
function setup(t) {
  const base = tmp(t);
  const origin = path.join(base, 'origin.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  const primary = path.join(base, 'primary');
  execFileSync('git', ['clone', '-q', origin, primary], { stdio: 'ignore' });
  git(primary, 'config', 'user.email', 'fixture@example.invalid');
  git(primary, 'config', 'user.name', 'Fixture');
  commit(primary, 'README.md');
  git(primary, 'push', '-q', 'origin', 'HEAD:main');
  const paseoHome = path.join(base, 'paseo');
  const parent = path.join(paseoHome, 'worktrees', 'h1');
  mkdirSync(parent, { recursive: true });
  const temp = path.join(base, 'tmp');
  mkdirSync(temp);
  const worktree = (name, { push = true } = {}) => {
    const dir = path.join(parent, name);
    git(primary, 'worktree', 'add', '-q', '-b', name, dir);
    const tip = commit(dir, `${name}.md`);
    if (push) git(dir, 'push', '-q', 'origin', name);
    return { dir, tip, branch: name };
  };
  const fakes = fakeTools(base);
  return { base, primary, parent, paseoHome, temp, worktree, ...fakes };
}

// A fake `paseo` and `gh`. paseo answers `workspace ls` with FAKE_WORKSPACES,
// `ls -g` with FAKE_AGENTS, `inspect <id>` from the FAKE_INSPECT map, and `wait`
// with FAKE_WAIT_STATUS; `workspace archive` removes the worktree from
// FAKE_PRIMARY. gh prints FAKE_GH_PR, or fails when it is unset. Every call is logged.
function fakeTools(base) {
  const bin = path.join(base, 'bin');
  mkdirSync(bin);
  const log = path.join(base, 'calls.jsonl');
  writeFileSync(path.join(bin, 'paseo'), `#!${process.execPath}
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const args = process.argv.slice(2).filter(a => a !== '--json');
const env = process.env;
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(['paseo', ...args]) + '\\n');
const out = value => { console.log(JSON.stringify(value)); process.exit(0); };
if (args[0] === 'workspace' && args[1] === 'ls') { console.log(env.FAKE_WORKSPACES ?? '[]'); process.exit(0); }
if (args[0] === 'ls') { console.log(env.FAKE_AGENTS ?? '[]'); process.exit(0); }
if (args[0] === 'inspect') out(JSON.parse(env.FAKE_INSPECT ?? '{}')[args[1]] ?? {});
if (args[0] === 'wait') out({ agentId: args[1], status: env.FAKE_WAIT_STATUS ?? 'idle' });
if (args[0] === 'workspace' && args[1] === 'archive') {
  const ws = JSON.parse(env.FAKE_WORKSPACES ?? '[]').find(w => w.workspaceId === args[2]);
  if (ws && env.FAKE_PRIMARY) execFileSync('git', ['-C', env.FAKE_PRIMARY, 'worktree', 'remove', '--force', ws.cwd]);
  out({ workspaceId: args[2], archived: true });
}
console.error('unknown command'); process.exit(1);
`);
  writeFileSync(path.join(bin, 'gh'), `#!${process.execPath}
require('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(['gh', ...process.argv.slice(2)]) + '\\n');
if (!process.env.FAKE_GH_PR) process.exit(1);
console.log(process.env.FAKE_GH_PR);
`);
  chmodSync(path.join(bin, 'paseo'), 0o755);
  chmodSync(path.join(bin, 'gh'), 0o755);
  const calls = () => existsSync(log)
    ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
    : [];
  return { bin, calls };
}

function envFor(s, extra = {}) {
  return {
    ...process.env,
    PATH: `${s.bin}${path.delimiter}${process.env.PATH}`,
    TIDY_PASEO_BIN: path.join(s.bin, 'paseo'),
    PASEO_HOME: s.paseoHome,
    TMPDIR: s.temp,
    FAKE_PRIMARY: s.primary,
    PASEO_AGENT_ID: '',
    ...extra,
  };
}

function run(cwd, args, env) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env });
  return { status: r.status, stdout: r.stdout, json: r.stdout.startsWith('{') ? JSON.parse(r.stdout) : null };
}

const reportFile = s => path.join(s.primary, '.git', 'wong-tidy', 'report.json');

async function waitFor(check, what) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise(done => setTimeout(done, 50));
  }
  assert.fail(`timed out waiting for ${what}`);
}

// ---------------------------------------------------------------------------
// The ownership tests, pure

test('inside matches a folder and what it holds, never a sibling with the same prefix', () => {
  assert.equal(inside('/w/a', '/w/a'), true);
  assert.equal(inside('/w/a/', '/w/a/b/c'), true);
  assert.equal(inside('/w/a', '/w/ab'), false);
  assert.equal(inside('', '/w'), false);
});

test('a workspace is ours only as a worktree of this repo, never the primary', () => {
  const ws = { isolation: 'worktree', cwd: '/w/x' };
  assert.equal(ownWorkspace(ws, { commonDir: '/r/.git', wsCommonDir: '/r/.git', primary: '/r' }), true);
  assert.equal(ownWorkspace(ws, { commonDir: '/r/.git', wsCommonDir: '/other/.git', primary: '/r' }), false);
  assert.equal(ownWorkspace({ ...ws, isolation: 'local' }, { commonDir: '/r/.git', wsCommonDir: '/r/.git', primary: '/r' }), false);
  assert.equal(ownWorkspace({ ...ws, cwd: '/r' }, { commonDir: '/r/.git', wsCommonDir: '/r/.git', primary: '/r' }), false);
  assert.equal(ownWorkspace(ws, { commonDir: '/r/.git', wsCommonDir: undefined, primary: '/r' }), false);
});

test('saved means a clean tree and every commit on a remote, or merged at this commit', () => {
  assert.deepEqual(savedState({ porcelain: '', unpushed: '' }), { saved: true, reason: null, files: [] });
  assert.deepEqual(savedState({ porcelain: ' M a.md\n?? b.md\n', unpushed: '' }),
    { saved: false, reason: 'unsaved files', files: ['a.md', 'b.md'] });
  assert.equal(savedState({ porcelain: '', unpushed: 'abc\n' }).reason, 'commits on no remote');
  assert.equal(savedState({ porcelain: '', unpushed: 'abc\n', merged: true }).saved, true);
  assert.equal(savedState({ porcelain: null, unpushed: '' }).reason, 'git could not read it');
  assert.equal(mergedAtTip({ state: 'MERGED', headRefOid: 'a1' }, 'a1'), true);
  assert.equal(mergedAtTip({ state: 'MERGED', headRefOid: 'a1' }, 'b2'), false);
  assert.equal(mergedAtTip({ state: 'OPEN', headRefOid: 'a1' }, 'a1'), false);
  assert.equal(mergedAtTip(null, 'a1'), false);
});

test('idle needs every agent stopped and the newest activity 3 days old', () => {
  const old = new Date(NOW - 4 * DAY).toISOString();
  const recent = new Date(NOW - 2 * DAY).toISOString();
  assert.equal(isIdle([{ status: 'idle', updatedAt: old }], NOW), true);
  assert.equal(isIdle([{ status: 'idle', updatedAt: old }, { status: 'idle', updatedAt: recent }], NOW), false);
  assert.equal(isIdle([{ status: 'running', updatedAt: old }], NOW), false);
  assert.equal(isIdle([{ status: 'idle', updatedAt: null }], NOW), false);
  assert.equal(isIdle([], NOW, { fallbackMs: NOW - 5 * DAY }), true);
  assert.equal(isIdle([], NOW), false);
});

test('only this user\'s processes in a deleted worktree under a root are orphans', () => {
  const procs = [
    { pid: 10, uid: 1000, cwd: '/p/worktrees/h1/gone/app (deleted)' },
    { pid: 11, uid: 1000, cwd: '/p/worktrees/h1/live/app' },
    { pid: 12, uid: 0, cwd: '/p/worktrees/h1/gone (deleted)' },
    { pid: 13, uid: 1000, cwd: '/p/worktrees/h2/gone (deleted)' },
    { pid: 14, uid: 1000, cwd: '/p/worktrees/h1/live/dist (deleted)' },
    { pid: 15, uid: 1000, cwd: '/p/worktrees/h1/gone (deleted)' },
  ];
  assert.deepEqual(orphanPids(procs, { uid: 1000, self: 15, roots: ['/p/worktrees/h1'], live: ['/p/worktrees/h1/live'] }), [10]);
  assert.deepEqual(orphanPids(procs, { uid: 1000, self: 1, roots: [] }), []);
});

test('an old temp entry must be ours by name and owner, with nothing inside it touched lately', () => {
  const old = NOW - 2 * DAY;
  const opts = { uid: 1000, now: NOW };
  assert.equal(isOldTemp({ name: 'wong-memory-repo-x1', uid: 1000, mtimeMs: old, childMtimes: [old] }, opts), true);
  assert.equal(isOldTemp({ name: 'tsx-0', uid: 1000, mtimeMs: old }, opts), false);
  assert.equal(isOldTemp({ name: 'wong-x', uid: 0, mtimeMs: old }, opts), false);
  assert.equal(isOldTemp({ name: 'wong-x', uid: 1000, mtimeMs: old, childMtimes: [NOW - HOUR] }, opts), false);
  assert.equal(isOldTemp({ name: 'wong-x', uid: 1000, mtimeMs: NOW - HOUR }, opts), false);
});

test('the report line names what was closed, stopped, freed, and left open, and is empty for nothing', () => {
  assert.equal(reportLine(emptyReport()), '');
  assert.equal(reportLine({}), '');
  const merged = mergeReports(
    { closed: ['Docs'], stopped: 1, deleted: 3, freed: 3 * 1024 * 1024 },
    { closed: ['Search'], left: [{ name: 'Weekly plan', reason: 'it has unsaved work' }], branches: ['docs'], notes: ['a note'] },
  );
  assert.equal(reportLine(merged),
    'Tidy-up: closed 2 workspaces ("Docs", "Search"); deleted 1 merged branch; stopped 1 leftover process; '
    + 'deleted 3 old temp or scratch entries, freeing 3 MB; left "Weekly plan" open: it has unsaved work; a note.');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(12), '12 bytes');
});

test('the lock admits one holder, and a stale lock is taken over', t => {
  const lock = path.join(tmp(t), 'sweep.lock');
  assert.equal(takeLock(lock), true);
  assert.equal(takeLock(lock), false);
  age(lock, 2 * HOUR);
  assert.equal(takeLock(lock), true);
});

// ---------------------------------------------------------------------------
// scratch

test('scratch makes .scratch/ and excludes it only when git does not ignore it yet', t => {
  const s = setup(t);
  const wt = s.worktree('scratchy');
  const first = run(wt.dir, ['scratch'], envFor(s));
  assert.equal(first.status, 0, first.stdout);
  assert.deepEqual(first.json, { ok: true, path: path.join(wt.dir, '.scratch'), excluded: true });
  assert.ok(existsSync(path.join(wt.dir, '.scratch')));
  const exclude = path.join(s.primary, '.git', 'info', 'exclude');
  assert.equal(readFileSync(exclude, 'utf8').split('\n').filter(line => line === '.scratch/').length, 1);
  const again = run(s.primary, ['scratch'], envFor(s));
  assert.equal(again.json.excluded, false);
  assert.equal(readFileSync(exclude, 'utf8').split('\n').filter(line => line === '.scratch/').length, 1);

  const ignored = setup(t);
  writeFileSync(path.join(ignored.primary, '.gitignore'), '.scratch/\n');
  const before = readFileSync(path.join(ignored.primary, '.git', 'info', 'exclude'), 'utf8');
  const dry = run(ignored.primary, ['scratch', '--dry-run'], envFor(ignored));
  assert.equal(dry.json.dryRun, true);
  assert.ok(!existsSync(path.join(ignored.primary, '.scratch')));
  assert.equal(run(ignored.primary, ['scratch'], envFor(ignored)).json.excluded, false);
  assert.equal(readFileSync(path.join(ignored.primary, '.git', 'info', 'exclude'), 'utf8'), before);
});

// ---------------------------------------------------------------------------
// close

test('close refuses the primary checkout, a chat outside Paseo, unsaved files, and unpushed commits', t => {
  const s = setup(t);
  const primary = run(s.primary, ['close'], envFor(s, { PASEO_AGENT_ID: 'a1' }));
  assert.equal(primary.status, 2);
  assert.match(primary.json.error, /main checkout/);
  const wt = s.worktree('dirty');
  const noAgent = run(wt.dir, ['close'], envFor(s));
  assert.equal(noAgent.status, 2);
  assert.match(noAgent.json.error, /not a Paseo agent/);
  writeFileSync(path.join(wt.dir, 'draft.md'), 'wip\n');
  writeFileSync(path.join(wt.dir, 'dirty.md'), 'edited\n');
  const dirty = run(wt.dir, ['close'], envFor(s, { PASEO_AGENT_ID: 'a1' }));
  assert.equal(dirty.status, 2);
  assert.match(dirty.json.error, /unsaved work: dirty\.md, draft\.md\./);
  const unpushed = s.worktree('unpushed', { push: false });
  const refused = run(unpushed.dir, ['close'], envFor(s, { PASEO_AGENT_ID: 'a1' }));
  assert.equal(refused.status, 2);
  assert.match(refused.json.error, /not saved online/);
  const missing = run(s.worktree('unknown').dir, ['close'], envFor(s, { PASEO_AGENT_ID: 'a1' }));
  assert.equal(missing.status, 2);
  assert.match(missing.json.error, /no workspace for this folder/);
  assert.equal(s.calls().filter(call => call[1] === 'workspace' && call[2] === 'archive').length, 0);
});

test('close waits, archives, and deletes a branch merged at its tip, with a scratch file in the way', async t => {
  const s = setup(t);
  const wt = s.worktree('shipped', { push: false });
  mkdirSync(path.join(wt.dir, '.scratch'));
  writeFileSync(path.join(wt.dir, '.scratch', 'brief.md'), 'scratch\n');
  writeFileSync(path.join(s.primary, '.git', 'info', 'exclude'), '.scratch/\n');
  const workspaces = [{ workspaceId: 'ws-1', name: 'Shipped part', isolation: 'worktree', cwd: wt.dir }];
  const env = envFor(s, {
    PASEO_AGENT_ID: 'agent-1', FAKE_WORKSPACES: JSON.stringify(workspaces),
    FAKE_GH_PR: JSON.stringify({ state: 'MERGED', headRefOid: wt.tip }),
  });
  const dry = run(wt.dir, ['close', '--dry-run'], env);
  assert.equal(dry.status, 0, dry.stdout);
  assert.equal(dry.json.job.deleteBranch, true);
  const result = run(wt.dir, ['close'], env);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.json.workspaceId, 'ws-1');
  assert.match(result.json.message, /once this reply ends/);
  await waitFor(() => existsSync(reportFile(s)), 'the close report');
  const paseoCalls = s.calls().filter(call => call[0] === 'paseo' && (call[1] === 'wait' || call[2] === 'archive'));
  assert.deepEqual(paseoCalls.map(call => call.slice(1, 3)), [['wait', 'agent-1'], ['workspace', 'archive']]);
  assert.ok(s.calls().some(call => call[0] === 'paseo' && call.includes('--timeout') && call.includes('1800')));
  assert.ok(!existsSync(wt.dir), 'the worktree, scratch included, is gone');
  assert.equal(tryBranch(s.primary, 'shipped'), false);
  const report = JSON.parse(readFileSync(reportFile(s), 'utf8'));
  assert.deepEqual(report.closed, ['Shipped part']);
  assert.deepEqual(report.branches, ['shipped']);
});

function tryBranch(cwd, branch) {
  try { git(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`); return true; } catch { return false; }
}

test('close keeps a branch whose pull request merged at another commit, and one whose chat never finishes', async t => {
  const s = setup(t);
  const wt = s.worktree('pushed');
  const workspaces = [{ workspaceId: 'ws-2', name: 'Pushed part', isolation: 'worktree', cwd: wt.dir }];
  const env = envFor(s, {
    PASEO_AGENT_ID: 'agent-2', FAKE_WORKSPACES: JSON.stringify(workspaces),
    FAKE_GH_PR: JSON.stringify({ state: 'MERGED', headRefOid: 'someothercommit' }),
  });
  assert.equal(run(wt.dir, ['close'], env).status, 0);
  await waitFor(() => existsSync(reportFile(s)), 'the close report');
  assert.equal(tryBranch(s.primary, 'pushed'), true);
  const report = JSON.parse(readFileSync(reportFile(s), 'utf8'));
  assert.deepEqual(report.closed, ['Pushed part']);
  assert.match(report.notes[0], /kept the branch pushed/);
  rmSync(reportFile(s));

  const busy = s.worktree('busy');
  const busyEnv = envFor(s, {
    PASEO_AGENT_ID: 'agent-3', FAKE_WAIT_STATUS: 'running',
    FAKE_WORKSPACES: JSON.stringify([{ workspaceId: 'ws-3', name: 'Busy part', isolation: 'worktree', cwd: busy.dir }]),
  });
  assert.equal(run(busy.dir, ['close'], busyEnv).status, 0);
  await waitFor(() => existsSync(reportFile(s)), 'the busy report');
  assert.ok(existsSync(busy.dir));
  const line = run(s.primary, ['sweep', '--report'], envFor(s));
  assert.match(line.stdout, /left "Busy part" open: the chat never finished/);
});

const remoteHas = (s, branch) => git(s.primary, 'ls-remote', '--heads', 'origin', branch) !== '';

test('close --discard closes the open pull request, deletes the branch online and here, and resets the tree', async t => {
  const s = setup(t);
  const wt = s.worktree('thrown');
  commit(wt.dir, 'unpublished.md');
  writeFileSync(path.join(wt.dir, 'draft.md'), 'wip\n');
  writeFileSync(path.join(wt.dir, 'thrown.md'), 'edited\n');
  const env = envFor(s, {
    PASEO_AGENT_ID: 'agent-d', FAKE_GH_PR: JSON.stringify({ number: 7, state: 'OPEN', headRefOid: 'x' }),
    FAKE_WORKSPACES: JSON.stringify([{ workspaceId: 'ws-d', name: 'Thrown part', isolation: 'worktree', cwd: wt.dir }]),
  });
  const plain = run(wt.dir, ['close'], env);
  assert.equal(plain.status, 2, 'plain close still refuses unsaved work');
  assert.match(plain.json.error, /unsaved work/);

  const dry = run(wt.dir, ['close', '--discard', '--dry-run'], env);
  assert.equal(dry.status, 0, dry.stdout);
  assert.equal(dry.json.job.discard, true);
  assert.equal(dry.json.job.deleteBranch, true);
  assert.ok(existsSync(path.join(wt.dir, 'draft.md')), 'a dry run touches nothing');
  assert.ok(remoteHas(s, 'thrown'));
  assert.ok(!s.calls().some(call => call[0] === 'gh' && call[2] === 'close'));

  const result = run(wt.dir, ['close', '--discard'], env);
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(result.json.discarded, { pr: 7, remote: true });
  assert.ok(s.calls().some(call => call.join(' ') === 'gh pr close thrown'));
  assert.ok(!remoteHas(s, 'thrown'));
  await waitFor(() => existsSync(reportFile(s)), 'the discard report');
  assert.ok(!existsSync(wt.dir));
  assert.equal(tryBranch(s.primary, 'thrown'), false);
  const report = JSON.parse(readFileSync(reportFile(s), 'utf8'));
  assert.deepEqual(report.closed, ['Thrown part']);
  assert.deepEqual(report.notes, ['threw away the branch thrown']);
});

test('close --discard with no pull request or online branch, and never in the primary checkout', async t => {
  const s = setup(t);
  const primary = run(s.primary, ['close', '--discard'], envFor(s, { PASEO_AGENT_ID: 'a1' }));
  assert.equal(primary.status, 2);
  assert.match(primary.json.error, /main checkout/);
  const wt = s.worktree('local-only', { push: false });
  writeFileSync(path.join(wt.dir, 'local-only.md'), 'edited\n');
  assert.equal(run(wt.dir, ['close', '--discard'], envFor(s)).status, 2, 'outside Paseo');
  const env = envFor(s, {
    PASEO_AGENT_ID: 'agent-e',
    FAKE_WORKSPACES: JSON.stringify([{ workspaceId: 'ws-e', name: 'Local part', isolation: 'worktree', cwd: wt.dir }]),
  });
  const result = run(wt.dir, ['close', '--discard'], env);
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(result.json.discarded, { pr: null, remote: false });
  assert.ok(!s.calls().some(call => call[0] === 'gh' && call[2] === 'close'));
  await waitFor(() => existsSync(reportFile(s)), 'the discard report');
  assert.equal(tryBranch(s.primary, 'local-only'), false);
  assert.equal(git(s.primary, 'status', '--porcelain'), '', 'the primary checkout is untouched');
});

// ---------------------------------------------------------------------------
// sweep

function sweepFixture(t) {
  const s = setup(t);
  const idle = s.worktree('idle');
  mkdirSync(path.join(idle.dir, '.scratch'));
  writeFileSync(path.join(s.primary, '.git', 'info', 'exclude'), '.scratch/\n');
  writeFileSync(path.join(idle.dir, '.scratch', 'note.md'), 'x\n');
  const unpushed = s.worktree('unpushed', { push: false });
  const running = s.worktree('running');
  const current = s.worktree('current');
  const fresh = s.worktree('fresh');
  const other = setup(t).worktree('other');
  const ws = (id, name, dir) => ({ workspaceId: id, name, isolation: 'worktree', cwd: dir });
  const workspaces = [
    ws('ws-idle', 'Idle part', idle.dir), ws('ws-unpushed', 'Weekly plan', unpushed.dir),
    ws('ws-running', 'Running part', running.dir), ws('ws-current', 'This chat', current.dir),
    ws('ws-fresh', 'Fresh part', fresh.dir), ws('ws-other', 'Other repo', other.dir),
    { workspaceId: 'ws-local', name: 'Primary', isolation: 'local', cwd: s.primary },
  ];
  const agents = [
    { id: 'a-idle', status: 'idle', cwd: idle.dir }, { id: 'a-unpushed', status: 'idle', cwd: unpushed.dir },
    { id: 'a-running', status: 'running', cwd: running.dir }, { id: 'a-current', status: 'idle', cwd: current.dir },
    { id: 'a-fresh', status: 'idle', cwd: path.join(fresh.dir, 'app') }, { id: 'a-other', status: 'idle', cwd: other.dir },
  ];
  const inspect = {
    'a-idle': { UpdatedAt: ago(4 * DAY) }, 'a-unpushed': { UpdatedAt: ago(5 * DAY) }, 'a-current': { UpdatedAt: ago(9 * DAY) },
    'a-fresh': { UpdatedAt: ago(HOUR) }, 'a-other': { UpdatedAt: ago(9 * DAY) },
  };
  const env = envFor(s, {
    PASEO_AGENT_ID: 'a-current', FAKE_WORKSPACES: JSON.stringify(workspaces),
    FAKE_AGENTS: JSON.stringify(agents), FAKE_INSPECT: JSON.stringify(inspect),
  });
  return { s, env, idle, unpushed, running, current, fresh, other };
}

test('sweep archives an idle saved workspace and leaves unsaved, running, current, fresh, and other repos\' ones', t => {
  const f = sweepFixture(t);
  const result = run(f.s.primary, ['sweep'], f.env);
  assert.equal(result.status, 0, result.stdout);
  const archives = f.s.calls().filter(call => call[1] === 'workspace' && call[2] === 'archive').map(call => call[3]);
  assert.deepEqual(archives, ['ws-idle']);
  assert.ok(!existsSync(f.idle.dir));
  for (const kept of [f.unpushed, f.running, f.current, f.fresh, f.other]) assert.ok(existsSync(kept.dir));
  assert.deepEqual(result.json.closed, ['Idle part']);
  assert.deepEqual(result.json.left, [{ name: 'Weekly plan', reason: 'it has unsaved work' }]);
  const inspected = f.s.calls().filter(call => call[1] === 'inspect').map(call => call[2]);
  assert.ok(!inspected.includes('a-running') && !inspected.includes('a-current'));

  const line = run(f.s.primary, ['sweep', '--report'], f.env);
  assert.equal(line.stdout, 'Tidy-up: closed 1 workspace ("Idle part"); left "Weekly plan" open: it has unsaved work.\n');
  assert.equal(run(f.s.primary, ['sweep', '--report'], f.env).stdout, '', 'the report prints once');
});

test('sweep runs at most every 6 hours, and never beside another sweep', t => {
  const f = sweepFixture(t);
  assert.equal(run(f.s.primary, ['sweep'], f.env).json.closed.length, 1);
  const soon = run(f.s.primary, ['sweep'], f.env);
  assert.match(soon.json.skipped, /under 6 hours ago/);
  const tidy = path.join(f.s.primary, '.git', 'wong-tidy');
  age(path.join(tidy, 'last-sweep'), 7 * HOUR);
  writeFileSync(path.join(tidy, 'sweep.lock'), '1');
  assert.match(run(f.s.primary, ['sweep'], f.env).json.skipped, /another tidy-up/);
  age(path.join(tidy, 'sweep.lock'), 2 * HOUR);
  const later = run(f.s.primary, ['sweep'], f.env);
  assert.equal(later.json.ok, true);
  assert.equal(later.json.skipped, undefined);
  assert.ok(!existsSync(path.join(tidy, 'sweep.lock')));
});

test('sweep deletes only old wong- temp entries and old primary scratch files', t => {
  const s = setup(t);
  const entry = (name, { ms, child } = {}) => {
    const dir = path.join(s.temp, name);
    mkdirSync(dir);
    writeFileSync(path.join(dir, 'f'), 'data\n');
    age(path.join(dir, 'f'), child ?? ms);
    age(dir, ms);
    return dir;
  };
  const oldWong = entry('wong-memory-repo-x1', { ms: 7 * DAY });
  const busyWong = entry('wong-test-busy', { ms: 2 * DAY, child: HOUR });
  const freshWong = entry('wong-test-fresh', { ms: HOUR });
  const other = entry('tsx-0', { ms: 7 * DAY });
  const loose = path.join(s.temp, 'wong-check.txt');
  writeFileSync(loose, 'x');
  age(loose, 2 * DAY);
  const scratch = path.join(s.primary, '.scratch');
  mkdirSync(path.join(scratch, 'sub'), { recursive: true });
  writeFileSync(path.join(scratch, 'old.md'), 'old\n');
  writeFileSync(path.join(scratch, 'new.md'), 'new\n');
  writeFileSync(path.join(scratch, 'sub', 'old.md'), 'old\n');
  age(path.join(scratch, 'old.md'), 2 * DAY);
  age(path.join(scratch, 'sub', 'old.md'), 2 * DAY);
  age(path.join(scratch, 'sub'), 2 * DAY);
  const env = envFor(s, { TIDY_PASEO_BIN: path.join(s.base, 'no-paseo') });

  const dry = run(s.primary, ['sweep', '--dry-run'], env);
  assert.equal(dry.json.dryRun, true);
  assert.equal(dry.json.deleted, 4);
  assert.ok(existsSync(oldWong) && existsSync(path.join(scratch, 'old.md')));
  assert.ok(!existsSync(path.join(s.primary, '.git', 'wong-tidy', 'last-sweep')));

  const result = run(s.primary, ['sweep'], env);
  assert.equal(result.status, 0, result.stdout);
  assert.ok(!existsSync(oldWong) && !existsSync(loose));
  assert.ok(existsSync(busyWong) && existsSync(freshWong) && existsSync(other));
  assert.ok(!existsSync(path.join(scratch, 'old.md')) && !existsSync(path.join(scratch, 'sub')));
  assert.ok(existsSync(path.join(scratch, 'new.md')));
  assert.equal(result.json.deleted, 4);
  assert.match(result.json.skippedNotes.join('\n'), /Paseo is not installed/);
  assert.match(run(s.primary, ['sweep', '--report'], env).stdout, /deleted 4 old temp or scratch entries, freeing \d+ bytes\./);
});

test('sweep skips the workspaces and says so when Paseo\'s output changed', t => {
  const s = setup(t);
  const env = envFor(s, { FAKE_WORKSPACES: '{"workspaces":[]}' });
  const result = run(s.primary, ['sweep'], env);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.json.skippedNotes[0], /output has changed/);
  assert.match(run(s.primary, ['sweep', '--report'], env).stdout, /skipped closing idle workspaces: Paseo's output has changed/);
});

test('sweep stops a process left in a deleted worktree, and not one in a live folder', { skip: !existsSync('/proc/self/cwd') }, async t => {
  const s = setup(t);
  const live = s.worktree('live');
  const gone = s.worktree('gone');
  const sleeper = cwd => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { cwd, stdio: 'ignore' });
    t.after(() => child.kill('SIGKILL'));
    const exited = new Promise(done => child.on('exit', (code, signal) => done(signal)));
    return { child, exited };
  };
  const orphan = sleeper(path.join(gone.dir));
  const keeper = sleeper(live.dir);
  await waitFor(() => existsSync(`/proc/${orphan.child.pid}/cwd`) && existsSync(`/proc/${keeper.child.pid}/cwd`), 'the sleepers');
  rmSync(gone.dir, { recursive: true, force: true });
  const result = run(s.primary, ['sweep'], envFor(s, { TIDY_PASEO_BIN: path.join(s.base, 'no-paseo') }));
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.json.stopped, 1);
  assert.equal(await orphan.exited, 'SIGTERM');
  assert.equal(keeper.child.exitCode, null);
  assert.equal(keeper.child.signalCode, null);
});

// ---------------------------------------------------------------------------
// The command line

test('usage, unknown commands and flags, and a folder outside git', t => {
  const dir = tmp(t);
  assert.match(run(dir, ['--help'], process.env).stdout, /usage: tidy\.mjs scratch/);
  assert.equal(run(dir, ['tidy-everything'], process.env).status, 2);
  assert.equal(run(dir, ['close', '--report'], process.env).status, 2);
  assert.equal(run(dir, ['sweep', '--discard'], process.env).status, 2);
  const outside = run(dir, ['scratch'], process.env);
  assert.equal(outside.status, 2);
  assert.match(outside.json.error, /Not inside a git checkout/);
  assert.equal(run(dir, ['sweep'], process.env).status, 2);
  assert.equal(run(dir, ['close-child'], { ...process.env, TIDY_CLOSE_JOB: '' }).status, 2);
});
