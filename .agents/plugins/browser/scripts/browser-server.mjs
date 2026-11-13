#!/usr/bin/env node
// The shared browser: one Camoufox profile, driven by the Playwright inside the Python camoufox library, behind the
// REST routes camofox-browser had (github.com/jo-inc/camofox-browser, MIT), so browse.mjs keeps its calls.
import { spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startArgs as addonArgs, handBackArgs } from './addons.mjs';
import { FILES, LAUNCH_MS, OLD_PROFILES, launchConfig, proxySetting, windowSetting } from './browse.mjs';
import { NETWORK_FILE, startForwarder } from './forwarder.mjs';
import { moveLogins } from './login-move.mjs';
import { resolveFirst, resolveUpstream } from './proxy-lines.mjs';
import { ADDON_PAGE, ADDON_REFUSAL, MAX_FRAMES, buildSnapshot, frameHasBoxes, frameLabel, frameSkipped, windowSnapshot } from './refs.mjs';
import { isMain } from './lib/cli.mjs';
import { primaryRoot } from './lib/primary-root.mjs';

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
// A task's tab opens from the home tab through the browser's own new-tab path: the driver's new page is always a
// new window. It opens behind the tab shown, so it never takes the person's tab away.
const OPEN_TAB = "void window.open('about:blank', '_blank')";
const TAB_PREFS = { 'browser.tabs.loadDivertedInBackground': true };
const TAB_MS = 15_000;
// The person's turn keeps its tab in front while the helper renews it; a helper that died lets go after this.
const TURN_MS = 60_000;
const BUSY = 'the person is using the browser';
// How long the check that a turn's page still shows may take; a live view's poll catches a miss.
const SHOWN_MS = 1000;
// The server's own code: once one of these changes, an idle server stops, so the next command starts the new code.
const OWN_CODE = ['browser-server.mjs', 'browse.mjs', 'refs.mjs', 'addons.mjs', 'forwarder.mjs', 'login-move.mjs', 'proxy-lines.mjs'];
// The mark before the title of each tab that waits on the person; the browser lets a script change nothing else there.
export const BELL = '🔔 ';
const BELL_MS = 1000;
/** Puts the bell before the page's title, and keeps it there while the site changes its title. It runs in the page,
 * with the bell, and keeps its watcher on the document, which the page's own scripts never see. */
const RING = bell => {
  const mark = () => { if (!document.title.startsWith(bell)) document.title = bell + document.title; };
  mark();
  if (document.wongBell) return;
  document.wongBell = new MutationObserver(mark);
  document.wongBell.observe(document.head ?? document.documentElement, { subtree: true, childList: true, characterData: true });
};
/** Takes the bell off the page's title, and stops keeping it. It runs in the page, with the bell. */
const UNRING = bell => {
  document.wongBell?.disconnect();
  delete document.wongBell;
  if (document.title.startsWith(bell)) document.title = document.title.slice(bell.length);
};
// The screen a Linux desktop's window needs; the library hands the browser no variable of its own.
const SCREEN_VARS = ['DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR'];

/** A refusal with its HTTP status. */
const refusal = (status, message) => Object.assign(new Error(message), { status });
const sleep = wait => new Promise(done => setTimeout(done, wait));

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

/** The persistent context's options for launch-config.py's answer `config`: the library's, with the screen's
 * variables `screen` and the pref that opens a task's tab behind the one shown. */
export function persistentOptions(config, screen = {}) {
  const options = contextOptions(config.options);
  return { ...options, env: { ...options.env, ...screen }, firefoxUserPrefs: { ...options.firefoxUserPrefs, ...TAB_PREFS }, timeout: LAUNCH_MS };
}

/** A key as Playwright's `keyboard.press` spells it: `ctrl+a` is `Control+a`. */
export const pressKey = key => String(key).split('+').map(part => KEY_ALIASES[part.trim().toLowerCase()] ?? part.trim()).join('+');

/** The refusal while the tab shows the password manager's page, marked so a live view's helper can tell it apart. It
 * gives the page's own size, `[width, height]`, so a view over that page sets it back at its end. */
const onAddonPage = tab => Object.assign(refusal(403, ADDON_REFUSAL), { addonPage: true, size: tab.addon?.own ? [tab.addon.own.width, tab.addon.own.height] : null });
/** Whether any of `found` is the password manager's frame, or inside it. It runs in the page, so it uses nothing
 * outside. */
const ADDON_TARGET = found => found.some(element => (/^(IFRAME|FRAME|OBJECT|EMBED)$/.test(element.tagName) && /^moz-extension:/i.test(element.src || element.data || ''))
  || /^moz-extension:/i.test(element.ownerDocument?.URL ?? ''));
