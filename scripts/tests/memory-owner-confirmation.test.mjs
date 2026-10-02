import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerCandidateFixture } from './fixtures/memory/owner-candidate.mjs';
import { inspectMemoryOwnerCandidate as inspect, confirmMemoryOwner as confirm } from '../../.agents/skills/memory/scripts/lib/owner-operator.mjs';
import { readMemorySetupStatus } from '../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { resolveMemoryHuman } from '../../.agents/skills/memory/worker/identity.mjs';

const denied = (promise, code) => assert.rejects(promise, error => error.code === code && error.message === code);
const count = (f, table) => f.db.prepare(`SELECT count(*) n FROM ${table}`).get().n;
const confirmInput = (f, candidate, review) => ({ installation: f.installation, candidateId: candidate.candidateId,
  confirmationId: review.confirmationId, comparisonCode: candidate.comparisonCode,
  confirmation: { targetReviewed: true, verifiedIdentityReviewed: true, codeMatched: true } });
async function fixture(t, options) {
  const f = await ownerCandidateFixture(t, options);
  f.candidate = await f.create((await f.csrf()).csrfToken);
  f.review = await inspect(f.operator, { installation: f.installation, candidateId: f.candidate.candidateId });
  f.input = confirmInput(f, f.candidate, f.review);
  const original = f.operator.cloudflare;
  f.confirmBatches = 0;
  // Intercept the actual callback, not a copied fixture property.
  f.operator.cloudflare = async (method, path, body) => {
    if (!body?.batch?.[0].sql.includes('INSERT INTO memory_owner_attempts')) return original(method, path, body);
    f.confirmBatches++;
    if (f.beforeBatch) await f.beforeBatch();
    if (!f.nonatomic) f.db.exec('BEGIN');
    try {
      for (const [index, statement] of body.batch.entries()) {
        if (index === f.failAt) throw new Error('private simulated interruption');
        if (index !== f.skipAt) f.db.prepare(statement.sql).run(...statement.params);
        if (f.afterStatement) f.afterStatement(index);
      }
      if (!f.nonatomic) f.db.exec('COMMIT');
    } catch (error) { if (!f.nonatomic) f.db.exec('ROLLBACK'); throw error; }
    if (f.loseResponse) throw new Error('private lost response');
    return body.batch.map(() => ({ success: true, results: [] }));
  };
  return f;
}

for (const standalone of [false, true]) test(`durable owner confirmation has one private outcome and no device (${standalone})`, async t => {
  const f = await fixture(t, { standalone });
  const again = await inspect(f.operator, { installation: f.installation, candidateId: f.candidate.candidateId });
  assert.equal(again.confirmationId, f.review.confirmationId); assert.equal(count(f, 'memory_owner_reviews'), 1);
  for (const key of ['subject', 'code_hash', 'comparisonCode', 'principalId']) assert.equal(Object.hasOwn(again, key), false);
  assert.equal(count(f, 'memory_principals'), 0);
  const result = await confirm(f.operator, f.input);
  assert.equal(result.memory.status, 'pending-device'); assert.equal(result.memory.reason, 'no-current-device');
  assert.equal(result.memory.action.operatorConfirmationRequired, false);
  for (const table of ['memory_principals', 'memory_identity_bindings', 'memory_memberships', 'memory_owner_attempts', 'memory_owner_completions']) assert.equal(count(f, table), 1, table);
  for (const table of ['memory_devices', 'memory_credentials']) assert.equal(count(f, table), 0);
  assert.equal(f.db.prepare('SELECT state FROM memory_installation').get().state, 'pending');
  assert.equal(f.db.prepare('SELECT state FROM memory_owner_reviews').get().state, 'consumed');
  const human = await resolveMemoryHuman(f.d1, f.installation.installationId, f.human);
  assert.equal(human.role, 'owner');
  assert.deepEqual(await confirm(f.operator, f.input), result); assert.equal(f.confirmBatches, 1);
  assert.throws(() => f.db.exec("UPDATE memory_owner_reviews SET state = 'pending', consumed_attempt_id = NULL"), /terminal transition/);
  assert.throws(() => f.db.exec('DELETE FROM memory_owner_attempts'), /explicit recovery/);
  assert.throws(() => f.db.exec('DELETE FROM memory_owner_completions'), /retained/);
  const audit = JSON.stringify(f.db.prepare("SELECT * FROM memory_audit WHERE action = 'owner-confirmed'").all());
  assert.ok(!audit.includes(f.candidate.comparisonCode)); assert.ok(!audit.includes(f.human.email));
});

