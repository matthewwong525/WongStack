// The person's password manager in the shared browser: one checked Firefox add-on, found on Firefox's add-on site,
// loaded at each start, kept up to date, and removed with its stored data. `browse.mjs addon <verb>` runs it.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { BrowseError, FILES, stopServer } from './browse.mjs';

// BROWSE_ADDON_SITE is for tests only: a stand-in add-on site, so no test reaches the network.
const SITE = process.env.BROWSE_ADDON_SITE || 'https://addons.mozilla.org';
const SITE_MS = 60_000;
/** A weekly update check, so a manager never falls so far behind that it stops working. */
export const UPDATE_MS = 7 * 24 * 60 * 60_000;
/** Below this many daily users, an add-on Mozilla does not feature gets a warning: a look-alike had 4. */
export const FEW_USERS = 10_000;
/** The page an add-on names for its sign-in, where its toolbar pop-up is not the right one. */
const OWN_PAGES = { '{d634138d-c276-4fc8-924b-40a0ea21d284}': 'app/app.html#/page/welcome' };
const UUIDS = 'extensions.webextensions.uuids';
const TOOLBAR = 'browser.uiCustomization.state';

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
/** The saved choice: `{state: 'added', ...}`, `{state: 'declined'}`, or null when none was made. */
export const choice = () => readJson(FILES.addon);
const save = value => { mkdirSync(dirname(FILES.addon), { recursive: true, mode: 0o700 }); writeFileSync(FILES.addon, `${JSON.stringify(value)}\n`, { mode: 0o600 }); };
export const folderOf = guid => join(FILES.addons, guid);

/** One language's text from the site's answer, which may give it as a string or a map of languages. */
function text(value) {
  if (value == null || typeof value === 'string') return value ?? '';
  return value['en-US'] ?? value[value._default] ?? Object.values(value).find(entry => typeof entry === 'string') ?? '';
}

/** An add-on record's facts, as `find` prints them and `add` saves them. */
export function factsOf(record) {
  const promoted = Array.isArray(record.promoted) ? record.promoted.length > 0 : Boolean(record.promoted);
  const users = Number(record.average_daily_users) || 0;
  return {
    slug: record.slug, guid: record.guid, name: text(record.name), maker: (record.authors ?? []).map(author => author.name).join(', '),
    website: text(record.homepage?.url ?? record.homepage), users, featured: promoted, warn: !promoted && users < FEW_USERS,
  };
}

async function site(path) {
  let response;
  try {
    response = await fetch(new URL(path, SITE), { signal: AbortSignal.timeout(SITE_MS) });
  } catch {
    throw new BrowseError("Firefox's add-on site did not answer");
  }
  if (response.status === 404) throw new BrowseError("Firefox's add-on site has no such add-on");
  if (!response.ok) throw new BrowseError(`Firefox's add-on site refused the request (HTTP ${response.status})`);
  return response;
}

/** Up to three Firefox extensions for `name`, each with its facts. */
export async function findAddons(name) {
  const query = new URLSearchParams({ q: name, type: 'extension', app: 'firefox', lang: 'en-US', page_size: '3' });
  const { results = [] } = await (await site(`/api/v5/addons/search/?${query}`)).json();
  return results.slice(0, 3).map(factsOf);
}

/** The lines `find` prints. */
export function foundLines(found) {
  if (!found.length) return ['BROWSE_ADDON_FOUND=none'];
  return found.flatMap(addon => [
    `BROWSE_ADDON_FOUND=${[addon.slug, addon.name, addon.maker, addon.website || 'no website', addon.users, addon.featured ? 'featured' : 'not featured'].join(' | ')}`,
    ...(addon.warn ? [`BROWSE_ADDON_WARN=${addon.slug}`] : []),
  ]);
}

