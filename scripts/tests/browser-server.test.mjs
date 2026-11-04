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
const { contextOptions, pressKey, routes } = await import('../../.agents/skills/browser/scripts/browser-server.mjs');
const { joinPieces } = await import('../../.agents/skills/browser/scripts/browse.mjs');

const KEY = 'test-key';

/** A frame whose text is `yaml`; its locators record each step in `calls`. A click throws each `clickFails` error. */
function stubFrame(calls, { url = 'about:blank', name = '', yaml = '' } = {}) {
  const frame = { yaml, clickFails: [], detached: false };
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
    selectOption: async choice => {
      calls.push(['select', desc, choice]);
      if (choice.label === 'by-value') throw new Error('no such label');
    },
  });
  return Object.assign(frame, {
    url: () => url,
    name: () => name,
    isDetached: () => frame.detached,
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
    evaluate: async expression => ({ expression }),
    setViewportSize: async size => { calls.push(['viewport', size]); },
    screenshot: async options => Buffer.from(`png full=${options.fullPage}`),
    close: async () => { closed = true; listeners.close?.(); },
    on: (event, listener) => { listeners[event] = listener; },
  };
}

/** A browser context whose next page reads `yaml`; it keeps its pages and the cookies it is given. */
function stubContext(yaml = '- button "Go"', frames = () => []) {
  const context = { pages: [], cookies: [], yaml };
  context.newPage = async () => {
    const page = stubPage([], context.yaml);
    page.extra = frames(page.calls);
    page.frames = () => [page.main, ...page.extra];
    context.pages.push(page);
    return page;
  };
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
    assert.equal(context.pages.length, 1);
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
    const page = context.pages[0];
    assert.deepEqual((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', ref: 'e2' })).body, { ok: true, url: 'https://shop.example.test/' });
    assert.deepEqual(page.calls.at(-1), ['click', 'role:button:Go:true#1', { timeout: 3000 }]);
    // The click may change the page, so the next ref is read again, here from the frame.
    await call('POST', `/tabs/${tabId}/type`, { userId: 'me', ref: 'e4', text: '4242' });
    assert.deepEqual(page.calls.at(-1), ['fill', 'role:textbox:Card number:true#0', '4242']);
    await call('POST', `/tabs/${tabId}/click`, { userId: 'me', ref: 'e3' });
    assert.deepEqual(page.calls.at(-1), ['click', 'role:textbox#0', { timeout: 3000 }]);
    assert.equal((await call('POST', `/tabs/${tabId}/click`, { userId: 'me', ref: 'e99' })).status, 409);
  } finally { await close(); }
});

test('a click past an overlay is forced, and then made by the page itself', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.pages[0];
    page.main.clickFails = ['<div> intercepts pointer events', 'Timeout 3000ms exceeded'];
    await call('POST', `/tabs/${tabId}/click`, { userId: 'me', selector: 'button.buy' });
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

test('type, select, press, evaluate, viewport and screenshot keep the camofox shapes', async () => {
  const context = stubContext();
  const { call, close } = await serve(context);
  try {
    const { tabId } = (await open(call)).body;
    const page = context.pages[0];
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
    assert.equal((await post('viewport', { width: 50, height: 600 })).status, 400);
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
    assert.equal(context.pages[0].isClosed(), true);
    assert.equal((await call('POST', `/tabs/${tabId}/press`, { userId: 'me', key: 'Enter' })).status, 404);
    await open(call, 'a');
    await open(call, 'b');
    assert.deepEqual((await call('DELETE', '/sessions/me')).body, { ok: true });
    assert.ok(context.pages.every(page => page.isClosed()));
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
    assert.equal(context.pages[0].isClosed(), true);
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
    const page = context.pages[0];
    page.evaluate = () => new Promise(() => {});
    const stuck = await call('POST', `/tabs/${tabId}/evaluate`, { userId: 'me', expression: '1' });
    assert.equal(stuck.status, 504);
    assert.match(stuck.body.error, /timed out/);
    assert.deepEqual((await call('POST', `/tabs/${tabId}/press`, { userId: 'me', key: 'Enter' })).body, { ok: true });
  } finally { await close(); }
});
