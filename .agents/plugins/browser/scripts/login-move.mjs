// Moves the old camofox browser's site logins into the new profile once, Meta's sites left out: a Facebook login
// copied to another browser can lock the account, so Meta's sites are signed in fresh.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Meta's sites, by registered domain; a cookie or an origin on any of them, or under one, is never copied. */
export const META_SITES = ['facebook.com', 'facebook.net', 'messenger.com', 'instagram.com', 'fbcdn.net', 'fbsbx.com', 'meta.com', 'threads.net', 'whatsapp.com', 'whatsapp.net'];

/** True when `host`, a cookie domain or an origin's host, is one of Meta's sites or under one. */
export function isMeta(host) {
  const name = String(host ?? '').toLowerCase().replace(/^\./, '').replace(/\.$/, '');
  return META_SITES.some(site => name === site || name.endsWith(`.${site}`));
}

/** The most the site storage step takes, so the whole start fits browse.mjs's wait; later origins are left out. */
export const MOVE_MS = 60_000;
const COOKIE_FIELDS = ['name', 'value', 'domain', 'path', 'expires', 'httpOnly', 'secure', 'sameSite'];
const hostOfOrigin = origin => { try { return new URL(origin).hostname; } catch { return ''; } };

/** Every old profile's cookies and site storage, Meta's left out. An unreadable file adds nothing. */
export function oldLogins(profilesDir) {
  const cookies = [];
  const origins = new Map();
  let names = [];
  try { names = readdirSync(profilesDir); } catch { /* no old browser */ }
  for (const name of names) {
    let state;
    try { state = JSON.parse(readFileSync(join(profilesDir, name, 'storage-state.json'), 'utf8')); } catch { continue; }
    for (const cookie of state.cookies ?? []) if (cookie?.domain && !isMeta(cookie.domain)) cookies.push(cookie);
    for (const { origin, localStorage = [] } of state.origins ?? []) {
      if (!origin || isMeta(hostOfOrigin(origin)) || !localStorage.length) continue;
      origins.set(origin, [...(origins.get(origin) ?? []), ...localStorage]);
    }
  }
  return { cookies, origins: [...origins].map(([origin, localStorage]) => ({ origin, localStorage })) };
}

/** Writes each origin's site storage from a blank page served in its place, so no request leaves the computer. */
async function writeStorage(context, origins, moveMs) {
  if (!origins.length) return 0;
  const end = Date.now() + moveMs;
  let written = 0;
  const page = await context.newPage();
  try {
    await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' }));
    for (const { origin, localStorage } of origins) {
      const left = end - Date.now();
      if (left <= 0) break;
      try {
        await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: Math.min(10_000, left) });
        await page.evaluate(items => { for (const { name, value } of items) window.localStorage.setItem(name, value); }, localStorage);
        written++;
      } catch { /* one origin's storage is lost, not the move */ }
    }
  } finally {
    await page.close().catch(() => {});
  }
  return written;
}

/** On the first start, with no `marker` file, copies the old logins into `context` and writes the marker; any later
 * start copies nothing. Returns what was copied, or null when the marker was there. */
export async function moveLogins(context, { profilesDir, marker, moveMs = MOVE_MS }) {
  if (existsSync(marker)) return null;
  const { cookies, origins } = oldLogins(profilesDir);
  const clean = cookies.map(cookie => Object.fromEntries(COOKIE_FIELDS.filter(field => cookie[field] !== undefined).map(field => [field, cookie[field]])));
  // One cookie the browser refuses fails the whole call, so a refusal is retried one cookie at a time.
  await context.addCookies(clean).catch(() => Promise.all(clean.map(cookie => context.addCookies([cookie]).catch(() => {}))));
  const moved = { cookies: cookies.length, origins: await writeStorage(context, origins, moveMs) };
  writeFileSync(marker, `${JSON.stringify({ moved: new Date().toISOString(), ...moved })}\n`, { mode: 0o600 });
  return moved;
}
