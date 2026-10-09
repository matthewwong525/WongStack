import assert from 'node:assert/strict';
import test from 'node:test';
import { selectExecutable, selectHost, validateCapabilities, validateReceipt, normalizedReceipt, startupPrompt, paseoAdapter, unsupportedAdapter, paseoPreset } from '../../.agents/skills/schedule/scripts/lib/hosts.mjs';
import { binding, capabilities, NOW } from './fixtures/scheduled-work.mjs';

test('export, fixed invoice stop-check and narrow model-call scripts prefer deterministic steps', () => {
  for (const name of ['export', 'invoice reminder until paid', 'narrow summarization model call']) assert.equal(selectExecutable({ predictable: true, judgment: false, name }).type, 'script');
  assert.equal(selectExecutable({ predictable: false, judgment: true }).type, 'assistant');
  assert.equal(selectExecutable({ predictable: true, explicitAssistant: true }).type, 'assistant');
  assert.throws(() => selectExecutable({}), /Assess/);
});
test('Codex inside Paseo routes by enclosing host and unavailable hosts stay unsupported', () => {
  const available = [{ name: 'paseo', supported: true }, { name: 'codex', supported: false }];
  assert.equal(selectHost({ enclosing: 'paseo', model: 'codex', available }).name, 'paseo');
  assert.equal(selectHost({ preferred: 'claude', available }).supported, false);
  assert.equal(selectHost({ available }).name, 'paseo'); assert.equal(selectHost({}).supported, false);
});
test('readiness uses later execution evidence, not current tools; Claude cloud limits block adaptation', () => {
  assert.equal(validateCapabilities(capabilities(), { adaptive: true, outreach: true, questions: true, once: true }).futureVerified, true);
  for (const patch of [{ futureVerified: false }, { context: null }, { verifiedAt: null }, { freshSession: null }, { oneOff: false }, { update: false }, { stop: false }, { progressRead: false }, { nonOverlap: false }, { questionDelivery: false }, { context: { location: 'local' } }]) assert.throws(() => validateCapabilities(capabilities(patch), { adaptive: true, outreach: true, questions: true, once: true }));
  assert.equal(validateCapabilities(capabilities({ update: false, stop: false, context: { location: 'cloud' } })).recurrence, true);
});
test('receipts require exact host, action, identity and read-back evidence; startup never creates recursively', () => {
  const good = normalizedReceipt('paseo', 'pause', { id: 'job-1', status: 'paused' }, 'job-1'); assert.equal(validateReceipt(good, { host: 'paseo', action: 'pause', nativeId: 'job-1' }), good);
  for (const patch of [{ version: 99 }, { host: 'claude' }, { action: 'create' }, { nativeId: 'foreign' }, { outcome: 'success' }, { observation: null }]) assert.throws(() => validateReceipt({ ...good, ...patch }, { host: 'paseo', action: 'pause', nativeId: 'job-1' }));
  assert.equal(validateReceipt({ version: 1, host: 'codex', action: 'inspect', outcome: 'unsupported' }, { host: 'codex', action: 'inspect' }).outcome, 'unsupported');
  const prompt = startupPrompt(binding()); assert.ok(prompt.includes('schedule.mjs start')); assert.ok(prompt.includes('Approved revision')); assert.ok(!prompt.includes('/schedule create'));
});
function fakePaseo() {
  let rows = [], lost = false;
  const calls = [];
  const call = async args => {
    calls.push(args);
    const action = args[1], id = args[2], row = rows.find(each => each.id === id);
    if (action === 'ls') return structuredClone(rows);
    if (action === 'inspect') { if (!row) throw Error('missing'); return structuredClone(row); }
    if (action === 'create') {
      const value = flag => args[args.indexOf(flag) + 1];
      const created = { target: { config: { modeId: args.includes('--mode') ? value('--mode') : undefined } }, id: 'job-1', name: value('--name'), prompt: args[2], status: 'active', nextRunAt: '2026-10-10T10:00:00Z', runs: [], cadence: { type: 'cron', expression: args.includes('--cron') ? value('--cron') : paseoPreset(value('--every')), timezone: args.includes('--timezone') ? value('--timezone') : 'UTC' }, maxRuns: args.includes('--max-runs') ? Number(value('--max-runs')) : null, expiresAt: args.includes('--expires-in') ? new Date(NOW + Number.parseInt(value('--expires-in')) * 1000).toISOString() : null }; rows.push(created);
      if (lost) throw Error('lost create reply'); return structuredClone(created);
    }
    if (action === 'pause' || action === 'resume') row.status = action === 'pause' ? 'paused' : 'active';
    if (action === 'delete') rows = rows.filter(each => each.id !== id);
    if (action === 'run-once') row.runs.push({ id: 'run-new' });
    if (action === 'update') {
      if (args.includes('--prompt')) row.prompt = args[args.indexOf('--prompt') + 1];
      if (args.includes('--cron')) row.cadence = { type: 'cron', expression: args[args.indexOf('--cron') + 1], timezone: args[args.indexOf('--timezone') + 1] };
      if (args.includes('--expires-in')) row.expiresAt = new Date(NOW + Number.parseInt(args[args.indexOf('--expires-in') + 1]) * 1000).toISOString();
      if (args.includes('--no-max-runs')) row.maxRuns = null;
      if (args.includes('--every')) row.cadence = { type: 'cron', expression: paseoPreset(args[args.indexOf('--every') + 1]), timezone: 'UTC' };
    }
    if (lost) throw Error('lost response'); return row;
  };
  return { call, calls, get rows() { return rows; }, lose() { lost = true; } };
}
test('Paseo adapter public arguments and operation recovery preserve one stable identity', async () => {
  const fake = fakePaseo(), adapter = paseoAdapter({ call: fake.call, now: () => NOW });
  const first = await adapter.create(binding(), 'op-one'); assert.equal(first.outcome, 'verified');
  await adapter.create(binding(), 'op-one'); assert.equal(fake.calls.filter(args => args[1] === 'create').length, 1);
  const created = fake.calls.find(args => args[1] === 'create'); assert.ok(created.includes('--provider')); assert.ok(created.includes('/durable/primary')); assert.ok(created.includes('--expires-in'));
  assert.equal((await adapter.pause('job-1')).outcome, 'verified'); assert.equal((await adapter.resume('job-1')).outcome, 'verified');
  assert.equal((await adapter.run('job-1')).outcome, 'verified');
  assert.equal((await adapter.update('job-1', { prompt: 'new', timing: binding().timing })).outcome, 'verified');
  assert.equal((await adapter.update('job-1', { timing: { mode: 'recurring', every: '1h' } })).outcome, 'verified');
  fake.lose(); assert.equal((await adapter.pause('job-1')).outcome, 'verified'); assert.equal((await adapter.cancel('job-1')).outcome, 'verified'); assert.deepEqual(fake.rows, []);
});
test('selected execution mode is retained and mismatched read-back never verifies or duplicates creation', async () => {
  const b = binding(); b.execution.context.mode = 'full-access';
  const fake = fakePaseo(), adapter = paseoAdapter({ call: fake.call, now: () => NOW });
  assert.equal((await adapter.create(b, 'selected-mode')).outcome, 'verified');
  const args = fake.calls.find(args => args[1] === 'create');
  assert.equal(args[args.indexOf('--mode') + 1], 'full-access');
  fake.rows[0].target.config.modeId = 'auto';
  assert.equal((await adapter.create(b, 'selected-mode')).outcome, 'unknown');
  assert.equal(fake.calls.filter(args => args[1] === 'create').length, 1);
  const different = fakePaseo();
  const mismatch = paseoAdapter({ now: () => NOW, call: async args => {
    const row = await different.call(args);
    if (args[1] === 'inspect') row.target.config.modeId = 'auto';
    return row;
  } });
  assert.equal((await mismatch.create(b, 'different-mode')).outcome, 'unknown');
});
test('one-time public create has absolute due date, single-run cap and expiration guard', async () => {
  const fake = fakePaseo(), adapter = paseoAdapter({ call: fake.call, now: () => NOW });
  const b = binding({ timing: { mode: 'once', timezone: 'UTC', dueAt: '2026-10-10T13:30:00Z', expiresAt: '2026-10-10T13:31:00Z' } });
  fake.lose(); assert.equal((await adapter.create(b, 'op')).outcome, 'verified');
  const args = fake.calls.find(args => args[1] === 'create'); assert.equal(args[args.indexOf('--cron') + 1], '30 13 10 10 *'); assert.equal(args[args.indexOf('--max-runs') + 1], '1');
  await assert.rejects(adapter.create({ ...b, lifecycle: { published: false } }, 'other'), /Publish/);
  await assert.rejects(paseoAdapter({ call: fakePaseo().call, now: () => Date.parse('2027-01-01') }).create(b, 'other'), /already passed/);
});
test('uncertain native mutations and unavailable hosts never claim success', async () => {
  const adapter = paseoAdapter({ call: async args => { if (args[1] === 'ls') return []; throw Error('offline'); }, now: () => NOW });
  assert.equal((await adapter.create(binding(), 'op')).outcome, 'unknown');
  for (const action of ['pause', 'resume', 'cancel']) assert.equal((await adapter[action]('job-1')).outcome, action === 'cancel' ? 'verified' : 'unknown');
  const bad = paseoAdapter({ call: async args => args[1] === 'inspect' ? { id: 'job-1', status: 'active' } : undefined }); assert.equal((await bad.pause('job-1')).outcome, 'unknown');
  await assert.rejects(unsupportedAdapter('claude').inspect('job-1'), /No callable/);
});

