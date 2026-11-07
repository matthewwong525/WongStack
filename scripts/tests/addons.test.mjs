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
const LIST = join(DIR, 'addons.json');
const OLD_CHOICE = join(DIR, 'password-manager.json');

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
function publish({ slug, guid, name, users, promoted = [], version = '1.0', xpiFiles = { 'manifest.json': manifest(guid) }, hash, type = 'extension', website = `https://${slug}.example`, tags = [] }) {
  const data = xpi(xpiFiles);
  const path = `/files/${slug}-${version}.xpi`;
  files.set(path, data);
  const record = {
    slug, guid, type, tags, name: { 'en-US': name }, authors: [{ name: `${name} Inc.` }], homepage: { url: { 'en-US': website } }, average_daily_users: users, promoted,
    current_version: { version, file: { url: `${SITE}${path}`, hash: hash ?? sha(data) } },
  };
  records.set(slug, record);
  records.set(guid, record);
  return record;
}

const FEATURED = { slug: 'vault-manager', guid: '{11111111-2222-4333-8444-555555555555}', name: 'Vault Manager', users: 1_000_000, promoted: [{ category: 'recommended', apps: ['firefox'] }], tags: ['password manager', 'security'] };
const POPULAR = { slug: 'pass-manager', guid: 'pass@maker.example', name: 'Pass Manager', users: 100_000, tags: ['password manager'] };
const BLOCKER = { slug: 'ad-blocker', guid: 'blocker@maker.example', name: 'Ad Blocker', users: 5_000_000, tags: ['ad blocker', 'privacy'] };
const LOOKALIKE = { slug: 'vaultt-manager', guid: 'vaultt@someone.example', name: 'Vaultt', users: 4 };
for (const addon of [FEATURED, POPULAR, LOOKALIKE, BLOCKER]) publish(addon);

const addons = await import('../../.agents/skills/browser/scripts/addons.mjs');
const { addAddon, addedList, addonStatus, findAddons, folderOf, foundLines, pageUrl, pinnedLayout, removeAddon, startArgs, unzip, UPDATE_MS } = addons;
const saved = guid => addedList().find(added => added.guid === guid);

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

test('each add-on the person says yes to is added, checked, and kept beside the others; the same one again replaces its record', async () => {
  reset();
  assert.deepEqual(addonStatus(), []);
  for (const [at, addon] of [FEATURED, BLOCKER, LOOKALIKE].entries()) {
    const added = await addAddon(addon.slug, { now: 1000 + at });
    assert.deepEqual(added, {
      slug: addon.slug, guid: addon.guid, name: addon.name, maker: `${addon.name} Inc.`, website: `https://${addon.slug}.example`, version: '1.0', page: 'popup/index.html',
      tags: addon.tags ?? [], checkedAt: 1000 + at, addedAt: 1000 + at,
    });
    assert.deepEqual(JSON.parse(readFileSync(LIST, 'utf8')).added.at(-1), added);
    const kept = JSON.parse(readFileSync(join(folderOf(addon.guid), 'manifest.json'), 'utf8'));
    assert.equal(kept.browser_specific_settings.gecko.id, addon.guid, 'the folder names its add-on, so its storage stays its own');
  }
  assert.deepEqual(addonStatus(), [FEATURED.name, BLOCKER.name, LOOKALIKE.name], 'a second add-on keeps the first');
  for (const addon of [FEATURED, BLOCKER, LOOKALIKE]) assert.ok(existsSync(join(folderOf(addon.guid), 'manifest.json')));
  profileWith({ [FEATURED.guid]: 'vault-uuid' });
  await addAddon(FEATURED.slug, { now: 2000 });
  assert.deepEqual(addonStatus(), [BLOCKER.name, LOOKALIKE.name, FEATURED.name], 'the same add-on again replaces its own record');
  assert.equal(saved(FEATURED.guid).addedAt, 2000);
  assert.ok(stored(FEATURED.guid, 'vault-uuid'), 'and keeps its sign-in');
});

