import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  agentSettings, childEnv, freeName, parseCreated, renameArgs, runArgs, slugOf,
} from '../../.agents/skills/routine/scripts/workspace.mjs';

const cli = new URL('../../.agents/skills/routine/scripts/workspace.mjs', import.meta.url).pathname;
const CALLER = { Provider: 'claude', Model: 'claude-opus-5-5', Thinking: 'high', Mode: 'bypassPermissions' };
const CREATED = 'Created workspace ws-42 - clever-otter (clever-otter)\nsetup needs approval\nTip: pass --workspace <id>';

function tmp(t, prefix) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `wong-test-${prefix}`)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

function commit(cwd, file) {
  writeFileSync(path.join(cwd, file), `${file}\n`);
  git(cwd, 'add', '--all');
  git(cwd, 'commit', '-q', '-m', file);
  return git(cwd, 'rev-parse', 'HEAD');
}

// A bare origin, a primary clone "demo" with a linked worktree on an unpublished
// branch, and a second clone that can publish to origin after the primary cloned.
// `ignore` is the text of a committed .gitignore.
function repo(t, { ignore } = {}) {
  const base = tmp(t, 'workspace-repo-');
  const origin = path.join(base, 'origin.git');
  const seed = path.join(base, 'seed');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  execFileSync('git', ['clone', '-q', origin, seed]);
  git(seed, 'config', 'user.email', 'fixture@example.invalid');
  git(seed, 'config', 'user.name', 'Fixture');
  if (ignore) writeFileSync(path.join(seed, '.gitignore'), ignore);
  commit(seed, 'README.md');
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  const root = path.join(base, 'demo');
  execFileSync('git', ['clone', '-q', origin, root]);
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  const linked = path.join(base, 'linked');
  git(root, 'worktree', 'add', '-q', '-b', 'feature', linked);
  commit(linked, 'unpublished.md');
  const publish = () => { const sha = commit(seed, `later-${Date.now()}.md`); git(seed, 'push', '-q', 'origin', 'HEAD:main'); return sha; };
  return { base, root, linked, publish };
}

const PASTE = 'Read .scratch/brief.md and do what it says.';
const BRIEF = '/plan Thinner specs\n\nThis is one part of a larger request.';

// A computer without Paseo, whatever the one running the tests has: the override names no command.
// `paseo`, `claude`, and `codex` are on PATH all the same, each logging its call, so a test can
// show that opening a folder starts none of them.
function noPaseo(t, base) {
  const dir = tmp(t, 'workspace-agents-');
  const log = path.join(dir, 'started.log');
  for (const name of ['paseo', 'claude', 'codex']) {
    writeFileSync(path.join(dir, name), `#!/bin/sh\necho "${name} $*" >> "${log}"\n`);
    chmodSync(path.join(dir, name), 0o755);
  }
  return {
    started: () => (existsSync(log) ? readFileSync(log, 'utf8') : ''),
    env: {
      PATH: `${dir}${path.delimiter}${process.env.PATH}`, WORKSPACE_PASEO_BIN: path.join(base, 'no-paseo'),
      PASEO_AGENT_ID: '', PASEO_WORKSPACE_ID: '',
    },
  };
}

function markerOf(dir) {
  const gitDir = git(dir, 'rev-parse', '--path-format=absolute', '--git-dir');
  return { gitDir, marker: JSON.parse(readFileSync(path.join(gitDir, 'wong-workspace.json'), 'utf8')) };
}

// A fake `paseo`: `inspect` answers FAKE_INSPECT, `run` prints FAKE_RUN_STDOUT and
// FAKE_RUN_STDERR, and `workspace rename` prints { workspaceId, title } or fails with
// FAKE_RENAME_FAIL. Every call is appended to log.jsonl with the parent-agent variables it saw.
function fakePaseo(t) {
  const dir = tmp(t, 'workspace-paseo-');
  const log = path.join(dir, 'log.jsonl');
  const bin = path.join(dir, 'paseo');
  writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, parent: process.env.PASEO_AGENT_ID ?? null,
  workspace: process.env.PASEO_WORKSPACE_ID ?? null }) + '\\n');
