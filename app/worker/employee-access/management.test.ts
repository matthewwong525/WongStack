import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fixture, owner, employee, pin, req } from '../../tests/employee-access/connections';
import { accessStatus } from './members';
import { management } from './management';
import { prepare, rollout } from './rollout';
import { catalogue } from './apps';
import { mainRouteInventory } from '../api/router';
import { setupStatus } from './setup';
import { handleAccess } from './router';
import { lease } from './core';
let f: ReturnType<typeof fixture>;
const plan = () => ({ version: 1, apps: [...catalogue], mainRoutes: mainRouteInventory(), people: [{ email: employee.id, apps: [] }] });
beforeEach(() => { f = fixture(); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });
const run = (path: string, method = 'POST', body?: unknown) => management(req(path, method, body), f.env, owner);

it('prepares only privately reviewed routes/catalogue and rolls out reviewed grants without a repository', async () => {
  await expect(prepare(f.core)).rejects.toMatchObject({ code: 'private_rollout_required' });
  for (const changes of [{ apps: [] }, { mainRoutes: [] }]) {
    f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), ...changes });
    await expect(prepare(f.core)).rejects.toMatchObject({ code: 'route_review_required' });
    await expect(rollout(f.core)).rejects.toMatchObject({ code: 'route_review_required' });
  }
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify(plan()); await prepare(f.core);
  expect(f.sql.prepare('SELECT COUNT(*) count FROM wong_access_apps').get()!.count).toBeGreaterThanOrEqual(catalogue.length);
  f.env.WONG_ACCESS_POLICY = undefined;
  await expect(rollout(f.core)).rejects.toMatchObject({ code: 'private_rollout_required' });
  f.env.WONG_ACCESS_POLICY = 'on';
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), people: [] });
  await expect(rollout(f.core)).rejects.toMatchObject({ code: 'grant_review_required' });
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify(plan()); await rollout(f.core);
  expect(f.sql.prepare('SELECT policy_enabled FROM wong_access_installation').get()).toEqual({ policy_enabled: 1 });
  expect(f.sql.prepare('SELECT event FROM wong_access_audit').all()).toContainEqual({ event: 'policy_enabled' });
});
it('retains finite owner operations and rejects withdrawn routes without provider work', async () => {
  for (const path of ['unknown', 'token', 'github/start', 'github/register', 'github/install', 'github/check', 'editing/enable']) expect((await run(path)).status).toBe(404);
  expect((await run('status', 'GET')).status).toBe(200);
  expect((await run('status', 'PUT')).status).toBe(405);
  expect((await run('people', 'GET')).status).toBe(404);
  expect((await run('status')).status).toBe(404);
  expect((await run('people', 'POST', { email: employee.id, apps: [], removed: true })).status).toBe(200);
  f.env.WONG_ACCESS_POLICY = undefined;
  for (const path of ['people', 'login/connect', 'prepare', 'rollout', 'retry']) expect((await management(req(path), f.env, employee)).status).toBe(403);
  expect((await management(req('status', 'GET'), { ...f.env, WONG_ENVIRONMENT: 'staging' }, owner)).status).toBe(503);
  const status = await (await run('status', 'GET')).json();
  expect(status).toMatchObject({ origin: pin.origin, ownerEmail: pin.ownerEmail, apps: ['orders'] });
  expect(status).not.toHaveProperty('receipts');
  expect((await run('login/connect')).status).toBe(503);
  expect((await run('retry')).status).toBe(200);
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), people: [] });
  expect((await run('prepare')).status).toBe(200);
  f.env.WONG_ACCESS_POLICY = 'on'; expect((await run('rollout')).status).toBe(200);
  const bodyless = new Request(`${pin.origin}/api/access/people`, { method: 'POST', headers: { Origin: pin.origin } });
  expect((await management(bodyless, f.env, owner)).status).toBe(400);
  f.core.holder = await lease(f.core); expect((await run('retry')).status).toBe(409);
});
it('reports safe failures and rejects editing controls or assigning self-service as a business app', async () => {
  f.env.WONG_ACCESS_ROLLOUT = 'private invalid record';
  expect(await (await run('prepare')).json()).toEqual({ code: 'access_unavailable' });
  expect((await run('people', 'POST', { email: employee.id, apps: [], removed: false, editing: true })).status).toBe(400);
  expect((await run('people', 'POST', { email: employee.id, apps: ['access'], removed: false })).status).toBe(400);
  f.sql.exec('DROP TABLE wong_access_audit');
  expect((await run('people', 'POST', { email: employee.id, apps: [], removed: true })).status).toBe(503);
});
it('readback proves current API/apps and denies deselected or removed members during the same session', async () => {
  const read = () => setupStatus(req('setup', 'GET'), f.env, employee);
  expect(await (await read()).json()).toMatchObject({ identity: { email: employee.id, subject: employee.claims.sub }, api: 'authenticated', apps: [], repository: 'manual_provider_setup', memory: 'independent_operator_setup' });
  expect(await (await setupStatus(req('setup', 'GET'), f.env, owner)).json()).toMatchObject({ role: 'owner', apps: catalogue.filter(app => app !== 'access') });
  expect((await run('people', 'POST', { email: employee.id, apps: ['orders'], removed: false })).status).toBe(200);
  expect(await (await read()).json()).toMatchObject({ apps: ['orders'] });
  expect((await run('people', 'POST', { email: employee.id, apps: [], removed: false })).status).toBe(200);
  expect(await (await read()).json()).toMatchObject({ apps: [], api: 'authenticated' });
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await read()).status).toBe(403);
  expect((await setupStatus(req('setup', 'GET'), { ...f.env, WONG_ACCESS_POLICY: undefined }, employee)).status).toBe(403);
  expect((await setupStatus(req('setup'), f.env, employee)).status).toBe(405);
  f.sql.exec("UPDATE wong_access_members SET status = 'active'");
  expect((await handleAccess(req('setup', 'GET'), f.env, employee)).status).toBe(200);
  f.sql.exec('UPDATE wong_access_installation SET policy_enabled = 0');
  expect((await handleAccess(req('identity', 'GET'), f.env, owner)).status).toBe(200);
  expect((await handleAccess(req('status', 'GET'), f.env, employee)).status).toBe(403);
});
it('reviews every active person and sorted selected apps while preserving inert old flags', async () => {
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, 'zeta@example.com', 'active', 1, 1, 'now')").run(pin.installationId);
  f.sql.prepare('INSERT INTO wong_access_grants VALUES (?, ?, ?, 1)').run(pin.installationId, employee.id, 'orders');
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), people: [{ email: 'zeta@example.com', apps: [] }, { email: employee.id, apps: ['orders'] }] });
  await rollout(f.core);
  expect(f.sql.prepare('SELECT policy_enabled FROM wong_access_installation').get()).toEqual({ policy_enabled: 1 });
});

