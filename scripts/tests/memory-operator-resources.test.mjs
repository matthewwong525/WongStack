import { inspectResources, inspectProtection, protectionDigest, humanAdmitted } from '../../.agents/skills/memory/scripts/lib/installation-resources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeMemoryInstallation as initialize, readMemorySetupStatus as status } from '../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { operatorFixture, inputFor } from './fixtures/memory/operator.mjs';

function pairedException(f) {
  const worker = f.workers.get(f.target.memoryWorkerName);
  for (const row of worker.app.destinations) row.overrides = [{ path_pattern: '/_memory/*', behavior: 'public' }];
  return worker.app;
}

test('closed and exact paired memory exceptions permit pending setup, never imply route activation', async t => {
  for (const standalone of [false, true]) {
    const f = operatorFixture(t, { standalone });
    pairedException(f);
    const result = await initialize(f.operator, inputFor(f));
    assert.equal(result.memory.reason, 'owner-unconfirmed');
    assert.equal(result.memory.status, 'pending-owner');
    const app = f.workers.get(f.target.appWorkerName);
    app.app.destinations.push({ type: 'worker', worker_id: '3'.repeat(32) }); // Closed staging destination.
    const service = { id: 'verification', decision: 'non_identity', include: [{ service_token: { token_id: 'fixture-service-id' } }] };
    f.receipts.get(`/accounts/${f.target.accountId}/access/apps/${f.access.appApplicationId}/policies`).push(service);
    app.app.policies.push({ id: service.id });
    assert.equal((await status(f.operator, { installation: result.installation })).memory.reason, 'owner-unconfirmed');
  }
});

const unsafeAccess = {
  'native exception missing canonical pair': f => { pairedException(f).destinations.pop(); },
  'canonical exception missing native pair': f => { pairedException(f).destinations[0].overrides = []; },
  'blanket bypass': f => { pairedException(f).destinations[0].overrides[0].path_pattern = '/*'; },
  'another route bypass': f => { pairedException(f).destinations[0].overrides[0].path_pattern = '/api/*'; },
  'extra override fields': f => { pairedException(f).destinations[0].overrides[0].extra = true; },
  'unknown bypass behavior': f => { pairedException(f).destinations[0].overrides[0].behavior = 'bypass'; },
  'null override': f => { pairedException(f).destinations[0].overrides = [null]; },
  'malformed override collection': f => { pairedException(f).destinations[0].overrides = {}; },
  'app origin exception on separate memory deployment': f => {
    for (const row of f.workers.get(f.target.appWorkerName).app.destinations) row.overrides = [{ path_pattern: '/_memory/*', behavior: 'public' }];
  },
  'staging exception': f => { pairedException(f).destinations.push({ type: 'worker', worker_id: '3'.repeat(32), overrides: [{ path_pattern: '/_memory/*', behavior: 'public' }] }); },
  'preview exception': f => { pairedException(f).destinations[0].type = 'preview_worker'; },
  'path-specific public anchor': f => { f.workers.get(f.target.appWorkerName).app.destinations[1].uri += '/private'; },
  'unknown destination kind': f => { f.workers.get(f.target.appWorkerName).app.destinations.push({ type: 'private', uri: 'anything' }); },
  'missing Worker destination': f => { f.workers.get(f.target.appWorkerName).app.destinations.shift(); },
  'null destination': f => { f.workers.get(f.target.appWorkerName).app.destinations.push(null); },
  'different issuer': f => { f.receipts.get(`/accounts/${f.target.accountId}/access/organizations`).auth_domain = 'foreign.cloudflareaccess.com'; },
  'different human audience': f => { f.workers.get(f.target.appWorkerName).app.aud = 'foreign'; },
  'missing identity provider': f => { f.workers.get(f.target.appWorkerName).app.allowed_idps = []; },
  'different Access application ID': f => { f.workers.get(f.target.appWorkerName).app.id = 'foreign'; },
  'different canonical domain': f => { f.workers.get(f.target.appWorkerName).app.domain = 'foreign.example'; },
  'wildcard conflicting application': f => { f.apps.push({ id: 'foreign', domain: '*.example.workers.dev' }); },
  'null application receipt': f => { f.apps.push(null); },
  'service token used as human policy': f => { f.workers.get(f.target.appWorkerName).policy.include = [{ service_token: { token_id: 'fixture-service-id' } }]; },
  'everyone human policy': f => { f.workers.get(f.target.appWorkerName).policy.include = [{ everyone: {} }]; },
  'bypass policy': f => { f.workers.get(f.target.appWorkerName).policy.decision = 'bypass'; },
  'missing policy reference': f => { f.workers.get(f.target.appWorkerName).app.policies = []; },
  'unknown policy reference': f => { f.workers.get(f.target.appWorkerName).app.policies.push({ id: 'foreign' }); },
  'require policy not in reviewed contract': f => { f.workers.get(f.target.appWorkerName).policy.require = [{ everyone: {} }]; },
  'null policy selector': f => { f.workers.get(f.target.appWorkerName).policy.include = [null]; },
  'synthetic email': f => { f.workers.get(f.target.appWorkerName).policy.include[0].email.email = 'person@example.invalid'; },
  'wrong active Access audience variable': f => { f.setBinding(f.target.appWorkerName, 'CF_ACCESS_AUD', { type: 'plain_text', text: 'foreign' }); },
};
for (const [name, mutate] of Object.entries(unsafeAccess)) test(`Access readback blocks ${name}`, async t => {
  const f = operatorFixture(t); mutate(f);
  const result = await initialize(f.operator, inputFor(f));
  assert.equal(result.memory.status, 'pending-owner');
  assert.equal(result.memory.reason, 'access-unverified');
  assert.equal(result.memory.action, null);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_principals').get().n, 0);
});

