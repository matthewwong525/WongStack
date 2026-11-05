// Host receipts and the Paseo adapter kept for the move: every change is read back, and nothing uncertain passes.
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizedReceipt, paseoAdapter, selectHost, startupPrompt, unsupportedAdapter, validateReceipt } from '../../.agents/skills/schedule/scripts/lib/hosts.mjs';

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

test('the startup prompt names only a key, a run and a version', () => {
  const prompt = startupPrompt({ key: 'weekly-plan', run: '1'.repeat(32), version: 'a'.repeat(64) });
  assert.match(prompt, /schedule\.mjs start --key weekly-plan --run 1{32} --version a{64}\./);
  for (const bad of [{ key: 'Weekly Plan' }, { run: 'run-1' }, { version: 'abc' }]) {
    assert.throws(() => startupPrompt({ key: 'weekly-plan', run: '1'.repeat(32), version: 'a'.repeat(64), ...bad }));
  }
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
