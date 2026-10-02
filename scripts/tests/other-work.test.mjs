import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  archivedIn, changesIn, foldPullRequests, inside, isBot, isLive, parseWorktrees,
} from '../../.agents/skills/explore/scripts/other-work.mjs';

const cli = new URL('../../.agents/skills/explore/scripts/other-work.mjs', import.meta.url).pathname;

function tmp(t) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'wong-test-other-work-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function write(file, text = `${path.basename(file)}\n`) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function commit(cwd, file, text) {
  write(path.join(cwd, file), text);
  git(cwd, 'add', '--all');
  git(cwd, 'commit', '-q', '-m', file);
}

function repoWithOrigin(base, name, branch = 'main') {
  const origin = path.join(base, `${name}.git`);
  execFileSync('git', ['init', '-q', '--bare', '-b', branch, origin]);
  const primary = path.join(base, name);
  execFileSync('git', ['clone', '-q', origin, primary], { stdio: 'ignore' });
  git(primary, 'config', 'user.email', 'fixture@example.invalid');
  git(primary, 'config', 'user.name', 'Fixture');
  git(primary, 'checkout', '-q', '-b', branch);
  commit(primary, 'README.md');
  git(primary, 'push', '-q', 'origin', `HEAD:${branch}`);
  return primary;
}

// A fake `paseo` answering `workspace ls` and `ls -g` from FAKE_WORKSPACES and FAKE_AGENTS
// (FAKE_PASEO_DOWN makes it act like a stopped daemon), and a fake `gh` answering `pr list`
// with FAKE_GH_PR and `repo view` with FAKE_GH_DEFAULT, failing when either is unset.
function fakeTools(base) {
  const bin = path.join(base, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'paseo'), `#!${process.execPath}
const args = process.argv.slice(2).filter(a => a !== '--json');
if (process.env.FAKE_PASEO_CALLS) require('node:fs').appendFileSync(process.env.FAKE_PASEO_CALLS, JSON.stringify(args) + '\\n');
if (process.env.FAKE_PASEO_DOWN) { console.error('Cannot connect to daemon'); process.exit(1); }
if (args[0] === 'workspace' && args[1] === 'ls') { console.log(process.env.FAKE_WORKSPACES ?? '[]'); process.exit(0); }
if (args[0] === 'ls') { console.log(process.env.FAKE_AGENTS ?? '[]'); process.exit(0); }
console.error('unknown command'); process.exit(1);
`);
  writeFileSync(path.join(bin, 'gh'), `#!${process.execPath}
const args = process.argv.slice(2);
const answer = args[0] === 'pr' ? process.env.FAKE_GH_PR : process.env.FAKE_GH_DEFAULT;
if (!answer) { console.error('HTTP 502: Bad Gateway\\nsecond line'); process.exit(1); }
console.log(answer);
`);
  chmodSync(path.join(bin, 'paseo'), 0o755);
  chmodSync(path.join(bin, 'gh'), 0o755);
  return bin;
}

