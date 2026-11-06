import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// browse.mjs names its files from the home folder, and addons.mjs its add-on site, as they load: both come first.
const HOME = mkdtempSync(join(tmpdir(), 'wong-test-addons-'));
process.env.HOME = HOME;
test.after(() => rmSync(HOME, { recursive: true, force: true }));
const SCRIPT = fileURLToPath(new URL('../../.agents/skills/browser/scripts/browse.mjs', import.meta.url));
const DIR = join(HOME, '.wong-stack', 'camoufox');
const PROFILE = join(DIR, 'profile');
const CHOICE = join(DIR, 'password-manager.json');

/** An add-on file: a zip of `files`, made by Python's own zip module. */
function xpi(files) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-xpi-'));
  try {
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, 'in', name)), { recursive: true });
      writeFileSync(join(dir, 'in', name), text);
    }
    const top = [...new Set(Object.keys(files).map(name => name.split('/')[0]))];
    const made = spawnSync('python3', ['-I', '-m', 'zipfile', '-c', join(dir, 'out.xpi'), ...top], { cwd: join(dir, 'in') });
    assert.equal(made.status, 0, String(made.stderr));
    return readFileSync(join(dir, 'out.xpi'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const manifest = (id, popup = 'popup/index.html') => JSON.stringify({ manifest_version: 2, name: 'x', version: '1', ...(id && { browser_specific_settings: { gecko: { id } } }), browser_action: { default_popup: popup } });
const sha = data => `sha256:${createHash('sha256').update(data).digest('hex')}`;

// A stand-in add-on site: each record by slug and by guid, its file, and a search over them.
const records = new Map();
const files = new Map();
let siteDown = false;
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://site.test');
  const send = (status, body) => response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  if (siteDown) return send(503, {});
  if (url.pathname.startsWith('/files/')) return files.has(url.pathname) ? response.end(files.get(url.pathname)) : send(404, {});
  if (url.pathname === '/api/v5/addons/search/') {
    const q = url.searchParams.get('q');
    assert.equal(url.searchParams.get('type'), 'extension');
    return send(200, { results: [...new Set(records.values())].filter(record => record.slug.includes(q) || q === 'manager').slice(0, 3) });
  }
  const id = /^\/api\/v5\/addons\/addon\/([^/]+)\/$/.exec(url.pathname)?.[1];
  const record = id && records.get(decodeURIComponent(id));
  return record ? send(200, record) : send(404, { detail: 'Not found.' });
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
test.after(() => server.close());
const SITE = `http://127.0.0.1:${server.address().port}`;
process.env.BROWSE_ADDON_SITE = SITE;

/** Puts an add-on on the stand-in site, its file made from `xpiFiles`; `hash` overrides the file's real fingerprint. */
function publish({ slug, guid, name, users, promoted = [], version = '1.0', xpiFiles = { 'manifest.json': manifest(guid) }, hash, type = 'extension', website = `https://${slug}.example` }) {
  const data = xpi(xpiFiles);
  const path = `/files/${slug}-${version}.xpi`;
  files.set(path, data);
  const record = {
    slug, guid, type, name: { 'en-US': name }, authors: [{ name: `${name} Inc.` }], homepage: { url: { 'en-US': website } }, average_daily_users: users, promoted,
    current_version: { version, file: { url: `${SITE}${path}`, hash: hash ?? sha(data) } },
  };
  records.set(slug, record);
  records.set(guid, record);
  return record;
}

const FEATURED = { slug: 'vault-manager', guid: '{11111111-2222-4333-8444-555555555555}', name: 'Vault Manager', users: 1_000_000, promoted: [{ category: 'recommended', apps: ['firefox'] }] };
const POPULAR = { slug: 'pass-manager', guid: 'pass@maker.example', name: 'Pass Manager', users: 100_000 };
const LOOKALIKE = { slug: 'vaultt-manager', guid: 'vaultt@someone.example', name: 'Vaultt', users: 4 };
for (const addon of [FEATURED, POPULAR, LOOKALIKE]) publish(addon);

const addons = await import('../../.agents/skills/browser/scripts/addons.mjs');
const { addAddon, addonStatus, choice, findAddons, folderOf, foundLines, pageUrl, pinnedLayout, removeAddon, startArgs, unzip, UPDATE_MS } = addons;

/** Runs browse.mjs without blocking, since the stand-in site answers from this process. */
function run(...args) {
  const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: HOME, env: { ...process.env, HOME, BROWSE_ADDON_SITE: SITE } });
  const out = { stdout: '', stderr: '' };
  child.stdout.on('data', chunk => { out.stdout += chunk; });
  child.stderr.on('data', chunk => { out.stderr += chunk; });
  return new Promise(done => child.on('close', status => done({ ...out, status })));
}
const reset = () => rmSync(join(HOME, '.wong-stack'), { recursive: true, force: true });

