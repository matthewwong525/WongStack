#!/usr/bin/env node
// By hand, never in CI: a throwaway Camoufox checks that a live view's phone fit narrows an add-on's page through the
// browser server, a wide fit widens it, and the site gets its size back. Argument: a folder for the phone picture.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REAL = join(homedir(), '.wong-stack', 'camoufox');

// The person's own browser, profile and screen stay untouched: this run gets a home folder and a screen of its own,
// borrows only the installed library and build, and deletes both afterwards.
if (!process.env.LIVE_VIEW_ADDON_FIT_HOME) {
  const home = mkdtempSync(join(tmpdir(), 'live-view-addon-fit-'));
  const dir = join(home, '.wong-stack', 'camoufox');
  mkdirSync(join(dir, 'tmp'), { recursive: true });
  for (const name of ['venv', 'cache']) symlinkSync(join(REAL, name), join(dir, name));
  const out = process.argv[2] ? [resolve(process.argv[2])] : [];
  const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...out], { stdio: 'inherit', env: { ...process.env, HOME: home, LIVE_VIEW_ADDON_FIT_HOME: home } });
  rmSync(home, { recursive: true, force: true });
  process.exit(run.status ?? 1);
}

const { FILES, launchConfig } = await import('../../../.agents/skills/browser/scripts/browse.mjs');
const { persistentOptions, routes } = await import('../../../.agents/skills/browser/scripts/browser-server.mjs');
const { liveView } = await import('../../../.agents/skills/hand-over/scripts/view.mjs');

const sleep = ms => new Promise(done => setTimeout(done, ms));
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === '' ? '' : `: ${detail}`}`);
  if (!ok) process.exitCode = 1;
};
const listen = server => new Promise(done => server.listen(0, '127.0.0.1', () => done(server.address().port)));
// The browser server's own screen size, so its add-on page opens as it does for the person.
const [W, H] = [1280, 720];
const number = Array.from({ length: 30 }, (_, at) => 70 + at).find(at => !existsSync(`/tmp/.X11-unix/X${at}`) && !existsSync(`/tmp/.X${at}-lock`));
const DISPLAY = `:${number}`;
const screen = spawn('Xvfb', [DISPLAY, '-screen', '0', `${W}x${H}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' });
process.on('exit', () => screen.kill());
await sleep(800);
const x = (...args) => { try { return execFileSync('xdotool', args, { env: { ...process.env, DISPLAY } }).toString().trim(); } catch { return ''; } };
const pageId = () => x('search', '--classname', 'Navigator').split('\n').filter(Boolean)[0];