// This repo: a primary, and worktrees under <base>/wt: `planning` holds an unsaved change folder,
// `published` is clean at main, `shipped` holds a squash-merged branch whose archive is on main,
// `busy` is clean with a running agent, `feature` has a pushed commit and an open pull request,
// and `current` is where the script runs. Another project, `other`, has live work of its own.
function setup(t) {
  const base = tmp(t);
  const primary = repoWithOrigin(base, 'repo');
  const other = repoWithOrigin(base, 'other');
  const wt = name => {
    const dir = path.join(base, 'wt', name);
    git(primary, 'worktree', 'add', '-q', '-b', name, dir);
    return dir;
  };
  const dirs = {
    planning: wt('planning'), published: wt('published'), shipped: wt('shipped'),
    busy: wt('busy'), feature: wt('feature'), current: wt('current'),
  };
  write(path.join(dirs.planning, 'openspec/changes/fix-installer/proposal.md'), '# Fix the installer\n\nWhy.\n');
  write(path.join(dirs.planning, 'openspec/changes/no-proposal/tasks.md'));
  write(path.join(dirs.planning, 'openspec/changes/archive/2026-01-01-old/proposal.md'), '# Old\n');
  commit(dirs.shipped, 'openspec/changes/archive/2026-02-02-shipped/proposal.md', '# Shipped\n');
  commit(primary, 'openspec/changes/archive/2026-02-02-shipped/proposal.md', '# Shipped\n');
  commit(primary, 'later.md');
  git(primary, 'push', '-q', 'origin', 'HEAD:main');
  commit(dirs.feature, 'feature.md');
  git(dirs.feature, 'push', '-q', 'origin', 'feature');
  write(path.join(dirs.current, 'openspec/changes/mine/proposal.md'), '# Mine\n');
  write(path.join(other, 'openspec/changes/elsewhere/proposal.md'), '# Elsewhere\n');
  const bin = fakeTools(base);
  const env = extra => ({
    ...process.env,
    HOME: base,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    OTHER_WORK_PASEO_BIN: path.join(bin, 'paseo'),
    FAKE_WORKSPACES: JSON.stringify([
      { workspaceId: 'w1', project: 'repo', name: 'Fix the installer', isolation: 'worktree', cwd: dirs.planning },
      { workspaceId: 'w2', project: 'repo', name: 'Busy one', isolation: 'worktree', cwd: '~/wt/busy' },
      { workspaceId: 'w3', project: 'other', name: 'Other project', isolation: 'local', cwd: other },
    ]),
    FAKE_AGENTS: JSON.stringify([
      { id: 'a1', name: 'Current task', status: 'running', cwd: '~/wt/busy' },
      { id: 'a2', name: 'Idle task', status: 'idle', cwd: dirs.published },
      { id: 'a3', name: 'Unrelated task', status: 'running', cwd: other },
    ]),
    FAKE_GH_PR: JSON.stringify([
      { number: 1, title: 'Add a login page', headRefName: 'teammate', author: { login: 'pat', is_bot: false }, url: 'u1',
        files: [{ path: 'openspec/changes/login/proposal.md' }, { path: 'openspec/changes/archive/x/a.md' }, { path: 'app/login.ts' }] },
      { number: 2, title: 'Bump vitest', headRefName: 'dependabot/x', author: { login: 'app/dependabot', is_bot: true }, url: 'u2', files: [] },
      { number: 3, title: 'Feature', headRefName: 'feature', author: { login: 'pat', is_bot: false }, url: 'u3', files: [] },
      { number: 4, title: 'This one', headRefName: 'current', author: { login: 'me', is_bot: false }, url: 'u4', files: [] },
    ]),
    ...extra,
  });
  return { base, primary, other, dirs, env };
}

function run(cwd, env, args = []) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env });
  return { status: r.status, stderr: r.stderr, json: r.stdout.startsWith('{') ? JSON.parse(r.stdout) : null, stdout: r.stdout };
}

// ---------------------------------------------------------------------------
// Pure helpers

test('parseWorktrees reads paths and branches, leaving out a bare repo', () => {
  const porcelain = 'worktree /r.git\nbare\n\nworktree /r\nHEAD 1\nbranch refs/heads/main\n\nworktree /w\nHEAD 2\ndetached\n';
  assert.deepEqual(parseWorktrees(porcelain), [{ path: '/r', branch: 'main' }, { path: '/w', branch: null }]);
});

test('isBot catches the flag, an app/ login, and a [bot] login', () => {
  assert.equal(isBot({ login: 'pat', is_bot: false }), false);
  assert.equal(isBot({ login: 'x', is_bot: true }), true);
  assert.equal(isBot({ login: 'app/renovate' }), true);
  assert.equal(isBot({ login: 'github-actions[bot]' }), true);
  assert.equal(isBot(undefined), false);
});

test('changesIn and archivedIn split active and archived change folders', () => {
  const files = ['openspec/changes/a/proposal.md', 'openspec/changes/a/tasks.md', 'openspec/changes/archive/2026-x/p.md', 'app/x.ts'];
  assert.deepEqual(changesIn(files), ['a']);
  assert.deepEqual(archivedIn(files), ['openspec/changes/archive/2026-x']);
});

test('isLive needs unpublished work or a running agent', () => {
  const idle = { busy: false, changes: [], dirtyFiles: [], commitsAhead: 0 };
  assert.equal(isLive(idle), false);
  assert.equal(isLive({ ...idle, busy: true }), true);
  assert.equal(isLive({ ...idle, commitsAhead: 1 }), true);
});

test('foldPullRequests drops bots and the current branch and folds a worktree\'s own', () => {
  const trees = [{ branch: 'feature' }, { branch: null }];
  const prs = [
    { number: 1, title: 't', headRefName: 'feature', author: { login: 'a' }, url: 'u1' },
    { number: 2, title: 't', headRefName: 'x', author: { login: 'b[bot]' }, url: 'u2' },
    { number: 3, title: 't', headRefName: 'mine', author: { login: 'c' }, url: 'u3' },
    { number: 4, title: 't', headRefName: 'y', author: null, url: 'u4' },
  ];
  assert.deepEqual(foldPullRequests(prs, trees, 'mine'), [
    { number: 4, title: 't', branch: 'y', author: null, url: 'u4', changes: [], files: [] },
  ]);
  assert.deepEqual(trees[0].pr, { number: 1, url: 'u1' });
});