/** A profile whose prefs.js holds the add-ons' internal addresses and a toolbar layout, and storage for `guid`. */
function profileWith(uuids, layout = { placements: { 'nav-bar': ['back-button', 'urlbar-container', 'unified-extensions-button'], 'unified-extensions-area': [] }, seen: [] }) {
  mkdirSync(PROFILE, { recursive: true });
  const pref = (name, value) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});`;
  writeFileSync(join(PROFILE, 'prefs.js'), ['// Mozilla User Preferences', pref('browser.startup.page', 3), pref('browser.uiCustomization.state', JSON.stringify(layout)),
    pref('extensions.webextensions.uuids', JSON.stringify(uuids)), ''].join('\n'));
  for (const [guid, uuid] of Object.entries(uuids)) {
    mkdirSync(join(PROFILE, 'storage', 'default', `moz-extension+++${uuid}^userContextId=4294967295`, 'idb'), { recursive: true });
    mkdirSync(join(PROFILE, 'browser-extension-data', guid), { recursive: true });
  }
}
const stored = (guid, uuid) => existsSync(join(PROFILE, 'storage', 'default', `moz-extension+++${uuid}^userContextId=4294967295`)) || existsSync(join(PROFILE, 'browser-extension-data', guid));

test('find names each add-on\'s maker, website, daily users and featuring, and warns only for one unfeatured and little used', async () => {
  const found = await findAddons('manager');
  assert.deepEqual(foundLines(found), [
    `BROWSE_ADDON_FOUND=vault-manager | Vault Manager | Vault Manager Inc. | https://vault-manager.example | 1000000 | featured`,
    `BROWSE_ADDON_FOUND=pass-manager | Pass Manager | Pass Manager Inc. | https://pass-manager.example | 100000 | not featured`,
    `BROWSE_ADDON_FOUND=vaultt-manager | Vaultt | Vaultt Inc. | https://vaultt-manager.example | 4 | not featured`,
    'BROWSE_ADDON_WARN=vaultt-manager',
  ]);
  assert.deepEqual(foundLines(await findAddons('nothing-like-it')), ['BROWSE_ADDON_FOUND=none']);
  const out = await run('addon', 'find', 'pass');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, 'BROWSE_ADDON_FOUND=pass-manager | Pass Manager | Pass Manager Inc. | https://pass-manager.example | 100000 | not featured\n');
});

test('each add-on the person says yes to is added, checked, and the only one; a second swaps out the first with its data', async () => {
  reset();
  assert.equal(addonStatus(), 'none');
  for (const addon of [FEATURED, POPULAR, LOOKALIKE]) {
    const previous = choice();
    if (previous) profileWith({ [previous.guid]: 'old-uuid' });
    const added = await addAddon(addon.slug, { now: 1000 });
    assert.deepEqual(added, { state: 'added', slug: addon.slug, guid: addon.guid, name: addon.name, maker: `${addon.name} Inc.`, website: `https://${addon.slug}.example`, version: '1.0', page: 'popup/index.html', checkedAt: 1000 });
    assert.deepEqual(JSON.parse(readFileSync(CHOICE, 'utf8')), added);
    assert.equal(addonStatus(), addon.name);
    const kept = JSON.parse(readFileSync(join(folderOf(addon.guid), 'manifest.json'), 'utf8'));
    assert.equal(kept.browser_specific_settings.gecko.id, addon.guid, 'the folder names its add-on, so its storage stays its own');
    if (previous) {
      assert.ok(!existsSync(folderOf(previous.guid)), 'one add-on at a time');
      assert.ok(!stored(previous.guid, 'old-uuid'), 'the one swapped out leaves no stored sign-in');
    }
  }
});

