import test from 'node:test';
import assert from 'node:assert/strict';
import { HostedProvider } from '../../server/hosted/provider.mjs';
import { ProjectService, safeRoute } from '../../server/hosted/service.mjs';
import { packets, packet, proveAncestry, advanceDefault } from '../../server/hosted/git.mjs';
import { accessSetup, policies, revokeHuman } from '../../server/hosted/access.mjs';
import { fixture, bundle, config, sha, older, ref, projectId, versionId } from './hosted-runtime-fixture.mjs';
import { digest } from '../../server/hosted/security.mjs';

const api = result => Response.json({ success: true, result });
const absent = () => Response.json({ success: false, errors: [{ code: 10000, message: 'do not expose private provider detail' }] }, { status: 404 });
const providerWith = fetcher => new HostedProvider(config, 'provider-secret', fetcher);
test('provider controls exact HTTPS endpoints and sanitizes all failed response bodies', async () => {
  const calls = [];
  const provider = providerWith(async (url, input) => { calls.push({ url, input }); return api({ id: 'safe' }); });
  await provider.request(provider.path('workers/scripts/owned'), 'POST', { value: 1 });
  assert(calls[0].url.startsWith(`https://api.cloudflare.com/client/v4/accounts/${config.account}/`));
  assert.equal(calls[0].input.redirect, 'manual'); assert.equal(calls[0].input.headers.Authorization, 'Bearer provider-secret');
  const bad = providerWith(async () => absent());
  await assert.rejects(bad.request('/bad'), error => !error.message.includes('private provider detail') && error.status === 502);
  assert.equal(await bad.request('/bad', 'GET', undefined, true), null);
  assert.equal(await providerWith(async () => new Response(null, { status: 204 })).request('/delete', 'DELETE'), null);
  await assert.rejects(providerWith(async () => new Response('html', { status: 502 })).request('/bad'), /Provider request/);
});
test('repository preparation validates returned /git/account namespace and revokes creation token', async () => {
  const requests = [];
  const provider = providerWith(async (url, input) => {
    requests.push({ url, input });
    if (input.method === 'GET' && url.endsWith(`/repos/${projectId}`)) return absent();
    if (input.method === 'POST') return api({ remote: `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git` });
    if (url.includes('/tokens?state=active')) return api([{ id: 'initial' }]);
    if (input.method === 'DELETE') return api({ id: 'initial' });
    if (url.includes('/tokens?state=all')) return api([{ id: 'initial', state: 'revoked' }]);
    throw new Error('Unexpected request');
  });
  assert((await provider.prepare({ id: projectId })).endsWith(`/${projectId}.git`));
  assert(requests.some(row => row.input.method === 'DELETE'));
  const forged = providerWith(async (_url, input) => input.method === 'GET' ? absent() : api({ remote: `https://evil.example/git/${config.namespace}/${projectId}.git` }));
  await assert.rejects(forged.prepare({ id: projectId }), /repository URL/);
  await assert.rejects(providerWith(async () => api({ id: 'existing' })).prepare({ id: projectId }), /already exists/);
});
test('Git REST token contract uses plaintext, explicit scope and 30 minute TTL', async () => {
  let body;
  const provider = providerWith(async (_url, input) => { body = JSON.parse(input.body); return api({ id: 'id', plaintext: 'private-token', expires_at: '2030-01-01', scope: body.scope }); });
  const row = await provider.gitToken({ id: projectId });
  assert.equal(body.ttl, 1800); assert.equal(body.repo, projectId); assert.equal(row.token, 'private-token');
  await assert.rejects(provider.gitToken({ id: projectId }, 'admin'), /scope/);
  await assert.rejects(providerWith(async () => api({ id: 'id', token: 'wrong schema' })).gitToken({ id: projectId }), /receipt/);
});
test('provider revocation never treats absent or still active token as revoked', async () => {
  for (const rows of [[], [{ id: 'id', state: 'active' }]]) {
    const provider = providerWith(async (_url, input) => input.method === 'DELETE' ? api({ id: 'id' }) : api(rows));
    await assert.rejects(provider.revoke({ id: projectId }, 'id'), /revocation/);
  }
});
test('owned resource provisioning rejects adoption and validates all receipts', async () => {
  for (const kind of ['d1', 'r2', 'worker']) {
    await assert.rejects(providerWith(async () => api(kind === 'd1' ? [{ name: 'owned' }] : { id: 'exists' })).resource({ kind, name: 'owned' }), /already exists/);
  }
  const calls = [];
  const provider = providerWith(async (url, input) => {
    calls.push({ url, input });
    if (url.includes('/deployments?')) return api({ deployments: [{ id: projectId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] }] });
    if (url.includes(`/versions/${versionId}`)) return api({ id: versionId, resources: { bindings: [] } });
    if (input.method === 'GET') return url.includes('d1/database?') ? api([]) : absent();
    return api({ uuid: projectId });
  });
  assert.equal(await provider.resource({ kind: 'd1', name: 'owned' }), projectId);
  assert.equal(await provider.resource({ kind: 'r2', name: 'owned' }), 'owned');
  assert.equal(await provider.resource({ kind: 'worker', name: 'owned' }), 'owned');
  assert((await calls.find(row => row.input.method === 'PUT').input.body.get('entry.mjs').text()).includes('Setup pending'));
  await assert.rejects(provider.resource({ kind: 'other', name: 'owned' }), /Unsupported/);
});
test('owned resource deletion requires receipt and independent absence', async () => {
  const provider = providerWith(async (_url, input) => input.method === 'DELETE' ? api({}) : absent());
  for (const kind of ['d1', 'r2', 'worker']) await provider.deleteResource({ kind, name: 'owned', id: projectId, status: 'created' });
  await assert.rejects(provider.deleteResource({ kind: 'd1', id: projectId, status: 'creating' }), /receipt-owned/);
  await assert.rejects(providerWith(async () => api({ id: 'present' })).deleteResource({ kind: 'd1', id: projectId, status: 'created' }), /not observed/);
});
test('database queries require owned UUID and every statement to succeed', async () => {
  const provider = providerWith(async () => api([{ success: true, results: [] }]));
  assert.equal((await provider.query(projectId, 'SELECT 1'))[0].success, true);
  await assert.rejects(provider.query('unowned', 'SELECT 1'), /Owned/);
  await assert.rejects(providerWith(async () => api([{ success: false }])).query(projectId, 'SELECT 1'), /unreadable/);
});
test('real asset upload protocol sends digest manifest and completion token only to provider', async () => {
  const b = await bundle(); const asset = b.assets[0]; const calls = [];
  const provider = providerWith(async (url, input) => {
    calls.push({ url, input });
    return url.endsWith('assets-upload-session') ? api({ jwt: 'upload-jwt', buckets: [[asset.digest.slice(0, 32)]] }) : api({ jwt: 'completion-jwt' });
  });
  assert.equal(await provider.assets('owned-staging', b.assets), 'completion-jwt');
  assert.equal(calls[1].input.headers.Authorization, 'Bearer upload-jwt');
  assert.equal(JSON.parse(calls[0].input.body).manifest['/index.html'].hash.length, 32);
  assert.equal(await calls[1].input.body.get(asset.digest.slice(0, 32)).text(), asset.content);
  await assert.rejects(providerWith(async () => api({ jwt: 'jwt', buckets: [['unknown']] })).assets('owned-staging', b.assets), /unknown/);
  assert.equal(await providerWith(async () => api({ jwt: 'cached-completion', buckets: [] })).assets('owned-staging', b.assets), 'cached-completion');
});
test('version uploads read back exact owned bindings and reject missing version receipts', async () => {
  const b = await bundle(); const binding = { type: 'd1', name: 'DB', id: projectId }; let metadata;
  const provider = providerWith(async (_url, input) => {
    if (input.method === 'POST') { metadata = JSON.parse(await input.body.get('metadata').text()); return api({ id: versionId }); }
    return api({ id: versionId, resources: { bindings: [binding] } });
  });
  assert.equal(await provider.version('owned-staging', b.modules, [binding], 'completion'), versionId);
  assert.equal(metadata.assets.config.run_worker_first, true);
  await assert.rejects(providerWith(async (_url, input) => input.method === 'POST' ? api({ id: versionId }) : api({ id: versionId, resources: { bindings: [{ ...binding, id: versionId }] } })).version('owned-staging', b.modules, [binding]), /bindings/);
  await assert.rejects(providerWith(async () => api({ id: 'missing' })).version('owned-staging', b.modules, [binding]), /receipt/);
  const environment = { type: 'plain_text', name: 'WONG_ENVIRONMENT', text: 'production' };
  for (const actual of [[{ ...environment, text: 'staging' }], [environment, { type: 'plain_text', name: 'SKIP_AUTH', text: 'true' }], [environment, environment]]) {
    await assert.rejects(providerWith(async () => api({ id: versionId, resources: { bindings: actual } })).verifyVersion('owned-memory', versionId, [environment]), /bindings/);
  }
});
test('production deployment verifies exact ID-only acknowledgment with 100 percent readback', async () => {
  const provider = providerWith(async (_url, input) => input.method === 'POST' ? api({ id: projectId }) : api({ id: projectId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] }));
  assert.equal(await provider.deploy('owned-production', versionId), projectId);
  await assert.rejects(providerWith(async (_url, input) => input.method === 'POST' ? api({ id: projectId }) : api({ id: projectId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 99 }] })).deploy('owned-production', versionId), /readback/);
});
test('routing enables staging immutable versions while production and memory previews stay disabled', async () => {
  for (const name of ['owned-staging', 'owned-production', 'owned-memory']) {
    let desired;
    const provider = providerWith(async (_url, input) => {
      if (input.method === 'POST') { desired = JSON.parse(input.body); return api({}); }
      return api({ subdomain: { ...desired, url: `https://${name}.team.workers.dev`, preview_url_suffix: `-${name}.team.workers.dev` } });
    });
    assert((await provider.routing(name, name.endsWith('staging') ? versionId : undefined)).endsWith('.workers.dev'));
    assert.equal(desired.previews_enabled, name.endsWith('staging'));
    if (!name.endsWith('staging')) await assert.rejects(provider.routing(name, versionId), /forbidden/);
  }
});
test('Git packet parser rejects truncated, malformed and oversized provider responses', () => {
  assert.deepEqual(packets(packet('hello\n') + '0000'), ['hello\n']);
  for (const value of ['bad', 'zzzz', 'ffffno', '0003', 'a'.repeat(65537)]) assert.throws(() => packets(value), /Git/);
});
test('ancestry follows actual parent IDs and fails closed on malformed or divergent graph', async () => {
  const f = await fixture(); await proveAncestry(f.provider, f.state, older, sha);
  f.provider.request = async path => ({ hash: path.split('/').at(-1), parents: [] });
  await assert.rejects(proveAncestry(f.provider, f.state, older, sha), /fast-forward/);
  f.provider.request = async () => ({ hash: sha, parents: ['garbage'] });
  await assert.rejects(proveAncestry(f.provider, f.state, older, sha), /unreadable/);
});
test('parent-linked ancestry accepts a valid merge through its second parent without relying on log order', async () => {
  const f = await fixture(); const side = 'c'.repeat(40);
  f.provider.request = async path => {
    const hash = path.split('/').at(-1);
    return { hash, parents: hash === sha ? [side, older] : [] };
  };
  await proveAncestry(f.provider, f.state, older, sha);
  f.provider.request = async path => ({ hash: path.split('/').at(-1), parents: [sha] });
  await assert.rejects(proveAncestry(f.provider, f.state, older, sha), /fast-forward/);
});
test('Git ancestry graph is bounded even for an unreadable deep or excessively branching graph', async () => {
  const f = await fixture(); let count = 0;
  f.provider.request = async path => ({ hash: path.split('/').at(-1), parents: [(++count).toString(16).padStart(40, '0')] });
  await assert.rejects(proveAncestry(f.provider, f.state, older, sha), /finite history bound/);
  assert.equal(count, 512);
  f.provider.request = async path => ({ hash: path.split('/').at(-1), parents: Array.from({length: 513}, (_, i) => (i + 1).toString(16).padStart(40, '0')) });
  await assert.rejects(proveAncestry(f.provider, f.state, older, sha), /finite history bound/);
});
test('Git smart HTTP uses exact oldSHA CAS, valid empty PACK and revokes trusted write token', async () => {
  const f = await fixture(); const requests = []; let head = older;
  f.state.publication = {};
  f.provider.mainHead = async () => head;
  f.provider.fetcher = async (url, input) => {
    requests.push({ url, input });
    if (input.method === 'POST') { head = sha; return new Response(packet('unpack ok\n') + packet('ok refs/heads/main\n') + '0000', { headers: { 'Content-Type': 'application/x-git-receive-pack-result' } }); }
    return new Response(packet('# service=git-receive-pack\n') + '0000' + packet(`${older} refs/heads/main\0report-status delete-refs\n`) + '0000', { headers: { 'Content-Type': 'application/x-git-receive-pack-advertisement' } });
  };
  const result = await advanceDefault(f.provider, f.state, sha, older, () => f.controller.save());
  assert.equal(result.defaultSha, sha); assert.equal(f.state.publication.gitCredential.revoked, true);
  const body = requests[1].input.body;
  const text = new TextDecoder().decode(body); assert(text.includes(`${older} ${sha} refs/heads/main\0report-status`));
  assert.deepEqual(Array.from(body.slice(-32, -20)), [80, 65, 67, 75, 0, 0, 0, 2, 0, 0, 0, 0]);
  assert(f.operations.some(row => row[0] === 'revoke'));
});
test('stale Git push, rejected receive-pack, redirects and uncertain acknowledgments retain reservation', async () => {
  for (const mode of ['stale', 'redirect', 'rejected', 'network']) {
    const f = await fixture(); f.state.publication = { status: 'deployed-awaiting-main' };
    f.provider.fetcher = async (_url, input) => {
      if (input.method === 'POST') {
        if (mode === 'network') throw new Error('network failed');
        return new Response(packet('unpack ok\n') + packet('ng refs/heads/main stale old value\n') + '0000', { headers: { 'Content-Type': 'application/x-git-receive-pack-result' } });
      }
      if (mode === 'redirect') return new Response(null, { status: 302 });
      return new Response(packet('# service=git-receive-pack\n') + '0000' + packet(`${mode === 'stale' ? 'f'.repeat(40) : older} refs/heads/main\0report-status\n`) + '0000', { headers: { 'Content-Type': 'application/x-git-receive-pack-advertisement' } });
    };
    await assert.rejects(advanceDefault(f.provider, f.state, sha, older, () => f.controller.save()));
    assert(f.state.publication); assert.equal(f.state.publication.gitCredential.revoked, true);
  }
});
test('already current default SHA is authoritative no-op without issuing a write token', async () => {
  const f = await fixture(); f.provider.mainHead = async () => sha;
  f.provider.gitToken = async () => { throw new Error('must not mint'); };
  assert.equal((await advanceDefault(f.provider, f.state, sha, older, () => f.controller.save())).defaultSha, sha);
});

