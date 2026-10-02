// Disposable schema fixtures. IDs and hashes here are synthetic, never live credentials.
import { readFileSync, readdirSync } from 'node:fs';

export const INSTALLATION = 'i'.repeat(32);
export const REPOSITORY = 'r'.repeat(32);
export const PRINCIPAL = 'p'.repeat(32);
export const OTHER = 'q'.repeat(32);
export const REQUEST = 'a'.repeat(32);
export const DEVICE = 'd'.repeat(32);
export const HASH = 'a'.repeat(64);
const migrations = new URL('../../../../.agents/skills/memory/migrations/', import.meta.url);
export const migrationFiles = () => readdirSync(migrations).filter(name => name.endsWith('.sql')).sort();
export const migrationSql = file => readFileSync(new URL(file, migrations), 'utf8');

export function applyMigrations(db, through = 9) {
  for (const file of migrationFiles().filter(name => parseInt(name, 10) <= through)) {
    const version = parseInt(file, 10);
    if (db.prepare("SELECT name FROM sqlite_master WHERE name = 'schema_migrations'").get()
      && db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version)) continue;
    db.exec('BEGIN');
    try {
      db.exec(migrationSql(file));
      db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, 'fixture');
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
}

export function identityFixture(db) {
  applyMigrations(db);
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`INSERT INTO memory_installation (singleton, installation_id, repository_id, account_id, database_id, canonical_origin, created_at)
    VALUES (1, ?, ?, 'fixture-account', 'fixture-database', 'https://fixture.example', ?)`).run(INSTALLATION, REPOSITORY, now);
  for (const id of [PRINCIPAL, OTHER]) {
    db.prepare('INSERT INTO memory_principals (id, installation_id, created_at) VALUES (?, ?, ?)').run(id, INSTALLATION, now);
    db.prepare(`INSERT INTO memory_memberships (installation_id, repository_id, principal_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'member', 'active', ?, ?)`).run(INSTALLATION, REPOSITORY, id, now, now);
  }
  db.prepare(`INSERT INTO memory_providers (id, installation_id, issuer, audience, status, created_at)
    VALUES ('provider', ?, 'https://fixture.cloudflareaccess.com', 'fixture-audience', 'active', ?)`).run(INSTALLATION, now);
  return now;
}

export function approvedRequest(db, now, id = REQUEST, hash = HASH) {
  db.prepare(`INSERT INTO memory_device_requests (id, installation_id, repository_id, nonce_hash, secret_hash, credential_hash,
    comparison_code, label, scope, state, principal_id, membership_revision, approved_at, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ABCD2345', 'Fixture laptop', 'memory:read memory:write', 'approved', ?, 1, ?, ?, ?)`)
    .run(id, INSTALLATION, REPOSITORY, hash, 'b'.repeat(64), hash, PRINCIPAL, now, now, now + 600);
}

export const activateSql = `INSERT INTO memory_devices (id, request_id, installation_id, repository_id, principal_id, label,
  scope, membership_revision, approved_at, reauthorize_at)
  VALUES (?, ?, ?, ?, ?, 'Fixture laptop', 'memory:read memory:write', 1, ?, ?)`;
export const activationParams = (now, device = DEVICE, request = REQUEST) => [device, request, INSTALLATION, REPOSITORY, PRINCIPAL, now, now + 7776000];
