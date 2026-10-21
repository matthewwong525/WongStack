#!/usr/bin/env node
// Whether an address is this install's own https site, the only place a walk sends the Access key. The live app's
// address is the memory store's Worker. Exit codes: 0 own · 1 not own, printing why · 2 usage.
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { loadConfig, memoryOrigin, repoContext } from '../../memory/scripts/lib/store.mjs';

const USAGE = `usage: own-site.mjs <address>
  exits 0 when <address> is on this install's own https site, else 1 and prints why`;

/** `{ own: true }`, or `{ own: false, reason }`. `origin` is the live app's address; none owns nothing. */
export function ownSite(address, origin) {
  if (!origin) return { own: false, reason: 'no live address is recorded for this install' };
  let url;
  let home;
  try {
    url = new URL(address);
    home = new URL(origin).hostname;
  } catch {
    return { own: false, reason: `${address} is not an address` };
  }
  if (url.protocol !== 'https:') return { own: false, reason: `${url.host} is not a secure (https) address` };
  if (url.username || url.password) return { own: false, reason: 'the address holds a user name or password' };
  // curl reads the written text, not Node's parse: a `\`, a tab, `:443` or a user name before `@` can make the two
  // disagree on the host. So the written address must open with exactly the parsed origin.
  const written = address.slice(0, url.origin.length);
  if (written.toLowerCase() !== url.origin || !/^([/?#]|$)/.test(address.slice(url.origin.length))) {
    return { own: false, reason: `${JSON.stringify(address)} is not written as a plain address` };
  }
  const host = url.hostname;
  if (host.endsWith('.')) return { own: false, reason: `${host} ends with a dot` };
  // Cloudflare gives `<account>.workers.dev` to one account, so a Worker there owns every host under it.
  const account = /^[^.]+(\.[^.]+\.workers\.dev)$/.exec(home)?.[1];
  const own = account ? host.endsWith(account) : host === home || host.endsWith(`.${home}`);
  return own ? { own: true } : { own: false, reason: `${host} is not this install's own site` };
}

/** The live app's origin for the checkout at `cwd`, or null when no memory store is recorded. */
export function liveOrigin(cwd = process.cwd()) {
  try { return memoryOrigin(loadConfig(repoContext(cwd))); } catch { return null; }
}

if (isMain(import.meta.url)) {
  const { positionals } = parseCli({ usage: USAGE, allowPositionals: true });
  if (positionals.length !== 1) usageError(USAGE, 'own-site.mjs takes one address');
  const verdict = ownSite(positionals[0], liveOrigin());
  if (!verdict.own) {
    console.log(verdict.reason);
    process.exitCode = 1;
  }
}
