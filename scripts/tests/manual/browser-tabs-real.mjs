#!/usr/bin/env node
// By hand, never in CI: a throwaway Camoufox in its own home folder checks tabs in one window, the person's turn, a
// click and a resize behind it, a real add-on, and on a Mac the window count, aimed at this run's own windows alone.
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SLUG = process.argv[2] ?? 'bitwarden-password-manager';
const REAL = join(homedir(), '.wong-stack', 'camoufox');

// The person's own browser, profile and settings stay untouched: this run gets a home folder of its own, which
// borrows only the installed library and build, and is deleted afterwards.
if (!process.env.BROWSER_TABS_REAL_HOME) {
  const home = mkdtempSync(join(tmpdir(), 'browser-tabs-real-'));
  const dir = join(home, '.wong-stack', 'camoufox');
  mkdirSync(join(dir, 'tmp'), { recursive: true });
  for (const name of ['venv', 'cache']) symlinkSync(join(REAL, name), join(dir, name));
  const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, HOME: home, BROWSER_TABS_REAL_HOME: home } });
  rmSync(home, { recursive: true, force: true });
  process.exit(run.status ?? 1);
}

const { FILES, launchConfig } = await import('../../../.agents/skills/browser/scripts/browse.mjs');
const { persistentOptions, routes } = await import('../../../.agents/skills/browser/scripts/browser-server.mjs');
const { addAddon, folderOf, pageUrl, startArgs } = await import('../../../.agents/skills/browser/scripts/addons.mjs');

const sleep = ms => new Promise(done => setTimeout(done, ms));
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === '' ? '' : `: ${detail}`}`);
  if (!ok) process.exitCode = 1;
};
const listen = server => new Promise(done => server.listen(0, '127.0.0.1', () => done(server.address().port)));

/** Camoufox's process ids now, so this run's windows are told from the person's own browser. */
const camoufoxPids = () => new Set(execSync('ps -axo pid=,comm=').toString().split('\n').filter(line => /camoufox/i.test(line)).map(line => Number(line.trim().split(/\s+/)[0])));
/** This run's windows on the screen, by CoreGraphics; null off a Mac. */
function windows(theirs) {
  if (process.platform !== 'darwin') return null;
  const script = `ObjC.import('CoreGraphics'); JSON.stringify(ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0))).filter(w => /camoufox/i.test(w.kCGWindowOwnerName || '') && w.kCGWindowLayer === 0 && w.kCGWindowBounds.Height > 200).map(w => w.kCGWindowOwnerPID))`;
  return JSON.parse(execSync(`osascript -l JavaScript -e ${JSON.stringify(script)}`).toString()).filter(pid => !theirs.has(pid)).length;
}

// The tab the window shows, as a small add-on of this run reports it: a page can not tell, since Camoufox and the
// driver tell every tab it shows and has the keyboard.
let shown = '';
const site = createServer((request, response) => {
  if (request.url.startsWith('/shown?')) {
    shown = new URL(request.url, 'http://x').searchParams.get('url');
    return response.end();
  }
  response.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><title>${request.url}</title>
<input id="q"><button id="go" onclick="document.title = 'clicked ' + (++window.clicks || (window.clicks = 1))">Go</button>
<div id="plain" onclick="this.dataset.clicks = (+this.dataset.clicks || 0) + 1">Plain</div>
<form><input name="username" autocomplete="username"><input type="password" name="password"></form>`);
});
const page = `http://127.0.0.1:${await listen(site)}`;
const urlOf = name => `${page}/${name}`;
const shownNow = async () => { await sleep(1000); return shown; };

/** The add-on that reports the shown tab to this run's site. */
function probeAddon() {
  const folder = join(process.env.HOME, 'probe');
  mkdirSync(folder);
  writeFileSync(join(folder, 'manifest.json'), JSON.stringify({ manifest_version: 2, name: 'shown tab', version: '1.0', browser_specific_settings: { gecko: { id: 'shown-tab@test.local' } }, permissions: ['tabs', '<all_urls>'], background: { scripts: ['shown.js'] } }));
  writeFileSync(join(folder, 'shown.js'), `setInterval(async () => { const [tab] = await browser.tabs.query({ active: true }); fetch(${JSON.stringify(`${page}/shown?url=`)} + encodeURIComponent(tab?.url ?? '')).catch(() => {}); }, 250);`);
  return folder;
}

