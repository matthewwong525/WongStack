// The stand-in for the person in a practice errand: a script with a brief, never a model, so two runs
// answer the same question the same way. It answers the agent's questions by keyword from the brief,
// and works a hand-over link at phone size the documented way: listed fields through *Fill fields*,
// the embedded card box by tapping its spot on *Page* and typing in *Other typing*, then the page's own
// button. It finds a spot with `agent-browser get box` on the practice session, standing in for a
// person's eyes, and reads texted codes from the shop's phone endpoint.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readPhone } from './shop.mjs';

const run = promisify(execFile);
const sleep = ms => new Promise(done => setTimeout(done, ms));
export const PHONE = { width: 390, height: 844 };
export const AT_COMPUTER = "I'm at the computer you run on.";

const READY = /\bready\b|send (me )?(the |a )?link|i'?m here|go ahead/i;
const DECLINE = /not now|\bstop\b|cancel|\bno\b|don'?t|skip|later/i;
const AGREE = /^(yes|ok|okay|sure|go ahead|confirm|buy|pay|place|ready)\b/i;
const SPEND = /\b(pay|buy|order|purchase|place|check ?out|charge)\b/i;
const HANDOVER = /\blink\b|take over|hand (you )?(the browser )?over|log ?in|sign ?in|your turn/i;

/** The dollar amounts a question names, in cents. */
export function amounts(text) {
  return [...String(text).matchAll(/\$\s?(\d+(?:\.\d{1,2})?)/g)].map(match => Math.round(Number(match[1]) * 100));
}

/** The first brief rule whose `when` matches the text, or null. */
/** A brief pattern matched as whole words, so `ship` never matches *shipping*. */
export const words = pattern => new RegExp(`\\b(?:${pattern})\\b`, 'i');
const ruleFor = (brief, text) => (brief.rules ?? []).find(rule => words(rule.when).test(text)) ?? null;

/**
 * Picks an answer to one multiple-choice question: `{ answer, ready, matched, why }`, in this order: a
 * spend over the brief's limit gets *Stop*; a hand-over ask gets its *Ready* option (and the note that
 * the person is at this computer) when the brief allows a hand-over; the brief's rule picks; a spend
 * under the limit gets yes. With nothing matched the stand-in says *Not now*, which the grader sees.
 * The rules come before the spend so an offer of a substitute, which names a price, gets the brief's no.
 */
export function answerQuestion(brief, { question, options = [] }) {
  const labels = options.map(option => option.label ?? String(option));
  const find = pattern => labels.find(label => pattern.test(label));
  const readyOption = find(READY);
  const stop = find(DECLINE) ?? 'Stop';
  const total = Math.max(0, ...amounts(question), ...labels.flatMap(amounts));
  const spend = SPEND.test(question) && total && brief.payUnder !== undefined;
  if (spend && total > brief.payUnder * 100) return { answer: stop, ready: false, matched: true, why: `over the $${brief.payUnder} limit` };
  if (readyOption && (HANDOVER.test(question) || HANDOVER.test(labels.join(' ')) || /\bready\b/i.test(question))) {
    return brief.handOver
      ? { answer: `${readyOption} (${AT_COMPUTER})`, ready: true, matched: true, why: 'hand-over' }
      : { answer: stop, ready: false, matched: true, why: 'no hand-over in the brief' };
  }
  const rule = ruleFor(brief, `${question} ${labels.join(' ')}`);
  const picked = rule?.pick && find(words(rule.pick));
  if (picked) return { answer: picked, ready: false, matched: true, why: `rule ${rule.when}` };
  if (rule?.say) return { answer: rule.say, ready: false, matched: true, why: `rule ${rule.when}` };
  const yes = spend && find(AGREE);
  if (yes) return { answer: yes, ready: false, matched: true, why: 'under the limit' };
  return { answer: stop, ready: false, matched: false, why: 'nothing in the brief matched' };
}

/** The question sentences in a message, last first. */
const questionsIn = text => (String(text).match(/[^.!?\n]*\?/g) ?? []).map(part => part.trim()).filter(Boolean).reverse();

/**
 * The stand-in's next chat message after the agent's turn ends, or null to end the errand. `handOver`
 * is the result of a link it worked during that turn: it then says *done*, as the hand-over page asks.
 */
