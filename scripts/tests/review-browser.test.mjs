import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
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

async function open(url, { width = 1200, height = 800, init, touch = false, scheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, colorScheme: scheme });
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
  assert.equal(await page.locator('header .note-count').innerText(), '4 notes');
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

browserTest('the note box and the chip sit above the page with a clear shadow and edge, floating and docked', async () => {
  const f = fixture();
  const look = (page, sel) => page.locator(sel).evaluate(el => ({ shadow: getComputedStyle(el).boxShadow, edge: getComputedStyle(el).borderTopWidth }));
  const desk = await open(f.url, { width: 1200 });
  await tap(desk.page, 'item-2');
  const chip = await look(desk.page, '#chip');
  assert.notEqual(chip.shadow, 'none', 'the chip casts a shadow');
  await desk.page.keyboard.press('Escape');
  await draft(desk.page, 'item-2', 'Floating');
  const floating = await look(desk.page, '#editor');
  assert.doesNotMatch(await desk.page.locator('#editor').getAttribute('class') || '', /docked/);
  assert.notEqual(floating.shadow, 'none', 'the floating box casts a shadow');
  assert.match(floating.shadow, /38px/, 'the popover shadow, not the faint card one');
  assert.equal(floating.edge, '1px');
  await desk.context.close();
  const phone = await open(f.url, { width: 390, height: 700 });
  await draft(phone.page, 'item-2', 'Docked');
  assert.match(await phone.page.locator('#editor').getAttribute('class'), /docked/);
  const docked = await look(phone.page, '#editor');
  assert.notEqual(docked.shadow, 'none', 'the docked box casts a shadow upward');
  assert.match(docked.shadow, /-8px/, 'the shadow falls on the page above');
  assert.equal(docked.edge, '1px', 'a top edge');
  await phone.context.close();
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
async function openLive({ send = sentTrue, act = sentTrue, alive = 200, actions = ['build', 'publish'], hash = `#key=${LINK_KEY}`, width = 1200, height = 800, aliveReply, make = fixture } = {}) {
  const f = make();
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
async function openActions(page) { await ready(page, 'build').waitFor(); }
async function choose(page, step) { await openActions(page); await ready(page, step).click(); }
// Send notes is the footer's only filled action.
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
  assert.equal(await page.locator('.bar #ready').count(), 1, 'the build controls live in the bar');
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
  const { page, context, errors, acts, sends } = await openLive({ width: 320, height: 664 });
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
  const rows = await page.evaluate(() => [document.getElementById('copy'), document.querySelector('[data-ready="build"]'), document.querySelector('[data-ready="publish"]')].map(el => el.getBoundingClientRect().top));
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
  assert.equal(await ready(page, 'build').isVisible(), true, 'the three footer choices remain visible');
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

browserTest('both build choices carry saved unsent notes in one action, excluding drafts and sent notes', async () => {
  for (const action of ['build', 'publish']) {
    const { page, context, acts, sends, errors } = await openLive({ width: 320 });
    await isLive(page);
    await note(page, 'why-1', 'Say who reads it.');
    await page.locator('#copy').click();
    await toastIs(page, 'Sent 1 note to the chat.');
    await note(page, 'item-2', 'Name the reason.');
    await draft(page, 'item-4', 'An unfinished draft.');
    await page.locator('#editor [data-act="close"]').click();
    if (action === 'publish') {
      await choose(page, 'publish');
      assert.deepEqual(acts(), [], 'confirmation sends nothing');
      // A saved note added after opening confirmation joins the actual send snapshot.
      await at(page, 'why-1').locator('.pin').click();
      await page.locator('#editor textarea').fill('Edited after confirmation.');
      await page.locator('#editor [data-act="save"]').click();
      await choose(page, 'publish');
    }
    await choose(page, action === 'publish' ? 'yes' : 'build');
    await saysIs(page, `Asked the chat to build${action === 'publish' ? ' and publish.' : '.'}`);
    assert.equal(acts().length, 1);
    assert.equal(sends().length, 1, 'build sends no separate notes request');
    assert.equal(acts()[0].body.action, action);
    assert.equal(acts()[0].body.version, VERSION);
    assert.match(acts()[0].body.text, /Name the reason\.$/);
    assert.doesNotMatch(acts()[0].body.text, /unfinished|Say who reads/);
    assert.equal(await page.locator('.pin.sent').count(), 2);
    assert.equal(await page.locator('.pin.draft').count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
  }
});

browserTest('a changed plan says to reload, an asked chat says so, and a too-soon tap asks to wait', async () => {
  for (const [body, line] of [[{ changed: true }, 'The plan changed. Reload to read it first.'], [{ done: true }, 'The chat was already asked.']]) {
    const { page, context, acts } = await openLive({ act: () => ({ status: 409, body }) });
    await openActions(page);
    await note(page, 'why-1', 'Say who reads it.');
    await choose(page, 'build');
    await saysIs(page, line);
    assert.equal(await page.locator('.pin.sent').count(), 0, 'stale or duplicate action cannot acknowledge new notes');
    assert.equal(await page.locator('#ready button:visible').count(), 0);
    assert.equal(acts().length, 1);
    await context.close();
  }
  const soon = await openLive({ act: requests => (requests.filter(request => request.path === 'act').length === 1 ? { status: 429, body: { sent: false } } : sentTrue()) });
  await openActions(soon.page);
  await note(soon.page, 'why-1', 'Say who reads it.');
  await choose(soon.page, 'build');
  await saysIs(soon.page, 'Wait a few seconds, then tap again.');
  await choose(soon.page, 'build');
  await saysIs(soon.page, 'Asked the chat to build.');
  assert.equal(soon.acts().length, 2);
  assert.deepEqual(soon.acts()[0], soon.acts()[1]);
  assert.equal(await soon.page.locator('.pin.sent').count(), 1);
  await soon.context.close();
});

browserTest('a closed link hides the build buttons, and a link shows only the build choices it offers', async () => {
  for (const answer of [{ status: 410, body: { closed: true } }, { status: 403, body: { sent: false } }]) {
    const { page, context, errors } = await openLive({ act: () => answer });
    await openActions(page);
    await choose(page, 'build');
    await toastIs(page, 'This link has closed. Copy your notes and choose in the chat.');
    assert.equal(await page.locator('#ready').isVisible(), false, `status ${answer.status}`);
    assert.equal(await page.locator('#copy').innerText(), 'Copy notes', 'closed actions leave note copying available');
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
  // One offered choice shows alone, beside Send notes, in a bar of two columns.
  const one = await openLive({ actions: ['build'] });
  await openActions(one.page);
  assert.deepEqual(await one.page.locator('.bar button:visible').allInnerTexts(), ['Send notes', 'Build it']);
  const halves = await one.page.evaluate(() => [document.getElementById('copy'), document.querySelector('[data-ready="build"]')].map(el => Math.round(el.getBoundingClientRect().width)));
  assert.ok(Math.abs(halves[0] - halves[1]) <= 1, `two equal columns: ${halves}`);
  await one.context.close();
  for (const options of [{ actions: [] }, { actions: ['ship'] }, { alive: 410 }, { hash: '' }]) {
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
  const controls = [document.getElementById('copy'), ...document.querySelectorAll('#ready > button')].filter(b => b.getClientRects().length).map(b => {
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
    assert.equal(await page.locator('#ready-confirm').isVisible(), false);
    assert.equal(await page.locator('#ready-says .spinner').isVisible(), true, 'progress survives dismissal');
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
    assert.equal(await page.locator('.pin.sent').count(), 0, 'notes saved after the snapshot stay unsent');
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
      { status: 400, body: { sent: false } },
      { abort: true },
    ]) {
      const held = holdResponse();
      const { page, context, errors } = await openLive({ [kind]: () => held.answer });
      await isLive(page);
      if (kind === 'send') {
        await note(page, 'why-1', 'Say who reads it.');
        await page.locator('#copy').click();
      } else { await note(page, 'why-1', 'Say who reads it.'); await choose(page, 'build'); }
      await saysIs(page, kind === 'send' ? 'Sending your notes…' : 'Sending your request…');
      held.release(answer);
      await idle(page);
      assert.equal(await page.locator('.pin.sent').count(), 0);
      assert.doesNotMatch(await page.locator('#ready-says').innerText(), /^Asked|^Sent/);
      assert.equal(await page.locator('#copy').innerText(), (kind === 'send' && answer.status !== 429) || (kind === 'act' && answer.status === 410) ? 'Copy notes' : 'Send notes');
      assert.equal(await page.locator('#note-list .entry').count(), 1, 'saved notes survive');
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

browserTest('the footer stays one row at 320px and desktop through confirmation, notes, and results', async () => {
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

browserTest('visible choices support keyboard navigation and safe publish confirmation dismissal', async () => {
  const { page, context, acts, errors } = await openLive({ width: 320 });
  await isLive(page);
  assert.equal(await page.locator('#more').count(), 0);
  await page.locator('#copy').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'build');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'publish');
  await page.keyboard.press('Enter');
  assert.equal(await ready(page, 'publish').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'cancel');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ready-confirm').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ready')), 'publish');
  await page.keyboard.press('Space');
  await page.locator('h1').click();
  assert.equal(await page.locator('#ready-confirm').isVisible(), false, 'outside click dismisses');
  await choose(page, 'publish');
  await page.locator('header a').first().focus();
  assert.equal(await page.locator('#ready-confirm').isVisible(), false, 'moving focus out dismisses');
  assert.deepEqual(acts(), [], 'navigation and dismissal never send an action');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('acknowledgement marks only the exact submitted note content, for notes and both build actions', async () => {
  for (const action of ['send', 'build', 'publish']) {
    const held = holdResponse();
    const { page, context, acts, sends } = await openLive({ [action === 'send' ? 'send' : 'act']: () => held.answer });
    await isLive(page);
    await note(page, 'why-1', 'Say who reads it.');
    await note(page, 'item-2', 'Name the reason.');
    if (action === 'publish') await choose(page, 'publish');
    if (action === 'send') await page.locator('#copy').click();
    else await choose(page, action === 'publish' ? 'yes' : 'build');
    await saysIs(page, action === 'send' ? 'Sending your notes…' : 'Sending your request…');
    await at(page, 'why-1').locator('.pin').click();
    await page.locator('#editor textarea').fill('A later saved edit.');
    await page.locator('#editor [data-act="save"]').click();
    await note(page, 'item-4', 'A later new note.');
    await at(page, 'item-2').locator('.pin').click();
    await page.locator('#editor textarea').fill('A later draft.');
    await page.locator('#editor [data-act="close"]').click();
    held.release(sentTrue());
    await idle(page);
    assert.equal(await page.locator('#note-list .tag', { hasText: 'Sent' }).count(), 1, 'only unchanged saved content is acknowledged, even when its pin shows a draft');
    assert.equal(await at(page, 'why-1').locator('.pin.sent').count(), 0);
    const requests = action === 'send' ? sends() : acts();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.text, BULLETS.join('\n'), 'the request captured original saved content');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wong-review3:review-fixture')));
    assert.equal(saved.notes.find(n => n.id === 'item-2').sent, true);
    assert.equal(saved.drafts['item-2'].text, 'A later draft.');
    assert.notEqual(saved.notes.find(n => n.id === 'why-1').sent, true);
    await context.close();
  }
});

browserTest('unconfirmed action responses preserve notes and allow retry with the same snapshot', async () => {
  for (const failure of [{ status: 502, body: { sent: false } }, { status: 200, body: { sent: false } }, { status: 200, raw: '{broken' }, { abort: true }]) {
    const { page, context, acts, sends } = await openLive({ act: requests => requests.filter(r => r.path === 'act').length === 1 ? failure : sentTrue() });
    await isLive(page);
    await note(page, 'why-1', 'Say who reads it.');
    await choose(page, 'build');
    await saysIs(page, 'The request was not confirmed. Your notes are saved. Try again.');
    assert.equal(await page.locator('.pin.sent').count(), 0);
    await choose(page, 'build');
    await saysIs(page, 'Asked the chat to build.');
    assert.deepEqual(acts()[0], acts()[1]);
    assert.equal(await page.locator('.pin.sent').count(), 1);
    assert.equal(sends().length, 0);
    await context.close();
  }
});

browserTest('a picture fits a 320px screen, zooms full screen, and takes a note on the whole picture', async () => {
  const { url } = fixture(proposal.replace(`  ${fence}text\n  you ask\n     │\n  done\n  ${fence}`,
    `  ${fence}mermaid\n  flowchart LR\n    A[you ask] --> B[a plan] --> C[a review] --> D[the build] --> E[live]\n  ${fence}`));
  const { page, context, errors } = await open(url, { width: 320 });
  await page.locator('#item-1 summary').click();
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('#item-1 .art.pic')).fontSize) < 13);
  const fits = await page.evaluate(() => {
    const frame = document.querySelector('#item-1 .frame').getBoundingClientRect(), svg = document.querySelector('#item-1 .art.pic svg').getBoundingClientRect();
    return { inside: svg.left >= frame.left - 1 && svg.right <= frame.right + 1, page: document.documentElement.scrollWidth <= innerWidth, drawn: svg.height > 0 };
  });
  assert.deepEqual(fits, { inside: true, page: true, drawn: true });
  await page.locator('#item-1 .enlarge').click();
  const vframe = page.locator('#viewer .vframe');
  const width = () => vframe.evaluate(el => el.querySelector('svg').getBoundingClientRect().width);
  const fitted = await width();
  await page.locator('#viewer button[aria-label="Zoom in"]').click();
  assert.ok(await width() > fitted, 'zooming in grows the picture');
  await page.locator('#viewer [data-note="item-1-picture-1"]').click({ position: { x: 4, y: 4 } });
  await page.locator('#chip').click();
  assert.equal(await page.locator('#editor-where').innerText(), '#/1 · picture 1 "you ask a plan a review the build live"');
  await page.locator('#editor textarea').fill('Add a check step.');
  await page.locator('#editor [data-act="save"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#item-1 summary .count').innerText(), '· 1 note');
  assert.match(await copied(page), /^- Change #1, picture 1 \("you ask a plan a review the build live"\): Add a check step\.$/m);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('the page starts light on a dark device, and the switch turns it dark, readable, and remembered', async () => {
  const { url } = fixture();
  const { page, context, errors } = await open(url, { width: 390, scheme: 'dark' });
  const look = () => page.evaluate(() => {
    // A colour as sRGB through a canvas, whatever notation the browser reports it in.
    const ink = document.createElement('canvas').getContext('2d');
    const rgb = colour => { ink.clearRect(0, 0, 1, 1); ink.fillStyle = colour; ink.fillRect(0, 0, 1, 1); return [...ink.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = c => c.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((t, v, i) => t + v * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const css = sel => getComputedStyle(document.querySelector(sel));
    const pair = (text, back) => contrast(rgb(css(text).color), rgb(css(back).backgroundColor));
    return {
      body: lum(rgb(css('body').backgroundColor)), card: lum(rgb(css('.card').backgroundColor)), bar: lum(rgb(css('.bar').backgroundColor)),
      text: [pair('body', 'body'), pair('.card .text', '.card'), pair('.hint', 'body'), pair('#copy', '#copy'), pair('.frame .art', '.frame'), pair('.bar [data-ready="build"]', '.bar'), contrast(rgb(css('.theme-toggle').color), rgb(css('body').backgroundColor))],
    };
  });
  const readable = (seen, when) => seen.text.forEach((ratio, i) => assert.ok(ratio >= 4.5, `${when}: text ${i} contrast ${ratio.toFixed(2)} is under 4.5`));
  const toggle = page.locator('.theme-toggle');
  await page.locator('#item-1 summary').click();
  // A dark device with no saved choice: light, with a moon that offers dark.
  const light = await look();
  for (const surface of ['body', 'card', 'bar']) assert.ok(light[surface] > 0.8, `dark device: the ${surface} starts light`);
  readable(light, 'light');
  assert.equal(await toggle.getAttribute('aria-label'), 'Switch to dark');
  // Phone-sized: a 44px target in the top right that covers no header text.
  const fit = await page.evaluate(() => {
    const box = document.querySelector('.theme-toggle').getBoundingClientRect();
    const hits = [...document.querySelectorAll('header .eyebrow, header h1, header .muted, header .jump a')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
    }).map(el => el.textContent);
    return { width: box.width, height: box.height, right: innerWidth - box.right, hits };
  });
  assert.ok(fit.width >= 44 && fit.height >= 44, `the switch is ${fit.width}x${fit.height}`);
  assert.ok(fit.right <= 24, 'the switch sits at the right');
  assert.deepEqual(fit.hits, [], 'the switch covers no header text');
  await toggle.click();
  // Colours ease over 0.15s: read them once every transition has ended.
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
  const dark = await look();
  for (const surface of ['body', 'card', 'bar']) assert.ok(dark[surface] < 0.1, `after the switch: the ${surface} is dark`);
  readable(dark, 'dark');
  assert.equal(await toggle.getAttribute('aria-label'), 'Switch to light');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  // Remembered: a reload opens dark.
  await page.reload();
  await page.locator('#item-1 summary').click();
  const again = await look();
  for (const surface of ['body', 'card', 'bar']) assert.ok(again[surface] < 0.1, `after a reload: the ${surface} stays dark`);
  assert.equal(await page.locator('.theme-toggle').getAttribute('aria-label'), 'Switch to light');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('a sketch fits 320px, opens full screen, and repaints on the dark switch; a table row copies as its change and row', async () => {
  const { url } = fixture(proposal.replace(`  ${fence}text\n  you ask\n     │\n  done\n  ${fence}`, [
    `  ${fence}svg`, '  <svg viewBox="0 0 480 120">', '    <rect x="0" y="0" width="480" height="120" fill="card" stroke="line"/>',
    '    <rect x="16" y="16" width="200" height="24" fill="muted"/>', '    <text x="16" y="80">Notes</text>', '  </svg>', `  ${fence}`,
    '  | way | login |', '  |-----|-------|', '  | local | none |', '  | sync | needed |',
  ].join('\n')));
  const { page, context, errors } = await open(url, { width: 320 });
  await page.locator('#item-1 summary').click();
  // The fold's toggle event fits the sketch a moment after the click.
  await page.waitForFunction(() => document.querySelector('#item-1 .art.sketch').style.fontSize !== '');
  const fits = await page.evaluate(() => {
    const frame = document.querySelector('#item-1 .frame').getBoundingClientRect(), svg = document.querySelector('#item-1 .art.sketch svg').getBoundingClientRect();
    return { inside: svg.left >= frame.left - 1 && svg.right <= frame.right + 1, page: document.documentElement.scrollWidth <= innerWidth, drawn: svg.height > 0 };
  });
  assert.deepEqual(fits, { inside: true, page: true, drawn: true });
  const paint = () => page.evaluate(() => {
    const box = getComputedStyle(document.querySelector('#item-1 .art.sketch rect.f-card'));
    return { box: box.fill, text: getComputedStyle(document.querySelector('#item-1 .art.sketch text')).fill, ink: getComputedStyle(document.body).color };
  });
  const light = await paint();
  assert.equal(light.text, light.ink, 'a label takes the page\'s ink');
  await page.locator('.theme-toggle').click();
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
  const dark = await paint();
  assert.notEqual(dark.box, light.box, 'the box repaints on the switch');
  assert.equal(dark.text, dark.ink, 'a label follows the dark ink');
  await page.locator('#item-1 .enlarge').click();
  assert.equal(await page.locator('#viewer .art.sketch svg').count(), 1, 'the sketch opens full screen');
  await page.locator('#viewer [data-note="item-1-picture-1"]').click({ position: { x: 4, y: 4 } });
  await page.locator('#chip').click();
  assert.equal(await page.locator('#editor-where').innerText(), '#/1 · picture 1 "Notes"');
  await page.locator('#editor [data-act="discard"]').click();
  await page.keyboard.press('Escape');
  await page.locator('.add[data-open="item-1-row-2"]').click();
  await page.locator('#editor textarea').fill('Sync first.');
  await page.locator('#editor [data-act="save"]').click();
  assert.match(await copied(page), /^- Change #1, row 2 \("sync · needed"\): Sync first\.$/m);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'the table scrolls nothing sideways');
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('a phone screen fits 320px, a tap on its button places a note instead of pressing it, and it repaints on the dark switch', async () => {
  const { url } = fixture(proposal.replace(`  ${fence}text\n  you ask\n     │\n  done\n  ${fence}`, [
    `  ${fence}screen`, '  <div class="card col gap phone">', '    <div class="row gap"><h3>Notes</h3><span class="tag">3</span></div>', '    <div class="bar"></div>',
    '    <input type="text" placeholder="A question or a change">',
    '    <div class="row gap"><span class="grow"></span><button class="btn-ghost">Cancel</button><button class="btn-primary">Save</button></div>',
    '  </div>', `  ${fence}`,
  ].join('\n')));
  const { page, context, errors } = await open(url, { width: 320, touch: true });
  await page.locator('#item-1 summary').click();
  // The fold's toggle event fits the sketch a moment after the click.
  await page.waitForFunction(() => document.querySelector('#item-1 .art.screen').style.fontSize !== '');
  const fits = await page.evaluate(() => {
    const frame = document.querySelector('#item-1 .frame').getBoundingClientRect(), card = document.querySelector('#item-1 .art.screen .card').getBoundingClientRect();
    const save = document.querySelector('#item-1 .art.screen .btn-primary').getBoundingClientRect();
    return { inside: card.left >= frame.left - 1 && card.right <= frame.right + 1 && save.right <= card.right + 1, page: document.documentElement.scrollWidth <= innerWidth, drawn: card.height > 0 };
  });
  assert.deepEqual(fits, { inside: true, page: true, drawn: true });
  const paint = () => page.evaluate(() => {
    const css = sel => getComputedStyle(document.querySelector(`#item-1 .art.screen ${sel}`));
    return { card: css('.card').backgroundColor, save: css('.btn-primary').backgroundColor, bar: css('.sk-bar').height, footer: document.querySelectorAll('.bar').length };
  });
  const light = await paint();
  assert.ok(parseFloat(light.bar) > 0 && light.footer === 1, 'the gray bar draws in the sketch, apart from the page\'s footer');
  await page.locator('.theme-toggle').click();
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
  const dark = await paint();
  assert.notEqual(dark.card, light.card, 'the card repaints on the switch');
  assert.notEqual(dark.save, light.save, 'the button repaints on the switch');
  await page.locator('#item-1 .enlarge').click();
  const save = page.locator('#viewer .art.screen .btn-primary');
  const box = await save.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  assert.equal(await page.evaluate(() => document.activeElement.closest('.sk')), null, 'the button takes no focus');
  await page.locator('#chip').click();
  assert.equal(await page.locator('#editor-where').innerText(), '#/1 · picture 1 "Notes 3 Cancel Save"');
  await page.locator('#editor textarea').fill('Save on Enter too.');
  await page.locator('#editor [data-act="save"]').click();
  assert.match(await copied(page), /^- Change #1, picture 1 \("Notes 3 Cancel Save"\): Save on Enter too\.$/m);
  assert.deepEqual(errors, []);
  await context.close();
});

browserTest('in the inbox frame a section link scrolls the plan and never leaves it', async () => {
  const { dir } = fixture();
  const html = readFileSync(join(dir, 'review.html'), 'utf8');
  // The inbox seals the plan in a srcdoc frame, so a #why link resolves against the inbox's own address.
  const inbox = 'https://inbox.test/apps/inbox/?item=i1';
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true });
  await context.route('https://inbox.test/**', route => route.fulfill({ contentType: 'text/html', body:
    '<!doctype html><body style="margin:0"><iframe sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style="border:0;width:100vw;height:100vh"></iframe></body>' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(inbox);
  const holder = page.locator('iframe');
  await holder.evaluate((el, body) => new Promise(done => { el.onload = done; el.srcdoc = body; }), html);
  const frame = await (await holder.elementHandle()).contentFrame();
  const state = (id) => frame.evaluate(target => {
    const el = document.getElementById(target);
    const plan = location.href === 'about:srcdoc' && Boolean(document.querySelector('.jump'));
    return { plan, top: el ? Math.round(el.getBoundingClientRect().top) : null, moved: scrollY > 0 };
  }, id).catch(() => ({ plan: false }));
  // A navigation, if one starts, has landed by now.
  const settle = () => page.waitForTimeout(300);
  await frame.locator('.jump a', { hasText: 'Changes' }).tap();
  await settle();
  assert.deepEqual(await state('changes'), { plan: true, top: 8, moved: true }, 'the frame keeps the plan, scrolled to What Changes');
  const link = href => frame.evaluate(target => {
    const a = document.createElement('a'); a.href = target; a.textContent = target;
    document.getElementById('why').append(a); a.scrollIntoView(); a.click();
  }, href);
  await link('#/2');
  await settle();
  assert.deepEqual(await state('item-2'), { plan: true, top: 8, moved: true }, 'a #/2 route scrolls to its item');
  await link('#nowhere');
  await settle();
  assert.equal((await state('why')).plan, true, 'an unknown target keeps the plan');
  assert.deepEqual(errors, []);
  await context.close();
});

// ── a preview page: the built screens, live now beside the preview, with Send notes and Publish ──
// A small solid PNG, so the page shows a real picture.
function solidPng(width, height) {
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = bytes => { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 2;
  const rows = Buffer.alloc((width * 3 + 1) * height, 0x9c);
  for (let y = 0; y < height; y += 1) rows[y * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
function previewFixture() {
  const temp = mkdtempSync(join(tmpdir(), 'wong-review-'));
  const dir = join(temp, 'review-fixture-preview');
  mkdirSync(dir);
  temps.push(temp);
  writeFileSync(join(dir, 'live.png'), solidPng(390, 844));
  writeFileSync(join(dir, 'preview.png'), solidPng(390, 844));
  writeFileSync(join(dir, 'proposal.md'), `## Why\n\nBuilt: review-fixture. Look at each changed screen.\n\n## What Changes\n\n- **Inbox**\n  ${fence}picture\n  Live now: live.png\n  Preview: preview.png\n  ${fence}\n`);
  buildReview(dir, { requireCurrent: true, kind: 'preview' });
  return { dir, url: pathToFileURL(join(dir, 'review.html')).href };
}

browserTest('a preview page on a phone shows both pictures side by side, Send notes and Publish in one row, and publishes after its question', async () => {
  const { page, context, errors, acts } = await openLive({ make: previewFixture, actions: ['publish'], width: 320, height: 664 });
  await isLive(page);
  await ready(page, 'publish').waitFor();
  assert.equal(await page.locator('h1').innerText(), 'Built: look, then publish?');
  assert.deepEqual(await page.locator('.bar button:visible').allInnerTexts(), ['Send notes', 'Publish']);
  assert.deepEqual(await primary(page), ['copy'], 'Send notes stays primary');
  const tops = await page.evaluate(() => [document.getElementById('copy'), document.querySelector('[data-ready="publish"]')].map(el => el.getBoundingClientRect().top));
  assert.equal(tops[0], tops[1], 'one row');
  const look = await page.evaluate(() => {
    const [a, b] = [...document.querySelectorAll('.art.photo img')].map(img => img.getBoundingClientRect());
    return { view: innerWidth, page: document.documentElement.scrollWidth, a, b, loaded: [...document.images].every(img => img.complete && img.naturalWidth > 0) };
  });
  assert.ok(look.loaded, 'the pictures load from inside the page');
  assert.ok(look.page <= look.view, 'no sideways scroll on a phone');
  assert.equal(Math.round(look.a.top), Math.round(look.b.top), 'Live now and Preview sit side by side');
  assert.ok(look.a.width > 40 && look.b.right <= look.view, 'both fit the phone');
  // A tap on the picture in the full-screen view notes it, naming the picture and its labels.
  await page.locator('#item-1 .frame').click();
  await page.locator('#viewer [data-note="item-1-picture-1"]').click({ position: { x: 20, y: 20 } });
  await page.locator('#chip').click();
  assert.equal(await page.locator('#editor-where').innerText(), '#/1 · picture 1 "Live now · Preview"');
  await page.locator('#editor [data-act="close"]').click();
  await ready(page, 'publish').click();
  assert.equal(await page.locator('#ready-confirm').getAttribute('aria-label'), 'Publish? This goes live and can\'t be undone.');
  assert.deepEqual(acts(), [], 'nothing is sent before a yes');
  await ready(page, 'yes').click();
  await saysIs(page, 'Asked the chat to publish.');
  assert.deepEqual(acts(), [posted('publish')]);
  assert.deepEqual(errors, []);
  await context.close();
});
