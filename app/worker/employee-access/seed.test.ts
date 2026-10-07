import { expect, it } from 'vitest';
import { owner, req, seeded } from '../../tests/employee-access/connections';
import { management } from './management';
import { catalogue } from './catalogue';
import { codeState } from './code';
import { authorizeRequest, currentPolicy } from './policy';
import { body } from '../../tests/body';
it('staging starts with practice people at differing levels, a role, one manager and key levels on, and holds no provider work or key', async () => {
  const { sql, env, practice } = seeded();
  try {
    expect(sql.prepare('SELECT policy_enabled, keys_enabled, issuance_enabled, account_id, access_policy_id FROM wong_access_installation').get())
      .toEqual({ policy_enabled: 1, keys_enabled: 1, issuance_enabled: 0, account_id: '', access_policy_id: '' });
    expect(sql.prepare('SELECT email, status FROM wong_access_members ORDER BY email').all()).toEqual([
      { email: 'ada@example.invalid', status: 'active' }, { email: 'bo@example.invalid', status: 'active' }, { email: 'casey@example.invalid', status: 'removed' },
      { email: 'dana@example.invalid', status: 'active' }, { email: 'eli@example.invalid', status: 'active' },
    ]);
    for (const table of ['wong_access_connections', 'wong_access_work', 'wong_access_policy_writes']) {
      expect(sql.prepare(`SELECT COUNT(*) count FROM ${table}`).get()).toEqual({ count: 0 });
    }
    const opened = await body(await management(req('status', 'GET'), env, owner));
    // The seed also names areas only WongStack's own repository builds, and a level for a folder this build lacks
    // counts for nothing: each set is what the seed gives, kept to the areas built here. Hello is in every build.
    const built = catalogue().filter(id => id !== 'access');
    expect(built).toContain('hello');
    const here = (levels: Record<string, string>) => Object.fromEntries(Object.entries(levels).filter(([id]) => built.includes(id)));
    // One role held by two people, with one app and Project code; one person who changes things everywhere, with Project code;
    // one who looks things up and holds no key. Dana is the one manager.
    const helpers = { apps: { hello: 'write' }, keys: { cloudflare: 'read', code: 'read' } };
    const dana = here({ hello: 'write', tips: 'write', sample: 'write' });
    const sets = Object.fromEntries([...opened.roles, ...opened.people].map(({ name, email, apps, keys }) => [name ?? email, { apps, keys }]));
    expect(sets).toEqual({ Helpers: helpers, 'ada@example.invalid': helpers, 'bo@example.invalid': helpers, 'casey@example.invalid': { apps: {}, keys: {} },
      'dana@example.invalid': { apps: dana, keys: { cloudflare: 'read', code: 'read' } },
      'eli@example.invalid': { apps: here({ hello: 'read', tips: 'read', sample: 'write' }), keys: {} } });
    expect(opened).toMatchObject({ environment: 'practice', key: 'practice', started: true, keysStarted: true, kept: 0,
      viewer: { email: owner.id, owner: true },
      roles: [{ name: 'Helpers' }], people: [
        { email: 'ada@example.invalid', status: 'active', role: opened.roles[0].id, manager: false },
        { email: 'bo@example.invalid', status: 'active', role: opened.roles[0].id, manager: false },
        { email: 'casey@example.invalid', status: 'removed', role: null, manager: false },
        { email: 'dana@example.invalid', status: 'active', role: null, manager: true },
        { email: 'eli@example.invalid', status: 'active', role: null, manager: false }] });
    // Every built area is listed but Access itself, and a skill is listed only by areas this build holds.
    expect(opened.areas.map(area => area.id)).toEqual(built);
    expect(opened.areas.find(area => String(area.id) === 'hello')).toMatchObject({ title: 'Hello', screen: true });
    for (const skill of opened.skills) expect(built, String(skill.id)).toEqual(expect.arrayContaining(Object.keys(skill.areas)));
    expect(sql.prepare('SELECT email FROM wong_access_managers').all()).toEqual([{ email: 'dana@example.invalid' }]);
    // The supplied apps use no saved key; the Cloudflare key and Project code work alone.
    expect(opened.keys).toMatchObject([{ id: 'cloudflare', title: 'Cloudflare', levels: ['read'], saved: false, setup: true, usedBy: [], alone: true },
      { id: 'code', title: 'Project code', levels: ['read'], saved: false, setup: false, usedBy: [], alone: true }]);
    expect(await currentPolicy(env, practice('ada@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', apps: new Map([['hello', 'write']]), keys: new Map([['cloudflare', 'read'], ['code', 'read']]) });
    expect(await currentPolicy(env, practice('casey@example.invalid'))).toEqual({ state: 'denied' });
    // Managing leaves Dana her own apps and levels, and lets her open the practice list as a manager.
    expect(await currentPolicy(env, practice('dana@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', manages: true,
      apps: new Map(Object.entries(dana).sort()), keys: new Map([['cloudflare', 'read'], ['code', 'read']]) });
    // Eli looks things up in Hello and changes nothing there.
    for (const [need, allowed] of [['read', true], ['write', false]] as const) {
      expect((await authorizeRequest(env, practice('eli@example.invalid'), { apps: ['hello'] }, need)) === null, need).toBe(allowed);
    }
    expect(await (await management(req('status', 'GET'), env, practice('dana@example.invalid'))).json())
      .toMatchObject({ viewer: { email: 'dana@example.invalid', owner: false }, environment: 'practice' });
    for (const [email, allowed] of [['bo@example.invalid', true], ['dana@example.invalid', true], ['eli@example.invalid', false]] as const) {
      expect((await authorizeRequest(env, practice(email), { keys: ['cloudflare'] }, 'read')) === null, email).toBe(allowed);
    }
    // The role's two people and Dana may connect with the project once a preview can hand it out; Eli sees Connect greyed.
    const handing = { ...env, WONG_CODE_REPOSITORY: 'acme/recipe-box', WONG_CODE_READ: 'synthetic-read-only' };
    for (const [email, state] of [['ada@example.invalid', 'ready'], ['bo@example.invalid', 'ready'], ['dana@example.invalid', 'ready'], ['eli@example.invalid', 'lacked']] as const) {
      expect(codeState(handing, await currentPolicy(handing, practice(email)), true), email).toBe(state);
    }
  } finally { sql.close(); }
});
