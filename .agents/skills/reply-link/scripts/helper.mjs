#!/usr/bin/env node
// Installs, checks and starts this project's own background helper, which holds the live line to its app.
// wiki/stack/live-line.md

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { computerId, helperFiles, launchLabel, leaveShared, pointCurrent, primaryScript, readApps, rejoinShared, rememberApp, unitName, unitPath, wongDir } from './lib/computer.mjs';
import { alive, signal } from '../../browser/skills/hand-over/scripts/lib/tunnel.mjs';

const USAGE = `usage: helper.mjs install [--dry-run] | uninstall [--dry-run] | status | start
  Each acts on this project's own helper, which serves this project alone.
  install    make this project's helper start with this computer, and start it now: a systemd service on Linux,
             a LaunchAgent on macOS; elsewhere it runs until the computer restarts. The project then leaves
             the old shared helper, keeping its started runs and open inbox items; a failed first install stays on it
  uninstall  stop this project's helper and remove its service; its open items and started runs go back to the
             shared helper, and its log and this computer's id stay
  status     print whether it is installed and running
  start      start it if it stopped, and warn when Node is older than its security minimum
  --dry-run  print the files and commands, and change nothing`;
// The first reply-link.mjs that serves one project (`--project`): a project's own helper needs it.
const PROJECT_PROTOCOL = 16;
const ROW = /^\|\s*(\d+)\s*\|\s*(\d+\.\d+\.\d+)\s*\|\s*$/gm;
const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

