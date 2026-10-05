import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cloudflare, fixture, owner, employee, site, req } from '../../tests/employee-access/connections';
import { accessStatus } from './members';
import { management } from './management';
import { mainRouteInventory } from '../api/router';
import { setupStatus } from './setup';
import { handleAccess } from './router';
import { lease } from './core';
import { authorizeRequest, currentPolicy } from './policy';
import type { AccessIdentity } from '../access';

vi.mock('./catalogue.ts', () => ({ catalogue: ['access', 'orders', 'payroll'] }));
let f: ReturnType<typeof fixture>;
let cf: ReturnType<typeof cloudflare>['state'];
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  f = fixture();
  const fake = cloudflare(); cf = fake.state; fetch = vi.fn(fake.fetch);
  vi.stubGlobal('fetch', fetch);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });
const run = (path: string, method = 'POST', body?: unknown, env = f.env) => management(req(path, method, body), env, owner);
const person = (email: string, apps: string[] = [], removed = false) => ({ email, apps, removed });
const staging = () => ({ ...f.env, WONG_ENVIRONMENT: 'staging', WONG_ACCESS_LOGIN_MANAGEMENT: undefined });
// Kim is a person the owner makes a manager; `ask` is a request from whoever signs in.
const kim: AccessIdentity = { ...employee, id: 'kim@example.com', claims: { ...employee.claims, email: 'kim@example.com', sub: 'kim-subject' } };
const ask = (identity: AccessIdentity, path: string, body?: unknown, method = 'POST') => management(req(path, method, body), f.env, identity);
const pick = (email: string, apps: string[] = [], manager = true) => run('people', 'POST', { ...person(email, apps), manager });
const managers = () => f.sql.prepare('SELECT email FROM wong_access_managers ORDER BY email').all().map(row => row.email);
const acted = () => f.sql.prepare("SELECT actor_email, event FROM wong_access_audit WHERE event NOT LIKE '%started:%' ORDER BY rowid").all()
  .map(row => `${row.actor_email} ${row.event}`);
const refusedAs = async (identity: AccessIdentity, path: string, body: unknown, code = 'owner_required', method = 'POST') => {
  const refused = await ask(identity, path, body, method);
  expect([refused.status, await refused.json()], `${path} ${JSON.stringify(body)}`).toEqual([403, { code }]);
};

it('keeps a finite set of owner operations and refuses everyone else before any work', async () => {
  for (const path of ['unknown', 'identity', 'activate', 'login/connect', 'prepare', 'rollout', 'token', 'github/start']) expect((await run(path)).status).toBe(404);
  expect((await run('status', 'GET')).status).toBe(200);
  expect((await run('status', 'PUT')).status).toBe(405);
  expect((await run('people', 'GET')).status).toBe(404);
  expect((await run('status')).status).toBe(404);
  for (const path of ['status', 'people', 'retry']) {
    for (const identity of [employee, { ...owner, kind: 'service' as const }]) {
      const refused = await management(path === 'status' ? req(path, 'GET') : req(path, 'POST', person('taken@example.com')), f.env, identity);
      expect(refused.status).toBe(403); expect(await refused.json()).toEqual({ code: 'owner_required' });
    }
    // An open site with no sign-in, and an install with no recorded owner, report Access unavailable.
    expect((await management(req(path, 'GET'), f.env, null)).status).toBe(503);
    expect(await (await management(req(path, 'GET'), { ...f.env, WONG_OWNER_EMAIL: undefined }, owner)).json()).toEqual({ code: 'owner_setup_required' });
  }
  expect(f.sql.prepare('SELECT COUNT(*) count FROM wong_access_members').get()).toEqual({ count: 1 });
  expect(fetch).not.toHaveBeenCalled();
  const bodyless = new Request(`${site.origin}/api/access/people`, { method: 'POST', headers: { Origin: site.origin } });
  expect((await management(bodyless, f.env, owner)).status).toBe(400);
});

