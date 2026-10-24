#!/usr/bin/env node
// Installs, checks and starts the background helper that holds the live line to each app. wiki/stack/live-line.md

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { computerId, helperFiles, pointCurrent, primaryScript, rememberApp, unitPath, wongDir } from './lib/computer.mjs';
import { alive, signal } from './lib/tunnel.mjs';

const USAGE = `usage: helper.mjs install [--dry-run] | uninstall [--dry-run] | status | start
  install    make the helper start with this computer, and start it now: a systemd service on Linux,
             a LaunchAgent on macOS; elsewhere it runs until the computer restarts
  uninstall  stop the helper and remove its service; its log and this computer's id stay
  status     print whether it is installed and running
  start      start it if it stopped, and warn when Node is older than its security minimum
  --dry-run  print the files and commands, and change nothing`;
const UNIT = 'wongstack-helper.service';
const LABEL = 'com.wongstack.helper';
// The first reply-link.mjs with a service mode: the launcher never points at an older one, which would refuse it.
const MIN_PROTOCOL = 8;
const ROW = /^\|\s*(\d+)\s*\|\s*(\d+\.\d+\.\d+)\s*\|\s*$/gm;
const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

const LAUNCHER = `// Written by helper.mjs: runs the helper named in current.json, from the main project folder.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { script } = JSON.parse(readFileSync(new URL('current.json', import.meta.url), 'utf8'));
const child = spawn(process.execPath, [script, 'serve-inbox', '--service'], { stdio: 'inherit' });
for (const name of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(name, () => child.kill(name));
child.on('exit', code => process.exit(code ?? 1));
`;

/** The real computer: every system call `helper` makes goes through here, so tests pass their own. */
function realWorld() {
  return { env: process.env, platform: process.platform, isRoot: process.getuid?.() === 0, user: process.env.USER || userInfo().username,
    uid: process.getuid?.(), execPath: process.execPath, nodeVersion: process.versions.node,
    script: fileURLToPath(new URL('./reply-link.mjs', import.meta.url)),
    requiredTools: fileURLToPath(new URL('../../../../wiki/development/required-tools.md', import.meta.url)),
    run: (command, args) => spawnSync(command, args, { stdio: 'ignore', timeout: 4000 }).status ?? 1,
    spawn: (command, args, env) => spawn(command, args, { detached: true, stdio: 'ignore', env }).unref(),
    out: line => console.log(line) };
}

const older = (version, minimum) => {
  const [a, b] = [version, minimum].map(text => text.split('.').map(Number));
  const at = a.findIndex((part, index) => part !== b[index]);
  return at !== -1 && a[at] < b[at];
};

/** A warning when `version` is below its line's minimum in required-tools.md's table, else null. A line not listed,
 * older than the newest listed, takes the next listed line's minimum. */
export function nodeAdvice(version, text) {
  const rows = [...text.matchAll(ROW)].map(([, line, minimum]) => ({ line: Number(line), minimum })).sort((a, b) => a.line - b.line);
  const major = Number(version.split('.')[0]);
  const row = rows.find(each => each.line >= major);
  if (!row || !older(version, row.minimum)) return null;
  return `NODE_WARNING=Node ${version} is older than ${row.minimum}, the oldest with current security fixes. `
    + 'Update Node when you can; the helper keeps working.';
}

const searchPath = world => [...new Set([join(world.env.HOME, '.local', 'bin'), ...(world.env.PATH ?? '').split(':')])].filter(Boolean).join(':');
const quoted = value => `"${value.replace(/[\\"]/g, '\\$&').replace(/%/g, '%%')}"`;
const xml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The systemd unit: a user service, or a system one running as root when the chats do. */
export function systemdUnit(world) {
  const { launcher } = helperFiles(world.env);
  return ['[Unit]', 'Description=WongStack helper: the live line to your company app', 'After=network-online.target', '',
    '[Service]', `ExecStart=${quoted(world.execPath)} ${quoted(launcher)}`, ...(world.isRoot ? ['User=root'] : []),
    'Restart=always', 'RestartSec=10', `Environment=${quoted(`HOME=${world.env.HOME}`)}`, `Environment=${quoted(`PATH=${searchPath(world)}`)}`, '',
    '[Install]', `WantedBy=${world.isRoot ? 'multi-user.target' : 'default.target'}`, ''].join('\n');
}

