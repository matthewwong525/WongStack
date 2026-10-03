import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { machineMigrations } from '../../.agents/skills/memory/scripts/lib/machine-migrations.mjs';
import { memoryMigrations } from '../../.agents/skills/memory/scripts/lib/installation-migrations.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { machineTables, machineTriggers } from '../../.agents/skills/memory/scripts/lib/machine-state.mjs';
import { migrationFiles, migrationSql, applyMigrations } from './fixtures/memory/identity.mjs';
import { enrolledMachineFixture, MACHINE } from './fixtures/memory/machines.mjs';

test('separate schema12 manifest covers all SQL bytes and preserves historical11 manifest', async () => {
  assert.equal(memoryMigrations.length, 11);
  assert.deepEqual(machineMigrations.slice(0, 11), memoryMigrations);
  assert.deepEqual(machineMigrations.map(row => row.filename), migrationFiles().filter(name => parseInt(name, 10) <= 12));
  for (const [index, row] of machineMigrations.entries()) {
    assert.equal(row.version, index + 1);
    assert.equal(await digest(migrationSql(row.filename)), row.sha256);
  }
});

test('migration12 is additive inactive structure; legacy authority and immutable schema11 receipt remain unchanged', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close()); db.exec('PRAGMA foreign_keys = ON');
  applyMigrations(db, 11);
  db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?, 'legacy@example.com','member','fixture')").run('a'.repeat(64));
  const before = db.prepare('SELECT * FROM memory_keys').all();
  const receiptDDL = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'memory_schema_receipts'").get().sql;
  db.exec(migrationSql(machineMigrations.at(-1).filename));
  assert.deepEqual(db.prepare('SELECT * FROM memory_keys').all(), before);
  assert.equal(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'memory_schema_receipts'").get().sql, receiptDDL);
  for (const name of machineTables) assert.equal(db.prepare(`SELECT count(*) n FROM ${name}`).get().n, 0);
  for (const name of machineTriggers) assert.ok(db.prepare('SELECT name FROM sqlite_master WHERE name = ?').get(name));
  assert.equal(db.prepare('SELECT count(*) n FROM memory_principals').get().n, 0);
});

test('enrollment uses one machine namespace compatible with existing immutable fact/session ownership FKs', async t => {
  const f = await enrolledMachineFixture(t);
  assert.equal(f.db.prepare('SELECT id FROM memory_principals').get().id, MACHINE);
  assert.equal(f.db.prepare('SELECT id FROM memory_machine_principals').get().id, MACHINE);
  f.db.prepare(`INSERT INTO sessions(id,agent,status,owner_principal_id,updated_at)
    VALUES('claude:machine-fixture','claude','private',?,'fixture')`).run(MACHINE);
  f.db.prepare(`INSERT INTO facts(slug,type,body,session_id,source,created_at,owner_principal_id)
    VALUES('machine-private','user','Synthetic private note','claude:machine-fixture','save','fixture',?)`).run(MACHINE);
  assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.throws(() => f.db.prepare("UPDATE facts SET owner_principal_id = ?").run('q'.repeat(32)), /immutable/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_identity_bindings').get().n, 0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_memberships').get().n, 0);
});

test('receipts and tombstones are retained; credentials/grants cannot be rewritten outside maintenance', async t => {
  const f = await enrolledMachineFixture(t);
  for (const table of ['audit','manifest_receipts','bootstrap_completions','attempts','completions','credentials']) {
    assert.throws(() => f.db.exec(`UPDATE memory_machine_${table} SET ${table === 'credentials' ? 'hash' : table === 'attempts' || table === 'audit' ? 'id' : 'request_hash'} = 'bad'`), /immutable/);
    assert.throws(() => f.db.exec(`DELETE FROM memory_machine_${table}`), /retained/);
  }
  for (const table of ['configuration','grants','principals']) assert.throws(() => f.db.exec(`DELETE FROM memory_machine_${table}`), /retained/);
  assert.throws(() => f.db.exec("UPDATE memory_machine_grants SET scope = 'memory:read memory:write memory:admin', revision = revision + 1"), /maintenance|widen/);
  assert.throws(() => f.db.exec("UPDATE memory_machine_principals SET status = 'revoked', revision = revision + 1"), /maintenance/);
  assert.throws(() => f.db.exec("UPDATE memory_machine_configuration SET state = 'pending', auth_revision = auth_revision + 1"), /exact attempt barrier/);
});
