import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The browsing page's session and browser-only rules. A practice run found agents following
// agent-browser's guide into a second session on the saved profile, which crashed on start, and
// fetching pages with curl, which skipped pictures and checks.
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const page = readFileSync(join(ROOT, 'wiki/development/browsing.md'), 'utf8');
const rule = name => page.split('\n').find(line => line.startsWith(`- **${name}`)) ?? '';

test('personal browsing names one session and rules out a new one on the saved profile', () => {
  const session = rule('One browser session.');
  assert.match(session, /`AGENT_BROWSER_SESSION` already names, else agent-browser's `default`, never a new one/);
  assert.match(session, /`agent-browser session id …`\) doesn't apply here/);
  assert.match(session, /only one browser can open the saved profile/);
  assert.match(session, /its own temporary profile/);
});

test('the scripts the page names read that same session', () => {
  const cloud = readFileSync(join(ROOT, '.agents/skills/browser/scripts/cloud-browser.mjs'), 'utf8');
  assert.match(cloud, /from = 'default'/, 'carry-in copies from the default session');
  const handOver = readFileSync(join(ROOT, '.agents/skills/hand-over/scripts/hand-over.mjs'), 'utf8');
  assert.doesNotMatch(handOver, /'--session'/, 'the hand-over link drives the inherited session');
});

test('changes to a website go through the browser; research and plain reads may skip it', () => {
  const browser = rule('Changes to a website go through the browser.');
  assert.match(browser, /Adding to a cart, sending a form, posting, or paying happens in agent-browser, never with `curl` or a fetch tool/);
  assert.match(browser, /A change made by direct request skips the pictures and the checks, and acts with nobody watching/);
  assert.match(browser, /Research and plain reads, such as a price or opening hours, may skip the browser/);
});

test('a page is checked before it is called blocked, and a hand-over stays open for a step only the person can give', () => {
  assert.match(page, /It runs this before calling any page blocked, even one a picture shows plainly as a check/);
  const submitting = rule('Submitting keeps the browser with you');
  assert.match(submitting, /Reaching the page the agent named always closes the link, even a checkout with a card box/);
  assert.match(submitting, /When the agent named a box to go away instead, the link stays open while the next page asks for something only you can give: a password, a code sent to you, or card details/);
  assert.match(page, /Once a box it waited on is gone, the link reads the kinds of the page's fields and the names of its embedded boxes, [^.]*never what's in them/);
});