/** The macOS LaunchAgent, kept alive by launchd. */
export function launchdPlist(world) {
  const { launcher } = helperFiles(world.env);
  const string = value => `<string>${xml(value)}</string>`;
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">', '<dict>', `  <key>Label</key>${string(LABEL)}`,
    `  <key>ProgramArguments</key><array>${string(world.execPath)}${string(launcher)}</array>`,
    `  <key>EnvironmentVariables</key><dict><key>HOME</key>${string(world.env.HOME)}<key>PATH</key>${string(searchPath(world))}</dict>`,
    '  <key>RunAtLoad</key><true/>', '  <key>KeepAlive</key><true/>', '  <key>ThrottleInterval</key><integer>10</integer>',
    '</dict>', '</plist>', ''].join('\n');
}

/** This computer's service manager: its unit file and the commands for each step. `optional` ones may fail. */
function systemOf(world) {
  const file = unitPath(world.env, { platform: world.platform, root: world.isRoot });
  if (world.platform === 'linux') {
    const ctl = (...args) => ({ args: ['systemctl', ...(world.isRoot ? [] : ['--user']), ...args] });
    const linger = world.isRoot ? [] : [{ args: ['loginctl', 'enable-linger', world.user], optional: true }];
    return { name: world.isRoot ? 'systemd-system' : 'systemd-user', file, text: systemdUnit(world),
      install: [...linger, ctl('daemon-reload'), ctl('enable', '--now', UNIT)], uninstall: [ctl('disable', '--now', UNIT)],
      removed: [ctl('daemon-reload')], start: restart => [ctl(restart ? 'restart' : 'start', UNIT)] };
  }
  if (world.platform === 'darwin') {
    const domain = `gui/${world.uid}`;
    const bootout = { args: ['launchctl', 'bootout', `${domain}/${LABEL}`], optional: true };
    return { name: 'launchd', file, text: launchdPlist(world),
      install: [bootout, { args: ['launchctl', 'bootstrap', domain, file] }], uninstall: [bootout], removed: [],
      start: restart => [{ args: ['launchctl', 'kickstart', ...(restart ? ['-k'] : []), `${domain}/${LABEL}`] }] };
  }
  return { name: 'unsupported', file: null };
}

/** Runs `commands`, printing each one that failed; true when every required one worked. */
function runAll(world, commands) {
  let worked = true;
  for (const { args, optional } of commands) {
    if (world.run(args[0], args.slice(1)) === 0) continue;
    world.out(`FAILED=${args.join(' ')}`);
    if (!optional) worked = false;
  }
  return worked;
}

/** The running service helper's record, or null: reply-link.mjs writes it at ~/.wong-stack/reply-link/inbox.json. */
function runningService(env) {
  const record = readJson(join(wongDir(env), 'reply-link', 'inbox.json'));
  return record?.service && alive(record.pid) ? record : null;
}

/** The main project folder's helper script, when it is new enough to run as a service; else prints why not. */
function usable(world) {
  const found = primaryScript(world.script);
  if (found?.protocol >= MIN_PROTOCOL) return found;
  world.out(found ? 'HELPER=outdated' : 'HELPER=no-project');
  world.out(found ? 'REASON=your main project folder holds older code: update it, then install again'
    : 'REASON=run this from a project folder');
  return null;
}

