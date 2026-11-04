// The lines the person reads while a site pays or signs in: counting, late after a minute, and how it ended.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ending, stepText } from '../../.agents/skills/hand-over/scripts/form-page.mjs';
import { signingText } from '../../.agents/skills/hand-over/scripts/passwords-page.mjs';
import { liveLine } from '../../.agents/skills/hand-over/scripts/view-page.mjs';

test('a press with no view counts up beside the site, then says not to pay again', () => {
  assert.equal(stepText('typing', 'Pay', { site: 'DigiKey' }), 'Typing your details…');
  assert.equal(stepText('waiting', 'Pay', { site: 'DigiKey', seconds: 12 }), 'Paying DigiKey · 12 s');
  assert.equal(stepText('pressing', 'Pay', { site: 'DigiKey', seconds: 60 }), 'DigiKey hasn\'t finished. Don\'t pay again unless it shows an error.');
  assert.equal(stepText('pressing', 'Pay'), 'Pressing Pay…');
});

test('a changed page says nothing was sent; an unfinished send says not to pay again', () => {
  assert.equal(ending({ result: 'not-accepted', reason: 'page-changed' }, 'DigiKey').title, 'DigiKey\'s page changed. Nothing was sent.');
  const late = ending({ result: 'unconfirmed' }, 'DigiKey');
  assert.equal(late.title, 'DigiKey hasn\'t finished');
  assert.match(late.hint, /Don't pay again/);
});

test('the live line counts, goes late after the wait, and says how it ended', () => {
  const pay = { site: 'DigiKey', kind: 'pay' };
  assert.equal(liveLine(pay, 7, 60), 'Paying DigiKey · 7 s');
  assert.equal(liveLine(pay, 61, 60), 'DigiKey hasn\'t finished. Don\'t pay again unless it shows an error.');
  assert.equal(liveLine(pay, 61, 60, { result: 'done' }), 'DigiKey accepted. Done.');
  assert.equal(liveLine(pay, 61, 60, null), 'Closed. Your chat will say how it went.');
  const signIn = { site: 'netflix.com', kind: 'sign-in' };
  assert.equal(liveLine(signIn, 3, 60), 'Signing in to netflix.com · 3 s');
  assert.equal(liveLine(signIn, 3, 60, { result: 'done' }), 'Signed in to netflix.com. Done.');
});

test('a sign-in with no view counts, then hands over to the chat', () => {
  assert.equal(signingText('netflix.com', 4), 'Signing in to netflix.com · 4 s');
  assert.match(signingText('netflix.com', 60), /hasn't finished signing in/);
});
