// The background helper's installer and its records: a fake computer stands in for systemd, launchd and the clock.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { helper, launchdPlist, nodeAdvice, systemdUnit } from '../../.agents/skills/reply-link/scripts/helper.mjs';
import { computerId, guardShared, helperFiles, helperService, leaveShared, projectId, readApps, rememberApp } from '../../.agents/skills/reply-link/scripts/lib/computer.mjs';
import { LOG_LIMIT, logAction } from '../../.agents/skills/reply-link/scripts/lib/helper-log.mjs';

const HELPER = fileURLToPath(new URL('../../.agents/skills/reply-link/scripts/helper.mjs', import.meta.url));
const REQUIRED_TOOLS = fileURLToPath(new URL('../../wiki/development/required-tools.md', import.meta.url));
const SCRIPT = '.agents/skills/reply-link/scripts/reply-link.mjs';
const TABLE = '| Node line | Minimum |\n|---|---|\n| 22 | 22.22.2 |\n| 24 | 24.15.0 |\n| 26 | 26.0.0 |\n';

function temp(t, prefix) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A main checkout whose helper script declares `protocol`, and a worktree of it holding `worktree`'s.
function checkouts(t, { protocol = 16, worktree = protocol, name = 'main' } = {}) {
  const base = temp(t, 'wong-test-helper-repo-');
  const main = join(base, name);
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' });
  mkdirSync(join(main, '.agents/skills/reply-link/scripts'), { recursive: true });
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
const sharedDir = world => join(world.env.HOME, '.wong-stack', 'helper');
const mainOf = world => realpathSync(join(world.script, '../../../../../../main'));
const ownDir = (world, root = mainOf(world)) => helperFiles(world.env, root).dir;
const unitOf = (world, root = mainOf(world)) => `wongstack-helper@${projectId(root)}.service`;
const userUnits = world => join(world.env.HOME, '.config/systemd/user');
const readJsonFile = file => JSON.parse(readFileSync(file, 'utf8'));

test('a project\'s id is its folder name and a short hash of its path, so two folders of one name differ', t => {
  const a = checkouts(t, { name: 'MyApp' }).main, b = checkouts(t, { name: 'MyApp' }).main;
  assert.match(projectId(a), /^myapp-[0-9a-f]{8}$/);
  assert.notEqual(projectId(a), projectId(b));
  assert.equal(projectId(a), projectId(a));
  const env = { HOME: '/h' };
  assert.equal(helperFiles(env, a).dir, `/h/.wong-stack/helpers/${projectId(a)}`);
  assert.equal(helperFiles(env, a).items, `/h/.wong-stack/helpers/${projectId(a)}/items`);
  assert.equal(helperFiles(env).dir, '/h/.wong-stack/helper', 'with no project: the shared helper, as before');
  assert.equal(helperFiles(env).inbox, '/h/.wong-stack/reply-link/inbox.json');
});

test('a dry run prints the systemd template unit, this project\'s instance and its commands, and changes nothing', t => {
  const world = computer(t);
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.match(out, new RegExp(`PROJECT=${projectId(mainOf(world))}`));
  assert.match(out, new RegExp(`FILE=${userUnits(world)}/wongstack-helper@.service`));
  assert.match(out, new RegExp(`FILE=${ownDir(world)}/run.mjs`));
  assert.match(out, new RegExp(`FILE=${ownDir(world)}/current.json`));
  assert.match(out, /Restart=always/);
  assert.match(out, /WantedBy=default.target/);
  assert.doesNotMatch(out, /User=root/);
  assert.match(out, /COMMAND=loginctl enable-linger ana/);
  assert.match(out, new RegExp(`COMMAND=systemctl --user enable --now ${unitOf(world)}`));
  assert.deepEqual(world.ran, []);
  assert.equal(existsSync(join(world.env.HOME, '.wong-stack')), false);
});

test('as root, the template is a system service that runs as root, with no linger', t => {
  const world = computer(t, { isRoot: true });
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.match(out, /FILE=\/etc\/systemd\/system\/wongstack-helper@.service/);
  assert.match(out, /User=root/);
  assert.match(out, /WantedBy=multi-user.target/);
  assert.match(out, new RegExp(`COMMAND=systemctl enable --now ${unitOf(world)}`));
  assert.doesNotMatch(out, /loginctl|--user/);
  assert.deepEqual(world.ran, []);
});

test('on macOS it is a LaunchAgent per project, kept alive by launchd', t => {
  const world = computer(t, { platform: 'darwin' });
  helper('install', { dryRun: true, world });
  const out = printed(world);
  const label = `com.wongstack.helper.${projectId(mainOf(world))}`;
  assert.match(out, new RegExp(`FILE=${world.env.HOME}/Library/LaunchAgents/${label}.plist`));
  assert.match(out, /<key>KeepAlive<\/key><true\/>/);
  assert.match(out, new RegExp(`<key>Label</key><string>${label}</string>`));
  assert.match(out, /COMMAND=launchctl bootstrap gui\/501 /);
  assert.match(launchdPlist(world, mainOf(world)), new RegExp(`<string>/usr/bin/node</string><string>${ownDir(world)}/run.mjs</string>`));
});

test('elsewhere there is no service file: the helper runs from its launcher alone', t => {
  const world = computer(t, { platform: 'win32' });
  helper('install', { dryRun: true, world });
  const out = printed(world);
  assert.doesNotMatch(out, /systemd|LaunchAgents/);
  assert.match(out, new RegExp(`COMMAND=/usr/bin/node ${join(ownDir(world), 'run.mjs')}`));
});

test('the template runs each instance\'s launcher with Node, restarts it, and finds the user folder\'s tools', t => {
  const world = computer(t);
  const unit = systemdUnit(world);
  assert.ok(unit.split('\n').includes(`ExecStart="/usr/bin/node" "${join(world.env.HOME, '.wong-stack', 'helpers')}/%i/run.mjs"`), unit);
  assert.match(unit, /RestartSec=10/);
  assert.match(unit, new RegExp(`Environment="PATH=${world.env.HOME}/.local/bin:/usr/bin"`));
});

test('installed from a worktree, the launcher points at the main checkout and its project, and leaves the shared list', t => {
  const { main, worktree } = checkouts(t);
  const world = computer(t, { script: join(worktree, SCRIPT) });
  mkdirSync(sharedDir(world), { recursive: true });
  writeFileSync(join(sharedDir(world), 'folders.json'), JSON.stringify({ apps: [{ cwd: main }, { cwd: '/other/project' }] }));
  helper('install', { world });
  const current = readJsonFile(join(ownDir(world, main), 'current.json'));
  assert.deepEqual(current, { script: join(main, SCRIPT), protocol: 16, project: main });
  assert.ok(!current.script.startsWith(worktree));
  assert.deepEqual(readApps(world.env), [{ cwd: '/other/project' }], 'the shared helper no longer serves this project');
  assert.match(printed(world), /HELPER=installed/);
  assert.match(printed(world), /LEFT_SHARED=yes/);
  assert.ok(existsSync(join(userUnits(world), 'wongstack-helper@.service')));
  assert.equal(existsSync(join(userUnits(world), 'wongstack-helper.service')), false, 'the shared unit is never written');
  assert.match(readFileSync(join(ownDir(world, main), 'run.mjs'), 'utf8'), /'--project', project/);
  assert.deepEqual(world.ran, ['loginctl enable-linger ana', 'systemctl --user daemon-reload', `systemctl --user enable --now ${unitOf(world, main)}`]);
  assert.equal(rememberApp(worktree, world.env), true);
  assert.deepEqual(readApps(world.env), [{ cwd: '/other/project' }], 'a project with its own helper is never listed again');
});

test('a main checkout holding code from before one helper per project is never pointed at: install says to update it', t => {
  const { worktree } = checkouts(t, { protocol: 15, worktree: 16 });
  const world = computer(t, { script: join(worktree, SCRIPT) });
  helper('install', { world });
  assert.match(printed(world), /HELPER=outdated/);
  assert.equal(existsSync(join(world.env.HOME, '.wong-stack')), false);
  assert.deepEqual(world.ran, []);
});

test('two projects get two services and two folders, and a newer project never moves the other', t => {
  const older = checkouts(t, { name: 'myapp', protocol: 16 }), newer = checkouts(t, { name: 'shop', protocol: 17 });
  const world = computer(t, { script: join(older.worktree, SCRIPT) });
  helper('install', { world });
  const other = { ...world, script: join(newer.worktree, SCRIPT) };
  helper('install', { world: other });
  helper('start', { world: other });
  assert.notEqual(ownDir(world, older.main), ownDir(world, newer.main));
  assert.deepEqual(readJsonFile(join(ownDir(world, older.main), 'current.json')), { script: join(older.main, SCRIPT), protocol: 16, project: older.main });
  assert.deepEqual(readJsonFile(join(ownDir(world, newer.main), 'current.json')), { script: join(newer.main, SCRIPT), protocol: 17, project: newer.main });
  assert.ok(world.ran.includes(`systemctl --user enable --now ${unitOf(world, older.main)}`));
  assert.ok(world.ran.includes(`systemctl --user enable --now ${unitOf(world, newer.main)}`));
  assert.ok(!world.ran.some(command => command.endsWith(' wongstack-helper.service')), 'the shared helper is never touched');
  // The template stays while another project's helper uses it.
  world.ran.length = 0;
  helper('uninstall', { world });
  assert.deepEqual(world.ran, [`systemctl --user disable --now ${unitOf(world, older.main)}`, 'systemctl --user daemon-reload']);
  assert.ok(existsSync(join(userUnits(world), 'wongstack-helper@.service')));
  assert.ok(existsSync(join(ownDir(world, newer.main), 'current.json')));
  helper('uninstall', { world: other });
  assert.equal(existsSync(join(userUnits(world), 'wongstack-helper@.service')), false, 'the last one takes the template');
});

test('start does nothing until the helper is installed, then starts it, and restarts one running older code', t => {
  const world = computer(t);
  helper('start', { world });
  assert.deepEqual([world.ran, world.spawned, world.lines], [[], [], []]);
  helper('install', { world });
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, [`systemctl --user start ${unitOf(world)}`]);
  // This test's own process stands in for a live service helper on older code.
  const record = join(ownDir(world), 'inbox.json');
  writeFileSync(record, JSON.stringify({ pid: process.pid, protocol: 15, service: true }));
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, [`systemctl --user restart ${unitOf(world)}`]);
  writeFileSync(record, JSON.stringify({ pid: process.pid, protocol: 16, service: true }));
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, [], 'a current helper is left running');
  rmSync(record);
});

