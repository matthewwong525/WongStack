import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { ending, shapeOf, strokes } from '../../.agents/skills/hand-over/scripts/view-page.mjs';

const scripts = new URL('../../.agents/skills/hand-over/scripts/', import.meta.url);
const sourcePath = fileURLToPath(new URL('view-page.mjs', scripts));
// Keep byte offsets and the real filename so V8 records coverage for the browser code exercised.
const source = readFileSync(sourcePath, 'utf8').replace(/^export /gm, '       ');
const markup = readFileSync(new URL('view-page.html', scripts), 'utf8');
const html = markup.replace(/<script[\s\S]*?<\/script>\n/g, '');
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(done => setTimeout(done, 0)); };
const pause = ms => new Promise(done => setTimeout(done, ms));

const SCREEN = [1280, 720];
const FITS = { phone: { kind: 'phone', width: 480, screen: SCREEN }, wide: { kind: 'wide', width: 1280, screen: SCREEN } };
const NOTE = 'Messenger wants to know you\'re a person';
const CONNECTING = 'Opening the browser...';
const DONE = 'Done. Go back to the chat.';
const CLOSED = 'This link has closed. Ask in the chat for a new one.';
const [BACK, TAB, ENTER] = [0xff08, 0xff09, 0xff0d];

// The page at `width`, with a stand-in for the viewer: each one made is kept in `viewers`, with the
// calls it got, and `emit` fires one of its events. `view` is what `GET /view` gives (null: the link
// has closed); `receipts` what each `GET /receipt` answers in turn; `holder` the width of the stage the screen sits in.
function page(t, { width = 390, holder = 366, view = { note: NOTE, fit: FITS.wide }, receipts = [], hash = '#key=secret', viewer = true, before = () => {} } = {}) {
  const calls = [];
  const viewers = [];
  const answer = (status, body) => ({ status, ok: status === 200, json: async () => body });
  class Viewer {
    constructor(target, url, options) {
      Object.assign(this, { target, url, options, calls: [], heard: {} });
      target.append(target.ownerDocument.createElement('canvas'));
      viewers.push(this);
    }
    addEventListener(name, heard) { this.heard[name] = heard; }
    emit(name) { return this.heard[name]({ detail: {} }); }
    sendKey(...args) { this.calls.push(['sendKey', ...args]); }
    clipboardPasteFrom(text) { this.calls.push(['clipboardPasteFrom', text]); }
    disconnect() { this.calls.push(['disconnect']); this.emit('disconnect'); }
  }
  const size = { width, holder };
  const dom = new JSDOM(html, { url: `https://private.test/${hash}`, runScripts: 'outside-only', beforeParse(win) {
    Object.defineProperty(win, 'innerWidth', { get: () => size.width });
    Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get() { return this.id === 'stage' ? size.holder : 0; } });
    if (viewer) win.RFB = Viewer;
    before(win);
    win.fetch = async (path, init = {}) => {
      const body = init.body && JSON.parse(init.body);
      calls.push({ path, key: init.headers?.['x-hand-over-key'], body });
      if (path === 'view') return view ? answer(200, view) : answer(410);
      if (path === 'fit') return FITS[body.fit] ? answer(200, { fit: FITS[body.fit] }) : answer(400);
      if (path === 'done') return answer(200, { ok: true });
      return answer(...(receipts.shift() ?? [404]));
    };
  } });
  runInContext(source, dom.getInternalVMContext(), { filename: sourcePath });
  t.after(() => dom.window.close());
  const $ = selector => dom.window.document.querySelector(selector);
  return {
    $,
    calls,
    viewers,
    size,
    window: dom.window,
    paths: () => calls.map(call => call.path),
    shown: () => ({ live: !$('#view').hidden, line: $('#status').textContent }),
    resize: () => dom.window.dispatchEvent(new dom.window.Event('resize')),
    /** The box's text becomes `text`, as typing, a paste, or autocorrect leaves it. */
    type(text) {
      $('#text').value = text;
      $('#text').dispatchEvent(new dom.window.Event('input'));
    },
    /** A key pressed in the box; resolves to whether the page took it for itself. */
    key(name) {
      const event = new dom.window.KeyboardEvent('keydown', { key: name, cancelable: true });
      $('#text').dispatchEvent(event);
      return event.defaultPrevented;
    },
  };
}

/** The options a viewer was made with, as its subprotocols, when it has no other: the page's objects are another realm's. */
const protocols = viewer => (Object.keys(viewer.options).join() === 'wsProtocols' ? [...viewer.options.wsProtocols] : null);

/** A page whose viewer has connected. */
async function live(t, options) {
  const p = page(t, options);
  await settle();
  p.viewers[0].emit('connect');
  return p;
}