test('inside matches a folder and what it holds, never a sibling with the same prefix', () => {
  assert.equal(inside('/a/b/', '/a/b/c'), true);
  assert.equal(inside('/a/b', '/a/bc'), false);
  assert.equal(inside('', '/a'), false);
});

// ---------------------------------------------------------------------------
// The whole script

test('lists only this repo\'s live work, with names, busy state, plans, and pull requests', t => {
  const s = setup(t);
  const { status, json } = run(s.dirs.current, s.env());
  assert.equal(status, 0);
  assert.equal(json.ok, true);
  assert.deepEqual(json.notes, []);
  const byPath = Object.fromEntries(json.workspaces.map(ws => [ws.path, ws]));
  assert.deepEqual(Object.keys(byPath).sort(), [s.dirs.busy, s.dirs.feature, s.dirs.planning, s.dirs.published].sort());
  assert.equal(byPath[s.dirs.planning].name, 'Fix the installer');
  assert.deepEqual(byPath[s.dirs.planning].changes, [
    { name: 'fix-installer', title: 'Fix the installer' }, { name: 'no-proposal', title: null },
  ]);
  assert.deepEqual(byPath[s.dirs.planning].dirtyFiles, ['openspec/']);
  assert.equal(byPath[s.dirs.busy].name, 'Busy one');
  assert.equal(byPath[s.dirs.busy].busy, true);
  assert.equal(byPath[s.dirs.feature].name, 'feature');
  assert.equal(byPath[s.dirs.feature].commitsAhead, 1);
  assert.deepEqual(byPath[s.dirs.feature].changedFiles, ['feature.md']);
  assert.deepEqual(byPath[s.dirs.feature].pr, { number: 3, url: 'u3' });
  assert.deepEqual(json.pullRequests, [{
    number: 1, title: 'Add a login page', branch: 'teammate', author: 'pat', url: 'u1',
    changes: ['login'], files: ['openspec/changes/login/proposal.md', 'openspec/changes/archive/x/a.md', 'app/login.ts'],
  }]);
  assert.doesNotMatch(JSON.stringify(json), /elsewhere|Other project/);
});

test('keeps duplicate and stale chat titles distinct, excluding current, archived, and unrelated sessions', t => {
  const s = setup(t);
  const nested = path.join(s.dirs.planning, 'nested-project');
  execFileSync('git', ['init', '-q', nested]);
  const agents = [
    { id: 'peer-a', name: 'Same title', status: 'idle', cwd: s.dirs.planning },
    { id: 'peer-b', name: 'Same title', status: 'running', cwd: path.join(s.dirs.planning, 'openspec') },
    { id: 'stale', name: 'Old task title', status: 'idle', cwd: s.dirs.planning },
    { id: 'self', name: 'Same title', status: 'running', cwd: s.dirs.current },
    { id: 'archived', name: 'Same title', status: 'running', cwd: s.dirs.planning, archivedAt: '2026-01-01' },
    { id: 'archived-flag', name: 'Same title', status: 'running', cwd: s.dirs.planning, archived: true },
    { id: 'archived-status', name: 'Same title', status: 'archived', cwd: s.dirs.planning },
    { id: 'unrelated', name: 'Same title', status: 'running', cwd: s.other },
    { id: 'nested', name: 'Same title', status: 'running', cwd: nested },
    { id: 'missing', name: 'Same title', status: 'running', cwd: path.join(s.base, 'missing') },
  ];
  const { json } = run(s.dirs.current, s.env({ PASEO_AGENT_ID: 'self', FAKE_AGENTS: JSON.stringify(agents) }));
  const planning = json.workspaces.find(ws => ws.path === s.dirs.planning);
  assert.deepEqual(planning.chats, agents.slice(0, 3).map(({ id, name, status, cwd }) => ({ id, title: name, status, cwd })));
  assert.equal(planning.busy, true);
  assert.equal(planning.changes[0].title, 'Fix the installer');
  assert.ok(!json.workspaces.some(ws => ws.path === s.dirs.current));
  assert.deepEqual(json.workspaces.flatMap(ws => ws.chats.map(chat => chat.id)), ['peer-a', 'peer-b', 'stale']);
});

test('routes discovery to the explicit daemon, with host taking precedence over home', t => {
  const s = setup(t);
  for (const [name, extra, route] of [
    ['home', { PASEO_HOST: '', PASEO_HOME: '/selected-home' }, ['--home', '/selected-home']],
    ['host', { PASEO_HOST: 'socket:/selected.sock', PASEO_HOME: '/selected-home' }, ['--host', 'socket:/selected.sock']],
  ]) {
    const calls = path.join(s.base, name + '-calls');
    const { json } = run(s.dirs.current, s.env({ ...extra, FAKE_PASEO_CALLS: calls }));
    assert.deepEqual(json.notes, []);
    assert.deepEqual(readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse), [
      ['workspace', 'ls', ...route], ['ls', '-g', ...route],
    ]);
  }
});