function install(world, dryRun) {
  const files = helperFiles(world.env);
  const system = systemOf(world);
  const found = usable(world);
  if (!found) return;
  if (dryRun) {
    world.out('DRY_RUN=yes');
    world.out(`FILE=${files.launcher}\n${LAUNCHER}`);
    world.out(`FILE=${files.current}\n${JSON.stringify(found)}\n`);
    if (system.file) world.out(`FILE=${system.file}\n${system.text}`);
    for (const { args } of system.install ?? [{ args: [world.execPath, files.launcher] }]) world.out(`COMMAND=${args.join(' ')}`);
    return;
  }
  mkdirSync(files.dir, { recursive: true, mode: 0o700 });
  writeFileSync(files.launcher, LAUNCHER, { mode: 0o600 });
  pointCurrent(found, world.env);
  rememberApp(dirname(found.script), world.env);
  computerId(world.env);
  if (!system.file) {
    if (!runningService(world.env)) world.spawn(world.execPath, [files.launcher], world.env);
    world.out('HELPER=unsupported');
    world.out('REASON=this system has no service manager WongStack knows: the helper runs until the computer restarts');
    return;
  }
  mkdirSync(dirname(system.file), { recursive: true });
  writeFileSync(system.file, system.text, { mode: 0o644 });
  world.out(runAll(world, system.install) ? 'HELPER=installed' : 'HELPER=failed');
  world.out(`SYSTEM=${system.name}`);
  world.out(`UNIT=${system.file}`);
}

function uninstall(world, dryRun) {
  const files = helperFiles(world.env);
  const system = systemOf(world);
  const commands = system.file ? [...system.uninstall, ...system.removed] : [];
  if (dryRun) {
    world.out('DRY_RUN=yes');
    for (const file of [system.file, files.current, files.launcher].filter(Boolean)) world.out(`REMOVE=${file}`);
    for (const { args } of commands) world.out(`COMMAND=${args.join(' ')}`);
    return;
  }
  if (system.file) runAll(world, system.uninstall);
  for (const file of [system.file, files.current, files.launcher].filter(Boolean)) rmSync(file, { force: true });
  if (system.file) runAll(world, system.removed);
  const running = runningService(world.env);
  if (running) signal(running.pid, 'SIGTERM');
  world.out('HELPER=uninstalled');
}

const installed = (world, system) => existsSync(helperFiles(world.env).current) && (!system.file || existsSync(system.file));

function status(world) {
  const system = systemOf(world);
  world.out(`HELPER=${installed(world, system) ? 'installed' : 'not-installed'}`);
  world.out(`SYSTEM=${system.name}`);
  world.out(`RUNNING=${runningService(world.env) ? 'yes' : 'no'}`);
  world.out(`SCRIPT=${readJson(helperFiles(world.env).current)?.script ?? 'none'}`);
}

/** The session-start step: warn about an old Node, point the launcher at newer code, and start or restart the
 * helper when it is installed and not running current code. Never fails the session. */
function start(world) {
  let text = '';
  try { text = readFileSync(world.requiredTools, 'utf8'); } catch { /* no table: no warning */ }
  const advice = nodeAdvice(world.nodeVersion, text);
  if (advice) world.out(advice);
  const system = systemOf(world);
  if (!installed(world, system)) return;
  const found = primaryScript(world.script);
  if (found?.protocol >= MIN_PROTOCOL) {
    pointCurrent(found, world.env);
    rememberApp(dirname(found.script), world.env);
  }
  const files = helperFiles(world.env);
  const wanted = readJson(files.current)?.protocol ?? 0;
  const running = runningService(world.env);
  if (running && (running.protocol ?? 0) >= wanted) return;
  if (!system.file) {
    if (running) signal(running.pid, 'SIGTERM');
    world.spawn(world.execPath, [files.launcher], world.env);
  } else runAll(world, system.start(Boolean(running)));
}

/** Runs one command against `world`; `dryRun` prints install's or uninstall's files and commands instead. */
export function helper(command, { dryRun = false, world = realWorld() } = {}) {
  ({ install, uninstall, status, start })[command](world, dryRun);
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, options: { 'dry-run': { type: 'boolean' } } });
  const [command, ...rest] = positionals;
  if (!['install', 'uninstall', 'status', 'start'].includes(command) || rest.length) usageError(USAGE, command ? `unknown command: ${positionals.join(' ')}` : 'missing command');
  if (values['dry-run'] && !['install', 'uninstall'].includes(command)) usageError(USAGE, '--dry-run goes with install and uninstall only');
  try { helper(command, { dryRun: Boolean(values['dry-run']) }); } catch (error) {
    // A session's start never fails for the helper.
    if (command !== 'start') throw error;
    console.log(`HELPER_ERROR=${error.message}`);
  }
}
