import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { applyMigrations, identityFixture, migrationFiles, migrationSql, INSTALLATION, PRINCIPAL, OTHER, HASH } from './fixtures/memory/identity.mjs';

function database(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

for (const version of [0, 1, 5, 6]) {
  test(`identity migration prepares schema ${version} without assigning legacy ownership or cutting over`, t => {
    const db = database(t);
    applyMigrations(db, version);
    if (version) {
      db.exec(`INSERT INTO sessions (id, agent, author, status, raw_key, updated_at)
        VALUES ('legacy-session', 'claude', 'old@example.com', 'captured', 'old@example.com/raw', 'then');
        INSERT INTO facts (slug, type, body, source, created_at, author, session_id)
        VALUES ('legacy', 'user', 'Original private fact.', 'save', 'then', 'old@example.com', 'legacy-session')`);
    }
    if (version >= 5) db.exec(`INSERT INTO memory_keys (hash, email, role, created_at, expires_at)
      VALUES ('legacy-hash', 'old@example.com', 'admin', 'then', 'later')`);
    applyMigrations(db);
    assert.equal(db.prepare('SELECT count(*) AS n FROM memory_installation').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) AS n FROM memory_principals').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) AS n FROM memory_ownership_mappings').get().n, 0);
    if (version) {
      assert.deepEqual({ ...db.prepare('SELECT body, author, owner_principal_id FROM facts').get() },
        { body: 'Original private fact.', author: 'old@example.com', owner_principal_id: null });
      assert.equal(db.prepare('SELECT raw_key FROM sessions').get().raw_key, 'old@example.com/raw');
    }
    if (version >= 5) assert.equal(db.prepare('SELECT hash FROM memory_keys').get().hash, 'legacy-hash');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    const before = db.prepare('SELECT count(*) AS n FROM sqlite_master').get().n;
    applyMigrations(db);
    assert.equal(db.prepare('SELECT count(*) AS n FROM sqlite_master').get().n, before);
  });
}

test('interrupted migrations roll back together and a lost completion response reruns safely', t => {
  const db = database(t);
  applyMigrations(db, 6);
  for (const file of migrationFiles().filter(name => parseInt(name, 10) >= 7)) {
    const version = parseInt(file, 10);
    db.exec('BEGIN');
    assert.throws(() => db.exec(`${migrationSql(file)}\nSELECT * FROM simulated_interruption;`), /simulated_interruption/);
    db.exec('ROLLBACK');
    assert.equal(db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version), undefined);
    db.exec('BEGIN');
    db.exec(migrationSql(file));
    db.exec('COMMIT');
    // The CLI never got to its separate marker write; the SQL itself recorded success.
    assert.equal(db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version).version, version);
    applyMigrations(db, version);
  }
});

