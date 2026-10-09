import { expect, it } from 'vitest';
import { owner, req, seeded } from '../../tests/employee-access/connections';
import { management } from './management';
import { catalogue } from './catalogue';
import { codeState } from './code';
import { authorizeRequest, currentPolicy } from './policy';
import { body } from '../../tests/body';
it('staging starts with practice people, two roles, one manager and key levels on, names who could only look, and holds no provider work or key', async () => {
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
    // The seed also names apps only WongStack's own repository builds, and a row for a folder this build lacks
    // counts for nothing: each set is what the seed gives, kept to the apps built here. Hello is in every build.
    const built = catalogue().filter(id => id !== 'access');
    expect(built).toContain('hello');
    const here = (apps: string[]) => apps.filter(id => built.includes(id));
    // One role held by two people, with one app and Project code; one role nobody holds; one person with every app
    // and Project code; one who holds no app and no key. Dana is the one manager.
    const helpers = { apps: ['hello'], keys: { cloudflare: 'read', code: 'read' } };
    const nothing = { apps: [], keys: {} };
    const dana = here(['hello', 'tips']);
    const sets = Object.fromEntries([...opened.roles, ...opened.people].map(({ name, email, apps, keys }) => [name ?? email, { apps, keys }]));
    expect(sets).toEqual({ Helpers: helpers, Trainees: nothing, 'ada@example.invalid': helpers, 'bo@example.invalid': helpers, 'casey@example.invalid': nothing,
      'dana@example.invalid': { apps: dana, keys: { cloudflare: 'read', code: 'read' } }, 'eli@example.invalid': nothing });
    expect(opened).toMatchObject({ environment: 'practice', key: 'practice', started: true, keysStarted: true,
      viewer: { email: owner.id, owner: true },
      roles: [{ name: 'Helpers' }, { name: 'Trainees' }], people: [
        { email: 'ada@example.invalid', status: 'active', role: opened.roles[0].id, manager: false },
        { email: 'bo@example.invalid', status: 'active', role: opened.roles[0].id, manager: false },
        { email: 'casey@example.invalid', status: 'removed', role: null, manager: false },
        { email: 'dana@example.invalid', status: 'active', role: null, manager: true },
        { email: 'eli@example.invalid', status: 'active', role: null, manager: false }] });
    // Every built app is listed but Access itself, by the words on its card.
    expect(opened.apps.map(app => app.id)).toEqual(built);
    expect(opened.apps.find(app => String(app.id) === 'hello')).toMatchObject({ title: 'Hello' });
    // Eli and the Trainees role could only look, which a tick can not say: a preview opens with both named, by the apps' titles.
    expect(opened.unticked).toMatchObject({ people: [{ email: 'eli@example.invalid' }], roles: [{ name: 'Trainees', apps: ['Hello'] }] });
    expect(opened.unticked.people[0].apps).toContain('Hello');
    expect(sql.prepare('SELECT email FROM wong_access_managers').all()).toEqual([{ email: 'dana@example.invalid' }]);
    // The supplied apps use no saved key; the Cloudflare key and Project code work alone.
    expect(opened.keys).toMatchObject([{ id: 'cloudflare', title: 'Cloudflare', levels: ['read'], saved: false, setup: true, alone: true },
      { id: 'code', title: 'Project code', levels: ['read'], saved: false, setup: false, alone: true }]);
    expect(await currentPolicy(env, practice('ada@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', apps: new Set(['hello']), keys: new Map([['cloudflare', 'read'], ['code', 'read']]) });
    expect(await currentPolicy(env, practice('casey@example.invalid'))).toEqual({ state: 'denied' });
    // Managing leaves Dana her own apps and levels, and lets her open the practice list as a manager.
    expect(await currentPolicy(env, practice('dana@example.invalid'))).toMatchObject({ state: 'current', role: 'employee', manages: true,
      apps: new Set(dana), keys: new Map([['cloudflare', 'read'], ['code', 'read']]) });
    // Eli holds no app: Hello is refused whole, a look-up too. Dana's Hello is whole.
    for (const [email, allowed] of [['eli@example.invalid', false], ['dana@example.invalid', true]] as const) {
      for (const need of ['read', 'write'] as const) expect((await authorizeRequest(env, practice(email), { apps: ['hello'] }, need)) === null, `${email} ${need}`).toBe(allowed);
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
    // The owner ticks Hello for Eli and saves: the names are gone, and Eli holds all of Hello.
    const saved = await body(await management(req('people', 'POST', { email: 'eli@example.invalid', removed: false, apps: { hello: true } }), env, owner));
    expect(saved.unticked).toEqual({ people: [], roles: [] });
    expect(await authorizeRequest(env, practice('eli@example.invalid'), { apps: ['hello'] })).toBeNull();
  } finally { sql.close(); }
});
