import assert from 'node:assert/strict';
import test from 'node:test';
import { executeRun, nextWake, readyToRun, authorize, answerQuestion, register, transitionRecord, migrate, archiveGoal, terminal, adopt } from '../../.agents/skills/schedule/scripts/lib/lifecycle.mjs';
import { item, binding, context, store, host, NOW, routine } from './fixtures/scheduled-work.mjs';
import { startupPrompt } from '../../.agents/skills/schedule/scripts/lib/hosts.mjs';

function services(overrides = {}) {
  return { store: store(), host: host(), async checkCompletion() { return { complete: false, evidence: 'synthetic://unpaid' }; }, async chooseStep() { return {}; }, ...overrides };
}
test('completion is checked before outreach and a paid goal stops only its owned trigger', async () => {
  let contacted = false;
  const s = services({ async checkCompletion() { return { complete: true, evidence: 'synthetic://paid' }; }, async chooseStep() { contacted = true; } });
  const result = await executeRun(item(), s, context);
  assert.equal(contacted, false); assert.equal(result.state, 'completed'); assert.equal(result.archivePending, true);
  assert.deepEqual(s.host.called, [['cancel', 'job-1']]); assert.equal((await s.store.read()).terminal.evidence, 'synthetic://paid');
  assert.equal((await executeRun(item(), s, context)).suppressed, true);
});
test('a failed cancel persists completion guard and cleanup pending, never another send', async () => {
  for (const cancel of [async () => ({ version: 1, host: 'paseo', action: 'cancel', nativeId: 'job-1', outcome: 'unknown' }), async () => { throw Error('network'); }]) {
    const s = services({ host: host({ cancel }), async checkCompletion() { return { complete: true, evidence: 'synthetic://paid' }; } });
    assert.equal((await executeRun(item(), s, context)).state, 'cleanup-pending');
    assert.equal((await executeRun(item(), s, context)).state, 'cleanup-pending');
  }
});
test('terminal crash window persists cleanup pending before native cancel can return', async () => {
  const state = store(), h = host(); const verifiedCancel = h.cancel;
  let finish, entered;
  const started = new Promise(resolve => { entered = resolve; });
  h.cancel = async id => { entered(); await new Promise(resolve => { finish = resolve; }); return verifiedCancel(id); };
  const closing = terminal(item(), { revision: binding().revision, generation: 1 }, state, h, 'completed', 'synthetic://done');
  await started;
  assert.equal((await state.read()).cleanupPending, true);
  const restarted = await executeRun(item(), services({ store: state, host: h, async chooseStep() { throw Error('must suppress'); } }), context);
  assert.equal(restarted.state, 'cleanup-pending'); assert.equal(restarted.suppressed, true);
  finish(); assert.equal((await closing).stopVerified, true); assert.equal((await state.read()).cleanupPending, false);
});
test('execution keeps its exclusive claim until the owned native stop finishes', async () => {
  const state = store(); let competingClaim;
  const h = host({ async cancel(id) { competingClaim = await state.claim('competitor'); return host().cancel(id); } });
  const result = await executeRun(item(), services({ store: state, host: h, async checkCompletion() { return { complete: true, evidence: 'synthetic://done' }; } }), context);
  assert.equal(result.state, 'completed'); assert.equal(competingClaim, false);
  assert.equal(await state.claim('after-stop'), true); await state.release('after-stop');
});
test('unverified completion evidence blocks outreach and missing completion adapter blocks', async () => {
  for (const completion of [null, { complete: false }, { complete: 'maybe' }]) {
    await assert.rejects(executeRun(item(), services({ async checkCompletion() { return completion; } }), context), /ambiguous/);
  }
  await assert.rejects(executeRun(item(), services({ checkCompletion: null }), context), /cannot be checked/);
});
test('scope rejects payments, calls, code publishing, unknown recipients and missing step IDs', () => {
  const b = binding();
  assert.equal(authorize(b, { type: 'email', recipient: 'recipient@example.test', channel: 'email', id: 'one' }).id, 'one');
  for (const action of [{ type: 'email', recipient: 'other', channel: 'email', id: 'one' }, { type: 'email' }, { type: 'refund', id: 'one' }]) assert.throws(() => authorize(b, action));
  for (const type of ['call', 'payment', 'publish-code', 'refund']) assert.throws(() => authorize({ ...b, authority: { actions: [type], recipients: [], channels: [] } }, { type, id: 'one' }), /separate/);
});
test('run guards reject revisions, foreign jobs, stale generations, disabled and expired work', () => {
  const good = item(); assert.equal(readyToRun(good, null, context).key, 'synthetic');
  for (const patch of [{ nativeId: 'other' }, { generation: 2 }, { publishedRevision: 'other' }]) assert.throws(() => readyToRun(good, null, { ...context, ...patch }));
  for (const state of ['registering', 'paused', 'cancelled', 'completed', 'superseded']) {
    const b = binding({ lifecycle: { state, published: true, publication: 'commit:1', evidence: 'synthetic://terminal', stopVerified: true } });
    assert.throws(() => readyToRun(item({ binding: b }), null, context));
  }
  assert.throws(() => readyToRun(good, { terminal: {} }, context), /closed/);
  assert.throws(() => readyToRun(good, { revision: 'old', generation: 1 }, context), /differs/);
  assert.throws(() => readyToRun(good, null, { ...context, now: Date.parse('2027-01-01') }), /expired/);
});
test('one-time dates cannot fire early, late or annually; observed success closes', async () => {
  const b = binding({ timing: { mode: 'once', timezone: 'UTC', dueAt: '2026-10-09T10:00:00Z', expiresAt: '2026-10-09T11:00:00Z', allowedLatenessMs: 60000 } });
  for (const offset of [-1, 60001]) assert.throws(() => readyToRun(item({ binding: b }), null, { ...context, now: NOW + offset }), /lateness/);
  assert.equal(readyToRun(item({ binding: b }), null, context).timing.mode, 'once');
  const s = services({ async chooseStep() { return { succeeded: true, evidence: 'synthetic://task-done' }; } });
  assert.equal((await executeRun(item({ binding: b }), s, context)).state, 'completed');
  await assert.rejects(executeRun(item({ binding: b }), services(), context), /exit alone/);
});
test('next wake obeys earliest/latest/expiry and overnight contact hours', () => {
  const b = binding(); assert.equal(nextWake(b, '2026-10-10T10:00:00Z', NOW), '2026-10-10T10:00:00.000Z');
  for (const time of ['nonsense', '2026-10-08T10:00:00Z', '2026-11-02T10:00:00Z']) assert.throws(() => nextWake(b, time, NOW));
  assert.throws(() => nextWake({ ...b, timing: { ...b.timing, earliest: '2026-10-11T10:00:00Z' } }, '2026-10-10T10:00:00Z', NOW), /earliest/);
  const hours = { ...b, timing: { ...b.timing, contactHours: { start: '09:00', end: '17:00' } } };
  assert.equal(nextWake(hours, '2026-10-10T10:00:00Z', NOW), '2026-10-10T10:00:00.000Z');
  assert.throws(() => nextWake(hours, '2026-10-10T18:00:00Z', NOW), /contact hours/);
  assert.equal(nextWake({ ...b, timing: { ...b.timing, contactHours: { start: '22:00', end: '05:00' } } }, '2026-10-10T03:00:00Z', NOW), '2026-10-10T03:00:00.000Z');
});
test('duplicate fires and uncertain sends never automatically send twice', async () => {
  const state = store(); await state.claim('other');
  await assert.rejects(executeRun(item(), services({ store: state }), context), /Another run/);
  const action = { type: 'email', recipient: 'recipient@example.test', channel: 'email', id: 'one', service: 'synthetic' };
  let sends = 0;
  const s = services({ async chooseStep() { return { action }; }, async performAction() { sends++; return { verified: true, reference: 'synthetic://sent' }; } });
  await executeRun(item(), s, context); await executeRun(item(), s, context); assert.equal(sends, 1);
  const ambiguous = services({ async chooseStep() { return { action }; }, async performAction() { return {}; } });
  await assert.rejects(executeRun(item(), ambiguous, context), /uncertain/);
  await assert.rejects(executeRun(item(), ambiguous, context), /inspect the service/);
  ambiguous.inspectAction = async () => ({ status: 'unknown' });
  await assert.rejects(executeRun(item(), ambiguous, context), /remains ambiguous/);
  ambiguous.inspectAction = async () => ({ status: 'sent', reference: 'synthetic://sent' });
  await executeRun(item(), ambiguous, context); assert.equal((await ambiguous.store.read()).receipts.length, 1);
  await ambiguous.store.write({ revision: binding().revision, generation: 1, receipts: [], uncertain: { id: 'one' } });
  ambiguous.inspectAction = async () => ({ status: 'not-sent' }); ambiguous.performAction = async () => ({ verified: true, reference: 'synthetic://new' });
  await executeRun(item(), ambiguous, context); assert.equal((await ambiguous.store.read()).receipts[0].receipt, 'synthetic://new');
});
test('one call suggestion persists and blocks follow-ups; no automatic call or timeout consent', async () => {
  let deliveries = 0;
  const s = services({ async chooseStep() { return { question: { id: 'q-1', deferredAction: 'draft-call' } }; }, async deliverQuestion() { deliveries++; return { verified: true }; } });
  assert.equal((await executeRun(item(), s, context)).state, 'waiting');
  assert.equal((await executeRun(item(), s, context)).questionId, 'q-1'); assert.equal(deliveries, 1);
  await assert.rejects(answerQuestion(s.store, { questionId: 'q-1', owner: 'customer', answer: 'yes' }), /identified owner/);
  await assert.rejects(answerQuestion(s.store, { questionId: 'q-1', owner: 'ada@example.test', answer: '' }), /Silence/);
  assert.equal((await answerQuestion(s.store, { questionId: 'q-1', owner: 'ada@example.test', answer: 'draft options' })).requiresResume, true);
  assert.equal((await s.store.read()).pendingQuestion, null); assert.equal(s.host.called.length, 0);
  const unavailable = services({ async chooseStep() { return { question: { id: 'q' } }; } });
  await assert.rejects(executeRun(item(), unavailable, context), /question surface/);
  unavailable.deliverQuestion = async () => ({ verified: false });
  assert.equal((await executeRun(item(), unavailable, context)).delivered, false);
});
test('adaptive timing retains continuation and read-back failures stay pending', async () => {
  const s = services({ async chooseStep() { return { nextAt: '2026-10-10T10:00:00Z' }; } });
  assert.equal((await executeRun(item(), s, context)).state, 'scheduled'); assert.ok((await s.store.read()).nextAt);
  s.host.update = async () => ({ version: 1, host: 'paseo', action: 'update', nativeId: 'job-1', outcome: 'unknown' });
  assert.equal((await executeRun(item(), s, context)).state, 'cleanup-pending');
});
test('adaptive questions retain bounded completion checks on the same trigger without duplicate outreach', async () => {
  let notifications = 0, actions = 0, complete = false;
  const s = services({
    async checkCompletion() { return { complete, evidence: complete ? 'synthetic://done' : 'synthetic://open' }; },
    async chooseStep({ progress, waiting }) {
      return { nextAt: waiting ? '2026-10-10T10:10:00Z' : '2026-10-10T10:05:00Z', ...(progress.lastAnswer ? {} : { question: { id: 'q-bounded', deferredAction: 'read' }, action: { type: 'read', id: 'must-wait' } }) };
    },
    async deliverQuestion() { notifications++; return { verified: true }; },
    async performAction() { actions++; return { verified: true, reference: 'synthetic://read' }; },
  });
  assert.equal((await executeRun(item(), s, context)).state, 'waiting');
  const later = { ...context, now: Date.parse('2026-10-10T10:05:00Z') };
  assert.equal((await executeRun(item(), s, later)).state, 'waiting');
  assert.equal(notifications, 1); assert.equal(actions, 0);
  const updates = s.host.called.filter(call => call[0] === 'update'); assert.equal(updates.length, 2); assert.ok(updates.every(call => call[1] === 'job-1')); assert.equal(updates[1][2].timing.dueAt, '2026-10-10T10:10:00.000Z');
  await answerQuestion(s.store, { questionId: 'q-bounded', owner: binding().owner, answer: 'continue read-only checks' });
  complete = true;
  assert.equal((await executeRun(item(), s, { ...context, now: Date.parse('2026-10-10T10:10:00Z') })).state, 'completed');
  assert.equal(actions, 0); assert.deepEqual(s.host.called.at(-1), ['cancel', 'job-1']);
});
test('question rearm uncertainty stays visible and suppresses deferred work', async () => {
  const s = services({ async chooseStep() { return { question: { id: 'q' }, nextAt: '2026-10-10T10:00:00Z' }; }, async deliverQuestion() { return { verified: true }; }, host: host({ async update() { throw Error('lost response'); } }) });
  assert.equal((await executeRun(item(), s, context)).state, 'cleanup-pending'); assert.equal((await s.store.read()).reschedulePending, true); assert.equal((await s.store.read()).pendingQuestion.id, 'q');
});
test('a successful ongoing routine remains scheduled without goal completion/archive', async () => {
  let checked = false;
  const s = services({ async checkCompletion() { checked = true; } });
  const row = item({ kind: 'routine', binding: binding({ timing: { mode: 'recurring', timezone: 'UTC', every: '1h', allowedLatenessMs: 0 } }) });
  assert.equal((await executeRun(row, s, context)).state, 'scheduled'); assert.equal(checked, false); assert.deepEqual(s.host.called, []);
});
test('registration recovery reuses one operation and does not pretend publication activation', async () => {
  const s = store(), h = host();
  const first = await register(item(), s, h, 'op-one'); assert.equal(first.state, 'registering');
  await register(item(), s, h, 'op-two'); assert.deepEqual(h.called, [['create', 'op-one'], ['inspect', 'job-1']]);
  await assert.rejects(register(item({ published: false }), s, h), /publication/);
});
test('explicit record transition preserves one native identity and leaves successor paused', async () => {
  const from = item({ kind: 'routine' }), to = item({ binding: binding({ execution: { ...binding().execution, generation: 2 } }) });
  const s = store({ receipts: [] }), h = host();
  const result = await transitionRecord(from, to, { approved: true, host: h, store: s });
  assert.equal(result.state, 'paused'); assert.equal(result.archivePredecessor, false); assert.equal((await s.read()).generation, 2);
  assert.deepEqual(h.called.find(call => call[0] === 'update'), ['update', to.binding.execution.nativeId, { prompt: startupPrompt(to.binding) }]);
  await assert.rejects(transitionRecord(from, to, { host: h, store: s }), /explicit/);
  await assert.rejects(transitionRecord(from, { ...to, binding: binding() }, { approved: true, host: h, store: s }), /successor/);
  await s.write({ pendingQuestion: {} }); await assert.rejects(transitionRecord(from, to, { approved: true, host: h, store: s }), /pending/);
});
test('migration verifies old pause before replacement and preserves unrelated jobs', async () => {
  const old = host(), replacement = host(), s = store();
  const moved = await migrate(old, 'job-1', replacement, binding(), s, { approved: true, operationId: 'move-1' });
  assert.equal(moved.state, 'binding-pending'); assert.deepEqual(old.called, [['inspect', 'job-1'], ['pause', 'job-1']]);
  assert.deepEqual(replacement.called, [['create', 'move-1']]);
  await assert.rejects(migrate(old, 'job-1', replacement, binding(), s), /explicit/);
  old.pause = async () => ({ outcome: 'unknown' });
  await assert.rejects(migrate(old, 'job-1', replacement, binding(), s, { approved: true }), /pause/);
});
test('terminal archive failures never restart a goal and require observed stop/evidence', async () => {
  const s = store({ terminal: { reason: 'completed', evidence: 'synthetic://paid' }, cleanupPending: false });
  const row = item({ binding: binding({ lifecycle: { state: 'completed', published: true, publication: 'commit:1', stopVerified: true, evidence: 'synthetic://paid' } }) });
  let options;
  assert.equal((await archiveGoal(row, s, async (_name, value) => { options = value; })).archived, true); assert.equal(options.skipSpecs, true);
  assert.equal((await archiveGoal(row, s, async () => { throw Error(); })).archivePending, true);
  await assert.rejects(archiveGoal({ ...row, kind: 'routine' }, s, async () => {}), /retained/);
  await assert.rejects(archiveGoal(item(), store(), async () => {}), /evidence/);
  await assert.rejects(terminal(item(), {}, s, host(), 'completed', ''), /evidence/);
});

