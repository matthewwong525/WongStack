// checkStore(makeStore): every operation a store answers, and the answers the rules give each kind of caller through
// it. Setup runs it with `node --test`; a project's own test runner passes its own `describe` and `test`.
import assert from 'node:assert/strict';
import * as nodeTest from 'node:test';
import { access } from '../server/index.mjs';
import { missingOperations } from './interface.mjs';

const OWNER = 'owner@shop.example';
const ORIGIN = 'https://shop.example';
const APPS = [{ id: 'access', title: 'Access', description: 'Who can use the app.' },
  { id: 'orders', title: 'Orders', description: 'Orders.' }, { id: 'stock', title: 'Stock', description: 'Stock.' }];
const KEYS = { stripe: { title: 'Stripe', purpose: 'Payments', secrets: ['STRIPE_KEY'] } };
const EVERY = ['access', 'orders', 'stock'];
const NONE = { apps: [], keys: {} };

/** A store opened by the owner, with permissions started. */
async function opened(makeStore) {
  const store = await makeStore();
  await store.open({ origin: ORIGIN, owner: OWNER, subject: 'owner-subject' });
  await store.start({ actor: OWNER, apps: EVERY, given: ['orders', 'stock'], owner: OWNER, admitted: [] });
  await store.startKeys();
  return store;
}
const person = (store, email, fields = {}) => store.savePerson({ actor: OWNER, apps: EVERY, email, status: 'active', own: NONE,
  role: null, steps: [], events: ['person_changed'], ...fields });
/** Access over the store, with each caller named by a request header. */
function gateOver(store, environment = 'live') {
  const callers = { owner: { email: OWNER, subject: 's' }, checker: { machine: 'checker' } };
  return access({ store: () => store, owner: () => OWNER, apps: () => APPS, keys: () => KEYS, environment: () => environment,
    checker: machine => machine === 'checker',
    signIn: request => { const name = request.headers.get('x-caller'); return callers[name] ?? (name ? { email: name, subject: name } : null); } });
}
/** A row as plain data: a database driver may hand back objects with no prototype. */
const plain = value => JSON.parse(JSON.stringify(value));
const ask = (gate, name) => gate.decide(new Request(`${ORIGIN}/`, { headers: { 'x-caller': name } }));

