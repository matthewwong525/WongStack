// WongStack's own save routes, `github`, `artifacts` or `app` (wiki/stack/artifacts-route.md): the loop's `route`
// slot. `origin` and the install record must agree, else a RouteError. A copy installed through the app is `app`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { originHost, RouteError } from '../../plugins/loop/scripts/lib/origin.mjs';

/** The host an Artifacts repository answers on: the account id, then Cloudflare's Git domain. */
export const ARTIFACTS_HOST = /^([0-9a-f]{32})\.artifacts\.cloudflare\.net$/;
export { RouteError };

/** True for the app's own Git address and nothing near it: https, that exact path, no credentials, query or hash. */
export function appOrigin(origin) {
  const text = String(origin ?? '').trim();
  try {
    return text === `${new URL(text).origin}/api/access/code/git/` && text.startsWith('https://');
  } catch {
    return false;
  }
}

/** The route an address alone names: `app`, `artifacts`, or undefined for any other. */
export function addressRoute(origin) {
  if (appOrigin(origin)) return 'app';
  const host = originHost(origin);
  return host !== null && ARTIFACTS_HOST.test(host) ? 'artifacts' : undefined;
}

/** The route for one origin address and one install record; a RouteError when they disagree. */
export function routeOf({ origin, record }) {
  if (appOrigin(origin)) return 'app';
  const delivery = record?.components?.delivery;
  const recorded = delivery?.route === 'artifacts';
  const host = originHost(origin);
  const artifacts = addressRoute(origin) === 'artifacts';
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
export function wongDelivery(cwd = process.cwd()) {
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