test('ownership foreign keys and immutable attribution survive exact reviewed mappings', t => {
  const db = database(t);
  const now = identityFixture(db);
  db.prepare(`INSERT INTO facts (slug, type, body, source, created_at, author, owner_principal_id)
    VALUES ('test', 'user', 'Preserve my words.', 'save', 'then', 'old@example.com', ?)`).run(PRINCIPAL);
  assert.throws(() => db.prepare('UPDATE facts SET owner_principal_id = ?').run(OTHER), /ownership is immutable/);
  assert.throws(() => db.exec('UPDATE facts SET owner_principal_id = NULL'), /ownership is immutable/);
  assert.throws(() => db.exec("UPDATE facts SET author = 'new@example.com'"), /never edited/);
  assert.throws(() => db.exec("INSERT INTO sessions (id, agent, status, updated_at, owner_principal_id) VALUES ('bad', 'claude', 'captured', 'now', 'unknown')"), /FOREIGN KEY/);
  db.prepare("INSERT INTO sessions (id, agent, status, updated_at, owner_principal_id) VALUES ('session', 'claude', 'captured', 'now', ?)").run(PRINCIPAL);
  assert.throws(() => db.exec('UPDATE sessions SET owner_principal_id = NULL'), /ownership is immutable/);
  const map = db.prepare(`INSERT INTO memory_ownership_mappings
    (id, installation_id, principal_id, actor_principal_id, raw_key, evidence_type, evidence_ref, snapshot_hash, supersedes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'private-review-reference', ?, ?, ?)`);
  map.run('first', INSTALLATION, PRINCIPAL, PRINCIPAL, 'old@example.com/one', 'operator-provenance', HASH, null, now);
  assert.throws(() => map.run('duplicate', INSTALLATION, OTHER, PRINCIPAL, 'old@example.com/one', 'operator-provenance', HASH, null, now), /UNIQUE/);
  assert.throws(() => map.run('wrong-object', INSTALLATION, OTHER, PRINCIPAL, 'old@example.com/two', 'correction', HASH, 'first', now), /same exact record/);
  map.run('corrected', INSTALLATION, OTHER, PRINCIPAL, 'old@example.com/one', 'correction', HASH, 'first', now);
  assert.throws(() => db.exec('DELETE FROM memory_ownership_mappings'), /history is retained/);
  assert.throws(() => db.exec("UPDATE memory_ownership_mappings SET evidence_ref = 'replace'"), /history is immutable/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM memory_ownership_mappings').get().n, 2);
});

test('verified bindings retain tombstones and one-time invitations and owner intents cannot replay', t => {
  const db = database(t);
  const now = identityFixture(db);
  db.prepare(`INSERT INTO memory_identity_bindings (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status, created_at, updated_at)
    VALUES ('binding', ?, 'provider', ?, 'https://fixture.cloudflareaccess.com', 'subject', 'fixture@example.com', 'active', ?, ?)`).run(INSTALLATION, PRINCIPAL, now, now);
  db.exec("UPDATE memory_identity_bindings SET status = 'retired'");
  assert.throws(() => db.exec("UPDATE memory_identity_bindings SET status = 'active'"), /cannot be reassigned or revived/);
  assert.throws(() => db.exec('DELETE FROM memory_identity_bindings'), /tombstones/);
  db.prepare(`INSERT INTO memory_owner_intents (installation_id, provider_id, email, created_at) VALUES (?, 'provider', 'fixture@example.com', ?)`).run(INSTALLATION, now);
  const consume = db.prepare("UPDATE memory_owner_intents SET state = 'consumed', owner_principal_id = ? WHERE state = 'pending'");
  assert.equal(consume.run(PRINCIPAL).changes, 1);
  assert.equal(consume.run(OTHER).changes, 0);
  assert.throws(() => db.exec("UPDATE memory_owner_intents SET state = 'pending', owner_principal_id = NULL"), /already confirmed/);
  const repository = db.prepare('SELECT repository_id FROM memory_installation').get().repository_id;
  db.prepare(`INSERT INTO memory_invitations (id, repository_id, email, role, actor_principal_id, created_at, expires_at)
    VALUES ('invite', ?, 'invited@example.com', 'reader', ?, ?, ?)`).run(repository, PRINCIPAL, now, now + 604800);
  db.prepare("UPDATE memory_invitations SET state = 'consumed', consumed_principal_id = ?").run(OTHER);
  assert.throws(() => db.exec("UPDATE memory_invitations SET state = 'pending', consumed_principal_id = NULL"), /already ended/);
  assert.throws(() => db.exec("UPDATE memory_memberships SET status = 'removed'"), /new revision/);
});


test('unbound verified humans can hold CSRF proofs and reused logins require explicit reviewed replacements', t => {
  const db = database(t);
  const now = identityFixture(db);
  db.prepare(`INSERT INTO memory_csrf_proofs (hash, installation_id, provider_id, issuer, subject, session_hash, created_at, expires_at)
    VALUES (?, ?, 'provider', 'https://fixture.cloudflareaccess.com', 'unbound-subject', ?, ?, ?)`)
    .run(HASH, INSTALLATION, 'b'.repeat(64), now, now + 600);
  assert.equal(db.prepare('SELECT binding_id FROM memory_csrf_proofs').get().binding_id, null);
  const binding = db.prepare(`INSERT INTO memory_identity_bindings
    (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status, created_at, updated_at, replaces_binding_id, evidence_ref)
    VALUES (?, ?, 'provider', ?, 'https://fixture.cloudflareaccess.com', 'reused-subject', 'reused@example.com', 'active', ?, ?, ?, ?)`);
  binding.run('first', INSTALLATION, PRINCIPAL, now, now, null, null);
  assert.throws(() => binding.run('implicit', INSTALLATION, OTHER, now, now, null, null), /reviewed retired binding replacement/);
  db.exec("UPDATE memory_identity_bindings SET status = 'retired' WHERE id = 'first'");
  assert.throws(() => binding.run('implicit', INSTALLATION, OTHER, now, now, null, null), /reviewed retired binding replacement/);
  binding.run('reviewed', INSTALLATION, OTHER, now, now, 'first', 'private-owner-review');
  assert.equal(db.prepare("SELECT principal_id FROM memory_identity_bindings WHERE status = 'active'").get().principal_id, OTHER);
  assert.equal(db.prepare("SELECT principal_id FROM memory_identity_bindings WHERE status = 'retired'").get().principal_id, PRINCIPAL);
});