test('the agent\'s add removes the person\'s own copy of that add-on and its data, and leaves their other add-ons', async () => {
  reset();
  profileWith({ [FEATURED.guid]: 'vault-uuid', 'theirs@maker.example': 'theirs-uuid' });
  const extensions = join(PROFILE, 'extensions');
  mkdirSync(join(extensions, POPULAR.guid), { recursive: true });
  for (const guid of [FEATURED.guid, 'theirs@maker.example']) writeFileSync(join(extensions, `${guid}.xpi`), 'a signed file');
  await addAddon(FEATURED.slug);
  assert.ok(!existsSync(join(extensions, `${FEATURED.guid}.xpi`)), 'their copy of the same add-on goes');
  assert.ok(!stored(FEATURED.guid, 'vault-uuid'), 'with its stored data');
  assert.ok(existsSync(join(extensions, 'theirs@maker.example.xpi')) && stored('theirs@maker.example', 'theirs-uuid'), 'another add-on of theirs stays, with its data');
  await addAddon(POPULAR.slug);
  assert.ok(!existsSync(join(extensions, POPULAR.guid)), 'a copy kept as a folder goes too');
  assert.deepEqual(addonStatus(), [FEATURED.name, POPULAR.name]);
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
  assert.deepEqual(addonStatus(), [FEATURED.name]);
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

test('status names each added add-on or none, an old answer is ignored, and an add tells the agent what to tell the person', async () => {
  reset();
  assert.equal((await run('addon', 'status')).stdout, 'BROWSE_ADDON=none\n');
  assert.ok(!existsSync(LIST), 'a status saves nothing');
  for (const state of ['asked', 'declined']) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(OLD_CHOICE, JSON.stringify({ state }));
    assert.deepEqual(addonStatus(), [], `an old ${state} reads as none`);
    assert.deepEqual(await startArgs(), [], 'and loads nothing');
  }
  for (const verb of ['asked', 'decline']) assert.equal((await run('addon', verb)).status, 2, `${verb} is gone`);
  const out = await run('addon', 'add', FEATURED.slug);
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, `BROWSE_ADDON_ADDED=${FEATURED.name}\nBROWSE_ADDON_TELL=${addons.ADVICE}\nBROWSE_SERVER=stopped\n`);
  assert.match(addons.ADVICE, /only the logins my errands need/);
  assert.match(addons.ADVICE, /lock after 5 minutes/);
  const blocker = await run('addon', 'add', BLOCKER.slug);
  assert.equal(blocker.stdout, `BROWSE_ADDON_ADDED=${BLOCKER.name}\nBROWSE_ADDON_TELL=${BLOCKER.name} loads from the browser's next start.\nBROWSE_SERVER=stopped\n`, 'no vault advice for an add-on that is not a password manager');
  assert.equal((await run('addon', 'status')).stdout, `BROWSE_ADDON=${FEATURED.name}\nBROWSE_ADDON=${BLOCKER.name}\n`);
});

test('an older version\'s one add-on moves to the list once, and its old file goes', () => {
  reset();
  mkdirSync(DIR, { recursive: true });
  const old = { slug: 'onepassword', guid: '{d634138d-c276-4fc8-924b-40a0ea21d284}', name: '1Password', page: 'app/app.html#/page/welcome', version: '8', checkedAt: 5 };
  writeFileSync(OLD_CHOICE, JSON.stringify({ state: 'added', ...old }));
  assert.deepEqual(addedList(), [old]);
  assert.ok(!existsSync(OLD_CHOICE), 'the old file goes');
  assert.deepEqual(JSON.parse(readFileSync(LIST, 'utf8')), { added: [old] });
  writeFileSync(OLD_CHOICE, JSON.stringify({ state: 'added', ...old, name: 'Stale' }));
  assert.deepEqual(addonStatus(), ['1Password'], 'once the list is there, an old file is never read again');
});