const LAUNCHER = `// Written by helper.mjs: runs the helper named in current.json, from the main project folder, for its project.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { script, project } = JSON.parse(readFileSync(new URL('current.json', import.meta.url), 'utf8'));
const child = spawn(process.execPath, [script, 'serve-inbox', '--service', ...(project ? ['--project', project] : [])], { stdio: 'inherit' });
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
const inner = value => value.replace(/[\\"]/g, '\\$&').replace(/%/g, '%%');
const quoted = value => `"${inner(value)}"`;
const xml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The systemd template unit for every project's own helper: instance `<id>` runs ~/.wong-stack/helpers/<id>/run.mjs.
 *  A user service, or a system one running as root when the chats do. */
export function systemdUnit(world) {
  const helpers = join(wongDir(world.env), 'helpers');
  return ['[Unit]', 'Description=WongStack helper for %i: the live line to its company app', 'After=network-online.target', '',
    '[Service]', `ExecStart=${quoted(world.execPath)} "${inner(helpers)}/%i/run.mjs"`, ...(world.isRoot ? ['User=root'] : []),
    'Restart=always', 'RestartSec=10', `Environment=${quoted(`HOME=${world.env.HOME}`)}`, `Environment=${quoted(`PATH=${searchPath(world)}`)}`, '',
    '[Install]', `WantedBy=${world.isRoot ? 'multi-user.target' : 'default.target'}`, ''].join('\n');
}

/** The macOS LaunchAgent for `project`'s own helper, kept alive by launchd. */
export function launchdPlist(world, project) {
  const { launcher } = helperFiles(world.env, project);
  const string = value => `<string>${xml(value)}</string>`;
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">', '<dict>', `  <key>Label</key>${string(launchLabel(project))}`,
    `  <key>ProgramArguments</key><array>${string(world.execPath)}${string(launcher)}</array>`,
    `  <key>EnvironmentVariables</key><dict><key>HOME</key>${string(world.env.HOME)}<key>PATH</key>${string(searchPath(world))}</dict>`,
    '  <key>RunAtLoad</key><true/>', '  <key>KeepAlive</key><true/>', '  <key>ThrottleInterval</key><integer>10</integer>',
    '</dict>', '</plist>', ''].join('\n');
}

/** This computer's service manager for `project`'s own helper, or the shared one with no project: its unit file and
 *  the commands for each step. `optional` ones may fail. */
function systemOf(world, project = null) {
  const file = unitPath(world.env, { platform: world.platform, root: world.isRoot, project });
  if (world.platform === 'linux') {
    const unit = unitName(project);
    const ctl = (...args) => ({ args: ['systemctl', ...(world.isRoot ? [] : ['--user']), ...args] });
    const linger = world.isRoot ? [] : [{ args: ['loginctl', 'enable-linger', world.user], optional: true }];
    return { name: world.isRoot ? 'systemd-system' : 'systemd-user', file, unit, text: project && systemdUnit(world),
      install: [...linger, ctl('daemon-reload'), ctl('enable', '--now', unit)], uninstall: [ctl('disable', '--now', unit)],
      removed: [ctl('daemon-reload')], start: restart => [ctl(restart ? 'restart' : 'start', unit)] };
  }
  if (world.platform === 'darwin') {
    const domain = `gui/${world.uid}`, label = launchLabel(project);
    const bootout = { args: ['launchctl', 'bootout', `${domain}/${label}`], optional: true };
    return { name: 'launchd', file, unit: label, text: project && launchdPlist(world, project),
      install: [bootout, { args: ['launchctl', 'bootstrap', domain, file] }], uninstall: [bootout], removed: [],
      start: restart => [{ args: ['launchctl', 'kickstart', ...(restart ? ['-k'] : []), `${domain}/${label}`] }] };
  }
  return { name: 'unsupported', file: null, unit: null };
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

/** The running service helper's record, or null: reply-link.mjs writes it in the helper's inbox.json. */
function runningService(env, project = null) {
  const record = readJson(helperFiles(env, project).inbox);
  return record?.service && alive(record.pid) ? record : null;
}

/** The main project folder's helper script, when it is new enough to run as this project's own helper; else prints
 *  why not. */
function usable(world) {
  const found = primaryScript(world.script);
  if (found?.protocol >= PROJECT_PROTOCOL) return found;
  world.out(found ? 'HELPER=outdated' : 'HELPER=no-project');
  world.out(found ? 'REASON=your main project folder holds older code: update it, then install again'
    : 'REASON=run this from a project folder');
  return null;
}

/** The calling project's main checkout when it has its own helper, else null. */
function ownProject(world) {
  const root = primaryScript(world.script)?.root;
  return root && existsSync(helperFiles(world.env, root).current) ? root : null;
}

function install(world, dryRun) {
  const found = usable(world);
  if (!found) return;
  const project = found.root;
  const files = helperFiles(world.env, project);
  const system = systemOf(world, project);
  const current = { script: found.script, protocol: found.protocol, project };
  if (dryRun) {
    world.out('DRY_RUN=yes');
    world.out(`PROJECT=${files.id}`);
    if (system.unit) world.out(`SERVICE=${system.unit}`);
    world.out(`FILE=${files.launcher}\n${LAUNCHER}`);
    world.out(`FILE=${files.current}\n${JSON.stringify(current)}\n`);
    if (system.file) world.out(`FILE=${system.file}\n${system.text}`);
    for (const { args } of system.install ?? [{ args: [world.execPath, files.launcher] }]) world.out(`COMMAND=${args.join(' ')}`);
    world.out(`LEAVE=${files.apps}`);
    return;
  }
  const had = existsSync(files.current);
  mkdirSync(files.dir, { recursive: true, mode: 0o700 });
  writeFileSync(files.launcher, LAUNCHER, { mode: 0o600 });
  pointCurrent(found, world.env, project);
  computerId(world.env);
  if (!system.file) {
    if (!runningService(world.env, project)) world.spawn(world.execPath, [files.launcher], world.env);
    world.out('HELPER=unsupported');
    world.out('REASON=this system has no service manager WongStack knows: the helper runs until the computer restarts');
  } else {
    mkdirSync(dirname(system.file), { recursive: true });
    writeFileSync(system.file, system.text, { mode: 0o644 });
    const worked = runAll(world, system.install);
    world.out(worked ? 'HELPER=installed' : 'HELPER=failed');
    world.out(`SYSTEM=${system.name}`);
    world.out(`SERVICE=${system.unit}`);
    world.out(`UNIT=${system.file}`);
    // A first install with no service keeps the shared helper: its own files would make that helper skip the project.
    if (!worked && !had) {
      runAll(world, system.uninstall.map(command => ({ ...command, optional: true })));
      removeOwn(world, project, system);
      return;
    }
  }
  // Only once its helper runs: that helper also leaves at the start of each round, before it claims a run.
  const left = leaveShared(project, world.env);
  world.out(`LEFT_SHARED=${left.left ? 'yes' : 'no'}`);
  world.out(`RUNS_KEPT=${left.runs}`);
  world.out(`ITEMS_MOVED=${left.items}`);
}

/** True when another project's own helper is still installed: the template unit stays for it. */
function othersInstalled(world, project) {
  const dir = join(wongDir(world.env), 'helpers'), mine = helperFiles(world.env, project).id;
  try { return readdirSync(dir).some(id => id !== mine && existsSync(join(dir, id, 'current.json'))); } catch { return false; }
}

/** The files that make `project`'s own helper: on Linux every project's helper shares the template unit, so it goes
 *  with the last one. */
function ownFiles(world, project, system) {
  const files = helperFiles(world.env, project);
  const unitFile = system.file && (world.platform !== 'linux' || !othersInstalled(world, project)) ? system.file : null;
  return [unitFile, files.current, files.launcher].filter(Boolean);
}

const removeOwn = (world, project, system) => { for (const file of ownFiles(world, project, system)) rmSync(file, { force: true }); };

function uninstall(world, dryRun) {
  const project = ownProject(world);
  if (!project) { world.out('HELPER=not-installed'); return; }
  const system = systemOf(world, project);
  const commands = system.file ? [...system.uninstall, ...system.removed] : [];
  if (dryRun) {
    world.out('DRY_RUN=yes');
    for (const file of ownFiles(world, project, system)) world.out(`REMOVE=${file}`);
    for (const { args } of commands) world.out(`COMMAND=${args.join(' ')}`);
    world.out(`RETURN=${helperFiles(world.env).items}`);
    return;
  }
  if (system.file) runAll(world, system.uninstall);
  removeOwn(world, project, system);
  if (system.file) runAll(world, system.removed);
  const running = runningService(world.env, project);
  if (running) signal(running.pid, 'SIGTERM');
  // Once it stopped: no helper then delivers or closes its open items, and its run gaps would be lost.
  const back = rejoinShared(project, world.env);
  world.out(`RUNS_RETURNED=${back.runs}`);
  world.out(`ITEMS_RETURNED=${back.items}`);
  world.out('HELPER=uninstalled');
}

const installed = (world, system, project) => existsSync(helperFiles(world.env, project).current) && (!system.file || existsSync(system.file));

function status(world) {
  const root = primaryScript(world.script)?.root ?? null;
  const project = ownProject(world);
  const system = systemOf(world, project ?? root);
  world.out(`HELPER=${project && installed(world, system, project) ? 'installed' : 'not-installed'}`);
  world.out(`SYSTEM=${system.name}`);
  if (root) world.out(`SERVICE=${system.unit ?? 'none'}`);
  world.out(`RUNNING=${project && runningService(world.env, project) ? 'yes' : 'no'}`);
  world.out(`SCRIPT=${(project && readJson(helperFiles(world.env, project).current)?.script) ?? 'none'}`);
  // Whether the old shared helper still lists this project: it does until this project's helper is installed.
  if (root) world.out(`SHARED=${readApps(world.env).some(app => app.cwd === root) ? 'yes' : 'no'}`);
}

/** Restarts a helper that is not running `files`' current code, or starts a stopped one. */
function keepRunning(world, system, project) {
  const files = helperFiles(world.env, project);
  const wanted = readJson(files.current)?.protocol ?? 0;
  const running = runningService(world.env, project);
  if (running && (running.protocol ?? 0) >= wanted) return;
  if (!system.file) {
    if (running) signal(running.pid, 'SIGTERM');
    world.spawn(world.execPath, [files.launcher], world.env);
  } else runAll(world, system.start(Boolean(running)));
}

/** The session-start step: warn about an old Node, keep this project's own helper on its main checkout's code and off
 *  the shared one, or with none only start the shared one when it stopped. Never fails the session. */
function start(world) {
  let text = '';
  try { text = readFileSync(world.requiredTools, 'utf8'); } catch { /* no table: no warning */ }
  const advice = nodeAdvice(world.nodeVersion, text);
  if (advice) world.out(advice);
  const found = primaryScript(world.script);
  const project = ownProject(world);
  if (project) {
    const system = systemOf(world, project);
    if (!installed(world, system, project)) return;
    // Compared with this project's own main checkout only: another project's newer copy never moves it.
    if (found.protocol >= PROJECT_PROTOCOL) pointCurrent(found, world.env, project);
    // The running helper keeps its own ledger; it copies the shared one each round.
    leaveShared(project, world.env, { ledger: false });
    keepRunning(world, system, project);
    return;
  }
  const system = systemOf(world);
  if (!existsSync(helperFiles(world.env).current) || (system.file && !existsSync(system.file))) return;
  if (found) rememberApp(dirname(found.script), world.env);
  // Never pointed at this copy, only started when it stopped: moving it between projects' copies let one project's
  // code judge another project's runs.
  if (!runningService(world.env)) keepRunning(world, system, null);
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