test('no configured login and explicit open mode stay pending without an approval action', async t => {
  for (const openSwitch of [false, true]) {
    const f = operatorFixture(t); const input = inputFor(f);
    if (openSwitch) f.setBinding(f.target.appWorkerName, 'WORKSPACE_LOGIN', { type: 'plain_text', text: 'off' });
    else input.access = null;
    const result = await initialize(f.operator, input);
    assert.equal(result.memory.status, 'pending-owner');
    assert.equal(result.memory.reason, 'login-required'); assert.equal(result.memory.action, null);
    assert.equal((await status(f.operator, { installation: result.installation })).memory.reason, 'login-required');
    assert.equal(f.db.prepare('SELECT count(*) n FROM memory_owner_intents').get().n, openSwitch ? 1 : 0);
  }
});

const wrongResource = {
  'different database': f => { f.receipts.get(`/accounts/${f.target.accountId}/d1/database/${f.target.databaseId}`).uuid = 'foreign'; },
  'different bucket': f => { f.receipts.get(`/accounts/${f.target.accountId}/r2/buckets/${f.target.bucketName}`).name = 'foreign'; },
  'different worker': f => { f.workers.get(f.target.memoryWorkerName).info.name = 'foreign'; },
  'different DB binding': f => { f.setBinding(f.target.memoryWorkerName, 'MEMORY_DB', { type: 'd1', database_id: 'foreign' }); },
  'conflicting deprecated DB ID': f => { f.setBinding(f.target.memoryWorkerName, 'MEMORY_DB', { type: 'd1', database_id: f.target.databaseId, id: 'foreign' }); },
  'different bucket binding': f => { f.setBinding(f.target.memoryWorkerName, 'MEMORY_BUCKET', { type: 'r2_bucket', bucket_name: 'foreign' }); },
  'missing bucket binding': f => { f.setBinding(f.target.memoryWorkerName, 'MEMORY_BUCKET', null); },
  'staging environment': f => { f.setBinding(f.target.memoryWorkerName, 'WONG_ENVIRONMENT', { type: 'plain_text', text: 'staging' }); },
  'SKIP_AUTH even if false': f => { f.setBinding(f.target.appWorkerName, 'SKIP_AUTH', { type: 'plain_text', text: 'false' }); },
  'uploaded configuration not active': f => { f.workers.get(f.target.memoryWorkerName).active.resources.bindings.find(row => row.name === 'MEMORY_DB').database_id = 'foreign'; },
  'duplicate binding name': f => { const w = f.workers.get(f.target.memoryWorkerName); w.settings.bindings.push(w.settings.bindings[0]); },
  'malformed active bindings': f => { f.workers.get(f.target.memoryWorkerName).active.resources.bindings = null; },
  'wrong active version': f => { f.workers.get(f.target.memoryWorkerName).active.id = 'foreign'; },
  'partial deployment': f => { f.workers.get(f.target.memoryWorkerName).deployment.deployments[0].versions[0].percentage = 50; },
  'missing deployment versions': f => { f.workers.get(f.target.memoryWorkerName).deployment.deployments[0].versions = null; },
  'missing deployment': f => { f.workers.get(f.target.memoryWorkerName).deployment.deployments = []; },
  'multiple deployed versions': f => { const d = f.workers.get(f.target.memoryWorkerName).deployment.deployments[0]; d.versions.push({ ...d.versions[0] }); },
  'wrong workers subdomain': f => { f.receipts.get(`/accounts/${f.target.accountId}/workers/subdomain`).subdomain = 'foreign'; },
};
for (const [name, mutate] of Object.entries(wrongResource)) test(`resource readback rejects ${name} before writing schema`, async t => {
  const f = operatorFixture(t); mutate(f);
  await assert.rejects(initialize(f.operator, inputFor(f)), { code: 'target-mismatch' });
  assert.equal(f.batches, 0);
});

