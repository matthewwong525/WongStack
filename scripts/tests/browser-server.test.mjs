import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// browse.mjs names its files from the home folder as it loads, so the test gets its own first.
process.env.HOME = mkdtempSync(join(tmpdir(), 'browser-server-test-'));
const { BELL, contextOptions, persistentOptions, PICK_MS, pressKey, routes, startProxy } = await import('../../.agents/skills/browser/scripts/browser-server.mjs');
const { ADDON_REFUSAL } = await import('../../.agents/skills/browser/scripts/refs.mjs');
const { joinPieces } = await import('../../.agents/skills/browser/scripts/browse.mjs');

const KEY = 'test-key';

const HANDLE = Symbol('handle');
/** Runs a script the server sends into the page against `document`, a small stand-in, as the page would. */
function inPage(document, script, ...args) {
  const kept = globalThis.document;
  globalThis.document = document;
  try { return script(...args.map(arg => (arg?.[HANDLE] ? arg.value : arg))); } finally { globalThis.document = kept; }
}

/** An element as a page script sees it: its tag, `type`, attributes, `tabIndex`, whether it is disabled, and whether
 * a focus lands on it. */
function element(localName, { type = '', attributes = {}, tabIndex = 0, disabled = false, focusable = true } = {}) {
  const root = { activeElement: null };
  const made = { localName, type, tabIndex, matches: selector => selector === ':disabled' && disabled, getAttribute: name => attributes[name] ?? null, hasAttribute: name => name in attributes };
  return Object.assign(made, { getRootNode: () => root, focus: () => { if (focusable) root.activeElement = made; } });
}

/** A frame whose text is `yaml`; its locators record each step in `calls`. A click throws each `clickFails` error. */
function stubFrame(calls, { url = 'about:blank', name = '', yaml = '' } = {}) {
  // `addonTargets` are the selectors that find the password manager's frame in the page; `rows` its fill list's login
  // names; `boxes: false` finds no box, `counts` a locator's own; `visible` its element's; `elements` each locator's.
  const frame = { yaml, clickFails: [], detached: false, addonTargets: [], rows: [], boxes: true, visible: true, elements: {} };
  // `dom`, when set, is the stand-in page a box's script or the frame element's runs in: `{document, login, element}`.
  const locator = desc => ({
    nth: n => locator(`${desc}#${n}`),
    first: () => locator(`${desc}#first`),
    press: async key => { calls.push(['press', desc, key]); calls.onPress?.(); },
    ariaSnapshot: async () => frame.yaml,
    click: async options => {
      calls.push(['click', desc, options]);
      const fail = frame.clickFails.shift();
      if (fail) throw new Error(fail);
      calls.onClick?.(desc);
    },
    evaluateHandle: async script => ({ [HANDLE]: true, value: inPage(frame.dom.document, script, frame.dom.login), dispose: async () => {} }),
    evaluate: async (script, arg) => {
      if (frame.dom && arg) return inPage(frame.dom.document, script, frame.dom.login, arg);
      const found = frame.elements[desc] ?? {};
      found.click ??= () => { calls.push(['dom click', desc]); };
      return script(found);
    },
    fill: async text => { calls.push(['fill', desc, text]); },
    focus: async () => { calls.push(['focus', desc]); frame.elements[desc]?.focus(); },
    count: async () => frame.counts?.[desc] ?? (frame.boxes ? 1 : 0),
    evaluateAll: async () => (desc === 'css:[role="menuitem"].entry' ? frame.rows : frame.addonTargets.includes(desc)),
    selectOption: async choice => {
      calls.push(['select', desc, choice]);
      if (choice.label === 'by-value') throw new Error('no such label');
    },
  });
  return Object.assign(frame, {
    url: () => frame.at ?? url,
    frameElement: async () => ({ evaluate: async script => inPage(frame.dom.document, script, frame.dom.element), isVisible: async () => frame.visible }),
    name: () => name,
    isDetached: () => frame.detached,
    parentFrame: () => frame.parent ?? null,
    locator: selector => locator(`css:${selector}`),
    getByRole: (role, options) => locator(`role:${role}${options ? `:${options.name}:${options.exact}` : ''}`),
  });
}

/** A page with a main frame and `frames`; its steps go in `calls`. */
function stubPage(calls, yaml, frames = []) {
  let url = 'about:blank';
  let closed = false;
  const listeners = {};
  const main = stubFrame(calls, { yaml });
  return {
    main,
    calls,
    listeners,
    mainFrame: () => main,
    frames: () => [main, ...frames],
    url: () => url,
    title: async () => 'A title',
    isClosed: () => closed,
    goto: async address => { calls.push(['goto', address]); url = address; return { headers: () => ({ 'content-type': 'text/html' }) }; },
    waitForLoadState: async () => {},
    waitForTimeout: async () => {},
    locator: main.locator,
    getByRole: main.getByRole,
    focus: async selector => { calls.push(['focus', `css:${selector}`]); },
    keyboard: { type: async (text, options) => { calls.push(['keys', text, options]); }, press: async key => { calls.push(['press', key]); } },
    mouse: { click: async (x, y) => { calls.push(['mouse', x, y]); calls.onMouse?.(); } },
    // The page is 1100x663, and the browser's bar 85 pixels: the window is that much taller than the page.
    evaluate: async expression => {
      if (expression === 'window.opener = null') calls.push(['no opener']);
      return { 'document.URL': url, '[innerWidth, innerHeight, outerHeight]': [1100, 663, 748] }[expression] ?? { expression };
    },
    // On the password manager's page, a resize applies but never answers, as in the real browser.
    setViewportSize: size => { calls.push(['viewport', size]); return url.startsWith('moz-extension:') ? new Promise(() => {}) : Promise.resolve(); },
    bringToFront: async () => { calls.push(['front']); },
    screenshot: async options => Buffer.from(`png full=${options.fullPage}`),
    close: async () => { closed = true; listeners.close?.(); },
    on: (event, listener) => { listeners[event] = listener; },
  };
}

/** A browser context that starts with one blank window, as Camoufox does. A page that runs `window.open` opens a tab
 * in its window, which reads `yaml`; `newPage` opens a window. It keeps the tabs, the windows, and the cookies. */
