import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
it('isolated staging seed represents assigned, zero-app and removed people without enabling any authority', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    for (const file of ['0001_employee_access.sql', '0002_employee_connections.sql']) db.exec(readFileSync(new URL(`../../../schema/migrations/${file}`, import.meta.url), 'utf8'));
    db.exec(readFileSync(new URL('../../../schema/seed.sql', import.meta.url), 'utf8'));
    expect(db.prepare('SELECT origin, policy_enabled, issuance_enabled FROM wong_access_installation').get()).toEqual({ origin: 'https://access-fixture.example.invalid', policy_enabled: 0, issuance_enabled: 0 });
    expect(db.prepare('SELECT email, status FROM wong_access_members ORDER BY email').all()).toEqual([
      { email: 'ada@example.invalid', status: 'active' }, { email: 'bo@example.invalid', status: 'active' }, { email: 'casey@example.invalid', status: 'removed' },
    ]);
    expect(db.prepare('SELECT email, app_id FROM wong_access_grants').all()).toEqual([{ email: 'ada@example.invalid', app_id: 'hello' }]);
    expect(db.prepare('SELECT COUNT(*) count FROM wong_access_connections').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT kind, status FROM wong_access_work ORDER BY kind').all()).toEqual([{ kind: 'policy', status: 'failed' }, { kind: 'sessions', status: 'ready' }]);
  } finally { db.close(); }
});
