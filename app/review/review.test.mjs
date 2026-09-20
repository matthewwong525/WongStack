import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../..');
const kit = readFileSync(join(root, '.agents/skills/plan/references/review-kit.html'), 'utf8');
const sync = join(root, '.agents/skills/save/scripts/sync-review-proposal.mjs');
const files = [];
let browser;

const proposal = `## Why

Reviewers need to read one complete change at a time.

## What Changes

- **Find orders quickly** with a full description that wraps onto another line and keeps \`reference\` text beside its picture.
  The full second sentence must remain visible. (review.html#/list/default/search)
- **Receive an order** with one action. (review.html#/detail/default/finish)
- **Follow a workflow** with cards and branches. (review.html#/receive-flow/after/new)
- **Read the rule** in a comparison. (review.html#/list-rule/added)
- **Review files** in a tree. (review.html#/files)
- **Keyboard focus** is a behavior-only change.
`;

function fixture(source = proposal, change = '') {
  const dir = mkdtempSync(join(tmpdir(), 'wong-review-'));
  files.push(dir);
  let html = kit;
  const start = html.indexOf('<!-- proposal:start -->');
  const end = html.indexOf('<!-- proposal:end -->', start);
  html = html.slice(0, start + '<!-- proposal:start -->'.length) + '\n' + source + '\n' + html.slice(end);
  html = html.replaceAll('CHANGE-NAME', change || 'review-fixture');
  const path = join(dir, 'review.html');
  writeFileSync(path, html);
  return { path, url: pathToFileURL(path).href };
}

async function open(url, width = 1200, initScript) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#panel h2').first().waitFor({ state: 'attached' });
  return { page, context };
}

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { if (browser) await browser.close(); files.forEach(path => rmSync(path, { recursive: true, force: true })); });

test('new kit shows the complete selected item and keeps local states in that item', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/list/default/search');
  assert.match(await page.locator('#item-title').innerText(), /full second sentence must remain visible/);
  assert.equal(await page.locator('.visual[data-active]').getAttribute('id'), 'list');
  assert.equal(await page.locator('#panel ol.changes li.on').count(), 1);
  await page.locator('#list a[href="#/list/empty/create"]').click();
  assert.equal(await page.locator('.visual[data-active]').getAttribute('id'), 'list');
  assert.match(await page.locator('#panel ol.changes li.on').innerText(), /Find orders/);
  assert.equal(await page.locator('#list .state-empty').getAttribute('data-on'), '');
  await page.goto(f.url + '#/list-rule/added');
  assert.equal(await page.locator('.visual[data-active]').getAttribute('id'), 'list-rule');
  assert.match(await page.locator('#item-title').innerText(), /Read the rule/);
  await context.close();
});

test('empty, invalid, and text-only entries have clear fallbacks', async () => {
  const empty = fixture('## Why\n\nNothing yet.\n\n## What Changes\n');
  const first = await open(empty.url);
  assert.match(await first.page.locator('#landing').innerText(), /No changes to review/);
  assert.equal(await first.page.locator('#prev').isDisabled(), true);
  await first.context.close();
  const f = fixture();
  const second = await open(f.url + '#/unknown/state');
  assert.equal(await second.page.locator('.visual[data-active]').getAttribute('id'), '_landing');
  await second.page.locator('#panel ol.changes li').last().click();
  assert.equal(await second.page.locator('.visual[data-active]').getAttribute('id'), '_text');
  assert.match(await second.page.locator('#item-title').innerText(), /Keyboard focus/);
  await second.context.close();
});

test('change navigation and step Details work while annotation is active', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new');
  await page.locator('#annotate').click();
  await page.locator('#receive-flow .state-after .flow-card summary').first().click();
  assert.equal(await page.locator('#receive-flow .state-after .flow-card details').first().getAttribute('open'), '');
  assert.equal(await page.locator('.popover').count(), 0);
  await page.locator('#receive-flow .state-after .flow-card h3').first().click();
  assert.equal(await page.locator('.popover').count(), 1);
  await page.locator('.popover .close').click();
  await page.getByRole('button', { name: 'branches', exact: true }).click();
  assert.match(page.url(), /#\/receive-flow\/branches/);
  assert.match(await page.locator('#panel ol.changes li.on').innerText(), /Follow a workflow/);
  await page.locator('#receive-flow .state-branches .flow-branch summary').first().click();
  assert.equal(await page.locator('.popover').count(), 0);
  await page.locator('#receive-flow .state-branches .flow-branch h3').first().click();
  assert.match(await page.locator('.popover .where').innerText(), /branch/);
  await page.locator('.popover .close').click();
  await page.locator('#panel ol.changes li').nth(1).click();
  assert.equal(await page.locator('.popover').count(), 0);
  assert.match(await page.locator('#item-title').innerText(), /Receive an order/);
  assert.equal(await page.locator('#annotate').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'item-title');
  await context.close();
});