export function replyTo(brief, text, { handOver = null } = {}) {
  if (handOver) {
    return handOver.result === 'done'
      ? { text: 'Done. Continue.', ready: false, matched: true, why: 'hand-over finished' }
      : { text: `I couldn't finish on the link: ${handOver.reason ?? 'it stopped working'}.`, ready: false, matched: true, why: 'hand-over failed' };
  }
  const [question] = questionsIn(text);
  if (!question) return null;
  const total = Math.max(0, ...amounts(text));
  const spend = SPEND.test(question) && brief.payUnder !== undefined && total > 0;
  if (spend && total > brief.payUnder * 100) return { text: 'No, stop. That is more than I want to spend.', ready: false, matched: true, why: 'over the limit' };
  if (HANDOVER.test(question) || /\bready\b/i.test(question)) {
    return brief.handOver
      ? { text: `Ready, send the link. ${AT_COMPUTER}`, ready: true, matched: true, why: 'hand-over' }
      : { text: 'Not now.', ready: false, matched: true, why: 'no hand-over in the brief' };
  }
  const rule = ruleFor(brief, question);
  if (rule?.say) return { text: rule.say, ready: false, matched: true, why: `rule ${rule.when}` };
  if (spend) return { text: brief.handOver ? `Yes, go ahead. Ready, send the link. ${AT_COMPUTER}` : 'Yes, go ahead.', ready: Boolean(brief.handOver), matched: true, why: 'under the limit' };
  return { text: 'Not now. Stop here.', ready: false, matched: false, why: 'nothing in the brief matched' };
}

// ---------------------------------------------------------------------------
// The hand-over link

/** Runs agent-browser in the practice session; resolves to its JSON `data`, or null. */
async function browserData(env, args) {
  try {
    const { stdout } = await run('agent-browser', [...args, '--json'], { env, encoding: 'utf8', timeout: 15_000 });
    return JSON.parse(stdout).data ?? null;
  } catch {
    return null;
  }
}

const agentUrl = async env => (await browserData(env, ['get', 'url']))?.url ?? null;

/** Waits until `label` shows in the Fill fields list and returns its control's selector. */
async function listed(page, label, kind = 'input', waitMs = 12_000) {
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    const id = await page.evaluate(([text, tag]) => {
      const match = [...document.querySelectorAll('#fields label')].find(node => new RegExp(text, 'i').test(node.textContent));
      const control = match && document.getElementById(match.htmlFor);
      return control && control.localName === tag && !control.disabled ? control.id : null;
    }, [label, kind]);
    if (id) return `#${id}`;
    await sleep(300);
  }
  return null;
}

/** Shows one view on a phone: `page` or `fields`. */
async function show(page, view) {
  const tab = page.locator(view === 'page' ? '#page-tab' : '#fields-tab');
  if (await tab.isVisible()) await tab.click();
}

/** Types into a listed field, or ticks a listed box. */
async function fill(page, label, value) {
  await show(page, 'fields');
  const selector = await listed(page, label);
  if (!selector) return false;
  if (typeof value === 'boolean') await page.locator(selector).setChecked(value);
  else await page.locator(selector).fill(value);
  await sleep(400);
  return true;
}

/** Taps a listed button, such as *Pay* or *Sign in*. */
async function press(page, label) {
  await show(page, 'fields');
  const until = Date.now() + 12_000;
  while (Date.now() < until) {
    const button = page.locator('#fields .actions button', { hasText: new RegExp(label, 'i') }).first();
    if (await button.count() && await button.isEnabled()) {
      await button.click();
      return true;
    }
    await sleep(300);
  }
  return false;
}

/** The page-pixel box of a field inside the card frame, from the practice session's own view. */
async function cardFieldBox(env, name) {
  const frame = await browserData(env, ['get', 'box', '#card']);
  const refs = (await browserData(env, ['snapshot', '-i']))?.refs ?? {};
  const ref = Object.entries(refs).find(([, item]) => item.role === 'textbox' && new RegExp(name, 'i').test(item.name))?.[0];
  const inner = ref && await browserData(env, ['get', 'box', `@${ref}`]);
  if (!frame || !inner) return null;
  return { x: frame.x + 1 + inner.x + inner.width / 2, y: frame.y + 1 + inner.y + inner.height / 2 };
}

/** Taps a page-pixel spot on the live picture, panning the preview or swiping the site to reach it. */
async function tapSpot(page, env, find) {
  await show(page, 'page');
  for (let tries = 0; tries < 8; tries++) {
    const spot = await find();
    const view = await browserData(env, ['eval', 'JSON.stringify({ width: innerWidth, height: innerHeight })']);
    const size = view && JSON.parse(view.result ?? 'null');
    if (!spot || !size) return false;
    if (spot.y > size.height - 20 || spot.y < 20) {
      const stage = await page.locator('#stage').boundingBox();
      await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
      await page.mouse.wheel(0, spot.y < 20 ? -250 : 250);
      await sleep(700);
      continue;
    }
    const client = await page.evaluate(([point, width]) => {
      const canvas = document.querySelector('#view');
      const stage = document.querySelector('#stage');
      const ratio = canvas.width / width;
      const place = () => {
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
        const left = rect.left + (rect.width - canvas.width * scale) / 2;
        const top = rect.top + (rect.height - canvas.height * scale) / 2;
        return { x: left + point.x * ratio * scale, y: top + point.y * ratio * scale };
      };
      let at = place();
      const box = stage.getBoundingClientRect();
      if (at.y < box.top + 10 || at.y > box.bottom - 10) stage.scrollTop += at.y - (box.top + box.height / 2);
      if (at.x < box.left + 10 || at.x > box.right - 10) stage.scrollLeft += at.x - (box.left + box.width / 2);
      at = place();
      return at;
    }, [spot, size.width]);
    await page.touchscreen.tap(client.x, client.y);
    await sleep(500);
    return true;
  }
  return false;
}