/** Whether the page's keyboard is in `frame`: on the frame, or on the element whose shadow root holds it, closed ones
 * too, as 1Password's are. It runs in the page with the frame's element. */
const HOLDS_FOCUS = frame => {
  let field = document.activeElement;
  while (field?.shadowRoot?.activeElement) field = field.shadowRoot.activeElement;
  for (let at = frame; at; at = at.getRootNode().host) if (at === field) return true;
  return false;
};
/** Whether `frame` is the password manager's, or sits inside one. */
const inAddonFrame = frame => {
  for (let at = frame; at; at = at.parentFrame?.()) if (ADDON_PAGE.test(at.url())) return true;
  return false;
};

const KEY_IN_BOX = "a password manager's box shows on this page, and a key could press its buttons";
const LIST_OPEN = "the password manager's fill list is open on this page, and a key could pick a login from it: pick through `browse.mjs addon logins` and `addon pick`, or close the list with `press Escape` first";

/** Refuses a step aimed at the password manager's frame by selector or keyboard (a ref never names one), and, while its
 * fill list shows, any key but Escape: arrow keys and Enter in the page's own box pick from that list. */
async function guardAddon(page, name, { ref, selector, key, pressEnter, submit }) {
  if (!ref && await aimedAtAddon(page, selector)) throw await addonRefusal(page);
  const keys = name === 'press' ? !/^escape$/i.test(String(key ?? '').trim()) : name === 'type' && Boolean(pressEnter || submit);
  if (keys && await addonFrameShown(page)) throw await keyRefusal(page);
}

/** The refusal of a key while a password manager's frame shows: its fill list's, else one naming `addon close` while
 * a box of its own covers the page, which Escape does not close. */
async function keyRefusal(page) {
  const list = fillList(page);
  const element = list ? await list.frameElement().catch(() => null) : null;
  if (list && (!element || await element.isVisible().catch(() => true))) return refusal(403, LIST_OPEN);
  return refusal(403, (await hintBoxes(page)).length ? `${KEY_IN_BOX}${BOX_HINT}` : KEY_IN_BOX);
}

/** Whether a password manager's frame shows on the page; one whose element can not be read counts as shown. */
async function addonFrameShown(page) {
  for (const frame of page.frames().filter(inAddonFrame)) {
    const element = await frame.frameElement().catch(() => null);
    if (!element || await element.isVisible().catch(() => true)) return true;
  }
  return false;
}

/** The refusal of a step aimed at the password manager, pointing to `addon close` while a box of its own shows. */
async function addonRefusal(page) {
  return refusal(403, (await hintBoxes(page)).length ? `${ADDON_REFUSAL}${BOX_HINT}` : ADDON_REFUSAL);
}

/** Whether `selector`, or the keyboard with none, reaches the password manager's frame; an error counts as no. */
async function aimedAtAddon(page, selector) {
  try {
    return selector ? (await page.locator(selector).evaluateAll(ADDON_TARGET)) === true : await focusInAddon(page);
  } catch {
    return false;
  }
}

/** Whether the keyboard is in one of the password manager's frames. */
async function focusInAddon(page) {
  for (const frame of page.frames().filter(inAddonFrame)) {
    const element = await frame.frameElement().catch(() => null);
    if (element && (await element.evaluate(HOLDS_FOCUS).catch(() => false)) === true) return true;
  }
  return false;
}

/** 1Password's in-page fill list: its frame, whose address says whether it is locked, and its login rows. */
const FILL_LIST = /^moz-extension:\/\/[^/]+\/inline\/menu\/menu\.html/i;
const LOGIN_ROW = '[role="menuitem"].entry';
const LIST_MS = 3000;
const LIST_POLL_MS = 250;
const LIST_PRESS_MS = 1000;
const FILL_MS = 3000;
/** How long a read of the login names lets one pick follow. */
export const PICK_MS = 2 * 60_000;
// The username box, else the text box before the first password box, else that password box, as a 2-step sign-in.
const LOGIN_BOXES = ['input[autocomplete~="username" i]:visible, input[autocomplete~="email" i]:visible',
  'xpath=(//input[@type="password"])[1]/preceding::input[not(@type) or @type="text" or @type="email"][1]', 'input[type="password"]:visible'];
/** The login box and each shown password box with its value, kept in the page as a handle: Node never reads a value.
 * A hidden password box, as on Google's email step, is no box: it runs in the page, so it repeats the filter. */
const BOX_VALUES = login => new Map([login, ...[...document.querySelectorAll('input[type="password"]')]
  .filter(box => box.checkVisibility?.() ?? box.getClientRects().length > 0)].map(box => [box, box.value]));
