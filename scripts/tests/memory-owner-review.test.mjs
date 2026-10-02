import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerCandidateFixture } from './fixtures/memory/owner-candidate.mjs';
import { confirmFixtureOwner } from './fixtures/memory/operator.mjs';
import { readMemoryOwnerReview } from '../../.agents/skills/memory/scripts/lib/owner-review.mjs';
import { validateMemoryOwnerConfirmation } from '../../.agents/skills/memory/scripts/lib/owner-confirmation-input.mjs';
import { MemoryOperatorError } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';

const denied = (promise, code) => assert.rejects(promise, error => error instanceof MemoryOperatorError && error.code === code && error.message === code);
const invalid = (input, code = 'invalid-input') => assert.throws(() => validateMemoryOwnerConfirmation(input), error => error instanceof MemoryOperatorError && error.code === code && error.message === code);
const confirmation = f => ({ installation: { ...f.installation }, candidateId: f.candidate.candidateId,
  confirmationId: 'synthetic-review-receipt'.padEnd(32, '0'), comparisonCode: f.candidate.comparisonCode,
  confirmation: { targetReviewed: true, verifiedIdentityReviewed: true, codeMatched: true } });
const snapshot = f => Object.fromEntries(['memory_installation', 'memory_installation_configuration', 'memory_owner_intents',
  'memory_login_candidates', 'memory_principals', 'memory_identity_bindings', 'memory_memberships', 'memory_devices', 'memory_credentials', 'memory_audit']
  .map(table => [table, f.db.prepare(`SELECT * FROM ${table}`).all().map(row => ({ ...row }))]));

async function fixture(t, options) {
  const f = await ownerCandidateFixture(t, options);
  f.candidate = await f.create((await f.csrf()).csrfToken);
  f.calls.length = 0;
  f.input = { installation: f.installation, candidateId: f.candidate.candidateId };
  f.read = (input = f.input) => readMemoryOwnerReview(f.operator, input);
  return f;
}

for (const standalone of [false, true]) test(`operator review is read-only and private (${standalone ? 'standalone' : 'separate Workers'})`, async t => {
  const f = await fixture(t, { standalone });
  const before = snapshot(f);
  let queries = 0;
  f.intercept = (method, path, body) => {
    if (method === 'POST') {
      assert.equal(path, `/accounts/${f.target.accountId}/d1/database/${f.target.databaseId}/query`);
      assert.equal(body.batch, undefined);
      assert.match(body.sql, /^SELECT\b/);
      queries++;
    } else assert.equal(method, 'GET');
  };
  const result = await f.read();
  assert.deepEqual(result, { candidateId: f.candidate.candidateId, installation: f.installation,
    verifiedEmail: f.human.email, providerConfigurationId: f.access.providerConfigurationId,
    issuer: f.human.issuer, expiresAt: f.candidate.expiresAt });
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.installation));
  assert.ok(queries > 0);
  assert.deepEqual(snapshot(f), before);
  for (const field of ['subject', 'code_hash', 'comparisonCode', 'confirmationId', 'principalId', 'status', 'ready']) assert.equal(Object.hasOwn(result, field), false);
  assert.ok(!JSON.stringify(result).includes(f.candidate.comparisonCode));
  // Reading twice produces no receipt, audit or grant and consumes nothing.
  assert.deepEqual(await f.read(), result);
  assert.deepEqual(snapshot(f), before);
});

test('operator review validates the exact input before making any provider request', async t => {
  const f = await fixture(t);
  for (const input of [null, {}, { ...f.input, email: f.human.email }, { ...f.input, cloudRole: 'owner' },
    { ...f.input, candidateId: 'short' }, { ...f.input, candidateId: `${'a'.repeat(32)}\n` },
    { ...f.input, installation: { ...f.installation, accountId: `${f.installation.accountId}\n` } },
    { ...f.input, installation: { ...f.installation, installationId: 'short' } },
    { ...f.input, installation: { ...f.installation, repositoryId: null } },
    { ...f.input, installation: { ...f.installation, appUrl: `${f.installation.appUrl}/` } },
    { ...f.input, installation: { ...f.installation, memoryOrigin: 'http://localhost' } }]) await denied(f.read(input), 'invalid-input');
  assert.equal(f.calls.length, 0);
});