const added = await addAddon(SLUG).catch(error => ({ error: error.message }));
check(`add ${SLUG} from Firefox's add-on site through addons.mjs`, !added.error, added.error ?? added.name);
// On Linux the library's start reads no DISPLAY of its own, so the screen goes by name, as the server's Xvfb does.
const screen = process.platform === 'linux' && process.env.DISPLAY ? ['--display', process.env.DISPLAY] : ['--window'];
const config = await launchConfig([...screen, '--fingerprint', join(process.env.HOME, 'fingerprint.json'), ...(await startArgs())]);
if (config.error) throw new Error(config.error);
const camou = JSON.parse(config.options.env.CAMOU_CONFIG_1);
config.options.env.CAMOU_CONFIG_1 = JSON.stringify({ ...camou, addons: [...(camou.addons ?? []), probeAddon()] });
const theirs = camoufoxPids();
const { firefox } = createRequire(import.meta.url)(join(config.driver, 'index.js'));
const context = await firefox.launchPersistentContext(FILES.profile, persistentOptions(config));
const handle = routes(context, 'key', { turnWaitMs: 1500, stepMs: 20_000 });
const api = createServer(handle);
const base = `http://127.0.0.1:${await listen(api)}`;
const call = async (method, path, body) => {
  const response = await fetch(`${base}${path}`, { method, headers: { authorization: 'Bearer key', 'content-type': 'application/json' }, ...(body && { body: JSON.stringify({ userId: 'me', ...body }) }) });
  return { status: response.status, body: response.headers.get('content-type') === 'image/png' ? await response.arrayBuffer() : await response.json() };
};
const open = async name => (await call('POST', '/tabs', { sessionKey: name, url: urlOf(name) })).body.tabId;
const post = (tab, route, body = {}) => call('POST', `/tabs/${tab}/${route}`, body);
const read = async (tab, expression) => (await post(tab, 'evaluate', { expression })).body.result;
const size = async tab => JSON.stringify(await read(tab, '[innerWidth, innerHeight]'));
const sized = text => (([width, height]) => ({ width, height }))(JSON.parse(text));