/** Whether a box changed since `before` and the page now holds a password, or the login of a 2-step sign-in. */
const FILLED_SINCE = (login, before) => {
  const passwords = [...document.querySelectorAll('input[type="password"]')].filter(box => box.checkVisibility?.() ?? box.getClientRects().length > 0);
  const changed = [login, ...passwords].some(box => !before.has(box) || before.get(box) !== box.value);
  return changed && (passwords.length ? passwords.some(box => box.value !== '') : login.value !== '');
};
const NO_OFFER = 'run `browse.mjs addon logins` on this page and ask the person first: a pick needs its login names read here within 2 minutes, once';

const fillList = page => page.frames().find(frame => FILL_LIST.test(frame.url()));

// 1Password draws its icon in a closed shadow root no locator reaches (tried 2026-11-13), so the page finds it where
// it shows in the login box. It runs in the page with that box, so it uses nothing outside.
const ICON_TAGS = ['com-1password-button'];
const ICON_AT = (box, tags) => {
  const { left, top, right, bottom } = box.getBoundingClientRect();
  const hits = [];
  for (let x = left; x < right; x += 4) {
    for (let y = top; y < bottom; y += 4) if (tags.includes(box.ownerDocument.elementFromPoint(x, y)?.localName)) hits.push([x, y]);
  }
  const mid = axis => hits.reduce((sum, hit) => sum + hit[axis], 0) / hits.length;
  return hits.length ? { x: mid(0), y: mid(1) } : null;
};
const ICON_MS = 1500;

/** Clicks the password manager's icon in the login box, once, where the page shows it; false with none there. */
async function clickIcon(page, box) {
  const at = await box.evaluate(ICON_AT, ICON_TAGS, { timeout: 3000 }).catch(() => null);
  if (!at) return false;
  await page.mouse.click(at.x, at.y);
  return true;
}

/** 1Password's page for a box over the page, such as *Save login?* or its passkey box. */
const BOX_PAGE = /^moz-extension:\/\/[^/]+\/inline\/notification\/notification\.html/i;
const PASSKEY_TITLE = { name: 'Sign in with a passkey', exact: true };
const PASSKEY_ROW = 'li button';
const PASSKEY_SIGN_IN = { name: 'Sign in', exact: true };
const PASSKEY_MS = 10_000;
/** The passkey box's offer, `{names, locked}`: each `row`'s text, or the one passkey's beside its *Sign in* button.
 * It runs in the box's frame, so it uses nothing outside. */
const PASSKEY_OFFER = (body, row) => {
  const line = element => element.innerText.split('\n').map(part => part.trim()).filter(part => part && part !== 'Sign in').join(' · ').slice(0, 200);
  const rows = [...body.querySelectorAll(row)];
  const button = rows.length ? null : [...body.querySelectorAll('button')].find(found => found.innerText.trim() === 'Sign in');
  let single = button?.parentElement;
  while (single && !line(single)) single = single.parentElement;
  const names = rows.length ? rows.map(line) : single ? [line(single)] : [];
  return { names, locked: !names.length && /unlock/i.test(body.innerText) };
};

const isPasskeyBox = async frame => BOX_PAGE.test(frame.url()) && await frame.getByRole('heading', PASSKEY_TITLE).count().catch(() => 0) > 0;

/** The shown passkey box, or null. */
async function passkeyBox(page) {
  for (const frame of await shownBoxes(page)) if (await isPasskeyBox(frame)) return frame;
  return null;
}

/** The boxes a refusal points to `addon close` for: all but the passkey box, whose close would drop a sign-in. */
async function hintBoxes(page) {
  const boxes = [];
  for (const frame of await shownBoxes(page)) if (!(await isPasskeyBox(frame))) boxes.push(frame);
  return boxes;
}

/** The passkey box's offer as `offeredLogins` gives it: `{state: 'passkey', names, box}`, `locked`, or `none`. */
async function offeredPasskeys(box) {
  const { names = [], locked = false } = await box.locator('body').evaluate(PASSKEY_OFFER, PASSKEY_ROW, { timeout: 3000 }).catch(() => ({}));
  return names.length ? { state: 'passkey', names, box } : { state: locked ? 'locked' : 'none', names: [] };
}

/** Presses passkey `n`'s sign-in once its name is still the one read, then waits for the box to go, as it does once
 * signed in. */
async function pickPasskey(page, n, name) {
  const box = await passkeyBox(page);
  const { names } = box ? await offeredPasskeys(box) : { names: [] };
  if (names[n - 1] !== name) throw refusal(409, 'the password manager no longer offers that passkey here; read the logins again and ask the person again');
  const rows = box.locator(PASSKEY_ROW);
  await clickOn(await rows.count() ? rows.nth(n - 1) : box.getByRole('button', PASSKEY_SIGN_IN));
  if (!(await gone(page, [box], PASSKEY_MS))) throw refusal(502, 'the password manager did not sign in with the passkey');
}