test('annotation intercepts a mock product action while the action works in viewing mode', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/detail/default/finish');
  await page.locator('#annotate').click();
  await page.locator('#detail [data-local-state="loading"]').click();
  assert.equal(await page.locator('.popover').count(), 1);
  assert.match(page.url(), /#\/detail\/default\/finish/);
  await page.locator('.popover .close').click();
  await page.locator('#annotate').click();
  await page.locator('#detail [data-local-state="loading"]').click();
  assert.match(page.url(), /#\/detail\/loading/);
  await context.close();
});

test('drafts follow their original target, and copy includes saved notes only', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new');
  await page.locator('#annotate').click();
  await page.locator('#receive-flow .state-after [data-target-id="flow-search"] h3').click();
  await page.locator('.popover textarea').fill('Show who owns this step.');
  await page.locator('#panel ol.changes li').nth(1).click();
  assert.match(await page.locator('#panel ol.changes li').nth(2).innerText(), /1 draft/);
  await page.locator('#draftlist button').click();
  assert.equal(await page.locator('.popover textarea').inputValue(), 'Show who owns this step.');
  await page.locator('.popover .save').click();
  assert.equal(await page.locator('#draftlist button').count(), 0);
  await page.locator('#receive-flow .state-after [data-target-id="flow-receive"] h3').click();
  await page.locator('.popover textarea').fill('This stays a draft.');
  await page.locator('#copy').click();
  const copied = await page.locator('#copybuf').inputValue();
  assert.match(copied, /^\/continue review-fixture\nReview notes from review.html \(1\):/);
  assert.match(copied, /Show who owns this step/);
  assert.doesNotMatch(copied, /This stays a draft/);
  await page.reload();
  assert.equal(await page.locator('#draftlist button').count(), 1);
  await page.locator('#draftlist button').click();
  assert.equal(await page.locator('.popover textarea').inputValue(), 'This stays a draft.');
  await context.close();
});

test('state and target switches retain separate drafts', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new');
  await page.locator('#annotate').click();
  await page.locator('#receive-flow .state-after [data-target-id="flow-search"] h3').click();
  await page.locator('.popover textarea').fill('First state draft');
  await page.getByRole('button', { name: 'branches', exact: true }).click();
  assert.equal(await page.locator('.popover').count(), 0);
  await page.locator('#receive-flow .state-branches [data-target-id="branch-open"] h3').click();
  await page.locator('.popover textarea').fill('Second state draft');
  await page.locator('.popover .close').click();
  assert.equal(await page.locator('#draftlist button').count(), 2);
  await page.locator('#draftlist button').first().click();
  assert.equal(await page.locator('.popover textarea').inputValue(), 'First state draft');
  await context.close();
});

test('an unsaved edit preserves saved feedback, and Discard restores it', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new');
  await page.locator('#annotate').click();
  await page.locator('#receive-flow .state-after [data-target-id="flow-search"] h3').click();
  await page.locator('.popover textarea').fill('Original saved text');
  await page.locator('.popover .save').click();
  await page.locator('#notelist button').click();
  await page.locator('.popover textarea').fill('New unfinished text');
  await page.locator('#copy').click();
  assert.match(await page.locator('#copybuf').inputValue(), /Original saved text/);
  assert.doesNotMatch(await page.locator('#copybuf').inputValue(), /New unfinished text/);
  await page.locator('.popover .discard').click();
  await page.locator('#notelist button').click();
  assert.equal(await page.locator('.popover textarea').inputValue(), 'Original saved text');
  await context.close();
});

test('unavailable storage keeps session drafts and identifies their shorter lifetime', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new', 1200, () => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage refused'); } });
  });
  assert.equal(await page.locator('#storage-status').isVisible(), true);
  await page.locator('#annotate').click();
  await page.locator('#receive-flow .state-after [data-target-id="flow-search"] h3').click();
  await page.locator('.popover textarea').fill('Session draft');
  await page.locator('#panel ol.changes li').nth(1).click();
  assert.equal(await page.locator('#draftlist button').count(), 1);
  await page.locator('#draftlist button').click();
  assert.equal(await page.locator('.popover textarea').inputValue(), 'Session draft');
  await context.close();
});

