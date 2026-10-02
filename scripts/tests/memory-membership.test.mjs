import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryIdentityError, devicePolicy, normalizeEmail, resolveMemoryHuman, rolePolicy, verifiedHuman } from '../../.agents/skills/memory/worker/identity.mjs';
import { consumeMemoryInvitation, inviteMemoryMember, revokeMemoryInvitation } from '../../.agents/skills/memory/worker/invitations.mjs';
import { changeMemoryRole, removeMemoryMember } from '../../.agents/skills/memory/worker/memberships.mjs';
import { linkMemoryIdentity } from '../../.agents/skills/memory/worker/identity-links.mjs';
import { INSTALLATION, OTHER, PRINCIPAL } from './fixtures/memory/identity.mjs';
import { candidate, device, membershipFixture, pendingApproval, proof } from './fixtures/memory/membership.mjs';

const denied = promise => assert.rejects(promise, error => error instanceof MemoryIdentityError);
const count = (f, table) => f.row(`SELECT count(*) AS n FROM ${table}`).n;
const revision = (f, principalId = OTHER) => f.row('SELECT revision FROM memory_memberships WHERE principal_id = ?', principalId).revision;
const change = async (f, role, principalId = OTHER) => changeMemoryRole(f.d1, await f.owner(), { principalId, revision: revision(f, principalId), role });
const invite = async (f, email = 'new@example.com', role = 'reader') => inviteMemoryMember(f.d1, await f.owner(), { email, role });

test('human contexts require the exact live provider binding and cannot be forged or moved between stores', async t => {
  const f = membershipFixture(t);
  const owner = await f.owner();
  assert.equal(owner.principalId, PRINCIPAL);
  assert.equal((await f.owner()).principalId, owner.principalId);
  for (const extra of [{ subject: 'changed' }, { email: 'changed@example.com' }, { issuer: 'https://other.example' }, { audience: 'other' }]) {
    await denied(resolveMemoryHuman(f.d1, INSTALLATION, { ...proof(), ...extra }));
  }
  await denied(resolveMemoryHuman(f.d1, 'another-installation', proof()));
  await denied(inviteMemoryMember(f.d1, { ...owner }, { email: 'new@example.com', role: 'member' }));
  const foreign = membershipFixture(t);
  await denied(inviteMemoryMember(foreign.d1, owner, { email: 'new@example.com', role: 'member' }));
  f.db.exec("UPDATE memory_providers SET status = 'retired'");
  await denied(f.owner());
  await denied(inviteMemoryMember(f.d1, owner, { email: 'new@example.com', role: 'member' }));
  assert.equal(count(f, 'memory_invitations'), 0);
});

test('human and device role policies keep membership powers separate from memory administration', async t => {
  const f = membershipFixture(t);
  const invitation = await invite(f);
  for (const role of ['admin', 'member', 'reader']) {
    await change(f, role);
    const actor = await f.member();
    assert.equal(rolePolicy(role).managePeople, false);
    await denied(inviteMemoryMember(f.d1, actor, { email: 'other@example.com', role: 'owner' }));
    await denied(revokeMemoryInvitation(f.d1, actor, invitation.invitationId));
    await denied(changeMemoryRole(f.d1, actor, { principalId: PRINCIPAL, revision: revision(f, PRINCIPAL), role: 'member' }));
    await denied(removeMemoryMember(f.d1, actor, { principalId: PRINCIPAL, revision: revision(f, PRINCIPAL) }));
    await denied(linkMemoryIdentity(f.d1, actor, { candidateId: 'unknown', principalId: null, role: 'owner', evidenceRef: 'review/1' }));
  }
  assert.equal(rolePolicy('owner').managePeople, true);
  assert.equal(rolePolicy('admin').administerMemory, true);
  assert.deepEqual(devicePolicy('reader', 'memory:read memory:write memory:admin'), {
    read: true, write: true, administerMemory: false, shareWrites: false, managePeople: false,
  });
  assert.equal(devicePolicy('owner', 'memory:read memory:write').administerMemory, false);
  assert.equal(devicePolicy('admin', 'memory:read memory:write memory:admin').administerMemory, true);
  assert.equal(devicePolicy('member', 'memory:read').write, false);
  for (const fn of [() => rolePolicy('root'), () => devicePolicy('owner', 'everything'), () => normalizeEmail(null),
    () => verifiedHuman(null), () => verifiedHuman({ ...proof(), email: ' owner@example.com' }),
    () => verifiedHuman({ ...proof(), subject: '' }), () => normalizeEmail('x'.repeat(255)), () => normalizeEmail('bad')]) assert.throws(fn);
});

