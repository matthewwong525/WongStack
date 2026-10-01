import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AT_COMPUTER, answerQuestion, replyTo, workHandOver } from '../practice/person.mjs';
import { loadErrands, phoneBrowser, sh } from '../practice/run.mjs';
import { startShop } from '../practice/shop.mjs';
import { readLines } from '../practice/grade.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const HAND_OVER = join(ROOT, '.agents/skills/hand-over/scripts/hand-over.mjs');
const [mug] = loadErrands();

test('a hand-over question gets Ready, and the note that the person is at this computer', () => {
  const picked = answerQuestion(mug.brief, { question: 'I need you to enter your card. Ready?', options: [{ label: 'Ready, send the link' }, { label: 'Not now' }] });
  assert.equal(picked.answer, `Ready, send the link (${AT_COMPUTER})`);
  assert.equal(picked.ready, true);
});

test('a choice is answered from the brief', () => {
  const picked = answerQuestion(mug.brief, { question: 'Where should it ship?', options: [{ label: 'Home: 12 Elm Street' }, { label: 'Office: 400 King Street West' }] });
  assert.equal(picked.answer, 'Office: 400 King Street West');
  const plan = answerQuestion(mug.brief, { question: 'Keep the protection plan?', options: [{ label: 'Keep it' }, { label: 'No, remove it' }] });
  assert.equal(plan.answer, 'No, remove it');
});

test('an unmatched question gets Not now, marked unmatched', () => {
  const picked = answerQuestion(mug.brief, { question: 'Which font do you like?', options: [{ label: 'Serif' }, { label: 'Not now' }] });
  assert.deepEqual([picked.answer, picked.matched], ['Not now', false]);
  assert.equal(replyTo(mug.brief, 'Which font do you like?').text, 'Not now. Stop here.');
});

test('a spend over the brief\'s limit is refused; under it, the person is ready', () => {
  assert.equal(answerQuestion(mug.brief, { question: 'Pay $75.00 for the mug?', options: [{ label: 'Pay now' }, { label: 'Stop' }] }).answer, 'Stop');
  assert.equal(replyTo(mug.brief, 'The total is $75.00. Ready to pay?').text, 'No, stop. That is more than I want to spend.');
  assert.match(replyTo(mug.brief, 'The total is $27.50. Ready to pay?').text, /^Ready, send the link/);
  assert.equal(replyTo(mug.brief, 'The total is $27.50. Shall I place the order?').text, 'Yes, go ahead. Ready, send the link. I\'m at the computer you run on.');
});

// The two misreads the first practice run found, each in the agent's own words.
const teapot = loadErrands().find(errand => errand.name === 'sold-out');

test('an offer of a substitute gets the brief\'s no, though it names a price under the limit', () => {
  const text = 'The **small teapot ($32, serves fewer)** is in stock.\n\nWant me to order the small teapot, keep an eye on the large one\'s page for a restock, or leave it?';
  assert.equal(replyTo(teapot.brief, text).text, 'No, only the large one.');
  assert.equal(answerQuestion(teapot.brief, { question: 'Order the small teapot instead for $32?', options: [{ label: 'Yes, order it' }, { label: 'No, skip it' }] }).answer, 'No, skip it');
});

test('a brief\'s words match whole words: a shipping confirmation is not an address question', () => {
  assert.equal(replyTo(mug.brief, 'Order #2001 is placed.\n\nWant me to watch for the shipping confirmation?').text, 'No, that\'s all.');
  assert.equal(replyTo(mug.brief, 'Where should I ship it?').text, 'My office, 400 King Street West.');
});

test('a finished hand-over is answered with done; a turn with no question ends the errand', () => {
  assert.equal(replyTo(mug.brief, 'Tell me when you are done.', { handOver: { result: 'done' } }).text, 'Done. Continue.');
  assert.match(replyTo(mug.brief, '', { handOver: { result: 'stuck', reason: 'no Pay button' } }).text, /no Pay button/);
  assert.equal(replyTo(mug.brief, 'Your mug is ordered.'), null);
});

