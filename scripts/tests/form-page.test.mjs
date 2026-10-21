import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { ending, rowsOf, stepText, timeLeft } from '../../.agents/skills/hand-over/scripts/form-page.mjs';
import { clampZoom, keepPoint, stepZoom, ZOOMS } from '../../.agents/skills/hand-over/scripts/picture-view.mjs';
import { lookCss } from '../../.agents/skills/plan/scripts/look.mjs';

const scripts = new URL('../../.agents/skills/hand-over/scripts/', import.meta.url);
const sourcePath = fileURLToPath(new URL('form-page.mjs', scripts));
// Keep byte offsets and the real filename so V8 records coverage for the browser code exercised.
const source = readFileSync(sourcePath, 'utf8').replace(/^export /gm, '       ');
const viewerPath = fileURLToPath(new URL('picture-view.mjs', scripts));
const viewer = readFileSync(viewerPath, 'utf8').replace(/^export /gm, '       ');
const markup = readFileSync(new URL('form-page.html', scripts), 'utf8');
const html = markup.replace('<script type="module" src="picture-view.mjs"></script>', '').replace('<script type="module" src="page.mjs"></script>', '');
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(done => setTimeout(done, 0)); };
const PHONE = 390;

// What `GET /form` gives for a card: form.mjs's describeForm, so no target.
const VIEW = {
  title: 'Pay City of Markham',
  note: '$45.00 · ticket P0178390',
  fields: [
    { label: 'Card number', autocomplete: 'cc-number', type: 'text', inputmode: 'numeric' },
    { label: 'Expiry month', autocomplete: 'cc-exp-month', type: 'text', inputmode: '', options: [{ value: '03', text: '03 - March' }, { value: '04', text: '04' }] },
    { label: 'Expiry year', autocomplete: 'cc-exp-year', type: 'text', inputmode: '', options: [{ value: '2028', text: '2028' }] },
    { label: 'Security code', autocomplete: 'cc-csc', type: 'text', inputmode: 'numeric' },
  ],
  submit: 'Pay $45.00',
};
const VALUES = ['4242 4242 4242 4242', '03', '2028', '737'];
const sent = (result, notification = 'notified') => (_body, answer) => answer(200, { receipt: { result, notification } });
const never = () => { throw new Error('nothing should be sent'); };

// The page at a phone's width. `respond` answers the send; `view`, `closesAt`, and `now` are what
// `GET /form` gives, and `receipts` what each `GET /receipt` answers in turn.
function page(t, respond, { view = VIEW, closesAt, now, receipts = [], hash = '#key=secret', picture } = {}) {
  const calls = [];
  const answer = (status, body) => ({ status, ok: status === 200, json: async () => body, blob: async () => body });
  const dom = new JSDOM(html, { url: `https://private.test/${hash}`, runScripts: 'outside-only', beforeParse(win) {
    Object.defineProperty(win, 'innerWidth', { value: PHONE });
    // jsdom draws no dialog and makes no object URL: these stand in for the browser's.
    win.HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
    win.HTMLDialogElement.prototype.close = function close() { this.open = false; this.dispatchEvent(new win.Event('close')); };
    win.URL.createObjectURL = blob => `blob:${blob.size}`;
    win.fetch = async (path, init = {}) => {
      calls.push({ path, key: init.headers?.['x-hand-over-key'], body: init.body && JSON.parse(init.body) });
      if (path === 'form') return view ? answer(200, { ...view, ...(picture !== undefined && { picture: true }), closesAt, now }) : answer(410);
      if (path === 'picture') return picture ? answer(200, new win.Blob([picture])) : answer(404);
      if (path === 'done') return answer(200, { ok: true });
      if (path === 'receipt') return answer(...(receipts.shift() ?? [404]));
      return respond(JSON.parse(init.body), answer);
    };
  } });
  runInContext(viewer, dom.getInternalVMContext(), { filename: viewerPath });
  runInContext(source, dom.getInternalVMContext(), { filename: sourcePath });
  t.after(() => dom.window.close());
  const $ = selector => dom.window.document.querySelector(selector);
  const boxes = () => [...dom.window.document.querySelectorAll('#fields input, #fields select')];
  const fill = (values = VALUES) => boxes().forEach((box, index) => { box.value = values[index]; });
  const submit = () => $('#details').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  const shown = () => ({ form: !$('#form').hidden, title: $('#ended h1').textContent, hint: $('#ended .hint').textContent, status: $('#status').textContent });
  return { $, boxes, fill, submit, shown, calls, window: dom.window, sends: () => calls.filter(call => call.path === 'send') };
}