it('adds a person in one save: the choices commit, the sign-in list follows, and one status comes back', async () => {
  const saved = await run('people', 'POST', person('bo@example.com', ['orders']));
  expect(saved.status).toBe(200);
  const status = await saved.json();
  expect(status).toMatchObject({ ownerEmail: site.ownerEmail, environment: 'live', key: 'ready', started: true,
    apps: ['orders', 'payroll'], work: [{ kind: 'policy', status: 'ready', outcome: 'policy_readback_matches', error_code: null }],
    people: [{ email: 'bo@example.com', status: 'active', settled: true, apps: ['orders'] }, { email: employee.id, status: 'active', settled: true, apps: [] }] });
  // The owner sends people the website's address themselves: the status carries no app link.
  expect(status).not.toHaveProperty('origin');
  expect(cf.writes).toHaveLength(1);
  expect(cf.writes[0].include).toEqual([employee.id, 'bo@example.com', site.ownerEmail].sort().map(email => ({ email: { email } })));
  expect(f.sql.prepare('SELECT COUNT(*) count FROM wong_access_leases').get()).toEqual({ count: 0 });
  // An app choice is local: the next request sees it, and no provider call is made.
  await run('people', 'POST', person('bo@example.com', ['payroll']));
  expect(cf.writes).toHaveLength(1);
});

it('keeps a failed sign-in step pending for Try again, and the retry finishes it', async () => {
  cf.failPolicy = true;
  const saved = await (await run('people', 'POST', person('bo@example.com', ['orders']))).json();
  expect(saved).toMatchObject({ work: [{ kind: 'policy', status: 'failed', error_code: 'provider_unavailable' }],
    people: [{ email: 'bo@example.com', settled: false, apps: ['orders'] }, { email: employee.id, settled: true }] });
  cf.failPolicy = false;
  // The failed write's outcome is unknown until it can no longer land.
  expect(await (await run('retry')).json()).toMatchObject({ work: [{ status: 'pending', outcome: 'previous_policy_write_unresolved' }], people: [{ settled: false }, { settled: true }] });
  f.sql.exec("UPDATE wong_access_policy_writes SET started_at = '2000-01-01T00:00:00.000Z'");
  expect(await (await run('retry')).json()).toMatchObject({ work: [{ status: 'ready' }], people: [{ settled: true }, { settled: true }] });
});

it('puts a person saved before the first read on the sign-in list once the read works, without adding them again', async () => {
  f.sql.close(); f = fixture({ started: false });
  // The sign-in list cannot be read: the save commits, and nothing is sent to it.
  cf.extras = [{ id: 'unreviewed', decision: 'allow', include: [] }];
  expect(await (await run('status', 'GET')).json()).toMatchObject({ started: false, key: 'ready', people: [] });
  expect(await (await run('people', 'POST', person('bo@example.com', ['orders']))).json()).toMatchObject({ started: false,
    work: [{ kind: 'policy', status: 'pending' }], people: [{ email: 'bo@example.com', settled: false, apps: ['orders'] }] });
  expect(cf.writes).toEqual([]);
  // The read works: permissions start, and Bo's line now offers Try again.
  cf.extras = [];
  expect(await (await run('status', 'GET')).json()).toMatchObject({ started: true, key: 'ready', environment: 'live',
    work: [{ kind: 'policy', status: 'pending' }], people: [{ email: 'bo@example.com', settled: false, apps: ['orders'] }] });
  expect(cf.writes).toEqual([]);
  expect(await (await run('retry')).json()).toMatchObject({ work: [{ kind: 'policy', status: 'ready', outcome: 'policy_readback_matches' }],
    people: [{ email: 'bo@example.com', status: 'active', settled: true, apps: ['orders'] }] });
  expect(cf.writes).toHaveLength(1);
  expect(cf.writes[0].include).toEqual(['bo@example.com', site.ownerEmail].sort().map(email => ({ email: { email } })));
});

it('removal blocks at once and reports the list and session steps separately', async () => {
  cf.failSessions = true;
  const removed = await (await run('people', 'POST', person(employee.id, [], true))).json();
  expect(removed).toMatchObject({ people: [{ email: employee.id, status: 'removed', settled: true, apps: [] }],
    work: [{ kind: 'policy', status: 'ready' }, { kind: 'sessions', status: 'failed', error_code: 'provider_unavailable' }] });
  expect((await authorizeRequest(f.env, employee, { kind: 'self-service' }))?.status).toBe(403);
  expect(cf.writes[0].include).toEqual([{ email: { email: site.ownerEmail } }]);
  cf.failSessions = false;
  expect(await (await run('retry')).json()).toMatchObject({ work: [{ kind: 'policy', status: 'ready' },
    { kind: 'sessions', status: 'ready', outcome: 'session_revocation_accepted_propagation_unverified' }] });
});