test('an invitation grants a fresh principal prospectively and concurrent claim or replay has one winner', async t => {
  const f = membershipFixture(t);
  f.db.exec("INSERT INTO facts (slug,type,body,source,created_at,author) VALUES ('old','user','Private history','save','then','new@example.com')");
  const invitation = await invite(f, ' New@Example.com ');
  const outcomes = await Promise.allSettled([1, 2].map(() => consumeMemoryInvitation(f.d1, INSTALLATION, proof('new'), invitation.invitationId)));
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  const result = outcomes.find(outcome => outcome.status === 'fulfilled').value;
  assert.notEqual(result.principalId, PRINCIPAL);
  assert.equal((await resolveMemoryHuman(f.d1, INSTALLATION, proof('new'))).role, 'reader');
  assert.equal(count(f, 'memory_principals'), 3);
  assert.equal(f.row('SELECT owner_principal_id FROM facts').owner_principal_id, null);
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('new'), invitation.invitationId));
  assert.equal(f.row('SELECT consumed_principal_id FROM memory_invitations').consumed_principal_id, result.principalId);
  assert.doesNotMatch(JSON.stringify(f.db.prepare('SELECT * FROM memory_audit').all()), /new@example|Private history/);
});

test('wrong recipient, expired or revoked invitations, retired providers and email collisions never admit a person', async t => {
  const f = membershipFixture(t);
  let invitation = await invite(f);
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('wrong'), invitation.invitationId));
  await denied(consumeMemoryInvitation(f.d1, 'wrong-install', proof('new'), invitation.invitationId));
  f.db.prepare('UPDATE memory_invitations SET created_at = ?, expires_at = ? WHERE id = ?').run(f.now - 100, f.now - 1, invitation.invitationId);
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('new'), invitation.invitationId));
  invitation = await invite(f);
  await revokeMemoryInvitation(f.d1, await f.owner(), invitation.invitationId);
  await denied(revokeMemoryInvitation(f.d1, await f.owner(), invitation.invitationId));
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('new'), invitation.invitationId));
  const collision = await invite(f, 'member@example.com');
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('new-subject', 'member@example.com'), collision.invitationId));
  f.db.exec("UPDATE memory_providers SET status = 'retired'");
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('new'), invitation.invitationId));
  assert.equal(count(f, 'memory_principals'), 2);
});

test('revocation between invitation preflight and its transaction denies the entire claim', async t => {
  const f = membershipFixture(t);
  const invitation = await invite(f);
  f.beforeBatch(() => f.db.prepare("UPDATE memory_invitations SET state = 'revoked' WHERE id = ?").run(invitation.invitationId));
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('new'), invitation.invitationId));
  assert.equal(count(f, 'memory_principals'), 2);
  assert.equal(count(f, 'memory_identity_bindings'), 2);
});

test('owner removal or downgrade racing a saved context cannot authorize a write', async t => {
  const f = membershipFixture(t);
  const actor = await f.owner();
  f.beforeBatch(() => f.db.prepare("UPDATE memory_memberships SET role = 'admin', revision = revision + 1 WHERE principal_id = ?").run(PRINCIPAL));
  await denied(inviteMemoryMember(f.d1, actor, { email: 'new@example.com', role: 'owner' }));
  assert.equal(count(f, 'memory_invitations'), 0);
  assert.equal(count(f, 'memory_audit'), 0);
  f.db.exec("UPDATE memory_installation SET state = 'maintenance'");
  await denied(f.member());
});

test('ordinary changes cannot remove the last active owner, including competing owner removals', async t => {
  const f = membershipFixture(t);
  await denied(removeMemoryMember(f.d1, await f.owner(), { principalId: PRINCIPAL, revision: revision(f, PRINCIPAL) }));
  await denied(change(f, 'admin', PRINCIPAL));
  await change(f, 'owner');
  const [first, second] = await Promise.all([f.owner(), f.member()]);
  const outcomes = await Promise.allSettled([
    removeMemoryMember(f.d1, first, { principalId: OTHER, revision: revision(f) }),
    removeMemoryMember(f.d1, second, { principalId: PRINCIPAL, revision: revision(f, PRINCIPAL) }),
  ]);
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  assert.equal(f.row("SELECT count(*) AS n FROM memory_memberships WHERE role = 'owner' AND status = 'active'").n, 1);
  await denied(change(f, 'reader', PRINCIPAL));
  await denied(changeMemoryRole(f.d1, await f.owner(), { principalId: PRINCIPAL, revision: 0, role: 'owner' }));
});

