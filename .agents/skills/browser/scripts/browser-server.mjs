#!/usr/bin/env node
// The shared browser: one Camoufox profile, driven by the Playwright inside the Python camoufox library, behind the
// REST routes camofox-browser had (github.com/jo-inc/camofox-browser, MIT), so browse.mjs keeps its calls.
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { startArgs as addonArgs } from './addons.mjs';
import { FILES, LAUNCH_MS, OLD_PROFILES, launchConfig, windowSetting } from './browse.mjs';
import { startForwarder } from './forwarder.mjs';
import { moveLogins } from './login-move.mjs';
import { ADDON_PAGE, ADDON_REFUSAL, MAX_FRAMES, buildSnapshot, frameHasBoxes, frameLabel, frameSkipped, windowSnapshot } from './refs.mjs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

/** Xvfb as camofox ran it: one 1280x720 screen, no TCP, and the extensions a real desktop lacks turned off. */
const XVFB_ARGS = ['-screen', '0', '1280x720x24', '-ac', '-nolisten', 'tcp', '-extension', 'RENDER', '+extension', 'GLX', '-extension', 'COMPOSITE',
  '-extension', 'XVideo', '-extension', 'XVideo-MotionCompensation', '-extension', 'XINERAMA', '-fp', 'built-ins', '-nocursor', '-br'];
