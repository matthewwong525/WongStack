import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildReview } from '../../.agents/skills/plan/scripts/build-review.mjs';
import { needs } from './fixtures/needs.mjs';

// playwright-core carries no browser: CI launches the runner's Google Chrome,
// and CHROME_PATH points a local run at any Chromium.
async function launch() {
  try {
    const { chromium } = await import('playwright-core');
    const where = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
    return await chromium.launch({ headless: true, ...where });
  } catch (error) {
    return { missing: `no browser to drive (${error.message.split('\n')[0]}) — run \`npm ci\` in scripts/tests/ and set CHROME_PATH` };
  }
}

const fence = '```';
const long = 'The reviewer reads every word of this item before the next one. ';
const proposal = `## Why

Reviewers read the plan on a phone.

A long token stays readable: openspec/changes/a-very-long-change-name-that-never-seems-to-end/review-visuals-and-more.html

## What Changes

- **Item one** has a small drawing.
  ${fence}text
  you ask
     │
  done
  ${fence}
- **Item two** links [the reason](#why) and wraps
  onto a second line.
- **Item three** carries a wide drawing.
  ${fence}text
${Array.from({ length: 12 }, (_, i) => `  ${String(i + 1).padStart(2, '0')} ${'─'.repeat(90)}┤`).join('\n')}
  ${fence}
- **Item four** is text. ${long.repeat(4)}
- **Item five** is text. ${long.repeat(4)}
- **Item six** names \`openspec/changes/another-very-long-path/with/many/segments/that/wrap.md\`. ${long.repeat(4)}

**Non-goals:** none.

## Decision log

- **2026-09-26** — Asked how to draw → chose text.
- **2026-09-26** — Assumed: forty columns, because phones are narrow.
`;
const temps = [];
const launched = await launch();
const browser = launched.missing ? null : launched;
const browserTest = (name, fn) => test(name, needs(launched.missing, launched.missing), fn);

function fixture(source = proposal) {
  const temp = mkdtempSync(join(tmpdir(), 'wong-review-'));
  const dir = join(temp, 'review-fixture');
  mkdirSync(dir);
  temps.push(temp);
  writeFileSync(join(dir, 'proposal.md'), source);
  buildReview(dir, { requireCurrent: true });
  return { dir, url: pathToFileURL(join(dir, 'review.html')).href };
}