function accessProvider() {
  const apps = [], serviceTokens = [], policyRows = [];
  const workers = ['production', 'staging', 'memory'].map((environment, index) => ({ name: `${config.prefix}-${projectId}-${environment}`, id: String(index + 1).repeat(32) }));
  const calls = [];
  const p = {
    path: suffix => `/accounts/${config.account}/${suffix}`,
    request: async (path, method = 'GET', body) => {
      calls.push({ path, method, body });
      if (path.endsWith('/organizations')) return { auth_domain: 'team.cloudflareaccess.com' };
      if (path.includes('/identity_providers?')) return [{ id: 'pin', type: 'onetimepin' }];
      if (path.endsWith('/workers/subdomain')) return { subdomain: 'team' };
      if (path.includes('/workers/workers/')) return workers.find(row => path.endsWith(row.name));
      if (path.includes('/service_tokens?')) return serviceTokens;
      if (path.endsWith('/service_tokens') && method === 'POST') { const token = { ...body, id: 'token-id', client_id: 'client', client_secret: 'secret' }; serviceTokens.push(token); return token; }
      if (path.endsWith('/revoke_tokens')) return {};
      if (path.includes('/apps?')) return apps;
      if (path.endsWith('/apps') && method === 'POST') { const app = { ...body, id: 'app-id', aud: 'aud' }; apps.push(app); return app; }
      if (path.endsWith('/apps/app-id')) return apps[0];
      if (path.includes('/policies?')) return policyRows;
      if (path.endsWith('/policies') && method === 'POST') { const row = { ...body, id: `policy-${policyRows.length}` }; policyRows.push(row); return row; }
      if (path.includes('/policies/') && method === 'PUT') { const row = policyRows.find(each => path.endsWith(each.id)); Object.assign(row, body); return row; }
      throw new Error('Unexpected Access request ' + path);
    },
  };
  return { p, apps, serviceTokens, policyRows, calls, workers };
}
test('private Access uses actual Worker IDs, exact human policy and separate verification credential', async () => {
  const f = await fixture(); const a = accessProvider();
  f.state.resources = a.workers.map(row => ({ ...row, environment: row.name.split('-').at(-1), kind: 'worker' }));
  await accessSetup(f.state, a.p, () => f.controller.save());
  assert.equal(f.state.access.verified, true); assert.equal(a.apps[0].destinations.length, 3);
  assert.equal(a.policyRows.length, 2); assert.equal(f.state.access.clientSecret, 'secret');
  const safe = f.controller.status(); assert(!JSON.stringify(safe).includes('clientSecret'));
  await accessSetup(f.state, a.p, () => f.controller.save()); assert.equal(a.apps.length, 1); assert.equal(a.serviceTokens.length, 1);
  await revokeHuman(f.state, a.p, 'member@example.com', () => f.controller.save());
  assert(a.calls.some(row => row.path.endsWith('/apps/app-id/revoke_tokens') && row.method === 'POST'));
});
test('Access configuration rejects missing login, unknown policy and unverifiable service credential', async () => {
  const f = await fixture(); const a = accessProvider();
  f.state.resources = a.workers.map(row => ({ ...row, environment: row.name.split('-').at(-1), kind: 'worker' }));
  const original = a.p.request;
  a.p.request = async (...args) => args[0].endsWith('/organizations') ? {} : original(...args);
  await assert.rejects(accessSetup(f.state, a.p, () => f.controller.save()), /Zero Trust/);
  a.p.request = original; await accessSetup(f.state, a.p, () => f.controller.save());
  a.policyRows.push({ id: 'unowned', name: 'other' }); await assert.rejects(policies(f.state, a.p, () => f.controller.save()), /unreviewed/);
  a.policyRows.pop(); delete f.state.access.clientSecret;
  await assert.rejects(policies(f.state, a.p, () => f.controller.save()), /reconciliation/);
});