if (process.env.FAKE_PASEO_DOWN) { console.error('Cannot connect to daemon at home /x: ECONNREFUSED'); process.exit(1); }
if (args[0] === 'inspect') { console.log(process.env.FAKE_INSPECT); process.exit(0); }
if (args[0] === 'workspace' && args[1] === 'rename') {
  if (process.env.FAKE_RENAME_FAIL) { console.error(process.env.FAKE_RENAME_FAIL); process.exit(1); }
  console.log(JSON.stringify({ workspaceId: args[2], title: args[3] }));
  process.exit(0);
}
if (process.env.FAKE_RUN_FAIL) { console.error(process.env.FAKE_RUN_FAIL); process.exit(1); }
process.stderr.write(process.env.FAKE_RUN_STDERR ?? '');
console.log(process.env.FAKE_RUN_STDOUT ?? JSON.stringify({ agentId: 'agent-1', status: 'running', provider: 'claude',
  cwd: '/w/clever-otter', title: args[args.indexOf('--title') + 1] }));
`);
  chmodSync(bin, 0o755);
  const calls = () => existsSync(log)
    ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
    : [];
  return {
    calls,
    runs: () => calls().filter(c => c.args[0] === 'run'),
    renames: () => calls().filter(c => c.args[0] === 'workspace' && c.args[1] === 'rename'),
    env: {
      WORKSPACE_PASEO_BIN: bin, PASEO_AGENT_ID: 'caller-1', PASEO_WORKSPACE_ID: 'ws-caller',
      FAKE_INSPECT: JSON.stringify(CALLER), FAKE_RUN_STDERR: CREATED,
    },
  };
}

function brief(t, text = '/plan Thinner specs\n\nThis is one part of a larger request.') {
  const file = path.join(tmp(t, 'workspace-brief-'), 'brief.md');
  writeFileSync(file, text);
  return file;
}

function runCli(cwd, args, env = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: r.status, json: r.stdout.startsWith('{') ? JSON.parse(r.stdout) : r.stdout };
}

const flag = (args, name) => args[args.indexOf(name) + 1];

test('copies the caller\'s settings, or takes the --agent defaults', () => {
  assert.deepEqual(agentSettings(CALLER), { provider: 'claude', model: 'claude-opus-5-5', thinking: 'high', mode: 'bypassPermissions' });
  assert.deepEqual(agentSettings({ Provider: 'codex', Mode: 'full-access' }), { provider: 'codex', model: null, thinking: null, mode: 'full-access' });
  assert.deepEqual(agentSettings(null, 'codex'), { provider: 'codex', model: null, thinking: null, mode: 'full-access' });
  assert.throws(() => agentSettings({ Provider: 'claude' }), e => e.code === 5);
  assert.throws(() => agentSettings(null, undefined), e => e.code === 2 && /--agent/.test(e.message));
});

test('builds branch-off and checkout arguments with the brief last', () => {
  const settings = { provider: 'claude', model: null, thinking: null, mode: 'bypassPermissions' };
  const off = runArgs({ primary: '/p', title: 'B', brief: '/plan B', settings, base: 'origin/main' });
  assert.deepEqual(off, ['run', '-d', '--new-workspace', 'worktree', '--worktree-mode', 'branch-off', '--base', 'origin/main',
    '--cwd', '/p', '--title', 'B', '--provider', 'claude', '--mode', 'bypassPermissions', '/plan B']);
  const co = runArgs({ primary: '/p', title: 'B', brief: '/continue b', settings: { ...settings, model: 'm', thinking: 'x' }, checkout: 'feat/b' });
  assert.deepEqual(co.slice(4, 8), ['--worktree-mode', 'checkout-branch', '--branch', 'feat/b']);
  assert.equal(flag(co, '--model'), 'm');
  assert.equal(flag(co, '--thinking'), 'x');
  assert.ok(!co.includes('--base'));
});

test('builds the rename arguments with the title as one element', () => {
  assert.deepEqual(renameArgs('ws-1', 'Docs, specs, and checks cleanup'),
    ['workspace', 'rename', 'ws-1', 'Docs, specs, and checks cleanup']);
});

test('strips only the variables that make a sub-agent', () => {
  assert.deepEqual(childEnv({ PATH: '/bin', PASEO_AGENT_ID: 'a', PASEO_WORKSPACE_ID: 'w', HOME: '/h' }), { PATH: '/bin', HOME: '/h' });
});

test('reads the workspace line and the setup note from Paseo\'s stderr', () => {
  assert.deepEqual(parseCreated(`Using x\n${CREATED}`), {
    workspaceId: 'ws-42', workspaceName: 'clever-otter', branch: 'clever-otter', setupSkippedReason: 'setup needs approval',
  });
  assert.deepEqual(parseCreated('Created workspace ws-1 - demo\nTip: pass --workspace'), {
    workspaceId: 'ws-1', workspaceName: 'demo', branch: null, setupSkippedReason: null,
  });
  assert.equal(parseCreated('Created workspace'), null);
  assert.equal(parseCreated(''), null);
});

test('opens from a linked worktree: fresh origin/main of the primary, caller settings, no parent', t => {
  const { root, linked, publish } = repo(t);
  const latest = publish();
  const paseo = fakePaseo(t);
  const r = runCli(linked, ['open', '--title', 'Thinner specs', '--brief', brief(t)], paseo.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), latest);
  const [run] = paseo.runs();
  assert.equal(flag(run.args, '--worktree-mode'), 'branch-off');
  assert.equal(flag(run.args, '--base'), 'origin/main');
  assert.equal(flag(run.args, '--cwd'), root);
  assert.equal(flag(run.args, '--model'), 'claude-opus-5-5');
  assert.equal(flag(run.args, '--mode'), 'bypassPermissions');
  assert.equal(run.args.at(-2), '/plan Thinner specs\n\nThis is one part of a larger request.');
  assert.equal(run.parent, null);
  assert.equal(run.workspace, null);
  assert.deepEqual(paseo.calls()[0].args, ['inspect', 'caller-1', '--json']);
  assert.deepEqual(paseo.calls().map(c => c.args.slice(0, 2).join(' ')), ['inspect caller-1', 'run -d', 'workspace rename']);
  const [rename] = paseo.renames();
  assert.deepEqual(rename.args, ['workspace', 'rename', 'ws-42', 'Thinner specs', '--json']);
  assert.equal(rename.parent, null);
  assert.equal(rename.workspace, null);
  assert.equal(r.json.agentId, 'agent-1');
  assert.equal(r.json.workspaceId, 'ws-42');
  assert.equal(r.json.workspaceName, 'Thinner specs');
  assert.equal(r.json.branch, 'clever-otter');
  assert.equal(r.json.base, 'origin/main');
  assert.equal(r.json.setupSkippedReason, 'setup needs approval');
  assert.equal(r.json.warning, undefined);
});

test('checkout mode opens the named branch and fetches nothing', t => {
  const { root, linked } = repo(t);
  const before = git(root, 'rev-parse', 'refs/remotes/origin/main');
  const paseo = fakePaseo(t);
  const r = runCli(linked, ['open', '--title', 'add-auth', '--brief', brief(t, '/continue add-auth'), '--checkout', 'feat/auth'], paseo.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  const [run] = paseo.runs();
  assert.equal(flag(run.args, '--worktree-mode'), 'checkout-branch');
  assert.equal(flag(run.args, '--branch'), 'feat/auth');
  assert.equal(r.json.checkout, 'feat/auth');
  assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), before);
  const [rename] = paseo.renames();
  assert.deepEqual(rename.args, ['workspace', 'rename', 'ws-42', 'add-auth', '--json']);
  assert.equal(rename.parent, null);
  assert.equal(rename.workspace, null);
  assert.equal(r.json.workspaceName, 'add-auth');
  assert.equal(r.json.warning, undefined);
});

test('outside a Paseo agent it needs --agent and uses Paseo\'s default model', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const env = { ...paseo.env, PASEO_AGENT_ID: '' };
  assert.equal(runCli(root, ['open', '--title', 'B', '--brief', brief(t)], env).status, 2);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t), '--agent', 'codex'], env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  const [run] = paseo.runs();
  assert.equal(flag(run.args, '--provider'), 'codex');
  assert.equal(flag(run.args, '--mode'), 'full-access');
  assert.ok(!run.args.includes('--model'));
  assert.ok(!paseo.calls().some(c => c.args[0] === 'inspect'));
});

test('a missing workspace line still reports the opened agent, with a warning', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], { ...paseo.env, FAKE_RUN_STDERR: '' });
  assert.equal(r.status, 0);
  assert.equal(r.json.agentId, 'agent-1');
  assert.equal(r.json.workspaceId, null);
  assert.equal(r.json.workspaceName, null);
  assert.match(r.json.warning, /workspace line/);
  assert.match(r.json.warning, /kept Paseo's name/);
  assert.equal(paseo.renames().length, 0);
});

test('a refused rename still reports the opened workspace, with Paseo\'s name and a warning', t => {
  const { root } = repo(t);
  const refusals = {
    'Title cannot be empty': /paseo workspace rename failed: Title cannot be empty/,
    'Cannot connect to daemon at home /x: ECONNREFUSED': /daemon does not answer/,
  };
  for (const [refusal, reason] of Object.entries(refusals)) {
    const paseo = fakePaseo(t);
    const r = runCli(root, ['open', '--title', 'Release collisions', '--brief', brief(t)], { ...paseo.env, FAKE_RENAME_FAIL: refusal });
    assert.equal(r.status, 0, JSON.stringify(r.json));
    assert.equal(paseo.renames().length, 1);
    assert.equal(r.json.agentId, 'agent-1');
    assert.equal(r.json.title, 'Release collisions');
    assert.equal(r.json.workspaceId, 'ws-42');
    assert.equal(r.json.workspaceName, 'clever-otter');
    assert.equal(r.json.branch, 'clever-otter');
    assert.equal(r.json.setupSkippedReason, 'setup needs approval');
    assert.match(r.json.warning, /kept Paseo's name, "clever-otter"/);
    assert.match(r.json.warning, reason);
  }
});

test('a failed fetch still opens, from the last fetched copy', t => {
  const { root } = repo(t);
  git(root, 'remote', 'set-url', 'origin', path.join(root, 'gone.git'));
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], paseo.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.equal(r.json.base, 'origin/main');
  assert.match(r.json.warning, /Could not fetch origin\/main/);
  const both = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], { ...paseo.env, FAKE_RENAME_FAIL: 'no such workspace' });
  assert.equal(both.status, 0, JSON.stringify(both.json));
  assert.equal(typeof both.json.warning, 'string');
  assert.match(both.json.warning, /Could not fetch origin\/main[^]*kept Paseo's name/);
});

test('dry run prints the command and runs nothing', t => {
  const { root, publish } = repo(t);
  const before = git(root, 'rev-parse', 'refs/remotes/origin/main');
  publish();
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t), '--dry-run'], paseo.env);
  assert.equal(r.status, 0);
  assert.equal(r.json.dryRun, true);
  assert.equal(r.json.command.at(-1), '--json');
  assert.deepEqual(r.json.rename, ['paseo', 'workspace', 'rename', '<workspaceId>', 'B', '--json']);
  assert.deepEqual(r.json.removedEnv, ['PASEO_AGENT_ID', 'PASEO_WORKSPACE_ID']);
  assert.equal(paseo.runs().length, 0);
  assert.equal(paseo.renames().length, 0);
  assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), before);
});

test('bad input is exit 2 and opens nothing', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const cases = [
    ['open', '--brief', brief(t)],
    ['open', '--title', 'B'],
    ['open', '--title', 'B', '--brief', brief(t, '  \n')],
    ['open', '--title', 'B', '--brief', brief(t, '--mode plan')],
    ['open', '--title', 'B', '--brief', '/no/such/file'],
    ['open', '--title', 'B', '--nope', 'x'],
    ['open', '--title'],
    ['close'],
  ];
  for (const args of cases) assert.equal(runCli(root, args, paseo.env).status, 2, args.join(' '));
  assert.equal(paseo.runs().length, 0);
  assert.match(runCli(root, ['--help']).json, /usage: workspace\.mjs open/);
});

test('Paseo refusing the run is exit 2 with its message', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t), '--checkout', 'feature'],
    { ...paseo.env, FAKE_RUN_FAIL: "fatal: 'feature' is already checked out" });
  assert.equal(r.status, 2);
  assert.match(r.json.error, /paseo run -d failed: fatal: 'feature' is already checked out/);
  assert.equal(r.json.fallback, undefined);
});

test('no paseo on PATH opens a ready folder, with no Paseo steps', t => {
  const { base, root } = repo(t);
  const bare = tmp(t, 'workspace-path-');
  symlinkSync(execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim(), path.join(bare, 'git'));
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], { PATH: bare, WORKSPACE_PASEO_BIN: '' });
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.equal(r.json.host, 'plain');
  assert.equal(r.json.path, path.join(base, 'demo-workspaces', 'b'));
  assert.equal(r.json.fallback, undefined);
  assert.ok(existsSync(path.join(r.json.path, 'README.md')));
});

test('a daemon that does not answer is exit 4 and opens nothing', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], { ...paseo.env, FAKE_PASEO_DOWN: '1' });
  assert.equal(r.status, 4);
  assert.match(r.json.fallback.app, /Agent: the same as this chat/);
  assert.equal(paseo.runs().length, 0);
});

test('a run result with no agent id is exit 5', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], { ...paseo.env, FAKE_RUN_STDOUT: '{"id":"x"}' });
  assert.equal(r.status, 5);
  assert.match(r.json.error, /run output has changed/);
  assert.match(r.json.fallback.app, /New branch from: origin\/main/);
});

test('a repo with no main asks gh for the default branch', t => {
  const base = tmp(t, 'workspace-trunk-');
  git(base, 'init', '-q', '-b', 'trunk');
  git(base, 'config', 'user.email', 'fixture@example.invalid');
  git(base, 'config', 'user.name', 'Fixture');
  commit(base, 'README.md');
  const bin = tmp(t, 'workspace-gh-');
  writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\necho trunk\n');
  chmodSync(path.join(bin, 'gh'), 0o755);
  const paseo = fakePaseo(t);
  const env = { ...paseo.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const r = runCli(base, ['open', '--title', 'B', '--brief', brief(t)], env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.equal(r.json.base, 'trunk');
  assert.match(r.json.warning, /Could not fetch origin\/trunk/);
  writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\nexit 1\n');
  assert.equal(runCli(base, ['open', '--title', 'B', '--brief', brief(t)], env).status, 2);
});

// ---------------------------------------------------------------------------
// Without Paseo: a ready folder the person opens

test('a title becomes a folder and branch name, and a taken one counts up', () => {
  assert.equal(slugOf('Thinner specs'), 'thinner-specs');
  assert.equal(slugOf('  Docs, specs & checks: cleanup!  '), 'docs-specs-checks-cleanup');
  assert.equal(slugOf('feat/auth'), 'feat-auth');
  assert.equal(slugOf('???'), 'workspace');
  const long = slugOf('a very long title that goes on and on and on past the limit');
  assert.ok(long.length <= 40 && !long.endsWith('-'), long);
  assert.equal(freeName('b', () => false), 'b');
  assert.equal(freeName('b', name => ['b', 'b-2'].includes(name)), 'b-3');
});

test('without Paseo, open makes a marked worktree from the fetched default branch and starts no agent', t => {
  const { base, root, linked, publish } = repo(t, { ignore: '.env\n' });
  writeFileSync(path.join(root, '.env'), 'API_KEY=fixture-value\n');
  const latest = publish();
  const host = noPaseo(t, base);
  const before = Date.now();
  const r = runCli(linked, ['open', '--title', 'Thinner specs', '--brief', brief(t)], host.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  const dir = path.join(base, 'demo-workspaces', 'thinner-specs');
  assert.deepEqual(r.json, {
    ok: true, host: 'plain', path: dir, branch: 'thinner-specs', base: 'origin/main', title: 'Thinner specs', paste: PASTE,
  });
  assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), latest, 'the default branch was fetched');
  assert.equal(git(dir, 'rev-parse', 'HEAD'), latest, 'it starts from origin, not from the caller\'s branch');
  assert.equal(git(dir, 'symbolic-ref', '--short', 'HEAD'), 'thinner-specs');
  assert.ok(!existsSync(path.join(dir, 'unpublished.md')));
  assert.equal(readFileSync(path.join(dir, '.env'), 'utf8'), 'API_KEY=fixture-value\n', 'the secrets were seeded');
  assert.equal(readFileSync(path.join(dir, '.scratch', 'brief.md'), 'utf8'), `${BRIEF}\n`);
  const { gitDir, marker } = markerOf(dir);
  assert.deepEqual(Object.keys(marker), ['title', 'madeAt', 'closedAt']);
  assert.equal(marker.title, 'Thinner specs');
  assert.equal(marker.closedAt, null);
  assert.ok(Date.parse(marker.madeAt) >= before - 1000 && Date.parse(marker.madeAt) <= Date.now() + 1000, marker.madeAt);
  assert.notEqual(gitDir, git(root, 'rev-parse', '--path-format=absolute', '--git-dir'), 'the worktree\'s own git directory');
  assert.ok(existsSync(path.join(gitDir, 'wongstack-secrets-base.json')), 'beside the secrets baseline');
  assert.ok(!existsSync(path.join(dir, 'wong-workspace.json')));
  assert.equal(git(dir, 'status', '--porcelain'), '', 'the brief, the secrets, and the marker stay out of git');
  assert.equal(git(root, 'status', '--porcelain'), '', 'the folder sits outside the primary checkout');
  assert.equal(host.started(), '', 'no agent and no Paseo was started');
});

test('without Paseo, a taken folder or branch name gets -2, then -3', t => {
  const { base, root } = repo(t);
  const host = noPaseo(t, base);
  const open = () => runCli(root, ['open', '--title', 'Thinner specs', '--brief', brief(t)], host.env);
  const parent = path.join(base, 'demo-workspaces');
  assert.equal(open().json.path, path.join(parent, 'thinner-specs'));
  const second = open();
  assert.equal(second.status, 0, JSON.stringify(second.json));
  assert.equal(second.json.path, path.join(parent, 'thinner-specs-2'));
  assert.equal(second.json.branch, 'thinner-specs-2');
  assert.equal(git(second.json.path, 'symbolic-ref', '--short', 'HEAD'), 'thinner-specs-2');
  git(root, 'branch', 'thinner-specs-3');
  const fourth = open();
  assert.equal(fourth.json.path, path.join(parent, 'thinner-specs-4'), 'a branch of that name is taken too');
  assert.equal(markerOf(fourth.json.path).marker.title, 'Thinner specs');
});

test('without Paseo, --checkout opens the named branch and fetches nothing', t => {
  const { base, root, publish } = repo(t);
  const host = noPaseo(t, base);
  git(root, 'branch', 'feat/auth');
  const before = git(root, 'rev-parse', 'refs/remotes/origin/main');
  publish();
  const r = runCli(root, ['open', '--title', 'add-auth', '--brief', brief(t, '/continue add-auth'), '--checkout', 'feat/auth'], host.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  const dir = path.join(base, 'demo-workspaces', 'add-auth');
  assert.deepEqual(r.json, { ok: true, host: 'plain', path: dir, branch: 'feat/auth', checkout: 'feat/auth', title: 'add-auth', paste: PASTE });
  assert.equal(git(dir, 'symbolic-ref', '--short', 'HEAD'), 'feat/auth');
  assert.equal(readFileSync(path.join(dir, '.scratch', 'brief.md'), 'utf8'), '/continue add-auth\n');
  assert.equal(markerOf(dir).marker.title, 'add-auth');
  assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), before);

  const taken = runCli(root, ['open', '--title', 'Busy branch', '--brief', brief(t), '--checkout', 'feature'], host.env);
  assert.equal(taken.status, 2, 'the linked worktree already has that branch');
  assert.match(taken.json.error, /git worktree add failed: /);
  assert.ok(!existsSync(path.join(base, 'demo-workspaces', 'busy-branch')));
});

test('without Paseo, secrets git does not ignore are not copied, and the brief is still kept out of git', t => {
  const { base, root } = repo(t);
  writeFileSync(path.join(root, '.env'), 'API_KEY=fixture-value\n');
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], noPaseo(t, base).env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.match(r.json.warning, /secrets files were not copied into the folder: \.env\./);
  assert.doesNotMatch(JSON.stringify(r.json), /fixture-value/);
  assert.ok(!existsSync(path.join(r.json.path, '.env')));
  assert.ok(existsSync(path.join(r.json.path, '.scratch', 'brief.md')));
  assert.equal(git(r.json.path, 'status', '--porcelain'), '');
});

test('without Paseo, a dry run names the folder and makes nothing', t => {
  const { base, root, publish } = repo(t);
  const host = noPaseo(t, base);
  const before = git(root, 'rev-parse', 'refs/remotes/origin/main');
  publish();
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t), '--dry-run'], host.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.deepEqual(r.json, {
    ok: true, dryRun: true, host: 'plain', path: path.join(base, 'demo-workspaces', 'b'), branch: 'b', base: 'origin/main', title: 'B', paste: PASTE,
  });
  assert.ok(!existsSync(path.join(base, 'demo-workspaces')));
  assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), before);
  assert.equal(git(root, 'branch', '--list', 'b'), '');
  for (const args of [['open', '--brief', brief(t)], ['open', '--title', 'B'], ['open', '--title', 'B', '--nope', 'x']]) {
    assert.equal(runCli(root, args, host.env).status, 2, args.join(' '));
  }
});

test('a Paseo that does not answer never falls back to a folder', t => {
  const { base, root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, ['open', '--title', 'B', '--brief', brief(t)], { ...paseo.env, FAKE_PASEO_DOWN: '1' });
  assert.equal(r.status, 4);
  assert.match(r.json.error, /daemon does not answer/);
  assert.equal(r.json.host, undefined);
  assert.ok(!existsSync(path.join(base, 'demo-workspaces')));
});