// Its own close button's names, or the X's; never *Save*, *Update*, or *Never*, which save or change a setting.
const CLOSE_NAMES = /^(close|dismiss|dismiss banner|not now|no thanks)$/i;
const CLOSE_MS = 3000;
const BOX_HINT = '; a box of its own covers the page: close it with browse.mjs addon close';
const NO_CLOSE = "the password manager's box has no close button; the person closes it in the live view";

/** Each shown frame of the password manager's but its fill list, which Escape closes: its boxes over the page. */
async function shownBoxes(page) {
  const shown = [];
  for (const frame of page.frames().filter(frame => inAddonFrame(frame) && !FILL_LIST.test(frame.url()) && !inAddonFrame(frame.parentFrame?.() ?? null))) {
    const element = await frame.frameElement().catch(() => null);
    if (element && await element.isVisible().catch(() => false)) shown.push(frame);
  }
  return shown;
}

/** Whether every one of `frames` on `page` went, hidden or detached, within `wait`. */
async function gone(page, frames, wait) {
  for (const end = Date.now() + wait; Date.now() < end; await sleep(LIST_POLL_MS)) {
    if (!(await shownBoxes(page)).some(frame => frames.includes(frame))) return true;
  }
  return false;
}

/** Closes each box by its own close button: none pressed unless every box has one. Resolves to how many closed. */
async function closeBoxes(page) {
  const boxes = await shownBoxes(page);
  const buttons = await Promise.all(boxes.map(async frame => {
    const button = frame.getByRole('button', { name: CLOSE_NAMES }).first();
    return await button.count().catch(() => 0) ? button : null;
  }));
  if (buttons.includes(null)) throw refusal(403, NO_CLOSE);
  for (const button of buttons) await clickOn(button);
  if (boxes.length && !(await gone(page, boxes, CLOSE_MS))) throw refusal(502, "the password manager's box did not close; the person closes it in the live view");
  return boxes.length;
}

async function loginBox(page) {
  for (const selector of LOGIN_BOXES) {
    const box = page.locator(selector).first();
    if (await box.count().catch(() => 0)) return box;
  }
  return null;
}

/** Each login row's visible text, one line each; nothing else in the list is read. */
const rowNames = list => list.locator(LOGIN_ROW).evaluateAll(rows => rows.map(row => row.innerText.split('\n').map(line => line.trim()).filter(Boolean).join(' · ').slice(0, 200)));

/** A shown passkey box's passkeys, else the login box's list: `{state: 'list', names, box}`, `locked`, or `none`. A
 * key opens the list when focus alone does not, and then the add-on's icon in the box. */
async function offeredLogins(page) {
  const passkeys = await passkeyBox(page);
  if (passkeys) return offeredPasskeys(passkeys);
  const box = await loginBox(page);
  if (!box) return { state: 'none', names: [] };
  await box.focus({ timeout: 3000 });
  const start = Date.now();
  for (let end = start + LIST_MS, pressed = 0, clicked = false; Date.now() < end; await sleep(LIST_POLL_MS)) {
    const list = fillList(page);
    if (list && new URL(list.url()).searchParams.get('locked') !== 'false') return { state: 'locked', names: [] };
    const names = list ? await rowNames(list).catch(() => []) : [];
    if (names.length) return { state: 'list', names, box };
    if (list) continue;
    if (!clicked && Date.now() - start >= ICON_MS) {
      clicked = true;
      if (await clickIcon(page, box)) pressed = Date.now();
    }
    if (Date.now() - pressed >= LIST_PRESS_MS) {
      await box.press('ArrowDown', { timeout: 3000 });
      pressed = Date.now();
    }
  }
  return { state: 'none', names: [] };
}

/** Clicks login `n` once its name is still the one read, then waits for a box to change and the page's password box,
 * or the login box of a 2-step sign-in, to hold a value: a pre-filled email alone is no fill. */
async function pickLogin(page, n, name) {
  const { state, names, box } = await offeredLogins(page);
  if (state !== 'list' || names[n - 1] !== name) throw refusal(409, 'the password manager no longer offers that login here; read the logins again and ask the person again');
  const before = await box.evaluateHandle(BOX_VALUES);
  try {
    await clickOn(fillList(page).locator(LOGIN_ROW).nth(n - 1));
    for (const end = Date.now() + FILL_MS; Date.now() < end; await sleep(LIST_POLL_MS)) {
      if (await box.evaluate(FILLED_SINCE, before).catch(() => false) === true) return;
    }
  } finally {
    await before.dispose().catch(() => {});
  }
  throw refusal(502, 'the password manager did not fill the page');
}