test('moved draft target stays recoverable without attaching to another box', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new');
  await page.locator('#annotate').click();
  await page.locator('#receive-flow .state-after [data-target-id="flow-search"] h3').click();
  await page.locator('.popover textarea').fill('Keep this text');
  await page.locator('.popover .close').click();
  await page.evaluate(() => { document.querySelector('[data-target-id="flow-search"]').remove(); });
  await page.locator('#draftlist button').click();
  assert.match(await page.locator('.popover .status').first().innerText(), /target moved/);
  assert.equal(await page.locator('.popover textarea').inputValue(), 'Keep this text');
  await context.close();
});

test('phone and desktop layouts keep content in view and hide inactive comparison sections', async () => {
  const f = fixture(proposal.replace('full description', 'full description ' + 'long'.repeat(100)));
  const html = readFileSync(f.path, 'utf8').replace('class="visual diff-visual"', 'class="visual diff"');
  writeFileSync(f.path, html);
  for (const width of [320, 390, 760, 761, 1200]) {
    const { page, context } = await open(f.url + '#/receive-flow/branches', width);
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(dimensions.document <= dimensions.viewport, `horizontal overflow at ${width}px`);
    const cards = page.locator('#receive-flow .state-branches .flow-branch');
    assert.equal(await cards.count(), 3);
    const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
    if (width <= 760) assert.ok(second.y > first.y, `branches must stack at ${width}px`);
    if (width <= 760) await page.locator('#menu').click();
    await page.locator('#panel ol.changes li').first().click();
    const longTextWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(longTextWidth <= width, `long change text overflows at ${width}px`);
    if (width <= 760) await page.locator('#menu').click();
    await page.locator('#panel ol.changes li').last().click();
    assert.equal(await page.locator('.visual[data-active]').getAttribute('id'), '_text');
    assert.equal(await page.locator('#list-rule').evaluate(el => getComputedStyle(el).display), 'none');
    await context.close();
  }
});

test('phone editor stays reachable in a short viewport and a drag does not start a note', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new', 320);
  await page.setViewportSize({ width: 320, height: 500 });
  await page.locator('#tools-toggle').click();
  await page.locator('#annotate').click();
  const card = page.locator('#receive-flow .state-after [data-target-id="flow-search"]');
  await card.evaluate(el => {
    const start = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 200 });
    const moved = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 250 });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start] }));
    el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [moved] }));
  });
  await card.click();
  assert.equal(await page.locator('.popover').count(), 0);
  await card.click();
  const box = await page.locator('.popover').boundingBox();
  assert.ok(box.y + box.height <= 500, 'editor actions fit the visible phone area');
  const fontSize = await page.locator('.popover textarea').evaluate(el => getComputedStyle(el).fontSize);
  assert.ok(parseFloat(fontSize) >= 16);
  await context.close();
});

test('keyboard navigation leaves editor arrow keys alone', async () => {
  const f = fixture();
  const { page, context } = await open(f.url + '#/receive-flow/after/new');
  await page.locator('#panel ol.changes li').nth(1).focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#item-title').innerText(), /Receive an order/);
  await page.locator('#annotate').click();
  await page.locator('#detail [data-mark="finish"]').click();
  await page.locator('.popover textarea').fill('Cursor moves here');
  await page.locator('.popover textarea').press('ArrowRight');
  assert.match(await page.locator('#item-title').innerText(), /Receive an order/);
  await context.close();
});

test('proposal sync changes only the marked text in an older review file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-old-review-')); files.push(dir);
  const older = '<html><style>old-kit-style</style><script type="text/markdown"><!-- proposal:start -->old<!-- proposal:end --></script><script>oldKit()</script></html>';
  writeFileSync(join(dir, 'review.html'), older);
  writeFileSync(join(dir, 'proposal.md'), '## Why\n\nUpdated reason.\n\n## What Changes\n\n- New text.\n');
  execFileSync(process.execPath, [sync, dir]);
  const result = readFileSync(join(dir, 'review.html'), 'utf8');
  assert.match(result, /Updated reason/);
  assert.match(result, /<style>old-kit-style<\/style>/);
  assert.match(result, /<script>oldKit\(\)<\/script>/);
  assert.equal((result.match(/proposal:start/g) || []).length, 1);
});
