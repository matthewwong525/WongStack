import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { buildReview } from '../../.agents/skills/plan/scripts/build-review.mjs';

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
let browser;

function fixture(source = proposal) {
  const temp = mkdtempSync(join(tmpdir(), 'wong-review-'));
  const dir = join(temp, 'review-fixture');
  mkdirSync(dir);
  temps.push(temp);
  writeFileSync(join(dir, 'proposal.md'), source);
  buildReview(dir, { requireCurrent: true });
  return { dir, url: pathToFileURL(join(dir, 'review.html')).href };
}

async function open(url, { width = 1200, height = 800, init } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  return { page, context, errors };
}

const at = (page, id) => page.locator(`[data-note="${id}"]`);
async function tap(page, id) { await at(page, id).click({ position: { x: 4, y: 4 } }); }
async function draft(page, id, text) {
  await tap(page, id);
  await page.locator('#chip').click();
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

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { if (browser) await browser.close(); temps.forEach(path => rmSync(path, { recursive: true, force: true })); });

test('a still tap offers a note; a drag, a zoom button, and a link do not', async () => {
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
  await page.locator('#item-3 button[aria-label="Zoom in"]').click();
  assert.equal(await chip.isVisible(), false);
  await page.locator('#item-2 a').click();
  assert.equal(await chip.isVisible(), false);
  assert.match(page.url(), /#why$/);
  await tap(page, 'item-2');
  await chip.click();
  assert.equal(await page.locator('#editor-where').innerText(), '#/2 · item "Item two links the reason and wraps onto a second line."');
  assert.deepEqual(errors, []);
  await context.close();
});

test('saving adds a pin and a list entry, and Copy notes writes the /continue block', async () => {
  const { page, context } = await open(fixture().url);
  await note(page, 'why-1', 'Say who reads it.');
  await note(page, 'item-2', 'Name the reason.');
  await note(page, 'item-1-line-3', 'Show the end state.');
  await note(page, 'decision-2', 'Check this one.');
  assert.equal(await at(page, 'item-2').locator('.pin').innerText(), '2');
  assert.equal(await page.locator('#note-list .entry').count(), 4);
  assert.equal(await page.locator('.bar .note-count').innerText(), '4 notes');
  assert.equal(await copied(page), [
    '/continue review-fixture',
    'Review notes from review.html (4):',
    '1. #/why · paragraph 1 "Reviewers read the plan on a phone." — Say who reads it.',
    '2. #/2 · item "Item two links the reason and wraps onto a second line." — Name the reason.',
    '3. #/1 · drawing line 3 "done" — Show the end state.',
    '4. #/decisions/2 · decision "Assumed: forty columns, because phones are narrow." — Check this one.',
  ].join('\n'));
  await context.close();
});

test('drafts stay on their targets, survive a reload, and are never copied', async () => {
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
  assert.match(text, /\(1\):\n1\. .* — Saved$/);
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

test('refused storage keeps notes for the session and says so', async () => {
  const init = () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage refused'); } }); };
  const { page, context, errors } = await open(fixture().url, { init });
  assert.equal(await page.locator('.bar .session').isVisible(), true);
  await draft(page, 'item-2', 'Session draft');
  assert.equal(await page.locator('#editor .session').isVisible(), true);
  await page.locator('#editor [data-act="save"]').click();
  assert.equal(await at(page, 'item-2').locator('.pin').innerText(), '1');
  assert.match(await copied(page), /\(1\):\n1\. #\/2 .* — Session draft$/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a refresh keeps notes attached, and a note whose text changed shows as possibly moved', async () => {
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

test('a wide drawing fits, zooms past fit to pan, and returns to fit', async () => {
  const { page, context } = await open(fixture().url, { width: 390 });
  const frame = page.locator('#item-3 .frame');
  const fit = () => page.evaluate(() => {
    const frameBox = document.querySelector('#item-3 .frame').getBoundingClientRect();
    const art = document.querySelector('#item-3 .art');
    const box = art.getBoundingClientRect();
    return { scale: new DOMMatrix(getComputedStyle(art).transform).a, inside: box.left >= frameBox.left - 1 && box.right <= frameBox.right + 1 && box.bottom <= frameBox.bottom + 1 };
  });
  const start = await fit();
  assert.ok(start.scale < 1 && start.inside, JSON.stringify(start));
  assert.equal(await frame.evaluate(el => getComputedStyle(el).touchAction), 'pan-y');
  for (let i = 0; i < 3; i += 1) await page.locator('#item-3 button[aria-label="Zoom in"]').click();
  assert.equal(await frame.evaluate(el => getComputedStyle(el).touchAction), 'none');
  const transform = () => page.locator('#item-3 .art').evaluate(el => el.style.transform);
  const zoomed = await transform();
  const scrollY = await page.evaluate(() => window.scrollY);
  const box = await frame.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 20, { steps: 6 });
  await page.mouse.up();
  assert.notEqual(await transform(), zoomed);
  assert.equal(await page.evaluate(() => window.scrollY), scrollY);
  assert.equal(await page.locator('#chip').isVisible(), false);
  await page.locator('#item-3 .zoom button', { hasText: 'Fit' }).click();
  assert.deepEqual(await fit(), start);
  await frame.evaluate(el => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: r.left + 10, clientY: r.top + 10, bubbles: true, cancelable: true }));
  });
  assert.ok((await fit()).scale > start.scale);
  await context.close();
});

test('no width from 320px scrolls sideways, and the phone editor docks', async () => {
  const f = fixture();
  for (const width of [320, 390, 1200]) {
    const { page, context } = await open(f.url, { width });
    await page.locator('#item-3 button[aria-label="Zoom in"]').click();
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
  const desk = await open(f.url, { width: 1200 });
  await draft(desk.page, 'item-2', 'Beside it');
  const editor = await desk.page.locator('#editor').boundingBox(), target = await at(desk.page, 'item-2').boundingBox();
  const overlap = editor.x < target.x + target.width && target.x < editor.x + editor.width && editor.y < target.y + target.height && target.y < editor.y + editor.height;
  assert.equal(overlap, false);
  await desk.context.close();
});

test('#/3 scrolls to item 3, and a keyboard note returns focus to its target', async () => {
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
