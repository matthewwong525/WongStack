import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

browserTest('saving adds a pin and a list entry, and Copy notes writes a plain request to update the plan', async () => {
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
    'Update the plan review-fixture with these notes from the review page. Don\'t build yet.',
    '- Why, paragraph 1 ("Reviewers read the plan on a phone."): Say who reads it.',
    '- Change #2 ("Item two links the reason and wraps onto a second line."): Name the reason.',
    '- Change #1, drawing line 3 ("done"): Show the end state.',
    '- Decision #2 ("Assumed: forty columns, because phones are narrow."): Check this one.',
  ].join('\n'));
  await page.waitForFunction(() => document.getElementById('toast').textContent !== '');
  assert.equal(await page.locator('#toast').textContent(), 'Copied 4 notes. Paste them into chat to update the plan.');
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
  assert.equal(await page.locator('.bar .session').isVisible(), true);
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