function stubContext(yaml = '- button "Go"', frames = () => []) {
  const context = { opened: [], cookies: [], yaml, windows: 1, waiting: [] };
  const page = opener => {
    const made = stubPage([], context.yaml);
    made.extra = frames(made.calls);
    made.frames = () => [made.main, ...made.extra];
    made.opener = async () => opener;
    const read = made.evaluate;
    made.evaluate = async expression => {
      if (!/window\.open\(/.test(expression)) return read(expression);
      const tab = page(made);
      context.opened.push(tab);
      for (const waiter of context.waiting.slice()) {
        if (!(await waiter.predicate(tab))) continue;
        context.waiting.splice(context.waiting.indexOf(waiter), 1);
        waiter.resolve(tab);
      }
      return undefined;
    };
    return made;
  };
  context.first = page(null);
  context.homes = [context.first];
  context.pages = () => [...context.homes, ...context.opened];
  context.newPage = async () => {
    context.windows++;
    const made = page(null);
    context.homes.push(made);
    return made;
  };
  context.waitForEvent = (event, { predicate }) => new Promise(resolve => context.waiting.push({ predicate, resolve }));
  context.addCookies = async cookies => { context.cookies.push(...cookies); };
  return context;
}

/** The routes over `context` on a free port; `call` sends one request with the key. */
async function serve(context, options) {
  const handle = routes(context, KEY, options);
  const server = createServer(handle);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, key = KEY) => {
    const response = await fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${key}`, ...(body && { 'content-type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) });
    const type = response.headers.get('content-type');
    return { status: response.status, type, body: type === 'image/png' ? Buffer.from(await response.arrayBuffer()).toString() : await response.json() };
  };
  return { call, close: () => { handle.close(); server.closeAllConnections(); return new Promise(done => server.close(done)); } };
}

const open = (call, sessionKey = 'task', url = 'https://shop.example.test/') => call('POST', '/tabs', { userId: 'me', sessionKey, url });

test('health answers without the key; every other route needs it', async () => {
  const { call, close } = await serve(stubContext());
  try {
    assert.deepEqual((await call('GET', '/health', null, 'wrong')).body, { ok: true, engine: 'camoufox', tabs: 0 });
    assert.equal((await call('GET', '/tabs?userId=me', null, 'wrong')).status, 401);
    assert.equal((await call('GET', '/tabs?userId=me', null, `${KEY}x`)).status, 401);
  } finally { await close(); }
});

test('one page per userId and sessionKey: a second open moves that page', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const first = await open(call);
    assert.equal(first.status, 200);
    assert.equal(first.body.url, 'https://shop.example.test/');
    const again = await open(call, 'task', 'https://shop.example.test/orders');
    assert.equal(again.body.tabId, first.body.tabId);
    assert.equal(context.opened.length, 1);
    const other = await open(call, 'other');
    assert.notEqual(other.body.tabId, first.body.tabId);
    const { body } = await call('GET', '/tabs?userId=me');
    assert.equal(body.running, true);
    assert.deepEqual(body.tabs.map(({ url, title, listItemId }) => [url, title, listItemId]), [['https://shop.example.test/orders', 'A title', 'task'], ['https://shop.example.test/', 'A title', 'other']]);
    assert.deepEqual((await call('GET', '/tabs?userId=someone')).body.tabs, []);
    assert.equal((await call('POST', '/tabs', { userId: 'me', url: 'https://x.test/' })).status, 400);
    assert.match((await open(call, 'file', 'file:///etc/passwd')).body.error, /http\(s\)/);
  } finally { await close(); }
});

test('the snapshot marks boxes with refs, adds frames at the end, and a ref clicks its own box', async () => {
  const context = stubContext('- heading "Pay"\n- button "Go"\n- button "Go"\n- textbox', calls => [
    stubFrame(calls, { url: 'https://js.stripe.com/v3/elements', yaml: '- textbox "Card number"\n- button "Save"' }),
    stubFrame(calls, { url: 'https://www.googletagmanager.com/gtm', yaml: '- button "Track"' }),
    stubFrame(calls, { url: 'https://quiet.example.test/', yaml: '- text: nothing to press here' }),
  ]);
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const { body } = await call('GET', `/tabs/${tabId}/snapshot?userId=me`);
    const text = '- heading "Pay"\n- button "Go" [e1]\n- button "Go" [e2]\n- textbox [e3]\n- iframe "js.stripe.com":\n  - textbox "Card number" [e4]\n  - button "Save" [e5]';
    assert.deepEqual(body, { url: 'https://shop.example.test/', snapshot: text, truncated: false, totalChars: text.length, hasMore: false, nextOffset: null, refsCount: 5 });
    const page = context.opened[0];
    assert.deepEqual((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', ref: 'e2' })).body, { ok: true, url: 'https://shop.example.test/', via: 'mouse' });
    assert.deepEqual(page.calls.at(-1), ['click', 'role:button:Go:true#1', { timeout: 3000 }]);
    // The click may change the page, so the next ref is read again, here from the frame.
    await call('POST', `/tabs/${tabId}/type`, { userId: 'me', ref: 'e4', text: '4242' });
    assert.deepEqual(page.calls.at(-1), ['fill', 'role:textbox:Card number:true#0', '4242']);
    await call('POST', `/tabs/${tabId}/click`, { userId: 'me', ref: 'e3' });
    assert.deepEqual(page.calls.at(-1), ['click', 'role:textbox#0', { timeout: 3000 }]);
    assert.equal((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', ref: 'e99' })).status, 409);
  } finally { await close(); }
});

test('a click past an overlay is forced, and then made by the page itself; the reply says which', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    page.main.clickFails = ['<div> intercepts pointer events'];
    assert.equal((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', selector: 'button.buy' })).body.via, 'forced');
    page.main.clickFails = ['<div> intercepts pointer events', 'Timeout 3000ms exceeded'];
    assert.equal((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', selector: 'button.buy' })).body.via, 'script');
    assert.deepEqual(page.calls.slice(-3), [
      ['click', 'css:button.buy:visible', { timeout: 3000 }],
      ['click', 'css:button.buy:visible', { timeout: 3000, force: true }],
      ['dom click', 'css:button.buy:visible'],
    ]);
    page.main.clickFails = ['Element is outside of the document'];
    assert.equal((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', selector: 'a, b' })).status, 500);
    assert.deepEqual(page.calls.at(-1), ['click', 'css:a, b', { timeout: 3000 }]);
  } finally { await close(); }
});

test('type, select, press, evaluate, viewport, front and screenshot keep the camofox shapes', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    const post = (route, body) => call('POST', `/tabs/${tabId}/${route}`, { userId: 'me', ...body });
    assert.deepEqual((await post('type', { selector: '#q', text: 'hi', mode: 'keyboard', pressEnter: true })).body, { ok: true });
    assert.deepEqual(page.calls.slice(-3), [['focus', 'css:#q'], ['keys', 'hi', { delay: 30 }], ['press', 'Enter']]);
    assert.equal((await post('type', { selector: '#q', text: 'x', mode: 'paste' })).status, 400);
    assert.equal((await post('type', { text: 'x' })).status, 400);
    await post('select', { selector: 'select', option: 'by-value' });
    assert.deepEqual(page.calls.slice(-2).map(([, , choice]) => choice), [{ label: 'by-value' }, { value: 'by-value' }]);
    await post('press', { key: 'ctrl+a' });
    assert.deepEqual(page.calls.at(-1), ['press', 'Control+a']);
    assert.deepEqual((await post('evaluate', { expression: 'location.href' })).body, { ok: true, result: { expression: 'location.href' } });
    assert.deepEqual((await post('viewport', { width: 800.4, height: 600 })).body, { ok: true, width: 800, height: 600 });
    assert.deepEqual(page.calls.slice(-2), [['front'], ['viewport', { width: 800, height: 600 }]], 'a resize shows its tab first: one behind sizes the shown one\'s window');
    assert.equal((await post('viewport', { width: 50, height: 600 })).status, 400);
    assert.deepEqual((await post('front')).body, { ok: true });
    assert.deepEqual(page.calls.at(-1), ['front']);
    const shot = await call('GET', `/tabs/${tabId}/screenshot?userId=me&fullPage=true`);
    assert.equal(shot.type, 'image/png');
    assert.equal(shot.body, 'png full=true');
    assert.deepEqual((await post('navigate', { url: 'https://shop.example.test/next' })).body, { ok: true, url: 'https://shop.example.test/next' });
  } finally { await close(); }
});

test('a missing tab is a 404, which browse.mjs reopens; closing a tab or the session closes its pages', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    assert.deepEqual(await call('GET', '/tabs/nope/snapshot?userId=me'), { status: 404, type: 'application/json', body: { error: 'Tab not found' } });
    const { tabId } = (await open(call)).body;
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=someone`)).status, 404);
    assert.deepEqual((await call('DELETE', `/tabs/${tabId}?userId=me`)).body, { ok: true });
    assert.equal(context.opened[0].isClosed(), true);
    assert.equal((await call('POST', `/tabs/${tabId}/press`, { userId: 'me', key: 'Enter' })).status, 404);
    await open(call, 'a');
    await open(call, 'b');
    assert.deepEqual((await call('DELETE', '/sessions/me')).body, { ok: true });
    assert.ok(context.opened.every(page => page.isClosed()));
  } finally { await close(); }
});