/** Sizes the page with its tab shown: a tab behind sizes the window the shown one is in, and never ends (tried
 * 2026-11-06). */
async function showAndSize(page, size) {
  await page.bringToFront();
  await page.setViewportSize(size);
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
  if (size) await showAndSize(tab.page, size).then(() => tab.page.waitForTimeout(150), () => {});
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
  if (info.frame && inAddonFrame(info.frame)) throw await addonRefusal(tab.page);
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
    await showAndSize(tab.page, size);
    await tab.page.waitForTimeout(150);
    return { ok: true, ...size };
  },
  async front(tab) {
    await tab.page.bringToFront();
    return { ok: true };
  },
  /** The one opening in the add-on guard: the login or passkey names here, kept with the address for one pick. */
  async logins(tab) {
    const { state, names } = await offeredLogins(tab.page);
    tab.offer = state === 'list' || state === 'passkey' ? { url: tab.page.url(), names, at: Date.now(), passkey: state === 'passkey' } : null;
    return { ok: true, state, names };
  },
  async pick(tab, { n }) {
    const { offer } = tab;
    tab.offer = null;
    if (!offer || offer.url !== tab.page.url() || Date.now() - offer.at > PICK_MS) throw refusal(409, NO_OFFER);
    if (!Number.isInteger(n) || n < 1 || n > offer.names.length) throw refusal(400, `pick takes a login number from 1 to ${offer.names.length}`);
    if (!offer.passkey) await pickLogin(tab.page, n, offer.names[n - 1]);
    else await pickPasskey(tab.page, n, offer.names[n - 1]);
    return { ok: true, ...(offer.passkey ? { passkey: true } : { filled: true }) };
  },
  /** The other opening: each box of the password manager's over the page, closed by its own close button. */
  async closeBoxes(tab) {
    return { ok: true, closed: await closeBoxes(tab.page) };
  },
};
// Only these actions keep the refs: the rest can change the page.
const KEEPS_REFS = new Set(['type', 'select', 'evaluate', 'viewport', 'front', 'logins']);
// The agent's own steps, which never reach the password manager; only these run while its page shows.
const GUARDED = new Set(['click', 'type', 'select', 'press']);
const OPEN_ON_ADDON = new Set(['navigate', 'front']);
// Steps that can bring their tab to the front: a resize, and a click in the add-on's list, icon, or box.
const RAISES_TAB = new Set(['viewport', 'logins', 'pick', 'closeBoxes']);

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

/** Whether the page shows, within `SHOWN_MS`; a page that does not answer counts as shown. */
const pageShown = page => Promise.race([page.evaluate('document.visibilityState').then(state => state === 'visible', () => true),
  new Promise(done => setTimeout(done, SHOWN_MS, true).unref?.())]);

/** A check of the server's own code `files`: true once one changed, went, or came after this call. */
export function codeChanged(files) {
  const stamp = file => { try { return statSync(file).mtimeMs; } catch { return null; } };
  const start = files.map(stamp);
  return () => files.some((file, at) => stamp(file) !== start[at]);
}

/** The server's own scripts in `dir`, and the same scripts in the primary checkout, where a merge lands: a linked
 * worktree, which often starts the server, never gets one. `find` gives the checkout's `{root, primary}`. */
export function ownCode(dir, find = primaryRoot) {
  const here = OWN_CODE.map(name => join(dir, name));
  try {
    const { root, primary } = find(dir);
    return primary === root ? here : [...here, ...OWN_CODE.map(name => join(primary, relative(root, dir), name))];
  } catch {
    return here;
  }
}

/** The HTTP handler over one browser `context`: browse.mjs's routes behind `key`, a tab per userId + sessionKey, closed
 * after `idleMs` unused. `handBackKey` opens only the turn count and Hand back. Idle and `outdated()`: `onOutdated`. */