async function open(url, { width = 1200, height = 800, init, touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  return { page, context, errors };
}

const at = (page, id) => page.locator(`[data-note="${id}"]`);
async function tap(page, id) { await at(page, id).click({ position: { x: 4, y: 4 } }); }
// A drawing line is noted from the full-screen view: open the fold, go full screen, click the line, choose Add note.
async function noteLine(page, id) {
  const fold = page.locator(`#item-${/^item-(\d+)/.exec(id)[1]} details.drawing`).first();
  if (!(await fold.evaluate(el => el.open))) await fold.locator('summary').click();
  await fold.locator('.enlarge').click();
  await page.locator(`#viewer [data-note="${id}"]`).click({ position: { x: 2, y: 2 } });
  await page.locator('#chip').click();
}
async function draft(page, id, text) {
  if (/-line-/.test(id)) await noteLine(page, id);
  else await page.locator(`.add[data-open="${id}"]`).click();
  await page.locator('#editor textarea').fill(text);
}
async function note(page, id, text) {
  await draft(page, id, text);
  await page.locator('#editor [data-act="save"]').click();
}
async function copied(page) {
  await page.locator('#copy').click();
  return page.locator('#copybuf').inputValue();
}

after(async () => { if (browser) await browser.close(); temps.forEach(path => rmSync(path, { recursive: true, force: true })); });

browserTest('a mouse click offers a note; a drag, a drawing control, and a link do not', async () => {
  const { page, context, errors } = await open(fixture().url);
  const chip = page.locator('#chip');
  await tap(page, 'item-2');
  assert.equal(await chip.isVisible(), true);
  assert.equal(await chip.innerText(), 'Add note');
  await page.keyboard.press('Escape');
  assert.equal(await chip.isVisible(), false);
  const box = await at(page, 'item-4').boundingBox();
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 60, { steps: 5 });
  await page.mouse.up();
  assert.equal(await chip.isVisible(), false);
  await page.locator('#item-3 summary').click();
  assert.equal(await chip.isVisible(), false);
  await page.locator('#item-3 .enlarge').click();
  await page.locator('#viewer button[aria-label="Zoom in"]').click();
  assert.equal(await chip.isVisible(), false);
  await page.locator('#viewer button', { hasText: 'Close' }).click();
  await page.locator('#item-2 a').click();
  assert.equal(await chip.isVisible(), false);
  assert.match(page.url(), /#why$/);
  await tap(page, 'item-2');
  await chip.click();
  assert.equal(await page.locator('#editor-where').innerText(), '#/2 · item "Item two links the reason and wraps onto a second line."');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('on a touch screen, one tap on Note opens the editor and a tap on text does nothing', async () => {
  const { page, context, errors } = await open(fixture().url, { width: 390, touch: true });
  await at(page, 'item-2').tap({ position: { x: 4, y: 4 } });
  assert.equal(await page.locator('#chip').isVisible(), false);
  assert.equal(await page.locator('#editor').isVisible(), false);
  const add = page.locator('.add[data-open="item-2"]');
  assert.equal(await add.innerText(), '+ Note');
  const size = await add.boundingBox();
  assert.ok(size.height >= 34, `Note button is ${size.height}px tall`);
  await add.tap();
  assert.equal(await page.locator('#editor').isVisible(), true);
  assert.equal(await page.locator('#editor-where').innerText(), '#/2 · item "Item two links the reason and wraps onto a second line."');
  await page.locator('#editor textarea').fill('One tap');
  await page.locator('#editor [data-act="save"]').tap();
  assert.equal(await at(page, 'item-2').locator('.pin').innerText(), '1');
  assert.equal(await page.locator('.add[data-open="item-2"]').count(), 0, 'the pin takes the Note button\'s place');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('saving adds a pin and a list entry, and Copy notes writes notes on the plan', async () => {
  const { page, context } = await open(fixture().url);
  await note(page, 'why-1', 'Say who reads it.');
  await note(page, 'item-2', 'Name the reason.');
  await note(page, 'item-1-line-3', 'Show the end state.');
  await note(page, 'decision-2', 'Check this one.');
  assert.equal(await at(page, 'item-2').locator('.pin').innerText(), '2');
  assert.equal(await page.locator('#item-1 summary .count').innerText(), '· 1 note');
  assert.equal(await page.locator('#note-list .entry').count(), 4);
  assert.equal(await page.locator('.bar .note-count').innerText(), '4 notes');
  assert.equal(await copied(page), [
    'Notes on the plan review-fixture from the review page. Don\'t build yet.',
    '- Why, paragraph 1 ("Reviewers read the plan on a phone."): Say who reads it.',
    '- Change #2 ("Item two links the reason and wraps onto a second line."): Name the reason.',
    '- Change #1, drawing line 3 ("done"): Show the end state.',
    '- Decision #2 ("Assumed: forty columns, because phones are narrow."): Check this one.',
  ].join('\n'));
  await page.waitForFunction(() => document.getElementById('toast').textContent.startsWith('Copied'));
  assert.equal(await page.locator('#toast').textContent(), 'Copied 4 notes. Paste them into chat.');
  await context.close();
});

browserTest('saving a note copies every saved note and says so', async () => {
  const { page, context, errors } = await open(fixture().url);
  await draft(page, 'why-1', 'Say who reads it.');
  assert.equal(await page.locator('#editor textarea').getAttribute('placeholder'), 'A question or a change');
  assert.equal(await page.locator('#editor .copies').innerText(), 'Saving a note copies all your notes.');
  assert.match(await page.locator('header .hint').innerText(), /Saving a note copies all your notes\./);
  await page.locator('#editor [data-act="save"]').click();
  await page.waitForFunction(() => document.getElementById('toast').textContent.startsWith('Saved and copied 1 note.'));
  await note(page, 'item-2', 'Name the reason.');
  await page.waitForFunction(() => document.getElementById('toast').textContent.startsWith('Saved and copied 2'));
  assert.equal(await page.locator('#toast').textContent(), 'Saved and copied 2 notes. Paste them into chat.');
  assert.equal(await page.locator('#copybuf').inputValue(), [
    'Notes on the plan review-fixture from the review page. Don\'t build yet.',
    '- Why, paragraph 1 ("Reviewers read the plan on a phone."): Say who reads it.',
    '- Change #2 ("Item two links the reason and wraps onto a second line."): Name the reason.',
  ].join('\n'));
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('drafts stay on their targets, survive a reload, and are never copied', async () => {
  const { page, context } = await open(fixture().url);
  await draft(page, 'item-2', 'Draft two');
  await draft(page, 'item-4', 'Draft four');
  assert.equal(await at(page, 'item-2').locator('.pin.draft').innerText(), 'Draft');
  assert.equal(await page.locator('#editor textarea').inputValue(), 'Draft four');
  await page.locator('#editor [data-act="close"]').click();
  await note(page, 'why-1', 'Saved');
  await at(page, 'why-1').locator('.pin').click();
  await page.locator('#editor textarea').fill('Edited');
  const text = await copied(page);
  assert.match(text, /yet\.\n- .*\): Saved$/);
  assert.doesNotMatch(text, /Edited|Draft two|Draft four/);
  await page.locator('#editor [data-act="discard"]').click();
  await at(page, 'why-1').locator('.pin').click();
  assert.equal(await page.locator('#editor textarea').inputValue(), 'Saved');
  await page.reload();
  assert.equal(await page.locator('#note-list .entry').count(), 3);
  assert.equal(await page.locator('#note-list .tag', { hasText: 'Draft' }).count(), 2);
  await page.locator('#note-list .entry', { hasText: 'Item two' }).click();
  assert.equal(await page.locator('#editor textarea').inputValue(), 'Draft two');
  await context.close();
});

browserTest('refused storage keeps notes for the session and says so', async () => {
  const init = () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage refused'); } }); };
  const { page, context, errors } = await open(fixture().url, { init });
  assert.equal(await page.locator('#notes .session').isVisible(), true);
  await draft(page, 'item-2', 'Session draft');
  assert.equal(await page.locator('#editor .session').isVisible(), true);
  await page.locator('#editor [data-act="save"]').click();
  assert.equal(await at(page, 'item-2').locator('.pin').innerText(), '1');
  assert.match(await copied(page), /yet\.\n- Change #2 .*\): Session draft$/);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('a refresh keeps notes attached, and a note whose text changed shows as possibly moved', async () => {
  const f = fixture();
  const { page, context } = await open(f.url);
  await note(page, 'item-4', 'Keep me');
  buildReview(f.dir, { requireCurrent: true });
  writeFileSync(join(f.dir, 'proposal.md'), proposal.replace('**Item five** is text.', '**Item five** changed.'));
  buildReview(f.dir, { requireCurrent: true });
  await page.reload();
  assert.equal(await at(page, 'item-4').locator('.pin').innerText(), '1');
  writeFileSync(join(f.dir, 'proposal.md'), proposal.replace('**Item four** is text.', '**Item four** moved.'));
  buildReview(f.dir, { requireCurrent: true });
  await page.reload();
  assert.equal(await page.locator('.pin').count(), 0);
  assert.match(await page.locator('#note-list .entry').innerText(), /possibly moved/);
  await page.locator('#note-list .entry').click();
  assert.equal(await page.locator('#editor .moved').isVisible(), true);
  assert.equal(await page.locator('#editor textarea').inputValue(), 'Keep me');
  await context.close();
});

browserTest('a drawing folds, fits the item\'s full width, and zooms and scrolls full screen', async () => {
  const { page, context, errors } = await open(fixture().url, { width: 390 });
  const fold = page.locator('#item-3 details.drawing');
  assert.equal(await fold.evaluate(el => el.open), false);
  assert.equal(await page.locator('#item-3 .frame').isVisible(), false);
  await fold.locator('summary').click();
  // Opening a fold fires its toggle event a moment later, and that event fits the drawing.
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('#item-3 .art')).fontSize) < 13);
  const inline = () => page.evaluate(() => {
    const frame = document.querySelector('#item-3 .frame').getBoundingClientRect(), card = document.querySelector('#item-3').getBoundingClientRect();
    const art = document.querySelector('#item-3 .art'), box = art.getBoundingClientRect();
    return { font: parseFloat(getComputedStyle(art).fontSize), inside: box.left >= frame.left - 1 && box.right <= frame.right + 1, full: frame.width >= card.width - 2 };
  });
  const start = await inline();
  assert.ok(start.font < 13 && start.inside && start.full, JSON.stringify(start));
  assert.equal(await page.locator('#item-3 .frame').evaluate(el => getComputedStyle(el).touchAction), 'pan-y');
  assert.equal(await page.locator('#item-3 .zoom').count(), 0, 'no zoom controls on the page');
  await page.locator('#item-3 .enlarge').click();
  assert.equal(await page.locator('#viewer').isVisible(), true);
  assert.equal(await page.locator('#item-3 .art').count(), 0, 'the view borrows the drawing, never a copy');
  const vframe = page.locator('#viewer .vframe');
  const view = () => vframe.evaluate(el => ({ font: parseFloat(getComputedStyle(el.querySelector('.art')).fontSize), wide: el.scrollWidth > el.clientWidth + 1, x: el.scrollLeft }));
  const fitted = await view();
  assert.ok(!fitted.wide && fitted.font >= start.font, JSON.stringify(fitted));
  assert.equal(await vframe.evaluate(el => getComputedStyle(el).touchAction), 'pan-x pan-y');
  for (let i = 0; i < 3; i += 1) await page.locator('#viewer button[aria-label="Zoom in"]').click();
  const zoomed = await view();
  assert.ok(zoomed.font > fitted.font && zoomed.wide, JSON.stringify(zoomed));
  const scrollY = await page.evaluate(() => window.scrollY);
  await vframe.evaluate(el => { el.scrollLeft = 80; });
  assert.ok((await view()).x > 0, 'the view scrolls natively');
  assert.equal(await page.evaluate(() => window.scrollY), scrollY);
  await vframe.evaluate(el => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: r.left + 10, clientY: r.top + 10, bubbles: true, cancelable: true }));
  });
  assert.ok((await view()).font > zoomed.font);
  await page.locator('#viewer button', { hasText: 'Fit' }).click();
  assert.equal((await view()).font, fitted.font);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#viewer').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.className), 'enlarge');
  assert.deepEqual(await inline(), start);
  assert.equal(await page.locator('#chip').isVisible(), false);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('no width from 320px scrolls sideways, and the phone editor docks', async () => {
  const f = fixture();
  for (const width of [320, 390, 1200]) {
    const { page, context } = await open(f.url, { width });
    for (const n of [1, 3]) await page.locator(`#item-${n} summary`).click();
    const size = await page.evaluate(() => ({ view: innerWidth, page: document.documentElement.scrollWidth }));
    assert.ok(size.page <= size.view, `horizontal overflow at ${width}px`);
    await context.close();
  }
  const { page, context } = await open(f.url, { width: 320, height: 500 });
  await draft(page, 'item-6', 'On a phone');
  assert.match(await page.locator('#editor').getAttribute('class'), /docked/);
  assert.equal(await page.locator('.bar').isVisible(), false);
  assert.ok(parseFloat(await page.locator('#editor textarea').evaluate(el => getComputedStyle(el).fontSize)) >= 16);
  for (const act of ['save', 'discard']) {
    const box = await page.locator(`#editor [data-act="${act}"]`).boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 500, `${act} is reachable`);
  }
  await context.close();
  const low = await open(f.url, { width: 320, height: 260 });
  await draft(low.page, 'item-6', 'Little room');
  const docked = await low.page.locator('#editor').boundingBox();
  assert.ok(docked.y >= 0 && docked.y + docked.height <= 261, `editor spans ${docked.y}..${docked.y + docked.height}px`);
  const whereLine = await low.page.locator('#editor-where').boundingBox();
  assert.ok(whereLine.y >= 0 && whereLine.height < 24, 'the location line is one visible line');
  await low.context.close();
  const desk = await open(f.url, { width: 1200 });
  await draft(desk.page, 'item-2', 'Beside it');
  const editor = await desk.page.locator('#editor').boundingBox(), target = await at(desk.page, 'item-2').boundingBox();
  const overlap = editor.x < target.x + target.width && target.x < editor.x + editor.width && editor.y < target.y + target.height && target.y < editor.y + editor.height;
  assert.equal(overlap, false);
  await desk.context.close();
});

browserTest('#/3 scrolls to item 3, and a keyboard note returns focus to its target', async () => {
  const { page, context } = await open(fixture().url + '#/3', { height: 400 });
  const top = (await page.locator('#item-3').boundingBox()).y;
  assert.ok(top >= 0 && top < 20, `item 3 starts at ${top}px`);
  await at(page, 'item-3').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'chip');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Via keys');
  const scrollY = await page.evaluate(() => window.scrollY);
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight']) await page.keyboard.press(key);
  assert.equal(await page.evaluate(() => window.scrollY), scrollY);
  assert.equal(await page.locator('#editor textarea').inputValue(), 'Via keys');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-note')), 'item-3');
  assert.equal(await at(page, 'item-3').locator('.pin.draft').count(), 1);
  await context.close();
});

