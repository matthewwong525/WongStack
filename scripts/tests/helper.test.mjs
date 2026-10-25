// The background helper's installer and its records: a fake computer stands in for systemd, launchd and the clock.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { helper, launchdPlist, nodeAdvice, systemdUnit } from '../../.agents/skills/hand-over/scripts/helper.mjs';
import { computerId, readApps, rememberApp } from '../../.agents/skills/hand-over/scripts/lib/computer.mjs';
import { LOG_LIMIT, logAction } from '../../.agents/skills/hand-over/scripts/lib/helper-log.mjs';

const HELPER = fileURLToPath(new URL('../../.agents/skills/hand-over/scripts/helper.mjs', import.meta.url));
const REQUIRED_TOOLS = fileURLToPath(new URL('../../wiki/development/required-tools.md', import.meta.url));
const SCRIPT = '.agents/skills/hand-over/scripts/reply-link.mjs';
const TABLE = '| Node line | Minimum |\n|---|---|\n| 22 | 22.22.2 |\n| 24 | 24.15.0 |\n| 26 | 26.0.0 |\n';

function temp(t, prefix) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A main checkout whose helper script declares `protocol`, and a worktree of it holding `worktree`'s.
function checkouts(t, { protocol = 8, worktree = protocol } = {}) {
  const base = temp(t, 'wong-test-helper-repo-');
  const main = join(base, 'main');
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' });
  mkdirSync(join(main, '.agents/skills/hand-over/scripts'), { recursive: true });
  writeFileSync(join(main, SCRIPT), `export const PROTOCOL = ${protocol};\n`);
  git(base, 'init', '-q', main);
  git(main, 'add', '.');
  git(main, 'commit', '-qm', 'start');
  git(main, 'worktree', 'add', '-q', join(base, 'wt'));
  writeFileSync(join(base, 'wt', SCRIPT), `export const PROTOCOL = ${worktree};\n`);
  return { main, worktree: join(base, 'wt') };
}

function computer(t, overrides = {}) {
  const home = temp(t, 'wong-test-helper-home-');
  const tables = join(home, 'required-tools.md');
  writeFileSync(tables, TABLE);
  const lines = [], ran = [], spawned = [];
  return { env: { HOME: home, PATH: '/usr/bin' }, platform: 'linux', isRoot: false, user: 'ana', uid: 501, execPath: '/usr/bin/node',
    nodeVersion: '24.15.0', script: join(checkouts(t).worktree, SCRIPT), requiredTools: tables, lines, ran, spawned,
    run: (command, args) => { ran.push([command, ...args].join(' ')); return 0; },
    spawn: (command, args) => { spawned.push([command, ...args].join(' ')); }, out: line => lines.push(line), ...overrides };
}

const printed = world => world.lines.join('\n');
const helperDir = world => join(world.env.HOME, '.wong-stack', 'helper');

test('a dry run prints the systemd user unit and its commands, and changes nothing', t => {
  const world = computer(t);
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.match(out, new RegExp(`FILE=${world.env.HOME}/.config/systemd/user/wongstack-helper.service`));
  assert.match(out, /Restart=always/);
  assert.match(out, /WantedBy=default.target/);
  assert.doesNotMatch(out, /User=root/);
  assert.match(out, /COMMAND=loginctl enable-linger ana/);
  assert.match(out, /COMMAND=systemctl --user enable --now wongstack-helper.service/);
  assert.deepEqual(world.ran, []);
  assert.equal(existsSync(helperDir(world)), false);
});

test('as root, the unit is a system service that runs as root, with no linger', t => {
  const world = computer(t, { isRoot: true });
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.match(out, /FILE=\/etc\/systemd\/system\/wongstack-helper.service/);
  assert.match(out, /User=root/);
  assert.match(out, /WantedBy=multi-user.target/);
  assert.match(out, /COMMAND=systemctl enable --now wongstack-helper.service/);
  assert.doesNotMatch(out, /loginctl|--user/);
  assert.deepEqual(world.ran, []);
});

