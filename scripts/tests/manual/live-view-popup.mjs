#!/usr/bin/env node
// By hand, never in CI: a throwaway Camoufox on its own virtual screen checks that a live view's polls leave an
// add-on's pop-up open and in front, that it takes a tap and typing, and that the page comes back once it closes.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REAL = join(homedir(), '.wong-stack', 'camoufox');

// The person's own browser, profile and screen stay untouched: this run gets a home folder and a screen of its own,
// borrows only the installed library and build, and deletes both afterwards.
if (!process.env.LIVE_VIEW_POPUP_HOME) {
  const home = mkdtempSync(join(tmpdir(), 'live-view-popup-'));
  const dir = join(home, '.wong-stack', 'camoufox');
  mkdirSync(join(dir, 'tmp'), { recursive: true });
  for (const name of ['venv', 'cache']) symlinkSync(join(REAL, name), join(dir, name));
  const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, HOME: home, LIVE_VIEW_POPUP_HOME: home } });
  rmSync(home, { recursive: true, force: true });
  process.exit(run.status ?? 1);
}

const { FILES, launchConfig } = await import('../../../.agents/skills/browser/scripts/browse.mjs');
const { persistentOptions } = await import('../../../.agents/skills/browser/scripts/browser-server.mjs');
const { liveView, popupOpen } = await import('../../../.agents/skills/hand-over/scripts/view.mjs');

const sleep = ms => new Promise(done => setTimeout(done, ms));
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === '' ? '' : `: ${detail}`}`);
  if (!ok) process.exitCode = 1;
};
const number = Array.from({ length: 30 }, (_, at) => 70 + at).find(at => !existsSync(`/tmp/.X11-unix/X${at}`) && !existsSync(`/tmp/.X${at}-lock`));
const DISPLAY = `:${number}`;
const screen = spawn('Xvfb', [DISPLAY, '-screen', '0', '1280x900x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
process.on('exit', () => screen.kill());
await sleep(800);
const x = (...args) => { try { return execFileSync('xdotool', args, { env: { ...process.env, DISPLAY } }).toString().trim(); } catch { return ''; } };
const ids = text => text.split('\n').filter(Boolean);
const panelId = () => ids(x('search', '--onlyvisible', '--classname', '^Camoufox$'))[0];
const pageId = () => ids(x('search', '--classname', 'Navigator'))[0];
/** True when the pop-up is above the page's window: xdotool lists the screen's windows bottom first. */
const onTop = () => { const order = ids(x('search', '--maxdepth', '1', '--onlyvisible', '--name', '')); return order.indexOf(panelId()) > order.indexOf(pageId()); };

// A small add-on's pop-up tells this run's site it opened, and its text box's value while it stays open.
let opened = 0;
let value = null;
let aliveAt = 0;
const site = createServer((request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/opened') opened++;
  if (url.pathname === '/alive') [aliveAt, value] = [Date.now(), url.searchParams.get('v')];
  response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>page</title><p>The page</p>');
});
const base = `http://127.0.0.1:${await new Promise(done => site.listen(0, '127.0.0.1', () => done(site.address().port)))}`;
const open = () => Date.now() - aliveAt < 600;
const probe = join(process.env.HOME, 'probe');
mkdirSync(probe);
const SHORTCUT = 'Alt+Shift+Y';
writeFileSync(join(probe, 'manifest.json'), JSON.stringify({ manifest_version: 2, name: 'pop-up probe', version: '1.0', browser_specific_settings: { gecko: { id: 'popup-probe@test.local' } }, browser_action: { default_popup: 'popup.html', default_area: 'navbar' }, commands: { _execute_browser_action: { suggested_key: { default: SHORTCUT } } } }));
writeFileSync(join(probe, 'popup.html'), '<!doctype html><meta charset="utf-8"><body style="width:300px;height:200px"><input id="box"><script src="popup.js"></script>');
writeFileSync(join(probe, 'popup.js'), `fetch(${JSON.stringify(`${base}/opened`)});
setInterval(() => fetch(${JSON.stringify(`${base}/alive?v=`)} + encodeURIComponent(document.getElementById('box').value)).catch(() => {}), 150);`);