export function routes(context, key, { idleMs = IDLE_MS, stepMs = STEP_MS, turnMs = TURN_MS, handBackKey = null, outdated = () => false, onOutdated = () => {} } = {}) {
  const tabs = new Map();
  let made = 0;
  let home = null;
  let opening = Promise.resolve();
  // Tabs still opening: one has no entry in `tabs` yet, so the idle stop waits for it.
  let pendingOpens = 0;
  // Each page made for a task's tab: any other page but the home tab is one the person or a site opened.
  const taskPages = new WeakSet();
  // Each open turn by its tab's id, `{until, before, shared}`: a turn's page that shows goes back to the front after
  // another tab's step. `before` holds the pages open when it began; shared turns stand side by side.
  const turns = new Map();
  // The tabs whose shared turn the person handed back, each until its renewal hears it, or a lease's time.
  const handedBack = new Map();
  const tabOf = (id, userId) => {
    const tab = tabs.get(id);
    if (!tab || tab.page.isClosed() || (userId && tab.userId !== userId)) throw refusal(404, 'Tab not found');
    tab.lastUse = Date.now();
    return tab;
  };
  // One step at a time on a tab, so a click never lands while the page text is read.
  // A step past `stepMs` fails, and the next one runs, so one stuck page call can't hold the tab for good.
  const inQueue = (tab, step) => {
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
    if (!tabs.size && !pendingOpens && !openTurns().size && outdated()) onOutdated();
  }, Math.min(60_000, idleMs));
  reaper.unref();

  /** The kept blank tab no task gets: the browser's first page, else a new window when the person closed it. */
  const homeTab = async () => {
    if (home && !home.isClosed()) return home;
    const first = home ? null : context.pages().find(page => !page.isClosed() && page.url() === 'about:blank');
    home = first ?? await context.newPage();
    return home;
  };
  /** A new tab in the home tab's window, with no way back to it. One opens at a time, so each gets its own. */
  const newTab = () => {
    const made = opening.then(async () => {
      const from = await homeTab();
      const [page] = await Promise.all([
        context.waitForEvent('page', { predicate: async page => (await page.opener()) === from, timeout: TAB_MS }),
        from.evaluate(OPEN_TAB),
      ]);
      taskPages.add(page);
      await page.evaluate('window.opener = null').catch(() => {});
      return page;
    });
    opening = made.catch(() => {});
    return made;
  };
  /** Runs `script` with the bell on the tab's page, for at most a second: a page that never answers holds no turn. */
  const onTitle = (id, script) => {
    const page = tabs.get(id)?.page;
    return page && Promise.race([page.evaluate(script, BELL).catch(() => {}), sleep(BELL_MS)]);
  };
  /** Ends the tab's turn and takes its bell off. */
  const endTurn = id => {
    if (turns.get(id)?.shared) void onTitle(id, UNRING);
    turns.delete(id);
  };
  /** The open turns, once each lapsed lease or closed tab has ended its own. */
  const openTurns = () => {
    for (const [id, held] of turns) if (Date.now() >= held.until || tabs.get(id)?.page.isClosed() !== false) endTurn(id);
    for (const [id, until] of handedBack) if (Date.now() >= until) handedBack.delete(id);
    return turns;
  };
  /** Whether another tab holds a turn of the person's. */
  const otherTurn = tab => [...openTurns().keys()].some(id => id !== tab.id);
  /** Ends every shared turn, as the person's *Hand back* in the browser's toolbar does: each renewal then hears it. */
  const handBack = () => {
    for (const [id, held] of openTurns()) {
      if (!held.shared) continue;
      handedBack.set(id, Date.now() + turnMs);
      endTurn(id);
    }
    return { ok: true };
  };
  const openTab = async ({ userId, sessionKey, url }) => {
    if (!userId || !sessionKey) throw refusal(400, 'userId and sessionKey required');
    const known = [...tabs].find(([, tab]) => tab.userId === userId && tab.sessionKey === sessionKey && !tab.page.isClosed());
    if (known) {
      const [tabId, tab] = known;
      return inQueue(tab, async () => {
        if (url) await go(tab.page, url);
        Object.assign(tab, { refs: null, text: null, lastUse: Date.now() });
        return { tabId, url: tab.page.url() };
      });
    }
    pendingOpens++;
    let page;
    try {
      page = await newTab();
      try { if (url) await go(page, url); } catch (error) { await page.close().catch(() => {}); throw error; }
    } finally { pendingOpens--; }
    const tabId = `tab-${Date.now().toString(36)}-${++made}`;
    tabs.set(tabId, { id: tabId, page, userId, sessionKey, refs: null, text: null, lastUse: Date.now(), queue: Promise.resolve() });
    page.on('close', () => {
      if (tabs.get(tabId)?.page === page) tabs.delete(tabId);
    });
    // A new page has the site's own title: the bell goes back on.
    page.on('domcontentloaded', () => { if (turns.get(tabId)?.shared) void onTitle(tabId, RING); });
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
    // A resize shows the tab, so during another tab's turn the size comes back at a later read.
    if (own && otherTurn(tab)) return false;
    tab.addon = null;
    if (own) await showAndSize(tab.page, own).catch(() => {});
    return false;
  };
  /** A resize while the password manager's page shows: the page takes the width, keeps its height under the bar, and
   * the size asked for is the one the site gets back, so a live view's end sets it. */
  const keepForSite = async (tab, body) => {
    const asked = tab.addon.own = viewportSize(body);
    const size = { width: asked.width, height: tab.addon.size?.height ?? asked.height };
    const shown = tab.addon.shown ?? tab.addon.size;
    if (size.width !== shown?.width || size.height !== shown?.height) {
      // The driver's resize reaches this page, but its answer never comes while the page shows (tried 2026-11-12);
      // so it is sent once per size, unawaited, and a closed tab's late rejection is dropped.
      tab.page.setViewportSize(size).catch(() => {});
      tab.addon.shown = size;
      await tab.page.waitForTimeout(150);
    }
    return { ok: true, ...size, addonPage: true };
  };
  const snapshot = (tab, offset) => inQueue(tab, async () => {
    if (await onAddon(tab)) throw onAddonPage(tab);
    // A later window reads the text the first one built, so the pieces join.
    if (!offset || tab.text == null) Object.assign(tab, (({ refs, snapshot: text }) => ({ refs, text }))(await readPage(tab.page)));
    return { url: tab.page.url(), ...windowSnapshot(tab.text, offset), refsCount: tab.refs.size };
  });
  /** One step on a tab. */
  const step = async (tab, name, body) => {
    if (name === 'viewport' && tab.addon && await onAddon(tab)) return keepForSite(tab, body);
    if (!OPEN_ON_ADDON.has(name) && await onAddon(tab)) throw onAddonPage(tab);
    if (GUARDED.has(name)) await guardAddon(tab.page, name, body);
    const result = await ACTIONS[name](tab, body);
    if (!KEEPS_REFS.has(name)) Object.assign(tab, { refs: null, text: null });
    return result;
  };
  /** One step, then the turn's page that showed before it back in front if the step hid it: always after a step that
   * raises its tab. A tab with a turn of its own is the person's to show, so its steps put nothing back. */
  const act = (tab, name, body) => inQueue(tab, async () => {
    if (!otherTurn(tab) || turns.has(tab.id)) return step(tab, name, body);
    const raises = RAISES_TAB.has(name) || (name === 'navigate' && ADDON_PAGE.test(body.url ?? ''));
    const shown = await shownTurnPage();
    try {
      return await step(tab, name, body);
    } finally {
      if (shown && !shown.isClosed() && (raises || !(await pageShown(shown)))) await shown.bringToFront().catch(() => {});
    }
  });

  /** Whether a page the person or a site opened during the turn is still open, such as a *Forgot password* tab or a
   * sign-in window. A page can not tell which tab shows, so the person may be on it. */
  const ownPages = () => {
    const before = new Set([...turns.values()].flatMap(held => [...held.before]));
    return context.pages().filter(page => !page.isClosed() && page !== home && !taskPages.has(page) && !before.has(page));
  };
  const ownPageOpen = () => ownPages().length > 0;
  /** The turns' page that shows, or null: each turn's tab, then each page the person or a site opened in a turn. */
  const shownTurnPage = async () => {
    for (const page of [...[...openTurns().keys()].map(id => tabs.get(id)?.page), ...ownPages()]) {
      if (page && !page.isClosed() && await pageShown(page)) return page;
    }
    return null;
  };
  /** Whether another tab's turn keeps this one from holding: any turn, or for a shared turn only a turn not shared. */
  const blocked = (tab, shared) => [...openTurns()].some(([id, held]) => id !== tab.id && !(shared && held.shared));
  /** Brings the tab to the front, or answers `behind` during another turn. `turn` holds or ends a turn, `raise: false`
   * renews it, `reselect` keeps the person's page; a `shared` turn rings its bell, raises alone, hears `handedBack`. */
  const front = async (tab, { turn: hold, raise = true, reselect = false, shared = false }) => {
    if (hold === false) {
      handedBack.delete(tab.id);
      endTurn(tab.id);
      return { ok: true };
    }
    openTurns();
    // Only a renewal hears a Hand back: a new turn's first hold on the same tab clears it.
    if (hold === true && shared && handedBack.delete(tab.id) && !raise) return { ok: true, handedBack: true };
    if (hold !== true && otherTurn(tab)) return { ok: true, behind: true };
    if (blocked(tab, hold === true && shared)) throw refusal(409, BUSY);
    const alone = !otherTurn(tab);
    if (hold === true) {
      turns.set(tab.id, { until: Date.now() + turnMs, before: turns.get(tab.id)?.before ?? new Set(context.pages()), shared });
      if (shared) await onTitle(tab.id, RING);
    }
    if (reselect && turns.has(tab.id) && ownPageOpen()) return { ok: true };
    if (!raise || !alone) return { ok: true };
    return act(tab, 'front', {});
  };

  /** The toolbar button's two routes: how many tabs wait on the person, and their Hand back. */
  const BUTTON_ROUTES = { 'GET /turns': () => ({ ok: true, count: [...openTurns().values()].filter(held => held.shared).length }), 'POST /hand-back': handBack };

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
      return inQueue(tab, async () => {
        if (await onAddon(tab)) throw onAddonPage(tab);
        return tab.page.screenshot({ type: 'png', fullPage: query.get('fullPage') === 'true' });
      });
    }
    if (top === 'tabs' && method === 'POST' && action === 'front') return front(tabOf(id, userId), body);
    // A click never waits now; the route stays for a browse.mjs that still asks after one.
    if (top === 'tabs' && method === 'GET' && action === 'click') return tabOf(id, userId) && { ok: true, none: true };
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
    const button = BUTTON_ROUTES[`${request.method} ${url.pathname}`];
    if (button && (authorized(request, key) || (handBackKey && authorized(request, handBackKey)))) return send(200, button());
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

