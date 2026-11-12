import { describe, expect, test, vi } from 'vitest';
import { standInStore } from '../store/stand-in.mjs';
import { access } from './index.mjs';
import { checkedPass, isPass, ownerPass } from './pass.mjs';
import { changedSet } from './sets.mjs';

const OWNER = 'owner@example.com';
const ORIGIN = 'https://app.example.com';
/** A request from `who`: an email, a machine id after `machine:`, or nobody. */
const ask = (path, who, method = 'GET') => new Request(`${ORIGIN}${path}`, { method,
  headers: { ...(who && { 'x-who': who }), ...(method !== 'GET' && { Origin: ORIGIN }) } });
const signIn = request => {
  const who = request.headers.get('x-who');
  if (!who) return null;
  return who.startsWith('machine:') ? { machine: who.slice(8) } : { email: who, subject: `${who}-subject` };
};
const slots = (overrides = {}) => {
  const store = standInStore();
  return { signIn, store: () => store, owner: () => OWNER, ...overrides };
};

describe('the slots', () => {
  test('refuses a missing required slot, and an extra with no path, handle or need, before any request', () => {
    for (const name of ['signIn', 'store', 'owner']) expect(() => access({ ...slots(), [name]: undefined })).toThrow(`the ${name} slot`);
    expect(() => access(undefined)).toThrow(TypeError);
    const handle = () => new Response();
    for (const extra of [{ path: 'x', handle }, { path: 'x', handle, need: { key: 'k', level: 'admin' } }, { handle, need: 'manage' },
      { path: 'x', need: 'manage' }, null]) {
      expect(() => access({ ...slots(), extras: [extra] })).toThrow(TypeError);
    }
    expect(() => access({ ...slots(), extras: [{ path: 'x', handle, need: { key: 'k' } }, { path: 'y', handle, need: 'manage' }] })).not.toThrow();
  });

  test('keeps the existing behaviour with no owner, and reads nothing for it', async () => {
    const store = vi.fn(standInStore);
    const gate = access({ signIn, store, owner: () => null });
    expect(await gate.decide(ask('/', 'ana@example.com'))).toEqual({ state: 'legacy' });
    expect(await gate.gate(ask('/', 'machine:checker'), { apps: ['orders'] })).toBeNull();
    expect(store).not.toHaveBeenCalled();
  });

  test('refuses a request with no caller, unless the open slot says the app is open to anyone', async () => {
    for (const shut of [slots(), slots({ open: () => false }), slots({ open: () => { throw new Error('unreadable'); } }), { ...slots(), owner: () => null }]) {
      const gate = access(shut);
      const refused = await gate.gate(ask('/', null), { apps: ['orders'] });
      expect([refused.status, await refused.json()]).toEqual([401, { error: { code: 'unauthenticated', message: 'Sign in first' } }]);
      expect(await gate.decide(ask('/', null))).toEqual({ state: 'denied' });
      expect((await gate.serve(ask('/api/services', null))).status).toBe(401);
    }
    // Open to anyone: nobody signed in passes as before permissions start, with no owner named or before the first open.
    for (const open of [slots({ open: () => true }), { ...slots({ open: () => true }), owner: () => null }]) {
      expect(await access(open).gate(ask('/', null), { apps: ['orders'] })).toBeNull();
    }
  });

  test('reads the sign-in once per request, and a throwing sign-in or store is unavailable, never open', async () => {
    const reads = vi.fn(signIn);
    const gate = access({ ...slots(), signIn: reads });
    const request = ask('/', OWNER);
    await Promise.all([gate.decide(request), gate.gate(request, { apps: ['orders'] }), gate.caller(request)]);
    expect(reads).toHaveBeenCalledTimes(1);
    const failing = access({ ...slots(), signIn: () => { throw new Error('no wall'); } });
    expect(await failing.decide(ask('/', OWNER))).toEqual({ state: 'unavailable' });
    const refused = await failing.gate(ask('/', OWNER), { apps: ['orders'] });
    expect([refused.status, (await refused.json()).error.message]).toEqual([503, 'Access unavailable']);
    const storeless = access({ ...slots(), store: () => { throw new Error('no database'); } });
    expect(await storeless.decide(ask('/', OWNER))).toEqual({ state: 'unavailable' });
    const status = await storeless.serve(ask('/api/access/status', OWNER));
    expect([status.status, await status.json()]).toEqual([503, { code: 'owner_setup_required' }]);
  });

  test('answers null for a path that is not its own', async () => {
    expect(await access(slots()).serve(ask('/api/other', OWNER))).toBeNull();
  });

  test('answers the page at every address under its path that names no file, so a reload deep in Access opens it', async () => {
    const gate = access(slots());
    for (const path of ['/apps/access', '/apps/access/', '/apps/access/roles', '/apps/access/people/sam@shop.com']) {
      const answer = await gate.serve(ask(path, 'sam@example.com'));
      expect([path, answer.status, answer.headers.get('Content-Type')]).toEqual([path, 200, 'text/html; charset=utf-8']);
      const text = await answer.text();
      expect(text).toContain('<base href="/apps/access/" />');
      expect(text).toContain('data-api="/api/access/"');
    }
    // The folder's files are the app's to serve; so is another page, and a save.
    for (const [path, method] of [['/apps/access/main.mjs', 'GET'], ['/apps/access/vendor/preact-htm.mjs', 'GET'], ['/apps/access/access.css', 'GET'],
      ['/apps/accessible', 'GET'], ['/apps/access/roles', 'POST']]) {
      expect(await gate.serve(ask(path, 'sam@example.com', method)), path).toBeNull();
    }
    expect((await gate.serve(ask('/apps/access/roles', null))).status).toBe(401);
    const moved = await access(slots({ page: '/team/access/', prefix: '/team/api/' })).serve(ask('/team/access/people', OWNER));
    expect(await moved.text()).toMatch(/<base href="\/team\/access\/" \/>[\s\S]*data-api="\/team\/api\/"/);
    for (const page of ['apps/access/', '/apps/access', '/apps/"><script>/']) expect(() => access(slots({ page }))).toThrow(TypeError);
    // An API path under the page's path still answers the API.
    const under = access(slots({ prefix: '/apps/access/api/' }));
    const status = await under.serve(ask('/apps/access/api/status', OWNER));
    expect([status.status, status.headers.get('Content-Type')]).toEqual([200, 'application/json']);
    expect((await status.json()).started).toBe(true);
    const deep = await under.serve(ask('/apps/access/people/sam@shop.com', OWNER));
    expect(await deep.text()).toContain('data-api="/apps/access/api/"');
  });
});