try {
  await sleep(1500);
  const first = windows(theirs);
  check('the browser starts in one window', first === 1 || first === null, `${first ?? 'not counted off a Mac'}`);
  const [a, b, c] = [await open('a'), await open('b'), await open('c')];
  check('every task tab is listed, the home tab not', (await call('GET', '/tabs?userId=me')).body.tabs.length === 3);
  // A new add-on may show its own welcome tab at its first start.
  check('new tabs open behind', !/\/[abc]$/.test(await shownNow()), shown);

  check('the turn\'s tab comes to the front', (await post(a, 'front', { turn: true })).status === 200 && await shownNow() === urlOf('a'), shown);
  const count = windows(theirs);
  check('three task tabs give one window', count === 1 || count === null, `${count ?? 'not counted off a Mac'}`);
  await open('d');
  check('a new tab during the turn opens behind it', await shownNow() === urlOf('a'), shown);
  await post(b, 'type', { selector: '#q', text: 'typed behind', mode: 'keyboard' });
  await post(b, 'press', { key: 'Tab' });
  check('typing in a tab behind lands', await read(b, "document.querySelector('#q').value") === 'typed behind');
  const shot = await call('GET', `/tabs/${b}/screenshot?userId=me`);
  check('a tab behind takes a picture', shot.status === 200 && shot.body.byteLength > 1000, `${shot.body.byteLength} bytes`);
  check('none of these shows the tab behind', await shownNow() === urlOf('a'), shown);
  const pressed = await post(b, 'click', { selector: '#go' });
  check('a button click in a tab behind lands by its key', pressed.body.via === 'key' && await read(b, 'document.title') === 'clicked 1', JSON.stringify(pressed.body));
  const resize = await post(b, 'viewport', { width: 800, height: 600 });
  check('a resize in a tab behind waits, then is refused', resize.status === 409, resize.body.error);
  check('so the turn\'s tab stays shown', await shownNow() === urlOf('a'), shown);

  const [aWas, bWas] = [await size(a), await size(b)];
  await post(a, 'viewport', { width: 480, height: 600 });
  const [aDuring, bDuring] = [await size(a), await size(b)];
  await post(a, 'viewport', sized(aWas));
  const bAfter = await size(b);
  check('a live view\'s resize of one tab, set back, leaves the other tab its size', bAfter === bWas, `b ${bWas} → ${bDuring} during → ${bAfter} after; a ${aWas} → ${aDuring} during → ${await size(a)}`);

  const plain = await post(b, 'click', { selector: '#plain' });
  check('a click on a plain clickable element in a tab behind waits for the turn', plain.body.queued === true, JSON.stringify(plain.body));
  check('its tab takes no other step meanwhile', (await post(b, 'evaluate', { expression: '1' })).status === 409);
  check('and the turn\'s tab stays shown', await shownNow() === urlOf('a'), shown);
  await post(a, 'front', { turn: false });
  const clicked = (await call('GET', `/tabs/${b}/click?userId=me`)).body;
  check('once the turn ends, the click lands, with the mouse', clicked.via === 'mouse' && await read(b, "document.querySelector('#plain').dataset.clicks") === '1', JSON.stringify(clicked));
  check('and shows its tab', await shownNow() === urlOf('b'), shown);
  await post(a, 'front');
  const resized = await post(b, 'viewport', sized(bWas));
  check('a resize shows its tab first, and ends', resized.status === 200 && await shownNow() === urlOf('b'), `${resized.status} ${shown}`);
  await post(a, 'front', { show: true });
  check('show brings its tab to the front', await shownNow() === urlOf('a'), shown);
  check('and holds no turn', (await post(b, 'front', { turn: true })).status === 200);
  await post(b, 'front', { turn: false });

  let url = pageUrl();
  for (let tries = 0; !url && tries < 30; tries++) { await sleep(500); url = pageUrl(); }
  check('the add-on has its own page address', Boolean(url), url ?? 'none');
  if (url) {
    await post(a, 'front');
    const opened = await post(c, 'navigate', { url });
    check('its page opens in a task tab behind, shown first', opened.status === 200 && (await shownNow()).startsWith(url), `${JSON.stringify(opened.body)} ${shown}`);
    const hidden = await call('GET', `/tabs/${c}/snapshot?userId=me`);
    check('and the agent can not read it', hidden.status === 403 && hidden.body.addonPage === true, hidden.body.error);
    await post(c, 'navigate', { url: urlOf('c') });
    // A signed-out add-on shows no frame of its own, so the page holds one of the add-on's pages a site may frame.
    const manifest = JSON.parse(readFileSync(join(folderOf(added.guid), 'manifest.json'), 'utf8'));
    const framed = (manifest.web_accessible_resources ?? []).flatMap(each => each.resources ?? [each]).find(each => each.endsWith('.html'));
    check('the add-on has a page a site may frame', Boolean(framed), framed ?? 'none');
    if (framed) {
      const src = `${url.match(/^moz-extension:\/\/[^/]+/)[0]}/${framed}`;
      const put = await post(c, 'evaluate', { expression: `new Promise(done => { const frame = document.createElement('iframe'); frame.id = 'pm'; frame.src = ${JSON.stringify(src)}; frame.onload = () => done('loaded'); document.body.append(frame); setTimeout(done, 3000, 'no load'); })` });
      const tab = context.pages().find(each => each.url() === urlOf('c'));
      const frames = tab.frames().map(frame => frame.url()).filter(each => each.startsWith('moz-extension:'));
      const text = (await call('GET', `/tabs/${c}/snapshot?userId=me`)).body.snapshot ?? '';
      check('its frame is on the page', put.body.result === 'loaded', `${JSON.stringify(put.body)}; the driver sees ${frames.length} add-on frame(s)`);
      check('and none of it is in a snapshot', !/moz-extension/.test(text), text.split('\n').join(' / '));
      const aimed = await post(c, 'click', { selector: '#pm' });
      check('a click aimed at its frame is refused', aimed.status === 403, aimed.body.error);
    }
  }

  const home = context.pages().find(each => each.url() === 'about:blank');
  await home?.close();
  await open('e');
  await open('f');
  await sleep(1500);
  const after = windows(theirs);
  check('a closed home tab is made again once, in one new window', after === 2 || after === null, `${after ?? 'not counted off a Mac'}`);
} finally {
  handle.close();
  api.close();
  site.close();
  await context.close().catch(() => {});
}