/** The browser shows in a window unless the person turned it off, on Linux only where a screen exists; else Linux
 * draws on Xvfb. Its launch flags, the screen's variables, its server record, and whether Xvfb starts. */
export function windowLaunch({ platform, setting, env = {} }) {
  const linux = platform === 'linux';
  const shown = setting && (!linux || Boolean(env.DISPLAY || env.WAYLAND_DISPLAY));
  const screen = shown && linux ? Object.fromEntries(SCREEN_VARS.filter(name => env[name]).map(name => [name, env[name]])) : {};
  return { args: shown ? ['--window'] : [], env: screen, record: shown ? { window: true } : {}, xvfb: linux && !shown };
}

const savedLines = () => ({ first: resolveFirst(), upstream: resolveUpstream() });

/** The local forwarder through the saved routes when the proxy setting is on: its launch flags and its close; none
 * when off, and the saved lines are not read. A forwarder that fails to start fails the browser's start. */
export async function startProxy(on, start = startForwarder, lines = savedLines) {
  if (!on) return { on: false, args: [], close: () => {} };
  const proxy = await start({ ...lines(), networkFile: NETWORK_FILE });
  return { on: true, args: ['--proxy', `http://127.0.0.1:${proxy.port}`], close: () => proxy.close() };
}

const record = info => writeFileSync(FILES.server, `${JSON.stringify({ pid: process.pid, ...info })}\n`, { mode: 0o600 });