test('on macOS it is a LaunchAgent kept alive by launchd', t => {
  const world = computer(t, { platform: 'darwin' });
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.match(out, new RegExp(`FILE=${world.env.HOME}/Library/LaunchAgents/com.wongstack.helper.plist`));
  assert.match(out, /<key>KeepAlive<\/key><true\/>/);
  assert.match(out, /COMMAND=launchctl bootstrap gui\/501 /);
  assert.match(launchdPlist(world), /<string>\/usr\/bin\/node<\/string>/);
});

test('elsewhere there is no service file: the helper runs from the launcher alone', t => {
  const world = computer(t, { platform: 'win32' });
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.doesNotMatch(out, /systemd|LaunchAgents/);
  assert.match(out, new RegExp(`COMMAND=/usr/bin/node ${join(helperDir(world), 'run.mjs')}`));
});

test('the unit runs the launcher with Node, restarts it, and finds the user folder\'s tools', t => {
  const world = computer(t);
  const unit = systemdUnit(world);
  assert.match(unit, new RegExp(`ExecStart="/usr/bin/node" "${join(helperDir(world), 'run.mjs')}"`));
  assert.match(unit, /RestartSec=10/);
  assert.match(unit, new RegExp(`Environment="PATH=${world.env.HOME}/.local/bin:/usr/bin"`));
});

test('installed from a worktree, the launcher points at the main checkout, never the worktree', t => {
  const { main, worktree } = checkouts(t);
  const world = computer(t, { script: join(worktree, SCRIPT) });
  helper('install', { world });
  const current = JSON.parse(readFileSync(join(helperDir(world), 'current.json'), 'utf8'));
  assert.deepEqual(current, { script: join(main, SCRIPT), protocol: 8 });
  assert.ok(!current.script.startsWith(worktree));
  assert.deepEqual(readApps(world.env), [{ cwd: main }]);
  assert.match(printed(world), /HELPER=installed/);
  assert.ok(existsSync(join(world.env.HOME, '.config/systemd/user/wongstack-helper.service')));
  assert.ok(existsSync(join(helperDir(world), 'run.mjs')));
  assert.deepEqual(world.ran, ['loginctl enable-linger ana', 'systemctl --user daemon-reload', 'systemctl --user enable --now wongstack-helper.service']);
});

test('a main checkout holding older code is never pointed at: install says to update it', t => {
  const { worktree } = checkouts(t, { protocol: 7, worktree: 8 });
  const world = computer(t, { script: join(worktree, SCRIPT) });
  helper('install', { world });
  assert.match(printed(world), /HELPER=outdated/);
  assert.equal(existsSync(join(helperDir(world), 'current.json')), false);
  assert.deepEqual(world.ran, []);
});

test('start does nothing until the helper is installed, then starts it, and restarts one running older code', t => {
  const world = computer(t);
  helper('start', { world });
  assert.deepEqual([world.ran, world.spawned, world.lines], [[], [], []]);
  helper('install', { world });
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, ['systemctl --user start wongstack-helper.service']);
  // This test's own process stands in for a live service helper on older code.
  mkdirSync(join(world.env.HOME, '.wong-stack', 'reply-link'), { recursive: true });
  const record = join(world.env.HOME, '.wong-stack', 'reply-link', 'inbox.json');
  writeFileSync(record, JSON.stringify({ pid: process.pid, protocol: 7, service: true }));
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, ['systemctl --user restart wongstack-helper.service']);
  writeFileSync(record, JSON.stringify({ pid: process.pid, protocol: 8, service: true }));
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, [], 'a current helper is left running');
  rmSync(record);
});