test('a file that does not match the site\'s fingerprint, or is not an extension, is refused, and nothing changes', async () => {
  reset();
  await addAddon(FEATURED.slug);
  publish({ slug: 'bad-hash', guid: 'bad@maker.example', name: 'Bad', users: 50_000, hash: `sha256:${'0'.repeat(64)}` });
  await assert.rejects(addAddon('bad-hash'), /does not match the fingerprint/);
  publish({ slug: 'a-theme', guid: 'theme@maker.example', name: 'A theme', users: 50_000, type: 'statictheme' });
  await assert.rejects(addAddon('a-theme'), /a-theme is a statictheme, not an extension/);
  publish({ slug: 'other-id', guid: 'claimed@maker.example', name: 'Other', users: 50_000, xpiFiles: { 'manifest.json': manifest('real@else.example') } });
  await assert.rejects(addAddon('other-id'), /names itself real@else\.example/);
  await assert.rejects(addAddon('no-such-addon'), /has no such add-on/);
  assert.equal(addonStatus(), FEATURED.name);
  assert.ok(existsSync(join(folderOf(FEATURED.guid), 'manifest.json')));
  for (const guid of ['bad@maker.example', 'theme@maker.example', 'claimed@maker.example']) assert.ok(!existsSync(folderOf(guid)) && !existsSync(`${folderOf(guid)}.new`));
  const out = await run('addon', 'add', 'bad-hash');
  assert.equal(out.status, 1);
  assert.match(out.stdout, /^BROWSE_ERROR=the downloaded file does not match the fingerprint the add-on site gives, so nothing was added\n$/);
});