test('explicit adoption retains existing identity and pauses before publishing a replacement prompt', async () => {
  const h = host(), s = store(); const result = await adopt(item(), h, s, 'job-1', { approved: true });
  assert.equal(result.nativeId, 'job-1'); assert.equal(result.requiredPromptRepair, true); assert.deepEqual(h.called, [['inspect', 'job-1'], ['pause', 'job-1']]);
  assert.equal((await s.read()).registration.nativeId, 'job-1'); await assert.rejects(adopt(item(), h, s, 'job-1'), /approval/);
});
test('denied progress access and missing future ownership prevent all actions', async () => {
  let action = false;
  const s = services({ store: { async claim() { return true; }, async read() { throw Error('denied progress'); }, async release() {} }, async chooseStep() { action = true; } });
  await assert.rejects(executeRun(item(), s, context), /denied progress/); assert.equal(action, false);
});

test('consecutive read-only routine actions need no outreach interval or contact window', async () => {
  const record = routine({ authority: { actions: ['read', 'draft'], recipients: [], channels: [] } });
  record.binding.timing.contactHours = { start: '23:00', end: '23:59' };
  const current = item({ kind: 'routine', binding: record.binding });
  let count = 0;
  const s = services({ async chooseStep() { return { action: { type: count ? 'draft' : 'read', id: 'read-' + count }, succeeded: true }; }, async performAction() { return { verified: true, reference: 'synthetic://' + count++ }; } });
  const run = { ...context, publishedRevision: record.binding.revision };
  assert.equal((await executeRun(current, s, run)).state, 'scheduled');
  assert.equal((await executeRun(current, s, { ...run, runId: 'second' })).state, 'scheduled');
  assert.equal(count, 2);
  assert.deepEqual((await s.store.read()).receipts.map(receipt => receipt.type), ['read', 'draft']);
});