test('a removed principal with a stale owner membership cannot satisfy last-owner protection', async t => {
  const f = membershipFixture(t);
  await change(f, 'owner');
  f.db.prepare("UPDATE memory_principals SET status = 'removed' WHERE id = ?").run(OTHER);
  await denied(removeMemoryMember(f.d1, await f.owner(), { principalId: PRINCIPAL, revision: revision(f, PRINCIPAL) }));
});

test('role changes narrow current device permissions, invalidate pending approvals and never expand approved scope', async t => {
  const f = membershipFixture(t);
  await change(f, 'admin');
  const id = device(f, OTHER, 'memory:read memory:write memory:admin');
  const requestId = pendingApproval(f);
  const stale = await f.member();
  f.db.prepare(`INSERT INTO memory_csrf_proofs (hash,installation_id,provider_id,issuer,subject,session_hash,binding_id,membership_revision,created_at,expires_at)
    VALUES (?,?,'provider',?,'member',?,'binding-member',?,?,?)`)
    .run('d'.repeat(64), INSTALLATION, proof().issuer, 'e'.repeat(64), revision(f), f.now, f.now + 600);
  await change(f, 'reader');
  assert.equal(count(f, 'memory_csrf_proofs'), 0);
  const row = f.row('SELECT scope, membership_revision, status FROM memory_devices WHERE id = ?', id);
  assert.equal(row.status, 'active');
  assert.equal(row.membership_revision, revision(f));
  assert.equal(devicePolicy('reader', row.scope).administerMemory, false);
  assert.equal(devicePolicy('reader', row.scope).shareWrites, false);
  assert.equal(f.row('SELECT state FROM memory_device_requests WHERE id = ?', requestId).state, 'revoked');
  await denied(inviteMemoryMember(f.d1, stale, { email: 'other@example.com', role: 'member' }));
  const narrow = device(f);
  await change(f, 'owner');
  assert.equal(devicePolicy('owner', f.row('SELECT scope FROM memory_devices WHERE id = ?', narrow).scope).administerMemory, false);
});

test('membership removal retains history and tombstones while revoking all device generations and requests', async t => {
  const f = membershipFixture(t);
  const id = device(f);
  const pending = pendingApproval(f);
  const login = candidate(f, proof('member'));
  f.db.prepare("INSERT INTO facts (slug,type,body,source,created_at,author,owner_principal_id) VALUES ('old','user','Keep history','save','then','member@example.com',?)").run(OTHER);
  await removeMemoryMember(f.d1, await f.owner(), { principalId: OTHER, revision: revision(f) });
  assert.equal(f.row('SELECT status FROM memory_devices WHERE id = ?', id).status, 'revoked');
  assert.equal(f.row('SELECT state FROM memory_device_requests WHERE id = ?', pending).state, 'revoked');
  assert.equal(f.row('SELECT state FROM memory_login_candidates WHERE id = ?', login).state, 'revoked');
  assert.equal(f.row("SELECT status FROM memory_identity_bindings WHERE id = 'binding-member'").status, 'retired');
  assert.equal(f.row('SELECT owner_principal_id FROM facts').owner_principal_id, OTHER);
  await denied(f.member());
  const invitation = await invite(f, 'member@example.com');
  await denied(consumeMemoryInvitation(f.d1, INSTALLATION, proof('member'), invitation.invitationId));
  assert.equal(count(f, 'memory_credentials'), 1, 'old hashes remain linked to a revoked device, never a fresh grant');
});

test('a failed transaction rolls back both authorization receipt and membership writes', async t => {
  const f = membershipFixture(t);
  device(f);
  f.db.exec("CREATE TRIGGER fail_role BEFORE UPDATE ON memory_devices BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
  await denied(change(f, 'admin'));
  assert.equal(f.row('SELECT role FROM memory_memberships WHERE principal_id = ?', OTHER).role, 'member');
  assert.equal(count(f, 'memory_audit'), 0);
  assert.equal(f.row('SELECT auth_revision FROM memory_installation').auth_revision, 1);
});

test('unreadable or explicitly failed database batch results cannot report successful authorization', async t => {
  for (const result of [null, [], [{ success: false, results: [{ id: 'unrelated-receipt' }] }],
    [{ success: true, results: [{ id: 'unrelated-receipt' }] }]]) {
    const f = membershipFixture(t);
    const owner = await f.owner();
    f.d1.batch = async () => result;
    await denied(inviteMemoryMember(f.d1, owner, { email: 'new@example.com', role: 'member' }));
    assert.equal(count(f, 'memory_invitations'), 0);
  }
});

test('reviewed continuity records changed subject evidence and revokes old access without rewriting history', async t => {
  const f = membershipFixture(t);
  const id = device(f);
  const human = proof('replacement', 'changed@example.com');
  const candidateId = candidate(f, human);
  const input = { candidateId, principalId: OTHER, revision: revision(f), role: 'member', evidenceRef: 'private-review/continuity-1' };
  const result = await linkMemoryIdentity(f.d1, await f.owner(), input);
  assert.equal(result.principalId, OTHER);
  assert.equal((await resolveMemoryHuman(f.d1, INSTALLATION, human)).principalId, OTHER);
  await denied(f.member());
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, revision: revision(f) }));
  assert.equal(f.row('SELECT status FROM memory_devices WHERE id = ?', id).status, 'revoked');
  assert.deepEqual(f.row('SELECT target_principal_id, outcome, evidence_ref FROM memory_identity_reviews'), {
    target_principal_id: OTHER, outcome: 'continuity', evidence_ref: input.evidenceRef,
  });
  f.db.exec('DELETE FROM memory_login_candidates');
  assert.equal(count(f, 'memory_identity_reviews'), 1);
  assert.throws(() => f.db.exec("UPDATE memory_identity_reviews SET evidence_ref = 'other'"), /immutable/);
  assert.throws(() => f.db.exec('DELETE FROM memory_identity_reviews'), /retained/);
});