test('cookies are added only when given; the empty save just answers', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    assert.deepEqual((await call('POST', '/sessions/me/cookies', { cookies: [] })).body, { ok: true, count: 0 });
    await call('POST', '/sessions/me/cookies', { cookies: [{ name: 'a', value: '1', domain: '.shop.example.test', path: '/' }] });
    assert.equal(context.cookies.length, 1);
    assert.equal((await call('POST', '/sessions/me/cookies', { cookies: 'a=1' })).status, 400);
  } finally { await close(); }
});

test('a tab unused past the idle time closes', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { idleMs: 20 });
  try {
    const { tabId } = (await open(call)).body;
    await new Promise(done => setTimeout(done, 80));
    assert.equal(context.opened[0].isClosed(), true);
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).status, 404);
  } finally { await close(); }
});

test('a long page comes in windows that browse.mjs joins back whole', async () => {
  const lines = Array.from({ length: 4000 }, (_, at) => `- link "Product number ${at} with a long name to fill the page"`);
  const context = stubContext(lines.join('\n'));
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const pieces = [(await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).body];
    assert.equal(pieces[0].hasMore, true);
    while (pieces.at(-1).hasMore) pieces.push((await call('GET', `/tabs/${tabId}/snapshot?userId=me&offset=${pieces.at(-1).nextOffset}`)).body);
    const whole = joinPieces(pieces);
    assert.equal(whole.length, pieces[0].totalChars);
    assert.match(whole, /^- link "Product number 0 with a long name to fill the page" \[e1\]$/m);
    assert.match(whole, /^- link "Product number 499 with a long name to fill the page" \[e500\]$/m);
    assert.match(whole, /^- link "Product number 500 with a long name to fill the page"$/m);
  } finally { await close(); }
});

test("the Python library's options take the Node driver's names", () => {
  const options = contextOptions({
    executable_path: '/b/camoufox-bin', args: [], env: { CAMOU_CONFIG_1: '{}', NUMBER: 5 }, firefox_user_prefs: { 'a.b': true }, headless: false,
    proxy: { server: 'http://127.0.0.1:4000' }, no_viewport: true, color_scheme: 'no-override', reduced_motion: 'no-override', forced_colors: 'no-override', contrast: 'more',
  });
  assert.deepEqual(options, {
    executablePath: '/b/camoufox-bin', args: [], env: { CAMOU_CONFIG_1: '{}', NUMBER: '5' }, firefoxUserPrefs: { 'a.b': true }, headless: false,
    proxy: { server: 'http://127.0.0.1:4000' }, viewport: null, colorScheme: null, reducedMotion: null, forcedColors: null, contrast: 'more',
    handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false,
  });
  const launch = persistentOptions({ options: { env: { CAMOU_CONFIG_1: '{}' }, firefox_user_prefs: { 'a.b': true } } }, { DISPLAY: ':0' });
  assert.deepEqual([launch.env, launch.firefoxUserPrefs, launch.timeout], [{ CAMOU_CONFIG_1: '{}', DISPLAY: ':0' }, { 'a.b': true, 'browser.tabs.loadDivertedInBackground': true }, 60_000], 'the screen and the background-tab pref join the library\'s own');
  assert.equal(pressKey('Shift+Tab'), 'Shift+Tab');
  assert.equal(pressKey('esc'), 'Escape');
});

/** Runs browser-server.mjs on `port` in its own home folder; resolves to its exit code and its server.json. */
async function startOn(port) {
  const home = mkdtempSync(join(tmpdir(), 'browser-server-start-'));
  const dir = join(home, '.wong-stack', 'camoufox');
  mkdirSync(dir, { recursive: true });
  try {
    const child = spawn(process.execPath, [fileURLToPath(new URL('../../.agents/skills/browser/scripts/browser-server.mjs', import.meta.url))], {
      env: { PATH: process.env.PATH, HOME: home, BROWSE_SERVER_PORT: String(port) }, stdio: 'ignore',
    });
    const code = await new Promise(done => child.once('exit', done));
    let left = null;
    try { left = JSON.parse(readFileSync(join(dir, 'server.json'), 'utf8')); } catch { /* none */ }
    return { code, left };
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test('a taken port leaves no reason, so browse.mjs tries another port; a failed browser leaves its reason', async () => {
  const taken = createServer();
  await new Promise(done => taken.listen(0, '127.0.0.1', done));
  try {
    const busy = await startOn(taken.address().port);
    assert.equal(busy.code, 1);
    assert.equal(busy.left?.error, undefined);
  } finally {
    taken.close();
  }
  const free = createServer();
  await new Promise(done => free.listen(0, '127.0.0.1', done));
  const { port } = free.address();
  await new Promise(done => free.close(done));
  const failed = await startOn(port);
  assert.equal(failed.code, 1);
  assert.match(failed.left.error, /camoufox library is not installed/);
});

test('a step that never ends times out, and the next step on that tab still runs', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { stepMs: 50 });
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    const answers = page.evaluate;
    page.evaluate = () => new Promise(() => {});
    const stuck = await call('POST', `/tabs/${tabId}/evaluate`, { userId: 'me', expression: '1' });
    assert.equal(stuck.status, 504);
    assert.match(stuck.body.error, /timed out/);
    page.evaluate = answers;
    assert.deepEqual((await call('POST', `/tabs/${tabId}/press`, { userId: 'me', key: 'Enter' })).body, { ok: true });
  } finally { await close(); }
});