test('adaptive rearm removes lifetime run cap and retains expiry rather than miscounting retained history', async () => {
  const fake = fakePaseo(), adapter = paseoAdapter({ call: fake.call, now: () => NOW }); await adapter.create(binding(), 'rearm');
  const timing = { mode: 'once', dueAt: '2026-10-10T10:00:00Z', expiresAt: '2026-10-10T10:01:00Z' };
  assert.equal((await adapter.update('job-1', { timing })).outcome, 'verified');
  const args = fake.calls.find(args => args[1] === 'update'); assert.ok(args.includes('--no-max-runs')); assert.ok(args.includes('--expires-in'));
});

test('Paseo refuses sub-minute absolute times before creating a job rather than firing early', async () => {
  const fake = fakePaseo(), adapter = paseoAdapter({ call: fake.call, now: () => NOW });
  await assert.rejects(adapter.create(binding({ timing: { mode: 'once', dueAt: '2026-10-10T10:00:01Z', expiresAt: '2026-10-10T10:01:00Z' } }), 'precision'), /minute precision/);
  assert.equal(fake.rows.length, 0);
});

test('every presets verify actual public cron receipts and reject unsupported intervals', () => {
  assert.equal(paseoPreset('5m'), '*/5 * * * *'); assert.equal(paseoPreset('2h'), '0 */2 * * *'); assert.equal(paseoPreset('1d'), '0 0 * * *');
  for (const every of ['30s', '90m', '7h', '2d', 'invalid']) assert.throws(() => paseoPreset(every));
});

test('one-off update refuses mismatched expiry or lifetime run-cap readback', async () => {
  for (const mismatch of [{ expiresAt: null }, { maxRuns: 1 }]) {
    const fake = fakePaseo();
    const adapter = paseoAdapter({ now: () => NOW, call: async args => {
      const result = await fake.call(args);
      if (args[1] === 'inspect' && fake.calls.some(call => call[1] === 'update')) return { ...result, ...mismatch };
      return result;
    } });
    await adapter.create(binding(), 'guard');
    assert.equal((await adapter.update('job-1', { timing: { mode: 'once', dueAt: '2026-10-10T10:00:00Z', expiresAt: '2026-10-10T10:01:00Z' } })).outcome, 'unknown');
  }
});