test('mailbox reassignment needs explicit new-person review and never inherits the removed principal', async t => {
  const f = membershipFixture(t);
  const candidateId = candidate(f, proof('member'), 'recovery');
  const input = { candidateId, principalId: null, role: 'reader', evidenceRef: 'private-review/reassigned-mailbox' };
  await denied(linkMemoryIdentity(f.d1, await f.owner(), input));
  await removeMemoryMember(f.d1, await f.owner(), { principalId: OTHER, revision: revision(f) });
  const freshCandidate = candidate(f, proof('member'), 'recovery');
  const result = await linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId: freshCandidate });
  assert.notEqual(result.principalId, OTHER);
  assert.equal((await f.member()).principalId, result.principalId);
  assert.equal((await f.member()).role, 'reader');
  assert.equal(f.row('SELECT status FROM memory_principals WHERE id = ?', OTHER).status, 'removed');
  assert.equal(f.row('SELECT replaces_binding_id FROM memory_identity_bindings WHERE id = ?', result.bindingId).replaces_binding_id, 'binding-member');
  assert.equal(f.row('SELECT outcome FROM memory_identity_reviews').outcome, 'new-person');
});

test('identity review refuses expired, wrong-purpose, mismatched-role and stale-revision candidates', async t => {
  const f = membershipFixture(t);
  const input = { principalId: OTHER, revision: revision(f), role: 'member', evidenceRef: 'review/1' };
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId: candidate(f, proof('replacement'), 'owner') }));
  const candidateId = candidate(f, proof('replacement'));
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId, role: 'owner' }));
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId, revision: 999 }));
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId, revision: -1 }));
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId, evidenceRef: '' }));
  f.db.prepare('UPDATE memory_login_candidates SET created_at = ?, expires_at = ? WHERE id = ?').run(f.now - 100, f.now - 1, candidateId);
  await denied(linkMemoryIdentity(f.d1, await f.owner(), { ...input, candidateId }));
  assert.equal(count(f, 'memory_identity_reviews'), 0);
});

test('reviewed recovery can restore a removed person and a replacement provider without reviving old bindings', async t => {
  const f = membershipFixture(t);
  await removeMemoryMember(f.d1, await f.owner(), { principalId: OTHER, revision: revision(f) });
  const human = { ...proof('recovered'), issuer: 'https://replacement.cloudflareaccess.com', audience: 'replacement-audience' };
  f.db.prepare("INSERT INTO memory_providers (id,installation_id,issuer,audience,status,created_at) VALUES ('replacement',?,?,?,'active',?)")
    .run(INSTALLATION, human.issuer, human.audience, f.now);
  const candidateId = candidate(f, proof('recovered'), 'recovery');
  f.db.prepare("UPDATE memory_login_candidates SET provider_id = 'replacement', issuer = ? WHERE id = ?").run(human.issuer, candidateId);
  const result = await linkMemoryIdentity(f.d1, await f.owner(), { candidateId, principalId: OTHER, revision: revision(f), role: 'reader', evidenceRef: 'review/recovery' });
  assert.equal(result.principalId, OTHER);
  assert.equal((await resolveMemoryHuman(f.d1, INSTALLATION, human)).role, 'reader');
  assert.equal(f.row("SELECT status FROM memory_identity_bindings WHERE id = 'binding-member'").status, 'retired');
  await denied(f.member());
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0);
});