const KEY_ALIASES = { ctrl: 'Control', control: 'Control', cmd: 'Meta', command: 'Meta', meta: 'Meta', option: 'Alt', esc: 'Escape', return: 'Enter',
  enter: 'Enter', del: 'Delete', backspace: 'Backspace', tab: 'Tab', space: 'Space', home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown',
  arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight' };
const IDLE_MS = 5 * 60_000;
// The longest one step may hold its tab: a page that never answers would block every later step on it.
const STEP_MS = 50_000;
const BODY_LIMIT = 5 * 1024 * 1024;

/** A refusal with its HTTP status. */
const refusal = (status, message) => Object.assign(new Error(message), { status });

/** The Python library's persistent-context options in the Node driver's names: camelCase keys, a media setting of
 * `no-override` as null, no viewport as `viewport: null`, and every env value a string. */
export function contextOptions(options) {
  const out = {};
  for (const [key, value] of Object.entries(options)) {
    if (key === 'no_viewport') { if (value) out.viewport = null; continue; }
    out[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = value === 'no-override' ? null : value;
  }
  out.env = Object.fromEntries(Object.entries(out.env ?? {}).map(([name, value]) => [name, String(value)]));
  // This process closes the browser itself, after the routes stop.
  return { ...out, handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false };
}

/** A key as Playwright's `keyboard.press` spells it: `ctrl+a` is `Control+a`. */
export const pressKey = key => String(key).split('+').map(part => KEY_ALIASES[part.trim().toLowerCase()] ?? part.trim()).join('+');

/** The refusal while the tab shows the password manager's page, marked so a live view's helper can tell it apart. It
 * gives the page's own size, `[width, height]`, so a view over that page sets it back at its end. */
const onAddonPage = tab => Object.assign(refusal(403, ADDON_REFUSAL), { addonPage: true, size: tab.addon?.own ? [tab.addon.own.width, tab.addon.own.height] : null });
/** Whether any of `found` is the password manager's frame. It runs in the page, so it uses nothing outside. */
const ADDON_TARGET = found => found.some(element => /^(IFRAME|FRAME|OBJECT|EMBED)$/.test(element.tagName) && /^moz-extension:/i.test(element.src || element.data || ''));
/** Whether the keyboard is inside the password manager's frame, through any open shadow root. */
const FOCUS_IN_ADDON = `(() => { let field = document.activeElement; while (field?.shadowRoot?.activeElement) field = field.shadowRoot.activeElement; return (${ADDON_TARGET})(field ? [field] : []); })()`;
/** Whether `frame` is the password manager's, or sits inside one. */
const inAddonFrame = frame => {
  for (let at = frame; at; at = at.parentFrame?.()) if (ADDON_PAGE.test(at.url())) return true;
  return false;
};

/** Refuses a step aimed at the password manager's frame by selector or by the keyboard; a ref never names one, since
 * the page text leaves its frames out. */
async function guardAddon(page, { ref, selector }) {
  if (!ref && await aimedAtAddon(page, selector)) throw refusal(403, ADDON_REFUSAL);
}

/** Whether `selector`, or the keyboard with none, reaches the password manager's frame; an error counts as no. */
async function aimedAtAddon(page, selector) {
  try {
    return (selector ? await page.locator(selector).evaluateAll(ADDON_TARGET) : await page.evaluate(FOCUS_IN_ADDON)) === true;
  } catch {
    return false;
  }
}

/** The size a `viewport` step asks for, rounded; a refusal outside 100..4000 px. */
function viewportSize({ width, height }) {
  const fits = size => Number.isFinite(size) && size >= 100 && size <= 4000;
  if (!fits(width) || !fits(height)) throw refusal(400, 'width and height required (100..4000 px)');
  return { width: Math.round(width), height: Math.round(height) };
}

/** Goes to an http(s) address and waits for the page's document, unless the address is a picture. */
async function go(page, url) {
  if (!/^https?:\/\//i.test(url ?? '')) throw refusal(400, 'url must be an http(s) address');
  const response = await page.goto(url, { waitUntil: 'commit', timeout: 30_000 });
  if (!(response?.headers()['content-type'] ?? '').startsWith('image/')) await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
}

const ADDON_OPEN_MS = 3000;
const ADDON_PROBE_MS = 1000;
const [SCREEN_WIDTH, SCREEN_HEIGHT] = XVFB_ARGS[2].split('x').map(Number);
/** Opens the password manager's page in the tab, sized to the screen less the browser's bar, as a live view fits it;
 * the driver can not use the tab until the person goes back to a site (tried 2026-11-05), which gets `own` back. */
async function openAddonPage(tab, url) {
  const [width, height, outer] = await tab.page.evaluate('[innerWidth, innerHeight, outerHeight]').catch(() => []);
  const size = outer > height ? { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - (outer - height) } : null;
  const own = tab.addon?.own ?? (width > 0 && height > 0 ? { width, height } : null);
  if (size) await tab.page.setViewportSize(size).then(() => tab.page.waitForTimeout(150), () => {});
  tab.addon = { size, own };
  await tab.page.goto(url, { waitUntil: 'commit', timeout: ADDON_OPEN_MS }).catch(() => {});
  return { ok: true, url };
}

/** The page text with refs: the main page, then each frame that holds a box, as camofox read them. */
export async function readPage(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
  const main = await page.locator('body').ariaSnapshot({ timeout: 5000 }).catch(() => '');
  const frames = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame() || frameSkipped(frame.url(), frame.name()) || inAddonFrame(frame)) continue;
    if (frames.length >= MAX_FRAMES) break;
    const yaml = await frame.locator('body').ariaSnapshot({ timeout: 3000 }).catch(() => '');
    if (frameHasBoxes(yaml)) frames.push({ label: frameLabel(frame.name(), frame.url()), yaml, frame });
  }
  return buildSnapshot(main, frames);
}

/** The element a ref names. Refs read before a click or a move are read again, as is a ref whose frame went. */
async function refLocator(tab, ref) {
  let info = tab.refs?.get(ref);
  if (!info || info.frame?.isDetached()) {
    tab.refs = (await readPage(tab.page)).refs;
    info = tab.refs.get(ref);
  }
  if (!info) throw refusal(409, `${ref} is not on the page now; read the page again and use a current ref`);
  if (info.frame && inAddonFrame(info.frame)) throw refusal(403, ADDON_REFUSAL);
  const scope = info.frame ?? tab.page;
  return (info.name ? scope.getByRole(info.role, { name: info.name, exact: true }) : scope.getByRole(info.role)).nth(info.nth);
}

/** A selector that matches one visible element among hidden copies takes that one; a list stays as given. */
async function clickTarget(page, selector) {
  const trimmed = selector.trim();
  if (trimmed.includes(',') || trimmed.includes(':visible')) return page.locator(selector);
  const visible = page.locator(`${trimmed}:visible`);
  return (await visible.count()) === 1 ? visible : page.locator(selector);
}

/** A click as camofox made it: a normal one, then a forced one past an overlay or a wait, then the page's own.
 * Resolves to how it landed: `mouse`, `forced`, or `script`, an event the page can tell from a person's. */
async function clickOn(locator) {
  try {
    await locator.click({ timeout: 3000 });
    return 'mouse';
  } catch (error) {
    if (!/intercepts pointer events|not visible|timeout/i.test(error.message)) throw error;
  }
  try {
    await locator.click({ timeout: 3000, force: true });
    return 'forced';
  } catch {
    await locator.evaluate(element => element.click(), undefined, { timeout: 3000 });
    return 'script';
  }
}

/** Each action on one tab, by its route name. */
const ACTIONS = {
  async navigate(tab, { url }) {
    if (ADDON_PAGE.test(url ?? '')) return openAddonPage(tab, url);
    await go(tab.page, url);
    return { ok: true, url: tab.page.url() };
  },
  async click(tab, { ref, selector }) {
    if (!ref && !selector) throw refusal(400, 'ref or selector required');
    const via = await clickOn(ref ? await refLocator(tab, ref) : await clickTarget(tab.page, selector));
    await tab.page.waitForTimeout(500);
    return { ok: true, url: tab.page.url(), via };
  },
  async type(tab, { ref, selector, text, mode = 'fill', delay = 30, pressEnter = false, submit = false }) {
    if (mode !== 'fill' && mode !== 'keyboard') throw refusal(400, "mode must be 'fill' or 'keyboard'");
    if (typeof text !== 'string') throw refusal(400, 'text is required');
    if (mode === 'fill' && !ref && !selector) throw refusal(400, 'ref or selector required for mode=fill');
    const locator = ref ? await refLocator(tab, ref) : null;
    if (mode === 'fill') await (locator ?? tab.page.locator(selector)).fill(text, { timeout: 10_000 });
    else {
      if (locator) await locator.focus({ timeout: 10_000 });
      else if (selector) await tab.page.focus(selector, { timeout: 10_000 });
      await tab.page.keyboard.type(text, { delay });
    }
    if (pressEnter || submit) await tab.page.keyboard.press('Enter');
    return { ok: true };
  },
  async select(tab, { ref, selector, option }) {
    if ((!ref && !selector) || typeof option !== 'string' || !option) throw refusal(400, 'ref or selector and a nonempty option are required');
    const locator = ref ? await refLocator(tab, ref) : tab.page.locator(selector);
    await locator.selectOption({ label: option }, { timeout: 5000 }).catch(() => locator.selectOption({ value: option }, { timeout: 5000 }));
    return { ok: true };
  },
  async press(tab, { key }) {
    await tab.page.keyboard.press(pressKey(key));
    return { ok: true };
  },
  async evaluate(tab, { expression }) {
    if (!expression) throw refusal(400, 'expression is required');
    return { ok: true, result: await tab.page.evaluate(expression) };
  },
  async viewport(tab, body) {
    const size = viewportSize(body);
    await tab.page.setViewportSize(size);
    await tab.page.waitForTimeout(150);
    return { ok: true, ...size };
  },
  async front(tab) {
    await tab.page.bringToFront();
    return { ok: true };
  },
};
// Only these actions keep the refs: the rest can change the page.
const KEEPS_REFS = new Set(['type', 'select', 'evaluate', 'viewport', 'front']);
// The agent's own steps, which never reach the password manager; only these run while its page shows.
const GUARDED = new Set(['click', 'type', 'select', 'press']);
const OPEN_ON_ADDON = new Set(['navigate', 'front']);

/** The request's JSON body, or {} with none. */
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw refusal(413, 'the request is too large');
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw refusal(400, 'the body is not JSON'); }
}