test('confirmation rejects wrong code, receipt, target and missing explicit review before writing', async t => {
  const f = await fixture(t);
  const wrongCode = f.input.comparisonCode === 'AAAA-AAAA' ? 'BBBB-BBBB' : 'AAAA-AAAA';
  await denied(confirm(f.operator, { ...f.input, comparisonCode: wrongCode }), 'code-mismatch');
  await denied(confirm(f.operator, { ...f.input, confirmationId: 'x'.repeat(32) }), 'confirmation-required');
  await denied(confirm(f.operator, { ...f.input, installation: { ...f.installation, installationId: 'x'.repeat(32) } }), 'installation-conflict');
  await denied(confirm(f.operator, { ...f.input, confirmation: { ...f.input.confirmation, targetReviewed: false } }), 'confirmation-required');
  assert.equal(f.confirmBatches, 0); assert.equal(count(f, 'memory_principals'), 0);
});

test('changed claims, provider, intent, revision, deployment or human admission invalidate review', async t => {
  const changes = [
    [f => f.db.exec("UPDATE memory_login_candidates SET subject = 'other'"), 'confirmation-required'],
    [f => f.db.exec("UPDATE memory_owner_intents SET email = 'other@example.com'"), 'candidate-unavailable'],
    [f => f.db.exec("UPDATE memory_providers SET status = 'retired'"), 'candidate-unavailable'],
    [f => f.db.exec('UPDATE memory_installation SET auth_revision = auth_revision + 1'), 'confirmation-required'],
    [f => f.db.exec('UPDATE memory_installation_configuration SET pin_revision = pin_revision + 1'), 'confirmation-required'],
    [f => { f.workers.get(f.target.appWorkerName).policy.include.push({ email: { email: 'another@example.com' } }); }, 'confirmation-required'],
    [f => { f.workers.get(f.target.appWorkerName).policy.include = [{ email: { email: 'another@example.com' } }]; }, 'protection-unavailable'],
    [f => f.setBinding(f.target.appWorkerName, 'WORKSPACE_LOGIN', { type: 'plain_text', text: 'off' }), 'protection-unavailable'],
  ];
  for (const [mutate, code] of changes) {
    const f = await fixture(t); mutate(f);
    await denied(confirm(f.operator, f.input), code);
    assert.equal(f.confirmBatches, 0); assert.equal(count(f, 'memory_principals'), 0);
  }
});

test('expiry and revocation cannot reopen a review', async t => {
  for (const sql of ["UPDATE memory_owner_reviews SET state = 'expired'", "UPDATE memory_owner_reviews SET state = 'revoked'"]) {
    const f = await fixture(t); f.db.exec(sql);
    await denied(confirm(f.operator, f.input), 'confirmation-expired');
    await denied(inspect(f.operator, { installation: f.installation, candidateId: f.candidate.candidateId }), 'candidate-unavailable');
    assert.equal(count(f, 'memory_principals'), 0);
  }
  const f = await fixture(t);
  f.db.exec('UPDATE memory_login_candidates SET created_at = unixepoch() - 601, expires_at = unixepoch() - 1');
  await denied(confirm(f.operator, f.input), 'candidate-unavailable');
});

test('guard rechecks live DB state after preflight rather than trusting its snapshot', async t => {
  const f = await fixture(t);
  f.beforeBatch = () => f.db.exec('UPDATE memory_installation SET auth_revision = auth_revision + 1');
  await denied(confirm(f.operator, f.input), 'candidate-unavailable');
  assert.equal(count(f, 'memory_owner_attempts'), 0); assert.equal(count(f, 'memory_principals'), 0);
});

test('atomic interruptions roll back every meaningful confirmation stage', async t => {
  for (let failAt = 0; failAt < 11; failAt++) {
    const f = await fixture(t); f.failAt = failAt;
    await denied(confirm(f.operator, f.input), 'provider-unavailable');
    assert.equal(count(f, 'memory_owner_attempts'), 0);
    assert.equal(count(f, 'memory_principals'), 0);
    assert.equal(f.db.prepare('SELECT state FROM memory_owner_reviews').get().state, 'pending');
    assert.equal(f.db.prepare('SELECT state FROM memory_installation').get().state, 'pending');
    f.failAt = null;
    assert.equal((await confirm(f.operator, f.input)).memory.status, 'pending-device');
  }
});

test('nontransactional partial effects remain closed and retries never adopt incomplete ownership', async t => {
  for (let failAt = 1; failAt < 11; failAt++) {
    const f = await fixture(t); f.nonatomic = true; f.failAt = failAt;
    await denied(confirm(f.operator, f.input), 'confirmation-incomplete');
    assert.equal(count(f, 'memory_owner_attempts'), 1);
    const state = f.db.prepare('SELECT state FROM memory_installation').get().state;
    if (count(f, 'memory_principals')) assert.equal(state, 'maintenance');
    await assert.rejects(resolveMemoryHuman(f.d1, f.installation.installationId, f.human));
    const batches = f.confirmBatches; f.failAt = null;
    await denied(confirm(f.operator, f.input), 'confirmation-incomplete');
    assert.equal(f.confirmBatches, batches);
    const status = await readMemorySetupStatus(f.operator, { installation: f.installation });
    assert.notEqual(status.memory.status, 'ready');
    if (state === 'maintenance') assert.equal(status.memory.action, null);
  }
});