test('adaptive work is blocked before actions if an update is not verified after session completion', async () => {
  const b = binding(); b.execution.capabilities.updateAfterRun = false;
  let acted = false;
  await assert.rejects(executeRun(item({ binding: b }), services({ async performAction() { acted = true; } }), context), /updateAfterRun/);
  assert.equal(acted, false);
  b.adaptive = false;
  await assert.rejects(executeRun(item({ binding: b }), services({ async chooseStep() { return { nextAt: '2026-10-10T10:00:00Z', action: { type: 'read', id: 'one' } }; }, async performAction() { acted = true; } }), context), /updateAfterRun/);
  assert.equal(acted, false);
});

test('reads do not delay a first contact, while a second contact still obeys the agreed interval', async () => {
  let step = 0, contacts = 0;
  const s = services({ async chooseStep() { const id = 'step-' + step++; return { action: step === 1 ? { type: 'read', id } : { type: 'email', id, recipient: 'recipient@example.test', channel: 'email' } }; }, async performAction(action) { if (action.type === 'email') contacts++; return { verified: true, reference: 'synthetic://' + step }; } });
  await executeRun(item(), s, context);
  await executeRun(item(), s, { ...context, runId: 'second' });
  await assert.rejects(executeRun(item(), s, { ...context, runId: 'third' }), /frequency/);
  assert.equal(contacts, 1);
});

test('verified completion still stops an existing goal when future adaptation is unavailable', async () => {
  const b = binding(); b.execution.capabilities.updateAfterRun = false;
  let selected = false;
  const result = await executeRun(item({ binding: b }), services({ async checkCompletion() { return { complete: true, evidence: 'synthetic://paid' }; }, async chooseStep() { selected = true; } }), context);
  assert.equal(result.state, 'completed'); assert.equal(result.stopVerified, true); assert.equal(selected, false);
});