test('candidate, installation and repository substitution never produce review details', async t => {
  const f = await fixture(t);
  await denied(f.read({ ...f.input, candidateId: 'x'.repeat(32) }), 'candidate-unavailable');
  for (const key of ['installationId', 'repositoryId']) await denied(f.read({ ...f.input,
    installation: { ...f.installation, [key]: 'x'.repeat(32) } }), 'installation-conflict');
  await denied(f.read({ ...f.input, installation: { ...f.installation, appUrl: 'https://foreign.example' } }), 'target-mismatch');
});

const unsafeCandidate = {
  expired: "UPDATE memory_login_candidates SET created_at = unixepoch() - 601, expires_at = unixepoch() - 1",
  'future dated': 'UPDATE memory_login_candidates SET created_at = unixepoch() + 60, expires_at = unixepoch() + 660',
  revoked: "UPDATE memory_login_candidates SET state = 'revoked'",
  'recovery purpose': "UPDATE memory_login_candidates SET purpose = 'recovery'",
  'link purpose': "UPDATE memory_login_candidates SET purpose = 'link'",
  'changed verified email': "UPDATE memory_login_candidates SET verified_email = 'different@example.com'",
  'changed issuer': "UPDATE memory_login_candidates SET issuer = 'https://different.cloudflareaccess.com'",
  'changed owner intent': "UPDATE memory_owner_intents SET email = 'different@example.com'",
  'retired provider': "UPDATE memory_providers SET status = 'retired'",
  'installation maintenance': "UPDATE memory_installation SET state = 'maintenance'",
  'installation ready': "UPDATE memory_installation SET state = 'ready'",
};
for (const [name, sql] of Object.entries(unsafeCandidate)) test(`operator review denies ${name}`, async t => {
  const f = await fixture(t); f.db.exec(sql);
  const before = snapshot(f);
  await denied(f.read(), 'candidate-unavailable');
  assert.deepEqual(snapshot(f), before);
});

test('first-owner inspection cannot become recovery after an owner was confirmed', async t => {
  const f = await fixture(t);
  const person = confirmFixtureOwner(f, f.installation);
  f.db.prepare("UPDATE memory_login_candidates SET state = 'consumed', consumed_principal_id = ?").run(person);
  const before = snapshot(f);
  await denied(f.read(), 'candidate-unavailable');
  assert.deepEqual(snapshot(f), before);
});

test('inspection refuses a partial bootstrap and malformed persisted Access configuration', async t => {
  for (const corruptAccess of [false, true]) {
    const f = await fixture(t);
    if (corruptAccess) f.db.exec("UPDATE memory_installation_configuration SET access_json = '{}', pin_revision = pin_revision + 1");
    else f.db.exec('DROP TRIGGER memory_bootstrap_completion_retained; DELETE FROM memory_bootstrap_completion');
    await denied(f.read(), 'installation-conflict');
  }
});

test('authorization and pin changes during provider readback invalidate the pending review', async t => {
  for (const sql of ['UPDATE memory_installation SET auth_revision = auth_revision + 1',
    'UPDATE memory_installation_configuration SET pin_revision = pin_revision + 1',
    "UPDATE memory_login_candidates SET state = 'revoked'"]) {
    const f = await fixture(t);
    f.intercept = (method, path) => {
      if (method === 'GET' && path.endsWith('/access/organizations')) f.db.exec(sql);
    };
    await denied(f.read(), 'candidate-unavailable');
  }
});