test('success envelopes with skipped barrier or completion steps never establish ownership', async t => {
  for (const skipAt of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const f = await fixture(t); f.nonatomic = true; f.skipAt = skipAt;
    await denied(confirm(f.operator, f.input), 'confirmation-incomplete');
    await assert.rejects(resolveMemoryHuman(f.d1, f.installation.installationId, f.human));
    if (skipAt === 1) assert.equal(count(f, 'memory_principals'), 0);
  }
});

test('lost response and identical concurrent attempts resolve one immutable outcome', async t => {
  const f = await fixture(t); f.loseResponse = true;
  assert.equal((await confirm(f.operator, f.input)).memory.status, 'pending-device');
  assert.equal((await confirm(f.operator, f.input)).memory.status, 'pending-device');
  assert.equal(f.confirmBatches, 1); assert.equal(count(f, 'memory_owner_completions'), 1);
  const g = await fixture(t);
  const results = await Promise.all([confirm(g.operator, g.input), confirm(g.operator, g.input)]);
  assert.equal(results.every(result => result.memory.status === 'pending-device'), true);
  assert.equal(count(g, 'memory_principals'), 1); assert.equal(count(g, 'memory_owner_completions'), 1);
});

test('competing verified subjects get one first owner, never two', async t => {
  const f = await fixture(t);
  const human = { ...f.human, subject: 'other-verified-subject' };
  const candidate = await f.create((await f.csrf({}, human)).csrfToken, {}, human);
  const review = await inspect(f.operator, { installation: f.installation, candidateId: candidate.candidateId });
  const results = await Promise.allSettled([confirm(f.operator, f.input), confirm(f.operator, confirmInput(f, candidate, review))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(count(f, 'memory_principals'), 1); assert.equal(count(f, 'memory_memberships'), 1);
});

test('completed retry does not resurrect removed membership or turn this machine ready', async t => {
  const f = await fixture(t); await confirm(f.operator, f.input);
  f.db.exec("UPDATE memory_memberships SET status = 'removed', revision = revision + 1");
  const result = await confirm(f.operator, f.input);
  assert.equal(result.memory.status, 'pending-owner');
  assert.equal(f.db.prepare('SELECT status FROM memory_memberships').get().status, 'removed');
  assert.equal(f.confirmBatches, 1); assert.equal(count(f, 'memory_devices'), 0);
});

test('a revision change inside a nontransactional attempt closes all later authority writes', async t => {
  const f = await fixture(t); f.nonatomic = true;
  f.afterStatement = index => { if (index === 1) f.db.exec('UPDATE memory_installation SET auth_revision = auth_revision + 1'); };
  await denied(confirm(f.operator, f.input), 'confirmation-incomplete');
  assert.equal(count(f, 'memory_principals'), 0);
  assert.equal(f.db.prepare('SELECT state FROM memory_installation').get().state, 'maintenance');
  assert.equal(count(f, 'memory_owner_completions'), 0);
});

test('inspection lost-response retry recovers the same pending durable receipt without authority', async t => {
  const f = await ownerCandidateFixture(t);
  const candidate = await f.create((await f.csrf()).csrfToken);
  const original = f.operator.cloudflare;
  f.operator.cloudflare = async (method, path, body) => {
    const result = await original(method, path, body);
    if (body?.batch?.[0].sql.includes('memory_owner_reviews')) throw new Error('private lost receipt response');
    return result;
  };
  const input = { installation: f.installation, candidateId: candidate.candidateId };
  const first = await inspect(f.operator, input);
  assert.equal((await inspect(f.operator, input)).confirmationId, first.confirmationId);
  assert.equal(count(f, 'memory_owner_reviews'), 1); assert.equal(count(f, 'memory_principals'), 0);
});

test('an elapsed receipt deadline cannot be extended by inspection or confirmation', async t => {
  const f = await fixture(t);
  const restore = f.db.prepare("SELECT sql FROM sqlite_master WHERE name = 'memory_owner_review_transition'").get().sql;
  // Advance just this disposable record's clock while retaining the runtime guard.
  f.db.exec('DROP TRIGGER memory_owner_review_transition; UPDATE memory_owner_reviews SET created_at = unixepoch() - 600, expires_at = unixepoch()');
  f.db.exec(restore);
  await denied(confirm(f.operator, f.input), 'confirmation-expired');
  await denied(inspect(f.operator, { installation: f.installation, candidateId: f.candidate.candidateId }), 'candidate-unavailable');
  assert.equal(f.confirmBatches, 0); assert.equal(count(f, 'memory_principals'), 0);
});