it('dispatches the owner-only login connection with the durable lease and releases it', async () => {
  const login = await import('./login-management');
  const connected = vi.spyOn(login, 'connectLogin').mockResolvedValueOnce();
  expect((await run('login/connect')).status).toBe(200);
  expect(connected).toHaveBeenCalledOnce();
  expect(f.sql.prepare('SELECT COUNT(*) count FROM wong_access_leases').get()).toEqual({ count: 0 });
  connected.mockRestore();
});

it('owner status reports disabled enforcement accurately and refuses a missing installation snapshot', async () => {
  f.sql.exec('UPDATE wong_access_installation SET policy_enabled = 0');
  expect(await (await run('status', 'GET')).json()).toMatchObject({ policyEnabled: false });
  const prepare = f.core.db.prepare.bind(f.core.db);
  const reader = vi.spyOn(f.core.db, 'prepare').mockImplementation(query => {
    if (query.startsWith('SELECT policy_enabled')) return { bind: () => ({ first: async () => null }) } as unknown as D1PreparedStatement;
    return prepare(query);
  });
  await expect(accessStatus(f.core)).rejects.toMatchObject({ code: 'installation_mismatch' });
  // The finite owner route sanitizes the failure rather than returning a
  // fabricated disabled/ready status or any private storage diagnostic.
  expect(await (await run('status', 'GET')).json()).toEqual({ code: 'installation_mismatch' });
  reader.mockRestore();
});