test("the password manager's frames, page and keyboard are the person's: the agent never reads or uses them", async () => {
  const context = stubContext('- button "Go"', calls => {
    const manager = stubFrame(calls, { url: 'moz-extension://pm-uuid/inline/menu/menu.html?locked=false', yaml: '- button "Fill Card number"\n- textbox "Search vault"' });
    const inner = stubFrame(calls, { url: 'https://shop.example.test/inner', yaml: '- button "Inside"\n- textbox "Code"' });
    inner.parent = manager;
    return [manager, inner];
  });
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    const post = (route, body) => call('POST', `/tabs/${tabId}/${route}`, { userId: 'me', ...body });
    // A refusal because its page shows is marked, so a live view's helper reads it as that page, not as no page.
    const refused = async (reply, addonPage) => {
      const { status, body } = await reply;
      assert.deepEqual([status, body.error, body.addonPage], [403, ADDON_REFUSAL, addonPage]);
    };
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).body.snapshot, '- button "Go" [e1]', 'its frame and the frames inside it stay out');

    page.main.addonTargets = ['css:#pm-menu'];
    const before = page.calls.length;
    await refused(post('click', { selector: '#pm-menu' }));
    await refused(post('type', { selector: '#pm-menu', text: 'x' }));
    await refused(post('select', { selector: '#pm-menu', option: 'a' }));
    // The frame sits in a closed shadow root, in a host inside the page's own open shadow root, as 1Password's does.
    const frameElement = { getRootNode: () => closedRoot };
    const document = { activeElement: null };
    const closedRoot = { host: { shadowRoot: null, getRootNode: () => openRoot } };
    const outer = { getRootNode: () => document };
    const openRoot = { host: outer, activeElement: closedRoot.host };
    outer.shadowRoot = openRoot;
    page.extra[0].dom = { document, element: frameElement };
    document.activeElement = outer;
    await refused(post('press', { key: 'Escape' }));
    await refused(post('type', { text: 'x', mode: 'keyboard' }));
    assert.equal(page.calls.length, before, 'no refused step reached the page');
    const listOpen = /fill list is open/;
    openRoot.activeElement = { getRootNode: () => openRoot };
    assert.match((await post('press', { key: 'Enter' })).body.error, listOpen, 'a box in the same open shadow root is the page\'s, but the list shows');
    document.activeElement = { getRootNode: () => document };
    for (const key of ['ArrowDown', 'Enter', 'Tab']) assert.match((await post('press', { key })).body.error, listOpen, `${key} in the page's box could pick from the list`);
    for (const flag of ['pressEnter', 'submit']) assert.match((await post('type', { selector: '#email', text: 'x', [flag]: true })).body.error, listOpen);
    assert.equal(page.calls.length, before, 'nor did a key while the list shows');
    assert.equal((await post('press', { key: 'Escape' })).status, 200, 'Escape closes the list');
    assert.equal((await post('type', { selector: '#email', text: 'x' })).status, 200, 'typing alone picks nothing');
    for (const frame of page.extra) frame.visible = false;
    assert.equal((await post('press', { key: 'Enter' })).status, 200, 'once the list is hidden, keys work');
    assert.equal((await post('type', { selector: '#email', text: 'x', pressEnter: true })).status, 200);
    assert.equal((await post('click', { selector: '#buy' })).status, 200);

    assert.deepEqual((await post('navigate', { url: 'moz-extension://pm-uuid/popup/index.html' })).body, { ok: true, url: 'moz-extension://pm-uuid/popup/index.html' }, 'its sign-in page opens for the person');
    assert.deepEqual(page.calls.slice(-3), [['front'], ['viewport', { width: 1280, height: 635 }], ['goto', 'moz-extension://pm-uuid/popup/index.html']], 'first shown and sized to the screen less the bar, as a live view fits it');
    await refused(call('GET', `/tabs/${tabId}/snapshot?userId=me`), true);
    await refused(call('GET', `/tabs/${tabId}/screenshot?userId=me`), true);
    await refused(post('click', { selector: 'button' }), true);
    const read = await post('evaluate', { expression: '[innerWidth, innerHeight]' });
    await refused(read, true);
    assert.deepEqual((await read).body.size, [1100, 663], 'a size read gives the page\'s own size, so a view over it sets that back at its end');
    const sized = () => page.calls.filter(([step]) => step === 'viewport');
    assert.deepEqual((await post('viewport', { width: 480, height: 663 })).body, { ok: true, width: 480, height: 635, addonPage: true }, 'a phone fit answers at once, though the page never does');
    assert.deepEqual(sized().at(-1), ['viewport', { width: 480, height: 635 }], 'the page takes the width and keeps its height under the bar');
    await post('viewport', { width: 480, height: 663 });
    assert.equal(sized().length, 2, 'the same size again, a view\'s keep-alive, reaches the page no more');
    assert.deepEqual((await post('viewport', { width: 1280, height: 720 })).body, { ok: true, width: 1280, height: 635, addonPage: true });
    assert.deepEqual(sized().at(-1), ['viewport', { width: 1280, height: 635 }], 'a new size does');
    assert.match((await post('viewport', { width: 50, height: 663 })).body.error, /100\.\.4000/);
    assert.deepEqual((await post('front')).body, { ok: true });
    assert.match((await post('navigate', { url: 'chrome://settings' })).body.error, /http\(s\)/);

    // A tab closed under the waiting resize rejects it later, which must not end the server.
    const unhandled = [];
    const note = error => unhandled.push(error);
    process.on('unhandledRejection', note);
    const resize = page.setViewportSize;
    page.setViewportSize = size => { page.calls.push(['viewport', size]); return new Promise((_, fail) => setTimeout(fail, 20, new Error('Target closed'))); };
    try {
      assert.deepEqual((await post('viewport', { width: 1100, height: 663 })).body, { ok: true, width: 1100, height: 635, addonPage: true }, 'a view\'s end asks for the size it read');
      await new Promise(done => setTimeout(done, 60));
      assert.deepEqual(unhandled, [], 'the late rejection is dropped');
    } finally {
      process.off('unhandledRejection', note);
      page.setViewportSize = resize;
    }

    await page.goto('https://shop.example.test/');
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).status, 200, 'once the person is back on the site, the agent reads it again');
    assert.deepEqual(page.calls.filter(([step]) => step === 'viewport').at(-1), ['viewport', { width: 1100, height: 663 }], 'and the site gets the size last asked for');
    assert.deepEqual((await post('viewport', { width: 480, height: 663 })).body, { ok: true, width: 480, height: 663 });
  } finally { await close(); }
});

test("the one opening: logins reads the fill list's login names, and one pick of a name read follows on that page", async t => {
  const context = stubContext('- textbox "Email"\n- textbox "Password"');
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    const post = (route, body) => call('POST', `/tabs/${tabId}/${route}`, { userId: 'me', ...body });
    const list = stubFrame(page.calls, { url: 'moz-extension://op-uuid/inline/menu/menu.html?locked=false&fieldContent=' });
    list.rows = ['Canva (work) · jo@example.com', 'Canva · sam@example.com'];
    // A key press in the login box opens the list, as 1Password's does.
    page.calls.onPress = () => { if (!page.extra.includes(list)) page.extra.push(list); };
    const rowClicks = () => page.calls.filter(([step, desc]) => step === 'click' && desc.startsWith('css:[role="menuitem"].entry'));
    // The page's boxes, as the server's scripts see them there; a row's click fills what `fills` names.
    const login = { value: '' };
    const password = { value: '', checkVisibility: () => true };
    let passwords = [password];
    page.main.dom = { login, document: { querySelectorAll: selector => (selector === 'input[type="password"]' ? passwords : []) } };
    let fills = { login: 'jo@example.com', password: 'stand-in' };
    page.calls.onClick = desc => {
      if (!desc.startsWith('css:[role="menuitem"].entry#')) return;
      if (fills.login) login.value = fills.login;
      if (fills.password) password.value = fills.password;
    };

    assert.match((await post('pick', { n: 1 })).body.error, /addon logins/, 'no pick before the names are read');
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'list', names: list.rows });
    assert.deepEqual(page.calls.filter(([step]) => step === 'press').map(([, , key]) => key), ['ArrowDown']);
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).body.snapshot, '- textbox "Email" [e1]\n- textbox "Password" [e2]', 'a reading leaves the list out');
    assert.equal((await post('pick', { n: 3 })).status, 400, 'a number past the list');
    assert.equal((await post('pick', { n: 1 })).status, 409, 'and that read is spent');
    assert.deepEqual(rowClicks(), []);

    await post('logins');
    assert.deepEqual((await post('pick', { n: 2 })).body, { ok: true, filled: true });
    assert.deepEqual(rowClicks(), [['click', 'css:[role="menuitem"].entry#1', { timeout: 3000 }]], 'one click, on that row');
    assert.equal((await post('pick', { n: 2 })).status, 409, 'one pick per read');

    await post('logins');
    list.rows = ['Someone else'];
    assert.match((await post('pick', { n: 1 })).body.error, /no longer offers that login/, 'a name that changed is not picked');
    await post('logins');
    await post('navigate', { url: 'https://shop.example.test/other' });
    assert.equal((await post('pick', { n: 1 })).status, 409, 'nor a name read on another address');
    await post('logins');
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() + PICK_MS + 1 });
    try {
      assert.equal((await post('pick', { n: 1 })).status, 409, 'nor one read over 2 minutes ago');
    } finally { t.mock.timers.reset(); }
    assert.equal(rowClicks().length, 1);

    // A pre-filled email the click leaves as it was, with the password box still empty, is no fill.
    login.value = 'jo@example.com';
    password.value = '';
    fills = { login: 'jo@example.com' };
    await post('logins');
    const unfilled = await post('pick', { n: 1 });
    assert.deepEqual([unfilled.status, unfilled.body.error], [502, 'the password manager did not fill the page']);
    fills = { password: 'stand-in' };
    await post('logins');
    assert.deepEqual((await post('pick', { n: 1 })).body, { ok: true, filled: true }, 'a password filled beside it is');
    // A 2-step sign-in has no password box yet: its login box must change and hold a login.
    passwords = [];
    await post('logins');
    assert.equal((await post('pick', { n: 1 })).status, 502, 'a login box the click left as it was');
    login.value = '';
    fills = { login: 'jo@example.com' };
    await post('logins');
    assert.deepEqual((await post('pick', { n: 1 })).body, { ok: true, filled: true });
    // Google's email step keeps a hidden password box on the page; it stays empty, and the login box's fill counts.
    const hidden = { value: '', checkVisibility: () => false };
    const older = { value: '', getClientRects: () => [] };
    passwords = [hidden, older];
    login.value = '';
    await post('logins');
    assert.deepEqual((await post('pick', { n: 1 })).body, { ok: true, filled: true }, 'a hidden password box is no password box');

    list.at = 'moz-extension://op-uuid/inline/menu/menu.html?locked=true';
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'locked', names: [] }, 'a locked list offers no names');
    assert.equal((await post('pick', { n: 1 })).status, 409);
    page.extra.splice(page.extra.indexOf(list), 1);
    page.calls.onPress = null;
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'none', names: [] }, 'no list within 3 seconds');
    page.main.boxes = false;
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'none', names: [] }, 'no login box');
  } finally { await close(); }
});