it('saves choices with no key, and with a busy lease, leaving the sign-in step for later', async () => {
  const missing = { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: undefined };
  expect(await (await run('people', 'POST', person('bo@example.com', ['orders']), missing)).json()).toMatchObject({ key: 'missing',
    work: [{ kind: 'policy', status: 'pending' }], people: [{ email: 'bo@example.com', settled: false, apps: ['orders'] }, { settled: true }] });
  expect(await (await run('retry', 'POST', undefined, missing)).json()).toMatchObject({ work: [{ status: 'pending' }] });
  expect(fetch).not.toHaveBeenCalled();
  // Another request holds the lease: the save still commits, and Try again reports the wait.
  f.core.holder = await lease(f.core);
  expect(await (await run('people', 'POST', person('cy@example.com'))).json()).toMatchObject({ people: [{ email: 'bo@example.com' }, { email: 'cy@example.com', settled: false }, { email: employee.id }] });
  const busy = await run('retry');
  expect(busy.status).toBe(409); expect(await busy.json()).toEqual({ code: 'retry_pending' });
  expect(fetch).not.toHaveBeenCalled();
});

it('gives a preview its own practice list and makes no provider call', async () => {
  f.sql.exec('UPDATE wong_access_installation SET policy_enabled = 0');
  const opened = await (await run('status', 'GET', undefined, staging())).json();
  expect(opened).toMatchObject({ environment: 'practice', key: 'practice', started: true, imported: 0, work: [] });
  const saved = await (await run('people', 'POST', person('practice@example.com', ['orders']), staging())).json();
  expect(saved).toMatchObject({ environment: 'practice', work: [], people: [{ email: employee.id }, { email: 'practice@example.com', status: 'active', apps: ['orders'] }] });
  await run('people', 'POST', person(employee.id, [], true), staging());
  expect((await run('retry', 'POST', undefined, staging())).status).toBe(200);
  expect(fetch).not.toHaveBeenCalled();
  expect(f.sql.prepare('SELECT COUNT(*) count FROM wong_access_leases').get()).toEqual({ count: 0 });
  expect(f.sql.prepare('SELECT COUNT(*) count FROM wong_access_work').get()).toEqual({ count: 0 });
});

it('opens for the owner with no other setup, lists every built app and starts permissions once', async () => {
  f.sql.close(); f = fixture({ started: false });
  cf.policy.include = [site.ownerEmail, 'cy@example.com'].map(email => ({ email: { email } }));
  const first = await (await run('status', 'GET')).json();
  expect(first).toMatchObject({ started: true, imported: 1, key: 'ready', apps: ['orders', 'payroll'],
    people: [{ email: 'cy@example.com', status: 'active', settled: true, apps: ['orders', 'payroll'] }] });
  expect(cf.writes).toEqual([]);
  expect(await (await run('status', 'GET')).json()).toMatchObject({ imported: 1, people: [{ email: 'cy@example.com' }] });
  expect(f.sql.prepare('SELECT app_id FROM wong_access_apps ORDER BY app_id').all()).toEqual([{ app_id: 'access' }, { app_id: 'orders' }, { app_id: 'payroll' }]);
  // With no key yet, Access still opens and names the step left; nobody loses an app.
  f.sql.close(); f = fixture({ started: false });
  const waiting = await (await run('status', 'GET', undefined, { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: undefined })).json();
  expect(waiting).toMatchObject({ started: false, key: 'missing', people: [], apps: ['orders', 'payroll'] });
  expect(await authorizeRequest(f.env, employee, { apps: ['payroll'] })).toBeNull();
});

