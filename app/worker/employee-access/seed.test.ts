import { expect, it } from 'vitest';
import { owner, req, seeded } from '../../tests/employee-access/connections';
import { management } from './management';
import { catalogue } from './catalogue';
import { codeState } from './code';
import { authorizeRequest, currentPolicy, policyAllows } from './policy';
import { body } from '../../tests/body';
it('staging starts with practice people, the Admin role and two more, one Admin and key levels on, names who could only look, and holds no provider work or key', async () => {
  const { sql, env, practice } = seeded();
  try {
    expect(sql.prepare('SELECT policy_enabled, keys_enabled, issuance_enabled, account_id, access_policy_id FROM wong_access_installation').get())
      .toEqual({ policy_enabled: 1, keys_enabled: 1, issuance_enabled: 0, account_id: '', access_policy_id: '' });
    expect(sql.prepare('SELECT email, status FROM wong_access_members ORDER BY email').all()).toEqual([
      { email: 'ada@example.invalid', status: 'active' }, { email: 'bo@example.invalid', status: 'active' }, { email: 'casey@example.invalid', status: 'removed' },
      { email: 'dana@example.invalid', status: 'active' }, { email: 'eli@example.invalid', status: 'active' }, { email: 'fay@example.invalid', status: 'active' },
    ]);
    for (const table of ['wong_access_connections', 'wong_access_work', 'wong_access_policy_writes']) {
      expect(sql.prepare(`SELECT COUNT(*) count FROM ${table}`).get()).toEqual({ count: 0 });
    }
    const opened = await body(await management(req('status', 'GET'), env, owner));
    const built = catalogue().filter(id => id !== 'access');
    expect(built).toContain('hello');
    // One role held by two people, with one app and Project code; one role nobody holds; one person with Hello and
    // Project code; one who holds no app and no key. Fay is the one Admin: every app and key.
    const helpers = { apps: ['hello'], keys: { cloudflare: 'read', code: 'read' } };
    const nothing = { apps: [], keys: {} };
    const dana = ['hello'];
    const everything = { apps: built, keys: { cloudflare: 'read', code: 'write' } };
    const sets = Object.fromEntries([...opened.roles, ...opened.people].map(({ name, email, apps, keys }) => [name ?? email, { apps, keys }]));
    expect(sets).toEqual({ Admin: everything, 'fay@example.invalid': everything, Helpers: helpers, Trainees: nothing, 'ada@example.invalid': helpers, 'bo@example.invalid': helpers, 'casey@example.invalid': nothing,
      'dana@example.invalid': { apps: dana, keys: { cloudflare: 'read', code: 'write' } }, 'eli@example.invalid': nothing });
    expect(opened).toMatchObject({ environment: 'practice', key: 'practice', started: true, keysStarted: true,
      viewer: { email: owner.id, owner: true },
      roles: [{ id: 'admin', name: 'Admin', builtIn: true }, { name: 'Helpers', builtIn: false }, { name: 'Trainees', builtIn: false }], people: [
        { email: 'ada@example.invalid', status: 'active', role: opened.roles[1].id },
        { email: 'bo@example.invalid', status: 'active', role: opened.roles[1].id },
        { email: 'casey@example.invalid', status: 'removed', role: null },
        { email: 'dana@example.invalid', status: 'active', role: null },
        { email: 'eli@example.invalid', status: 'active', role: null },
        { email: 'fay@example.invalid', status: 'active', role: 'admin' }] });
    // Every built app is listed but Access itself, by the words on its card.
    expect(opened.apps.map(app => app.id)).toEqual(built);
    expect(opened.apps.find(app => String(app.id) === 'hello')).toMatchObject({ title: 'Hello' });
    // Eli and the Trainees role could only look, which a tick can not say: a preview opens naming both, by app title.
    expect(opened.unticked).toMatchObject({ people: [{ email: 'eli@example.invalid' }], roles: [{ name: 'Trainees', apps: ['Hello'] }] });
    expect(opened.unticked.people[0].apps).toContain('Hello');
    // The old manager switch is seeded with nobody, and nothing is stored for what Admin gives.
    expect(sql.prepare('SELECT email FROM wong_access_managers').all()).toEqual([]);
    expect(sql.prepare("SELECT COUNT(*) count FROM wong_access_role_apps WHERE role_id = 'admin'").get()).toEqual({ count: 0 });
    // The supplied apps use no saved key; the Cloudflare key and Project code work alone.
    expect(opened.keys).toMatchObject([{ id: 'cloudflare', title: 'Cloudflare', levels: ['read'], saved: false, setup: true, alone: true },
      { id: 'code', title: 'Project code', levels: ['read', 'write'], saved: false, setup: false, alone: true }]);
    expect(await currentPolicy(env, practice('ada@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', apps: new Set(['hello']), keys: new Map([['cloudflare', 'read'], ['code', 'read']]) });
    expect(await currentPolicy(env, practice('casey@example.invalid'))).toEqual({ state: 'denied' });
    // Dana has her own apps and levels and manages nothing.
    // Fay, the Admin, has every built app and key and opens the practice list.
    expect(await currentPolicy(env, practice('dana@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', manages: false,
      apps: new Set(dana), keys: new Map([['cloudflare', 'read'], ['code', 'write']]) });
    expect(await currentPolicy(env, practice('fay@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', manages: true,
      apps: new Set(catalogue()), keys: new Map([['cloudflare', 'read'], ['code', 'write']]) });
    expect((await management(req('status', 'GET'), env, practice('dana@example.invalid'))).status).toBe(403);
    // Eli holds no app: Hello is refused whole, a look-up too. Dana's Hello is whole.
    for (const [email, allowed] of [['eli@example.invalid', false], ['dana@example.invalid', true]] as const) {
      for (const need of ['read', 'write'] as const) expect((await authorizeRequest(env, practice(email), { apps: ['hello'] }, need)) === null, `${email} ${need}`).toBe(allowed);
    }
    expect(await (await management(req('status', 'GET'), env, practice('fay@example.invalid'))).json())
      .toMatchObject({ viewer: { email: 'fay@example.invalid', owner: false }, environment: 'practice' });
    for (const [email, allowed] of [['bo@example.invalid', true], ['dana@example.invalid', true], ['eli@example.invalid', false], ['fay@example.invalid', true]] as const) {
      expect((await authorizeRequest(env, practice(email), { keys: ['cloudflare'] }, 'read')) === null, email).toBe(allowed);
    }
    // The role's two people and Dana may connect with the project once a preview hands it out; Eli sees Connect greyed.
    const handing = { ...env, WONG_CODE_REPOSITORY: 'acme/recipe-box', WONG_CODE_READ: 'synthetic-read-only' };
    for (const [email, state] of [['ada@example.invalid', 'ready'], ['bo@example.invalid', 'ready'], ['dana@example.invalid', 'ready'], ['eli@example.invalid', 'lacked']] as const) {
      expect(codeState(handing, await currentPolicy(handing, practice(email)), true), email).toBe(state);
    }
    // The owner ticks Hello for Eli and saves: the names are gone, and Eli holds all of Hello.
    const saved = await body(await management(req('people', 'POST', { email: 'eli@example.invalid', removed: false, apps: { hello: true } }), env, owner));
    expect(saved.unticked).toEqual({ people: [], roles: [] });
    expect(await authorizeRequest(env, practice('eli@example.invalid'), { apps: ['hello'] })).toBeNull();
  } finally { sql.close(); }
});

it('on a preview, a signed-in person the practice list does not name gets every app and key, and manages nothing', async () => {
  const { sql, env, practice } = seeded();
  try {
    const pusher = practice('pusher@example.invalid');
    const opened = await currentPolicy(env, pusher);
    expect(opened).toMatchObject({ state: 'current', role: 'employee', manages: false, apps: new Set(catalogue()), keysStarted: true,
      keys: new Map([['cloudflare', 'read'], ['code', 'write']]) });
    expect([policyAllows(opened, { apps: ['hello'] }), policyAllows(opened, { kind: 'owner' })]).toEqual([true, false]);
    expect((await management(req('status', 'GET'), env, pusher)).status).toBe(403);
    // The live app refuses them, and a service token is no person.
    expect(await currentPolicy({ ...env, WONG_ENVIRONMENT: 'production' }, pusher)).toEqual({ state: 'denied' });
    expect(await currentPolicy(env, { ...pusher, kind: 'service' })).toEqual({ state: 'denied' });
    sql.exec('UPDATE wong_access_installation SET keys_enabled = 0');
    expect(await currentPolicy(env, pusher)).toMatchObject({ state: 'current', keys: null, keysStarted: false });
  } finally { sql.close(); }
});
