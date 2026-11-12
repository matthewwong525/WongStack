// Host receipts and the Paseo adapter kept for the move: every change is read back, and nothing uncertain passes.
import assert from 'node:assert/strict';
import test from 'node:test';
import { firstMessage, normalizedReceipt, paseoAdapter, selectHost, unsupportedAdapter, validateReceipt } from '../../.agents/skills/daily/skills/schedule/scripts/lib/hosts.mjs';

test('the app host wins when it answers; else the enclosing host, and an unknown one stays unsupported', () => {
  assert.equal(selectHost({ enclosing: 'paseo', available: [{ name: 'app', supported: true }, { name: 'paseo', supported: true }] }).name, 'app');
  assert.equal(selectHost({ enclosing: 'paseo', available: [{ name: 'app', supported: false }, { name: 'paseo', supported: true }] }).name, 'paseo');
  assert.equal(selectHost({ enclosing: 'codex', available: [] }).supported, false);
});

test('receipts need the exact host, action, identity and read-back evidence', () => {
  const good = normalizedReceipt('paseo', 'pause', { id: 'job-1', status: 'paused' }, 'job-1');
  assert.equal(validateReceipt(good, { host: 'paseo', action: 'pause', nativeId: 'job-1' }).outcome, 'verified');
  assert.throws(() => validateReceipt(good, { host: 'paseo', action: 'cancel', nativeId: 'job-1' }));
  assert.throws(() => validateReceipt(good, { host: 'paseo', action: 'pause', nativeId: 'job-2' }));
  assert.throws(() => validateReceipt({ ...good, observation: undefined }, { host: 'paseo', action: 'pause' }));
});

test('the first message is the instructions word for word, then a footer naming the run and its finish', () => {
  const schedule = { key: 'weekly-plan', name: 'Pay every invoice', instructions: '/news\nThen plan the week.', authority: { actions: ['email'], minIntervalMs: 3600e3 },
    until: 'The plan\nis done.' };
  const run = { id: '1'.repeat(32) };
  const message = firstMessage({ schedule, run, progress: { done: ['monday'] } });
  assert.ok(message.startsWith('/news\nThen plan the week.\n\n---\n'));
  assert.match(message, /^May do: email, at most once each 60 minutes; ask before any other step\.$/m);
  assert.match(message, /^Ends when: The plan is done\.$/m);
  assert.match(message, /^Progress: \{"done":\["monday"\]\}$/m);
  assert.match(message, /^When you stop: node \.agents\/skills\/daily\/skills\/schedule\/scripts\/schedule\.mjs finish --key weekly-plan --run 1{32} /m);
  assert.doesNotMatch(message, /invoice/, 'the name is not in the version, so it stays out');
  const bare = firstMessage({ schedule: { key: 'weekly-plan', instructions: 'Plan.' }, run });
  assert.match(bare, /^May do: read and draft only; /m);
  assert.match(bare, /^Progress: none yet$/m);
  assert.doesNotMatch(bare, /Ends when/);
  const sent = Array.from({ length: 60 }, (_, n) => `inv-${1000 + n}`), until = `${'Every invoice is paid '.repeat(30)}and the client signs off.`;
  const long = firstMessage({ schedule: { ...schedule, until }, run, progress: { sent } });
  assert.ok(long.includes(`Progress: ${JSON.stringify({ sent })}\n`), 'the chat saves over the whole progress, so it sees all of it');
  assert.ok(long.includes(`Ends when: ${until}\n`), 'the approved end is never cut');
  for (const bad of [{ schedule: { ...schedule, key: 'Weekly Plan' }, run }, { schedule, run: { id: 'x; rm -rf /' } }]) assert.throws(() => firstMessage(bad));
});

test('Paseo pause, resume and delete are read back; an uncertain answer is unknown, never retried', async () => {
  let rows = [{ id: 'job-1', status: 'active' }];
  const calls = [];
  const call = async args => {
    calls.push(args);
    if (args[1] === 'inspect') { const row = rows.find(each => each.id === args[2]); if (!row) throw new Error('gone'); return row; }
    if (args[1] === 'ls') return rows;
    if (args[1] === 'pause') rows[0].status = 'paused';
    if (args[1] === 'delete') { rows = []; throw new Error('lost answer'); }
    return {};
  };
  const paseo = paseoAdapter({ call });
  assert.equal((await paseo.pause('job-1')).outcome, 'verified');
  assert.equal((await paseo.resume('job-1')).outcome, 'unknown', 'a resume Paseo did not show is not claimed');
  assert.equal((await paseo.cancel('job-1')).outcome, 'verified', 'a lost delete answer is read back');
  assert.equal(calls.filter(args => args[1] === 'delete').length, 1);
  assert.equal((await paseo.pause('job-1')).outcome, 'unknown');
  await assert.rejects(unsupportedAdapter('codex').pause('x'), /No callable codex/);
});
