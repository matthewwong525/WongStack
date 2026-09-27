#!/usr/bin/env node
// Puts away what WongStack leaves behind, touching nothing it did not make.
// USAGE below lists the commands.
//
// `scratch` makes the git-ignored `.scratch/` folder at the checkout root and
// prints its path; it adds `.scratch/` to git's local exclude file when git does
// not ignore the folder yet. `close` checks that this workspace is saved, then
// hands off to a detached child that waits for this chat's reply to end,
// archives the workspace, stops processes left running from it, and deletes its
// local branch when its pull request merged at the local tip. `sweep` is the
// background tidy-up the session-start hook starts, at most once every 6 hours
// per repo: it archives this repo's saved workspaces idle 3+ days, stops
// processes whose worktree is gone, and deletes `wong-*` temp entries and
// primary-checkout scratch files untouched for a day. `sweep --report` prints
// the last results as one plain line and clears them.
//
// Every destructive step checks ownership first: a worktree of this repo, a
// `wong-` name, this user's process, a working folder that is gone. The primary
// checkout and the current chat's workspace are never archived. Stamp, lock,
// and report live in <git-common-dir>/wong-tidy/, shared by every worktree.
//
// Prints one JSON object on stdout (`sweep --report` prints plain text). Exit
// codes: 0 ok, 2 bad input or refused, 3 Paseo not installed, 4 daemon not
// answering, 5 Paseo's output has changed. The sweep never fails for Paseo: it
// skips that part and tidies the rest.
//
// Node built-ins only. TIDY_PASEO_BIN overrides the `paseo` found on PATH;
// PASEO_HOME moves Paseo's folder (default ~/.paseo), whose `worktrees/` holds
// the worktrees whose leftover processes may be stopped.