test('the icon in the login box opens the list when a key does not; a passkey box offers its passkeys for one pick', async () => {
  const context = stubContext('- textbox "Email"');
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    const post = (route, body) => call('POST', `/tabs/${tabId}/${route}`, { userId: 'me', ...body });
    const list = stubFrame(page.calls, { url: 'moz-extension://op-uuid/inline/menu/menu.html?locked=false' });
    list.rows = ['Shopify · info@example.com'];
    // 1Password's icon shows at the box's right end, in a host the page sees but no locator reaches.
    const icon = { localName: 'com-1password-button' };
    const document = { elementFromPoint: (x, y) => (x >= 280 && x < 296 && y >= 58 && y < 74 ? icon : { localName: 'input' }) };
    const login = { value: '', ownerDocument: document, getBoundingClientRect: () => ({ left: 100, top: 50, right: 300, bottom: 80 }) };
    page.main.dom = { login, document: { querySelectorAll: () => [] } };
    page.calls.onMouse = () => { if (!page.extra.includes(list)) page.extra.push(list); };
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'list', names: list.rows });
    assert.deepEqual(page.calls.filter(([step]) => step === 'mouse'), [['mouse', 286, 64]], 'one click, at the icon\'s middle');
    assert.ok(page.calls.some(([step, , key]) => step === 'press' && key === 'ArrowDown'), 'a key first');

    page.extra.length = 0;
    const box = stubFrame(page.calls, { url: 'moz-extension://op-uuid/inline/notification/notification.html' });
    const rows = [{ innerText: 'Shopify\ninfo@example.com' }, { innerText: 'Shopify\nops@example.com' }];
    const body = { innerText: '', querySelectorAll: selector => (selector === 'li button' ? rows : []) };
    box.dom = { document: {}, login: body };
    page.extra.push(box);
    page.main.addonTargets = ['css:#op-box'];
    assert.equal((await post('click', { selector: '#op-box' })).body.error, ADDON_REFUSAL, 'no close hint over a passkey box');
    assert.doesNotMatch((await post('press', { key: 'Enter' })).body.error, /addon close/, 'nor for a key');
    page.calls.onClick = desc => { if (desc.startsWith('css:li button#')) box.visible = false; };
    const before = page.calls.length;
    assert.match((await post('pick', { n: 1 })).body.error, /no longer offers that login/, 'a login read before the passkey box is not picked');
    assert.match((await post('pick', { n: 1 })).body.error, /addon logins/, 'no passkey pick before its names are read');
    const names = ['Shopify · info@example.com', 'Shopify · ops@example.com'];
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'passkey', names });
    assert.deepEqual(page.calls.slice(before).filter(([step]) => ['click', 'press', 'mouse', 'focus'].includes(step)), [], 'reading the names touches nothing');
    assert.deepEqual((await post('pick', { n: 2 })).body, { ok: true, passkey: true });
    assert.deepEqual(page.calls.filter(([step]) => step === 'click').map(([, desc]) => desc), ['css:li button#1'], 'one press, on that passkey');
    assert.equal((await post('pick', { n: 2 })).status, 409, 'one pick per read');

    // One passkey has no list: its name sits beside the box's own *Sign in* button.
    box.visible = true;
    rows.length = 0;
    box.counts = { 'css:li button': 0 };
    const row = { innerText: 'Shopify\ninfo@example.com\nSign in' };
    const signIn = { innerText: 'Sign in', parentElement: { innerText: 'Sign in', parentElement: row } };
    body.querySelectorAll = selector => (selector === 'button' ? [signIn] : []);
    page.calls.onClick = desc => { if (desc.startsWith('role:button:Sign in')) box.visible = false; };
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'passkey', names: ['Shopify · info@example.com'] });
    assert.deepEqual((await post('pick', { n: 1 })).body, { ok: true, passkey: true });
    assert.equal(page.calls.filter(([step]) => step === 'click').at(-1)[1], 'role:button:Sign in:true');

    box.visible = true;
    body.querySelectorAll = () => [];
    body.innerText = 'Sign in with a passkey\nTo use your passkey, unlock 1Password first.';
    assert.deepEqual((await post('logins')).body, { ok: true, state: 'locked', names: [] }, 'a locked box offers no names');
  } finally { await close(); }
});

test("addon close presses only a box's own close button, leaves the fill list alone, and the refusal points to it", async () => {
  const context = stubContext('- button "Confirm"');
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.opened[0];
    const post = (route, body) => call('POST', `/tabs/${tabId}/${route}`, { userId: 'me', ...body });
    const clicks = () => page.calls.filter(([step]) => step === 'click').map(([, desc]) => desc);
    assert.deepEqual((await post('closeBoxes')).body, { ok: true, closed: 0 }, 'no box, nothing to close');

    const list = stubFrame(page.calls, { url: 'moz-extension://op-uuid/inline/menu/menu.html?locked=false' });
    const save = stubFrame(page.calls, { url: 'moz-extension://op-uuid/inline/notification/notification.html' });
    save.counts = { 'role:heading:Sign in with a passkey:true': 0 };
    page.extra.push(list, save);
    page.main.addonTargets = ['css:#op-box'];
    const refused = await post('click', { selector: '#op-box' });
    assert.deepEqual([refused.status, refused.body.error], [403, `${ADDON_REFUSAL}; a box of its own covers the page: close it with browse.mjs addon close`]);
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).body.snapshot, '- button "Confirm" [e1]', 'a reading leaves the box out');
    assert.match((await post('press', { key: 'Enter' })).body.error, /fill list is open/, 'with the fill list open, its own refusal');
    list.visible = false;
    const boxHint = "a password manager's box shows on this page, and a key could press its buttons; a box of its own covers the page: close it with browse.mjs addon close";
    assert.equal((await post('press', { key: 'Enter' })).body.error, boxHint, 'with only a box, a key is refused toward addon close, not Escape');
    assert.equal((await post('type', { selector: '#email', text: 'x', submit: true })).body.error, boxHint);
    list.visible = true;

    const only = stubFrame(page.calls, { url: 'moz-extension://op-uuid/inline/notification/notification.html#2' });
    only.boxes = false;
    page.extra.push(only);
    const none = await post('closeBoxes');
    assert.deepEqual([none.status, none.body.error], [403, "the password manager's box has no close button; the person closes it in the live view"]);
    assert.deepEqual(clicks(), [], 'with one box lacking a close button, nothing is pressed');

    page.extra.pop();
    page.calls.onClick = desc => { if (desc.startsWith('role:button:')) save.visible = false; };
    assert.deepEqual((await post('closeBoxes')).body, { ok: true, closed: 1 });
    assert.deepEqual(clicks(), ['role:button:/^(close|dismiss|dismiss banner|not now|no thanks)$/i:undefined#first'], 'one press, on its close button by name');
    assert.equal((await post('click', { selector: '#op-box' })).body.error, ADDON_REFUSAL, 'with the box gone, the fill list alone gets no hint');
  } finally { await close(); }
});