/** Takes the port, then starts the proxy when it is on, the screen, the browser and the routes; /health says ok
 * only once the browser is up. A failed start leaves its reason in server.json. */
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
    const proxy = await startProxy(proxySetting());
    stops.push(() => proxy.close());
    const setting = windowSetting();
    const windowed = windowLaunch({ platform: process.platform, setting, env: process.env });
    const screen = windowed.xvfb ? await startXvfb() : null;
    if (screen) stops.push(() => screen.child.kill());
    // A broken add-on never stops a start: the browser starts without it.
    const addon = await addonArgs().catch(() => []);
    const handBackKey = randomBytes(24).toString('hex');
    const handBack = (() => { try { return handBackArgs({ port, key: handBackKey }); } catch { return []; } })();
    const config = await launchConfig([...proxy.args, ...(screen ? ['--display', screen.display] : []), ...windowed.args, '--fingerprint', FILES.fingerprint, ...addon, ...handBack]);
    if (config.error) throw new Error(config.error);
    const { firefox } = createRequire(import.meta.url)(join(config.driver, 'index.js'));
    const context = await firefox.launchPersistentContext(FILES.profile, persistentOptions(config, windowed.env));
    stops.push(() => context.close());
    await moveLogins(context, { profilesDir: OLD_PROFILES, marker: FILES.marker }).catch(() => {});
    const outdated = codeChanged(ownCode(dirname(fileURLToPath(import.meta.url))));
    handle = routes(context, readFileSync(FILES.key, 'utf8').trim(), { handBackKey, outdated, onOutdated: () => void stop(0) });
    record({ port, display: screen?.display ?? null, ...windowed.record, proxy: proxy.on, windowSetting: setting, library: config.library, build: config.build, locale: config.locale });
    // A browser that quits on its own takes the server with it, so the next command starts a fresh one.
    context.on('close', () => void stop(1));
  } catch (error) {
    // A taken port leaves no reason, so browse.mjs tries another port; any other failure is the browser's own.
    if (error.code !== 'EADDRINUSE') record({ port, error: error.message });
    await stop(1);
  }
}

if (isMain(import.meta.url)) await main();
