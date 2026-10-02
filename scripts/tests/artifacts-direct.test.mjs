import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DirectUpload } from '../pilots/artifacts/direct.mjs';
import { initialState, PilotController } from '../pilots/artifacts/core.mjs';
import { runPipeline } from '../pilots/artifacts/pipeline.mjs';
import { createManifest, inventory } from '../pilots/artifacts/lifecycle.mjs';
import { controllerConfig } from '../pilots/artifacts/config.mjs';
import { hashKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';

const account = 'a'.repeat(32), run = 'direct123', sha = '1'.repeat(40), later = '2'.repeat(40), ref = 'refs/heads/main';
const prefix = `wong-artifacts-pilot-${run}`;
const config = { account, run, namespace: prefix, repo: `${prefix}-project`, backend: 'direct-api', staging: `${prefix}-staging`, production: `${prefix}-production`, stagingDB: 'staging-db', productionDB: 'production-db', owner: 'owner', ownerEmail: 'owner@example.com' };
const version = '12345678-1234-1234-1234-123456789012';
const params = { owner: prefix, repo: config.repo, ref, sha };
const source = 'export default { fetch() { return new Response("café ☕"); } };';
const artifact = async () => ({ sha, code: Buffer.from(source).toString('base64'), digest: await hashKey(source), exitCode: 0 });
function harness(options = {}) {
  const calls = [], steps = [], sleeps = [], fetches = [];
  const step = { do: async (name, settings, fn) => { steps.push({ name, settings }); return fn(); }, sleep: async (...args) => { sleeps.push(args); } };
  const request = async (path, method, body, _allow404, scope) => {
    calls.push({ path, method, body, scope }); assert.equal(scope, 'deployment');
    if (body instanceof FormData) {
      assert.deepEqual(new Uint8Array(await body.get('worker.mjs').arrayBuffer()), new TextEncoder().encode(source));
      const environment = path.includes(config.production) ? 'production' : 'staging';
      assert.deepEqual(JSON.parse(await body.get('metadata').text()).bindings, [{ type: 'd1', name: 'DB', id: config[`${environment}DB`] }]);
      return method === 'PUT' ? { version_id: version } : { id: version };
    }
    if (path.includes('/versions/')) return { id: options.version || version, resources: { bindings: options.bindings || [{ type: 'd1', name: 'DB', id: path.includes(config.production) ? config.productionDB : config.stagingDB }] } };
    if (method === 'POST' && path.endsWith('/subdomain')) { assert.deepEqual(body, { enabled: true, previews_enabled: true }); return {}; }
    if (path.includes('/workers/workers/')) {
      const target = path.endsWith(config.production) ? config.production : config.staging;
      return { subdomain: { enabled: true, previews_enabled: true, url: `https://${target}.fixture.workers.dev`, preview_url_suffix: `-${target}.fixture.workers.dev`, ...options.routing } };
    }
    assert.fail(path);
  };
  const fetcher = async (url, init) => {
    fetches.push(url); assert.equal(init.redirect, 'manual');
    if (options.unavailable || fetches.length <= (options.delayed || 0)) return new Response(null, { status: 503 });
    return Response.json({ commit: options.identity || sha });
  };
  return { api: new DirectUpload(config, request, step, fetcher), calls, steps, sleeps, fetches };
}
function control() {
  return new PilotController(initialState(config), { ...config, head: async () => sha, fetch: async () => Response.json({ commit: sha }) });
}
const controllerCall = c => async (op, input) => {
  if (op === 'start') return c.start(input.params, input.job);
  if (op === 'preview') return c.preview(input.sha, input.ref, input.result, input.deployment);
  if (op === 'fail') return c.fail(input.sha, input.ref);
  if (op === 'begin-publication') { await c.currentHead(c.state.approvals[input.id]?.sha, c.state.approvals[input.id]?.ref); return c.beginPublication(input.id, input.job); }
  if (op === 'finish-publication') return c.finishPublication(input.id, input.sha, input.version);
  assert.fail(op);
};
async function preview(c, api) {
  const runners = [], result = await artifact();
  const ci = { runner: async options => { runners.push(options); return { exitCode: 0, logs: { stdout: `PILOT_RESULT=${JSON.stringify(result)}`, stderr: '' } }; } };
  await runPipeline({ payload: params, instanceId: 'green' }, ci, controllerCall(c), config, api);
  return runners;
}

test('direct API runs one credential-free check/build, uploads exact UTF-8 bytes, and deduplicates events', async () => {
  const c = control(), h = harness({ delayed: 2 });
  const runners = await preview(c, h.api);
  assert.equal(runners.length, 1);
  assert.equal(runners[0].command, 'npm test && npm run build');
  assert.equal(runners[0].cloudflareCredentials, false); assert.equal(runners[0].sourceControlCredentials, false);
  assert.deepEqual(runners[0].env, { PILOT_COMMIT: sha });
  assert.equal(h.calls.filter(row => row.body instanceof FormData).length, 1);
  assert.ok(h.calls.every(row => !row.path.includes(config.production)));
  assert.equal(h.sleeps.length, 2);
  assert.ok(h.steps.every(row => row.settings.retries.limit === 0));
  assert.equal(c.state.production, null); assert.equal(c.candidate(sha, ref).checks, 'PASS');
  assert.equal(c.candidate(sha, ref).url, `https://12345678-${config.staging}.fixture.workers.dev`);
  const count = h.calls.length;
  await runPipeline({ payload: params, instanceId: 'duplicate' }, { runner: () => assert.fail('duplicate runner') }, controllerCall(c), config, h.api);
  assert.equal(h.calls.length, count);
});

test('red or unreadable runner results cannot reach direct API uploads', async () => {
  for (const output of [{ exitCode: 1, stdout: '' }, { exitCode: 0, stdout: '' }, { exitCode: 0, stdout: `PILOT_RESULT=${JSON.stringify({ ...await artifact(), sha: later })}` }]) {
    const c = control(), h = harness();
    await assert.rejects(runPipeline({ payload: params, instanceId: 'red' }, { runner: async () => ({ exitCode: output.exitCode, logs: { stdout: output.stdout, stderr: '' } }) }, controllerCall(c), config, h.api));
    assert.equal(h.calls.length, 0); assert.equal(c.candidate(sha, ref).checks, 'FAIL');
  }
});

test('direct adapter rejects corrupt artifacts and unsafe targets before any provider call', async () => {
  for (const mutate of [r => { r.digest = 'bad'; }, r => { r.sha = later; }, r => { r.exitCode = 1; }, r => { r.code = Buffer.from([255]).toString('base64'); }]) {
    const h = harness(), result = await artifact(); mutate(result);
    await assert.rejects(h.api.preview(result, sha)); assert.equal(h.calls.length, 0);
  }
  for (const overrides of [{ staging: config.production }, { stagingDB: config.productionDB }, { production: 'unowned-worker' }]) {
    const h = harness(); h.api.config = { ...config, ...overrides };
    await assert.rejects(h.api.preview(await artifact(), sha), /targets/); assert.equal(h.calls.length, 0);
  }
});

test('direct preview requires matching version, sole staging binding, enabled provider URL and HTTP identity', async () => {
  for (const options of [
    { version: '87654321-1234-1234-1234-123456789012' },
    { bindings: [{ type: 'd1', name: 'DB', id: config.productionDB }] },
    { bindings: [{ type: 'd1', name: 'DB', id: config.stagingDB }, { type: 'secret_text', name: 'CF_TOKEN' }] },
    { routing: { previews_enabled: false } }, { routing: { preview_url_suffix: undefined } },
    { routing: { preview_url_suffix: `-${config.staging}.evil.example` } },
    { routing: { preview_url_suffix: `-${config.staging}.fixture.workers.dev/?redirect=bad` } },
    { identity: later }, { unavailable: true },
  ]) {
    const h = harness(options); await assert.rejects(h.api.preview(await artifact(), sha));
    assert.equal(h.calls.filter(row => row.body instanceof FormData).length, 1);
    assert.ok(h.fetches.length <= 12);
  }
});

test('direct production requires current approval and base and never uses another Sandbox', async () => {
  for (const mutation of ['missing', 'failed', 'stale', 'base', 'head']) {
    const c = control(), h = harness(); await preview(c, h.api);
    const approval = await c.approve({ sub: 'owner', role: 'owner' }, sha, ref);
    if (mutation === 'missing') delete c.state.approvals[approval.id];
    if (mutation === 'failed') c.candidate(sha, ref).checks = 'FAIL';
    if (mutation === 'stale') c.state.latest[ref] = later;
    if (mutation === 'base') c.state.production = later;
    if (mutation === 'head') c.adapters.head = async () => later;
    await assert.rejects(runPipeline({ payload: { pilotApproval: approval.id }, instanceId: 'publish' }, { runner: () => assert.fail('no publication runner') }, controllerCall(c), config, h.api));
    assert.equal(h.calls.filter(row => row.method === 'PUT').length, 0);
  }
  const c = control(), h = harness(); await preview(c, h.api);
  const approval = await c.approve({ sub: 'owner', role: 'owner' }, sha, ref);
  await runPipeline({ payload: { pilotApproval: approval.id }, instanceId: 'publish' }, { runner: () => assert.fail('no publication runner') }, controllerCall(c), config, h.api);
  assert.equal(c.state.production, sha); assert.equal(h.calls.filter(row => row.method === 'PUT').length, 1);
  assert.equal(h.fetches.at(-1), `https://${config.production}.fixture.workers.dev/identity`);
});

test('ambiguous direct publication retains reservation; changed approved bytes cannot upload', async () => {
  for (const corrupt of [true, false]) {
    const c = control(), h = harness(); await preview(c, h.api);
    const approval = await c.approve({ sub: 'owner', role: 'owner' }, sha, ref);
    if (corrupt) c.candidate(sha, ref).code = Buffer.from('changed').toString('base64');
    else h.api.fetcher = async () => Response.json({ commit: later });
    await assert.rejects(runPipeline({ payload: { pilotApproval: approval.id }, instanceId: 'publish' }, {}, controllerCall(c), config, h.api));
    assert.equal(c.state.publication.id, approval.id); assert.equal(c.state.production, null);
    assert.equal(h.calls.filter(row => row.method === 'PUT').length, corrupt ? 0 : 1);
  }
});

test('direct manifest/config uses original resource inventory and twelve serialized candidates only', () => {
  const m = createManifest(account, run, 'direct-api');
  assert.equal(m.bounds.builds, 12); assert.equal(inventory(m).length, inventory(createManifest(account, run)).length);
  m.resources = inventory(m).map((row, index) => ({ ...row, status: 'created', id: `resource-${index}` }));
  assert.equal(JSON.parse(controllerConfig(m, 'owner', 'owner@example.com').vars.PILOT_CONFIG).backend, 'direct-api');
  for (const backend of ['custom', 'workers-builds', 'direct-api']) {
    const c = control(); c.adapters.backend = backend;
    const bound = backend === 'direct-api' ? 12 : 10;
    for (let n = 0; n < bound; n++) { const id = n.toString(16).padStart(40, '0'); c.start({ ...params, sha: id }, `job-${n}`); c.fail(id, ref); }
    assert.throws(() => c.start({ ...params, sha: later }, 'over-bound'), /bound reached/);
  }
});


test('direct durable steps satisfy the installed Workflows runtime configuration schema', async () => {
  const require = createRequire(new URL('../pilots/artifacts/node_modules/miniflare/package.json', import.meta.url));
  const runtime = readFileSync(new URL('../pilots/artifacts/node_modules/miniflare/dist/src/workers/workflows/binding.worker.js', import.meta.url), 'utf8');
  const expression = runtime.match(/var STEP_CONFIG_SCHEMA = ([\s\S]*?);\nfunction isValidStepConfig/)[1];
  const schema = runInNewContext(expression, { z: require('zod'), SENSITIVE_STEP_OUTPUT: 'output' });
  assert.equal(schema.safeParse({ retries: { limit: 0 }, timeout: '2 minutes' }).success, false);
  const h = harness(); await h.api.preview(await artifact(), sha);
  for (const { settings } of h.steps) assert.equal(schema.safeParse(settings).success, true);
});
