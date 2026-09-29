#!/usr/bin/env node
// Lists this repo's other active work, so planning can spot an overlap before it starts.
//
//     node .claude/skills/explore/scripts/other-work.mjs
//
// Git is the base: every worktree of this repo, from the primary checkout, so another project
// never appears. A worktree counts when it has unsaved files, commits not on the default branch,
// an active OpenSpec change on disk (saved or not), or a running agent; the current worktree never
// counts. Paseo, when it answers, adds each workspace's name and whether an agent is running in it.
// `gh` adds open pull requests not opened by a bot, each folded into the worktree on its branch.
// The script gathers facts only; the agent judges what overlaps.
//
// Prints one JSON object: { ok, workspaces[], pullRequests[], notes[] }. A Paseo or GitHub failure
// becomes a note, never a failure. Exit codes: 0 ok, 2 bad input or not inside a git checkout.
//
// Node built-ins only. OTHER_WORK_PASEO_BIN overrides the `paseo` found on PATH.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { EXIT, findPaseo, paseo } from '../../routine/scripts/lib/paseo.mjs';

const USAGE = 'usage: other-work.mjs  prints this repo\'s other active work (worktrees, their plans, open pull requests) as JSON';
const BUSY = new Set(['running', 'initializing']);
const LIMIT = 20;
const GH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Pure helpers

/** True when `file` is `dir` or inside it. */
export function inside(dir, file) {
  if (!dir || !file) return false;
  const base = dir.endsWith(path.sep) ? dir.slice(0, -1) : dir;
  return file === base || file.startsWith(base + path.sep);
}