// A real local hand-over on the practice shop: agent-browser drives the agent's side and the stand-in
// works the link in Chromium at phone size. Its own HOME keeps the hand-over state, the browser
// sessions, and the profile off this computer's. CI installs no agent-browser, so there it skips.
const chrome = [join(homedir(), '.agent-browser', 'browsers')].flatMap(dir => (existsSync(dir) ? readdirSync(dir).filter(name => name.startsWith('chrome-')).sort().reverse().map(name => join(dir, name, 'chrome')) : [])).find(existsSync);
let agentBrowser = true;
try { execFileSync('agent-browser', ['--version'], { stdio: 'ignore' }); } catch { agentBrowser = false; }
const missing = !agentBrowser ? 'agent-browser is not installed' : !chrome ? 'agent-browser has no Chrome' : null;

const home = mkdtempSync(join(tmpdir(), 'practice-person-'));
let shop;
let env;
before(async () => {
  shop = await startShop({ log: join(home, 'orders.jsonl'), loginCode: false });
  const base = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PASEO_|AGENT_BROWSER_)/.test(key)));
  env = { ...base, HOME: home, AGENT_BROWSER_EXECUTABLE_PATH: chrome ?? '', AGENT_BROWSER_NAMESPACE: 'practice-test', AGENT_BROWSER_SESSION: 'practice-test', AGENT_BROWSER_PROFILE: join(home, 'profile'), HANDOVER_POLL_MS: '500' };
});
after(async () => {
  if (!missing) {
    await sh('node', [HAND_OVER, 'close'], { env, cwd: ROOT });
    await sh('agent-browser', ['--session', 'practice-test', 'close'], { env });
  }
  await shop?.close();
  rmSync(home, { recursive: true, force: true });
});

test('the stand-in pays through one real hand-over link: card box, Pay, and the bank code after the finish', { skip: missing ?? false, timeout: 240_000 }, async () => {
  const browse = async (...args) => {
    const done = await sh('agent-browser', args, { env, timeoutMs: 60_000 });
    assert.equal(done.code, 0, `agent-browser ${args.join(' ')}: ${done.stderr}`);
  };
  await browse('open', `${shop.shopUrl}/login?next=/product/blue-mug`);
  await browse('fill', '#email', shop.account.email);
  await browse('fill', '#password', shop.password);
  await browse('click', 'button[type=submit]');
  await browse('wait', '--url', '**/product/blue-mug');
  await browse('click', 'form[action="/cart/add"] button');
  await browse('wait', '--url', '**/cart');
  await browse('open', `${shop.shopUrl}/checkout`);
  await browse('uncheck', '#addon');
  await browse('select', '#ship', 'office');

  // The finish is the card box going away, as agents choose: the bank code step after it must still come
  // through the same link, because the page then asks for a code only the person has.
  const opened = await sh('node', [HAND_OVER, 'open', '--local', '--until-gone', '#card'], { env, cwd: ROOT, timeoutMs: 60_000 });
  const link = /HANDOVER_LINK=(\S+)/.exec(opened.stdout)?.[1];
  assert.ok(link, `no link: ${opened.stdout}${opened.stderr}`);
  const steps = [];
  const result = await workHandOver(link, { brief: mug.brief, shop, env, launch: phoneBrowser, deadlineMs: 150_000, onStep: step => steps.push(step) });
  assert.equal(result.result, 'done', `${result.reason}: ${JSON.stringify(steps)}`);
  assert.deepEqual(steps.map(step => step.at), ['/checkout', '/bank', `/order/${readLines(shop.log).find(event => event.type === 'order')?.id}`]);
  const order = readLines(shop.log).find(event => event.type === 'order');
  assert.equal(order.last4, '4242');
  assert.equal(order.ship, 'office');
  assert.equal(order.addOn, false);
  assert.equal(order.email, 'sam@example.com');
});

test('a publish question gets Not now, before the address rule can answer it', () => {
  assert.equal(replyTo(mug.brief, 'Saved your office on your page.\n\nPublish the office-address note?').text, 'Not now.');
  assert.equal(answerQuestion(mug.brief, { question: 'Publish the office-address note?', options: [{ label: 'Publish it' }, { label: 'Not now' }] }).answer, 'Not now');
  assert.equal(mug.brief.rules.findIndex(rule => rule.when.includes('publish')) < mug.brief.rules.findIndex(rule => rule.when.includes('address')), true);
});