it('lists a newly built app unticked and ignores a grant for an app no longer built', async () => {
  f.sql.exec(`INSERT INTO wong_access_apps VALUES ('${site.installationId}', 'retired');
    INSERT INTO wong_access_grants VALUES ('${site.installationId}', '${employee.id}', 'retired', 1);
    INSERT INTO wong_access_grants VALUES ('${site.installationId}', '${employee.id}', 'orders', 1)`);
  const status = await (await run('status', 'GET')).json();
  expect(status).toMatchObject({ apps: ['orders', 'payroll'], people: [{ email: employee.id, apps: ['orders'] }] });
  expect(await (await setupStatus(req('setup', 'GET'), f.env, employee)).json()).toMatchObject({ apps: ['orders'] });
  expect((await authorizeRequest(f.env, employee, { apps: ['payroll'] }))?.status).toBe(403);
  expect((await authorizeRequest(f.env, employee, { apps: ['retired'] }))?.status).toBe(403);
  expect((await run('people', 'POST', person(employee.id, ['retired']))).status).toBe(400);
  // Every main route is mapped in reviewed code; one with no mapping would deny employees.
  for (const { access } of mainRouteInventory()) expect(access).toBeDefined();
  expect((await authorizeRequest(f.env, employee, undefined))?.status).toBe(403);
});

it('reports safe failures and rejects editing controls or assigning self-service as a business app', async () => {
  expect((await run('people', 'POST', { ...person(employee.id), editing: true })).status).toBe(400);
  expect((await run('people', 'POST', person(employee.id, ['access']))).status).toBe(400);
  expect((await run('people', 'POST', person(site.ownerEmail, [], true))).status).toBe(403);
  f.sql.exec('DROP TABLE wong_access_audit');
  const failed = await run('people', 'POST', person(employee.id, [], true));
  expect(failed.status).toBe(503); expect(await failed.json()).toEqual({ code: 'access_unavailable' });
});

it('refuses a missing installation snapshot rather than inventing a status', async () => {
  const prepare = f.core.db.prepare.bind(f.core.db);
  const reader = vi.spyOn(f.core.db, 'prepare').mockImplementation(query => {
    if (query.startsWith('SELECT policy_enabled')) return { bind: () => ({ first: async () => null }) } as unknown as D1PreparedStatement;
    return prepare(query);
  });
  await expect(accessStatus(f.core)).rejects.toMatchObject({ code: 'installation_mismatch' });
  reader.mockRestore();
});

it('serves the setup prompt to every signed-in person, before and after permissions start', async () => {
  const read = (identity = employee, env = f.env) => setupStatus(req('setup', 'GET'), env, identity);
  const base = { api: 'authenticated', repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: expect.objectContaining({ state: expect.any(String) }) };
  // Started: a person with no apps keeps their own setup, and the owner keeps every app.
  expect(await (await read()).json()).toEqual({ ...base, identity: { email: employee.id, subject: employee.claims.sub }, role: 'employee', permissions: 'started', apps: [] });
  expect(await (await read(owner)).json()).toMatchObject({ role: 'owner', permissions: 'started', apps: ['orders', 'payroll'] });
  await run('people', 'POST', person(employee.id, ['payroll', 'orders']));
  expect(await (await read()).json()).toMatchObject({ apps: ['orders', 'payroll'] });
  await run('people', 'POST', person(employee.id, []));
  expect(await (await read()).json()).toMatchObject({ apps: [], api: 'authenticated' });
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await read()).status).toBe(403);
  // Not started: everyone signed in keeps every app, and gets the prompt.
  f.sql.exec('UPDATE wong_access_installation SET policy_enabled = 0');
  expect(await (await read()).json()).toMatchObject({ role: 'employee', permissions: 'not_started', apps: ['orders', 'payroll'], api: 'authenticated' });
  expect(await (await read(owner)).json()).toMatchObject({ role: 'owner', permissions: 'not_started' });
  // An older install with no recorded owner keeps its behavior and still hands out the prompt.
  expect(await (await read(employee, { ...f.env, WONG_OWNER_EMAIL: undefined })).json()).toMatchObject({ role: 'employee', permissions: 'not_started', apps: ['orders', 'payroll'] });
  // A machine, an open site and an unreadable database get no setup.
  for (const identity of [null, { ...employee, kind: 'service' as const }]) expect((await setupStatus(req('setup', 'GET'), f.env, identity)).status).toBe(403);
  expect((await read(employee, { ...f.env, DB: undefined })).status).toBe(503);
  expect((await setupStatus(req('setup'), f.env, employee)).status).toBe(405);
});