test('remove takes out the add-on it names with its stored data, leaves the others, and says which are added when unsure', async () => {
  reset();
  await addAddon(POPULAR.slug);
  await addAddon(FEATURED.slug);
  await addAddon(BLOCKER.slug);
  profileWith({ [POPULAR.guid]: 'pass-uuid', [FEATURED.guid]: 'vault-uuid', 'other@maker.example': 'other-uuid' });
  await assert.rejects(removeAddon(), /several add-ons are added \(Pass Manager, Vault Manager, Ad Blocker\); name the one to remove/);
  await assert.rejects(removeAddon('manager'), /several added add-ons match "manager"; added: Pass Manager, Vault Manager, Ad Blocker/);
  await assert.rejects(removeAddon('translator'), /no added add-ons match "translator"/);
  assert.equal(await removeAddon('PASS'), POPULAR.name, 'a part of its name, any case');
  assert.ok(!existsSync(folderOf(POPULAR.guid)));
  assert.ok(!stored(POPULAR.guid, 'pass-uuid'), 'no sign-in to it stays behind');
  assert.ok(stored(FEATURED.guid, 'vault-uuid') && stored('other@maker.example', 'other-uuid'), 'the others\' data stays');
  assert.equal(await removeAddon(FEATURED.guid), FEATURED.name, 'or its id');
  assert.deepEqual(addonStatus(), [BLOCKER.name]);
  assert.deepEqual(await startArgs(), ['--addon', folderOf(BLOCKER.guid)], 'the next start loads only what is left');
  const out = await run('addon', 'remove');
  assert.equal(out.stdout, `BROWSE_ADDON_REMOVED=${BLOCKER.name}\n`, out.stderr);
  assert.deepEqual(addonStatus(), []);
  assert.deepEqual(await startArgs(), [], 'the next start loads none');
  assert.equal((await run('addon', 'remove', 'anything')).stdout, 'BROWSE_ADDON_REMOVED=none\n');
});

test('an add or remove stops at once while a live view is open, since it stops the browser', async () => {
  reset();
  await addAddon(FEATURED.slug);
  const chat = join(HOME, '.wong-stack', 'hand-over', 'links', 'busy-chat');
  mkdirSync(chat, { recursive: true });
  writeFileSync(join(chat, 'state.json'), JSON.stringify({ view: true }));
  writeFileSync(join(chat, 'watcher.pid'), String(process.pid));
  await assert.rejects(addAddon(POPULAR.slug), /a live view is open in busy-chat; add Pass Manager once it closes/);
  await assert.rejects(removeAddon(), /a live view is open in busy-chat; remove Vault Manager once it closes/);
  assert.deepEqual(addonStatus(), [FEATURED.name]);
  assert.ok(!existsSync(`${folderOf(POPULAR.guid)}.new`), 'the checked download is not left behind');
});

