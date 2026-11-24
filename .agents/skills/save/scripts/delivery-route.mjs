#!/usr/bin/env node
// Which way this checkout saves: `artifacts` or `app` by its address and install record, else `github` with a working
// `gh` and a GitHub origin, else `local`. Exit 1 on a RouteError. `run <route> <command…>` runs an artifacts/app step.
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { isMain } from '../../../loop/scripts/lib/cli.mjs';
import { originHost, RouteError } from '../../../loop/scripts/lib/origin.mjs';
import { wongDelivery } from '../../../loop/routes/route.mjs';

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
  const { route } = wongDelivery(root);
  return { route: route === 'github' ? ownRoute(root) : route, root };
}

const ROUTES = join(import.meta.dirname, '../../../loop/routes');
const ROUTE_SCRIPTS = { artifacts: 'artifacts-run.mjs', app: 'app-change.mjs' };

/** Runs one command of the artifacts or app route; its exit code, or 2 for another route. */
export async function runRoute([route, ...rest], root = git(process.cwd(), 'rev-parse', '--show-toplevel') ?? process.cwd()) {
  // `node` by name, as the shell scripts call it, so a test's stand-in node answers too.
  const run = (command, args) => spawnSync(command, args, { stdio: 'inherit', cwd: root }).status ?? 1;
  if (route === 'artifacts' && rest[0] === 'heads') return run('git', ['ls-remote', '--heads', 'origin', ...rest.slice(1)]);
  if (route === 'artifacts' && rest[0] === 'publish') return run('bash', [join(ROUTES, 'publish-artifacts.sh'), ...rest.slice(1)]);
  if (!ROUTE_SCRIPTS[route]) {
    console.error(`delivery-route: this project runs no ${route} route`);
    return 2;
  }
  return run('node', [join(ROUTES, ROUTE_SCRIPTS[route]), ...rest]);
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