it('routes setup, app readback and management, and no longer answers the withdrawn identity or activation routes', async () => {
  expect((await handleAccess(req('setup', 'GET'), f.env, employee)).status).toBe(200);
  expect(await (await handleAccess(req('apps', 'GET'), f.env, employee)).json()).toMatchObject({ state: 'current', role: 'employee' });
  expect((await handleAccess(req('status', 'GET'), f.env, owner)).status).toBe(200);
  expect((await handleAccess(req('status', 'GET'), f.env, employee)).status).toBe(403);
  for (const path of ['identity', 'activate']) expect((await handleAccess(req(path, 'GET'), f.env, owner)).status).toBe(404);
});

it('lets a manager the owner picked add people, edit roles and set levels as the owner does, recorded under their own email', async () => {
  await run('status', 'GET');
  const picked = await (await pick(kim.id, ['orders'])).json();
  expect(picked).toMatchObject({ ownerEmail: site.ownerEmail, viewer: { email: site.ownerEmail, owner: true },
    people: [{ email: employee.id, manager: false }, { email: kim.id, manager: true, apps: ['orders'] }] });
  expect(managers()).toEqual([kim.id]);
  // Managing gives no app, no key and no owner route: Kim holds what she was given.
  expect(await (await handleAccess(req('apps', 'GET'), f.env, kim)).json()).toMatchObject({ role: 'employee', manages: true, apps: ['access', 'orders'], keys: [] });
  expect((await authorizeRequest(f.env, kim, { kind: 'owner' }))?.status).toBe(403);
  expect((await authorizeRequest(f.env, kim, { apps: ['payroll'] }))?.status).toBe(403);
  // She opens the same status, told she is not the owner.
  expect(await (await ask(kim, 'status', undefined, 'GET')).json()).toMatchObject({ ownerEmail: site.ownerEmail, viewer: { email: kim.id, owner: false }, key: 'ready' });
  // She adds a person, and the sign-in list follows in the same request.
  const added = await (await ask(kim, 'people', person('bo@example.com', ['orders']))).json();
  expect(added).toMatchObject({ work: [{ kind: 'policy', status: 'ready', outcome: 'policy_readback_matches' }],
    people: [{ email: 'bo@example.com', status: 'active', settled: true, manager: false, apps: ['orders'] }, { email: employee.id }, { email: kim.id }] });
  expect(cf.writes).toHaveLength(2);
  expect(cf.writes[1].include).toEqual(['bo@example.com', employee.id, kim.id, site.ownerEmail].sort().map(email => ({ email: { email } })));
  // She makes a role and sets a level.
  expect(await (await ask(kim, 'roles', { name: 'Sales', apps: ['payroll'] })).json()).toMatchObject({ roles: [{ name: 'Sales', apps: ['payroll'] }] });
  expect((await ask(kim, 'grants', { key: 'cloudflare', people: { 'bo@example.com': 'read' } })).status).toBe(200);
  // She changes her own set, and another manager's: neither save names the switch, so both keep it.
  expect((await ask(kim, 'people', person(kim.id, ['orders', 'payroll']))).status).toBe(200);
  await pick(employee.id);
  const after = await (await ask(kim, 'people', person(employee.id, ['payroll']))).json();
  expect(after).toMatchObject({ people: [{ email: 'bo@example.com', manager: false, apps: ['orders'], keys: { cloudflare: 'read' } },
    { email: employee.id, manager: true, apps: ['payroll'] }, { email: kim.id, manager: true, apps: ['orders', 'payroll'] }] });
  expect(await (await ask(kim, 'retry')).json()).toMatchObject({ viewer: { email: kim.id, owner: false } });
  // Each change names who made it.
  expect(acted()).toEqual([`${site.ownerEmail} person_changed`, `${site.ownerEmail} manager_added`, `${kim.id} person_changed`,
    `${kim.id} role_changed`, `${kim.id} key_level_changed`, `${kim.id} person_changed`, `${site.ownerEmail} person_changed`,
    `${site.ownerEmail} manager_added`, `${kim.id} person_changed`]);
});