test('every task gets a tab in the one window, opened from a kept home tab that is never listed or closed', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { idleMs: 20 });
  try {
    await open(call, 'a');
    await open(call, 'b');
    assert.equal(context.windows, 1, 'a second task opens no new window');
    assert.equal(context.opened.length, 2);
    for (const tab of context.opened) {
      assert.equal(await tab.opener(), context.first, 'each tab opens from the browser\'s first page');
      assert.deepEqual(tab.calls.slice(0, 2), [['no opener'], ['goto', 'https://shop.example.test/']], 'and loses its way back to it before the site loads');
    }
    assert.deepEqual((await call('GET', '/tabs?userId=me')).body.tabs.map(tab => tab.listItemId), ['a', 'b'], 'the home tab is not listed');
    await new Promise(done => setTimeout(done, 80));
    assert.ok(context.opened.every(tab => tab.isClosed()), 'idle task tabs close');
    assert.equal(context.first.isClosed(), false, 'the idle reaper leaves the home tab');
    assert.deepEqual(context.first.calls, [], 'and no task\'s step reaches it');

    await context.first.close();
    await open(call, 'c');
    await open(call, 'd');
    assert.equal(context.windows, 2, 'a closed home tab is made again once, in one new window');
    assert.equal(await context.opened.at(-1).opener(), context.homes[1]);
  } finally { await close(); }
});

test('two tasks opening at once each get their own tab', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const [a, b] = await Promise.all([open(call, 'a', 'https://a.example.test/'), open(call, 'b', 'https://b.example.test/')]);
    assert.notEqual(a.body.tabId, b.body.tabId);
    assert.deepEqual([a.body.url, b.body.url], ['https://a.example.test/', 'https://b.example.test/']);
    assert.equal(context.opened.length, 2);
  } finally { await close(); }
});

test('while the person has a turn in one tab, no other tab comes to the front: front is refused, a resize waits', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { turnWaitMs: 300 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const [page, otherPage] = context.opened;
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    assert.deepEqual((await post(mine, 'front', { turn: true })).body, { ok: true });
    assert.deepEqual(page.calls.at(-1), ['front'], 'the turn\'s tab comes to the front');

    assert.deepEqual(await post(other, 'front'), { status: 409, type: 'application/json', body: { error: 'the person is using the browser' } });
    assert.equal((await post(other, 'front', { turn: true })).status, 409, 'and no second turn starts');
    const before = otherPage.calls.length;
    const resize = await post(other, 'viewport', { width: 800, height: 600 });
    assert.deepEqual([resize.status, resize.body.error], [409, 'the person is using the browser in another tab; try again once their turn ends'], 'a resize shows its tab');
    assert.equal((await post(other, 'navigate', { url: 'moz-extension://pm-uuid/popup/index.html' })).status, 409, 'and so does an add-on\'s page');
    assert.equal(otherPage.calls.length, before, 'none reached the page');
    assert.equal((await post(other, 'type', { selector: '#q', text: 'hi', mode: 'keyboard' })).status, 200, 'typing stays behind, so it goes on');
    assert.equal((await call('GET', `/tabs/${other}/snapshot?userId=me`)).status, 200, 'and so does reading');
    assert.ok(!otherPage.calls.some(([step]) => step === 'front'), 'neither shows its tab');

    const fronts = page.calls.filter(([step]) => step === 'front').length;
    assert.deepEqual((await post(mine, 'front', { turn: true, raise: false })).body, { ok: true });
    assert.equal(page.calls.filter(([step]) => step === 'front').length, fronts, 'a renewal alone shows nothing');
    assert.equal((await post(mine, 'viewport', { width: 480, height: 663 })).status, 200, 'the turn\'s own tab still resizes, for a live view');

    const waiting = post(other, 'viewport', { width: 800, height: 600 });
    assert.deepEqual((await post(other, 'front', { turn: false })).body, { ok: true }, 'another tab can not end the turn');
    assert.deepEqual((await post(mine, 'front', { turn: false })).body, { ok: true });
    assert.equal((await waiting).status, 200, 'a waiting resize goes on once the turn ends');
    assert.deepEqual((await post(other, 'front')).body, { ok: true });
  } finally { await close(); }
});

test('during another tab\'s turn, a click on a target the keyboard presses goes by its key, behind; with none, by mouse', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const otherPage = context.opened[1];
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    Object.assign(otherPage.main.elements, {
      'css:#buy:visible': element('button'),
      'css:#next:visible': element('a', { attributes: { href: '/next' } }),
      'css:#send:visible': element('input', { type: 'submit' }),
      'css:#agree:visible': element('input', { type: 'checkbox' }),
      'css:#menu:visible': element('div', { attributes: { role: 'button' } }),
      'css:#toggle:visible': element('span', { attributes: { role: 'switch' } }),
      'role:button:Go:true#0': element('button'),
    });
    await post(mine, 'front', { turn: true });
    const before = otherPage.calls.length;
    for (const [selector, key] of [['#buy', 'Enter'], ['#next', 'Enter'], ['#send', 'Enter'], ['#agree', 'Space'], ['#menu', 'Enter'], ['#toggle', 'Space']]) {
      assert.deepEqual((await post(other, 'click', { selector })).body, { ok: true, url: 'https://shop.example.test/', via: 'key' }, selector);
      assert.deepEqual(otherPage.calls.slice(-2), [['focus', `css:${selector}:visible`], ['press', key]], selector);
    }
    assert.deepEqual((await post(other, 'click', { ref: 'e1' })).body.via, 'key', 'a ref goes by key too');
    assert.ok(!otherPage.calls.slice(before).some(([step]) => step === 'front' || step === 'click'), 'no click or front reached the tab behind');

    await post(mine, 'front', { turn: false });
    assert.deepEqual((await post(other, 'click', { selector: '#buy' })).body.via, 'mouse', 'with no turn, a click is the mouse click');
    assert.deepEqual(otherPage.calls.at(-1), ['click', 'css:#buy:visible', { timeout: 3000 }]);
  } finally { await close(); }
});