test('uninstall stops and removes the service, keeping the log and this computer\'s id', t => {
  const world = computer(t);
  helper('install', { world });
  logAction({ event: 'tap', outcome: 'sent' }, { env: world.env });
  world.ran.length = 0;
  helper('uninstall', { world });
  assert.deepEqual(world.ran, ['systemctl --user disable --now wongstack-helper.service', 'systemctl --user daemon-reload']);
  assert.equal(existsSync(join(world.env.HOME, '.config/systemd/user/wongstack-helper.service')), false);
  assert.equal(existsSync(join(helperDir(world), 'current.json')), false);
  assert.ok(existsSync(join(helperDir(world), 'log.jsonl')));
  assert.ok(existsSync(join(world.env.HOME, '.wong-stack', 'computer.json')));
  assert.match(printed(world), /HELPER=uninstalled/);
});

test('status says whether it is installed and running', t => {
  const world = computer(t);
  helper('status', { world });
  assert.deepEqual(world.lines, ['HELPER=not-installed', 'SYSTEM=systemd-user', 'RUNNING=no', 'SCRIPT=none']);
});

test('an old Node warns, by the table in required-tools.md, and start still finishes', t => {
  assert.match(nodeAdvice('22.1.0', TABLE), /older than 22\.22\.2/);
  assert.match(nodeAdvice('23.4.0', TABLE), /older than 24\.15\.0/, 'an unlisted line takes the next listed minimum');
  assert.match(nodeAdvice('20.9.0', TABLE), /older than 22\.22\.2/);
  assert.equal(nodeAdvice('22.22.2', TABLE), null);
  assert.equal(nodeAdvice('24.16.0', TABLE), null);
  assert.equal(nodeAdvice('27.0.0', TABLE), null, 'a line newer than the table is not warned about');
  assert.match(nodeAdvice('22.0.0', readFileSync(REQUIRED_TOOLS, 'utf8')) ?? '', /NODE_WARNING=/, 'the real table parses');

  const world = computer(t, { nodeVersion: '22.1.0' });
  helper('start', { world });
  assert.match(printed(world), /^NODE_WARNING=Node 22\.1\.0 is older than 22\.22\.2/);
  const home = temp(t, 'wong-test-helper-cli-');
  const run = spawnSync(process.execPath, [HELPER, 'start'], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('this computer\'s id is made once, private, and kept', t => {
  const env = { HOME: temp(t, 'wong-test-helper-id-') };
  const id = computerId(env);
  assert.match(id, /^[0-9a-f]{32}$/);
  assert.equal(computerId(env), id);
  assert.equal(statSync(join(env.HOME, '.wong-stack', 'computer.json')).mode & 0o777, 0o600);
});

test('an app is remembered by its main checkout, once', t => {
  const { main, worktree } = checkouts(t);
  const env = { HOME: temp(t, 'wong-test-helper-apps-') };
  assert.equal(rememberApp(worktree, env), true);
  assert.equal(rememberApp(main, env), true);
  assert.equal(rememberApp(join(tmpdir(), 'no-such-folder-here'), env), false);
  assert.deepEqual(readApps(env), [{ cwd: main }]);
});

test('the log keeps only its allowed fields, never words, and starts over at 1 MB', t => {
  const env = { HOME: temp(t, 'wong-test-helper-log-') };
  const log = join(env.HOME, '.wong-stack', 'helper', 'log.jsonl');
  logAction({ event: 'ignored', message: 'start', text: 'secret words', prompt: 'secret words' }, { env, now: () => 0 });
  assert.deepEqual(JSON.parse(readFileSync(log, 'utf8')), { at: '1970-01-01T00:00:00.000Z', event: 'ignored', message: 'start' });
  writeFileSync(log, 'x'.repeat(LOG_LIMIT));
  logAction({ event: 'run', key: 'daily-brief', outcome: 'started' }, { env });
  assert.equal(statSync(log.replace('.jsonl', '.1.jsonl')).size, LOG_LIMIT);
  assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 1);
});