it('refuses a manager who picks, unpicks or removes a manager, or touches the owner, and writes nothing', async () => {
  await pick(kim.id, ['orders']); await pick('lee@example.com');
  const tables = ['installation', 'members', 'managers', 'grants', 'key_grants', 'member_roles', 'audit', 'work'];
  const stored = () => tables.map(table => f.sql.prepare(`SELECT * FROM wong_access_${table} ORDER BY 1, 2`).all());
  const before = stored();
  for (const body of [{ ...person('bo@example.com'), manager: true }, { ...person(employee.id), manager: true },
    { ...person('lee@example.com'), manager: false }, { ...person(kim.id, ['orders']), manager: true }, { ...person(kim.id), manager: false },
    { ...person(employee.id), manager: false }, person('lee@example.com', [], true), person(kim.id, [], true)]) {
    await refusedAs(kim, 'people', body);
  }
  for (const body of [person(site.ownerEmail, ['orders']), person(site.ownerEmail, [], true), { ...person(site.ownerEmail), manager: false }]) {
    await refusedAs(kim, 'people', body, 'owner_cannot_be_changed');
  }
  // Removing a person and making them a manager in one save means nothing, from anyone.
  for (const who of [kim, owner]) expect((await ask(who, 'people', { ...person('lee@example.com', [], true), manager: true })).status).toBe(400);
  expect(stored()).toEqual(before);
  expect(cf.writes).toHaveLength(2);
  // An ordinary person is hers to remove, as for the owner.
  expect(await (await ask(kim, 'people', person(employee.id, [], true))).json()).toMatchObject({ people: [{ email: employee.id, status: 'removed', manager: false }, {}, {}] });
  expect(managers()).toEqual([kim.id, 'lee@example.com']);
});

it('takes managing back at the next request, ends it with a removal, and does not bring it back', async () => {
  const asks = [['status', undefined, 'GET'], ['people', person('bo@example.com'), 'POST'], ['roles', { name: 'Sales' }, 'POST'],
    ['grants', { key: 'cloudflare', people: { [employee.id]: 'read' } }, 'POST'], ['retry', undefined, 'POST']] as const;
  const refusedAll = async () => { for (const [path, body, method] of asks) await refusedAs(kim, path, body, 'owner_required', method); };
  await pick(kim.id, ['orders']);
  expect((await ask(kim, 'status', undefined, 'GET')).status).toBe(200);
  // The owner unticks: no sign-out and no sign-in change, and Kim keeps her apps.
  const unticked = await (await pick(kim.id, ['orders'], false)).json();
  expect(unticked).toMatchObject({ people: [{ email: employee.id }, { email: kim.id, status: 'active', settled: true, manager: false, apps: ['orders'] }] });
  expect(cf.writes).toHaveLength(1);
  await refusedAll();
  expect(await currentPolicy(f.env, kim)).toMatchObject({ state: 'current', role: 'employee', manages: false, apps: new Set(['orders']) });
  // Ticked again and then removed: the removal ends it, with no row left behind.
  await pick(kim.id, ['orders']);
  expect(await (await run('people', 'POST', person(kim.id, [], true))).json()).toMatchObject({ people: [{}, { email: kim.id, status: 'removed', manager: false }] });
  expect(managers()).toEqual([]);
  await refusedAll();
  // Added back, by a save that names no switch: a person again, never a manager.
  expect(await (await run('people', 'POST', person(kim.id, ['orders']))).json()).toMatchObject({ people: [{}, { email: kim.id, status: 'active', manager: false, apps: ['orders'] }] });
  await refusedAll();
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_members WHERE email = 'bo@example.com'").get()).toEqual({ count: 0 });
  expect(acted().filter(line => line.includes('manager_'))).toEqual([`${site.ownerEmail} manager_added`, `${site.ownerEmail} manager_removed`,
    `${site.ownerEmail} manager_added`, `${site.ownerEmail} manager_removed`]);
});
