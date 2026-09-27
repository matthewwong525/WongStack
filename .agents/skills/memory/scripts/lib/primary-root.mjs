#!/usr/bin/env node
// The primary worktree: where durable secrets live (wiki/development/secrets.md). Every WongStack script finds it here.
//
//     node .claude/skills/memory/scripts/lib/primary-root.mjs [dir]   # prints the primary checkout, or exits 1
//
// Equal git and common dirs mean the active checkout is the primary. Otherwise the primary is the parent of the
// common dir, and Git must agree that it is a checkout's top level; a bare repo's worktree fails that check.
// Skills are copied whole, so another skill imports this file by path; callers decide what a failure means.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export class PrimaryRootError extends Error {}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// { root, primary, linked, gitDir, commonDir }, or a PrimaryRootError that names what went wrong.
export function primaryRoot(cwd = process.cwd()) {
  let root, gitDir, commonDir;
  try {
    [root, gitDir, commonDir] = git(cwd, 'rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir').split('\n');
  } catch (error) {
    throw new PrimaryRootError(`not inside a Git checkout: ${String(error.stderr || error.message).trim().split('\n')[0]}`);
  }
  const linked = gitDir !== commonDir;
  const primary = linked ? dirname(commonDir) : root;
  let resolved;
  try { resolved = git(primary, 'rev-parse', '--show-toplevel'); } catch { resolved = ''; }
  if (resolved !== primary) throw new PrimaryRootError(`the parent of ${commonDir} is not a checkout, so the primary worktree is unknown`);
  return { root, primary, linked, gitDir, commonDir };
}

const USAGE = 'usage: primary-root.mjs [dir]  prints the primary checkout of dir (default: the current directory)';

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let parsed;
  try {
    parsed = parseArgs({ options: { help: { type: 'boolean' } }, allowPositionals: true, strict: true });
  } catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    process.exit(2);
  }
  if (parsed.values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  try {
    console.log(primaryRoot(parsed.positionals[0] || process.cwd()).primary);
  } catch (error) {
    if (!(error instanceof PrimaryRootError)) throw error;
    console.error(`primary-root: ${error.message}`);
    process.exitCode = 1;
  }
}
