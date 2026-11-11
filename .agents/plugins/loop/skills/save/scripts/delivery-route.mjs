#!/usr/bin/env node
// Which way this checkout saves: the profile's `route`, else `github` with a working `gh` and a GitHub origin, else
// `local`. Exit 1 on a RouteError. `run <route> <command…>` runs the profile's `routeRun` for a route it owns.
import { execFileSync, spawnSync } from 'node:child_process';
import { isMain } from '../../../scripts/lib/cli.mjs';
import { originHost, RouteError } from '../../../scripts/lib/origin.mjs';
import { slot } from '../../../scripts/slot.mjs';

export { originHost, RouteError };

const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/** `github` for a GitHub origin with a working `gh`, else `local`. */
export function ownRoute(root) {
  const github = originHost(git(root, 'remote', 'get-url', 'origin')) === 'github.com';
  return github && spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0 ? 'github' : 'local';
}

/** A checkout's route: `{ route, root }`. */
export async function delivery(cwd = process.cwd()) {
  const root = git(cwd, 'rev-parse', '--show-toplevel') ?? cwd;
  const named = await slot('route', {}, root);
  return { route: (!named.empty && named.value) || ownRoute(root), root };
}

/** Runs one command of a route the profile owns; its exit code, or 2 when no part runs it. */
export async function runRoute(args, root) {
  const found = await slot('routeRun', { args }, root);
  if (found.empty) console.error(`delivery-route: this project runs no ${args[0]} route`);
  return found.empty ? 2 : typeof found.value === 'number' ? found.value : 0;
}

if (isMain(import.meta.url)) {
  const [first, ...rest] = process.argv.slice(2);
  try {
    if (first === 'run') process.exitCode = await runRoute(rest);
    else console.log((await delivery(first || process.cwd())).route);
  } catch (error) {
    if (!(error instanceof RouteError)) throw error;
    console.error(`delivery-route: ${error.message}`);
    process.exitCode = 1;
  }
}