import { execFileSync, spawn } from 'node:child_process';
import {
  appendFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync,
  renameSync, rmdirSync, rmSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { EXIT, PaseoError, findPaseo, paseo } from './lib/paseo.mjs';

const USAGE = `usage: tidy.mjs scratch [--dry-run]         make .scratch/ here and print its path
       tidy.mjs close [--dry-run]           close this workspace once this reply ends
       tidy.mjs sweep [--report] [--dry-run] the background tidy-up; --report prints and clears its last line`;
const COMMANDS = ['scratch', 'close', 'sweep', 'close-child'];

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
export const IDLE_MS = 3 * DAY;
export const OLD_MS = DAY;
export const SWEEP_EVERY_MS = 6 * HOUR;
const LOCK_STALE_MS = HOUR;
const WAIT_SECONDS = 1800;
const BUSY = new Set(['running', 'initializing']);
const DELETED = ' (deleted)';
const SELF = fileURLToPath(import.meta.url);

// ---------------------------------------------------------------------------
// Pure helpers: the ownership tests

/** True when `file` is `dir` or inside it. */
export function inside(dir, file) {
  if (!dir || !file) return false;
  const base = dir.endsWith(path.sep) ? dir.slice(0, -1) : dir;
  return file === base || file.startsWith(base + path.sep);
}

/** A Paseo workspace is ours when it is a worktree of this repo, and never the primary checkout. */
export function ownWorkspace(ws, { commonDir, wsCommonDir, primary }) {
  return ws?.isolation === 'worktree' && Boolean(wsCommonDir) && wsCommonDir === commonDir && ws.cwd !== primary;
}

/**
 * Saved: a clean tree (ignored files, `.scratch/` included, do not count) and
 * no commit missing from every remote, unless the branch's pull request merged
 * at this commit. `porcelain` or `unpushed` null means git could not tell.
 */
export function savedState({ porcelain, unpushed, merged = false }) {
  if (porcelain === null || porcelain === undefined || unpushed === null || unpushed === undefined) {
    return { saved: false, reason: 'git could not read it', files: [] };
  }
  const files = porcelain.split('\n').filter(Boolean).map(line => line.slice(3));
  if (files.length) return { saved: false, reason: 'unsaved files', files };
  if (unpushed.trim() && !merged) return { saved: false, reason: 'commits on no remote', files: [] };
  return { saved: true, reason: null, files: [] };
}

/** `gh pr view`'s answer shows the pull request merged at exactly this commit. */
export function mergedAtTip(pr, tip) {
  return pr?.state === 'MERGED' && Boolean(tip) && pr.headRefOid === tip;
}

/**
 * Idle: no agent is running, and the newest activity is IDLE_MS old. Agents are
 * { status, updatedAt }; a workspace with no agents uses `fallbackMs`. An
 * unreadable time is never idle.
 */
export function isIdle(agents, now, { fallbackMs } = {}) {
  if (agents.some(agent => BUSY.has(agent.status))) return false;
  const times = agents.length ? agents.map(agent => Date.parse(agent.updatedAt)) : [fallbackMs];
  if (times.some(time => !Number.isFinite(time))) return false;
  return now - Math.max(...times) >= IDLE_MS;
}

/**
 * The pids to stop: this user's processes, not this one, whose working folder
 * was deleted, lies under one of `roots`, and lies in no `live` worktree.
 * `procs` are { pid, uid, cwd } with `cwd` as /proc/<pid>/cwd reads.
 */
export function orphanPids(procs, { uid, self, roots, live = [] }) {
  return procs.filter(proc => {
    if (proc.uid !== uid || proc.pid === self || !proc.cwd?.endsWith(DELETED)) return false;
    const cwd = proc.cwd.slice(0, -DELETED.length);
    return roots.some(root => inside(root, cwd)) && !live.some(dir => inside(dir, cwd));
  }).map(proc => proc.pid);
}

/** A temp entry is ours and old: a `wong-` name, this user's, and it and its top-level entries untouched OLD_MS. */
export function isOldTemp(entry, { uid, now }) {
  return entry.name.startsWith('wong-') && entry.uid === uid
    && [entry.mtimeMs, ...(entry.childMtimes ?? [])].every(time => now - time > OLD_MS);
}

export function emptyReport() {
  return { closed: [], left: [], stopped: 0, deleted: 0, freed: 0, branches: [], notes: [] };
}

/** Adds one run's results to the saved ones. */
export function mergeReports(a, b) {
  const x = { ...emptyReport(), ...a };
  const y = { ...emptyReport(), ...b };
  return {
    closed: [...x.closed, ...y.closed],
    left: [...x.left, ...y.left],
    stopped: x.stopped + y.stopped,
    deleted: x.deleted + y.deleted,
    freed: x.freed + y.freed,
    branches: [...x.branches, ...y.branches],
    notes: [...x.notes, ...y.notes],
  };
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quoted = names => names.map(name => `"${name}"`).join(', ');

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

/** The one line a session start prints, or '' when the tidy-up did nothing. */
export function reportLine(report) {
  const r = { ...emptyReport(), ...report };
  const parts = [];
  if (r.closed.length) parts.push(`closed ${plural(r.closed.length, 'workspace')} (${quoted(r.closed)})`);
  if (r.branches.length) parts.push(`deleted ${plural(r.branches.length, 'merged branch', 'merged branches')}`);
  if (r.stopped) parts.push(`stopped ${plural(r.stopped, 'leftover process', 'leftover processes')}`);
  if (r.deleted) parts.push(`deleted ${plural(r.deleted, 'old temp or scratch entry', 'old temp or scratch entries')}, freeing ${formatBytes(r.freed)}`);
  for (const { name, reason } of r.left) parts.push(`left "${name}" open: ${reason}`);
  parts.push(...r.notes);
  if (!parts.length) return '';
  const text = parts.join('; ');
  return `Tidy-up: ${text}.`;
}

// ---------------------------------------------------------------------------
// Git, files, and processes

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

function tryGit(cwd, ...args) {
  try { return git(cwd, ...args); } catch { return null; }
}

function realpath(file) {
  try { return realpathSync(file); } catch { return file; }
}

function here(cwd = process.cwd()) {
  try {
    return primaryRoot(cwd);
  } catch (error) {
    if (error instanceof PrimaryRootError) throw new PaseoError(EXIT.input, error.message);
    throw error;
  }
}

/** The worktree's own branch, tip, and saved-state inputs. */
function worktreeState(dir) {
  return {
    porcelain: tryGit(dir, 'status', '--porcelain'),
    unpushed: tryGit(dir, 'rev-list', 'HEAD', '--not', '--remotes'),
    branch: tryGit(dir, 'symbolic-ref', '--quiet', '--short', 'HEAD'),
    tip: tryGit(dir, 'rev-parse', 'HEAD'),
  };
}

/** The pull request for `branch`, as `gh pr view` shows it, or null without `gh` or a match. */
function pullRequest(dir, branch) {
  if (!branch) return null;
  try {
    return JSON.parse(execFileSync('gh', ['pr', 'view', branch, '--json', 'state,headRefOid'], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }));
  } catch { return null; }
}

function tidyDir(commonDir) {
  const dir = path.join(commonDir, 'wong-tidy');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readJsonFile(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function writeJsonFile(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temp, file);
}

/** Merges `part` into <commonDir>/wong-tidy/report.json. */
export function addToReport(commonDir, part) {
  if (!reportLine(part)) return;
  const file = path.join(tidyDir(commonDir), 'report.json');
  writeJsonFile(file, mergeReports(readJsonFile(file) ?? {}, part));
}

/** The last tidy-up's line, once: reads and deletes the report. '' when there is none. */
export function takeReport(commonDir) {
  const file = path.join(commonDir, 'wong-tidy', 'report.json');
  if (!existsSync(file)) return '';
  const report = readJsonFile(file);
  rmSync(file, { force: true });
  return report ? reportLine(report) : '';
}

/** One lock file: false while another holder took it under LOCK_STALE_MS ago. */
export function takeLock(file, now = Date.now()) {
  try {
    writeFileSync(file, String(process.pid), { flag: 'wx' });
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  try {
    if (now - statSync(file).mtimeMs < LOCK_STALE_MS) return false;
  } catch { /* gone meanwhile */ }
  rmSync(file, { force: true });
  try { writeFileSync(file, String(process.pid), { flag: 'wx' }); return true; } catch { return false; }
}

function sizeOf(file) {
  let stat;
  try { stat = lstatSync(file); } catch { return 0; }
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  try { for (const name of readdirSync(file)) total += sizeOf(path.join(file, name)); } catch { /* unreadable */ }
  return total;
}

function uid() {
  return typeof process.getuid === 'function' ? process.getuid() : undefined;
}

/** Every process's { pid, uid, cwd } from /proc, or null where there is no /proc. */
function readProcs(procRoot = '/proc') {
  let names;
  try { names = readdirSync(procRoot); } catch { return null; }
  if (!existsSync(path.join(procRoot, 'self', 'cwd'))) return null;
  const procs = [];
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const dir = path.join(procRoot, name);
      procs.push({ pid: Number(name), uid: statSync(dir).uid, cwd: readlinkSync(path.join(dir, 'cwd')) });
    } catch { /* gone, or not ours to read */ }
  }
  return procs;
}

/** Stops orphaned processes with SIGTERM; returns how many, or null without /proc. */
function stopOrphans({ roots, live, dryRun }) {
  const procs = readProcs();
  if (!procs) return null;
  const pids = orphanPids(procs, { uid: uid(), self: process.pid, roots, live }).filter(pid => {
    const cwd = procs.find(proc => proc.pid === pid).cwd.slice(0, -DELETED.length);
    return !existsSync(cwd);
  });
  let stopped = 0;
  for (const pid of pids) {
    if (dryRun) { stopped++; continue; }
    try { process.kill(pid, 'SIGTERM'); stopped++; } catch { /* already gone */ }
  }
  return stopped;
}

function paseoWorktrees(env) {
  return path.join(env.PASEO_HOME || path.join(homedir(), '.paseo'), 'worktrees');
}

/** This repo's worktrees still on disk, and the parent folders of its linked ones under Paseo's worktrees folder. */
function worktrees(repo, env) {
  const list = (tryGit(repo.primary, 'worktree', 'list', '--porcelain') ?? '')
    .split('\n').filter(line => line.startsWith('worktree ')).map(line => line.slice('worktree '.length));
  const base = realpath(paseoWorktrees(env));
  const parents = [...new Set(list.filter(dir => dir !== repo.primary)
    .map(dir => path.dirname(realpath(dir))).filter(dir => inside(base, dir) && dir !== base))];
  return { live: list.filter(dir => existsSync(dir)).map(realpath), parents };
}

// ---------------------------------------------------------------------------
// Paseo

function checkList(data, what, fields) {
  if (!Array.isArray(data) || data.some(item => fields.some(field => typeof item?.[field] !== 'string'))) {
    throw new PaseoError(EXIT.client, `Paseo's ${what} output has changed: expected a list with ${fields.join(', ')}.`);
  }
  return data;
}

async function listWorkspaces(bin) {
  return checkList(await paseo(bin, ['workspace', 'ls']), 'workspace ls', ['workspaceId', 'cwd']);
}

async function listAgents(bin) {
  const home = homedir();
  return checkList(await paseo(bin, ['ls', '-g']), 'ls', ['id', 'status', 'cwd'])
    .map(agent => ({ id: agent.id, status: agent.status, cwd: realpath(agent.cwd.replace(/^~(?=\/|$)/, home)) }));
}

// ---------------------------------------------------------------------------
// Commands

function scratch({ dryRun }) {
  const root = tryGit(process.cwd(), 'rev-parse', '--show-toplevel');
  if (!root) throw new PaseoError(EXIT.input, 'Not inside a git checkout.');
  const dir = path.join(root, '.scratch');
  let excluded = false;
  if (tryGit(root, 'check-ignore', '-q', '.scratch/x') === null) {
    const exclude = git(root, 'rev-parse', '--path-format=absolute', '--git-path', 'info/exclude');
    if (!dryRun) {
      mkdirSync(path.dirname(exclude), { recursive: true });
      const text = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
      appendFileSync(exclude, `${text && !text.endsWith('\n') ? '\n' : ''}.scratch/\n`);
    }
    excluded = true;
  }
  if (!dryRun) mkdirSync(dir, { recursive: true });
  return { ok: true, ...(dryRun ? { dryRun: true } : {}), path: dir, excluded };
}

const refuse = message => new PaseoError(EXIT.input, message);

function refusal(state) {
  if (state.reason === 'unsaved files') return `This workspace has unsaved work: ${state.files.join(', ')}. Save it first.`;
  if (state.reason === 'commits on no remote') return 'This workspace has commits that are not saved online yet. Save them first.';
  return 'Git could not read this workspace, so it stays open.';
}

async function close({ dryRun }, env) {
  const repo = here();
  if (!repo.linked) throw refuse('This is the main checkout, which never closes.');
  const agentId = env.PASEO_AGENT_ID?.trim();
  if (!agentId) throw refuse('This chat is not a Paseo agent, so there is no workspace to close.');
  const state = worktreeState(repo.root);
  const merged = mergedAtTip(pullRequest(repo.root, state.branch), state.tip);
  const saved = savedState({ ...state, merged });
  if (!saved.saved) throw refuse(refusal(saved));
  const bin = findPaseo(env, 'TIDY_PASEO_BIN');
  const root = realpath(repo.root);
  const ws = (await listWorkspaces(bin)).find(item => realpath(item.cwd) === root);
  if (!ws) throw refuse('Paseo has no workspace for this folder.');
  const job = {
    agentId, workspaceId: ws.workspaceId, name: ws.name || path.basename(root), worktree: root,
    primary: repo.primary, commonDir: repo.commonDir, branch: state.branch, deleteBranch: merged,
  };
  if (dryRun) return { ok: true, dryRun: true, job };
  const child = spawn(process.execPath, [SELF, 'close-child'], {
    cwd: repo.primary, detached: true, stdio: 'ignore', env: { ...env, TIDY_CLOSE_JOB: JSON.stringify(job) },
  });
  child.on('error', () => {});
  child.unref();
  return {
    ok: true, workspaceId: ws.workspaceId, name: job.name, branch: job.branch, deleteBranch: merged,
    message: 'Closing this workspace once this reply ends.',
  };
}

/** The detached half of `close`: wait, archive, stop leftovers, delete a merged branch, report. */
async function closeChild(env) {
  const job = JSON.parse(env.TIDY_CLOSE_JOB || 'null');
  if (!job?.workspaceId) throw refuse('close-child runs only from close.');
  const report = emptyReport();
  try {
    const bin = findPaseo(env, 'TIDY_PASEO_BIN');
    let waited = null;
    try { waited = await paseo(bin, ['wait', job.agentId, '--timeout', String(WAIT_SECONDS)]); } catch { /* reported below */ }
    if (!waited || BUSY.has(waited.status)) {
      report.left.push({ name: job.name, reason: 'the chat never finished, so it was not closed' });
    } else {
      await paseo(bin, ['workspace', 'archive', job.workspaceId]);
      report.closed.push(job.name);
      report.stopped += stopOrphans({ roots: [job.worktree], live: [] }) ?? 0;
      if (job.branch && job.deleteBranch) {
        if (tryGit(job.primary, 'branch', '-D', job.branch) === null) report.notes.push(`kept the branch ${job.branch}: git would not delete it`);
        else report.branches.push(job.branch);
      } else if (job.branch) {
        report.notes.push(`kept the branch ${job.branch}: its pull request did not merge at its last commit`);
      }
    }
  } catch (error) {
    report.left.push({ name: job.name, reason: `it could not be closed (${error.message})` });
  }
  addToReport(job.commonDir, report);
  return { ok: true, ...report };
}

/** Archives this repo's idle, saved workspaces; returns the archived worktree paths. */
async function sweepWorkspaces(repo, env, { now, dryRun, report, notes }) {
  const archived = [];
  let bin;
  try { bin = findPaseo(env, 'TIDY_PASEO_BIN'); } catch { notes.push('Paseo is not installed: no workspaces checked.'); return archived; }
  let workspaces, agents;
  try {
    [workspaces, agents] = [await listWorkspaces(bin), await listAgents(bin)];
  } catch (error) {
    notes.push(`Skipped the workspaces: ${error.message}`);
    if (error.code === EXIT.client) report.notes.push("skipped closing idle workspaces: Paseo's output has changed");
    return archived;
  }
  const current = agents.find(agent => agent.id === env.PASEO_AGENT_ID)?.cwd;
  const skip = [realpath(repo.root), current].filter(Boolean);
  for (const ws of workspaces) {
    const dir = realpath(ws.cwd);
    if (ws.isolation !== 'worktree' || !existsSync(dir) || skip.some(file => inside(dir, file))) continue;
    const [gitDir, wsCommonDir] = (tryGit(dir, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir') ?? '').split('\n');
    if (!ownWorkspace({ ...ws, cwd: dir }, { commonDir: repo.commonDir, wsCommonDir, primary: realpath(repo.primary) })) continue;
    const mine = [];
    for (const agent of agents.filter(item => inside(dir, item.cwd))) {
      let updatedAt = null;
      if (!BUSY.has(agent.status)) {
        try { updatedAt = (await paseo(bin, ['inspect', agent.id]))?.UpdatedAt ?? null; } catch { /* not idle */ }
      }
      mine.push({ status: agent.status, updatedAt });
    }
    let fallbackMs;
    try { fallbackMs = statSync(path.join(gitDir, 'HEAD')).mtimeMs; } catch { /* never idle */ }
    if (!isIdle(mine, now, { fallbackMs })) continue;
    const name = ws.name || path.basename(dir);
    const state = worktreeState(dir);
    const merged = state.porcelain === '' && Boolean(state.unpushed) && mergedAtTip(pullRequest(dir, state.branch), state.tip);
    const saved = savedState({ ...state, merged });
    if (!saved.saved) { report.left.push({ name, reason: 'it has unsaved work' }); continue; }
    try {
      if (!dryRun) await paseo(bin, ['workspace', 'archive', ws.workspaceId]);
      report.closed.push(name);
      archived.push(dir);
    } catch (error) {
      report.left.push({ name, reason: `it could not be closed (${error.message})` });
    }
  }
  return archived;
}

/** Deletes old `wong-*` entries in the temp folder. */
function sweepTemp(dir, { now, dryRun, report }) {
  let names;
  try { names = readdirSync(dir).filter(name => name.startsWith('wong-')); } catch { return; }
  for (const name of names) {
    const file = path.join(dir, name);
    try {
      const stat = lstatSync(file);
      const childMtimes = stat.isDirectory() ? readdirSync(file).map(child => lstatSync(path.join(file, child)).mtimeMs) : [];
      if (!isOldTemp({ name, uid: stat.uid, mtimeMs: stat.mtimeMs, childMtimes }, { uid: uid(), now })) continue;
      const size = sizeOf(file);
      if (!dryRun) rmSync(file, { recursive: true, force: true });
      report.deleted++;
      report.freed += size;
    } catch { /* gone, or not ours to read */ }
  }
}

/** Deletes files untouched OLD_MS under `dir`, then its old empty subfolders; never `dir` itself. */
function sweepScratch(dir, { now, dryRun, report }) {
  let names;
  try { names = readdirSync(dir); } catch { return; }
  for (const name of names) {
    const file = path.join(dir, name);
    try {
      const stat = lstatSync(file);
      if (stat.isDirectory()) {
        sweepScratch(file, { now, dryRun, report });
        if (!dryRun && readdirSync(file).length === 0 && now - stat.mtimeMs > OLD_MS) rmdirSync(file);
      } else if (now - stat.mtimeMs > OLD_MS) {
        if (!dryRun) unlinkSync(file);
        report.deleted++;
        report.freed += stat.size;
      }
    } catch { /* gone meanwhile */ }
  }
}

async function sweep({ dryRun, report: printReport }, env) {
  const repo = here();
  const dir = tidyDir(repo.commonDir);
  if (printReport) return { text: takeReport(repo.commonDir) };
  const now = Date.now();
  const lock = path.join(dir, 'sweep.lock');
  const stamp = path.join(dir, 'last-sweep');
  if (!dryRun && !takeLock(lock, now)) return { ok: true, skipped: 'another tidy-up is running' };
  try {
    if (!dryRun && existsSync(stamp) && now - statSync(stamp).mtimeMs < SWEEP_EVERY_MS) {
      return { ok: true, skipped: 'the last tidy-up began under 6 hours ago' };
    }
    if (!dryRun) writeFileSync(stamp, `${new Date(now).toISOString()}\n`);
    const report = emptyReport();
    const notes = [];
    const archived = await sweepWorkspaces(repo, env, { now, dryRun, report, notes });
    const trees = worktrees(repo, env);
    const stopped = stopOrphans({ roots: [...trees.parents, ...archived], live: trees.live.filter(tree => !archived.includes(tree)), dryRun });
    if (stopped === null) notes.push('No /proc here, so leftover processes were not checked.');
    else report.stopped += stopped;
    sweepTemp(tmpdir(), { now, dryRun, report });
    sweepScratch(path.join(repo.primary, '.scratch'), { now, dryRun, report });
    if (!dryRun) addToReport(repo.commonDir, report);
    return { ok: true, ...(dryRun ? { dryRun: true } : {}), ...report, ...(notes.length ? { skippedNotes: notes } : {}) };
  } finally {
    if (!dryRun) rmSync(lock, { force: true });
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (const arg of rest) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--report' && command === 'sweep') flags.report = true;
    else throw new PaseoError(EXIT.input, `Unknown argument ${arg}.\n${USAGE}`);
  }
  if (!COMMANDS.includes(command)) throw new PaseoError(EXIT.input, `Unknown command "${command}". Use scratch, close, or sweep.`);
  return { command, flags };
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 0 || argv.includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  try {
    const { command, flags } = parseArgs(argv);
    if (command === 'sweep' && flags.report) {
      const { text } = await sweep(flags, env);
      if (text) process.stdout.write(`${text}\n`);
      return EXIT.ok;
    }
    const run = { scratch: () => scratch(flags), close: () => close(flags, env), sweep: () => sweep(flags, env), 'close-child': () => closeChild(env) };
    process.stdout.write(`${JSON.stringify(await run[command](), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof PaseoError ? error.code : 1;
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: error.message }, null, 2)}\n`);
    return code;
  }
}

function isMain() {
  try { return realpathSync(process.argv[1]) === realpathSync(SELF); } catch { return false; }
}

if (isMain()) process.exitCode = await main();