test('a project with no helper of its own only starts the shared one when it stopped, and never points it at its copy', t => {
  const world = computer(t, { script: join(checkouts(t, { protocol: 99 }).worktree, SCRIPT) });
  const shared = sharedDir(world);
  mkdirSync(shared, { recursive: true });
  mkdirSync(userUnits(world), { recursive: true });
  writeFileSync(join(userUnits(world), 'wongstack-helper.service'), '[Unit]\n');
  const elsewhere = checkouts(t, { name: 'shop', protocol: 18 });
  const kept = { script: join(elsewhere.main, SCRIPT), protocol: 18 };
  writeFileSync(join(shared, 'current.json'), JSON.stringify(kept));
  helper('start', { world });
  assert.deepEqual(readJsonFile(join(shared, 'current.json')), kept, 'a newer copy here never moves the shared launcher');
  assert.deepEqual(readApps(world.env), [{ cwd: mainOf(world) }]);
  assert.deepEqual(world.ran, ['systemctl --user start wongstack-helper.service']);
  // This test's own process stands in for the shared helper, running older code than this copy.
  const record = join(world.env.HOME, '.wong-stack', 'reply-link', 'inbox.json');
  mkdirSync(join(record, '..'), { recursive: true });
  writeFileSync(record, JSON.stringify({ pid: process.pid, protocol: 15, service: true }));
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(world.ran, [], 'a running shared helper is left as it is');
  rmSync(record);

  helper('install', { world });
  world.ran.length = 0;
  helper('start', { world });
  assert.deepEqual(readJsonFile(join(shared, 'current.json')), kept, 'the shared launcher stays as it was');
  assert.deepEqual(readApps(world.env), []);
  assert.deepEqual(world.ran, [`systemctl --user start ${unitOf(world)}`]);
});