/** `git worktree list --porcelain` → [{ path, branch }], leaving out a bare repo. */
export function parseWorktrees(porcelain) {
  const trees = [];
  for (const block of porcelain.split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const dir = lines.find(line => line.startsWith('worktree '))?.slice('worktree '.length);
    if (!dir || lines.includes('bare')) continue;
    const ref = lines.find(line => line.startsWith('branch '))?.slice('branch '.length) ?? null;
    trees.push({ path: dir, branch: ref ? ref.replace(/^refs\/heads\//, '') : null });
  }
  return trees;
}

/** A pull request opened by a bot: `is_bot`, an `app/` login, or a `[bot]` login. */
export function isBot(author) {
  const login = author?.login ?? '';
  return Boolean(author?.is_bot) || login.startsWith('app/') || login.endsWith('[bot]');
}

/** The active change names a list of paths touches under `openspec/changes/`, archive left out. */
export function changesIn(files) {
  const names = new Set();
  for (const file of files) {
    const match = /^openspec\/changes\/([^/]+)\//.exec(file);
    if (match && match[1] !== 'archive') names.add(match[1]);
  }
  return [...names];
}

/** A worktree is live work when it holds something unpublished or an agent runs in it. */
export function isLive(tree) {
  return tree.busy || tree.changes.length > 0 || tree.dirtyFiles.length > 0 || tree.commitsAhead > 0;
}

/**
 * Splits open pull requests: bots and the current branch are dropped, one on a listed worktree's
 * branch folds into it as `pr`, and the rest come back as entries.
 */
export function foldPullRequests(prs, workspaces, currentBranch) {
  const entries = [];
  for (const pr of prs) {
    if (isBot(pr.author) || (currentBranch && pr.headRefName === currentBranch)) continue;
    const tree = workspaces.find(ws => ws.branch && ws.branch === pr.headRefName);
    if (tree) { tree.pr = { number: pr.number, url: pr.url }; continue; }
    const files = (pr.files ?? []).map(file => file.path).filter(Boolean);
    entries.push({
      number: pr.number, title: pr.title, branch: pr.headRefName, author: pr.author?.login ?? null, url: pr.url,
      changes: changesIn(files), files: files.slice(0, LIMIT),
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Git and files

function tryGit(cwd, ...args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
  } catch { return null; }
}

function realpath(file) {
  try { return realpathSync(file); } catch { return file; }
}

const lines = text => (text ?? '').split('\n').filter(Boolean);
const firstLine = text => String(text ?? '').trim().split('\n')[0];

/** `main` when it exists here or on origin, else the forge's default branch, else null. No fetch. */
function defaultBranch(cwd) {
  const has = ref => tryGit(cwd, 'rev-parse', '--verify', '--quiet', ref) !== null;
  if (has('refs/heads/main') || has('refs/remotes/origin/main')) return 'main';
  try {
    const name = execFileSync('gh', ['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: GH_TIMEOUT_MS }).trim();
    return name || null;
  } catch { return null; }
}

/** The ref to compare against: origin's copy of the default branch when there is one. */
function baseRef(cwd, branch) {
  if (!branch) return null;
  if (tryGit(cwd, 'rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`) !== null) return `origin/${branch}`;
  return tryGit(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`) !== null ? branch : null;
}

/** Active OpenSpec changes in a worktree, read from disk so unsaved plans count. */
function changesOnDisk(dir) {
  const root = path.join(dir, 'openspec', 'changes');
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return []; }
  return entries.filter(entry => entry.isDirectory() && entry.name !== 'archive').map(entry => {
    let title = null;
    try {
      title = /^#\s+(.+)$/m.exec(readFileSync(path.join(root, entry.name, 'proposal.md'), 'utf8'))?.[1].trim() ?? null;
    } catch { /* no proposal yet */ }
    return { name: entry.name, title };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** The archived change folders a list of paths adds under `openspec/changes/archive/`. */
export function archivedIn(files) {
  const dirs = new Set();
  for (const file of files) {
    const match = /^(openspec\/changes\/archive\/[^/]+)\//.exec(file);
    if (match) dirs.add(match[1]);
  }
  return [...dirs];
}

/**
 * One worktree's unpublished state, compared with `base`. A branch whose archived change is already
 * on `base` shipped by squash merge, so its leftover commits count as none ahead.
 */
function worktreeState(dir, base) {
  const dirty = lines(tryGit(dir, 'status', '--porcelain')).map(line => line.slice(3));
  let ahead = base ? Number(tryGit(dir, 'rev-list', '--count', `${base}..HEAD`) ?? 0) : 0;
  let changed = base && ahead ? lines(tryGit(dir, 'diff', '--name-only', `${base}...HEAD`)) : [];
  if (archivedIn(changed).some(folder => tryGit(dir, 'cat-file', '-e', `${base}:${folder}`) !== null)) {
    ahead = 0;
    changed = [];
  }
  return {
    changes: changesOnDisk(dir),
    changedFiles: changed.slice(0, LIMIT),
    dirtyFiles: dirty.slice(0, LIMIT),
    commitsAhead: Number.isFinite(ahead) ? ahead : 0,
  };
}

// ---------------------------------------------------------------------------
// Paseo and GitHub

/** Paseo's names and running agents, or a note when Paseo is missing, down, or changed. */
async function paseoFacts(env, notes) {
  const empty = { workspaces: [], agents: [] };
  let bin;
  try { bin = findPaseo(env, 'OTHER_WORK_PASEO_BIN'); } catch {
    notes.push('Paseo is not installed, so workspace names and running agents were not checked.');
    return empty;
  }
  try {
    const workspaces = await paseo(bin, ['workspace', 'ls']);
    const agents = await paseo(bin, ['ls', '-g']);
    const ok = (list, fields) => Array.isArray(list) && list.every(item => fields.every(field => typeof item?.[field] === 'string'));
    if (!ok(workspaces, ['cwd']) || !ok(agents, ['status', 'cwd'])) throw new Error("Paseo's output has changed");
    const home = env.HOME || homedir();
    return {
      workspaces: workspaces.map(ws => ({ name: ws.name, cwd: realpath(ws.cwd.replace(/^~(?=\/|$)/, home)) })),
      agents: agents.map(agent => ({ status: agent.status, cwd: realpath(agent.cwd.replace(/^~(?=\/|$)/, home)) })),
    };
  } catch (error) {
    notes.push(`Workspace names and running agents were not checked: ${firstLine(error.message)}.`);
    return empty;
  }
}

/** Open pull requests, or null with a note when `gh` cannot answer. */
function openPullRequests(cwd, notes) {
  try {
    const out = execFileSync('gh', ['pr', 'list', '--state', 'open', '--limit', '50', '--json', 'number,title,headRefName,author,url,files'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: GH_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
    const prs = JSON.parse(out);
    if (!Array.isArray(prs)) throw new Error('gh printed something other than a list');
    return prs;
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'gh is not installed' : firstLine(error.stderr) || firstLine(error.message);
    notes.push(`Open pull requests were not checked: ${reason.replace(/\.$/, '')}.`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main

export async function otherWork(cwd = process.cwd(), env = process.env) {
  const repo = primaryRoot(cwd);
  const notes = [];
  const current = realpath(repo.root);
  const currentBranch = tryGit(repo.root, 'symbolic-ref', '--quiet', '--short', 'HEAD');
  const branch = defaultBranch(repo.primary);
  const base = baseRef(repo.primary, branch);
  if (!base) notes.push('The default branch was not found, so commits not yet published were not counted.');
  const facts = await paseoFacts(env, notes);

  const workspaces = [];
  for (const tree of parseWorktrees(tryGit(repo.primary, 'worktree', 'list', '--porcelain') ?? '')) {
    const dir = realpath(tree.path);
    if (dir === current || !existsSync(dir)) continue;
    const named = facts.workspaces.find(ws => ws.cwd === dir);
    const entry = {
      name: named?.name || path.basename(dir),
      path: dir,
      branch: tree.branch,
      busy: facts.agents.some(agent => BUSY.has(agent.status) && inside(dir, agent.cwd)),
      ...worktreeState(dir, base),
    };
    if (isLive(entry)) workspaces.push(entry);
  }

  const prs = openPullRequests(repo.primary, notes);
  const pullRequests = prs ? foldPullRequests(prs, workspaces, currentBranch) : [];
  return { ok: true, workspaces, pullRequests, notes };
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  if (argv.length) {
    process.stderr.write(`Unknown argument ${argv[0]}.\n${USAGE}\n`);
    return EXIT.input;
  }
  try {
    process.stdout.write(`${JSON.stringify(await otherWork(process.cwd(), env), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    if (!(error instanceof PrimaryRootError)) throw error;
    process.stdout.write(`${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`);
    return EXIT.input;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
