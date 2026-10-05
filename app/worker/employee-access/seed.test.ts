import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { database, owner, req } from '../../tests/employee-access/connections';
import { management } from './management';
import { authorizeRequest, currentPolicy } from './policy';
it('staging starts with practice people, a role and key levels on, and holds no provider work or key', async () => {
  const { sql, DB } = database();
  try {
    sql.exec(readFileSync(new URL('../../../schema/seed.sql', import.meta.url), 'utf8'));
    expect(sql.prepare('SELECT policy_enabled, keys_enabled, issuance_enabled, account_id, access_policy_id FROM wong_access_installation').get())
      .toEqual({ policy_enabled: 1, keys_enabled: 1, issuance_enabled: 0, account_id: '', access_policy_id: '' });
    expect(sql.prepare('SELECT email, status FROM wong_access_members ORDER BY email').all()).toEqual([
      { email: 'ada@example.invalid', status: 'active' }, { email: 'bo@example.invalid', status: 'active' }, { email: 'casey@example.invalid', status: 'removed' },
      { email: 'dana@example.invalid', status: 'active' }, { email: 'eli@example.invalid', status: 'active' },
    ]);
    for (const table of ['wong_access_connections', 'wong_access_work', 'wong_access_policy_writes']) {
      expect(sql.prepare(`SELECT COUNT(*) count FROM ${table}`).get()).toEqual({ count: 0 });
    }
    // The committed owner email, not the seeded row, decides who manages the practice list.
    const env = { DB, WONG_ENVIRONMENT: 'staging', WONG_OWNER_EMAIL: owner.id };
    const opened = await (await management(req('status', 'GET'), env, owner)).json();
    // One role held by two people, one person with their own set at Read, and one at None.
    expect(opened).toMatchObject({ environment: 'practice', key: 'practice', started: true, keysStarted: true, kept: 0,
      roles: [{ name: 'Helpers', apps: ['hello'], keys: { cloudflare: 'read' } }], people: [
        { email: 'ada@example.invalid', status: 'active', role: opened.roles[0].id, apps: ['hello'], keys: { cloudflare: 'read' } },
        { email: 'bo@example.invalid', status: 'active', role: opened.roles[0].id, apps: ['hello'], keys: { cloudflare: 'read' } },
        { email: 'casey@example.invalid', status: 'removed', role: null, apps: [], keys: {} },
        { email: 'dana@example.invalid', status: 'active', role: null, apps: ['hello', 'tips'], keys: { cloudflare: 'read' } },
        { email: 'eli@example.invalid', status: 'active', role: null, apps: ['tips'], keys: {} }] });
    // The supplied apps use no saved key; the Cloudflare key works alone.
    expect(opened.keys).toMatchObject([{ id: 'cloudflare', title: 'Cloudflare', levels: ['read'], saved: false, setup: true, usedBy: [], alone: true }]);
    const practice = (email: string) => ({ ...owner, id: email, claims: { ...owner.claims, email } });
    expect(await currentPolicy(env, practice('ada@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', apps: new Set(['hello']), keys: new Map([['cloudflare', 'read']]) });
    expect(await currentPolicy(env, practice('casey@example.invalid'))).toEqual({ state: 'denied' });
    for (const [email, allowed] of [['bo@example.invalid', true], ['dana@example.invalid', true], ['eli@example.invalid', false]] as const) {
      expect((await authorizeRequest(env, practice(email), { keys: ['cloudflare'] }, 'read')) === null, email).toBe(allowed);
    }
  } finally { sql.close(); }
});