test('a click the keyboard can not make waits for the turn to end, and its tab takes no other step before it', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { clickPollMs: 100 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const otherPage = context.opened[1];
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    const result = () => call('GET', `/tabs/${other}/click?userId=me`);
    // Each ask holds 100 ms here, so an ask goes on until the click ran.
    const ran = async () => {
      for (;;) {
        const answer = await result();
        if (!answer.body.waiting) return answer;
      }
    };
    Object.assign(otherPage.main.elements, {
      'css:#plain:visible': element('div'),
      'css:#hidden:visible': element('button', { focusable: false }),
      'css:#off:visible': element('button', { disabled: true }),
      'css:#skipped:visible': element('a', { attributes: { href: '/x' }, tabIndex: -1 }),
    });
    assert.deepEqual((await result()).body, { ok: true, none: true }, 'with no click waiting, none');
    await post(mine, 'front', { turn: true });
    for (const selector of ['#plain', '#hidden', '#off', '#skipped']) {
      assert.deepEqual((await post(other, 'click', { selector })).body, { ok: true, queued: true }, `${selector} waits`);
      const refused = { status: 409, type: 'application/json', body: { error: 'a click on this page waits for the person\'s turn in another tab; run `wait-click`' } };
      if (selector === '#plain') {
        const before = otherPage.calls.length;
        for (const [route, body] of [['click', { selector: '#buy' }], ['type', { selector: '#q', text: 'x' }], ['press', { key: 'Enter' }], ['evaluate', { expression: '1' }], ['front', {}], ['navigate', { url: 'https://shop.example.test/next' }]]) {
          assert.deepEqual(await post(other, route, body), refused, route);
        }
        assert.deepEqual(await call('GET', `/tabs/${other}/snapshot?userId=me`), refused);
        assert.equal((await call('GET', `/tabs/${other}/screenshot?userId=me`)).status, 409);
        assert.equal((await open(call, 'other', 'https://shop.example.test/again')).status, 409, 'and so does opening a page in it');
        assert.equal(otherPage.calls.length, before, 'none reached the page');
        assert.deepEqual((await result()).body, { ok: true, waiting: true }, 'an ask before the turn ends hears it still waits');
      }
      const answer = ran();
      await post(mine, 'front', { turn: false });
      assert.deepEqual((await answer).body, { ok: true, url: 'https://shop.example.test/', via: 'mouse' }, 'the turn ended, so the click ran');
      assert.deepEqual(otherPage.calls.at(-1), ['click', `css:${selector}:visible`, { timeout: 3000 }]);
      assert.deepEqual((await result()).body, { ok: true, none: true }, 'once asked, it is gone');
      await post(mine, 'front', { turn: true });
    }
    assert.ok(!otherPage.calls.some(([step]) => step === 'press'), 'no key went to any of them');
  } finally { await close(); }
});

test('a waiting click runs when the turn\'s lease lapses, and a closed tab drops it', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { turnMs: 300 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const otherPage = context.opened[1];
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    otherPage.main.elements['css:#plain:visible'] = element('div');
    await post(mine, 'front', { turn: true });
    assert.equal((await post(other, 'click', { selector: '#plain' })).body.queued, true);
    assert.equal((await call('GET', `/tabs/${other}/click?userId=me`)).body.via, 'mouse', 'its helper stopped renewing the turn');

    await post(mine, 'front', { turn: true });
    assert.equal((await post(other, 'click', { selector: '#plain' })).body.queued, true);
    const clicks = otherPage.calls.filter(([step]) => step === 'click').length;
    const answer = call('GET', `/tabs/${other}/click?userId=me`);
    await call('DELETE', `/tabs/${other}?userId=me`);
    assert.deepEqual(await answer, { status: 410, type: 'application/json', body: { error: 'the tab closed before its click ran' } });
    await new Promise(done => setTimeout(done, 400));
    assert.equal(otherPage.calls.filter(([step]) => step === 'click').length, clicks, 'and the click never runs');
    assert.equal((await call('GET', `/tabs/${other}/click?userId=me`)).status, 404);
  } finally { await close(); }
});

test('waiting clicks on two tabs run oldest first once the turn ends', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: first } = (await open(call, 'first')).body;
    const { tabId: second } = (await open(call, 'second')).body;
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    const order = [];
    for (const [page, name] of [[context.opened[1], first], [context.opened[2], second]]) {
      page.main.elements['css:#plain:visible'] = element('div');
      const push = page.calls.push.bind(page.calls);
      page.calls.push = (...items) => { if (items.some(([step]) => step === 'click')) order.push(name); return push(...items); };
    }
    await post(mine, 'front', { turn: true });
    // The later-opened tab queues first, so the order is by wait, not by tab.
    assert.equal((await post(second, 'click', { selector: '#plain' })).body.queued, true);
    await new Promise(done => setTimeout(done, 20));
    assert.equal((await post(first, 'click', { selector: '#plain' })).body.queued, true);
    await post(mine, 'front', { turn: false });
    for (const tab of [second, first]) assert.equal((await call('GET', `/tabs/${tab}/click?userId=me`)).body.via, 'mouse');
    assert.deepEqual(order, [second, first]);
  } finally { await close(); }
});

test('a click that ran keeps refusing its tab\'s other steps until its result is claimed', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const otherPage = context.opened[1];
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    otherPage.main.elements['css:#plain:visible'] = element('div');
    await post(mine, 'front', { turn: true });
    assert.equal((await post(other, 'click', { selector: '#plain' })).body.queued, true);
    await post(mine, 'front', { turn: false });
    while (!otherPage.calls.some(([step]) => step === 'click')) await new Promise(done => setTimeout(done, 50));
    assert.equal((await post(other, 'type', { selector: '#q', text: 'x' })).status, 409, 'the click ran, but its chat has not heard');
    assert.deepEqual((await call('GET', `/tabs/${other}/click?userId=me`)).body, { ok: true, url: 'https://shop.example.test/', via: 'mouse' });
    assert.equal((await post(other, 'type', { selector: '#q', text: 'x' })).status, 200, 'once claimed, steps run');
  } finally { await close(); }
});

test('a live view\'s poll selects the turn\'s tab again, unless a tab the person or the site opened in the turn is open', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    await open(call, 'other');
    const [page, otherPage] = context.opened;
    // A tab the person opened before the turn: they are on the turn's tab when it begins, so it holds nothing back.
    await otherPage.evaluate("window.open('https://news.example.test/', '_blank')");
    const post = body => call('POST', `/tabs/${mine}/front`, { userId: 'me', ...body });
    const fronts = () => page.calls.filter(([step]) => step === 'front').length;
    await post({ turn: true });
    assert.equal(fronts(), 1);
    assert.deepEqual((await post({ turn: true, reselect: true })).body, { ok: true });
    assert.equal(fronts(), 2, 'a tap on another chat\'s tab or the home tab goes back to the turn\'s tab');
    await open(call, 'third');
    await post({ turn: true, reselect: true });
    assert.equal(fronts(), 3, 'a tab another chat opens in the turn is a task\'s tab: it holds nothing back');

    await page.evaluate("window.open('https://shop.example.test/forgot-password', '_blank')");
    const forgot = context.opened.at(-1);
    assert.deepEqual((await post({ turn: true, reselect: true })).body, { ok: true });
    assert.equal(fronts(), 3, 'a tab opened from the turn\'s tab stays shown');
    assert.deepEqual((await call('GET', '/tabs?userId=me')).body.tabs.map(tab => tab.listItemId), ['mine', 'other', 'third'], 'and no task gets it');
    await forgot.close();
    await post({ turn: true, reselect: true });
    assert.equal(fronts(), 4, 'once it closes, the turn\'s tab is selected again');

    await page.evaluate("window.open('https://accounts.example.test/', '_blank')");
    await post({ turn: false });
    await post({ turn: true });
    await post({ turn: true, reselect: true });
    assert.equal(fronts(), 6, 'a new turn counts only the tabs opened in it');
  } finally { await close(); }
});

test('a turn ends when its helper stops renewing it, or its tab closes', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { turnMs: 40, turnWaitMs: 0 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    await post(mine, 'front', { turn: true });
    assert.equal((await post(other, 'front')).status, 409);
    await new Promise(done => setTimeout(done, 60));
    assert.equal((await post(other, 'front')).status, 200, 'a lease past its time lets go');
    await post(mine, 'front', { turn: true });
    await call('DELETE', `/tabs/${mine}?userId=me`);
    assert.equal((await post(other, 'click', { selector: '#buy' })).status, 200, 'a closed tab holds no turn');
  } finally { await close(); }
});