test('uninstall stops and removes this project\'s service, keeping the log and this computer\'s id', t => {
  const world = computer(t);
  helper('uninstall', { world });
  assert.deepEqual([world.ran, world.lines], [[], ['HELPER=not-installed']], 'a project with no helper of its own touches nothing');
  world.lines.length = 0;
  helper('install', { world });
  logAction({ event: 'tap', outcome: 'sent' }, { env: world.env, root: mainOf(world) });
  world.ran.length = 0;
  helper('uninstall', { world });
  assert.deepEqual(world.ran, [`systemctl --user disable --now ${unitOf(world)}`, 'systemctl --user daemon-reload']);
  assert.equal(existsSync(join(userUnits(world), 'wongstack-helper@.service')), false);
  assert.equal(existsSync(join(ownDir(world), 'current.json')), false);
  assert.ok(existsSync(join(ownDir(world), 'log.jsonl')));
  assert.ok(existsSync(join(world.env.HOME, '.wong-stack', 'computer.json')));
  assert.match(printed(world), /HELPER=uninstalled/);
});

test('a first install whose service does not start leaves the project on the shared helper, with its items', t => {
  const { main, worktree } = checkouts(t);
  const ran = [];
  const world = computer(t, { script: join(worktree, SCRIPT), ran,
    run: (command, args) => { ran.push([command, ...args].join(' ')); return args.includes('enable') ? 1 : 0; } });
  const { items } = helperFiles(world.env);
  for (const dir of [items, sharedDir(world)]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(items, `${'1'.repeat(32)}.json`), JSON.stringify({ id: '1'.repeat(32), app: { cwd: worktree } }));
  writeFileSync(join(sharedDir(world), 'folders.json'), JSON.stringify({ apps: [{ cwd: main }] }));
  helper('install', { world });
  assert.match(printed(world), /HELPER=failed/);
  assert.match(printed(world), new RegExp(`FAILED=systemctl --user enable --now ${unitOf(world, main)}`));
  assert.doesNotMatch(printed(world), /LEFT_SHARED/);
  assert.ok(ran.includes(`systemctl --user disable --now ${unitOf(world, main)}`), 'a half-started service is stopped');
  for (const file of ['current.json', 'run.mjs']) assert.equal(existsSync(join(ownDir(world, main), file)), false, file);
  assert.equal(existsSync(join(userUnits(world), 'wongstack-helper@.service')), false);
  assert.equal(helperService(world.env, { platform: 'linux', root: false }, worktree), false);
  assert.deepEqual(readApps(world.env), [{ cwd: main }], 'the shared helper still serves the project');
  assert.deepEqual(readdirSync(items), [`${'1'.repeat(32)}.json`]);
});