/** A zip's files written under `dir`; a name that leads outside it stops the whole add. */
export function unzip(data, dir) {
  const end = data.lastIndexOf(Buffer.from('PK\x05\x06', 'latin1'));
  if (end < 0) throw new BrowseError('the add-on file is not a zip file');
  let at = data.readUInt32LE(end + 16);
  for (let left = data.readUInt16LE(end + 10); left > 0; left--) {
    if (data.readUInt32LE(at) !== 0x02014b50) throw new BrowseError('the add-on file is not a zip file');
    const [method, size, nameLength] = [data.readUInt16LE(at + 10), data.readUInt32LE(at + 20), data.readUInt16LE(at + 28)];
    const local = data.readUInt32LE(at + 42);
    const name = data.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + data.readUInt16LE(at + 30) + data.readUInt16LE(at + 32);
    const target = resolve(dir, name);
    if (!target.startsWith(dir + sep)) throw new BrowseError(`the add-on file holds a path outside its folder: ${name}`);
    if (name.endsWith('/')) { mkdirSync(target, { recursive: true }); continue; }
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    const raw = data.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new BrowseError('the add-on file uses a zip method this script can not read');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, method === 8 ? inflateRawSync(raw) : raw);
  }
}

/** The page the person signs in on: the one the add-on names, else its toolbar pop-up's page. */
const pageOf = (manifest, guid) => OWN_PAGES[guid] ?? (manifest.action ?? manifest.browser_action)?.default_popup?.replace(/^\//, '') ?? null;

/** Downloads `record`'s file, checks it against the site's sha256, and unzips it to a new folder beside the kept one.
 * The manifest gets the add-on's id when it has none, so its storage stays its own from start to start. */
async function fetchChecked(record) {
  const file = record.current_version?.file ?? {};
  const [kind, wanted] = String(file.hash ?? '').split(':');
  if (kind !== 'sha256' || !wanted) throw new BrowseError('the add-on site gave no sha256 fingerprint for the file, so nothing was added');
  if (new URL(file.url ?? '', SITE).origin !== new URL(SITE).origin) throw new BrowseError("the add-on's file is not on Firefox's add-on site, so nothing was added");
  const data = Buffer.from(await (await site(file.url)).arrayBuffer());
  if (createHash('sha256').update(data).digest('hex') !== wanted) throw new BrowseError('the downloaded file does not match the fingerprint the add-on site gives, so nothing was added');
  const staging = `${folderOf(record.guid)}.new`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true, mode: 0o700 });
  try {
    unzip(data, staging);
    const manifest = readJson(join(staging, 'manifest.json'));
    if (!manifest) throw new BrowseError('the add-on file has no manifest.json');
    const settings = manifest.browser_specific_settings ?? manifest.applications ?? {};
    const id = settings.gecko?.id;
    if (id && id !== record.guid) throw new BrowseError(`the add-on file names itself ${id}, not ${record.guid}, so nothing was added`);
    manifest.browser_specific_settings = { ...settings, gecko: { ...settings.gecko, id: record.guid } };
    delete manifest.applications;
    writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return { staging, page: pageOf(manifest, record.guid), version: record.current_version.version };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

/** Puts a checked folder where the browser loads it, the old one gone only once the new one is in place. */
function swapIn(staging, guid) {
  const folder = folderOf(guid);
  const old = `${folder}.old`;
  rmSync(old, { recursive: true, force: true });
  if (existsSync(folder)) renameSync(folder, old);
  renameSync(staging, folder);
  rmSync(old, { recursive: true, force: true });
}

/** A pref's value as prefs.js holds it, or null. */
export function prefIn(prefs, name) {
  const line = new RegExp(`^user_pref\\(${JSON.stringify(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, (.*)\\);$`, 'm').exec(prefs);
  try { return line ? JSON.parse(line[1]) : null; } catch { return null; }
}

const readPrefs = profile => { try { return readFileSync(join(profile, 'prefs.js'), 'utf8'); } catch { return ''; } };

/** The add-on's own address inside the browser, `moz-extension://<uuid>`, once the browser has run it. */
export function uuidOf(profile, guid) {
  try { return JSON.parse(prefIn(readPrefs(profile), UUIDS) ?? '{}')[guid] ?? null; } catch { return null; }
}

/** Deletes the add-on's stored data from the profile: its storage folders and its old-style data folder. */
export function clearStorage(profile, guid) {
  const uuid = uuidOf(profile, guid);
  const storage = join(profile, 'storage', 'default');
  if (uuid) for (const name of existsSync(storage) ? readdirSync(storage) : []) if (name.startsWith(`moz-extension+++${uuid}`)) rmSync(join(storage, name), { recursive: true, force: true });
  rmSync(join(profile, 'browser-extension-data', guid), { recursive: true, force: true });
}

/** The toolbar's saved layout with the add-on's button on it, as Firefox names that button; null when the layout is
 * unknown or already has it there. */
export function pinnedLayout(prefs, guid) {
  const widget = `${guid.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-browser-action`;
  let state;
  try { state = JSON.parse(prefIn(prefs, TOOLBAR)); } catch { return null; }
  const placements = state?.placements;
  if (!Array.isArray(placements?.['nav-bar'])) return null;
  if (placements['nav-bar'].includes(widget) && Object.entries(placements).every(([area, list]) => area === 'nav-bar' || !list.includes(widget))) return null;
  for (const area of Object.keys(placements)) placements[area] = placements[area].filter(id => id !== widget);
  placements['nav-bar'].push(widget);
  state.seen = [...new Set([...(state.seen ?? []), widget])];
  return JSON.stringify(state);
}

/** Pins the add-on's button to the toolbar in the stopped browser's prefs.js. A first start has no layout yet, so its
 * button waits in the extensions menu until the next start. */
function pin(profile, guid) {
  const prefs = readPrefs(profile);
  const layout = pinnedLayout(prefs, guid);
  if (!layout) return;
  const line = `user_pref(${JSON.stringify(TOOLBAR)}, ${JSON.stringify(layout)});`;
  writeFileSync(join(profile, 'prefs.js'), prefs.replace(/^user_pref\("browser\.uiCustomization\.state", .*\);$/m, () => line));
}

/** The chat holding a live view, or null: an add or remove stops the browser, so it stops at once while one is open. */
async function viewOpen() {
  const { viewHolder } = await import('../../hand-over/scripts/hand-over.mjs');
  return viewHolder();
}

async function stopForChange(what) {
  const holder = await viewOpen();
  if (holder) throw new BrowseError(`a live view is open in ${holder}; ${what} once it closes`);
  await stopServer();
}

/** Removes the saved add-on's folder and stored data, with the browser stopped. */
function dropAddon(saved, profile) {
  if (saved?.state !== 'added') return;
  rmSync(folderOf(saved.guid), { recursive: true, force: true });
  clearStorage(profile, saved.guid);
}

/** Adds the add-on `slug` after its checks, removing any other one first; the browser restarts with it. */
export async function addAddon(slug, { profile = FILES.profile, now = Date.now() } = {}) {
  const record = await (await site(`/api/v5/addons/addon/${encodeURIComponent(slug)}/?lang=en-US`)).json();
  if (record.type !== 'extension') throw new BrowseError(`${slug} is a ${record.type ?? 'thing'}, not an extension`);
  const facts = factsOf(record);
  const { staging, page, version } = await fetchChecked(record);
  try {
    await stopForChange('add the password manager');
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  const saved = choice();
  if (saved?.guid !== facts.guid) dropAddon(saved, profile);
  swapIn(staging, facts.guid);
  const added = { state: 'added', slug: facts.slug, guid: facts.guid, name: facts.name, maker: facts.maker, website: facts.website, version, page, checkedAt: now };
  save(added);
  return added;
}

/** Takes the add-on out with its stored data, and keeps the no: the agent offers none again until asked. */
export async function removeAddon({ profile = FILES.profile } = {}) {
  const saved = choice();
  if (saved?.state === 'added') {
    await stopForChange('remove the password manager');
    dropAddon(saved, profile);
  }
  save({ state: 'declined' });
  return saved?.state === 'added' ? saved.name : null;
}

export const declineAddon = () => { if (choice()?.state !== 'added') save({ state: 'declined' }); };
/** Records that the agent asked the person in a chat, so the offer is made once even with no answer. */
export const askedAddon = () => { if (addonStatus() === 'none') save({ state: 'asked' }); };

/** `none` when no choice is saved, `asked` once the offer was made, `declined`, or the added add-on's name. */
export function addonStatus() {
  const saved = choice();
  return saved?.state === 'added' ? saved.name : ['declined', 'asked'].includes(saved?.state) ? saved.state : 'none';
}

/** What the agent tells the person once the add-on is in. */
export const ADVICE = 'In your password manager, keep only the logins my errands need, in a vault of their own, and set it to lock after 5 minutes.';

/** A newer version, swapped in by the same checks; any failure keeps the working folder. Either way, the check date
 * moves on, so a dead network never slows each start. */
async function update(saved, now) {
  try {
    const record = await (await site(`/api/v5/addons/addon/${encodeURIComponent(saved.guid)}/?lang=en-US`)).json();
    if (record.guid === saved.guid && record.current_version?.version !== saved.version) {
      const { staging, page, version } = await fetchChecked(record);
      swapIn(staging, saved.guid);
      Object.assign(saved, { version, page });
    }
  } catch { /* the working folder stays */ }
  save({ ...saved, checkedAt: now });
}

/** launch-config.py's words for this start: the add-on's folder, updated weekly and pinned to the toolbar, or none. */
export async function startArgs({ profile = FILES.profile, now = Date.now() } = {}) {
  const saved = choice();
  if (saved?.state !== 'added') return [];
  if (!(now - (Number(saved.checkedAt) || 0) < UPDATE_MS)) await update(saved, now);
  const folder = folderOf(saved.guid);
  if (!existsSync(join(folder, 'manifest.json'))) return [];
  pin(profile, saved.guid);
  return ['--addon', folder];
}

/** The add-on's own sign-in page in the running browser, or null before its first start has saved its address. */
export function pageUrl(profile = FILES.profile) {
  const saved = choice();
  const uuid = saved?.state === 'added' && saved.page ? uuidOf(profile, saved.guid) : null;
  return uuid ? `moz-extension://${uuid}/${saved.page}` : null;
}

const sleep = wait => new Promise(done => setTimeout(done, wait));

/** Opens the add-on's sign-in page in this task's tab, for the person in the live view; waits for the browser to save
 * the add-on's address on a first start. */
async function openPage(page) {
  if (choice()?.state !== 'added') throw new BrowseError('no password manager is added; run `browse.mjs addon find <name>` first');
  await page.ready();
  let url = pageUrl();
  for (let tries = 0; !url && tries < 20; tries++) { await sleep(500); url = pageUrl(); }
  if (!url) throw new BrowseError('the password manager has no page to open yet; run `browse.mjs stop`, then try again');
  await page.openAddon(url);
}

/** Each `addon` verb: how many words follow it, and what it runs. */
export const ADDON_VERBS = {
  find: [1, async (_, [name]) => console.log(foundLines(await findAddons(name)).join('\n'))],
  add: [1, async (_, [slug]) => console.log(`BROWSE_ADDON_ADDED=${(await addAddon(slug)).name}\nBROWSE_ADDON_TELL=${ADVICE}\nBROWSE_SERVER=stopped`)],
  remove: [0, async () => console.log(`BROWSE_ADDON_REMOVED=${(await removeAddon()) ?? 'none'}`)],
  asked: [0, () => { askedAddon(); console.log(`BROWSE_ADDON=${addonStatus()}`); }],
  decline: [0, () => { declineAddon(); console.log(`BROWSE_ADDON=${addonStatus()}`); }],
  status: [0, () => console.log(`BROWSE_ADDON=${addonStatus()}`)],
  open: [0, async page => { await openPage(page); console.log('BROWSE_ADDON_PAGE=opened'); }],
};