// ── a reply link: the page at a web address with #key=, its server played by the browser's own routing ──
const LIVE = 'https://plan.test/p/0123456789abcdef0123456789abcdef/';
const LINK_KEY = 'ab'.repeat(32);
const HEADER = 'Notes on the plan review-fixture from the review page. Don\'t build yet.';
const BULLETS = ['- Why, paragraph 1 ("Reviewers read the plan on a phone."): Say who reads it.', '- Change #2 ("Item two links the reason and wraps onto a second line."): Name the reason.'];
const toastIs = (page, text) => page.waitForFunction(want => document.getElementById('toast').textContent === want, text);

// `send(requests)` and `act(requests)` answer each send and each action with {status, body}; `alive` is the
// status the link's check gets, and `actions` the names it says the link offers.
const VERSION = 'c0'.repeat(32);
const sentTrue = () => ({ status: 200, body: { sent: true } });
async function openLive({ send = sentTrue, act = sentTrue, alive = 200, actions = ['build', 'publish'], hash = `#key=${LINK_KEY}`, width = 1200, height = 800, aliveReply } = {}) {
  const f = fixture();
  const base = new URL(LIVE).pathname;
  const context = await browser.newContext({ viewport: { width, height } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(LIVE).origin });
  const requests = [];
  await context.route(`${new URL(LIVE).origin}/**`, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === base) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: readFileSync(join(f.dir, 'review.html'), 'utf8') });
    requests.push({ path: path.slice(base.length), method: request.method(), key: request.headers()['x-reply-key'], body: request.postDataJSON() });
    const answer = await (path === `${base}alive` ? aliveReply ? aliveReply(requests) : { status: alive, body: { closesAt: Date.now() + 60_000, actions, version: VERSION } } : (path === `${base}act` ? act : send)(requests));
    if (answer.abort) return route.abort();
    return route.fulfill({ status: answer.status, contentType: 'application/json', body: answer.raw ?? JSON.stringify(answer.body ?? {}) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(LIVE + hash);
  const only = name => () => requests.filter(request => request.path === name);
  return { page, context, errors, requests, sends: only('send'), acts: only('act') };
}
const isLive = page => page.locator('#copy', { hasText: 'Send notes' }).waitFor();
const ready = (page, step) => page.locator(`.bar #ready [data-ready="${step}"]`);
async function openActions(page) {
  await page.locator('#more').waitFor();
  if (await page.locator('#ready-popover').isHidden()) await page.locator('#more').click();
}
async function choose(page, step) { await openActions(page); await ready(page, step).click(); }
// Send notes remains the footer's primary action; the popover has its own primary choice.
const primary = page => page.locator('.bar > button.primary:visible').evaluateAll(found => found.map(el => el.id || el.getAttribute('data-ready')));
// Scrolled to the end, how far the page's last line sits above the bar; negative means the bar covers it.
const clearOfBar = page => page.evaluate(() => {
  scrollTo(0, document.documentElement.scrollHeight);
  const last = Array.from(document.querySelectorAll('.decision')).pop();
  const top = document.querySelector('.bar').getBoundingClientRect().top;
  return Math.min(top - last.getBoundingClientRect().bottom, top - document.querySelector('main').getBoundingClientRect().bottom);
});
const saysIs = (page, text) => page.waitForFunction(want => { const el = document.getElementById('ready-says'); return !el.hidden && el.textContent === want; }, text);
const posted = action => ({ path: 'act', method: 'POST', key: LINK_KEY, body: { action, version: VERSION } });

browserTest('opened from disk, a key in the address changes nothing: the page copies and asks nothing', async () => {
  const { page, context, errors } = await open(`${fixture().url}#key=${LINK_KEY}`);
  const asked = [];
  page.on('request', request => asked.push(request.url()));
  assert.equal(await page.locator('#copy').innerText(), 'Copy notes');
  assert.equal(await page.locator('.bar #ready').count(), 1, 'the More actions control lives in the bar');
  assert.equal(await page.locator('#ready').isVisible(), false, 'a file offers no build buttons');
  assert.deepEqual(await page.locator('.bar button:visible').allInnerTexts(), ['Copy notes'], 'the bar is as it was');
  assert.deepEqual(await primary(page), ['copy']);
  assert.ok(await clearOfBar(page) >= 0, 'the bar covers no line of the page');
  await note(page, 'why-1', 'Say who reads it.');
  await toastIs(page, 'Saved and copied 1 note. Paste them into chat.');
  assert.equal(await page.locator('#editor .copies').innerText(), 'Saving a note copies all your notes.');
  assert.equal(await copied(page), `${HEADER}\n${BULLETS[0]}`);
  assert.equal(await page.locator('.pin.sent').count(), 0);
  assert.deepEqual(asked, []);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('on a reply link, saving copies nothing and one tap sends every note once', async () => {
  const { page, context, errors, requests, sends } = await openLive();
  await isLive(page);
  assert.deepEqual(requests, [{ path: 'alive', method: 'GET', key: LINK_KEY, body: null }]);
  assert.match(await page.locator('header .hint').innerText(), /Send notes sends your saved notes to the chat\./);
  await draft(page, 'why-1', 'Say who reads it.');
  assert.equal(await page.locator('#editor .copies').innerText(), 'Send notes sends your saved notes to the chat.');
  await page.locator('#editor [data-act="save"]').click();
  await toastIs(page, 'Saved. Tap Send notes to send it to the chat.');
  await note(page, 'item-2', 'Name the reason.');
  assert.equal(await page.locator('#copybuf').inputValue(), '', 'a save copies nothing');
  assert.equal(sends().length, 0, 'a save sends nothing');
  await page.locator('#copy').click();
  await toastIs(page, 'Sent 2 notes to the chat.');
  assert.deepEqual(sends(), [{ path: 'send', method: 'POST', key: LINK_KEY, body: { text: BULLETS.join('\n') } }]);
  assert.equal(await at(page, 'why-1').locator('.pin').innerText(), '1 · Sent');
  assert.equal(await page.locator('.pin.sent').count(), 2);
  assert.equal(await page.locator('#note-list .tag', { hasText: 'Sent' }).count(), 2);
  await page.locator('#copy').click();
  await toastIs(page, 'Every note is already sent.');
  assert.equal(sends().length, 1, 'a second tap sends nothing');
  // A new note, and a sent note whose text changed, are the only ones the next tap sends.
  await note(page, 'item-4', 'A third.');
  await at(page, 'why-1').locator('.pin').click();
  await page.locator('#editor textarea').fill('Say who reads it, and when.');
  await page.locator('#editor [data-act="save"]').click();
  assert.equal(await at(page, 'why-1').locator('.pin').innerText(), '1');
  await page.locator('#copy').click();
  await toastIs(page, 'Sent 2 notes to the chat.');
  assert.match(sends()[1].body.text, /^- Why, paragraph 1 .*: Say who reads it, and when\.\n- Change #4 .*: A third\.$/);
  // Sent marks and the open link survive a reload that carries no key in the address.
  await page.evaluate(() => { location.hash = '#/why'; });
  await page.reload();
  await isLive(page);
  assert.equal(await page.locator('.pin.sent').count(), 3);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('a')].some(a => a.href.includes('key='))), false, 'no link carries the key');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('a closed link copies the notes on the same tap, marks none sent, and goes back to Copy notes', async () => {
  const { page, context, errors, sends } = await openLive({ send: () => ({ status: 410, body: { closed: true } }) });
  await isLive(page);
  await note(page, 'why-1', 'Say who reads it.');
  await note(page, 'item-2', 'Name the reason.');
  await page.locator('#copy').click();
  await toastIs(page, 'This link has closed. Copied 2 notes: paste them into chat.');
  assert.equal(await page.locator('#copybuf').inputValue(), [HEADER, ...BULLETS].join('\n'));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), [HEADER, ...BULLETS].join('\n'));
  assert.equal(await page.locator('.pin.sent').count(), 0);
  assert.equal(await page.locator('#note-list .tag', { hasText: 'Sent' }).count(), 0);
  assert.equal(await page.locator('#copy').innerText(), 'Copy notes');
  assert.equal(sends().length, 1);
  // From here it is a file page: the button copies, and a save copies too.
  await page.locator('#copy').click();
  await toastIs(page, 'Copied 2 notes. Paste them into chat.');
  await note(page, 'item-4', 'A third.');
  await toastIs(page, 'Saved and copied 3 notes. Paste them into chat.');
  assert.equal(sends().length, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('an unconfirmed send or an unreachable link copies, and a too-soon send asks to wait', async () => {
  for (const answer of [{ status: 502, body: { sent: false } }, { status: 200, body: { sent: false } }]) {
    const { page, context } = await openLive({ send: () => answer });
    await isLive(page);
    await note(page, 'why-1', 'Say who reads it.');
    await page.locator('#copy').click();
    await toastIs(page, 'This link has closed. Copied 1 note: paste them into chat.');
    assert.equal(await page.locator('.pin.sent').count(), 0);
    await context.close();
  }
  const soon = await openLive({ send: requests => (requests.filter(request => request.path === 'send').length === 1 ? { status: 429, body: { sent: false } } : { status: 200, body: { sent: true } }) });
  await isLive(soon.page);
  await note(soon.page, 'why-1', 'Say who reads it.');
  await soon.page.locator('#copy').click();
  await toastIs(soon.page, 'Wait a few seconds, then tap Send notes again.');
  assert.equal(await soon.page.locator('#copy').innerText(), 'Send notes');
  await soon.page.locator('#copy').click();
  await toastIs(soon.page, 'Sent 1 note to the chat.');
  await soon.context.close();
  // A link whose check fails, or an address with no key, is a page that copies.
  for (const options of [{ alive: 410 }, { alive: 403 }, { hash: '' }]) {
    const { page, context, requests } = await openLive(options);
    await note(page, 'why-1', 'Say who reads it.');
    await toastIs(page, 'Saved and copied 1 note. Paste them into chat.');
    assert.equal(await page.locator('#copy').innerText(), 'Copy notes');
    assert.equal(requests.filter(request => request.path === 'send').length, 0);
    assert.equal(requests.length, options.hash === '' ? 0 : 1, 'no key, no request');
    await context.close();
  }
});

browserTest('#/why still jumps with a key in the address, and the link stays open', async () => {
  const { page, context, errors, sends } = await openLive();
  await isLive(page);
  assert.equal(await page.locator('.hit').count(), 0, 'a key is not a place to jump to');
  await page.evaluate(() => { location.hash = '#/why'; });
  await page.waitForFunction(() => document.getElementById('why').classList.contains('hit'));
  await page.evaluate(() => { location.hash = '#/2'; });
  await page.waitForFunction(() => document.getElementById('item-2').classList.contains('hit'));
  await note(page, 'item-2', 'Name the reason.');
  await page.locator('#copy').click();
  await toastIs(page, 'Sent 1 note to the chat.');
  assert.equal(sends()[0].key, LINK_KEY);
  assert.deepEqual(errors, []);
  await context.close();
});

// ── compact build choices: on a reply link that offers both ──
browserTest('on a reply link, Build it is in view at the top of a long plan on a phone, asks the chat once, and says so', async () => {
  const { page, context, errors, acts, sends } = await openLive({ width: 390, height: 664 });
  await isLive(page);
  await openActions(page);
  assert.equal(await page.locator('#ready-h').count(), 0, 'no section at the foot of the page');
  assert.deepEqual(await primary(page), ['copy'], 'Send notes stays primary');
  assert.equal(await page.locator('#ready-says').isVisible(), false);
  const size = await page.evaluate(() => ({ view: innerWidth, page: document.documentElement.scrollWidth, at: scrollY, tall: document.documentElement.scrollHeight, screen: innerHeight }));
  assert.ok(size.page <= size.view, 'no sideways scroll on a phone');
  assert.equal(size.at, 0, 'the page is at its top');
  assert.ok(size.tall > 2 * size.screen, 'the plan is longer than two screens');
  for (const step of ['build', 'publish']) {
    const box = await ready(page, step).boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= size.view && box.y >= 0 && box.y + box.height <= size.screen, `${step} is in view without scrolling`);
  }
  const rows = await page.evaluate(() => [document.getElementById('copy'), document.getElementById('more')].map(el => el.getBoundingClientRect().top));
  assert.equal(rows[1], rows[0], 'the footer stays one row on a phone');
  assert.ok(await clearOfBar(page) >= 0, 'the compact bar covers no line of the page');
  await page.evaluate(() => scrollTo(0, 0));
  await choose(page, 'build');
  await saysIs(page, 'Asked the chat to build.');
  assert.equal(await page.locator('.bar #ready-says').isVisible(), true, 'the answer stays attached above the bar');
  assert.deepEqual(acts(), [posted('build')]);
  assert.equal(await page.locator('#ready button:visible').count(), 0, 'no button is left to tap twice');
  assert.deepEqual(await primary(page), ['copy'], 'with no build button left, the notes button is the primary one');
  assert.equal(sends().length, 0, 'a build tap sends no note');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('Build and publish posts nothing until Yes, publish, and Cancel goes back', async () => {
  const { page, context, errors, acts } = await openLive();
  await openActions(page);
  await choose(page, 'publish');
  assert.equal(await page.locator('.bar #ready-confirm p').innerText(), 'Goes live, can\'t be undone.');
  assert.equal(await page.locator('#ready-confirm').getAttribute('aria-label'), 'Build and publish? This goes live and can\'t be undone.');
  assert.equal(await ready(page, 'build').isVisible(), false);
  assert.deepEqual(await primary(page), ['copy']);
  const wide = await page.evaluate(() => [document.getElementById('copy'), document.querySelector('[data-ready="yes"]')].map(el => el.getBoundingClientRect().top));
  assert.ok(wide[1] < wide[0], 'confirmation sits above the single-row bar');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'cancel', 'focus lands on the safe choice');
  await choose(page, 'cancel');
  assert.equal(await ready(page, 'build').isVisible(), true);
  assert.equal(await page.locator('#ready-confirm').isVisible(), false);
  assert.deepEqual(acts(), [], 'nothing is sent before a yes');
  await choose(page, 'publish');
  await choose(page, 'yes');
  await saysIs(page, 'Asked the chat to build and publish.');
  assert.deepEqual(acts(), [posted('publish')]);
  assert.equal(await page.locator('#ready button:visible').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('an unsent note stops both buttons until it is sent', async () => {
  const { page, context, errors, acts } = await openLive();
  await openActions(page);
  assert.deepEqual(await primary(page), ['copy'], 'Send notes stays primary even with no unsent note');
  await note(page, 'why-1', 'Say who reads it.');
  assert.deepEqual(await primary(page), ['copy'], 'with an unsent note, Send notes is the primary button');
  await choose(page, 'build');
  await saysIs(page, 'Send or delete your notes first.');
  assert.equal(await page.locator('.bar #ready-says').isVisible(), true, 'the stop shows in the bar');
  await page.evaluate(() => { document.getElementById('ready-says').hidden = true; });
  await choose(page, 'publish');
  await saysIs(page, 'Send or delete your notes first.');
  assert.equal(await page.locator('#ready-confirm').isVisible(), false, 'no confirm step while a note is unsent');
  assert.deepEqual(acts(), []);
  // A note saved after the confirm step opened stops the yes too.
  await page.locator('#copy').click();
  await toastIs(page, 'Sent 1 note to the chat.');
  assert.deepEqual(await primary(page), ['copy'], 'Send notes remains primary after sending');
  await choose(page, 'publish');
  await note(page, 'item-2', 'Name the reason.');
  assert.deepEqual(await primary(page), ['copy'], 'one primary in the confirm step too');
  await choose(page, 'yes');
  await saysIs(page, 'Send or delete your notes first.');
  assert.deepEqual(acts(), []);
  // Deleting the note clears the way as sending does.
  await at(page, 'item-2').locator('.pin').click();
  await page.locator('#editor [data-act="delete"]').click();
  await choose(page, 'yes');
  await saysIs(page, 'Asked the chat to build and publish.');
  assert.deepEqual(acts(), [posted('publish')]);
  assert.deepEqual(errors, []);
  await context.close();
  // On a phone the stop sits above the same single-row footer.
  const phone = await openLive({ width: 390, height: 664 });
  await openActions(phone.page);
  await note(phone.page, 'why-1', 'Say who reads it.');
  await choose(phone.page, 'build');
  await saysIs(phone.page, 'Send or delete your notes first.');
  assert.ok(await clearOfBar(phone.page) >= 0, 'the stop covers no line of the page');
  await phone.page.evaluate(() => scrollTo(0, 0));
  await choose(phone.page, 'publish');
  assert.equal(await phone.page.locator('#ready-confirm').isVisible(), false);
  assert.deepEqual(phone.acts(), []);
  await phone.context.close();
});

browserTest('a changed plan says to reload, an asked chat says so, and a too-soon tap asks to wait', async () => {
  for (const [body, line] of [[{ changed: true }, 'The plan changed. Reload to read it first.'], [{ done: true }, 'The chat was already asked.']]) {
    const { page, context, acts } = await openLive({ act: () => ({ status: 409, body }) });
    await openActions(page);
    await choose(page, 'build');
    await saysIs(page, line);
    assert.equal(await page.locator('#ready button:visible').count(), 0);
    assert.equal(acts().length, 1);
    await context.close();
  }
  const soon = await openLive({ act: requests => (requests.filter(request => request.path === 'act').length === 1 ? { status: 429, body: { sent: false } } : sentTrue()) });
  await openActions(soon.page);
  await choose(soon.page, 'build');
  await saysIs(soon.page, 'Wait a few seconds, then tap again.');
  await choose(soon.page, 'build');
  await saysIs(soon.page, 'Asked the chat to build.');
  assert.equal(soon.acts().length, 2);
  await soon.context.close();
});

browserTest('a closed link hides the build buttons, and a link without both actions never shows them', async () => {
  for (const answer of [{ status: 410, body: { closed: true } }, { status: 502, body: { sent: false } }, { status: 200, body: { sent: false } }, { status: 400, body: { sent: false } }]) {
    const { page, context, errors } = await openLive({ act: () => answer });
    await openActions(page);
    await choose(page, 'build');
    await toastIs(page, 'This link has closed. Choose in the chat.');
    assert.equal(await page.locator('#ready').isVisible(), false, `status ${answer.status}`);
    assert.equal(await page.locator('#copy').innerText(), 'Send notes', 'the notes button is as it was');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Notes that find the link closed take the build buttons with them.
  const closed = await openLive({ send: () => ({ status: 410, body: { closed: true } }) });
  await openActions(closed.page);
  await note(closed.page, 'why-1', 'Say who reads it.');
  await closed.page.locator('#copy').click();
  await toastIs(closed.page, 'This link has closed. Copied 1 note: paste them into chat.');
  assert.equal(await closed.page.locator('#ready').isVisible(), false);
  await closed.context.close();
  for (const options of [{ actions: ['build'] }, { actions: [] }, { alive: 410 }, { hash: '' }]) {
    const { page, context, acts } = await openLive(options);
    if (options.actions) await isLive(page);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#ready').isVisible(), false, JSON.stringify(options));
    assert.equal(acts().length, 0);
    await context.close();
  }
});

// A response remains held until the test releases it: progress is observable before any acknowledgement.
function holdResponse() {
  let release;
  const answer = new Promise(resolve => { release = resolve; });
  return { answer, release };
}
const footerBox = page => page.locator('.bar').evaluate(el => {
  const box = el.getBoundingClientRect();
  const controls = [document.getElementById('copy'), document.getElementById('more')].filter(b => b.getClientRects().length).map(b => {
    const r = b.getBoundingClientRect();
    return { top: r.top, right: r.right, left: r.left, height: r.height };
  });
  return { height: box.height, controls, overflow: document.documentElement.scrollWidth > innerWidth };
});
async function idle(page) {
  await page.waitForFunction(() => document.querySelector('.bar').getAttribute('data-busy') === 'false');
  assert.equal(await page.locator('#copy').isDisabled(), false);
  assert.equal(await page.locator('.bar .spinner:visible').count(), 0, 'every loading indicator clears');
  assert.equal(await page.locator('[data-ready]:disabled').count(), 0, 'reply controls recover');
}

browserTest('a slow connection stays busy until its response is read, then enables sending or falls back to copying', async () => {
  for (const answer of [
    { status: 200, body: { actions: ['build', 'publish'], version: VERSION } },
    { status: 410, body: { closed: true } },
    { status: 200, raw: '{broken' },
    { abort: true },
  ]) {
    const held = holdResponse();
    const { page, context, requests, errors } = await openLive({ width: 320, aliveReply: () => held.answer });
    await saysIs(page, 'Connecting to the chat…');
    assert.equal(await page.locator('#copy').innerText(), 'Connecting…');
    assert.equal(await page.locator('#copy').isDisabled(), true);
    assert.equal(await page.locator('#copy').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('#copy .spinner').isVisible(), true);
    assert.equal(await page.locator('.bar').getAttribute('data-busy'), 'true');
    assert.equal(await page.locator('#ready').isVisible(), false);
    await page.locator('#copy').evaluate(el => el.click());
    assert.equal(requests.filter(r => r.method === 'POST').length, 0);
    const before = await footerBox(page);
    held.release(answer);
    await idle(page);
    assert.equal(await page.locator('#copy').innerText(), answer.body?.version ? 'Send notes' : 'Copy notes');
    assert.equal((await footerBox(page)).height, before.height, 'connecting never enlarges the footer');
    assert.deepEqual(errors, []);
    await context.close();
  }
});

browserTest('slow notes show progress immediately, block repeated and cross-action requests, and wait for acknowledgement', async () => {
  const held = holdResponse();
  const { page, context, sends, acts, errors } = await openLive({ width: 320, send: () => held.answer });
  await isLive(page);
  await note(page, 'why-1', 'Say who reads it.');
  const before = await footerBox(page);
  const requested = page.waitForRequest('**/send');
  await page.locator('#copy').click();
  await requested;
  await saysIs(page, 'Sending your notes…');
  assert.equal(await page.locator('#copy').innerText(), 'Sending…');
  assert.equal(await page.locator('#copy').isDisabled(), true);
  assert.equal(await page.locator('#copy .spinner').isVisible(), true);
  assert.equal(await page.locator('.pin.sent').count(), 0, 'no success before the response');
  await openActions(page);
  assert.equal(await ready(page, 'build').isDisabled(), true);
  assert.equal(await ready(page, 'publish').isDisabled(), true);
  await page.evaluate(() => {
    document.getElementById('copy').click();
    document.querySelector('[data-ready="build"]').click();
    document.querySelector('[data-ready="publish"]').click();
  });
  await page.waitForTimeout(80);
  assert.equal(sends().length, 1);
  assert.equal(acts().length, 0);
  assert.equal((await footerBox(page)).height, before.height);
  held.release(sentTrue());
  await saysIs(page, 'Sent 1 note to the chat.');
  await idle(page);
  assert.equal(await page.locator('.pin.sent').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('slow build and confirmed publish share a pending guard, with progress visible after closing the choices', async () => {
  for (const action of ['build', 'publish']) {
    const held = holdResponse();
    const { page, context, sends, acts, errors } = await openLive({ width: 320, act: () => held.answer });
    await isLive(page);
    const before = await footerBox(page);
    if (action === 'publish') {
      await choose(page, 'publish');
      assert.deepEqual(acts(), [], 'confirmation sends nothing');
      assert.equal((await footerBox(page)).height, before.height);
    }
    const requested = page.waitForRequest('**/act');
    await choose(page, action === 'publish' ? 'yes' : 'build');
    await requested;
    await saysIs(page, 'Sending your request…');
    const clicked = ready(page, action === 'publish' ? 'yes' : 'build');
    assert.equal(await clicked.innerText(), 'Sending…');
    assert.equal(await clicked.locator('.spinner').isVisible(), true);
    assert.equal(await page.locator('#copy').isDisabled(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#ready-popover').isVisible(), false);
    assert.equal(await page.locator('#ready-says .spinner').isVisible(), true, 'progress survives dismissal');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'more');
    await note(page, 'why-1', 'While it waits.');
    await page.evaluate(() => {
      document.getElementById('copy').click();
      for (const button of document.querySelectorAll('[data-ready]')) button.click();
    });
    await page.waitForTimeout(80);
    assert.equal(acts().length, 1);
    assert.equal(sends().length, 0, 'another notes request cannot overlap a build');
    assert.equal((await footerBox(page)).height, before.height);
    held.release(sentTrue());
    await saysIs(page, `Asked the chat to build${action === 'publish' ? ' and publish.' : '.'}`);
    await idle(page);
    assert.equal(await page.locator('.pin.sent').count(), 0, 'a build never sends notes');
    assert.deepEqual(errors, []);
    await context.close();
  }
});

browserTest('every failed notes or build response clears busy state without claiming success', async () => {
  for (const kind of ['send', 'act']) {
    for (const answer of [
      { status: 429, body: { sent: false } },
      { status: 410, body: { closed: true } },
      { status: 502, body: { sent: false } },
      { status: 200, body: { sent: false } },
      { status: 200, raw: '{broken' },
      { abort: true },
    ]) {
      const held = holdResponse();
      const { page, context, errors } = await openLive({ [kind]: () => held.answer });
      await isLive(page);
      if (kind === 'send') {
        await note(page, 'why-1', 'Say who reads it.');
        await page.locator('#copy').click();
      } else await choose(page, 'build');
      await saysIs(page, kind === 'send' ? 'Sending your notes…' : 'Sending your request…');
      held.release(answer);
      await idle(page);
      assert.equal(await page.locator('.pin.sent').count(), 0);
      assert.doesNotMatch(await page.locator('#ready-says').innerText(), /^Asked|^Sent/);
      assert.equal(await page.locator('#copy').innerText(), kind === 'send' && answer.status !== 429 ? 'Copy notes' : 'Send notes');
      if (kind === 'send') assert.equal(await page.locator('#note-list .entry').count(), 1, 'saved notes survive');
      if (answer.status === 429) {
        assert.match(await page.locator('#ready-says').innerText(), /Wait a few seconds/);
        await openActions(page);
        assert.equal(await ready(page, 'build').isEnabled(), true, 'a rate limit allows retry');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
});

browserTest('the footer stays one row at 320px and desktop through choices, confirmation, stops, and results', async () => {
  for (const width of [320, 1200]) {
    const { page, context } = await openLive({ width });
    await isLive(page);
    const before = await footerBox(page);
    assert.equal(before.overflow, false);
    assert.equal(before.controls[0].top, before.controls[1].top);
    for (const control of before.controls) {
      assert.ok(control.left >= 0 && control.right <= width);
      assert.ok(control.height >= 44, 'footer controls remain tappable');
    }
    await choose(page, 'publish');
    assert.equal((await footerBox(page)).height, before.height);
    const confirm = await page.locator('#ready-confirm').boundingBox();
    const bar = await page.locator('.bar').boundingBox();
    assert.ok(confirm.y >= 0 && confirm.y + confirm.height < bar.y, 'confirmation fits above the footer');
    await choose(page, 'cancel');
    await note(page, 'why-1', 'A note to send.');
    await choose(page, 'build');
    await saysIs(page, 'Send or delete your notes first.');
    assert.equal((await footerBox(page)).height, before.height);
    await page.locator('#copy').click();
    await saysIs(page, 'Sent 1 note to the chat.');
    assert.equal((await footerBox(page)).height, before.height);
    await choose(page, 'build');
    await saysIs(page, 'Asked the chat to build.');
    assert.equal((await footerBox(page)).height, before.height);
    assert.ok(await clearOfBar(page) >= 0);
    await context.close();
  }
});

browserTest('More actions works with native keyboard navigation, safe confirmation focus, and dismissal', async () => {
  const { page, context, acts, errors } = await openLive({ width: 320 });
  await isLive(page);
  await page.locator('#more').focus();
  assert.equal(await page.locator('#more').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#more').getAttribute('aria-label'), 'More actions');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#more').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'build');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'cancel');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ready-popover').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'more');
  await page.keyboard.press('Space');
  await page.locator('h1').click();
  assert.equal(await page.locator('#ready-popover').isVisible(), false, 'outside click dismisses');
  await openActions(page);
  await page.locator('header a').first().focus();
  assert.equal(await page.locator('#ready-popover').isVisible(), false, 'moving focus out dismisses');
  assert.deepEqual(acts(), [], 'navigation and dismissal never send an action');
  await context.close();
  assert.deepEqual(errors, []);
});