/** Types into whatever field the last tap focused, through *Other typing*. */
async function otherTyping(page, text) {
  await show(page, 'fields');
  const details = page.locator('#other');
  if (!(await details.evaluate(node => node.open))) await page.locator('#other summary').click();
  const box = page.locator('#type');
  await box.fill('');
  await box.pressSequentially(text, { delay: 30 });
  await sleep(400);
}

/** The brief's card, typed into the card box's three fields. */
async function payByCard(page, env, card) {
  for (const [name, value] of [['card number', card.number], ['expiry', card.exp], ['cvc', card.cvc]]) {
    if (!(await tapSpot(page, env, () => cardFieldBox(env, name)))) return `could not find the ${name} box on the page`;
    await otherTyping(page, value);
  }
  return null;
}

/**
 * The steps a person takes on each practice-shop page, by its path. Each returns null when done, or
 * why it could not act.
 */
const STEPS = [
  [/^\/login$/, async ({ page, shop }) => ((await fill(page, '^email', shop.account.email)) && (await fill(page, '^password', shop.password)) && (await press(page, 'sign in')) ? null : 'no email, password, or Sign in on the list')],
  [/^\/login\/code$/, async ({ page, shop }) => ((await fill(page, '^code', await readPhone(shop, 'login'))) && (await press(page, 'continue')) ? null : 'no code box or Continue on the list')],
  [/^\/checkout$/, async ({ page, env, brief }) => {
    await fill(page, 'email', brief.email ?? 'sam@example.com');
    await fill(page, 'terms', true);
    const card = await payByCard(page, env, brief.card);
    if (card) return card;
    return (await press(page, '^pay')) ? null : 'no Pay button on the list';
  }],
  [/^\/bank$/, async ({ page, shop }) => ((await fill(page, 'code from your bank', await readPhone(shop, 'bank'))) && (await press(page, 'confirm')) ? null : 'no bank code box on the list')],
];

/**
 * Opens a hand-over link at phone size and works it like a person until the agent's page reaches the
 * brief's finish (`brief.finish`, a path pattern) or the link closes. Resolves to
 * `{ result: 'done'|'stuck'|'closed', reason?, steps }`; it never throws.
 */
export async function workHandOver(link, { brief, shop, env, launch, deadlineMs = 300_000, onStep = () => {} }) {
  const steps = [];
  const step = entry => { steps.push(entry); onStep(entry); };
  let browser = null;
  try {
    browser = await launch();
    const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(link);
    await page.waitForFunction(() => document.querySelector('#view')?.width > 0, null, { timeout: 30_000 });
    const finish = new RegExp(brief.finish ?? '^/order/');
    const tries = new Map();
    const until = Date.now() + deadlineMs;
    while (Date.now() < until) {
      const status = await page.locator('#status').textContent().catch(() => '');
      const address = await agentUrl(env);
      const path = address ? new URL(address).pathname : null;
      if (path && finish.test(path)) {
        step({ at: path, did: 'reached the finish' });
        await page.waitForFunction(() => /closed|return to (the )?chat|continue/i.test(document.querySelector('#status')?.textContent ?? ''), null, { timeout: 15_000 }).catch(() => {});
        return { result: 'done', steps };
      }
      if (/closed|expired|ended/i.test(status ?? '')) return { result: 'closed', reason: `the link closed on ${path}`, steps };
      const found = path && STEPS.find(([pattern]) => pattern.test(path));
      if (!found) return { result: 'stuck', reason: `nothing to do on ${path ?? 'an unknown page'}`, steps };
      const count = (tries.get(path) ?? 0) + 1;
      tries.set(path, count);
      if (count > 2) return { result: 'stuck', reason: `${path} did not move on after two tries`, steps };
      const why = await found[1]({ page, shop, env, brief });
      step({ at: path, did: why ? `stuck: ${why}` : 'filled and pressed' });
      if (why) return { result: 'stuck', reason: why, steps };
      const moved = Date.now() + 15_000;
      while (Date.now() < moved && (await agentUrl(env)) === address) await sleep(500);
    }
    return { result: 'stuck', reason: 'ran out of time', steps };
  } catch (error) {
    return { result: 'stuck', reason: error.message.split('\n')[0], steps };
  } finally {
    await browser?.close().catch(() => {});
  }
}
