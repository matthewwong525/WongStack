import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// browse.mjs names its files from the home folder as it loads, so the test gets its own first.
process.env.HOME = mkdtempSync(join(tmpdir(), 'browser-server-test-'));
const { appScript, browserPid, contextOptions, macApp, persistentOptions, pressKey, routes, startProxy } = await import('../../.agents/skills/browser/scripts/browser-server.mjs');
const { ADDON_REFUSAL } = await import('../../.agents/skills/browser/scripts/refs.mjs');
const { joinPieces } = await import('../../.agents/skills/browser/scripts/browse.mjs');

const KEY = 'test-key';

/** A frame whose text is `yaml`; its locators record each step in `calls`. A click throws each `clickFails` error. */
function stubFrame(calls, { url = 'about:blank', name = '', yaml = '' } = {}) {
  // `addonTargets` are the selectors that find the password manager's frame in the page.
  const frame = { yaml, clickFails: [], detached: false, addonTargets: [] };
  const locator = desc => ({
    nth: n => locator(`${desc}#${n}`),
    ariaSnapshot: async () => frame.yaml,
    click: async options => {
      calls.push(['click', desc, options]);
      const fail = frame.clickFails.shift();
      if (fail) throw new Error(fail);
    },
    evaluate: async () => { calls.push(['dom click', desc]); },
    fill: async text => { calls.push(['fill', desc, text]); },
    focus: async () => { calls.push(['focus', desc]); },
    count: async () => 1,
    evaluateAll: async () => frame.addonTargets.includes(desc),
    selectOption: async choice => {
      calls.push(['select', desc, choice]);
      if (choice.label === 'by-value') throw new Error('no such label');
    },
  });
  return Object.assign(frame, {
    url: () => url,
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
    // The page is 1100x663, and the browser's bar 85 pixels: the window is that much taller than the page.
    evaluate: async expression => {
      if (expression === 'window.opener = null') calls.push(['no opener']);
      return { 'document.URL': url, '[innerWidth, innerHeight, outerHeight]': [1100, 663, 748] }[expression] ?? (/activeElement/.test(expression) ? calls.focusInAddon === true : { expression });
    },
    setViewportSize: async size => { calls.push(['viewport', size]); },
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
    const manager = stubFrame(calls, { url: 'moz-extension://pm-uuid/inline/menu.html', yaml: '- button "Fill Card number"\n- textbox "Search vault"' });
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
    page.calls.focusInAddon = true;
    await refused(post('press', { key: 'Enter' }));
    assert.equal(page.calls.length, before, 'no refused step reached the page');
    page.calls.focusInAddon = false;
    assert.equal((await post('press', { key: 'Enter' })).status, 200);
    assert.equal((await post('click', { selector: '#buy' })).status, 200);

    assert.deepEqual((await post('navigate', { url: 'moz-extension://pm-uuid/popup/index.html' })).body, { ok: true, url: 'moz-extension://pm-uuid/popup/index.html' }, 'its sign-in page opens for the person');
    assert.deepEqual(page.calls.slice(-3), [['front'], ['viewport', { width: 1280, height: 635 }], ['goto', 'moz-extension://pm-uuid/popup/index.html']], 'first shown and sized to the screen less the bar, as a live view fits it');
    await refused(call('GET', `/tabs/${tabId}/snapshot?userId=me`), true);
    await refused(call('GET', `/tabs/${tabId}/screenshot?userId=me`), true);
    await refused(post('click', { selector: 'button' }), true);
    const read = await post('evaluate', { expression: '[innerWidth, innerHeight]' });
    await refused(read, true);
    assert.deepEqual((await read).body.size, [1100, 663], 'a size read gives the page\'s own size, so a view over it sets that back at its end');
    assert.deepEqual((await post('viewport', { width: 480, height: 663 })).body, { ok: true, width: 1280, height: 635, addonPage: true }, 'a live view\'s fit goes on, and the page keeps its size');
    assert.equal(page.calls.filter(([step]) => step === 'viewport').length, 1, 'only the first sizing reached the page');
    assert.match((await post('viewport', { width: 50, height: 663 })).body.error, /100\.\.4000/);
    assert.deepEqual((await post('front')).body, { ok: true });
    assert.match((await post('navigate', { url: 'chrome://settings' })).body.error, /http\(s\)/);

    assert.deepEqual((await post('viewport', { width: 1100, height: 663 })).body.addonPage, true, 'a view\'s end asks for the size it read');

    await page.goto('https://shop.example.test/');
    assert.equal((await call('GET', `/tabs/${tabId}/snapshot?userId=me`)).status, 200, 'once the person is back on the site, the agent reads it again');
    assert.deepEqual(page.calls.filter(([step]) => step === 'viewport').at(-1), ['viewport', { width: 1100, height: 663 }], 'and the site gets the size last asked for');
    assert.deepEqual((await post('viewport', { width: 480, height: 663 })).body, { ok: true, width: 480, height: 663 });
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

test('while the person has a turn in one tab, no other tab comes to the front: front is refused, a click or resize waits', async () => {
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
    const click = await post(other, 'click', { selector: '#buy' });
    assert.deepEqual([click.status, click.body.error], [409, 'the person is using the browser in another tab; try again once their turn ends'], 'a click selects its tab');
    assert.equal((await post(other, 'viewport', { width: 800, height: 600 })).status, 409, 'a resize shows its tab');
    assert.equal((await post(other, 'navigate', { url: 'moz-extension://pm-uuid/popup/index.html' })).status, 409, 'and so does an add-on\'s page');
    assert.equal(otherPage.calls.length, before, 'none reached the page');
    assert.equal((await post(other, 'type', { selector: '#q', text: 'hi', mode: 'keyboard' })).status, 200, 'typing stays behind, so it goes on');
    assert.equal((await call('GET', `/tabs/${other}/snapshot?userId=me`)).status, 200, 'and so does reading');
    assert.ok(!otherPage.calls.some(([step]) => step === 'front'), 'neither shows its tab');

    const fronts = page.calls.filter(([step]) => step === 'front').length;
    assert.deepEqual((await post(mine, 'front', { turn: true, raise: false })).body, { ok: true });
    assert.equal(page.calls.filter(([step]) => step === 'front').length, fronts, 'a renewal alone shows nothing');
    assert.equal((await post(mine, 'viewport', { width: 480, height: 663 })).status, 200, 'the turn\'s own tab still resizes, for a live view');

    const waiting = post(other, 'click', { selector: '#buy' });
    assert.deepEqual((await post(other, 'front', { turn: false })).body, { ok: true }, 'another tab can not end the turn');
    assert.deepEqual((await post(mine, 'front', { turn: false })).body, { ok: true });
    assert.equal((await waiting).status, 200, 'a waiting click goes on once the turn ends');
    assert.deepEqual((await post(other, 'front')).body, { ok: true });
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

/** A stand-in for the Mac app's hide, reveal and show: each call goes in `calls`. A reveal takes `revealMs`. */
function standInApp(calls, revealMs = 0) {
  return {
    hide: async () => { calls.push('hide'); return true; },
    reveal: async () => { calls.push('reveal'); await new Promise(done => setTimeout(done, revealMs)); return true; },
    show: async () => { calls.push('show'); return true; },
  };
}

test('on a Mac the window hides after a new tab, shows for the person\'s turn on its tab, and hides at the turn\'s end', async () => {
  const context = stubContext();
  const app = [];
  const { call, close } = await serve(context, { app: standInApp(app), turnMs: 60_000 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    assert.deepEqual(app, ['hide'], 'a new tab can bring the window back, so it hides again');
    const { tabId: other } = (await open(call, 'other')).body;
    const [page] = context.opened;
    const post = (tab, body) => call('POST', `/tabs/${tab}/front`, { userId: 'me', ...body });
    await call('GET', `/tabs/${mine}/snapshot?userId=me`);
    await call('POST', `/tabs/${mine}/type`, { userId: 'me', selector: '#q', text: 'hi', mode: 'keyboard' });
    assert.deepEqual(app, ['hide', 'hide'], 'reading and typing work hidden');
    await post(other);
    assert.deepEqual(app.slice(2), ['reveal', 'hide'], 'a front with no turn hangs in a hidden app: the window comes out, behind the person\'s app, then hides');

    app.length = 0;
    await post(mine, { turn: true });
    assert.deepEqual([app, page.calls.at(-1)], [['show'], ['front']], 'the turn shows the window, then its tab');
    await post(mine, { turn: true, raise: false });
    await open(call, 'third');
    await call('GET', `/tabs/${other}/snapshot?userId=me`);
    assert.deepEqual(app, ['show'], 'a renewal, a new tab, or another chat\'s step never hides it during the turn');
    await post(other, { turn: false });
    assert.equal(app.length, 1, 'another tab can not end the turn');
    await post(mine, { turn: false });
    assert.deepEqual(app, ['show', 'hide'], 'the turn\'s end hides it again');
    await post(mine, { turn: false });
    assert.equal(app.length, 2, 'an end with no turn open hides nothing more');
  } finally { await close(); }
});

test('show unhides the window on its tab with no turn, and the next task step from any chat hides it', async () => {
  const context = stubContext();
  const app = [];
  const { call, close } = await serve(context, { app: standInApp(app) });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    app.length = 0;
    const post = (tab, route, body) => call('POST', `/tabs/${tab}/${route}`, { userId: 'me', ...body });
    assert.deepEqual((await post(mine, 'front', { show: true })).body, { ok: true });
    assert.deepEqual(app, ['show']);
    assert.equal((await post(other, 'front', { turn: true, raise: false })).status, 200, 'show holds no turn');
    await post(other, 'front', { turn: false });
    app.length = 0;
    await post(mine, 'front', { show: true });
    await call('GET', `/tabs/${other}/snapshot?userId=me`);
    await call('GET', `/tabs/${mine}/snapshot?userId=me`);
    assert.deepEqual(app, ['show', 'hide'], 'the next step hides it, once');

    await post(mine, 'front', { show: true });
    await post(mine, 'front', { turn: true });
    await post(other, 'type', { selector: '#q', text: 'hi', mode: 'keyboard' });
    assert.deepEqual(app.slice(2), ['show', 'show'], 'a turn that starts after a show keeps the window up');
    await post(mine, 'front', { turn: false });
    assert.equal(app.at(-1), 'hide');
  } finally { await close(); }
});

test('a click on a Mac takes the window out of hiding for the click alone; two at once share it, and it hides after both', async () => {
  const context = stubContext();
  const app = [];
  const { call, close } = await serve(context, { app: standInApp(app, 100) });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    app.length = 0;
    const click = tab => call('POST', `/tabs/${tab}/click`, { userId: 'me', selector: '#buy' });
    assert.equal((await click(mine)).body.via, 'mouse');
    assert.deepEqual(app, ['reveal', 'hide']);
    app.length = 0;
    const both = await Promise.all([click(mine), click(other)]);
    assert.deepEqual(both.map(answer => answer.status), [200, 200]);
    assert.deepEqual(app, ['reveal', 'hide'], 'the second click finds the window out already, and the last one hides it');
    app.length = 0;
    await call('POST', `/tabs/${mine}/viewport`, { userId: 'me', width: 800, height: 600 });
    assert.deepEqual(app, ['reveal', 'hide'], 'a resize shows its tab, so it needs the window too');
  } finally { await close(); }
});

test('a turn whose helper stopped renewing it hides the window when it lapses; with no Mac app nothing hides', async () => {
  const context = stubContext();
  const app = [];
  const { call, close } = await serve(context, { app: standInApp(app), turnMs: 40 });
  try {
    const { tabId: mine } = (await open(call, 'mine')).body;
    const { tabId: other } = (await open(call, 'other')).body;
    app.length = 0;
    await call('POST', `/tabs/${mine}/front`, { userId: 'me', turn: true });
    await new Promise(done => setTimeout(done, 60));
    assert.equal((await call('POST', `/tabs/${other}/front`, { userId: 'me' })).status, 200);
    assert.deepEqual(app, ['show', 'hide', 'reveal', 'hide']);
  } finally { await close(); }
  const plain = await serve(stubContext());
  try {
    const { tabId } = (await open(plain.call)).body;
    assert.equal((await plain.call('POST', `/tabs/${tabId}/front`, { userId: 'me', show: true })).status, 200, 'Windows or Linux: show is front alone');
    assert.equal((await plain.call('POST', `/tabs/${tabId}/front`, { userId: 'me', turn: false })).status, 200);
  } finally { await plain.close(); }
});

test('the Mac app call runs osascript on the browser\'s own process id; a failure is logged once and ignored', async () => {
  const bin = mkdtempSync(join(tmpdir(), 'osascript-'));
  const log = join(bin, 'calls.log');
  // A stand-in osascript: it writes its arguments, and fails while `fail` exists.
  writeFileSync(join(bin, 'osascript'), `#!/bin/sh\nprintf '%s\\n' "$@" >> '${log}'\n[ -e '${join(bin, 'fail')}' ] && { echo 'execution error: no app' >&2; exit 1; }\nexit 0\n`);
  chmodSync(join(bin, 'osascript'), 0o755);
  const path = process.env.PATH;
  process.env.PATH = `${bin}:${path}`;
  try {
    const lines = [];
    const app = macApp(4242, { log: line => lines.push(line) });
    assert.equal(await app.hide(), true);
    assert.equal(await app.show(), true);
    const args = readFileSync(log, 'utf8').trim().split('\n');
    const [hide, show] = [args[3], args[7]];
    assert.deepEqual([args.slice(0, 3), args.slice(4, 7)], [['-l', 'JavaScript', '-e'], ['-l', 'JavaScript', '-e']], 'JavaScript for Automation');
    assert.equal(hide, appScript(4242, 'hide'));
    assert.match(hide, /runningApplicationWithProcessIdentifier\(4242\)/);
    assert.match(hide, /if \(!app\.isHidden\) app\.hide;$/, 'hides only an app that shows');
    assert.match(show, /app\.unhide; app\.activateWithOptions\(3\); delay\(0\.3\); if \(!app\.isActive\) app\.activateWithOptions\(3\);$/, 'shows and brings it in front');
    assert.match(appScript(4242, 'reveal'), /app\.unhide;$/, 'a reveal leaves the person\'s app in front');
    assert.deepEqual(lines, []);
    writeFileSync(join(bin, 'fail'), '');
    assert.equal(await app.hide(), false, 'a failed hide resolves, so the step goes on');
    assert.equal(await app.hide(), false);
    assert.equal(await app.show(), false);
    assert.equal(lines.length, 2, 'logged once for each kind');
    assert.match(lines[0], /^could not hide the browser's window: /);
  } finally {
    process.env.PATH = path;
    rmSync(bin, { recursive: true, force: true });
  }
  const logged = [];
  await macApp(1, { run: async () => { throw new Error('osascript: command not found\nmore'); }, log: line => logged.push(line) }).show();
  assert.deepEqual(logged, ['could not show the browser\'s window: osascript: command not found']);
});

test('the browser\'s process is this server\'s camoufox child, never another server\'s or a content process', () => {
  const ps = [
    '  93446     1 node',
    '  93461 93446 /Users/me/.wong-stack/camoufox/cache/Camoufox.app/Contents/MacOS/camoufox',
    '  93471 93461 /Users/me/.wong-stack/camoufox/cache/Camoufox.app/Contents/MacOS/plugin-container.app/Contents/MacOS/plugin-container',
    '  50001 50000 /tmp/x/Camoufox.app/Contents/MacOS/camoufox',
    '  50002 50000 /usr/bin/python3',
    '  60001 60000 /opt/camoufox/camoufox-bin',
  ].join('\n');
  assert.equal(browserPid(93446, () => ps), 93461);
  assert.equal(browserPid(50000, () => ps), 50001);
  assert.equal(browserPid(60000, () => ps), 60001);
  assert.equal(browserPid(12345, () => ps), null);
  assert.equal(browserPid(1, () => { throw new Error('no ps'); }), null);
});

test('the proxy starts only when its setting is on, and a failed one fails the start', async () => {
  let starts = 0;
  const start = async () => { starts++; return { port: 4123, close: () => {} }; };
  const off = await startProxy(false, start);
  assert.deepEqual([off.on, off.args, starts], [false, [], 0], 'off by default: no forwarder and no proxy flag');
  const on = await startProxy(true, start);
  assert.deepEqual([on.on, on.args, starts], [true, ['--proxy', 'http://127.0.0.1:4123'], 1]);
  await assert.rejects(startProxy(true, async () => { throw new Error('the port is taken'); }), /the port is taken/, 'no direct browser starts in its place');
});