test('review requires actual production resource pins and current protected human Access', async t => {
  const changes = [
    [f => f.setBinding(f.target.memoryWorkerName, 'MEMORY_DB', { type: 'd1', database_id: 'wrong' }), 'target-mismatch'],
    [f => f.setBinding(f.target.appWorkerName, 'SKIP_AUTH', { type: 'plain_text', text: 'false' }), 'target-mismatch'],
    [f => f.setBinding(f.target.memoryWorkerName, 'WONG_ENVIRONMENT', { type: 'plain_text', text: 'staging' }), 'target-mismatch'],
    [f => { f.workers.get(f.target.appWorkerName).deployment.deployments[0].versions[0].percentage = 50; }, 'target-mismatch'],
    [f => f.setBinding(f.target.appWorkerName, 'WORKSPACE_LOGIN', { type: 'plain_text', text: 'off' }), 'protection-unavailable'],
    [f => { f.workers.get(f.target.appWorkerName).policy.include = [{ service_token: { token_id: 'fixture-service' } }]; }, 'protection-unavailable'],
    [f => { f.workers.get(f.target.appWorkerName).policy.decision = 'bypass'; }, 'protection-unavailable'],
    [f => { f.workers.get(f.target.appWorkerName).app.aud = 'wrong-audience'; }, 'protection-unavailable'],
    [f => { f.db.exec('UPDATE memory_installation_configuration SET access_json = NULL, pin_revision = pin_revision + 1'); }, 'protection-unavailable'],
  ];
  for (const [mutate, code] of changes) {
    const f = await fixture(t); mutate(f);
    await denied(f.read(), code);
  }
});

test('provider permission and response errors are safe and never grant fallback authority', async t => {
  for (const [status, code] of [[403, 'operator-denied'], [404, 'target-mismatch'], [500, 'provider-unavailable']]) {
    const f = await fixture(t);
    f.intercept = () => { throw Object.assign(new Error('private token/provider body'), { status }); };
    await denied(f.read(), code);
  }
  const f = await fixture(t);
  f.intercept = (method, path, body) => {
    if (method === 'POST' && body.sql.includes('FROM memory_login_candidates')) return [{ success: true, results: [{ id: f.candidate.candidateId }] }];
  };
  await denied(f.read(), 'candidate-unavailable');
});

test('confirmation preparation requires explicit review flags and normalizes only the displayed code format', async t => {
  const f = await fixture(t);
  const before = snapshot(f);
  const input = confirmation(f);
  const result = validateMemoryOwnerConfirmation(input);
  assert.equal(result.comparisonCode, f.candidate.comparisonCode.replace('-', ''));
  assert.equal(result.confirmationId, input.confirmationId);
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.confirmation));
  assert.ok(Object.isFrozen(result.installation));
  assert.deepEqual(validateMemoryOwnerConfirmation({ ...input, comparisonCode: result.comparisonCode }), result);
  input.confirmation.codeMatched = false; input.installation.appUrl = 'https://wrong.example';
  assert.equal(result.confirmation.codeMatched, true);
  assert.equal(result.installation.appUrl, f.target.appUrl);
  assert.deepEqual(snapshot(f), before);
  assert.equal(f.calls.length, 0);
  // A syntactically valid but nonexistent receipt is not authenticated or looked up.
  assert.equal(validateMemoryOwnerConfirmation({ ...confirmation(f), confirmationId: 'nonexistent'.padEnd(32, '0') }).confirmationId.length, 32);
});

test('confirmation parser rejects missing, false, coerced and substituted inputs without exposing the code', async t => {
  const f = await fixture(t);
  const input = confirmation(f);
  for (const key of ['targetReviewed', 'verifiedIdentityReviewed', 'codeMatched']) {
    for (const value of [false, 'true', 1, null]) invalid({ ...input, confirmation: { ...input.confirmation, [key]: value } }, 'confirmation-required');
    const missing = { ...input.confirmation }; delete missing[key];
    invalid({ ...input, confirmation: missing });
  }
  for (const value of [null, {}, { ...input, email: f.human.email }, { ...input, cloudOwner: true },
    { ...input, confirmationId: 'short' }, { ...input, candidateId: 'short' },
    { ...input, confirmation: { ...input.confirmation, admin: true } },
    { ...input, installation: { ...input.installation, token: 'synthetic' } }]) invalid(value);
  for (const comparisonCode of [null, '', 'ABCD-EFGI', 'ABCD-EFG0', 'abcd-efgh', ' ABCD-EFGH', 'ABCD-EFGH ', 'AB-CD-EFGH', 'ABCD–EFGH', 'ABCD-EFGH\n']) {
    invalid({ ...input, comparisonCode }, 'code-mismatch');
  }
  assert.equal(f.calls.length, 0);
});