const config = await launchConfig(['--display', DISPLAY, '--fingerprint', join(process.env.HOME, 'fingerprint.json')]);
if (config.error) throw new Error(config.error);
const camou = JSON.parse(config.options.env.CAMOU_CONFIG_1);
config.options.env.CAMOU_CONFIG_1 = JSON.stringify({ ...camou, addons: [...(camou.addons ?? []), probe] });
const { firefox } = createRequire(import.meta.url)(join(config.driver, 'index.js'));
const context = await firefox.launchPersistentContext(FILES.profile, persistentOptions(config, { DISPLAY }));
const page = context.pages()[0] ?? await context.newPage();
// The server's resize shows the tab first; here the page's window takes the whole screen, so the bar reads 0.
const resize = async () => {
  await page.bringToFront();
  for (let tries = 0; tries < 10 && !/WIDTH=1280\b/.test(x('getwindowgeometry', '--shell', pageId())); tries++) {
    x('windowsize', pageId(), '1280', '900');
    x('windowmove', pageId(), '0', '0');
    await sleep(500);
  }
  return { ok: true };
};
const live = liveView({ display: DISPLAY }, { resize });
/** One poll and keep-alive of a live view, as hand-over.mjs runs them. */
const poll = async () => {
  if (live.popupOpen()) return live.front();
  await page.bringToFront();
  await live.fit();
};
const openPopup = async () => {
  const before = opened;
  x('key', SHORTCUT.toLowerCase());
  for (let tries = 0; opened === before && tries < 20; tries++) await sleep(250);
  await sleep(500);
  return opened > before;
};

try {
  await page.goto(base);
  await live.fit();
  check('the fit gives the page\'s window the whole screen', /WIDTH=1280\b/.test(x('getwindowgeometry', '--shell', pageId())), x('getwindowgeometry', '--shell', pageId()).replace(/\n/g, ' '));
  check('no pop-up shows at first', !popupOpen(DISPLAY));

  check(`the add-on's pop-up opens (its toolbar button's shortcut, ${SHORTCUT})`, await openPopup());
  check('the view sees it', popupOpen(DISPLAY) && live.popupOpen(), panelId());
  check('it shows in front of the page', onTop());
  for (let at = 1; at <= 3; at++) {
    await poll();
    await sleep(2000);
  }
  check('after three polls it is still open', open() && popupOpen(DISPLAY));
  check('and still in front', onTop());

  const shape = x('getwindowgeometry', '--shell', panelId());
  const [left, top] = ['X', 'Y'].map(name => Number(new RegExp(`^${name}=(\\d+)$`, 'm').exec(shape)?.[1]));
  x('mousemove', String(left + 40), String(top + 12));
  x('click', '1');
  await sleep(400);
  x('type', '--delay', '60', 'abc');
  await poll();
  await sleep(1000);
  check('a tap on its box and typing reach it, as the view\'s input does', value === 'abc', JSON.stringify(value));
  check('with the keyboard focus still on the page\'s window', x('getwindowfocus') === pageId());

  x('mousemove', '300', '600');
  x('click', '1');
  await sleep(1500);
  check('a tap outside it closes it', !open() && !popupOpen(DISPLAY));
  await poll();
  await sleep(500);
  check('and the next poll brings the page back to the front', x('getwindowfocus') === pageId());

  check('control: it opens again', await openPopup() && onTop());
  x('windowraise', pageId(), 'windowfocus', pageId());
  await sleep(1000);
  check('control: one raise of the page\'s window, the old poll, covers it', !onTop());
} finally {
  site.close();
  await context.close().catch(() => {});
  screen.kill();
}
