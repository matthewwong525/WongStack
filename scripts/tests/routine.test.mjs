import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync,
  symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildCreateRequest, defaultName, invalidCronField, matchRoutine, modeFor,
  primaryFromPorcelain,
} from '../../.agents/skills/routine/scripts/routine.mjs';

const cli = new URL('../../.agents/skills/routine/scripts/routine.mjs', import.meta.url).pathname;
const CREATE = ['create', '--cron', '0 9 * * 1', '--prompt', '/improve', '--agent', 'claude'];

function tmp(t, prefix) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), prefix)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

// A repo named "demo" with one commit and one linked worktree.
function repo(t) {
  const base = tmp(t, 'routine-repo-');
  const root = path.join(base, 'demo');
  mkdirSync(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  writeFileSync(path.join(root, 'README.md'), 'demo\n');
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', 'init');
  const linked = path.join(base, 'linked');
  git(root, 'worktree', 'add', '-q', '-b', 'feature', linked);
  return { root, linked };
}

// A fake @getpaseo/cli package: bin/paseo answers the public commands from a
// state file, and dist/ holds the two private modules routine.mjs imports.
// Every call is appended to log.jsonl.
function fakePaseo(t, { schedules = [], client = true } = {}) {
  const pkg = tmp(t, 'routine-paseo-');
  const state = path.join(pkg, 'state.json');
  const log = path.join(pkg, 'log.jsonl');
  writeFileSync(state, JSON.stringify(schedules));
  mkdirSync(path.join(pkg, 'bin'));
  const bin = path.join(pkg, 'bin', 'paseo');
  writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2).filter(a => a !== '--json');
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ cli: args }) + '\\n');
if (process.env.FAKE_PASEO_DOWN) { console.error('Cannot connect to daemon at home /x: ECONNREFUSED'); process.exit(1); }
const all = JSON.parse(fs.readFileSync(${JSON.stringify(state)}, 'utf8'));
const [, cmd, id] = args;
const one = all.find(s => s.id === id);
if (cmd === 'ls') console.log(JSON.stringify(all.map(({ id, name, status }) => ({ id, name, status }))));
else if (cmd === 'inspect') console.log(JSON.stringify(one));
else console.log(JSON.stringify({ id, done: cmd }));
`);
  chmodSync(bin, 0o755);
  if (client) {
    mkdirSync(path.join(pkg, 'dist', 'utils'), { recursive: true });
    mkdirSync(path.join(pkg, 'dist', 'commands', 'schedule'), { recursive: true });
    writeFileSync(path.join(pkg, 'dist', 'utils', 'daemon-target.js'),
      "export function selectDaemonTarget(o) { return { kind: 'instance', home: '/fake', options: o }; }\n");
    writeFileSync(path.join(pkg, 'dist', 'commands', 'schedule', 'shared.js'), `import fs from 'node:fs';