export function checkStore(makeStore, name = 'access store', { describe, test } = nodeTest) {
  describe(`${name}: the Access store contract`, () => {
    test('answers every operation', async () => {
      assert.deepEqual(missingOperations(await makeStore()), []);
    });

    test('opens once, with the Admin role, and records the owner first seen', async () => {
      const store = await makeStore();
      assert.equal(await store.policy(OWNER), null);
      assert.equal(await store.installed(), null);
      assert.deepEqual(await store.started(), { policy: false, keys: false });
      assert.equal(await store.status(), null);
      await store.open({ origin: ORIGIN, owner: OWNER, subject: 'first' });
      await store.open({ origin: 'https://other.example', owner: OWNER, subject: 'second' });
      assert.deepEqual(plain(await store.installed()), { origin: ORIGIN });
      assert.equal(await store.audited('owner_first_seen:first'), true);
      assert.equal(await store.audited('owner_first_seen:second'), false);
      assert.deepEqual((await store.sets()).roles.map(role => [role.id, role.name]), [['admin', 'Admin']]);
      assert.deepEqual(await store.policy('nobody@shop.example'),
        { started: false, keysStarted: false, revision: 1, status: null, role: null, apps: [], keys: {} });
    });

    test('starts permissions with everyone the sign-in list admitted, then key levels', async () => {
      const store = await makeStore();
      await store.open({ origin: ORIGIN, owner: OWNER, subject: 's' });
      await store.startKeys();
      assert.deepEqual(await store.started(), { policy: false, keys: false });
      await person(store, 'kept@shop.example', { own: { apps: ['stock'], keys: {} } });
      const fresh = await store.start({ actor: OWNER, apps: EVERY, given: ['orders', 'stock'], owner: OWNER,
        admitted: [OWNER, 'kept@shop.example', 'new@shop.example', 'new@shop.example'] });
      assert.equal(fresh, 1);
      assert.deepEqual(await store.started(), { policy: true, keys: false });
      const found = await store.policy('new@shop.example');
      assert.deepEqual({ ...found, apps: [...found.apps].sort() },
        { started: true, keysStarted: false, revision: found.revision, status: 'active', role: null, apps: ['orders', 'stock'], keys: {} });
      assert.deepEqual((await store.policy('kept@shop.example')).apps, ['stock']);
      assert.equal((await store.status()).imported, 1);
      await store.startKeys();
      assert.deepEqual(await store.started(), { policy: true, keys: true });
    });

    test('saves a person with their own set, a role, Admin, and a removal', async () => {
      const store = await opened(makeStore);
      const before = (await store.policy(OWNER)).revision;
      await person(store, 'own@shop.example', { own: { apps: ['orders'], keys: { stripe: 'read' } }, events: ['person_changed', 'key_level_changed'] });
      assert.deepEqual(await store.policy('own@shop.example'), { started: true, keysStarted: true, revision: before + 1,
        status: 'active', role: null, apps: ['orders'], keys: { stripe: 'read' } });
      assert.equal(await store.audited('key_level_changed'), true);
      await store.saveRole({ actor: OWNER, apps: EVERY, id: 'sales', name: 'Sales', set: { apps: ['stock'], keys: { stripe: 'write' } }, events: ['role_changed'] });
      await person(store, 'held@shop.example', { role: 'sales' });
      assert.deepEqual(await store.policy('held@shop.example'), { started: true, keysStarted: true, revision: before + 3,
        status: 'active', role: 'sales', apps: ['stock'], keys: { stripe: 'write' } });
      // A save with no role named keeps the one held.
      await person(store, 'held@shop.example', { role: undefined });
      assert.equal((await store.policy('held@shop.example')).role, 'sales');
      await person(store, 'admin@shop.example', { role: 'admin' });
      assert.equal(await store.admin('admin@shop.example'), true);
      assert.equal(await store.admin('held@shop.example'), false);
      await person(store, 'admin@shop.example', { status: 'removed', role: null, events: ['person_removed'] });
      assert.equal(await store.admin('admin@shop.example'), false);
      assert.deepEqual(await store.policy('admin@shop.example'), { started: true, keysStarted: true, revision: before + 6,
        status: 'removed', role: null, apps: [], keys: {} });
      const { people, roles } = await store.sets();
      assert.deepEqual(people.map(row => [row.email, row.status, row.role]), [['admin@shop.example', 'removed', null],
        ['held@shop.example', 'active', 'sales'], ['own@shop.example', 'active', null]]);
      assert.deepEqual(roles.map(role => [role.id, role.name, role.apps, role.keys]), [['admin', 'Admin', [], {}], ['sales', 'Sales', ['stock'], { stripe: 'write' }]]);
    });

    test('renames a role, and a removed role leaves its holders what it gave', async () => {
      const store = await opened(makeStore);
      await store.saveRole({ actor: OWNER, apps: EVERY, id: 'sales', name: 'Sales', set: { apps: ['stock'], keys: {} }, events: ['role_changed'] });
      await store.saveRole({ actor: OWNER, apps: EVERY, id: 'sales', name: 'Shop floor', set: { apps: ['orders'], keys: {} }, events: ['role_changed'] });
      await person(store, 'held@shop.example', { role: 'sales' });
      assert.deepEqual((await store.sets()).roles.map(role => role.name), ['Admin', 'Shop floor']);
      await store.removeRole({ actor: OWNER, apps: EVERY, id: 'sales', events: ['role_removed'],
        holders: [{ email: 'held@shop.example', set: { apps: ['orders'], keys: {} } }] });
      assert.deepEqual((await store.sets()).roles.map(role => role.id), ['admin']);
      const held = await store.policy('held@shop.example');
      assert.deepEqual([held.role, held.apps], [null, ['orders']]);
      assert.equal(await store.audited('role_removed'), true);
    });

    test('queues sign-in list steps and settles a person when the list matches', async () => {
      const store = await opened(makeStore);
      await person(store, 'new@shop.example', { steps: ['policy', 'sessions'] });
      assert.equal((await store.sets()).people[0].settled, false);
      const step = await store.step('policy');
      assert.deepEqual({ ...step, generation: typeof step.generation }, { generation: 'number', status: 'pending', scope: 'both' });
      assert.equal(await store.stepWaiting(), true);
      assert.deepEqual((await store.status()).work.map(row => [row.kind, row.status]), [['policy', 'pending'], ['sessions', 'pending']]);
      const holder = await store.lease();
      assert.equal(typeof holder, 'string');
      assert.equal(await store.lease(), null);
      assert.equal(await store.leaseCurrent(holder), true);
      assert.equal(await store.leaseCurrent('someone-else'), false);
      assert.equal(await store.leaseCurrent(undefined), false);
      await store.stepFailed({ kind: 'sessions', generation: step.generation, code: 'provider_unavailable' });
      assert.deepEqual(plain((await store.status()).work[1]), { kind: 'sessions', status: 'failed', outcome: null, error_code: 'provider_unavailable' });
      await store.stepStale('sessions');
      assert.equal((await store.step('sessions')).status, 'pending');
      // A write whose outcome is unknown keeps the list unconfirmed.
      const intent = await store.beginWrite({ generation: step.generation, holder });
      assert.equal(typeof intent, 'string');
      assert.equal(await store.beginWrite({ generation: step.generation + 1, holder }), null);
      assert.equal(await store.beginWrite({ generation: step.generation, holder: 'stale' }), null);
      await store.endWrite(intent, 'unknown');
      assert.equal(await store.unresolvedWrites(), true);
      await store.stepDone({ kind: 'policy', generation: step.generation, holder, outcome: 'policy_readback_matches' });
      assert.equal((await store.step('policy')).status, 'pending');
      await store.stepUnresolved();
      assert.equal((await store.status()).work[0].outcome, 'previous_policy_write_unresolved');
      await store.endWrite(intent, 'completed');
      await store.endWrite(intent, 'unknown');
      assert.equal(await store.unresolvedWrites(), false);
      await store.stepDone({ kind: 'policy', generation: step.generation, holder: 'stale', outcome: 'policy_readback_matches' });
      assert.equal(await store.stepWaiting(), true);
      await store.stepDone({ kind: 'policy', generation: step.generation, holder, outcome: 'policy_readback_matches' });
      assert.equal(await store.stepWaiting(), false);
      assert.equal((await store.sets()).people[0].settled, true);
      await store.release(holder);
      assert.equal(await store.leaseCurrent(holder), false);
      assert.equal(typeof await store.lease(), 'string');
      assert.deepEqual(await store.listed(), ['new@shop.example']);
      assert.equal(await store.step('nothing'), null);
    });

    test('keeps tools added from a chat and keys sent sealed, with a record line for each', async () => {
      const store = await opened(makeStore);
      const row = { id: 'crm', title: 'CRM', purpose: 'Customers', docs: 'https://crm.example/docs', forward_json: '{}', levels_json: '["read"]' };
      await person(store, 'own@shop.example', { own: { apps: [], keys: { crm: 'read' } } });
      await store.saveTool({ row, actor: OWNER, clearLevels: false });
      assert.deepEqual(plain(await store.tools()), [row]);
      assert.deepEqual((await store.policy('own@shop.example')).keys, { crm: 'read' });
      await store.saveTool({ row: { ...row, title: 'Customers' }, actor: OWNER, clearLevels: true });
      assert.deepEqual((await store.tools())[0].title, 'Customers');
      assert.deepEqual((await store.policy('own@shop.example')).keys, {});
      await store.removeTool('crm', OWNER);
      assert.deepEqual(await store.tools(), []);
      assert.equal(await store.audited('tool_removed'), true);
      assert.deepEqual([...await store.sealed()], []);
      await store.saveSealed({ name: 'STRIPE_KEY', sealed: '{"v":1}', ends: 'abcd', actor: OWNER });
      await store.saveSealed({ name: 'STRIPE_KEY', sealed: '{"v":1}', ends: 'wxyz', actor: OWNER });
      assert.deepEqual([...await store.sealed()], [['STRIPE_KEY', 'wxyz']]);
      assert.equal(await store.audited('key_sent:STRIPE_KEY'), true);
      await store.audit(OWNER, 'checked');
      assert.equal(await store.audited('checked'), true);
    });

    test('gives each caller the answer the rules promise', async () => {
      const store = await opened(makeStore);
      await store.saveRole({ actor: OWNER, apps: EVERY, id: 'sales', name: 'Sales', set: { apps: ['stock'], keys: { stripe: 'read' } }, events: [] });
      await person(store, 'admin@shop.example', { role: 'admin' });
      await person(store, 'held@shop.example', { role: 'sales' });
      await person(store, 'own@shop.example', { own: { apps: ['orders'], keys: {} } });
      await person(store, 'gone@shop.example', { status: 'removed' });
      const live = gateOver(store);
      const owner = await ask(live, 'owner');
      assert.deepEqual([owner.state, owner.role, owner.manages, [...owner.apps], [...owner.keys]],
        ['current', 'owner', true, EVERY, [['stripe', 'write']]]);
      const admin = await ask(live, 'admin@shop.example');
      assert.deepEqual([admin.role, admin.manages, [...admin.apps], [...admin.keys]], ['employee', true, EVERY, [['stripe', 'write']]]);
      const held = await ask(live, 'held@shop.example');
      assert.deepEqual([held.manages, [...held.apps], [...held.keys]], [false, ['stock'], [['stripe', 'read']]]);
      const own = await ask(live, 'own@shop.example');
      assert.deepEqual([[...own.apps], [...own.keys]], [['orders'], []]);
      assert.deepEqual(await ask(live, 'gone@shop.example'), { state: 'denied' });
      assert.deepEqual(await ask(live, 'stranger@shop.example'), { state: 'denied' });
      // The checker on a live app is a machine with every app, managing nobody.
      // On a preview it stands in for the owner.
      const machine = await ask(live, 'checker');
      assert.deepEqual([machine.role, machine.manages, [...machine.apps]], ['employee', false, EVERY]);
      const checker = await ask(gateOver(store, 'preview'), 'checker');
      assert.deepEqual([checker.role, checker.manages], ['owner', true]);
    });
  });
}