describe('only the required slots', () => {
  test('the status has no app or key lists, and Access lets in only the people it lists', async () => {
    const gate = access(slots());
    const status = await (await gate.serve(ask('/api/access/status', OWNER))).json();
    expect(status.started).toBe(true);
    expect(status).not.toHaveProperty('apps');
    expect(status).not.toHaveProperty('keys');
    expect(status.key).toBe('none');
    const saved = await gate.serve(new Request(`${ORIGIN}/api/access/people`, { method: 'POST',
      headers: { 'x-who': OWNER, Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sam@example.com', removed: false }) }));
    expect(saved.status).toBe(200);
    expect(await gate.gate(ask('/', 'sam@example.com'), { kind: 'self-service' })).toBeNull();
    const refused = await gate.gate(ask('/', 'kim@example.com'), { kind: 'self-service' });
    expect([refused.status, (await refused.json()).error.message]).toEqual([403, 'App access denied']);
  });

  test('with the apps and keys slots, the status lists both', async () => {
    const status = await (await access(slots({ apps: () => [{ id: 'orders', title: 'Orders', description: 'Orders.' }], keys: () => ({}) }))
      .serve(ask('/api/access/status', OWNER))).json();
    expect(status.apps).toEqual([{ id: 'orders', title: 'Orders', description: 'Orders.' }]);
    expect(status.keys).toEqual([]);
  });
});

describe('a throwing keys slot', () => {
  test('after key levels start, refuses the key call and names no key value', async () => {
    let broken = false;
    const keys = () => { if (broken) throw new Error('STRIPE_SECRET_KEY=sk_live_made_up'); return { stripe: { title: 'Stripe', purpose: 'Payments', secrets: ['STRIPE_SECRET_KEY'] } }; };
    const gate = access(slots({ keys, secret: name => name === 'STRIPE_SECRET_KEY' ? 'sk_live_made_up' : undefined }));
    expect((await (await gate.serve(ask('/api/access/status', OWNER))).json()).keysStarted).toBe(true);
    const saved = await gate.serve(new Request(`${ORIGIN}/api/access/people`, { method: 'POST',
      headers: { 'x-who': OWNER, Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sam@example.com', removed: false, keys: { stripe: 'read' } }) }));
    expect(saved.status).toBe(200);
    expect(await gate.gate(ask('/', 'sam@example.com'), { keys: ['stripe'] }, 'read')).toBeNull();
    broken = true;
    for (const who of ['sam@example.com', OWNER]) {
      const refused = await gate.gate(ask('/', who), { keys: ['stripe'] }, 'read');
      expect(refused, who).not.toBeNull();
      expect([403, 503]).toContain(refused.status);
      expect(await refused.text()).not.toMatch(/sk_live|STRIPE_SECRET_KEY/);
    }
  });
});

describe('the management pass', () => {
  test('is made only by the module: a copy or a hand-built pass is refused', async () => {
    const gate = access(slots());
    const pass = await gate.manages(ask('/api/access/status', OWNER));
    expect(pass).toMatchObject({ email: OWNER, actor: OWNER, owner: true, live: true });
    expect(isPass(pass)).toBe(true);
    expect(ownerPass(pass)).toBe(pass);
    for (const forged of [{ ...pass }, { email: OWNER, actor: OWNER, owner: true, subject: 's', live: true }]) {
      expect(isPass(forged)).toBe(false);
      expect(() => checkedPass(forged)).toThrow('owner_required');
    }
    expect(await gate.manages(ask('/api/access/status', 'ana@example.com'))).toBeNull();
  });

  test('lets the checker stand in for the owner on a preview only', async () => {
    const preview = { ...slots(), environment: () => 'preview', checker: machine => machine === 'checker' };
    expect(await access(preview).manages(ask('/api/access/status', 'machine:checker'))).toMatchObject({ owner: true, subject: 'checker', live: false });
    expect(await access(preview).manages(ask('/api/access/status', 'machine:other'))).toBeNull();
    expect(await access({ ...preview, environment: () => 'live' }).manages(ask('/api/access/status', 'machine:checker'))).toBeNull();
  });

  test('answers installation_mismatch when the store has no status for the open installation', async () => {
    const store = standInStore();
    const gate = access({ ...slots(), store: () => ({ ...store, status: async () => null }) });
    const answer = await gate.serve(ask('/api/access/status', OWNER));
    expect([answer.status, await answer.json()]).toEqual([503, { code: 'installation_mismatch' }]);
  });
});

describe('a changed set', () => {
  const run = { catalogue: () => ['access', 'orders', 'payroll'] };
  const registry = { cloudflare: { title: 'Cloudflare', purpose: 'Hosting', secrets: ['CF'] } };
  test('gives an app without changing any key level, and drops a cleared level', () => {
    const base = { apps: ['payroll'], keys: { cloudflare: 'read' } };
    expect(changedSet(run, registry, base, { apps: { orders: true } })).toEqual({ apps: ['orders', 'payroll'], keys: { cloudflare: 'read' } });
    expect(changedSet(run, registry, base, { apps: { payroll: false }, keys: { cloudflare: null } })).toEqual({ apps: [], keys: {} });
  });
  test('refuses an app not built, Access itself, a key nobody registered, and a level the key does not offer', () => {
    const base = { apps: [], keys: {} };
    for (const [change, code] of [[{ apps: { access: true } }, 'unknown_app'], [{ apps: { shop: true } }, 'unknown_app'],
      [{ keys: { github: 'read' } }, 'unknown_key'], [{ keys: { cloudflare: 'admin' } }, 'level_not_offered']]) {
      expect(() => changedSet(run, registry, base, change)).toThrow(code);
    }
  });
});