// A small add-on tells this run's site its own address, and its page reports its width and its button's place.
let root = null;
let seen = null;
const site = createServer((request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/root') root = url.searchParams.get('u');
  if (url.pathname === '/size') seen = Object.fromEntries([...url.searchParams].map(([name, value]) => [name, Number(value)]));
  response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>site</title><p>The site</p>');
});
const base = `http://127.0.0.1:${await listen(site)}`;
const probe = join(process.env.HOME, 'probe');
mkdirSync(probe);
writeFileSync(join(probe, 'manifest.json'), JSON.stringify({ manifest_version: 2, name: 'own page probe', version: '1.0', browser_specific_settings: { gecko: { id: 'own-page-probe@test.local' } }, background: { scripts: ['bg.js'] } }));
writeFileSync(join(probe, 'bg.js'), `fetch(${JSON.stringify(`${base}/root?u=`)} + encodeURIComponent(browser.runtime.getURL('')));`);
writeFileSync(join(probe, 'page.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Password manager</title><body style="font:18px sans-serif;margin:0;background:#fff"><div style="max-width:900px;margin:40px auto;padding:0 24px"><h1 style="font-size:28px">Sign in to your password manager</h1><p>Email</p><input style="width:100%;box-sizing:border-box;font-size:18px;padding:10px"><div style="display:flex;justify-content:space-between;margin-top:24px"><a>Help</a><button id="edge" style="font-size:18px;padding:10px 24px;background:#1a5fd6;color:#fff;border:0;border-radius:6px">Sign in</button></div></div><script src="page.js"></script>');
writeFileSync(join(probe, 'page.js'), `setInterval(() => { const box = document.getElementById('edge').getBoundingClientRect();
fetch(${JSON.stringify(`${base}/size?`)} + new URLSearchParams({ inner: innerWidth, bar: outerHeight - innerHeight, right: Math.round(box.right), x: Math.round(box.right - 6), y: Math.round(box.top + box.height / 2) })).catch(() => {}); }, 200);`);

const config = await launchConfig(['--display', DISPLAY, '--fingerprint', join(process.env.HOME, 'fingerprint.json')]);
if (config.error) throw new Error(config.error);
const camou = JSON.parse(config.options.env.CAMOU_CONFIG_1);
config.options.env.CAMOU_CONFIG_1 = JSON.stringify({ ...camou, addons: [...(camou.addons ?? []), probe] });
const { firefox } = createRequire(import.meta.url)(join(config.driver, 'index.js'));
const context = await firefox.launchPersistentContext(FILES.profile, persistentOptions(config, { DISPLAY }));
// The real browser server's routes over this browser: the same steps browse.mjs and a live view send.
const handle = routes(context, 'key', { stepMs: 20_000 });
const api = createServer(handle);
const apiBase = `http://127.0.0.1:${await listen(api)}`;
const call = async (method, path, body) => {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { authorization: 'Bearer key', 'content-type': 'application/json' }, ...(body && { body: JSON.stringify({ userId: 'me', ...body }) }) });
  return { status: response.status, body: await response.json() };
};
/** One step, timed: the add-on page's resize must answer at once, though the driver's own call never does. */
const timed = async (route, body) => {
  const started = Date.now();
  const reply = await call('POST', `/tabs/${tab}/${route}`, body);
  return { ...reply, ms: Date.now() - started };
};
/** The page's report once it shows `width`, or the last one after a few seconds. */
const report = async width => {
  for (let tries = 0; seen?.inner !== width && tries < 20; tries++) await sleep(250);
  await sleep(300);
  return seen;
};
/** The screen pixel at `report`'s button edge, below the bar, as `#rrggbb`; a 480-wide picture of the screen first. */
const edgeColor = at => {
  const picture = join(process.argv[2] ?? process.env.HOME, 'addon-page-phone.png');
  if (process.argv[2]) mkdirSync(process.argv[2], { recursive: true });
  spawnSync('import', ['-display', DISPLAY, '-window', 'root', '-crop', `480x${H}+0+0`, picture]);
  const pixel = execFileSync('convert', [picture, '-crop', `1x1+${at.x}+${at.y + at.bar}`, '-depth', '8', 'txt:-']).toString();
  return { picture, color: /#[0-9A-F]{6}/i.exec(pixel)?.[0].toUpperCase() ?? 'none' };
};

const tab = (await call('POST', '/tabs', { sessionKey: 'task', url: base })).body.tabId;
try {
  for (let tries = 0; !root && tries < 40; tries++) await sleep(250);
  check('the stand-in add-on has its own page address', Boolean(root), root ?? 'none');
  // The site keeps the browser's own size, as a fresh tab does: the add-on page's height comes from its bar.
  const siteSize = (await timed('evaluate', { expression: '[innerWidth, innerHeight]' })).body.result;
  check('the site has a size of its own, bigger than the screen', siteSize?.[0] > W, JSON.stringify(siteSize));

  const opened = await timed('navigate', { url: `${root}page.html` });
  check('the add-on page opens in the task tab', opened.status === 200, JSON.stringify(opened.body));
  const view = { size: siteSize, display: DISPLAY };
  const live = liveView(view, { resize: async (width, height) => (await timed('viewport', { width, height })).body });

  const before = await report(W);
  check('at open, the page is the screen\'s width', before?.inner === W, JSON.stringify(before));
  const startedAt = Date.now();
  const phone = await live.fit('phone');
  check('a phone fit answers at once', Date.now() - startedAt < 5000 && phone?.width === 480, `${Date.now() - startedAt} ms ${JSON.stringify(phone)}`);
  const narrow = await report(480);
  check('the page reports 480 wide', narrow?.inner === 480, JSON.stringify(narrow));
  check('its sign-in button ends inside the 480 strip', narrow?.right <= 480, `right edge at ${narrow?.right}`);
  const { picture, color } = edgeColor(narrow);
  check('and a 480 crop of the screen shows that edge', color === '#1A5FD6', `${color} in ${picture}`);
  const shape = x('getwindowgeometry', '--shell', pageId());
  check('its window is at the screen\'s corner, as tall as the screen', /X=0\b/.test(shape) && new RegExp(`HEIGHT=${H}\\b`).test(shape), shape.replace(/\n/g, ' '));

  // Every width the page reports during the keep-alive and 2 s after: a widening shows even if it narrows back.
  const widths = new Set();
  const sampler = setInterval(() => widths.add(seen?.inner), 50);
  const again = Date.now();
  await live.fit();
  check('the keep-alive, the same size again, answers at once', Date.now() - again < 5000, `${Date.now() - again} ms`);
  await sleep(2000);
  clearInterval(sampler);
  check('and the page still reports 480, never wider', [...widths].join() === '480', JSON.stringify([...widths]));
  await live.fit('wide');
  const wide = await report(W);
  check(`a wide fit gives ${W}`, wide?.inner === W, JSON.stringify(wide));

  await live.fit('phone');
  await timed('viewport', { width: view.size[0], height: view.size[1] });
  x('windowfocus', pageId());
  x('key', 'alt+Left');
  await sleep(2000);
  const back = await call('GET', `/tabs/${tab}/snapshot?userId=me`);
  check('back on the site, the driver answers', back.status === 200, back.body.error ?? back.body.url);
  const read = await timed('evaluate', { expression: '[innerWidth, innerHeight]' });
  check('and the site has the size it had before the view', JSON.stringify(read.body.result) === JSON.stringify(view.size), JSON.stringify(read.body));
  const resized = await timed('viewport', { width: 800, height: 600 });
  check('a resize on the site answers', resized.status === 200 && resized.ms < 5000, `${resized.status} in ${resized.ms} ms`);
} finally {
  handle.close();
  api.close();
  site.close();
  await context.close().catch(() => {});
  screen.kill();
}
