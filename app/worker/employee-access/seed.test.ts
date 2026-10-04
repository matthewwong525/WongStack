import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { database, owner, req } from '../../tests/employee-access/connections';
import { management } from './management';
import { currentPolicy } from './policy';
it('staging starts with practice people and permissions on, and holds no provider work or key', async () => {
  const { sql, DB } = database();
  try {
    sql.exec(readFileSync(new URL('../../../schema/seed.sql', import.meta.url), 'utf8'));
    expect(sql.prepare('SELECT policy_enabled, issuance_enabled, account_id, access_policy_id FROM wong_access_installation').get())
      .toEqual({ policy_enabled: 1, issuance_enabled: 0, account_id: '', access_policy_id: '' });
    expect(sql.prepare('SELECT email, status FROM wong_access_members ORDER BY email').all()).toEqual([
      { email: 'ada@example.invalid', status: 'active' }, { email: 'bo@example.invalid', status: 'active' }, { email: 'casey@example.invalid', status: 'removed' },
    ]);
    expect(sql.prepare('SELECT email, app_id FROM wong_access_grants').all()).toEqual([{ email: 'ada@example.invalid', app_id: 'hello' }]);
    for (const table of ['wong_access_connections', 'wong_access_work', 'wong_access_policy_writes']) {
      expect(sql.prepare(`SELECT COUNT(*) count FROM ${table}`).get()).toEqual({ count: 0 });
    }
    // The committed owner email, not the seeded row, decides who manages the practice list.
    const env = { DB, WONG_ENVIRONMENT: 'staging', WONG_OWNER_EMAIL: owner.id };
    const opened = await (await management(req('status', 'GET'), env, owner)).json();
    expect(opened).toMatchObject({ environment: 'practice', key: 'practice', started: true, people: [
      { email: 'ada@example.invalid', status: 'active', apps: ['hello'] }, { email: 'bo@example.invalid', status: 'active', apps: [] },
      { email: 'casey@example.invalid', status: 'removed', apps: [] }] });
    const practice = (email: string) => currentPolicy(env, { ...owner, id: email, claims: { ...owner.claims, email } });
    expect(await practice('ada@example.invalid')).toMatchObject({ state: 'current', role: 'employee', apps: new Set(['hello']) });
    expect(await practice('casey@example.invalid')).toEqual({ state: 'denied' });
  } finally { sql.close(); }
});
