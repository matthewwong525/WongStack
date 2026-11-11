// A save route's shared names, apart from delivery-route.mjs: a profile imports them while that script runs.
export class RouteError extends Error {}

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
