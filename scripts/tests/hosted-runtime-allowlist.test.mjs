import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceConfig } from '../../server/hosted/config.mjs';
import { ProjectController, initialProject } from '../../server/hosted/project.mjs';
import { safeRoute } from '../../server/hosted/service.mjs';
import { config, sha, projectId } from './hosted-runtime-fixture.mjs';

const planned = ['a13a2202-3ea0-41b9-96b2-4c0b14235c31', 'c1b7db67-9e30-46aa-9a8c-82c96bca4210'];
const malformed = [null, 'any', {}, ['bad'], [planned[0], planned[0]], [...planned, projectId, '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444']];
const owner = { id: 'verified-owner', email: 'owner@example.com' };
const prepareBody = id => ({ id, owner, source: { repo: 'owner/source', commit: sha } });

test('optional trial allowlist validates unique UUIDs and leaves ordinary production configuration unrestricted', () => {
  for (const projectIds of malformed) assert.throws(() => serviceConfig({ ...config, projectIds }), /Project allowlist/);
  assert.deepEqual(JSON.parse(serviceConfig({ ...config, projectIds: planned }).vars.HOSTED_CONFIG).projectIds, planned);
  assert.deepEqual(JSON.parse(serviceConfig({ ...config, projectIds: [] }).vars.HOSTED_CONFIG).projectIds, []);
  assert.equal(JSON.parse(serviceConfig(config).vars.HOSTED_CONFIG).projectIds, undefined);
});

test('trusted controller rejects outside projects without checkpoints or repository creation', async () => {
  for (const projectIds of [planned, [], ...malformed]) {
    const state = initialProject(); let writes = 0, creates = 0;
    const controller = new ProjectController(state, { config: { ...config, projectIds }, checkpoint: async () => { writes++; }, provider: { prepare: async () => { creates++; } } });
    await assert.rejects(controller.prepare(prepareBody(projectId)), error => error.status === 403);
    assert.equal(writes, 0); assert.equal(creates, 0); assert.equal(state.id, undefined);
  }
  for (const id of planned) {
    let creates = 0;
    const controller = new ProjectController(initialProject(), { config: { ...config, projectIds: planned }, checkpoint: async () => {}, provider: { prepare: async () => { creates++; return `https://git.example/${id}.git`; } } });
    assert.equal((await controller.prepare(prepareBody(id))).projectId, id); assert.equal(creates, 1);
  }
  const controller = new ProjectController(initialProject(), { config, checkpoint: async () => {}, provider: { prepare: async () => 'https://git.example/unrestricted.git' } });
  assert.equal((await controller.prepare(prepareBody(projectId))).projectId, projectId);
});

test('trial router blocks admin and machine routes before Durable Object lookup, storage or provider activity', async () => {
  for (const projectIds of [planned, [], ...malformed]) {
    let routed = 0;
    const env = { HOSTED_CONFIG: JSON.stringify({ ...config, projectIds }), ADMIN_TOKEN: 'private-admin', PROJECTS: {
      idFromName: () => { routed++; throw new Error('Forbidden Durable Object lookup'); },
      get: () => { throw new Error('Forbidden storage/provider access'); },
    } };
    const requests = [
      new Request('https://service/v1/projects', { method: 'POST', headers: { Authorization: 'Bearer private-admin' }, body: JSON.stringify(prepareBody(projectId)) }),
      new Request(`https://service/v1/projects/${projectId}/status`, { headers: { Authorization: 'Bearer private-admin' } }),
      new Request(`https://service/v1/projects/${projectId}/access`, { method: 'POST', headers: { Authorization: 'Bearer private-admin' }, body: '{}' }),
      new Request('https://service/v1/workspace', { headers: { Authorization: `Bearer wongh_${projectId}_${'a'.repeat(64)}` } }),
      new Request(`https://service/v1/bundles/${projectId}/${sha}`, { method: 'PUT', body: '{}' }),
    ];
    for (const request of requests) {
      const response = await safeRoute(request, env);
      assert.equal(response.status, 403); assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.match((await response.json()).error, /outside the configured trial allowlist/);
    }
    assert.equal(routed, 0);
  }
});

test('both planned projects route normally and absent allowlist permits ordinary project IDs', async () => {
  const routed = [];
  const env = { HOSTED_CONFIG: JSON.stringify({ ...config, projectIds: planned }), ADMIN_TOKEN: 'private-admin', PROJECTS: {
    idFromName: id => id,
    get: id => ({ fetch: async () => { routed.push(id); return Response.json({ projectId: id }); } }),
  } };
  for (const id of planned) {
    const response = await safeRoute(new Request('https://service/v1/projects', { method: 'POST', headers: { Authorization: 'Bearer private-admin' }, body: JSON.stringify(prepareBody(id)) }), env);
    assert.equal(response.status, 200); assert.equal((await response.json()).projectId, id);
  }
  env.HOSTED_CONFIG = JSON.stringify(config);
  assert.equal((await safeRoute(new Request(`https://service/v1/projects/${projectId}/status`, { headers: { Authorization: 'Bearer private-admin' } }), env)).status, 200);
  assert.deepEqual(routed, [...planned, projectId]);
});