test('uninstall gives the shared helper back the project\'s open items and its started runs and gaps', t => {
  const world = computer(t);
  helper('install', { world });
  const main = mainOf(world), own = helperFiles(world.env, main), shared = helperFiles(world.env);
  const id = '4'.repeat(32), run = 'c'.repeat(32), now = Date.now();
  mkdirSync(own.items, { recursive: true });
  writeFileSync(join(own.items, `${id}.json`), JSON.stringify({ id, app: { cwd: main } }));
  writeFileSync(own.runs, JSON.stringify({ ids: { [run]: now }, keys: { [`${main}:disk`]: now, [`${main}:news`]: 100 } }));
  mkdirSync(shared.dir, { recursive: true });
  writeFileSync(shared.runs, JSON.stringify({ ids: {}, keys: { [`${main}:disk`]: 100, [`${main}:news`]: 500, '/other:orders': 300 } }));
  helper('uninstall', { world });
  assert.match(printed(world), /ITEMS_RETURNED=1/);
  assert.deepEqual(readdirSync(shared.items), [`${id}.json`], 'the shared helper delivers and closes it');
  assert.deepEqual(readdirSync(own.items), []);
  assert.deepEqual(readJsonFile(shared.runs), { ids: { [run]: now }, keys: { [`${main}:disk`]: now, [`${main}:news`]: 500, '/other:orders': 300 } },
    'the recent gap comes back, and a newer shared one is never wound back');
});

