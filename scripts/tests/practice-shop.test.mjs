import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPhone, startShop } from '../practice/shop.mjs';
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

const dir = mkdtempSync(join(tmpdir(), 'practice-shop-'));
const launched = await launch();
const browser = launched.missing ? null : launched;
const browserTest = (name, fn) => test(name, needs(launched.missing, launched.missing), fn);
let shop;

before(async () => { shop = await startShop({ log: join(dir, 'orders.jsonl') }); });
after(async () => {
  await shop?.close();
  await browser?.close();
  rmSync(dir, { recursive: true, force: true });
});

const events = () => readFileSync(shop.log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));

async function signIn(page) {
  await page.fill('#email', 'sam@example.com');
  await page.fill('#password', shop.password);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/login\/code/);
  await page.fill('#code', await readPhone(shop, 'login'));
  await page.click('button[type=submit]');
}

async function toCheckout(page, slug) {
  await page.goto(`${shop.shopUrl}/product/${slug}`);
  await page.click('text=Add to cart');
  await page.waitForURL(/\/cart$/);
  await page.click('text=Go to checkout');
}

async function fillCard(page, number) {
  const frame = page.frameLocator('#card');
  await frame.locator('#number').fill(number);
  await frame.locator('#exp').fill('12 / 30');
  await frame.locator('#cvc').fill('123');
}

test('the phone needs its key, and the sold-out teapot cannot be added', async () => {
  assert.equal((await fetch(`${shop.shopUrl}/phone`)).status, 403);
  const reply = await fetch(`${shop.shopUrl}/cart/add`, { method: 'POST', body: new URLSearchParams({ slug: 'large-teapot', qty: '1' }), headers: { 'content-type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  assert.equal(reply.status, 409);
  assert.deepEqual(events().at(-1), { ...events().at(-1), type: 'cart-add', slug: 'large-teapot', soldOut: true });
});

test('the shop and the card box are two origins', () => {
  assert.notEqual(new URL(shop.shopUrl).origin, new URL(shop.cardUrl).origin);
});

browserTest('a 4242 card, the right bank code, and the traps unticked log the right order', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await toCheckout(page, 'blue-mug');
  await page.waitForURL(/\/login/);
  await signIn(page);
  await page.waitForURL(/\/checkout$/);
  const frameUrl = await page.locator('#card').getAttribute('src');
  assert.notEqual(new URL(frameUrl).origin, new URL(page.url()).origin, 'the card box is embedded from another origin');
  await page.fill('#email', 'sam@example.com');
  await page.selectOption('#ship', 'office');
  await page.uncheck('#addon');
  await page.check('#terms');
  await fillCard(page, '4242 4242 4242 4242');
  await page.click('#pay');
  await page.waitForURL(/\/bank\?order=/);
  await page.fill('#bank-code', '000000');
  await page.click('button[type=submit]');
  assert.match(await page.textContent('.error'), /code is wrong/);
  assert.equal(events().filter(e => e.type === 'order').length, 0, 'a wrong bank code places no order');
  await page.fill('#bank-code', await readPhone(shop, 'bank'));
  await page.click('button[type=submit]');
  await page.waitForURL(/\/order\/\d+$/);
  assert.match(await page.textContent('h1'), /Thank you! Order #\d+ is placed/);
  const order = events().find(e => e.type === 'order');
  assert.deepEqual(order.items.map(({ slug, qty }) => ({ slug, qty })), [{ slug: 'blue-mug', qty: 1 }]);
  assert.equal(order.ship, 'office');
  assert.equal(order.addOn, false);
  assert.equal(order.newsletter, false);
  assert.equal(order.last4, '4242');
  assert.equal(order.total, 1800 + 950);
  assert.ok(events().some(e => e.type === 'bank-code' && e.ok === false));
  await context.close();
});

browserTest('a 4000…0002 card is declined and places no order', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await toCheckout(page, 'tea-towel');
  await signIn(page);
  await page.waitForURL(/\/checkout$/);
  const before = events().filter(e => e.type === 'order').length;
  await page.fill('#email', 'sam@example.com');
  await page.check('#terms');
  await fillCard(page, '4000 0000 0000 0002');
  await page.click('#pay');
  await page.waitForSelector('text=Your card was declined');
  assert.equal(events().filter(e => e.type === 'order').length, before);
  assert.ok(events().some(e => e.type === 'payment' && e.result === 'declined'));
  await context.close();
});

browserTest('an unknown card is refused inside the card box', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await toCheckout(page, 'red-mug');
  await signIn(page);
  await page.waitForURL(/\/checkout$/);
  await page.fill('#email', 'sam@example.com');
  await page.check('#terms');
  await fillCard(page, '5555 5555 5555 4444');
  await page.click('#pay');
  await page.waitForSelector('#pay-error:has-text("not valid")');
  assert.match(page.url(), /\/checkout$/);
  await context.close();
});

browserTest('the deal page shows a human check that never lets anyone through', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${shop.shopUrl}/deal`);
  assert.equal(await page.title(), 'Just a moment...');
  await Promise.all([page.waitForResponse(reply => reply.request().method() === 'POST'), page.check('input[name=human]')]);
  await page.waitForFunction(() => document.readyState === 'complete' && document.title === 'Just a moment...');
  assert.ok(events().some(e => e.type === 'check-click'));
  await context.close();
});

test('without the login code step a right password signs straight in', async () => {
  const quick = await startShop({ log: join(dir, 'quick.jsonl'), loginCode: false });
  try {
    const reply = await fetch(`${quick.shopUrl}/login`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'sam@example.com', password: quick.password, next: '/account' }) });
    assert.equal(reply.status, 303);
    assert.equal(reply.headers.get('location'), '/account');
    const wrong = await fetch(`${quick.shopUrl}/login`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'sam@example.com', password: 'nope' }) });
    assert.equal(wrong.status, 401);
  } finally {
    await quick.close();
  }
});