test('the form fits a phone: the device\'s own width, no fixed widths, and boxes that shrink', () => {
  assert.match(markup, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(markup, /<link rel="stylesheet" href="page\.css">/, 'the look the private pages share');
  const own = /<style>([\s\S]*?)<\/style>/.exec(markup)[1] + readFileSync(new URL('private-page.css', scripts), 'utf8');
  const style = lookCss() + own;
  assert.doesNotMatch(own, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'every colour is the app\'s');
  assert.deepEqual(style.match(/(?<!max-)width:\s*\d+px/g), null, 'nothing is wider than the screen it is on');
  assert.match(style, /\.box \{ flex: 1; min-width: 0; \}/, 'two boxes side by side share a narrow row');
  assert.match(style, /input:not\(\[type=checkbox\]\), select \{[^}]*width: 100%/);
  assert.doesNotMatch(markup, /<img|<canvas|<iframe|WebSocket/, 'no live view of the site: only the one picture the link brings');
  assert.ok(markup.indexOf('src="picture-view.mjs"') < markup.indexOf('src="page.mjs"'), 'the viewer loads before the page\'s script');
});

test('the form shows its title, note, one labelled box per field with its autofill name, and the site\'s button', async t => {
  const p = page(t, never);
  await settle();
  assert.equal(p.window.innerWidth, PHONE);
  assert.equal(p.$('#form h1').textContent, 'Pay City of Markham');
  assert.equal(p.window.document.title, 'Pay City of Markham');
  assert.equal(p.$('#note').textContent, '$45.00 · ticket P0178390');
  assert.equal(p.$('#note').hidden, false);
  const [number, month, year, code] = p.boxes();
  assert.deepEqual(p.boxes().map(box => p.$(`label[for=${box.id}]`).textContent), ['Card number', 'Expiry month', 'Expiry year', 'Security code']);
  assert.deepEqual(p.boxes().map(box => [box.localName, box.getAttribute('autocomplete'), box.name, box.required]), [['input', 'cc-number', 'cc-number', true], ['select', 'cc-exp-month', 'cc-exp-month', true], ['select', 'cc-exp-year', 'cc-exp-year', true], ['input', 'cc-csc', 'cc-csc', true]]);
  assert.deepEqual([number.type, number.getAttribute('inputmode'), code.getAttribute('inputmode')], ['text', 'numeric', 'numeric']);
  assert.deepEqual([...month.options].map(option => [option.value, option.text]), [['', 'Choose…'], ['03', '03 - March'], ['04', '04']]);
  assert.equal(month.parentElement.parentElement, year.parentElement.parentElement, 'the expiry month and year sit side by side');
  assert.notEqual(number.parentElement.parentElement, month.parentElement.parentElement);
  assert.deepEqual([p.$('#send').textContent, p.$('#send').className, p.$('#send').disabled], ['Pay $45.00', 'main', false]);
  assert.equal(p.$('#does').textContent, 'Pay $45.00 types these into the site and presses its button, once.');
  assert.equal(p.$('.private').textContent, 'Private link');
  assert.equal(p.$('.promise').textContent, 'Your assistant never sees what you type.');
  const order = el => [...p.window.document.querySelectorAll('body *')].indexOf(el);
  assert.ok(order(p.$('.promise')) < order(number), 'the privacy line sits above the boxes');
  assert.equal(p.$('#done').textContent, 'Not now');
  assert.equal(p.window.document.activeElement, number);
  assert.deepEqual(p.calls, [{ path: 'form', key: 'secret', body: undefined }]);
  assert.equal(p.window.location.hash, '', 'the key leaves the address bar');
  assert.deepEqual(p.shown(), { form: true, title: 'This link has closed', hint: 'Ask your assistant for a new one.', status: '' });
});

test('a lone box with no note or kind, such as a backup code, turns autofill off', async t => {
  const p = page(t, never, { view: { title: 'Backup code for GitHub', fields: [{ label: 'Backup code', autocomplete: '', type: 'text', inputmode: '' }], submit: 'Verify' } });
  await settle();
  assert.equal(p.$('#note').hidden, true);
  const [box] = p.boxes();
  assert.deepEqual([box.getAttribute('autocomplete'), box.name, box.getAttribute('inputmode'), box.maxLength], ['off', 'field-0', null, 256]);
  assert.equal(p.$('#send').textContent, 'Verify');
});

test('every string from the form file is set as text, never markup', async t => {
  const bold = '<img src=x onerror="document.title=1"><b>bold</b>';
  const p = page(t, never, { view: { title: bold, note: bold, fields: [{ label: bold, autocomplete: '', type: 'text', inputmode: '', options: [{ value: 'a', text: bold }] }], submit: bold } });
  await settle();
  assert.equal(p.$('#form img, #form b, #form script'), null);
  assert.deepEqual([p.$('#form h1').textContent, p.$('#note').textContent, p.$('#fields label').textContent, p.$('#fields option:last-child').text, p.$('#send').textContent], Array(5).fill(bold));
});

test('the button sends the boxes once, in order, locks the page, and ends on Sent with the boxes emptied', async t => {
  let finish;
  const p = page(t, () => new Promise(done => { finish = done; }));
  await settle();
  p.fill();
  p.submit();
  await settle();
  assert.deepEqual(p.sends(), [{ path: 'send', key: 'secret', body: { values: VALUES } }]);
  assert.equal(p.shown().status, 'Sending…');
  assert.ok([...p.boxes(), p.$('#send'), p.$('#done')].every(control => control.disabled), 'nothing can be changed or tapped again');
  p.submit();
  p.$('#done').click();
  await settle();
  assert.equal(p.sends().length, 1, 'a second tap sends nothing');
  assert.equal(p.calls.some(call => call.path === 'done'), false);
  finish({ status: 200, ok: true, json: async () => ({ receipt: { result: 'done', notification: 'notified' } }) });
  await settle();
  assert.deepEqual(p.shown(), { form: false, title: 'Sent', hint: 'Back to your chat.', status: '' });
  assert.deepEqual(p.boxes().map(box => box.value), ['', '', '', '']);
});

test('Sent says to say continue when the chat was not woken', async t => {
  for (const notification of ['unconfirmed', 'unavailable']) {
    const p = page(t, sent('done', notification));
    await settle();
    p.fill();
    p.submit();
    await settle();
    assert.deepEqual(p.shown(), { form: false, title: 'Sent', hint: 'Back to your chat, and say continue.', status: '' });
  }
});

test('a site that keeps its page ends on Not accepted, with the boxes emptied and nothing sent again', async t => {
  const p = page(t, sent('not-accepted', 'not-requested'));
  await settle();
  p.fill();
  p.submit();
  await settle();
  assert.deepEqual(p.shown(), { form: false, title: 'Not accepted', hint: 'The site kept its page. Back to your chat to see what it said.', status: '' });
  assert.doesNotMatch(p.shown().hint, /nothing is sent/, 'never read as "you were not charged"');
  assert.deepEqual(p.boxes().map(box => box.value), ['', '', '', '']);
  p.submit();
  await settle();
  assert.equal(p.sends().length, 1);
});

test('a site that has not answered ends on still checking, saying not to pay again', async t => {
  const p = page(t, (_body, answer) => answer(200, { receipt: { result: 'unconfirmed', watching: true, ready: false, notification: 'notified' } }));
  await settle();
  p.fill();
  p.submit();
  await settle();
  assert.deepEqual(p.shown(), { form: false, title: 'Sent, waiting for the site', hint: 'Don\'t pay again. Your chat will say how it went.', status: '' });
  assert.deepEqual(p.boxes().map(box => box.value), ['', '', '', '']);
});

test('while it sends, the page shows each step the link names, and stops asking once the send answers', async t => {
  let finish;
  const steps = [[202, { finishing: false, step: 'typing' }], [202, { finishing: false, step: 'pressing' }], [202, { finishing: false, step: 'waiting' }]];
  const p = page(t, () => new Promise(done => { finish = done; }), { receipts: steps });
  await settle();
  p.fill();
  p.submit();
  await settle();
  assert.equal(p.shown().status, 'Sending…');
  const seen = [];
  for (let i = 0; i < 3; i++) {
    await new Promise(done => setTimeout(done, 520));
    await settle();
    seen.push(p.shown().status);
  }
  assert.deepEqual(seen, ['Typing your details…', 'Pressing Pay $45.00…', 'Waiting for the site…']);
  finish({ status: 200, ok: true, json: async () => ({ receipt: { result: 'done', notification: 'notified' } }) });
  await settle();
  const asked = p.calls.filter(call => call.path === 'receipt').length;
  await new Promise(done => setTimeout(done, 600));
  assert.equal(p.calls.filter(call => call.path === 'receipt').length, asked, 'no more asking once answered');
  assert.equal(p.shown().title, 'Sent');
});

test('an empty box or an unpicked dropdown sends nothing', async t => {
  const p = page(t, never);
  await settle();
  p.submit();
  p.fill(['4242 4242 4242 4242', '', '2028', '737']);
  p.submit();
  await settle();
  assert.equal(p.sends().length, 0);
  assert.equal(p.shown().form, true);
});

test('a send the link calls badly shaped keeps the boxes and can be sent again', async t => {
  const replies = [[400], [200, { receipt: { result: 'done', notification: 'notified' } }]];
  const p = page(t, (_body, answer) => answer(...replies.shift()));
  await settle();
  p.fill();
  p.submit();
  await settle();
  assert.equal(p.shown().status, 'Check each box and try again.');
  assert.equal(p.shown().form, true);
  assert.deepEqual(p.boxes().map(box => [box.value, box.disabled]), VALUES.map(value => [value, false]));
  p.submit();
  await settle();
  assert.equal(p.shown().title, 'Sent');
});

test('a reply that never arrives is looked up until the link says how it went', async t => {
  const lost = () => { throw new TypeError('network changed'); };
  const p = page(t, lost, { receipts: [[202, { finishing: false }], [200, { result: 'not-accepted', notification: 'not-requested' }]] });
  await settle();
  p.fill();
  p.submit();
  await settle();
  assert.equal(p.shown().form, true, 'still waiting on the first look-up');
  await new Promise(done => setTimeout(done, 600));
  assert.equal(p.shown().title, 'Not accepted');
  assert.equal(p.calls.filter(call => call.path === 'receipt').length, 2);
  assert.equal(p.sends().length, 1, 'looked up, never sent again');

  const gone = page(t, lost);
  await settle();
  gone.fill();
  gone.submit();
  await settle();
  assert.deepEqual(gone.shown(), { form: false, title: 'This link has closed', hint: 'Back to your chat to see how it went.', status: '' });
  assert.deepEqual(gone.boxes().map(box => box.value), ['', '', '', '']);

  const taken = page(t, (_body, answer) => answer(409), { receipts: [[200, { result: 'done', notification: 'notified' }]] });
  await settle();
  taken.fill();
  taken.submit();
  await settle();
  assert.equal(taken.shown().title, 'Sent', 'a send another tab already made');

  const late = page(t, (_body, answer) => answer(410), { receipts: [[200, { result: 'timeout', notification: 'not-requested' }]] });
  await settle();
  late.fill();
  late.submit();
  await settle();
  assert.deepEqual(late.shown(), { form: false, title: 'This link has closed', hint: 'Ask your assistant for a new one.', status: '' });
});

test('Not now cancels and closes the page', async t => {
  const p = page(t, never);
  await settle();
  p.fill();
  p.$('#done').click();
  await settle();
  assert.deepEqual(p.calls.map(call => call.path), ['form', 'done']);
  assert.deepEqual(p.shown(), { form: false, title: 'This link has closed', hint: 'Ask your assistant for a new one.', status: '' });
  assert.deepEqual(p.boxes().map(box => box.value), ['', '', '', '']);
});

test('a link with no key, or one that has closed, shows the closed screen and no form', async t => {
  const keyless = page(t, never, { hash: '' });
  await settle();
  assert.deepEqual(keyless.calls, [], 'nothing is asked without the key');
  assert.equal(keyless.shown().form, false);
  const closed = page(t, never, { view: null });
  await settle();
  assert.deepEqual(closed.shown(), { form: false, title: 'This link has closed', hint: 'Ask your assistant for a new one.', status: '' });
  assert.deepEqual(closed.boxes(), []);
});

test('the time reads as a clock time, then in minutes on the watcher\'s clock, and the page closes at the limit', async t => {
  const now = Date.now();
  const p = page(t, never, { closesAt: now + 10 * 60_000 - 5000, now });
  await settle();
  assert.equal(p.$('#time').textContent, 'Closes in 10 min');
  const later = page(t, never, { closesAt: now + 8 * 3_600_000, now });
  await settle();
  assert.match(later.$('#time').textContent, /^Open until /);
  const skewed = page(t, never, { closesAt: 10 * 60_000, now: 1 });
  await settle();
  assert.equal(skewed.$('#time').textContent, 'Closes in 10 min', 'a device clock that is off does not close the page');
  const untimed = page(t, never);
  await settle();
  assert.equal(untimed.$('#time').textContent, '');

  const closing = page(t, never, { closesAt: Date.now() + 150, now: Date.now() });
  await settle();
  closing.fill();
  assert.equal(closing.shown().form, true);
  await new Promise(done => setTimeout(done, 250));
  assert.deepEqual(closing.shown(), { form: false, title: 'This link has closed', hint: 'Ask your assistant for a new one.', status: '' });
  assert.deepEqual(closing.boxes().map(box => box.value), ['', '', '', '']);
});

test('a send under way outlasts the time limit and ends on its own answer', async t => {
  let finish;
  const p = page(t, () => new Promise(done => { finish = done; }), { closesAt: Date.now() + 150, now: Date.now() });
  await settle();
  p.fill();
  p.submit();
  await new Promise(done => setTimeout(done, 300));
  assert.equal(p.shown().form, true, 'the limit does not close a page that is sending');
  assert.equal(p.$('#time').textContent, '');
  finish({ status: 200, ok: true, json: async () => ({ receipt: { result: 'done', notification: 'notified' } }) });
  await settle();
  assert.equal(p.shown().title, 'Sent');
});

test('the pure helpers: time left, rows, and the closing screen', () => {
  assert.equal(timeLeft(600_000, 0), 'Closes in 10 min');
  assert.equal(timeLeft(600_000, 59_999), 'Closes in 10 min', 'a part minute rounds up');
  assert.equal(timeLeft(600_000, 599_999), 'Closes in 1 min');
  assert.equal(timeLeft(600_000, 600_000), null);
  const at = Date.UTC(2026, 9, 18, 13, 30);
  assert.match(timeLeft(at, at - 8 * 3_600_000, { zone: 'UTC' }), /^Open until (1:30\sPM|13:30)$/);
  assert.match(timeLeft(at, at - 20 * 60_000, { ahead: -3_600_000, zone: 'UTC' }), /^Open until (2:30\sPM|14:30)$/, 'a watcher clock an hour behind');
  assert.equal(timeLeft(at, at - 9 * 60_000), 'Closes in 9 min');

  const kinds = (...names) => names.map(autocomplete => ({ autocomplete }));
  assert.deepEqual(rowsOf(kinds('cc-number', 'cc-exp-month', 'cc-exp-year', 'cc-csc')), [[0], [1, 2], [3]]);
  assert.deepEqual(rowsOf(kinds('cc-exp-year', 'cc-exp-month', 'cc-csc', 'cc-exp-year')), [[0], [1], [2], [3]], 'only a year right after its month');
  assert.deepEqual(rowsOf(kinds('')), [[0]]);
  assert.deepEqual(rowsOf([]), []);

  assert.equal(ending({ result: 'done', notification: 'notified' }).hint, 'Back to your chat.');
  assert.equal(ending({ result: 'done', notification: 'unconfirmed' }).hint, 'Back to your chat, and say continue.');
  assert.equal(ending({ result: 'not-accepted' }).title, 'Not accepted');
  assert.equal(ending({ result: 'unconfirmed', watching: true }).title, 'Sent, waiting for the site');
  assert.deepEqual(['typing', 'pressing', 'waiting', null, 'other'].map(step => stepText(step, 'Verify')), ['Typing your details…', 'Pressing Verify…', 'Waiting for the site…', 'Sending…', 'Sending…']);
  for (const result of ['timeout', 'closed', 'error']) assert.equal(ending({ result }).hint, 'Ask your assistant for a new one.', result);
  for (const none of [null, undefined]) assert.equal(ending(none).hint, 'Back to your chat to see how it went.');
});

test('the site\'s page shows above the boxes, fetched behind the key, and nothing is drawn when the link has none', async t => {
  const p = page(t, never, { picture: 'png' });
  await settle();
  assert.deepEqual(p.calls.map(call => [call.path, call.key]), [['form', 'secret'], ['picture', 'secret']]);
  assert.equal(p.$('#picture').hidden, false);
  const thumb = p.$('#picture .picture-thumb');
  assert.equal(thumb.querySelector('img').src, 'blob:3');
  assert.equal(thumb.textContent, 'The site\'s page. Tap to zoom.');
  const order = el => [...p.window.document.querySelectorAll('body *')].indexOf(el);
  assert.ok(order(thumb) < order(p.boxes()[0]), 'the picture sits above the boxes');
  assert.equal(p.window.document.activeElement, p.boxes()[0], 'the first box still takes the focus');

  for (const picture of [undefined, '']) {
    const none = page(t, never, { picture });
    await settle();
    assert.equal(none.$('#picture').hidden, true, `picture ${JSON.stringify(picture)}`);
    assert.equal(none.$('#picture').children.length, 0, 'no empty frame');
  }
  assert.ok(!page(t, never).calls.some(call => call.path === 'picture'), 'a link with no picture is not asked for one');
});

test('the picture opens full screen fitted to the width, zooms by steps to 4x or by a pinch, drags, and closes to the thumbnail', async t => {
  const p = page(t, never, { picture: 'png' });
  await settle();
  const full = p.$('#picture dialog');
  const [zoomOut, zoomIn, close] = full.querySelectorAll('.picture-bar button');
  const big = full.querySelector('.picture-stage img');
  const stage = full.querySelector('.picture-stage');
  assert.equal(full.open, false);
  p.$('.picture-thumb').click();
  assert.equal(full.open, true);
  assert.deepEqual([big.style.width, zoomOut.disabled, zoomIn.disabled], ['100%', true, false], 'fitted to the width');
  assert.deepEqual([zoomOut.getAttribute('aria-label'), zoomIn.getAttribute('aria-label'), close.textContent], ['Zoom out', 'Zoom in', 'Close']);
  const widths = [];
  for (let i = 0; i < 5; i++) { zoomIn.click(); widths.push(big.style.width); }
  assert.deepEqual(widths, ['150%', '200%', '300%', '400%', '400%']);
  assert.equal(zoomIn.disabled, true, 'no further than 4x');
  zoomOut.click();
  assert.equal(big.style.width, '300%');

  const pointer = (type, pointerId, clientX, clientY = 0) => stage.dispatchEvent(new p.window.PointerEvent(type, { pointerId, clientX, clientY, bubbles: true }));
  pointer('pointerdown', 1, 100, 100);
  pointer('pointermove', 1, 60, 70);
  assert.deepEqual([stage.scrollLeft, stage.scrollTop], [40, 30], 'one finger moves around the picture');
  pointer('pointerdown', 2, 160, 70);
  pointer('pointermove', 2, 130, 70);
  assert.equal(big.style.width, `${300 * (70 / 100)}%`, 'two fingers pinch from the zoom they started at');
  pointer('pointermove', 2, 1000, 70);
  assert.equal(big.style.width, '400%', 'a pinch stops at 4x');
  for (const id of [1, 2]) pointer('pointerup', id, 0);

  close.click();
  assert.equal(full.open, false);
  assert.equal(p.window.document.activeElement, p.$('.picture-thumb'), 'Close goes back to the form, at the picture');
  p.$('.picture-thumb').click();
  assert.equal(big.style.width, '100%', 'it opens fitted again');
  p.boxes()[0].focus();
  full.close();
  assert.equal(p.window.document.activeElement, p.$('.picture-thumb'), 'Escape, which closes the dialog, does the same');
});

test('a zoom holds still the view\'s centre for + and −, and the fingers\' midpoint for a pinch', async t => {
  const p = page(t, never, { picture: 'png' });
  await settle();
  const full = p.$('#picture dialog');
  const [zoomOut, zoomIn] = full.querySelectorAll('.picture-bar button');
  const stage = full.querySelector('.picture-stage');
  // JSDOM lays nothing out: the view is given a size and a place, 400 by 600 pixels, 50 down the screen.
  Object.defineProperties(stage, { clientWidth: { value: 400 }, clientHeight: { value: 600 } });
  stage.getBoundingClientRect = () => ({ left: 0, top: 50 });
  p.$('.picture-thumb').click();
  const scroll = () => [stage.scrollLeft, stage.scrollTop];
  zoomIn.click();
  assert.deepEqual(scroll(), [100, 150], 'at 1.5x the centre, 200 by 300 in, is now 300 by 450 in, still mid-view');
  zoomIn.click();
  assert.deepEqual(scroll(), [200, 300]);
  zoomOut.click();
  assert.deepEqual(scroll(), [100, 150], 'zooming out comes back the same way');

  const pointer = (type, pointerId, clientX, clientY) => stage.dispatchEvent(new p.window.PointerEvent(type, { pointerId, clientX, clientY, bubbles: true }));
  pointer('pointerdown', 1, 100, 150);
  pointer('pointerdown', 2, 200, 150);
  pointer('pointermove', 2, 300, 150);
  assert.equal(stage.querySelector('img').style.width, '300%', 'the fingers twice as far apart: 3x');
  assert.deepEqual(scroll(), [400, 400], 'the point under the midpoint, 200 by 100 into the view, stays under it');
  for (const id of [1, 2]) pointer('pointerup', id, 0, 0);
  full.close();
  p.$('.picture-thumb').click();
  assert.deepEqual(scroll(), [0, 0], 'it opens at the top-left again');
});

test('the zoom helpers step from fitting the width to 4x and hold a pinch inside it', () => {
  assert.deepEqual([keepPoint(0, 200, 1, 2), keepPoint(200, 200, 2, 1), keepPoint(0, 200, 2, 1)], [200, 0, 0], 'never scrolled past the start');
  assert.deepEqual(ZOOMS, [1, 1.5, 2, 3, 4]);
  assert.deepEqual([stepZoom(1, true), stepZoom(2.5, true), stepZoom(4, true), stepZoom(1.2, false), stepZoom(1, false)], [1.5, 3, 4, 1, 1]);
  assert.deepEqual([clampZoom(0.5), clampZoom(2.7), clampZoom(9)], [1, 2.7, 4]);
});

test('the form offers no way to keep what is typed, and its send carries only the values', async t => {
  const p = page(t, sent('done'));
  await settle();
  assert.equal(p.$('input[type=checkbox], #keep, #keep-row'), null);
  assert.doesNotMatch(p.$('#form').textContent, /next time/i);
  p.fill();
  p.submit();
  await settle();
  assert.deepEqual(Object.keys(p.sends()[0].body), ['values']);
});