test('exact custom origins and deprecated matching D1 IDs work; version URLs cannot become canonical by inference', async t => {
  const f = operatorFixture(t);
  for (const [name, key, host] of [[f.target.appWorkerName, 'appUrl', 'app.fixture.example'], [f.target.memoryWorkerName, 'memoryOrigin', 'memory.fixture.example']]) {
    const w = f.workers.get(name);
    w.info.references.domains.push({ hostname: host });
    w.app.domain = host; w.app.destinations[1].uri = host; f.target[key] = `https://${host}`;
    f.setBinding(name, 'MEMORY_DB', { type: 'd1', id: f.target.databaseId });
  }
  assert.equal((await initialize(f.operator, inputFor(f))).memory.reason, 'owner-unconfirmed');
  const g = operatorFixture(t); const input = inputFor(g);
  input.target.memoryOrigin = input.target.memoryOrigin.replace('https://', 'https://12345678-');
  await assert.rejects(initialize(g.operator, input), { code: 'target-mismatch' });
});

test('malformed provider query envelopes and unbounded Access pagination fail closed', async t => {
  for (const receipt of [null, [], [{ success: false, results: [] }], [{ success: true, results: null }]]) {
    const f = operatorFixture(t);
    f.intercept = async (method, path) => method === 'POST' && path.endsWith('/query') ? receipt : undefined;
    await assert.rejects(initialize(f.operator, inputFor(f)), { code: 'provider-unavailable' });
    assert.equal(f.batches, 0);
  }
  const f = operatorFixture(t);
  f.intercept = async (method, path) => path.includes('/access/apps?') ? Array.from({ length: 50 }, (_, index) => ({ id: `foreign-${index}` })) : undefined;
  await assert.rejects(initialize(f.operator, inputFor(f)), { code: 'provider-unavailable' });
  assert.equal(f.calls.filter(row => row.path.includes('/access/apps?')).length, 100);
});

test('receipt projection is stable, excludes secret envelopes and binds critical protection', async t => {
  const f = operatorFixture(t);
  const inspect = async () => {
    const resources = await inspectResources(f.operator, f.target);
    assert.equal(await inspectProtection(f.operator, f.target, f.access, resources), null);
    assert.equal(humanAdmitted(resources, f.access.appApplicationId, 'owner@example.com'), true);
    assert.equal(humanAdmitted(resources, f.access.appApplicationId, 'unknown@example.com'), false);
    return protectionDigest(resources);
  };
  const before = await inspect();
  const w = f.workers.get(f.target.appWorkerName);
  w.info.private_secret = 'never project this'; w.app.private_secret = 'nor this'; w.policy.description = 'unrelated';
  w.settings.bindings.reverse(); w.active.resources.bindings.reverse(); w.app.destinations.reverse();
  assert.equal(await inspect(), before);
  w.policy.include.push({ email: { email: 'other@example.com' } });
  assert.notEqual(await inspect(), before);
  w.policy.include.pop();
  const version = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  w.active.id = version; w.deployment.deployments[0].versions[0].version_id = version;
  f.receipts.set(`/accounts/${f.target.accountId}/workers/scripts/${f.target.appWorkerName}/versions/${version}`, w.active);
  assert.notEqual(await inspect(), before);
  assert.equal(before.includes('never'), false);
});