test('each start loads every add-on and pins each button; a weekly check swaps in a newer version, and a failed one keeps the old', async () => {
  reset();
  await addAddon(FEATURED.slug, { now: 0 });
  await addAddon(BLOCKER.slug, { now: 0 });
  profileWith({ [FEATURED.guid]: 'vault-uuid' }, { placements: { 'nav-bar': ['back-button', 'unified-extensions-button'], 'unified-extensions-area': ['_11111111-2222-4333-8444-555555555555_-browser-action'] }, seen: ['x'] });
  assert.deepEqual(await startArgs({ now: 1000 }), ['--addon', folderOf(FEATURED.guid), '--addon', folderOf(BLOCKER.guid)]);
  const prefs = readFileSync(join(PROFILE, 'prefs.js'), 'utf8');
  const layout = JSON.parse(addons.prefIn(prefs, 'browser.uiCustomization.state'));
  const buttons = ['_11111111-2222-4333-8444-555555555555_-browser-action', 'blocker_maker_example-browser-action'];
  assert.deepEqual(layout.placements, { 'nav-bar': ['back-button', 'unified-extensions-button', ...buttons], 'unified-extensions-area': [] });
  assert.deepEqual(layout.seen, ['x', ...buttons]);
  assert.match(prefs, /^user_pref\("browser\.startup\.page", 3\);$/m, 'the other prefs stay');
  assert.equal(pinnedLayout(prefs, FEATURED.guid), null, 'a pinned button is left as it is');
  assert.equal(pageUrl(), 'moz-extension://vault-uuid/popup/index.html', 'addon open shows the password manager, not the newer ad blocker');
  assert.equal(saved(FEATURED.guid).checkedAt, 0, 'within the week, no check');

  siteDown = true;
  assert.deepEqual((await startArgs({ now: UPDATE_MS + 1 })).length, 4, 'a dead site never blocks a start');
  siteDown = false;
  assert.deepEqual(addedList().map(added => [added.checkedAt, added.version]), [[UPDATE_MS + 1, '1.0'], [UPDATE_MS + 1, '1.0']], 'each check date moves on');

  publish({ ...FEATURED, version: '2.0', hash: `sha256:${'1'.repeat(64)}` });
  publish({ ...BLOCKER, version: '2.0', xpiFiles: { 'manifest.json': manifest(BLOCKER.guid, 'popup/v2.html') } });
  await startArgs({ now: 3 * UPDATE_MS });
  assert.equal(saved(FEATURED.guid).version, '1.0', 'a newer file that fails its check is not swapped in');
  assert.ok(existsSync(join(folderOf(FEATURED.guid), 'manifest.json')));
  assert.deepEqual([saved(BLOCKER.guid).version, saved(BLOCKER.guid).page], ['2.0', 'popup/v2.html'], 'each add-on updates on its own');

  publish({ ...FEATURED, version: '2.0', xpiFiles: { 'manifest.json': manifest(FEATURED.guid, 'popup/v2.html') } });
  await startArgs({ now: 5 * UPDATE_MS });
  assert.equal(saved(FEATURED.guid).version, '2.0');
  assert.equal(saved(FEATURED.guid).page, 'popup/v2.html');
  assert.equal(saved(FEATURED.guid).checkedAt, 5 * UPDATE_MS);

  rmSync(folderOf(FEATURED.guid), { recursive: true });
  assert.deepEqual(await startArgs({ now: 5 * UPDATE_MS }), ['--addon', folderOf(BLOCKER.guid)], 'a folder gone starts the browser without it');
});

test('1Password signs in on its own page; addon open shows the newest password manager, else the newest add-on; a first start with no layout pins nothing', async () => {
  assert.equal(pinnedLayout('', FEATURED.guid), null);
  reset();
  assert.equal(pageUrl(), null);
  mkdirSync(DIR, { recursive: true });
  const onePassword = { guid: '{d634138d-c276-4fc8-924b-40a0ea21d284}', name: '1Password', page: 'app/app.html#/page/welcome', tags: ['password manager'] };
  const blocker = { guid: 'blocker@maker.example', name: 'Ad Blocker', page: 'popup/index.html', tags: [] };
  writeFileSync(LIST, JSON.stringify({ added: [blocker] }));
  profileWith({ [onePassword.guid]: 'op-uuid', [blocker.guid]: 'blocker-uuid' });
  assert.equal(pageUrl(), 'moz-extension://blocker-uuid/popup/index.html', 'with no password manager, the newest add-on');
  writeFileSync(LIST, JSON.stringify({ added: [onePassword, blocker] }));
  assert.equal(pageUrl(), 'moz-extension://op-uuid/app/app.html#/page/welcome');
});

test('the addon verbs are in the usage, and bad words are a usage error', async () => {
  assert.match((await run('--help')).stdout, /addon find <name>/);
  assert.match((await run('--help')).stdout, /addon remove \[<name>\]/);
  for (const args of [['addon'], ['addon', 'install'], ['addon', 'find'], ['addon', 'status', 'x'], ['addon', 'remove', 'a', 'b']]) {
    const out = await run(...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage: browse\.mjs/);
  }
  assert.match((await run('addon', 'remove', 'a', 'b')).stderr, /addon remove takes 0 or 1 word after it/);
});
