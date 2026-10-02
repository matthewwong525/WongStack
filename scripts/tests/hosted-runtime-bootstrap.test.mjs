import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapBindings, bootstrapModule, wireBootstrap } from '../../server/hosted/bootstrap.mjs';
import { HostedProvider } from '../../server/hosted/provider.mjs';
import { to64, from64 } from '../../server/hosted/security.mjs';
import { fixture, config, projectId, versionId, sha } from './hosted-runtime-fixture.mjs';

async function bootstrapFixture() {
  const f = await fixture(); const active = new Map(), versions = new Map(), calls = [];
  f.state.resources = [];
  f.state.access = { verified: true, appId: 'app-id', audience: 'audience', teamDomain: 'team.cloudflareaccess.com', workers: [] };
  for (const [index, environment] of ['production', 'staging', 'memory'].entries()) {
    const name = `${config.prefix}-${projectId}-${environment}`;
    f.state.resources.push({ kind: 'worker', environment, name, id: name, status: 'created', initialVersion: versionId, initialDeployment: projectId });
    f.state.resources.push({ kind: 'd1', environment, name, id: index === 0 ? projectId : index === 1 ? versionId : '77777777-7777-4777-8777-777777777777', status: 'created' });
    f.state.access.workers.push({ name, id: String(index + 1).repeat(32) });
    active.set(name, { id: projectId, versions: [{ version_id: versionId }] });
    versions.set(`${name}:${versionId}`, []);
  }
  f.state.resources.push({ kind: 'r2', environment: 'memory', name: 'owned-memory', id: 'owned-memory', status: 'created' });
  f.provider.path = path => path;
  f.provider.request = async path => f.state.access.workers.find(row => path.endsWith(row.name));
  f.provider.currentDeployment = async name => active.get(name);
  f.provider.verifyVersion = async (name, version, bindings) => assert.deepEqual(versions.get(`${name}:${version}`), bindings);
  f.provider.version = async (name, modules, bindings) => {
    const id = `99999999-9999-4999-8999-${String(calls.length + 1).padStart(12, '0')}`;
    calls.push({ operation: 'upload', name, modules, bindings }); versions.set(`${name}:${id}`, bindings); return id;
  };
  f.provider.deploy = async (name, version) => { calls.push({ operation: 'deploy', name, version }); active.set(name, { id: projectId, versions: [{ version_id: version }] }); return projectId; };
  f.provider.routing = async (name, version, readOnly) => { assert.equal(version, undefined); calls.push({ operation: 'routing', name, readOnly }); return `https://${name}.team.workers.dev`; };
  f.provider.query = async () => { throw new Error('Canonical memory initialization is not available'); };
  return { ...f, active, versions, calls, wire: () => wireBootstrap(f.state, f.provider, () => f.controller.save()) };
}

test('bootstrap installs protected production and memory placeholders sharing only production memory resources', async () => {
  const f = await bootstrapFixture(); const origins = await f.wire();
  const uploads = f.calls.filter(row => row.operation === 'upload'); assert.equal(uploads.length, 2);
  assert(uploads.every(row => !row.name.endsWith('-staging')));
  const app = uploads.find(row => row.name.endsWith('-production'));
  const memory = uploads.find(row => row.name.endsWith('-memory'));
  assert.deepEqual(app.bindings.find(row => row.name === 'MEMORY_DB'), memory.bindings.find(row => row.name === 'MEMORY_DB'));
  assert.deepEqual(app.bindings.find(row => row.name === 'MEMORY_BUCKET'), memory.bindings.find(row => row.name === 'MEMORY_BUCKET'));
  assert.equal(app.bindings.find(row => row.name === 'DB').id, projectId);
  assert(!memory.bindings.some(row => ['DB', 'ASSETS', 'SKIP_AUTH'].includes(row.name)));
  assert(uploads.every(row => row.bindings.find(binding => binding.name === 'WONG_ENVIRONMENT').text === 'production'));
  assert(uploads.every(row => row.bindings.find(binding => binding.name === 'CF_ACCESS_AUD').text === 'audience'));
  assert.notEqual(app.bindings.find(row => row.name === 'CF_ACCESS_WORKER_ID').text, memory.bindings.find(row => row.name === 'CF_ACCESS_WORKER_ID').text);
  assert.equal(f.state.bootstrap.memory.status, 'verified'); assert.equal(origins.memoryOrigin, f.state.bootstrap.memory.origin);
  assert(f.writes.some(row => row.bootstrap?.production?.status === 'uploading'));
  assert(f.writes.some(row => row.bootstrap?.memory?.status === 'deploying'));
  assert(new TextDecoder().decode(from64(memory.modules[0].content)).includes('runtimeFetch'));
  const entry = await import(`data:text/javascript;base64,${to64(new TextEncoder().encode(bootstrapModule(projectId)))}`);
  const env = Object.fromEntries(memory.bindings.filter(row => row.text).map(row => [row.name, row.text]));
  assert.equal((await entry.default.fetch(new Request('https://memory/'), env, {})).status, 401);
  assert.equal((await entry.default.fetch(new Request('https://memory/_memory/connect'), env, {})).status, 503);
  assert.equal((await entry.default.fetch(new Request('https://memory/__wongstack/identity', { headers: { 'X-WongStack-Runtime': f.state.runtimeSecret } }), env, {})).status, 200);
  await f.wire(); assert.equal(f.calls.filter(row => row.operation === 'upload').length, 2);
  assert(f.calls.filter(row => row.operation === 'routing').slice(-2).every(row => row.readOnly === true));
});

