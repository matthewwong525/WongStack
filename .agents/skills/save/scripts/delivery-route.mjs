#!/usr/bin/env node
// Which way this checkout saves and publishes: `github`, `artifacts` or `app`.
//
//     node .claude/skills/save/scripts/delivery-route.mjs [dir]
//
// The one switch every verb asks (wiki/stack/artifacts-route.md). It reads two things and they must
// agree: where `origin` points, and the route the install record names. An Artifacts install has an
// origin on <account>.artifacts.cloudflare.net and `components.delivery.route: "artifacts"`; every
// other checkout is `github`, with or without an origin. Prints the route and exits 0. A record and
// an origin that disagree print the reason on stderr and exit 1: no verb guesses a route.
//
// One origin is asked before the record: `https://<app>/api/access/code/git/`, the address of a copy
// installed through Connect your assistant (wiki/stack/employee-project.md). That copy is `app`
// whatever the record says: the record is the owner's, committed, and names where the project is
// kept, not how this copy reaches it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

/** The host an Artifacts repository answers on: the account id, then Cloudflare's Git domain. */
export const ARTIFACTS_HOST = /^([0-9a-f]{32})\.artifacts\.cloudflare\.net$/;

export class RouteError extends Error {}

/** True for the app's own Git address and nothing near it: https, that exact path, no credentials, query or hash. */
export function appOrigin(origin) {
  const text = String(origin ?? '').trim();
  try {
    return text === `${new URL(text).origin}/api/access/code/git/` && text.startsWith('https://');
  } catch {
    return false;
  }
}

/** The host of a Git remote address, for `https://host/…` and `git@host:…`; null when there is none. */
export function originHost(origin) {
  const text = String(origin ?? '').trim();
  if (!text) return null;
  const scp = /^[^/@\s]+@([^:/\s]+):/.exec(text);
  if (scp) return scp[1].toLowerCase();
  try {
    return new URL(text).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** The route for one origin address and one install record; a RouteError when they disagree. */
export function routeOf({ origin, record }) {
  if (appOrigin(origin)) return 'app';
  const delivery = record?.components?.delivery;
  const recorded = delivery?.route === 'artifacts';
  const host = originHost(origin);
  const artifacts = host !== null && ARTIFACTS_HOST.test(host);
  if (artifacts && recorded) {
    if (delivery.remote && delivery.remote !== String(origin).trim()) throw new RouteError('origin is not the repository the install record names');
    return 'artifacts';
  }
  if (!artifacts && !recorded) return 'github';
  if (recorded) throw new RouteError(host ? `the install record says artifacts, but origin is on ${host}` : 'the install record says artifacts, but this checkout has no origin');
  throw new RouteError('origin is a Cloudflare Artifacts repository, but the install record names no artifacts route');
}

const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/** A checkout's route with its recorded delivery details: `{ route, root, delivery }`. */
export function delivery(cwd = process.cwd()) {
  const root = git(cwd, 'rev-parse', '--show-toplevel') ?? cwd;
  let record = null;
  try {
    record = JSON.parse(readFileSync(join(root, '.claude', '.wong-stack.json'), 'utf8'));
  } catch {
    // No install record: an uninstalled or GitHub checkout.
  }
  const route = routeOf({ origin: git(root, 'remote', 'get-url', 'origin'), record });
  return { route, root, delivery: route === 'artifacts' ? record.components.delivery : null };
}

if (isMain(import.meta.url)) {
  try {
    console.log(delivery(process.argv[2] || process.cwd()).route);
  } catch (error) {
    if (!(error instanceof RouteError)) throw error;
    console.error(`delivery-route: ${error.message}`);
    process.exitCode = 1;
  }
}
