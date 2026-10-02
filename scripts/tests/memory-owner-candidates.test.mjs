import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerCandidateFixture } from './fixtures/memory/owner-candidate.mjs';
import { confirmFixtureOwner } from './fixtures/memory/operator.mjs';
import { MemoryIdentityError } from '../../.agents/skills/memory/worker/identity.mjs';
import { resolveInitialOwnerRequest, issueInitialOwnerCsrf, hashOwnerMaterial } from '../../.agents/skills/memory/worker/owner-request.mjs';
import { createInitialOwnerCandidate } from '../../.agents/skills/memory/worker/owner-candidates.mjs';

const denied = (promise, code) => assert.rejects(promise, error => error instanceof MemoryIdentityError && (!code || error.code === code) && error.message === error.code);
const count = (f, table) => f.row(`SELECT count(*) AS n FROM ${table}`).n;
const noGrants = f => {
  for (const table of ['memory_principals', 'memory_memberships', 'memory_identity_bindings', 'memory_devices', 'memory_credentials']) assert.equal(count(f, table), 0, table);
};

for (const standalone of [false, true]) test(`owner candidate is pending, hashed and never a grant (${standalone ? 'standalone' : 'separate memory'})`, async t => {
  const f = await ownerCandidateFixture(t, { standalone });
  const csrf = await f.csrf();
  assert.match(csrf.csrfToken, /^wm_csrf_[a-f0-9]{64}$/);
  const saved = f.row('SELECT * FROM memory_csrf_proofs');
  assert.equal(saved.hash, await hashOwnerMaterial(csrf.csrfToken));
  assert.equal(saved.session_hash, await hashOwnerMaterial('synthetic-assertion'));
  assert.equal(saved.expires_at - saved.created_at, 600);
  assert.equal(count(f, 'memory_login_candidates'), 0);
  const result = await f.create(csrf.csrfToken);
  assert.match(result.comparisonCode, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  const candidate = f.row('SELECT * FROM memory_login_candidates');
  assert.equal(candidate.id, result.candidateId);
  assert.equal(candidate.subject, f.human.subject);
  assert.equal(candidate.verified_email, f.human.email);
  assert.equal(candidate.code_hash, await hashOwnerMaterial(result.comparisonCode.replace('-', '')));
  assert.equal(candidate.expires_at, result.expiresAt);
  assert.equal(candidate.expires_at - candidate.created_at, 600);
  assert.equal(candidate.state, 'pending');
  assert.equal(candidate.purpose, 'owner');
  assert.equal(count(f, 'memory_csrf_proofs'), 0);
  assert.equal(f.row('SELECT state FROM memory_owner_intents').state, 'pending');
  const audit = f.row("SELECT * FROM memory_audit WHERE action = 'owner-candidate-created'");
  assert.equal(audit.actor_kind, 'human'); assert.equal(audit.actor_principal_id, null);
  assert.equal(audit.target_id, result.candidateId);
  const persisted = JSON.stringify({ saved, candidate, audit });
  for (const secret of [csrf.csrfToken, result.comparisonCode, 'synthetic-assertion']) assert.ok(!persisted.includes(secret));
  noGrants(f);
});

test('owner request requires production verified human context, not an email or service identity', async t => {
  const f = await ownerCandidateFixture(t);
  for (const human of [null, {}, { email: f.human.email }, { ...f.human, common_name: 'service' },
    { ...f.human, subject: '' }, { ...f.human, issuer: 'https://other.example' }, { ...f.human, audience: 'other' }]) {
    await denied(f.context('GET', {}, human));
  }
  for (const env of [{ ...f.env, MEMORY_DB: null }, { ...f.env, WONG_ENVIRONMENT: 'staging' },
    { ...f.env, SKIP_AUTH: 'false' }, { ...f.env, WORKSPACE_LOGIN: 'off' }, { ...f.env, CF_ACCESS_APP_ID: 'other' },
    { ...f.env, CF_ACCESS_WORKER_ID: '' }, { ...f.env, CF_ACCESS_TEAM_DOMAIN: 'other.example' }]) {
    await denied(f.context('GET', {}, f.human, env));
  }
  for (const headers of [{ Authorization: 'Bearer synthetic' }, { 'Cf-Access-Client-Id': 'synthetic' },
    { 'Cf-Access-Client-Secret': 'synthetic' }, { 'Cf-Access-Jwt-Assertion': '' }]) await denied(f.context('GET', { headers }));
  const missing = f.request('GET'); missing.headers.delete('Cf-Access-Jwt-Assertion');
  await denied(resolveInitialOwnerRequest(f.d1, missing, f.env, f.human));
  await denied(f.context('GET', {}, { ...f.human, email: 'other@example.com' }), 'owner-setup-unavailable');
  noGrants(f);
});

test('only canonical app method/path/origin is accepted; forwarding headers cannot substitute', async t => {
  const f = await ownerCandidateFixture(t);
  for (const url of [`${f.target.memoryOrigin}/api/memory-auth/session`, 'https://preview.example/api/memory-auth/session',
    'http://fixture-app.example.workers.dev/api/memory-auth/session', `${f.target.appUrl}/api/memory-auth/session?x=1`,
    `${f.target.appUrl}/api/memory-auth/session#fragment`, `${f.target.appUrl}/api/memory-auth/session/`, `${f.target.appUrl}/apps/devices/`]) {
    await denied(f.context('GET', { url, headers: { Host: new URL(f.target.appUrl).host, 'X-Forwarded-Host': new URL(f.target.appUrl).host } }));
  }
  await denied(f.context('DELETE', {}));
  for (const method of ['GET', 'POST']) {
    for (const headers of [{ Origin: 'https://wrong.example' }, { Origin: 'null' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' }]) {
      await denied(f.context(method, { headers }), 'owner-request-denied');
    }
  }
  const missing = f.request('POST'); missing.headers.delete('Origin');
  await denied(resolveInitialOwnerRequest(f.d1, missing, f.env, f.human), 'owner-request-denied');
  const csrf = await f.csrf({ cookie: true, headers: { Origin: f.target.appUrl, 'Sec-Fetch-Site': 'same-origin' } });
  await f.create(csrf.csrfToken, { cookie: true });
});

test('opaque request contexts cannot be forged, reused, moved to another DB or used with the wrong method', async t => {
  const f = await ownerCandidateFixture(t);
  await denied(issueInitialOwnerCsrf(f.d1, {}), 'owner-request-denied');
  await denied(createInitialOwnerCandidate(f.d1, await f.context('GET')), 'owner-request-denied');
  await denied(issueInitialOwnerCsrf(f.d1, await f.context('POST')), 'owner-request-denied');
  const context = await f.context('GET');
  await denied(issueInitialOwnerCsrf({}, context), 'owner-request-denied');
  await issueInitialOwnerCsrf(f.d1, context);
  await denied(issueInitialOwnerCsrf(f.d1, context), 'owner-request-denied');
});

test('CSRF requires the same assertion, subject and one unexpired proof', async t => {
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  await denied(f.create('bad'), 'owner-csrf-required');
  await denied(f.create(`wm_csrf_${'0'.repeat(64)}`), 'identity-change-conflict');
  await denied(f.create(csrfToken, { headers: { 'Cf-Access-Jwt-Assertion': 'different-session' } }), 'identity-change-conflict');
  await denied(f.create(csrfToken, {}, { ...f.human, subject: 'other-subject' }), 'identity-change-conflict');
  await f.create(csrfToken);
  await denied(f.create(csrfToken), 'identity-change-conflict');
  const expired = await f.csrf();
  f.db.exec('UPDATE memory_csrf_proofs SET created_at = unixepoch() - 600, expires_at = unixepoch()');
  await denied(f.create(expired.csrfToken), 'identity-change-conflict');
  assert.equal(count(f, 'memory_login_candidates'), 1); noGrants(f);
});

test('client cannot select email, identity, role or candidate through request JSON', async t => {
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  for (const body of ['null', '[]', '{', '1', '{"email":"owner@example.com"}', '{"role":"owner"}', ' '.repeat(257), new Uint8Array([255])]) {
    await denied(f.create(csrfToken, { body }), 'owner-request-denied');
  }
  await denied(f.create(csrfToken, { headers: { 'Content-Type': 'text/plain' } }), 'owner-request-denied');
  await denied(f.create(csrfToken, { body: null }), 'owner-request-denied');
  assert.equal(count(f, 'memory_login_candidates'), 0);
  await f.create(csrfToken, { body: ' { } ', headers: { 'Content-Type': 'application/json; charset=utf-8' } });
});

test('fresh contexts and mutations recheck owner intent, provider, completion and authorization revisions', async t => {
  for (const sql of [
    "UPDATE memory_installation SET state = 'maintenance'",
    'UPDATE memory_installation SET auth_revision = auth_revision + 1',
    "UPDATE memory_providers SET status = 'retired'",
    "UPDATE memory_owner_intents SET email = 'other@example.com'",
    'UPDATE memory_installation_configuration SET pin_revision = pin_revision + 1',
    'UPDATE memory_installation SET minimum_protocol = 2',
  ]) await t.test(sql, async sub => {
    const f = await ownerCandidateFixture(sub);
    const { csrfToken } = await f.csrf();
    const context = await f.context('POST', { headers: { 'X-Memory-CSRF': csrfToken } });
    f.beforeBatch(() => f.db.exec(sql));
    await denied(createInitialOwnerCandidate(f.d1, context), 'identity-change-conflict');
    assert.equal(count(f, 'memory_login_candidates'), 0); noGrants(f);
  });
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  const context = await f.context('POST', { headers: { 'X-Memory-CSRF': csrfToken } });
  f.beforeBatch(() => confirmFixtureOwner(f, f.installation));
  await denied(createInitialOwnerCandidate(f.d1, context), 'identity-change-conflict');
  await denied(f.context('GET'), 'owner-setup-unavailable');
  assert.equal(count(f, 'memory_login_candidates'), 0);
});

test('candidate creation fails closed without the immutable bootstrap receipt', async t => {
  const f = await ownerCandidateFixture(t);
  // Deliberately construct a partial bootstrap fixture, never a production repair.
  f.db.exec('DROP TRIGGER memory_bootstrap_completion_retained; DELETE FROM memory_bootstrap_completion');
  await denied(f.context('GET'), 'owner-setup-unavailable');
  noGrants(f);
});

test('replacement only revokes the same human pending candidate; rate limit includes revoked history', async t => {
  const f = await ownerCandidateFixture(t);
  const first = await f.create((await f.csrf()).csrfToken);
  const other = { ...f.human, subject: 'different-verified-subject' };
  const otherCandidate = await f.create((await f.csrf({}, other)).csrfToken, {}, other);
  for (let i = 0; i < 2; i++) await f.create((await f.csrf()).csrfToken);
  await denied(f.create((await f.csrf()).csrfToken), 'identity-change-conflict');
  assert.equal(f.row('SELECT state FROM memory_login_candidates WHERE id = ?', first.candidateId).state, 'revoked');
  assert.equal(f.row('SELECT state FROM memory_login_candidates WHERE id = ?', otherCandidate.candidateId).state, 'pending');
  assert.equal(f.row("SELECT count(*) AS n FROM memory_login_candidates WHERE state = 'pending'").n, 2);
  assert.throws(() => f.db.prepare("UPDATE memory_login_candidates SET state = 'pending' WHERE id = ?").run(first.candidateId), /login candidate already ended/);
  noGrants(f);
});

test('concurrent use of the same CSRF proof has one winner', async t => {
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  const results = await Promise.allSettled([f.create(csrfToken), f.create(csrfToken)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'identity-change-conflict');
  assert.equal(count(f, 'memory_login_candidates'), 1);
  assert.equal(f.row("SELECT count(*) AS n FROM memory_audit WHERE action = 'owner-candidate-created'").n, 1);
  noGrants(f);
});

test('batch failure rolls back candidate replacement, audit and CSRF consumption', async t => {
  const f = await ownerCandidateFixture(t);
  const first = await f.create((await f.csrf()).csrfToken);
  const { csrfToken } = await f.csrf();
  f.db.exec("CREATE TRIGGER fixture_fail_candidate BEFORE INSERT ON memory_login_candidates BEGIN SELECT RAISE(ABORT, 'private failure details'); END");
  await denied(f.create(csrfToken), 'identity-change-failed');
  assert.equal(f.row('SELECT state FROM memory_login_candidates WHERE id = ?', first.candidateId).state, 'pending');
  assert.equal(count(f, 'memory_csrf_proofs'), 1);
  assert.equal(f.row("SELECT count(*) AS n FROM memory_audit WHERE action = 'owner-candidate-created'").n, 1);
  f.db.exec('DROP TRIGGER fixture_fail_candidate');
  await f.create(csrfToken);
});

test('CSRF issuance is bounded per subject across sessions and expired proofs can be replaced', async t => {
  const f = await ownerCandidateFixture(t);
  for (let i = 0; i < 16; i++) await f.csrf({ headers: { 'Cf-Access-Jwt-Assertion': `synthetic-${i}` } });
  await denied(f.csrf(), 'owner-csrf-unavailable');
  assert.equal(count(f, 'memory_csrf_proofs'), 16);
  f.db.exec('UPDATE memory_csrf_proofs SET created_at = unixepoch() - 600, expires_at = unixepoch()');
  await f.csrf();
  assert.equal(count(f, 'memory_csrf_proofs'), 1);
  const context = await f.context('GET');
  f.beforeBatch(() => f.db.exec("UPDATE memory_providers SET status = 'retired'"));
  await denied(issueInitialOwnerCsrf(f.d1, context), 'owner-csrf-unavailable');
});

test('a proof from another installation, provider or bound member cannot authorize bootstrap', async t => {
  const f = await ownerCandidateFixture(t);
  const other = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  await denied(other.create(csrfToken), 'identity-change-conflict');
  f.db.exec('UPDATE memory_csrf_proofs SET membership_revision = 1');
  await denied(f.create(csrfToken), 'identity-change-conflict');
  f.db.exec('UPDATE memory_csrf_proofs SET membership_revision = NULL');
  f.db.prepare(`INSERT INTO memory_providers (id, installation_id, issuer, audience, status, created_at)
    VALUES ('other-provider', ?, ?, 'other-audience', 'active', unixepoch())`).run(f.installation.installationId, f.human.issuer);
  f.db.exec("UPDATE memory_csrf_proofs SET provider_id = 'other-provider'");
  await denied(f.create(csrfToken), 'identity-change-conflict');
  noGrants(f); noGrants(other);
});

test('changed assertion header takes precedence over a matching cookie', async t => {
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf({ cookie: true });
  await denied(f.create(csrfToken, { cookie: true, headers: { 'Cf-Access-Jwt-Assertion': 'renewed-assertion' } }), 'identity-change-conflict');
  // A browser Access assertion renewal requires fresh session/CSRF material.
  const renewed = await f.csrf({ headers: { 'Cf-Access-Jwt-Assertion': 'renewed-assertion' } });
  await f.create(renewed.csrfToken, { headers: { 'Cf-Access-Jwt-Assertion': 'renewed-assertion' } });
});

test('owner email is normalized from verified claims and cannot be overridden by an email header', async t => {
  const f = await ownerCandidateFixture(t);
  const human = { ...f.human, email: 'OWNER@EXAMPLE.COM' };
  const csrf = await f.csrf({}, human);
  await f.create(csrf.csrfToken, { headers: { 'Cf-Access-Authenticated-User-Email': 'intruder@example.com' } }, human);
  assert.equal(f.row('SELECT verified_email FROM memory_login_candidates').verified_email, 'owner@example.com');
  await denied(f.context('GET', { headers: { 'Cf-Access-Authenticated-User-Email': 'owner@example.com' } }, { ...human, email: 'intruder@example.com' }), 'owner-setup-unavailable');
});

test('candidate rate window expires without reviving old candidates', async t => {
  const f = await ownerCandidateFixture(t);
  for (let i = 0; i < 3; i++) await f.create((await f.csrf()).csrfToken);
  // Only the final pending row is mutable; terminal history remains retained.
  f.db.exec("UPDATE memory_login_candidates SET created_at = unixepoch() - 601, expires_at = unixepoch() - 1 WHERE state = 'pending'");
  const newest = await f.create((await f.csrf()).csrfToken);
  assert.equal(f.row('SELECT state FROM memory_login_candidates WHERE id = ?', newest.candidateId).state, 'pending');
  assert.equal(f.row("SELECT count(*) AS n FROM memory_login_candidates WHERE state = 'revoked'").n, 3);
});

test('cleanup deletes at most 64 expired proofs for this subject and leaves another subject alone', async t => {
  const f = await ownerCandidateFixture(t);
  const insert = f.db.prepare(`INSERT INTO memory_csrf_proofs
    (hash, installation_id, provider_id, issuer, subject, session_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch() - 600, unixepoch())`);
  for (let i = 0; i < 66; i++) insert.run(i.toString(16).padStart(64, '0'), f.installation.installationId,
    f.access.providerConfigurationId, f.human.issuer, i === 65 ? 'other-subject' : f.human.subject, 'f'.repeat(64));
  await f.csrf();
  assert.equal(count(f, 'memory_csrf_proofs'), 3);
  assert.equal(f.row("SELECT count(*) AS n FROM memory_csrf_proofs WHERE subject = 'other-subject'").n, 1);
});

test('database errors and incomplete receipts return safe errors without assuming success', async t => {
  const f = await ownerCandidateFixture(t);
  const prepare = f.d1.prepare;
  f.d1.prepare = () => { throw new Error('private provider details'); };
  await denied(f.context('GET'), 'owner-setup-unavailable');
  f.d1.prepare = prepare;
  const batch = f.d1.batch;
  f.d1.batch = async () => { throw new Error('private provider details'); };
  await denied(f.csrf(), 'owner-setup-unavailable');
  for (const result of [null, [], [{ success: false }, { success: true }], [{ success: true }, { success: true, results: [] }]]) {
    f.d1.batch = async () => result;
    await denied(f.csrf());
  }
  f.d1.batch = batch;
  const { csrfToken } = await f.csrf();
  f.d1.batch = async () => [{ success: false }];
  await denied(f.create(csrfToken), 'identity-change-failed');
  f.d1.batch = batch;
  assert.equal(count(f, 'memory_login_candidates'), 0);
});

test('ambiguous committed response does not reissue a code or replay the same CSRF proof', async t => {
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  const batch = f.d1.batch;
  f.d1.batch = async statements => { await batch(statements); throw new Error('lost response'); };
  await denied(f.create(csrfToken), 'identity-change-failed');
  f.d1.batch = batch;
  await denied(f.create(csrfToken), 'identity-change-conflict');
  assert.equal(count(f, 'memory_login_candidates'), 1);
  // The person explicitly starts a replacement; the lost plaintext code is unrecoverable.
  await f.create((await f.csrf()).csrfToken);
  assert.equal(f.row("SELECT count(*) AS n FROM memory_login_candidates WHERE state = 'revoked'").n, 1);
  noGrants(f);
});

test('post-write read failure or a candidate revoked before readback does not return an approval code', async t => {
  for (const failRead of [true, false]) await t.test(String(failRead), async sub => {
    const f = await ownerCandidateFixture(sub);
    const { csrfToken } = await f.csrf();
    const batch = f.d1.batch;
    f.d1.batch = async statements => {
      const results = await batch(statements);
      if (failRead) f.d1.prepare = () => { throw new Error('private readback details'); };
      else f.db.exec("UPDATE memory_login_candidates SET state = 'revoked' WHERE state = 'pending'");
      return results;
    };
    await denied(f.create(csrfToken), failRead ? 'owner-setup-unavailable' : 'owner-candidate-unavailable');
    noGrants(f);
  });
});

test('locked or interrupted request streams fail with a safe request error', async t => {
  const f = await ownerCandidateFixture(t);
  const { csrfToken } = await f.csrf();
  const request = f.request('POST', { headers: { 'X-Memory-CSRF': csrfToken } });
  const reader = request.body.getReader();
  await denied(createInitialOwnerCandidate(f.d1, await resolveInitialOwnerRequest(f.d1, request, f.env, f.human)), 'owner-request-denied');
  reader.releaseLock();
  const broken = new Request(`${f.target.appUrl}/api/memory-auth/setup/candidates`, {
    method: 'POST', duplex: 'half', headers: request.headers,
    body: new ReadableStream({ start(controller) { controller.error(new Error('private stream details')); } }),
  });
  await denied(createInitialOwnerCandidate(f.d1, await resolveInitialOwnerRequest(f.d1, broken, f.env, f.human)), 'owner-request-denied');
  assert.equal(count(f, 'memory_login_candidates'), 0);
});