test('bootstrap refuses shared databases, unowned resources, wrong Worker identity and staging targets', async () => {
  for (const mutate of [
    f => { f.state.resources.find(row => row.kind === 'd1' && row.environment === 'memory').id = projectId; },
    f => { f.state.resources.find(row => row.kind === 'worker' && row.environment === 'memory').status = 'creating'; },
    f => { f.state.resources.find(row => row.kind === 'r2').environment = 'staging'; },
    f => { f.provider.request = async () => ({ id: 'f'.repeat(32) }); },
  ]) {
    const f = await bootstrapFixture(); mutate(f); await assert.rejects(f.wire());
    assert(!f.calls.some(row => row.operation === 'upload' && row.name.endsWith('-memory')));
  }
  const f = await bootstrapFixture(); assert.throws(() => bootstrapBindings(f.state, 'staging'), /production bootstrap/);
  f.state.access.verified = false; await assert.rejects(f.wire(), /Protected/);
});

test('ambiguous bootstrap upload and deployment cannot replay on setup retry', async () => {
  for (const method of ['version', 'deploy']) {
    const f = await bootstrapFixture(); let attempts = 0;
    f.provider[method] = async () => { attempts++; throw new Error('provider acknowledgment lost'); };
    await assert.rejects(f.wire(), /acknowledgment lost/);
    assert.equal(f.state.bootstrap.production.status, method === 'version' ? 'uploading' : 'deploying');
    await assert.rejects(f.wire(), /reconciliation/); assert.equal(attempts, 1);
  }
});

test('acknowledged bootstrap deployment resumes readbacks without upload and pins its origin', async () => {
  const f = await bootstrapFixture(); const routing = f.provider.routing;
  f.provider.routing = async () => { throw new Error('routing unreadable'); };
  await assert.rejects(f.wire(), /routing unreadable/); assert.equal(f.state.bootstrap.production.status, 'deployed');
  f.provider.routing = routing; await f.wire();
  assert.equal(f.calls.filter(row => row.operation === 'upload').length, 2);
  assert.equal(f.calls.filter(row => row.operation === 'deploy').length, 2);
  f.provider.routing = async () => 'https://changed.example.com'; await assert.rejects(f.wire(), /origin changed/);
});

test('setup reruns preserve the published app and never replace changed initial code', async () => {
  const f = await bootstrapFixture(); await f.wire();
  const app = f.state.resources.find(row => row.kind === 'worker' && row.environment === 'production');
  const publishedVersion = '88888888-8888-4888-8888-888888888888';
  f.state.production = { sha, version: publishedVersion };
  f.active.set(app.name, { id: projectId, versions: [{ version_id: publishedVersion }] });
  f.versions.set(`${app.name}:${publishedVersion}`, bootstrapBindings(f.state, 'production', true).bindings);
  f.provider.version = async () => { throw new Error('Must preserve published code'); };
  f.provider.deploy = async () => { throw new Error('Must preserve published deployment'); };
  await f.wire(); assert.equal(f.active.get(app.name).versions[0].version_id, publishedVersion);
  delete f.state.bootstrap.production; await assert.rejects(f.wire(), /Published application/);
  const g = await bootstrapFixture(); const initial = g.state.resources.find(row => row.kind === 'worker' && row.environment === 'production');
  g.active.set(initial.name, { id: projectId, versions: [{ version_id: publishedVersion }] });
  await assert.rejects(g.wire(), /cannot replace existing code/); assert.equal(g.calls.length, 0);
});

test('provider readbacks reject split current deployment and enabled production or memory previews', async () => {
  const api = result => Response.json({ success: true, result });
  const provider = new HostedProvider(config, 'private', async () => api({ deployments: [{ id: projectId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 50 }, { version_id: projectId, percentage: 50 }] }] }));
  await assert.rejects(provider.currentDeployment('owned-production'), /readback mismatch/);
  for (const name of ['owned-production', 'owned-memory']) {
    provider.fetcher = async () => api({ subdomain: { enabled: true, previews_enabled: true, url: `https://${name}.team.workers.dev` } });
    await assert.rejects(provider.routing(name, undefined, true), /routing state differs/);
  }
});