test('status says whether this project\'s helper is installed and running, and whether the shared one still lists it', t => {
  const world = computer(t);
  helper('status', { world });
  assert.deepEqual(world.lines, ['HELPER=not-installed', 'SYSTEM=systemd-user', `SERVICE=${unitOf(world)}`, 'RUNNING=no', 'SCRIPT=none', 'SHARED=no']);
  helper('install', { world });
  world.lines.length = 0;
  helper('status', { world });
  assert.deepEqual(world.lines, ['HELPER=installed', 'SYSTEM=systemd-user', `SERVICE=${unitOf(world)}`, 'RUNNING=no', `SCRIPT=${join(mainOf(world), SCRIPT)}`, 'SHARED=no']);
});

test('a helper service counts for a folder when its project has its own, or else when the shared one is installed', t => {
  const world = computer(t);
  const system = { platform: 'linux', root: false };
  assert.equal(helperService(world.env, system, mainOf(world)), false);
  helper('install', { world });
  assert.equal(helperService(world.env, system, mainOf(world)), true);
  assert.equal(helperService(world.env, system, tmpdir()), false, 'a folder in no project has only the shared one, not installed');
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

test('a project\'s own log sits in its own folder', t => {
  const { main } = checkouts(t);
  const env = { HOME: temp(t, 'wong-test-helper-log-') };
  logAction({ event: 'run', key: 'disk', outcome: 'handed' }, { env, root: main });
  assert.equal(JSON.parse(readFileSync(helperFiles(env, main).log, 'utf8')).key, 'disk');
  assert.equal(existsSync(helperFiles(env).log), false, 'the shared log stays as it was');
});

test("a run's warning keeps up to 1000 characters in the project's own log, so a joined fetch and rename warning both stay; other fields keep 200", t => {
  const { main } = checkouts(t);
  const env = { HOME: temp(t, 'wong-test-helper-log-') };
  const log = helperFiles(env, main).log;
  logAction({ event: 'run', reason: 'r'.repeat(300), warning: `${'f'.repeat(300)}\nThe workspace kept Paseo's name` }, { env, root: main });
  const line = JSON.parse(readFileSync(log, 'utf8'));
  assert.equal(line.reason.length, 200);
  assert.match(line.warning, /\nThe workspace kept Paseo's name$/);
  logAction({ event: 'run', warning: 'w'.repeat(1500) }, { env, root: main });
  assert.equal(JSON.parse(readFileSync(log, 'utf8').trim().split('\n')[1]).warning.length, 1000);
  assert.equal(existsSync(helperFiles(env).log), false, 'the shared log stays as it was');
});

test('leaving the shared helper keeps every started run and this project\'s gaps, and moves only its own items', t => {
  const { main, worktree } = checkouts(t, { name: 'myapp' });
  const other = checkouts(t, { name: 'shop' });
  const env = { HOME: temp(t, 'wong-test-helper-leave-') };
  const shared = helperFiles(env), own = helperFiles(env, main);
  mkdirSync(shared.dir, { recursive: true });
  mkdirSync(shared.items, { recursive: true });
  writeFileSync(shared.apps, JSON.stringify({ apps: [{ cwd: other.main }, { cwd: main }] }));
  const ids = { ['a'.repeat(32)]: 100, ['b'.repeat(32)]: 200 };
  writeFileSync(shared.runs, JSON.stringify({ ids, keys: { [`${main}:disk`]: 100, [`${main}/sub:news`]: 150, [`${other.main}:orders`]: 200, [`${main}-copy:disk`]: 300 } }));
  const item = (id, cwd) => writeFileSync(join(shared.items, `${id}.json`), JSON.stringify({ id, app: { cwd, origin: 'https://app.example.com' } }));
  item('1'.repeat(32), worktree);
  item('2'.repeat(32), other.worktree);
  item('3'.repeat(32), join(main, 'gone-folder'));

  assert.deepEqual(leaveShared(main, env), { left: true, runs: 4, items: 2 });
  assert.deepEqual(readApps(env), [{ cwd: other.main }]);
  const ledger = JSON.parse(readFileSync(own.runs, 'utf8'));
  assert.deepEqual(ledger.ids, ids, 'no run already started starts again');
  assert.deepEqual(ledger.keys, { [`${main}:disk`]: 100, [`${main}/sub:news`]: 150 }, 'only this project\'s gaps, so none runs early');
  assert.deepEqual(readdirSync(own.items).sort(), [`${'1'.repeat(32)}.json`, `${'3'.repeat(32)}.json`]);
  assert.deepEqual(readdirSync(shared.items), [`${'2'.repeat(32)}.json`], 'the other project\'s item stays with the shared helper');
  assert.deepEqual(JSON.parse(readFileSync(shared.runs, 'utf8')).ids, ids, 'the shared ledger is left as it was');

  // Again: nothing left to do, and a newer start of its own is never wound back.
  writeFileSync(own.runs, JSON.stringify({ ...ledger, keys: { ...ledger.keys, [`${main}:disk`]: 900 } }));
  assert.deepEqual(leaveShared(main, env), { left: false, runs: 0, items: 0 });
  assert.equal(JSON.parse(readFileSync(own.runs, 'utf8')).keys[`${main}:disk`], 900);
  writeFileSync(own.runs, 'broken');
  assert.equal(leaveShared(main, env).runs, 0);
  assert.equal(readFileSync(own.runs, 'utf8'), 'broken', 'a ledger it can not read stays, so its helper starts nothing');
});

test('the guard repeats the leave step only after the shared list changes, and stops on its stop', t => {
  const { main } = checkouts(t, { name: 'myapp' });
  const env = { HOME: temp(t, 'wong-test-helper-guard-') };
  const shared = helperFiles(env);
  mkdirSync(shared.dir, { recursive: true });
  writeFileSync(shared.apps, JSON.stringify({ apps: [{ cwd: main }] }));
  let tick = null, cleared = false;
  const stop = guardShared(main, env, { timers: { setInterval: fn => { tick = fn; return 7; }, clearInterval: id => { cleared = id === 7; } } });
  tick();
  assert.deepEqual(readApps(env), []);
  const left = statSync(shared.apps).mtimeMs;
  tick();
  tick();
  assert.equal(statSync(shared.apps).mtimeMs, left, 'no write while nothing changed');
  writeFileSync(shared.apps, JSON.stringify({ apps: [{ cwd: main }] }));
  tick();
  assert.deepEqual(readApps(env), [], 'listed again, it leaves again');
  stop();
  assert.ok(cleared);
});