function storageFor(state) {
  const store = new Map([['state', structuredClone(state)]]); const alarms = [];
  return { storage: { get: async key => structuredClone(store.get(key)), put: async (key, value) => store.set(key, structuredClone(value)), setAlarm: async time => alarms.push(time) }, store, alarms };
}
test('service routing denies admin spoofing and caller-chosen cross-tenant paths', async () => {
  const paths = [];
  const env = { ADMIN_TOKEN: 'admin', PROJECTS: { idFromName: id => id, get: id => ({ fetch: async request => { paths.push({ id, path: new URL(request.url).pathname }); return Response.json({ id }); } }) } };
  assert.equal((await safeRoute(new Request(`https://service/v1/projects/${projectId}/status`, { headers: { Authorization: 'Bearer forged' } }), env)).status, 403);
  assert.equal((await safeRoute(new Request(`https://service/internal/start`, { headers: { Authorization: `Bearer wongh_${projectId}_${'a'.repeat(64)}` } }), env)).status, 404);
  assert.equal((await safeRoute(new Request('https://service/v1/workspace', { headers: { Authorization: `Bearer wongh_${projectId}_${'a'.repeat(64)}` } }), env)).status, 200);
  assert.deepEqual(paths[0], { id: projectId, path: '/workspace' });
  assert.equal((await safeRoute(new Request(`https://service/v1/projects/${projectId}/site`, { method: 'POST', headers: { Authorization: 'Bearer admin' }, body: '{}' }), env)).status, 200);
});
test('service dispatch verifies live grant before issuing repository credentials', async () => {
  const f = await fixture(); const ctx = storageFor(f.state);
  const service = new ProjectService(ctx, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'provider-secret' });
  service.provider = f.provider;
  const workspace = await service.dispatch(new Request('https://project/workspace', { headers: { Authorization: `Bearer ${f.handoff.token}` } }));
  assert.equal(workspace.projectId, projectId);
  const token = await service.dispatch(new Request('https://project/git-token', { method: 'POST', headers: { Authorization: `Bearer ${f.handoff.token}` }, body: '{}' }));
  assert.equal(token.gitUrl, f.state.gitUrl);
  await assert.rejects(service.dispatch(new Request('https://project/workspace', { headers: { Authorization: 'Bearer attacker' } })), /unavailable/);
});
test('candidate upload is tenant/commit scoped, immutable and integrity checked in private storage', async () => {
  const f = await fixture(); await f.controller.candidate({ sha, ref }); const started = await f.controller.start(sha, ref, 'job');
  const raw = JSON.stringify(await bundle()); const objects = new Map(); const ctx = storageFor(f.state);
  const env = { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'provider-secret', BUNDLES: { head: async key => objects.get(key), put: async (key, value) => objects.set(key, value), get: async key => objects.has(key) ? { text: async () => objects.get(key) } : null } };
  const service = new ProjectService(ctx, env); service.provider = f.provider;
  const req = value => new Request(`https://project/upload/${sha}?ref=${encodeURIComponent(ref)}`, { method: 'PUT', headers: { Authorization: `Bearer ${started.uploadToken}` }, body: value });
  const receipt = await service.dispatch(req(raw)); assert.equal(receipt.digest, await digest(raw)); assert.equal(objects.size, 1);
  await service.dispatch(req(raw)); assert.equal(objects.size, 1);
  const loaded = await service.loadBundle(sha, ref, receipt.digest); assert.equal(loaded.bundle.main, 'index.js');
  objects.set([...objects.keys()][0], '{}'); await assert.rejects(service.loadBundle(sha, ref, receipt.digest), /corruption/);
  await assert.rejects(service.dispatch(new Request(`https://project/upload/${sha}?ref=${encodeURIComponent(ref)}`, { method: 'PUT', headers: { Authorization: 'Bearer attacker' }, body: raw })), /authority/);
});
test('export receipt requires exact stopped project and independent verified restore before cleanup', async () => {
  const f = await fixture(); const ctx = storageFor(f.state);
  const service = new ProjectService(ctx, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'secret' }); service.provider = f.provider;
  const input = { projectId, account: config.account, namespace: config.namespace, gitUrl: f.state.gitUrl, refsDigest: 'e'.repeat(64), refsIdentical: true, fsckPassed: true, independentRestore: true, completedAt: Date.now() };
  const req = body => new Request('https://project/admin/export-receipt', { method: 'POST', body: JSON.stringify(body) });
  await assert.rejects(service.dispatch(req(input)), /Quiesce/);
  ctx.store.get('state').stopped = true;
  await assert.rejects(service.dispatch(req({ ...input, account: 'wrong' })), /verified Git/);
  const receipt = await service.dispatch(req(input)); assert.equal(receipt.refsDigest, input.refsDigest);
  assert.equal(ctx.store.get('state').exportVerified, true);
});
test('cleanup rejects missing export, active publication and ambiguous resource state', async () => {
  const f = await fixture(); const ctx = storageFor(f.state);
  const service = new ProjectService(ctx, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'secret' }); service.provider = f.provider;
  await service.load(); service.state.stopped = true;
  await assert.rejects(service.cleanup(), /export receipt/);
  service.state.exportVerified = true; service.state.resources.push({ status: 'creating' });
  await assert.rejects(service.cleanup(), /ambiguous/);
  service.state.publication = { sha }; await assert.rejects(service.cleanup(), /reconcile/);
});
test('setup provisions only owned resources and returns operator/device action without granting memory authority', async () => {
  const f = await fixture(); const a = accessProvider();
  f.state.setup = 'pending';
  f.provider.path = a.p.path; f.provider.request = a.p.request;
  const active = new Map(), versions = new Map();
  f.provider.resource = async row => {
    if (row.kind === 'worker') {
      row.initialVersion = versionId; row.initialDeployment = projectId;
      active.set(row.name, { id: projectId, versions: [{ version_id: versionId }] });
      versions.set(`${row.name}:${versionId}`, []);
    }
    return row.kind === 'd1' ? row.environment === 'production' ? projectId : row.environment === 'staging' ? versionId : '77777777-7777-7777-7777-777777777777' : row.name;
  };
  f.provider.currentDeployment = async name => active.get(name);
  f.provider.verifyVersion = async (name, version, bindings) => assert.deepEqual(versions.get(`${name}:${version}`), bindings);
  f.provider.version = async (name, _modules, bindings) => { const id = '99999999-9999-4999-8999-999999999999'; versions.set(`${name}:${id}`, bindings); return id; };
  f.provider.deploy = async (name, version) => { active.set(name, { id: projectId, versions: [{ version_id: version }] }); return projectId; };
  f.provider.routing = async name => `https://${name}.team.workers.dev`;
  const result = await f.controller.setup(f.owner);
  assert.equal(result.memory.protocolVersion, 1); assert.equal(result.memory.status, 'pending-owner'); assert.equal(result.memory.reason, 'owner-unconfirmed');
  assert.equal(result.memory.action.url, result.memory.appUrl + '/apps/devices/');
  assert.notEqual(result.memory.installationId, f.state.id); assert.deepEqual(result.env, {});
  assert.equal(result.wrangler.preview_urls, false); assert.equal(result.wrangler.env.staging.preview_urls, true);
  assert.equal(result.wrangler.env.staging.d1_databases.length, 1); assert.equal(result.wrangler.env.staging.r2_buckets.length, 0);
  assert.equal(f.state.resources.length, 7);
  const second = await f.controller.setup(f.owner); assert.equal(second.memory.installationId, result.memory.installationId);
});
test('interrupted provisioning retains ambiguous owned receipt and cannot recreate blindly', async () => {
  const f = await fixture();
  f.provider.resource = async () => { throw new Error('response lost'); };
  await assert.rejects(f.controller.resource('d1', 'memory'), /response lost/);
  assert.equal(f.state.resources[0].status, 'creating');
  await assert.rejects(f.controller.resource('d1', 'memory'), /reconciliation/);
});
test('queue creation uncertainty preserves exact workflow ID and bounded recovery without duplicate creation', async () => {
  const f = await fixture(); await f.controller.candidate({ sha, ref });
  const ctx = storageFor(f.state); let creates = 0;
  const workflow = { create: async () => { creates++; throw new Error('lost ack'); }, get: async () => { throw new Error('unreadable'); } };
  const service = new ProjectService(ctx, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'secret', CI_WORKFLOW: workflow }); service.provider = f.provider;
  await service.load(); await service.enqueue(); await service.enqueue();
  assert.equal(creates, 1); assert(service.state.candidates[`${ref}:${sha}`].workflow.includes(projectId));
  await service.recover(); assert.equal(creates, 1); assert.equal(service.state.candidates[`${ref}:${sha}`].recoveryPolls, 1);
  ctx.store.get('state').candidates[`${ref}:${sha}`].recoveryPolls = 59;
  const before = ctx.alarms.length; await service.recover(); assert.equal(ctx.alarms.length, before);
});
test('service status and redirects never expose tenant runtime or machine credentials', async () => {
  const f = await fixture(); f.state.access = { verified: true, clientSecret: 'access-secret' }; f.state.production = { sha, version: versionId, url: 'https://private.workers.dev' };
  const ctx = storageFor(f.state); const service = new ProjectService(ctx, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'provider-secret' }); service.provider = f.provider;
  const status = await service.dispatch(new Request('https://project/admin/status'));
  assert(!JSON.stringify(status).includes('access-secret')); assert(!JSON.stringify(status).includes(f.handoff.token));
  const site = await service.dispatch(new Request('https://project/admin/site', { method: 'POST', body: JSON.stringify({ sha: null }) }));
  assert.deepEqual(site, { url: 'https://private.workers.dev', projectId, sha, accessVerified: true });
  await assert.rejects(service.dispatch(new Request('https://project/admin/site', { method: 'POST', body: JSON.stringify({ sha: older }) })), /unavailable/);
});