test('the page fits a phone and loads only the viewer\'s core, never its own page or clipboard panel', () => {
  assert.match(markup, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  const style = /<style>([\s\S]*?)<\/style>/.exec(markup)[1];
  assert.deepEqual(style.match(/(?<!max-)width:\s*\d+px/g), null, 'nothing is wider than the screen it is on');
  assert.match(style, /#holder \{[^}]*overflow: hidden/, 'the holder cuts the screen to the page\'s strip');
  assert.deepEqual(source.match(/import\(/g), null, 'the script loads nothing more');
  const tags = markup.match(/<script[\s\S]*?<\/script>/g);
  assert.equal(tags.length, 1, 'one tag loads the viewer, then the page: as two tags the page ran before the viewer had loaded');
  assert.deepEqual(tags[0].match(/import\('[^']+'\)/g), ['import(\'./novnc/core/rfb.js\')', 'import(\'./page.mjs\')'], 'the viewer\'s core and the page, in that order, and nothing else');
  assert.match(tags[0], /if \(tries < 2\) location\.reload\(\);/, 'a viewer that fails to load is tried again twice');
  assert.doesNotMatch(markup + source, /vnc\.html|vnc_lite|app\/|ui\.js|noVNC_clipboard|navigator\.clipboard/, 'the viewer\'s own page and clipboard panel are never loaded');
  for (const label of ['Tap a box above, then type here', CONNECTING]) assert.ok(markup.includes(label), label);
  assert.equal(/<button/.test(markup), false, 'no button: the page is the browser and one box');
});

test('while it connects the page shows one line, reports its shape, and opens the screen with the key as the subprotocol', async t => {
  const p = page(t);
  assert.deepEqual(p.shown(), { live: false, line: CONNECTING });
  await settle();
  assert.deepEqual(p.shown(), { live: false, line: CONNECTING }, 'still one line until the screen answers');
  assert.deepEqual(p.calls, [{ path: 'view', key: 'secret', body: undefined }, { path: 'fit', key: 'secret', body: { fit: 'phone' } }]);
  assert.equal(p.viewers.length, 1);
  const [viewer] = p.viewers;
  assert.equal(viewer.target, p.$('#screen'));
  assert.equal(viewer.url, 'wss://private.test/screen');
  assert.deepEqual(protocols(viewer), ['secret']);
  assert.equal(viewer.scaleViewport, true);
  assert.equal(p.window.location.hash, '', 'the key leaves the address bar');
});

test('the key leaves the page only in the header of its own requests and as the subprotocol', async t => {
  const p = await live(t);
  p.size.width = 900;
  p.resize();
  p.type('hello');
  await settle();
  assert.deepEqual(p.paths(), ['view', 'fit', 'fit']);
  for (const call of p.calls) {
    assert.equal(call.key, 'secret', call.path);
    assert.doesNotMatch(call.path + JSON.stringify(call.body ?? ''), /secret/, call.path);
  }
  for (const viewer of p.viewers) {
    assert.doesNotMatch(viewer.url, /secret/);
    assert.deepEqual(protocols(viewer), ['secret']);
    assert.doesNotMatch(JSON.stringify(viewer.calls), /secret/);
  }
  assert.doesNotMatch(p.window.document.documentElement.outerHTML + p.window.location.href, /secret/);
});

test('live, the page shows the note as text and a phone gets the page\'s strip scaled to its width', async t => {
  const p = await live(t);
  assert.deepEqual(p.shown(), { live: true, line: '' });
  assert.equal(p.$('#view').textContent.includes(NOTE), false, 'the note is the title only: the page is the browser');
  assert.equal(p.window.document.title, NOTE);
  assert.equal(p.window.document.body.classList.contains('wide'), false);
  assert.deepEqual([p.$('#screen').style.width, p.$('#screen').style.height, p.$('#holder').style.height], ['976px', '549px', '549px'], '366 across a 480 strip: the whole 1280x720 screen at that scale, cut off past the strip');
  assert.equal(p.$('#screen canvas') !== null, true);

  const bold = '<img src=x onerror="document.title=1"><b>bold</b>';
  const marked = await live(t, { view: { note: bold, fit: FITS.wide } });
  assert.equal(marked.window.document.title, bold);
  assert.equal(marked.$('#view img, #view b'), null);
  const bare = await live(t, { view: { fit: FITS.wide } });
  assert.equal(bare.window.document.title, 'Live view');
});

test('a laptop gets the whole screen, and a rotate reports the new shape', async t => {
  const p = await live(t, { width: 1440, holder: 1256 });
  assert.deepEqual(p.calls[1], { path: 'fit', key: 'secret', body: { fit: 'wide' } });
  assert.equal(p.window.document.body.classList.contains('wide'), true);
  assert.deepEqual([p.$('#screen').style.width, p.$('#screen').style.height], ['1256px', '706.5px']);

  p.size.holder = 1000;
  p.resize();
  await settle();
  assert.equal(p.paths().filter(path => path === 'fit').length, 1, 'the same shape reports nothing');
  assert.equal(p.$('#screen').style.width, '1000px', 'and is laid out again');

  Object.assign(p.size, { width: 400, holder: 360 });
  p.resize();
  await settle();
  assert.deepEqual(p.calls.at(-1), { path: 'fit', key: 'secret', body: { fit: 'phone' } });
  assert.equal(p.window.document.body.classList.contains('wide'), false);
  assert.deepEqual([p.$('#screen').style.width, p.$('#holder').style.height], ['960px', '540px']);
});

test('a fit the link does not answer keeps the last one', async t => {
  const p = await live(t, { view: { note: NOTE, fit: FITS.wide }, width: 1440, holder: 1256 });
  p.window.fetch = async () => ({ status: 500, ok: false, json: async () => null });
  Object.assign(p.size, { width: 400, holder: 376 });
  p.resize();
  await settle();
  assert.equal(p.$('#screen').style.width, '376px', 'the wide fit, at the new width');
});

const keys = viewer => viewer.calls.map(([name, keysym, code, down]) => { assert.deepEqual([name, code, down], ['sendKey', null, undefined]); return keysym; });

test('the box types straight into the browser as it changes, with no send', async t => {
  const p = await live(t);
  const [viewer] = p.viewers;
  assert.deepEqual([...p.$('#type').children].map(part => part.id), ['text'], 'one box and nothing else');
  p.type('h');
  p.type('hi');
  assert.deepEqual(keys(viewer), [0x68, 0x69]);
  p.type('h');
  assert.deepEqual(keys(viewer).slice(2), [BACK], 'a character deleted in the box is deleted in the browser');
  p.type('hello');
  assert.deepEqual(keys(viewer).slice(3), [0x65, 0x6c, 0x6c, 0x6f], 'a paste or a whole word arrives letter by letter');
  p.type('help');
  assert.deepEqual(keys(viewer).slice(7), [BACK, BACK, 0x70], 'autocorrect: back to where they differ, then the new end');
  assert.equal(p.$('#text').value, 'help', 'the box keeps what was typed');
});

test('Enter, Tab, and a Backspace in an empty box are pressed as they are; a tap on the screen empties the box', async t => {
  const p = await live(t);
  const [viewer] = p.viewers;
  p.type('ab');
  assert.equal(p.key('Backspace'), false, 'with text in the box, Backspace edits the box and the change is typed');
  assert.equal(p.key('Enter'), true);
  assert.equal(p.$('#text').value, '', 'Enter starts the box afresh');
  assert.equal(p.key('Backspace'), true, 'an empty box still deletes in the browser');
  assert.equal(p.key('Tab'), true);
  assert.equal(p.key('a'), false);
  assert.deepEqual(keys(viewer), [0x61, 0x62, ENTER, BACK, TAB]);
  p.type('xy');
  p.$('#holder').dispatchEvent(new p.window.Event('pointerdown'));
  assert.equal(p.$('#text').value, '');
  p.type('z');
  assert.deepEqual(keys(viewer).slice(7), [0x7a], 'after a tap the box mirrors nothing: no Backspace for what it held');
  assert.deepEqual([p.$('#text').getAttribute('autocomplete'), p.$('#text').type], ['off', 'text']);
});

test('when a phone\'s keyboard opens, the page shrinks to what is in sight and the box stays above it', async t => {
  const heard = {};
  const p = page(t, { before(win) { win.visualViewport = { height: 420, addEventListener: (name, run) => { heard[name] = run; } }; win.scrollTo = () => {}; } });
  await settle();
  p.viewers[0].emit('connect');
  heard.resize();
  assert.equal(p.$('#view').style.height, '420px');
});

test('once the site lets the person through, the page ends on Done', async t => {
  const p = await live(t, { receipts: [[200, { result: 'done', notification: 'notified' }]] });
  p.$('#text').value = 'half typed';
  await p.viewers[0].emit('disconnect');
  assert.deepEqual(p.shown(), { live: false, line: DONE });
  assert.equal(p.$('#text').value, '');
  assert.equal(p.viewers.length, 1, 'and connects no more');

  const quiet = await live(t, { receipts: [[200, { result: 'done', notification: 'unavailable' }]] });
  await quiet.viewers[0].emit('disconnect');
  assert.equal(quiet.shown().line, 'Done. Go back to the chat, and say continue.');
});

test('a link that closed, timed out, or stopped answering ends on the closed line', async t => {
  for (const receipts of [[[200, { result: 'timeout', notification: 'not-requested' }]], [[200, { result: 'closed' }]], [[410]], []]) {
    const p = await live(t, { receipts: structuredClone(receipts) });
    await p.viewers[0].emit('disconnect');
    assert.deepEqual(p.shown(), { live: false, line: CLOSED }, JSON.stringify(receipts));
    assert.equal(p.paths().at(-1), 'receipt');
  }
});

test('a screen that drops while the link is open connects again', async t => {
  const p = await live(t, { receipts: [[202, { finishing: false }], [202, { finishing: true }], [200, { result: 'done', notification: 'notified' }]] });
  const dropped = p.viewers[0].emit('disconnect');
  await settle();
  assert.deepEqual(p.shown(), { live: false, line: CONNECTING });
  await dropped;
  assert.equal(p.viewers.length, 2, 'a new viewer, after a short wait');
  assert.equal(p.$('#screen').children.length, 1, 'in place of the old one');
  p.viewers[1].emit('connect');
  assert.deepEqual(p.shown(), { live: true, line: '' });
  assert.equal(p.paths().filter(path => path === 'fit').length, 1, 'the shape is not reported again');

  await p.viewers[1].emit('disconnect');
  assert.equal(p.viewers.length, 3, 'a link that is ending is asked again');
  await p.viewers[2].emit('disconnect');
  assert.deepEqual(p.shown(), { live: false, line: DONE });
  assert.equal(p.viewers.length, 3);
});

test('between viewers the box types nothing', async t => {
  const p = await live(t, { receipts: [[202, { finishing: false }]] });
  const dropped = p.viewers[0].emit('disconnect');
  p.type('nowhere to go');
  assert.equal(p.key('Enter'), false);
  assert.deepEqual(p.viewers[0].calls, []);
  await dropped;
});

test('a link with no key, one that has closed, or a viewer that did not load shows the closed line and no screen', async t => {
  const keyless = page(t, { hash: '' });
  await settle();
  assert.deepEqual(keyless.calls, [], 'nothing is asked without the key');
  assert.deepEqual(keyless.shown(), { live: false, line: CLOSED });
  const closed = page(t, { view: null });
  await settle();
  assert.deepEqual(closed.shown(), { live: false, line: CLOSED });
  assert.deepEqual(closed.paths(), ['view']);
  const unloaded = page(t, { viewer: false });
  await settle();
  assert.deepEqual(unloaded.calls, []);
  assert.deepEqual(unloaded.shown(), { live: false, line: 'The browser\'s picture didn\'t load. Reload this page to try again.' });
  assert.equal(unloaded.window.location.hash, '#key=secret', 'the key stays in the address, so a reload works');
  for (const p of [keyless, closed, unloaded]) assert.equal(p.viewers.length, 0);
});

test('the page closes at the time limit, on the watcher\'s clock', async t => {
  const p = await live(t, { view: { note: NOTE, fit: FITS.wide, closesAt: 10_000_150, now: 10_000_000 } });
  assert.equal(p.shown().live, true, 'a device clock that is off does not close it early');
  await pause(250);
  assert.deepEqual(p.shown(), { live: false, line: CLOSED });
  assert.deepEqual(p.viewers[0].calls, [['disconnect']]);

  const late = page(t, { view: { note: NOTE, fit: FITS.wide, closesAt: 10_000_000 } });
  await pause(50);
  assert.deepEqual(late.shown(), { live: false, line: CLOSED }, 'a limit long past, by this device\'s own clock when the link names none');
});

test('the pure helpers: the shape a width reports, and the closing line', () => {
  assert.deepEqual([shapeOf(320), shapeOf(699), shapeOf(700), shapeOf(1440)], ['phone', 'phone', 'wide', 'wide']);
  assert.equal(ending({ result: 'done', notification: 'notified' }), DONE);
  assert.equal(ending({ result: 'done', notification: 'unconfirmed' }), 'Done. Go back to the chat, and say continue.');
  for (const receipt of [{ result: 'closed' }, { result: 'timeout' }, { result: 'error' }, null, undefined]) assert.equal(ending(receipt), CLOSED);
  assert.deepEqual(strokes('', 'aÿ'), [0x61, 0xff]);
  assert.deepEqual(strokes('a', 'a名\n'), [0x01000000 + 0x540d, ENTER], 'past Latin-1, X\'s Unicode keysym; a line break is Enter');
  assert.deepEqual(strokes('😀x', '😀'), [BACK], 'one Backspace per character, not per code unit');
  assert.deepEqual(strokes('same', 'same'), []);
});