test('discovers a peer in the current workspace without listing the current chat', t => {
  const s = setup(t);
  const agents = [
    { id: 'self', name: 'My task', status: 'running', cwd: s.dirs.current },
    { id: 'peer', name: 'Peer task', status: 'idle', cwd: s.dirs.current },
  ];
  const { json } = run(s.dirs.current, s.env({ PASEO_AGENT_ID: 'self', FAKE_AGENTS: JSON.stringify(agents) }));
  const current = json.workspaces.find(ws => ws.path === s.dirs.current);
  assert.deepEqual(current.chats, [{ id: 'peer', title: 'Peer task', status: 'idle', cwd: s.dirs.current }]);
  assert.equal(current.busy, false);
});

test('from the primary, the primary itself is left out and the other worktree takes its pull request', t => {
  const s = setup(t);
  const { json } = run(s.primary, s.env());
  const current = json.workspaces.find(ws => ws.path === s.dirs.current);
  assert.ok(!json.workspaces.some(ws => ws.path === s.primary));
  assert.deepEqual(current.pr, { number: 4, url: 'u4' });
  assert.deepEqual(json.pullRequests.map(pr => pr.number), [1]);
});

test('a gh failure leaves a one-line note and still lists the local work', t => {
  const s = setup(t);
  const { status, json } = run(s.dirs.current, s.env({ FAKE_GH_PR: '' }));
  assert.equal(status, 0);
  assert.deepEqual(json.pullRequests, []);
  assert.deepEqual(json.notes, ['Open pull requests were not checked: HTTP 502: Bad Gateway.']);
  assert.equal(json.workspaces.length, 4);
});

test('gh printing something other than a list is a note too', t => {
  const s = setup(t);
  const { json } = run(s.dirs.current, s.env({ FAKE_GH_PR: '{}' }));
  assert.deepEqual(json.notes, ['Open pull requests were not checked: gh printed something other than a list.']);
});

test('works from git alone without Paseo, and notes a stopped or changed Paseo', t => {
  const s = setup(t);
  const missing = run(s.dirs.current, s.env({ OTHER_WORK_PASEO_BIN: path.join(s.base, 'nope') }));
  assert.equal(missing.status, 0);
  assert.match(missing.json.notes[0], /Paseo is not installed/);
  const names = missing.json.workspaces.map(ws => ws.name).sort();
  assert.deepEqual(names, ['feature', 'planning']);
  assert.ok(missing.json.workspaces.every(ws => ws.chats.length === 0));
  const down = run(s.dirs.current, s.env({ FAKE_PASEO_DOWN: '1' }));
  assert.match(down.json.notes[0], /not checked: The Paseo daemon does not answer/);
  const changed = run(s.dirs.current, s.env({ FAKE_AGENTS: '[{"id":"a1"}]' }));
  assert.match(changed.json.notes[0], /Paseo's output has changed/);
});

test('without main, the default branch comes from gh, or a note says commits were not counted', t => {
  const base = tmp(t);
  const primary = repoWithOrigin(base, 'trunkrepo', 'trunk');
  const dir = path.join(base, 'wt');
  git(primary, 'worktree', 'add', '-q', '-b', 'work', dir);
  commit(dir, 'work.md');
  const bin = fakeTools(base);
  const env = extra => ({
    ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, OTHER_WORK_PASEO_BIN: path.join(bin, 'paseo'),
    FAKE_GH_PR: '[]', ...extra,
  });
  const found = run(primary, env({ FAKE_GH_DEFAULT: 'trunk' }));
  assert.equal(found.json.workspaces[0].commitsAhead, 1);
  assert.deepEqual(found.json.notes, []);
  const lost = run(primary, env({ FAKE_GH_DEFAULT: '' }));
  assert.deepEqual(lost.json.workspaces, []);
  assert.match(lost.json.notes[0], /default branch was not found/);
});

test('--help prints usage; an unknown flag or a folder outside git exits 2', t => {
  const s = setup(t);
  const help = run(s.dirs.current, s.env(), ['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /usage/);
  assert.equal(run(s.dirs.current, s.env(), ['--nope']).status, 2);
  const outside = run(path.join(s.base, 'bin'), s.env({ GIT_CEILING_DIRECTORIES: s.base }));
  assert.equal(outside.status, 2);
  assert.equal(outside.json.ok, false);
});