/** True when the request holds the API key. */
function authorized(request, key) {
  const given = Buffer.from(request.headers.authorization ?? '');
  const wanted = Buffer.from(`Bearer ${key}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/** The HTTP handler over one browser `context`: the camofox routes browse.mjs calls, each behind `key`, with one
 * page per userId + sessionKey. A tab unused for `idleMs` closes, as camofox's did. */
export function routes(context, key, { idleMs = IDLE_MS, stepMs = STEP_MS } = {}) {
  const tabs = new Map();
  let made = 0;
  const tabOf = (id, userId) => {
    const tab = tabs.get(id);
    if (!tab || tab.page.isClosed() || (userId && tab.userId !== userId)) throw refusal(404, 'Tab not found');
    tab.lastUse = Date.now();
    return tab;
  };
  // One step at a time on a tab, so a click never lands while the page text is read.
  // A step past `stepMs` fails, and the next one runs, so one stuck page call can't hold the tab for good.
  const queued = (tab, step) => {
    const run = tab.queue.then(() => {
      let timer;
      const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(refusal(504, `the page step timed out after ${stepMs / 1000} s`)), stepMs); });
      return Promise.race([step(), limit]).finally(() => clearTimeout(timer));
    });
    tab.queue = run.catch(() => {});
    return run;
  };
  const closeTab = async id => {
    const tab = tabs.get(id);
    tabs.delete(id);
    await tab?.page.close().catch(() => {});
  };
  const reaper = setInterval(() => {
    for (const [id, tab] of tabs) if (Date.now() - tab.lastUse > idleMs) void closeTab(id);
  }, Math.min(60_000, idleMs));
  reaper.unref();

  const openTab = async ({ userId, sessionKey, url }) => {
    if (!userId || !sessionKey) throw refusal(400, 'userId and sessionKey required');
    const known = [...tabs].find(([, tab]) => tab.userId === userId && tab.sessionKey === sessionKey && !tab.page.isClosed());
    if (known) {
      const [tabId, tab] = known;
      return queued(tab, async () => {
        if (url) await go(tab.page, url);
        Object.assign(tab, { refs: null, text: null, lastUse: Date.now() });
        return { tabId, url: tab.page.url() };
      });
    }
    const page = await context.newPage();
    try { if (url) await go(page, url); } catch (error) { await page.close().catch(() => {}); throw error; }
    const tabId = `tab-${Date.now().toString(36)}-${++made}`;
    tabs.set(tabId, { page, userId, sessionKey, refs: null, text: null, lastUse: Date.now(), queue: Promise.resolve() });
    page.on('close', () => { if (tabs.get(tabId)?.page === page) tabs.delete(tabId); });
    return { tabId, url: page.url() };
  };
  const listTabs = async userId => ({
    running: true,
    tabs: await Promise.all([...tabs].filter(([, tab]) => tab.userId === userId && !tab.page.isClosed())
      .map(async ([tabId, tab]) => ({ tabId, url: tab.page.url(), title: await tab.page.title().catch(() => ''), listItemId: tab.sessionKey }))),
  });
  /** Whether the tab shows the password manager's page. The driver does not see that page, so a tab sent there counts
   * as on it until a quick read gives a site again; the site then gets the page's own size back. */
  const onAddon = async tab => {
    if (ADDON_PAGE.test(tab.page.url())) return true;
    if (!tab.addon) return false;
    const href = await Promise.race([tab.page.evaluate('document.URL').catch(() => null), new Promise(done => setTimeout(done, ADDON_PROBE_MS, null))]);
    if (typeof href !== 'string' || ADDON_PAGE.test(href)) return true;
    const { own } = tab.addon;
    tab.addon = null;
    if (own) await tab.page.setViewportSize(own).catch(() => {});
    return false;
  };
  /** A resize while the password manager's page shows: that page keeps its size, and the size asked for is the one
   * the site gets back, so a live view's end sets it. */
  const keepForSite = (tab, body) => {
    tab.addon.own = viewportSize(body);
    return { ok: true, ...tab.addon.size, addonPage: true };
  };
  const snapshot = (tab, offset) => queued(tab, async () => {
    if (await onAddon(tab)) throw onAddonPage(tab);
    // A later window reads the text the first one built, so the pieces join.
    if (!offset || tab.text == null) Object.assign(tab, (({ refs, snapshot: text }) => ({ refs, text }))(await readPage(tab.page)));
    return { url: tab.page.url(), ...windowSnapshot(tab.text, offset), refsCount: tab.refs.size };
  });
  const act = (tab, name, body) => queued(tab, async () => {
    if (name === 'viewport' && tab.addon && await onAddon(tab)) return keepForSite(tab, body);
    if (!OPEN_ON_ADDON.has(name) && await onAddon(tab)) throw onAddonPage(tab);
    if (GUARDED.has(name)) await guardAddon(tab.page, body);
    const result = await ACTIONS[name](tab, body);
    if (!KEEPS_REFS.has(name)) Object.assign(tab, { refs: null, text: null });
    return result;
  });

  /** The answer to one authorized request: a JSON body, or PNG bytes. */
  const answer = async (method, parts, query, body) => {
    const userId = body.userId ?? query.get('userId');
    const [top, id, action] = parts;
    if (top === 'tabs' && !id) {
      if (method === 'POST') return openTab(body);
      if (method === 'GET') return listTabs(userId);
    }
    if (top === 'tabs' && id && !action && method === 'DELETE') {
      if (!userId) throw refusal(400, 'userId required (query or body)');
      if (tabs.get(id)?.userId === userId) await closeTab(id);
      return { ok: true };
    }
    if (top === 'tabs' && method === 'GET' && action === 'snapshot') return snapshot(tabOf(id, userId), Number(query.get('offset') ?? 0));
    if (top === 'tabs' && method === 'GET' && action === 'screenshot') {
      const tab = tabOf(id, userId);
      return queued(tab, async () => {
        if (await onAddon(tab)) throw onAddonPage(tab);
        return tab.page.screenshot({ type: 'png', fullPage: query.get('fullPage') === 'true' });
      });
    }
    if (top === 'tabs' && method === 'POST' && Object.hasOwn(ACTIONS, action)) return act(tabOf(id, userId), action, body);
    if (top === 'sessions' && id && !action && method === 'DELETE') {
      await Promise.all([...tabs].filter(([, tab]) => tab.userId === id).map(([tabId]) => closeTab(tabId)));
      return { ok: true };
    }
    if (top === 'sessions' && id && action === 'cookies' && method === 'POST') {
      if (!Array.isArray(body.cookies)) throw refusal(400, 'cookies must be a list');
      // The profile folder keeps cookies itself; an empty list asks for nothing more.
      if (body.cookies.length) await context.addCookies(body.cookies);
      return { ok: true, count: body.cookies.length };
    }
    throw refusal(404, 'no such route');
  };

  const handle = async (request, response) => {
    const send = (status, body) => {
      if (Buffer.isBuffer(body)) response.writeHead(status, { 'content-type': 'image/png' }).end(body);
      else response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    };
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/health') return send(200, { ok: true, engine: 'camoufox', tabs: tabs.size });
    if (!authorized(request, key)) return send(401, { error: 'unauthorized' });
    try {
      const body = request.method === 'POST' ? await readBody(request) : {};
      send(200, await answer(request.method, url.pathname.split('/').filter(Boolean).map(decodeURIComponent), url.searchParams, body));
    } catch (error) {
      send(error.status ?? 500, { error: error.message, ...(error.addonPage && { addonPage: true, size: error.size }) });
    }
  };
  handle.close = () => clearInterval(reaper);
  return handle;
}

/** Starts Xvfb on the first free display; resolves to its `{display, child}`. */
function startXvfb() {
  return new Promise((resolve, reject) => {
    const child = spawn('Xvfb', ['-displayfd', '3', ...XVFB_ARGS], { stdio: ['ignore', 'ignore', 'ignore', 'pipe'] });
    let text = '';
    child.stdio[3].on('data', chunk => {
      text += chunk;
      if (text.includes('\n')) resolve({ display: `:${text.trim()}`, child });
    });
    child.once('error', () => reject(new Error('Xvfb, the screen the browser draws on, is not installed')));
    child.once('exit', () => reject(new Error('Xvfb stopped before it gave a display')));
  });
}

const starting = response => {
  response.writeHead(503, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ok: false, starting: true }));
};

/** Off Linux the browser shows in a window unless the person turned it off: its launch flags and server record. */
export function windowLaunch({ platform, setting }) {
  const shown = platform !== 'linux' && setting;
  return { args: shown ? ['--window'] : [], record: shown ? { window: true } : {} };
}

const record = info => writeFileSync(FILES.server, `${JSON.stringify({ pid: process.pid, ...info })}\n`, { mode: 0o600 });

/** Takes the port, then starts the forwarder, the screen, the browser and the routes; /health says ok only once the
 * browser is up. A failed start leaves its reason in server.json. */
async function main() {
  const port = Number(process.env.BROWSE_SERVER_PORT);
  const stops = [];
  let stopping = false;
  const stop = async code => {
    if (stopping) return;
    stopping = true;
    for (const step of stops.reverse()) await Promise.resolve().then(step).catch(() => {});
    process.exit(code);
  };
  process.on('SIGTERM', () => void stop(0));
  process.on('SIGINT', () => void stop(0));
  let handle = null;
  // The port is taken first, so a taken port fails before a browser starts; /health says 503 until the routes are up.
  const server = createServer((request, response) => handle ? handle(request, response) : starting(response));
  try {
    await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
    stops.push(() => new Promise(done => { handle?.close(); server.close(done); server.closeAllConnections(); }));
    const proxy = await startForwarder();
    stops.push(() => proxy.close());
    // Only Linux gets Xvfb; a Mac or Windows browser shows in a window, or none when turned off.
    const screen = process.platform === 'linux' ? await startXvfb() : null;
    if (screen) stops.push(() => screen.child.kill());
    const windowed = windowLaunch({ platform: process.platform, setting: windowSetting() });
    // A broken add-on never stops a start: the browser starts without it.
    const addon = await addonArgs().catch(() => []);
    const config = await launchConfig(['--proxy', `http://127.0.0.1:${proxy.port}`, ...(screen ? ['--display', screen.display] : []), ...windowed.args, '--fingerprint', FILES.fingerprint, ...addon]);
    if (config.error) throw new Error(config.error);
    const { firefox } = createRequire(import.meta.url)(join(config.driver, 'index.js'));
    const context = await firefox.launchPersistentContext(FILES.profile, { ...contextOptions(config.options), timeout: LAUNCH_MS });
    stops.push(() => context.close());
    await moveLogins(context, { profilesDir: OLD_PROFILES, marker: FILES.marker }).catch(() => {});
    handle = routes(context, readFileSync(FILES.key, 'utf8').trim());
    record({ port, display: screen?.display ?? null, ...windowed.record, library: config.library, build: config.build, locale: config.locale });
    // A browser that quits on its own takes the server with it, so the next command starts a fresh one.
    context.on('close', () => void stop(1));
  } catch (error) {
    // A taken port leaves no reason, so browse.mjs tries another port; any other failure is the browser's own.
    if (error.code !== 'EADDRINUSE') record({ port, error: error.message });
    await stop(1);
  }
}

if (isMain(import.meta.url)) await main();