/** Gives `page` a title the server's scripts run against, with a stand-in for the observer that keeps the bell. */
function titled(page, title) {
  const document = { title, head: {} };
  class Watcher {
    constructor(callback) { Object.assign(this, { callback: () => inPage(document, callback), on: false }); document.watcher = this; }
    observe() { this.on = true; }
    disconnect() { this.on = false; }
  }
  const read = page.evaluate;
  page.evaluate = async (script, arg) => {
    if (typeof script !== 'function') return read(script);
    const kept = globalThis.MutationObserver;
    globalThis.MutationObserver = Watcher;
    try { return inPage(document, script, arg); } finally { globalThis.MutationObserver = kept; }
  };
  /** The site sets its title, as a new page or a script does; the observer, while on, sees it. */
  document.change = text => { document.title = text; if (document.watcher?.on) document.watcher.callback(); };
  return document;
}

test('shared turns stand side by side, each tab with its bell; only the first comes to the front', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { turnWaitMs: 0 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const { tabId: third } = (await open(call, 'third')).body;
    const [page, otherPage] = context.opened;
    const [doc, otherDoc] = [titled(page, 'Netflix'), titled(otherPage, 'Pay')];
    const post = (tab, body) => call('POST', `/tabs/${tab}/front`, { userId: 'me', ...body });
    assert.deepEqual((await post(mine, { turn: true, shared: true })).body, { ok: true });
    assert.deepEqual(page.calls.at(-1), ['front'], 'the first turn\'s tab comes to the front');
    assert.deepEqual((await post(other, { turn: true, shared: true })).body, { ok: true }, 'a second shared turn joins');
    assert.ok(!otherPage.calls.some(([step]) => step === 'front'), 'and stays behind');
    assert.deepEqual([doc.title, otherDoc.title], [`${BELL}Netflix`, `${BELL}Pay`]);
    assert.equal((await post(third, { turn: true })).status, 409, 'a plain turn is refused beside them');
    assert.equal((await post(third, {})).status, 409, 'and so is a plain front');
    assert.equal((await call('GET', '/turns')).body.count, 2);

    doc.change('Netflix: sign in');
    assert.equal(doc.title, `${BELL}Netflix: sign in`, 'a title the site changes keeps the bell');
    page.listeners.domcontentloaded();
    doc.title = 'Netflix home';
    page.listeners.domcontentloaded();
    await new Promise(done => setTimeout(done, 10));
    assert.equal(doc.title, `${BELL}Netflix home`, 'and so does a new page');

    assert.deepEqual((await post(other, { turn: false })).body, { ok: true });
    await new Promise(done => setTimeout(done, 10));
    assert.equal(otherDoc.title, 'Pay', 'an ended turn takes its bell off');
    otherDoc.change('Paid');
    assert.equal(otherDoc.title, 'Paid', 'and its watcher');
    assert.equal(doc.title, `${BELL}Netflix home`, 'the other turn keeps its own');
  } finally { await close(); }
});

test('Hand back ends every shared turn, each renewal hears it once, and a lapse takes its bell off too', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { turnMs: 200, turnWaitMs: 0, handBackKey: 'button-key' });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const [page, otherPage] = context.opened;
    const [doc, otherDoc] = [titled(page, 'Netflix'), titled(otherPage, 'Pay')];
    const post = (tab, body) => call('POST', `/tabs/${tab}/front`, { userId: 'me', ...body });
    await post(mine, { turn: true, shared: true });
    await post(other, { turn: true, shared: true });
    assert.deepEqual((await call('GET', '/turns', null, 'button-key')).body, { ok: true, count: 2 }, 'the button\'s key reads the count');
    assert.deepEqual((await call('POST', '/hand-back', null, 'button-key')).body, { ok: true });
    await new Promise(done => setTimeout(done, 10));
    assert.deepEqual([doc.title, otherDoc.title], ['Netflix', 'Pay'], 'every bell goes');
    assert.equal((await call('GET', '/turns')).body.count, 0);
    const renew = { turn: true, shared: true, raise: false };
    assert.deepEqual((await post(mine, renew)).body, { ok: true, handedBack: true }, 'a renewal hears it');
    assert.deepEqual((await post(other, renew)).body, { ok: true, handedBack: true });
    assert.deepEqual((await post(mine, renew)).body, { ok: true }, 'once');
    await call('POST', '/hand-back', null, 'button-key');
    assert.deepEqual((await post(other, { turn: true, shared: true })).body, { ok: true }, 'a new turn\'s first hold starts afresh');
    assert.equal((await post(other, renew)).body.handedBack, undefined);
    await post(other, { turn: false });
    assert.equal((await post(mine, renew)).body.handedBack, true, 'while a renewal still hears its own');
    await post(mine, renew);
    assert.equal(doc.title, `${BELL}Netflix`);
    await new Promise(done => setTimeout(done, 250));
    assert.equal((await call('GET', '/turns')).body.count, 0, 'a lease past its time lets go');
    await new Promise(done => setTimeout(done, 10));
    assert.equal(doc.title, 'Netflix', 'and takes its bell off');

    assert.deepEqual((await post(mine, { turn: true })).body, { ok: true });
    await call('POST', '/hand-back', null, 'button-key');
    assert.equal((await post(other, {})).status, 409, 'a plain turn stays: the watch link has its own Hand back');
    assert.equal(doc.title, 'Netflix', 'and has no bell');
  } finally { await close(); }
});

test('the hand-back key opens only the count and Hand back', async () => {
  const context = stubContext();
  const { call, close } = await serve(context, { handBackKey: 'button-key' });
  try {
    const { tabId } = (await open(call, 'mine')).body;
    assert.equal((await call('GET', '/tabs?userId=me', null, 'button-key')).status, 401);
    assert.equal((await call('POST', '/tabs', { userId: 'me', sessionKey: 'x' }, 'button-key')).status, 401);
    assert.equal((await call('POST', `/tabs/${tabId}/front`, { userId: 'me', turn: false }, 'button-key')).status, 401);
    assert.equal((await call('GET', '/turns', null, 'wrong-key')).status, 401);
    assert.equal((await call('POST', '/turns', null, 'button-key')).status, 401, 'each route by its own method');
    assert.deepEqual((await call('GET', '/turns')).body, { ok: true, count: 0 }, 'the main key opens them too');
  } finally { await close(); }
  const plain = await serve(stubContext());
  try {
    assert.equal((await plain.call('GET', '/turns', null, 'null')).status, 401, 'with no hand-back key, none opens them');
  } finally { await plain.close(); }
});

test('show brings its tab to the front and holds no turn', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    const [page] = context.opened;
    const post = (tab, body) => call('POST', `/tabs/${tab}/front`, { userId: 'me', ...body });
    assert.deepEqual((await post(mine, { show: true })).body, { ok: true });
    assert.deepEqual(page.calls.at(-1), ['front'], 'its tab comes to the front');
    assert.equal((await post(other, { turn: true })).status, 200, 'another tab can take the turn at once');
  } finally { await close(); }
});

test('the proxy starts only when its setting is on, through the saved lines, and a failed one fails the start', async () => {
  const given = [];
  const start = async options => { given.push(options); return { port: 4123, close: () => {} }; };
  let reads = 0;
  const first = { host: '127.0.0.1', port: 1055 };
  const upstream = { host: 'gw.example.test', port: 10000, username: 'u', password: 'p' };
  const lines = () => { reads++; return { first, upstream }; };
  const off = await startProxy(false, start, lines);
  assert.deepEqual([off.on, off.args, given.length, reads], [false, [], 0, 0], 'off by default: no forwarder, no proxy flag, no line read');
  const on = await startProxy(true, start, lines);
  assert.deepEqual([on.on, on.args], [true, ['--proxy', 'http://127.0.0.1:4123']]);
  assert.deepEqual(given, [{ first, upstream, networkFile: join(process.env.HOME, '.wong-stack/camoufox/network.json') }]);
  await assert.rejects(startProxy(true, async () => { throw new Error('the port is taken'); }, lines), /the port is taken/, 'no direct browser starts in its place');
});