test('an add-on with no id of its own gets the site\'s, and a path out of its folder stops the add', async () => {
  reset();
  const noId = publish({ slug: 'no-id', guid: 'noid@maker.example', name: 'No id', users: 50_000, xpiFiles: { 'manifest.json': manifest(null), 'popup/index.html': '<p>hi</p>' } });
  await addAddon(noId.slug);
  assert.equal(JSON.parse(readFileSync(join(folderOf(noId.guid), 'manifest.json'), 'utf8')).browser_specific_settings.gecko.id, 'noid@maker.example');
  assert.equal(readFileSync(join(folderOf(noId.guid), 'popup', 'index.html'), 'utf8'), '<p>hi</p>');
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-unzip-'));
  try {
    const data = xpi({ 'manifest.json': '{}' });
    const evil = Buffer.from(data.toString('latin1').replaceAll('manifest.json', '../escapes.js'), 'latin1');
    assert.throws(() => unzip(evil, join(dir, 'in')), /a path outside its folder/);
    assert.ok(!existsSync(join(dir, 'escapes.js')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('status names the added add-on or none, an old answer is ignored, and an add tells the agent what to tell the person', async () => {
  reset();
  assert.equal((await run('addon', 'status')).stdout, 'BROWSE_ADDON=none\n');
  assert.ok(!existsSync(CHOICE), 'a status saves nothing');
  for (const state of ['asked', 'declined']) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(CHOICE, JSON.stringify({ state }));
    assert.equal(addonStatus(), 'none', `an old ${state} reads as none`);
    assert.deepEqual(await startArgs(), [], 'and loads nothing');
  }
  for (const verb of ['asked', 'decline']) assert.equal((await run('addon', verb)).status, 2, `${verb} is gone`);
  const out = await run('addon', 'add', FEATURED.slug);
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, `BROWSE_ADDON_ADDED=${FEATURED.name}\nBROWSE_ADDON_TELL=${addons.ADVICE}\nBROWSE_SERVER=stopped\n`);
  assert.match(addons.ADVICE, /only the logins my errands need/);
  assert.match(addons.ADVICE, /lock after 5 minutes/);
});

test('remove takes the add-on out with its stored data, and leaves no answer behind', async () => {
  reset();
  await addAddon(POPULAR.slug);
  profileWith({ [POPULAR.guid]: 'pass-uuid', 'other@maker.example': 'other-uuid' });
  assert.equal(await removeAddon(), POPULAR.name);
  assert.ok(!existsSync(folderOf(POPULAR.guid)));
  assert.ok(!stored(POPULAR.guid, 'pass-uuid'), 'no sign-in to it stays behind');
  assert.ok(stored('other@maker.example', 'other-uuid'), 'another add-on\'s data stays');
  assert.equal(addonStatus(), 'none');
  assert.ok(!existsSync(CHOICE), 'no saved answer stays');
  assert.deepEqual(await startArgs(), [], 'the next start loads none');
  assert.equal((await run('addon', 'remove')).stdout, 'BROWSE_ADDON_REMOVED=none\n');
});

test('an add or remove stops at once while a live view is open, since it stops the browser', async () => {
  reset();
  await addAddon(FEATURED.slug);
  const chat = join(HOME, '.wong-stack', 'hand-over', 'links', 'busy-chat');
  mkdirSync(chat, { recursive: true });
  writeFileSync(join(chat, 'state.json'), JSON.stringify({ view: true }));
  writeFileSync(join(chat, 'watcher.pid'), String(process.pid));
  await assert.rejects(addAddon(POPULAR.slug), /a live view is open in busy-chat; add the password manager once it closes/);
  await assert.rejects(removeAddon(), /a live view is open in busy-chat; remove the password manager once it closes/);
  assert.equal(addonStatus(), FEATURED.name);
  assert.ok(!existsSync(`${folderOf(POPULAR.guid)}.new`), 'the checked download is not left behind');
});

test('each start loads the add-on and pins its button; a weekly check swaps in a newer version, and a failed one keeps the old', async () => {
  reset();
  await addAddon(FEATURED.slug, { now: 0 });
  profileWith({ [FEATURED.guid]: 'vault-uuid' }, { placements: { 'nav-bar': ['back-button', 'unified-extensions-button'], 'unified-extensions-area': ['_11111111-2222-4333-8444-555555555555_-browser-action'] }, seen: ['x'] });
  assert.deepEqual(await startArgs({ now: 1000 }), ['--addon', folderOf(FEATURED.guid)]);
  const prefs = readFileSync(join(PROFILE, 'prefs.js'), 'utf8');
  const layout = JSON.parse(addons.prefIn(prefs, 'browser.uiCustomization.state'));
  assert.deepEqual(layout.placements, { 'nav-bar': ['back-button', 'unified-extensions-button', '_11111111-2222-4333-8444-555555555555_-browser-action'], 'unified-extensions-area': [] });
  assert.deepEqual(layout.seen, ['x', '_11111111-2222-4333-8444-555555555555_-browser-action']);
  assert.match(prefs, /^user_pref\("browser\.startup\.page", 3\);$/m, 'the other prefs stay');
  assert.equal(pinnedLayout(prefs, FEATURED.guid), null, 'a pinned button is left as it is');
  assert.equal(pageUrl(), 'moz-extension://vault-uuid/popup/index.html');
  assert.equal(choice().checkedAt, 0, 'within the week, no check');

  siteDown = true;
  assert.deepEqual(await startArgs({ now: UPDATE_MS + 1 }), ['--addon', folderOf(FEATURED.guid)], 'a dead site never blocks a start');
  siteDown = false;
  assert.equal(choice().checkedAt, UPDATE_MS + 1, 'the check date moves on');
  assert.equal(choice().version, '1.0');

  publish({ ...FEATURED, version: '2.0', hash: `sha256:${'1'.repeat(64)}` });
  await startArgs({ now: 3 * UPDATE_MS });
  assert.equal(choice().version, '1.0', 'a newer file that fails its check is not swapped in');
  assert.ok(existsSync(join(folderOf(FEATURED.guid), 'manifest.json')));

  publish({ ...FEATURED, version: '2.0', xpiFiles: { 'manifest.json': manifest(FEATURED.guid, 'popup/v2.html') } });
  await startArgs({ now: 5 * UPDATE_MS });
  assert.equal(choice().version, '2.0');
  assert.equal(choice().page, 'popup/v2.html');
  assert.equal(choice().checkedAt, 5 * UPDATE_MS);

  rmSync(folderOf(FEATURED.guid), { recursive: true });
  assert.deepEqual(await startArgs({ now: 5 * UPDATE_MS }), [], 'a folder gone starts the browser without it');
});

test('1Password signs in on its own page; a first start with no layout pins nothing', () => {
  assert.equal(pinnedLayout('', FEATURED.guid), null);
  reset();
  mkdirSync(DIR, { recursive: true });
  writeFileSync(CHOICE, JSON.stringify({ state: 'added', guid: '{d634138d-c276-4fc8-924b-40a0ea21d284}', page: 'app/app.html#/page/welcome' }));
  profileWith({ '{d634138d-c276-4fc8-924b-40a0ea21d284}': 'op-uuid' });
  assert.equal(pageUrl(), 'moz-extension://op-uuid/app/app.html#/page/welcome');
});

test('the addon verbs are in the usage, and bad words are a usage error', async () => {
  assert.match((await run('--help')).stdout, /addon find <name>/);
  for (const args of [['addon'], ['addon', 'install'], ['addon', 'find'], ['addon', 'status', 'x']]) {
    const out = await run(...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage: browse\.mjs/);
  }
});