export async function connectScheduleClient(target) {
  if (process.env.FAKE_PASEO_DOWN) throw { code: 'DAEMON_NOT_RUNNING', message: 'Cannot connect to daemon' };
  return { host: 'fake', client: {
    async scheduleCreate(input) {
      fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ create: input, target }) + '\\n');
      return { schedule: { id: 'abc12345', name: input.name, prompt: input.prompt, cadence: input.cadence,
        status: 'active', nextRunAt: '2026-09-28T13:00:00.000Z', runs: [], target: input.target } };
    },
    async close() {},
  } };
}
`);
  }
  const calls = () => existsSync(log)
    ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
    : [];
  return { bin, calls, creates: () => calls().filter(c => c.create), env: { ROUTINE_PASEO_BIN: bin } };
}

function runCli(cwd, args, env = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...env },
  });
  return { status: r.status, json: JSON.parse(r.stdout) };
}

const schedule = (id, name, cwd) => ({
  id, name, prompt: '/improve', status: 'active', nextRunAt: null,
  cadence: { type: 'cron', expression: '0 9 * * 1', timezone: 'UTC' },
  target: { type: 'new-agent', config: { provider: 'claude', cwd, isolation: 'worktree' } },
  runs: [],
});

test('checks each cron field and names the first bad one', () => {
  assert.equal(invalidCronField('0 9 * * 1-5'), null);
  assert.equal(invalidCronField('*/15 0-23/2 1,15 1-12 0,7'), null);
  assert.equal(invalidCronField('60 9 * * *'), 'minute');
  assert.equal(invalidCronField('0 24 * * *'), 'hour');
  assert.equal(invalidCronField('0 9 0 * *'), 'day of month');
  assert.equal(invalidCronField('0 9 * 13 *'), 'month');
  assert.equal(invalidCronField('0 9 * * 8'), 'day of week');
  assert.equal(invalidCronField('0 9 * * 5-1'), 'day of week');
  assert.equal(invalidCronField('*/0 * * * *'), 'minute');
  assert.match(invalidCronField('0 9 * *'), /field count/);
  assert.match(invalidCronField('@daily'), /field count/);
});

test('reads the primary worktree from porcelain output', () => {
  const porcelain = 'worktree /srv/app\nHEAD abc\nbranch refs/heads/main\n\nworktree /srv/wt/x\nHEAD abc\n';
  assert.equal(primaryFromPorcelain(porcelain), '/srv/app');
  assert.throws(() => primaryFromPorcelain(''), /git repository/);
});

test('maps each agent to its full-permission mode and refuses a guess', () => {
  assert.equal(modeFor('claude'), 'bypassPermissions');
  assert.equal(modeFor('codex'), 'full-access');
  assert.throws(() => modeFor('opencode'), /--agent claude or --agent codex/);
  assert.throws(() => modeFor(undefined), /Unknown agent/);
});

test('names a routine from its prompt and the repo folder', () => {
  assert.equal(defaultName('/improve', '/root/MyApp'), 'improve MyApp');
  assert.equal(defaultName('/verify the staging app', '/x/demo'), 'verify demo');
  assert.equal(defaultName('check the nightly import logs', '/x/demo'), 'check the nightly import demo');
});

test('matches a routine by id, then name, then unique id prefix', () => {
  const list = [{ id: 'aaa111', name: 'improve demo' }, { id: 'aab222', name: 'Nightly' }, { id: 'ccc333', name: 'nightly' }];
  assert.equal(matchRoutine(list, 'aaa111').id, 'aaa111');
  assert.equal(matchRoutine(list, 'IMPROVE DEMO').id, 'aaa111');
  assert.equal(matchRoutine(list, 'cc').id, 'ccc333');
  assert.throws(() => matchRoutine(list, 'aa'), e => e.code === 2 && e.extra.matches.length === 2);
  assert.throws(() => matchRoutine(list, 'nightly'), e => e.code === 2 && e.extra.matches.length === 2);
  assert.throws(() => matchRoutine(list, 'zzz'), e => e.code === 2 && /No routine/.test(e.message));
});

test('builds a worktree-isolated, kept, verbatim create request', () => {
  const request = buildCreateRequest({
    prompt: '  /improve  ', cron: '0  9 * * 1-5', timezone: 'America/Toronto',
    name: 'improve demo', agent: 'codex', model: 'gpt-5.6', cwd: '/x/demo',
  });
  assert.deepEqual(request, {
    prompt: '/improve',
    name: 'improve demo',
    runOnCreate: false,
    cadence: { type: 'cron', expression: '0 9 * * 1-5', timezone: 'America/Toronto' },
    target: { type: 'new-agent', config: {
      provider: 'codex', cwd: '/x/demo', modeId: 'full-access', isolation: 'worktree',
      archiveOnFinish: false, title: 'improve demo', model: 'gpt-5.6',
    } },
  });
  assert.throws(() => buildCreateRequest({ prompt: '/x', cron: '0 9 * * 9', agent: 'claude' }),
    e => e.code === 2 && e.extra.field === 'day of week');
  assert.throws(() => buildCreateRequest({ prompt: ' ', cron: '0 9 * * 1', agent: 'claude' }), /prompt is empty/);
});

test('create from a linked worktree sends one request based on the primary worktree', t => {
  const { root, linked } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(linked, ['create', '--cron', '0 9 * * 1-5', '--prompt', '/improve', '--agent', 'claude',
    '--timezone', 'UTC'], paseo.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.equal(r.json.routine.nextRunAt, '2026-09-28T13:00:00.000Z');
  const creates = paseo.creates();
  assert.equal(creates.length, 1);
  const { config } = creates[0].create.target;
  assert.equal(config.cwd, root);
  assert.equal(config.isolation, 'worktree');
  assert.equal(config.modeId, 'bypassPermissions');
  assert.equal(config.archiveOnFinish, false);
  assert.equal(creates[0].create.name, 'improve demo');
  assert.equal(creates[0].target.kind, 'instance');
});

test('dry run sends nothing to Paseo', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, [...CREATE, '--dry-run'], paseo.env);
  assert.equal(r.status, 0);
  assert.equal(r.json.dryRun, true);
  assert.equal(r.json.request.target.config.isolation, 'worktree');
  assert.deepEqual(paseo.calls(), []);
});

test('an invalid cron creates nothing and names the field', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const r = runCli(root, ['create', '--cron', '0 25 * * *', '--prompt', '/improve', '--agent', 'claude'],
    paseo.env);
  assert.equal(r.status, 2);
  assert.equal(r.json.field, 'hour');
  assert.deepEqual(paseo.calls(), []);
});

test('a duplicate name creates nothing', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t, { schedules: [schedule('old1', 'improve demo', '/elsewhere')] });
  const r = runCli(root, CREATE, paseo.env);
  assert.equal(r.status, 2);
  assert.match(r.json.error, /already exists/);
  assert.equal(paseo.creates().length, 0);
});

test('no paseo on PATH is exit 3 with the command to run later', t => {
  const { root } = repo(t);
  const bare = tmp(t, 'routine-path-');
  symlinkSync(execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim(), path.join(bare, 'git'));
  const r = runCli(root, ['create', '--cron', '0 9 * * 1', '--prompt', "/improve it's fine", '--agent', 'claude',
    '--timezone', 'UTC'], { PATH: bare, ROUTINE_PASEO_BIN: '' });
  assert.equal(r.status, 3);
  assert.match(r.json.error, /not installed/);
  assert.match(r.json.fallback.retry, /routine\.mjs" create --cron '0 9 \* \* 1'/);
  assert.match(r.json.fallback.retry, /--prompt '\/improve it'\\''s fine'/);
  assert.match(r.json.fallback.app, /Isolation: worktree/);
});

test('a daemon that does not answer is exit 4 and creates nothing', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t);
  const env = { ...paseo.env, FAKE_PASEO_DOWN: '1' };
  const created = runCli(root, CREATE, env);
  assert.equal(created.status, 4);
  assert.ok(created.json.fallback.retry);
  assert.equal(paseo.creates().length, 0);
  assert.equal(runCli(root, ['ls'], env).status, 4);
});

test('a missing client module is exit 5 with app steps, never a local schedule', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t, { client: false });
  const r = runCli(root, CREATE, paseo.env);
  assert.equal(r.status, 5);
  assert.match(r.json.fallback.app, /Paseo app/);
  assert.equal(paseo.calls().filter(c => c.create || c.cli?.[1] === 'create').length, 0);
});

test('ls shows only this repo and actions reach only its routines', t => {
  const { root, linked } = repo(t);
  const paseo = fakePaseo(t, { schedules: [
    schedule('mine0001', 'improve demo', root),
    schedule('other001', 'improve other', '/somewhere/else'),
  ] });
  const env = paseo.env;
  const list = runCli(linked, ['ls'], env);
  assert.equal(list.status, 0);
  assert.deepEqual(list.json.routines.map(r => r.id), ['mine0001']);

  assert.equal(runCli(root, ['pause', 'improve demo'], env).status, 0);
  assert.equal(runCli(root, ['run', 'mine'], env).status, 0);
  assert.equal(runCli(root, ['delete', 'improve other'], env).status, 2);
  const actions = paseo.calls().map(c => c.cli).filter(a => !['ls', 'inspect'].includes(a[1]));
  assert.deepEqual(actions, [['schedule', 'pause', 'mine0001'], ['schedule', 'run-once', 'mine0001']]);
});

test('change keeps the cron when only the timezone changes', t => {
  const { root } = repo(t);
  const paseo = fakePaseo(t, { schedules: [schedule('mine0001', 'improve demo', root)] });
  const r = runCli(root, ['change', 'improve demo', '--timezone', 'America/Toronto'], paseo.env);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  const update = paseo.calls().map(c => c.cli).find(a => a[1] === 'update');
  assert.deepEqual(update, ['schedule', 'update', 'mine0001', '--cron', '0 9 * * 1', '--timezone', 'America/Toronto']);
  assert.equal(runCli(root, ['change', 'improve demo'], paseo.env).status, 2);
});
