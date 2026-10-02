import { DatabaseSync } from 'node:sqlite';
import { identityFixture, INSTALLATION, REPOSITORY, PRINCIPAL, OTHER } from './identity.mjs';
import { resolveMemoryHuman } from '../../../../.agents/skills/memory/worker/identity.mjs';

export const ISSUER = 'https://fixture.cloudflareaccess.com';
export const AUDIENCE = 'fixture-audience';
export const proof = (subject = 'owner', email = `${subject}@example.com`) => ({ issuer: ISSUER, audience: AUDIENCE, subject, email });

export function membershipFixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys = ON');
  const now = identityFixture(db);
  db.prepare("UPDATE memory_memberships SET role = 'owner', revision = revision + 1 WHERE principal_id = ?").run(PRINCIPAL);
  for (const [id, subject] of [[PRINCIPAL, 'owner'], [OTHER, 'member']]) {
    db.prepare(`INSERT INTO memory_identity_bindings
      (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status, created_at, updated_at)
      VALUES (?, ?, 'provider', ?, ?, ?, ?, 'active', ?, ?)`)
      .run(`binding-${subject}`, INSTALLATION, id, ISSUER, subject, `${subject}@example.com`, now, now);
  }
  let beforeBatch;
  let queue = Promise.resolve();
  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => { const row = db.prepare(sql).get(...params); return row ? { ...row } : null; },
    all: async () => ({ success: true, results: db.prepare(sql).all(...params).map(row => ({ ...row })) }),
  });
  const d1 = {
    prepare: sql => statement(sql),
    batch: statements => {
      const result = queue.then(async () => {
        const hook = beforeBatch;
        beforeBatch = undefined;
        if (hook) await hook();
        db.exec('BEGIN');
        try {
          const results = [];
          for (const each of statements) results.push(await each.all());
          db.exec('COMMIT');
          return results;
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  return { db, d1, now, beforeBatch: hook => { beforeBatch = hook; },
    owner: () => resolveMemoryHuman(d1, INSTALLATION, proof()),
    member: () => resolveMemoryHuman(d1, INSTALLATION, proof('member')),
    row: (sql, ...params) => ({ ...db.prepare(sql).get(...params) }),
  };
}

export function candidate(f, human, purpose = 'link') {
  const id = crypto.randomUUID();
  f.db.prepare(`INSERT INTO memory_login_candidates
    (id, installation_id, provider_id, issuer, subject, verified_email, code_hash, purpose, created_at, expires_at)
    VALUES (?, ?, 'provider', ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, INSTALLATION, human.issuer, human.subject, human.email, 'c'.repeat(64), purpose, f.now, f.now + 600);
  return id;
}

export function device(f, principalId = OTHER, scope = 'memory:read memory:write') {
  const id = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const hash = id.replaceAll('-', '').padEnd(64, 'a');
  const revision = f.row('SELECT revision FROM memory_memberships WHERE principal_id = ?', principalId).revision;
  f.db.prepare(`INSERT INTO memory_device_requests
    (id, installation_id, repository_id, nonce_hash, secret_hash, credential_hash, comparison_code,
      label, scope, state, principal_id, membership_revision, approved_at, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ABCD2345', 'Fixture laptop', ?, 'approved', ?, ?, ?, ?, ?)`)
    .run(requestId, INSTALLATION, REPOSITORY, hash, hash, hash, scope, principalId, revision, f.now, f.now, f.now + 600);
  f.db.prepare(`INSERT INTO memory_devices
    (id, request_id, installation_id, repository_id, principal_id, label, scope, membership_revision, approved_at, reauthorize_at)
    VALUES (?, ?, ?, ?, ?, 'Fixture laptop', ?, ?, ?, ?)`)
    .run(id, requestId, INSTALLATION, REPOSITORY, principalId, scope, revision, f.now, f.now + 7776000);
  f.db.prepare('INSERT INTO memory_credentials (hash, device_id, generation, issued_at, expires_at) VALUES (?, ?, 1, ?, ?)')
    .run(hash, id, f.now, f.now + 2592000);
  return id;
}

export function pendingApproval(f, principalId = OTHER) {
  const id = crypto.randomUUID();
  const hash = id.replaceAll('-', '').padEnd(64, 'b');
  f.db.prepare(`INSERT INTO memory_device_requests
    (id, installation_id, repository_id, nonce_hash, secret_hash, credential_hash, comparison_code,
      label, scope, state, principal_id, membership_revision, approved_at, created_at, expires_at)
    SELECT ?, ?, ?, ?, ?, ?, 'ABCD2345', 'Pending laptop', 'memory:read memory:write',
      'approved', principal_id, revision, ?, ?, ? FROM memory_memberships WHERE principal_id = ?`)
    .run(id, INSTALLATION, REPOSITORY, hash, hash, hash, f.now, f.now, f.now + 600, principalId);
  return id;
}
