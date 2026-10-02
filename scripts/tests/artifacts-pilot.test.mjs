import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, statSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initialState, PilotController, signSession, verifySession, pilotMemory, branchName } from '../pilots/artifacts/core.mjs';
import { createManifest, inventory, writePrivate, readManifest, ensureResource, cleanup } from '../pilots/artifacts/lifecycle.mjs';
import { buildResult, deploymentCommand, deploymentResult, runPipeline } from '../pilots/artifacts/pipeline.mjs';
import { caseEvidence, redact, adoption, compareRefs } from '../pilots/artifacts/evidence.mjs';
import { controllerConfig } from '../pilots/artifacts/config.mjs';
import { CloudflareProvider } from '../pilots/artifacts/provider.mjs';
import { ManagedBuilds, managedTrigger, managedReceipt, validateTrigger } from '../pilots/artifacts/builds.mjs';
import { managedOperation } from '../pilots/artifacts/managed-lifecycle.mjs';
import { hashKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { WRITES } from '../../.agents/skills/memory/worker/statements.mjs';

const account = 'a'.repeat(32), run = 'trial123', secret = 'x'.repeat(48);
const sha = '1'.repeat(40), sha2 = '2'.repeat(40), ref = 'refs/heads/feature';
const config = { account, run, namespace: `wong-artifacts-pilot-${run}`, repo: `wong-artifacts-pilot-${run}-project`, owner: 'opaque-owner', ownerEmail: 'owner@example.com', staging: `wong-artifacts-pilot-${run}-staging`, production: `wong-artifacts-pilot-${run}-production`, stagingDB: 'staging-db', productionDB: 'production-db' };
const version = '12345678-1234-1234-1234-123456789012';
const owner = { sub: config.owner, role: 'owner' };
const member = { sub: 'opaque-member', role: 'member', email: 'member@example.com' };
const params = (id = sha) => ({ owner: config.namespace, repo: config.repo, sha: id, ref });
const deployment = { target: config.staging, database: config.stagingDB, reported: true, version, url: `https://${version.slice(0, 8)}-${config.staging}.fixture.workers.dev/` };
function controller(overrides = {}) {
  const state = initialState(config);
  const adapters = { ...config, head: async () => sha, fetch: async () => Response.json({ commit: sha }), issueToken: async (_repo, scope) => ({ id: 'token-1', scope, plaintext: 'private-token', expiresAt: 'soon' }), revokeToken: async () => {}, tokenRevoked: async () => true, deleteMemoryKey: async () => {}, memoryKeyAbsent: async () => true, ...overrides };
  const control = new PilotController(state, adapters);
  control.addMember(owner, member.sub, member.email);
  return control;
}
const artifact = async () => ({ sha, code: btoa('export default {};'), digest: await hashKey('export default {};'), exitCode: 0 });
async function ready(control) { control.start(params(), 'job'); await control.preview(sha, ref, await artifact(), deployment); }
const claims = (sub = member.sub) => ({ sub, run, project: config.repo, aud: 'artifacts-pilot', epoch: 0, exp: Date.now() + 100000 });
const splitConfig = { ...config, backend: 'workers-builds', builds: { trigger: 'trigger-id', connection: 'connection-id', workerTag: 'worker-tag', repoID: 'repo-id' } };
const splitTrigger = () => ({ ...managedTrigger(splitConfig, 'fresh-token'), trigger_uuid: 'trigger-id', repo_connection: { repo_connection_uuid: 'connection-id', repo_id: 'repo-id', repo_name: config.repo } });
const splitReceipt = () => ({ build_uuid: 'build-id', status: 'stopped', build_outcome: 'success', trigger: splitTrigger(), build_trigger_metadata: { branch: 'feature', commit_hash: sha, repo_name: config.repo } });
const splitLogs = async () => `PILOT_RESULT=${JSON.stringify(await artifact())}\nWorker Version ID: ${version}\n${deployment.url}`;

test('split backend runs credential-free tests once and never starts Builds after red checks', async () => {
  const runners = [], operations = []; let starts = 0;
  const ci = { runner: async options => { runners.push(options); return { exitCode: 1 }; } };
  const managed = { preview: async () => { starts++; throw new Error('must not start'); } };
  await assert.rejects(runPipeline({ payload: params(), instanceId: 'split-red' }, ci, async op => { operations.push(op); return {}; }, splitConfig, managed), /tests failed/);
  assert.equal(starts, 0); assert.equal(runners.length, 1); assert.equal(runners[0].command, 'npm test');
  assert.equal(runners[0].cloudflareCredentials, false); assert.equal(runners[0].sourceControlCredentials, false);
  assert.deepEqual(operations, ['start', 'fail']);
});

test('split green preview and publication use no Sandbox build or deploy runner', async () => {
  const runners = [], operations = [];
  const ci = { runner: async options => { runners.push(options); return { exitCode: 0 }; } };
  const managed = { preview: async (actualSha, actualRef, track) => { assert.equal(actualSha, sha); assert.equal(actualRef, ref); await track('build-id'); return { result: await artifact(), deployment, build: { id: 'build-id' } }; }, publish: async candidate => { assert.equal(candidate.sha, sha); return { version }; } };
  await runPipeline({ payload: params(), instanceId: 'split-green' }, ci, async (op, input) => { operations.push({ op, input }); return {}; }, splitConfig, managed);
  assert.deepEqual(runners.map(row => row.command), ['npm test']); assert.deepEqual(operations.map(row => row.op), ['start', 'build-started', 'preview']);
  const control = controller(); await ready(control); const approval = await control.approve(owner, sha, ref);
  const call = async (op, input) => op === 'begin-publication' ? control.beginPublication(input.id, input.job) : control.finishPublication(input.id, input.sha, input.version);
  await runPipeline({ payload: { pilotApproval: approval.id }, instanceId: 'publication' }, ci, call, splitConfig, managed);
  assert.equal(runners.length, 1); assert.equal(control.state.production, sha);
});

test('managed receipt rejects wrong SHA, branch, trigger, repository, Worker, filters, result and URL', async () => {
  const logs = await splitLogs();
  assert.equal(managedReceipt(splitReceipt(), logs, splitConfig, sha, ref, 'build-id').result.sha, sha);
  const mutations = [
    receipt => { receipt.build_trigger_metadata.commit_hash = sha2; },
    receipt => { receipt.build_trigger_metadata.branch = 'main'; },
    receipt => { receipt.trigger.trigger_uuid = 'another-trigger'; },
    receipt => { receipt.trigger.repo_connection.repo_id = 'another-repo'; },
    receipt => { receipt.trigger.external_script_id = 'production-worker'; },
    receipt => { receipt.trigger.branch_excludes = []; },
    receipt => { receipt.trigger.deploy_command = 'wrangler deploy'; },
    receipt => { receipt.status = 'running'; },
    receipt => { receipt.build_outcome = 'fail'; },
    receipt => { receipt.preview_url = 'https://forged.workers.dev/'; },
  ];
  for (const mutate of mutations) { const receipt = splitReceipt(); mutate(receipt); assert.throws(() => managedReceipt(receipt, logs, splitConfig, sha, ref, 'build-id')); }
  assert.throws(() => managedReceipt(splitReceipt(), logs.replace(sha, sha2), splitConfig, sha, ref, 'build-id'), /different commit/);
  assert.throws(() => managedReceipt(splitReceipt(), logs.replace(deployment.url, 'https://forged.workers.dev/'), splitConfig, sha, ref, 'build-id'), /matching immutable/);
});

test('managed API pins exact commit, records build before polling, and verifies version bindings', async () => {
  const calls = [], tracked = [], step = { do: async (_name, _opts, fn) => fn(), sleep: async () => assert.fail('terminal build does not sleep') };
  let binding = config.stagingDB;
  const request = async (path, method, body) => {
    calls.push({ path, method, body });
    if (path.endsWith('/triggers')) return [splitTrigger()];
    if (method === 'POST') return { build_uuid: 'build-id' };
    if (path.endsWith('/builds/build-id')) { assert.deepEqual(tracked, ['build-id']); return splitReceipt(); }
    if (path.endsWith('/logs')) return { lines: [[Date.now(), await splitLogs()]], truncated: false };
    if (path.includes('/versions/')) return { id: version, resources: { bindings: [{ type: 'd1', name: 'DB', id: binding }] } };
    assert.fail(path);
  };
  const api = new ManagedBuilds(splitConfig, request, step);
  assert.equal((await api.preview(sha, ref, async id => tracked.push(id))).deployment.version, version);
  assert.deepEqual(calls.find(row => row.method === 'POST').body, { branch: 'feature', commit_hash: sha });
  binding = config.productionDB; tracked.length = 0;
  await assert.rejects(api.preview(sha, ref, async id => tracked.push(id)), /unexpected runtime bindings/);
});

test('split production still rejects unapproved, failed, stale or outdated approvals and retains ambiguous reservation', async () => {
  for (const mutate of [control => { control.candidate(sha, ref).checks = 'FAIL'; }, control => { control.state.latest[ref] = sha2; }, control => { control.state.production = sha2; }]) {
    const control = controller(); await ready(control); const approval = await control.approve(owner, sha, ref); mutate(control);
    let publications = 0;
    await assert.rejects(runPipeline({ payload: { pilotApproval: approval.id }, instanceId: 'pub' }, { runner: () => assert.fail('no runner') }, async (_op, input) => control.beginPublication(input.id, input.job), splitConfig, { publish: async () => { publications++; } }));
    assert.equal(publications, 0);
  }
  const control = controller(); await ready(control); const approval = await control.approve(owner, sha, ref);
  await assert.rejects(runPipeline({ payload: { pilotApproval: approval.id }, instanceId: 'ambiguous' }, {}, async (_op, input) => control.beginPublication(input.id, input.job), splitConfig, { publish: async () => { throw new Error('upload response lost'); } }), /response lost/);
  assert.equal(control.state.publication.id, approval.id); assert.equal(control.state.production, null);
});

test('trusted managed publication uploads immutable code and production-only bindings, verifies HTTP identity', async () => {
  const calls = [];
  const api = new ManagedBuilds(splitConfig, async (path, method, body, _allow404, scope) => {
    calls.push({ path, method, scope }); assert.equal(scope, 'deployment');
    if (method === 'PUT') {
      assert.equal(await body.get('worker.mjs').text(), 'export default {};');
      assert.deepEqual(JSON.parse(await body.get('metadata').text()).bindings, [{ type: 'd1', name: 'DB', id: config.productionDB }]);
      return { version_id: version };
    }
    return { subdomain: 'fixture' };
  }, undefined, async (url, options) => { assert.equal(url, `https://${config.production}.fixture.workers.dev/identity`); assert.equal(options.redirect, 'manual'); return Response.json({ commit: sha }); });
  assert.equal((await api.publish(await artifact())).version, version);
  assert.ok(calls[0].path.includes(config.production));
  api.fetcher = async () => Response.json({ commit: sha2 });
  await assert.rejects(api.publish(await artifact()), /reservation retained/);
});

test('managed cleanup deletes trigger before connection, proves references absent, refuses missing quiescence', async () => {
  const manifest = createManifest(account, run, 'workers-builds'), operations = [];
  manifest.resources = inventory(manifest).filter(row => row.kind.startsWith('build-')).map(row => ({ ...row, id: row.kind === 'build-trigger' ? 'trigger-id' : 'connection-id', workerTag: 'worker-tag', status: 'created', createdBy: run }));
  const provider = new CloudflareProvider(account, { token: 'management', buildsApiToken: 'builds-api' }, manifest.namespace, async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer builds-api'); operations.push({ url, method: options.method });
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ success: true, result: [] });
  });
  await assert.rejects(cleanup(manifest, account, provider, async () => {}), /cancellation/);
  manifest.quiesced = { buildsStopped: true };
  assert.equal((await cleanup(manifest, account, provider, async () => {})).outcome, 'PASS');
  assert.ok(operations[0].url.endsWith('/triggers/trigger-id')); assert.ok(operations[2].url.endsWith('/connections/connection-id'));
  assert.equal(manifest.resources[0].deletionAcknowledged, true);
});

test('managed token registration rejects reusable admin credentials and tracks underlying token before POST', async () => {
  const manifest = createManifest(account, run, 'workers-builds');
  const credentials = { token: 'management-secret', buildsApiToken: 'api-secret', adminToken: 'admin-secret' };
  const provider = { credentials, path: suffix => `/accounts/${account}/${suffix}`, request: async (_path, _method, body) => {
    assert.ok(manifest.credentials.some(row => row.kind === 'build-deployment' && row.id === body.cloudflare_token_id));
    assert.ok(manifest.credentials.some(row => row.kind === 'build-registration' && row.status === 'creating'));
    return { build_token_uuid: 'registered-id', cloudflare_token_id: body.cloudflare_token_id };
  } };
  const input = { id: 'fresh-id', token: 'fresh-secret', expiresAt: new Date(Date.now() + 3600000).toISOString() };
  for (const token of Object.values(credentials)) await assert.rejects(managedOperation('token', manifest, account, provider, async () => {}, { ...input, token }), /administration/);
  assert.equal((await managedOperation('token', manifest, account, provider, async () => {}, input)).registration, 'registered-id');
  assert.ok(!JSON.stringify(manifest).includes('fresh-secret'));
});

test('Artifacts log receives branch names while the approval ledger retains canonical refs', () => {
  assert.equal(branchName('refs/heads/feature/nested'), 'feature/nested');
  for (const invalid of ['refs/tags/feature', 'feature', 'refs/heads/', null]) assert.throws(() => branchName(invalid), /Canonical/);
});

test('pilot is outside the payload, has bounded names and pins SDK-compatible tools', () => {
  const payload = JSON.parse(readFileSync(new URL('../../.agents/skills/wong-sync/references/payload-files.json', import.meta.url)));
  for (const category of Object.values(payload).filter(row => typeof row === 'object' && !Array.isArray(row))) {
    assert.ok(!(category.files || []).some(path => path.startsWith('scripts/pilots/')));
    assert.ok(!(category.dirs || []).some(path => 'scripts/pilots/artifacts'.startsWith(`${path}/`)));
  }
  assert.throws(() => createManifest(account, 'a'.repeat(36)), /6–14/);
  assert.ok(inventory(createManifest(account, 'a'.repeat(14))).every(row => row.name.length <= 63));
  const pkg = JSON.parse(readFileSync(new URL('../pilots/artifacts/package.json', import.meta.url)));
  assert.equal(pkg.dependencies['@cloudflare/ci'], '0.2.0'); assert.equal(pkg.dependencies['@cloudflare/sandbox'], '0.12.5');
  assert.equal(pkg.overrides['@cloudflare/sandbox'], '$@cloudflare/sandbox');
  assert.equal(pkg.devDependencies.wrangler, '4.146.0');
});

test('private manifest survives resume with 0600 and contains no reusable credentials', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pilot-test-'));
  const file = join(dir, '.scratch', 'run.json');
  try {
    writePrivate(file, createManifest(account, run));
    assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(readManifest(file).account, account);
    assert.doesNotMatch(readFileSync(file, 'utf8'), /private-token|plaintext|secret/);
    assert.throws(() => writePrivate(join(dir, 'public.json'), {}), /scratch/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('wrong account and pre-existing resource are rejected before mutation', async () => {
  const manifest = createManifest(account, run), spec = inventory(manifest)[1];
  let mutations = 0;
  const provider = { find: async () => true, create: async () => { mutations++; } };
  await assert.rejects(ensureResource(manifest, 'b'.repeat(32), spec, provider, async () => {}), /account/);
  await assert.rejects(ensureResource(manifest, account, spec, provider, async () => {}), /Pre-existing/);
  await assert.rejects(ensureResource(manifest, account, { kind: 'repo', name: 'customer' }, provider, async () => {}), /inventory/);
  assert.equal(mutations, 0);
});

test('interrupted create requires receipt reconciliation; acknowledged creates resume', async () => {
  const manifest = createManifest(account, run), spec = inventory(manifest)[1];
  let creates = 0, saves = 0;
  const provider = { find: async () => null, create: async () => { creates++; throw new Error('network lost after create'); } };
  await assert.rejects(ensureResource(manifest, account, spec, provider, async () => { saves++; }), /network/);
  await assert.rejects(ensureResource(manifest, account, spec, provider, async () => {}), /Interrupted/);
  assert.equal(creates, 1); assert.equal(saves, 1);
  Object.assign(manifest.resources[0], { id: 'receipt', status: 'created' });
  assert.equal((await ensureResource(manifest, account, spec, provider, async () => {})).id, 'receipt');
});

test('cleanup is retryable, includes readbacks, and retains management token while incomplete', async () => {
  const manifest = createManifest(account, run), spec = inventory(manifest)[1];
  manifest.resources.push({ ...spec, id: 'receipt', status: 'created', createdBy: run });
  manifest.credentials.push({ kind: 'git', id: 'git-key' }, { kind: 'management', id: 'admin-key' });
  let fails = true; const revoked = [];
  const provider = { quiesce: async () => {}, revoke: async row => { revoked.push(row.id); }, delete: async () => { if (fails) throw new Error('provider unavailable'); }, find: async () => null };
  assert.equal((await cleanup(manifest, account, provider, async () => {})).outcome, 'FAIL');
  assert.deepEqual(revoked, ['git-key']); assert.equal(manifest.cleanup, 'incomplete');
  fails = false;
  assert.equal((await cleanup(manifest, account, provider, async () => {})).outcome, 'PASS');
  assert.deepEqual(revoked, ['git-key', 'admin-key']); assert.equal(manifest.resources[0].status, 'deleted');
});

test('cleanup refuses resources without creation acknowledgment or quiescence', async () => {
  const manifest = createManifest(account, run), spec = inventory(manifest)[1];
  manifest.resources.push({ ...spec, status: 'creating', createdBy: run });
  const provider = { quiesce: async () => {}, find: async () => null, delete: async () => { throw new Error('must not delete'); } };
  assert.equal((await cleanup(manifest, account, provider, async () => {})).outcome, 'FAIL');
  const cf = new CloudflareProvider(account, { token: 'secret' }, config.namespace);
  manifest.resources.push({ kind: 'worker', name: `${manifest.prefix}-controller`, status: 'created' });
  await assert.rejects(cf.quiesce(manifest), /receipts/);
});

test('empty deletion acknowledgments require absence readback and preserve HTTP errors', async () => {
  const manifest = createManifest(account, run), spec = inventory(manifest)[0];
  manifest.resources.push({ ...spec, id: spec.name, status: 'created', createdBy: run });
  let absent = false;
  const cf = new CloudflareProvider(account, { token: 'secret' }, manifest.namespace, async (_url, opts) => {
    if (opts.method === 'DELETE') return new Response(null, { status: 204 });
    return absent ? new Response(null, { status: 404 }) : Response.json({ success: true, result: { namespace: spec.name } });
  });
  assert.equal((await cleanup(manifest, account, cf, async () => {})).outcome, 'FAIL');
  assert.equal(manifest.resources[0].status, 'created');
  absent = true;
  assert.equal((await cleanup(manifest, account, cf, async () => {})).outcome, 'PASS');
  cf.fetcher = async () => new Response(null, { status: 500 });
  await assert.rejects(cf.request(cf.artifact(''), 'DELETE'), /HTTP 500, invalid JSON response/);
});

test('event source, duplicate events, and finite build limit fail closed', () => {
  const control = controller();
  assert.throws(() => control.start({ ...params(), repo: 'customer' }, 'j'), /Unexpected/);
  control.start(params(), 'j');
  assert.equal(control.start(params(), 'j').duplicate, true);
  assert.equal(control.start(params(), 'duplicate-new-id').duplicate, true);
  assert.equal(control.state.attempts, 1);
  control.fail(sha, ref); control.state.attempts = 10;
  assert.throws(() => control.start(params(sha2), 'new'), /bound/);
});

test('old duplicate events do not roll the branch head backwards', () => {
  const control = controller(); control.start(params(), 'first'); control.fail(sha, ref);
  control.start(params(sha2), 'second'); control.fail(sha2, ref);
  assert.equal(control.start(params(), 'late-duplicate').duplicate, true);
  assert.equal(control.state.latest[ref], sha2);
});

test('approval independently checks the authoritative repository head', async () => {
  const control = controller({ head: async () => sha2 }); await ready(control);
  await assert.rejects(control.approve(owner, sha, ref), /Authoritative/);
});

test('mismatched commits, forged URLs, altered artifacts and target selection cannot become preview-ready', async () => {
  for (const change of [
    { result: { ...(await artifact()), sha: sha2 } },
    { result: { ...(await artifact()), digest: 'forged' } },
    { deployment: { ...deployment, target: config.production } },
    { deployment: { ...deployment, database: config.productionDB } },
    { deployment: { ...deployment, url: 'https://evil.example/' } },
    { deployment: { ...deployment, reported: false } },
    { deployment: { ...deployment, url: `https://user:pass@${version.slice(0, 8)}-${config.staging}.fixture.workers.dev/` } },
  ]) {
    const control = controller(); control.start(params(), 'j');
    await assert.rejects(control.preview(sha, ref, change.result || await artifact(), change.deployment || deployment));
    assert.equal(control.candidate(sha, ref).status, 'checking');
  }
  const control = controller({ fetch: async () => Response.json({ commit: sha2 }) }); control.start(params(), 'j');
  await assert.rejects(control.preview(sha, ref, await artifact(), deployment), /different commit/);
});

test('passing preview needs owner approval and authenticated readable checks before publication', async () => {
  const control = controller(); await ready(control);
  assert.throws(() => control.beginPublication('unapproved-main', 'j'), /approved/);
  await assert.rejects(control.approve(member, sha, ref), /Owner/);
  const approval = await control.approve(owner, sha, ref);
  assert.equal(control.beginPublication(approval.id, 'pub').sha, sha);
  assert.throws(() => control.beginPublication(approval.id, 'parallel'), /serialized/);
  control.finishPublication(approval.id, sha, version);
  assert.equal(control.state.production, sha);
  assert.equal(control.beginPublication(approval.id, 'duplicate').duplicate, true);
});

test('edge preview verification uses manual redirects and rejects a redirected identity', async () => {
  const control = controller({ fetch: async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://evil.example/' } });
  } });
  control.start(params(), 'j');
  await assert.rejects(control.preview(sha, ref, await artifact(), deployment), /different commit/);
  assert.equal(control.candidate(sha, ref).status, 'checking');
});

test('failed/unreadable checks, later commits and outdated bases cannot publish', async () => {
  for (const mutate of [
    control => { control.candidate(sha, ref).checks = 'FAIL'; },
    control => { delete control.candidate(sha, ref).checks; },
    control => { control.state.latest[ref] = sha2; },
    control => { control.state.production = sha2; },
  ]) {
    const control = controller(); await ready(control); const approval = await control.approve(owner, sha, ref);
    mutate(control); assert.throws(() => control.beginPublication(approval.id, 'pub'));
    assert.notEqual(control.state.production, sha);
  }
  const control = controller(); control.start(params(), 'j'); control.fail(sha, ref);
  await assert.rejects(control.approve(owner, sha, ref), /passing/);
});

test('signed sessions require stable subject, live roster, exact audience/project/run and expiry', async () => {
  const control = controller();
  const token = await signSession(secret, claims());
  assert.equal((await verifySession(secret, token, control.state)).email, member.email);
  await assert.rejects(verifySession(secret, token + 'x', control.state));
  for (const patch of [{ sub: config.ownerEmail }, { exp: Date.now() - 1 }, { aud: 'customer-login' }, { run: 'another' }, { project: 'another' }, { epoch: 1 }]) {
    await assert.rejects(verifySession(secret, await signSession(secret, { ...claims(), ...patch }), control.state));
  }
  control.state.roster[member.sub].status = 'removing';
  await assert.rejects(verifySession(secret, token, control.state), /Membership/);
});

test('email impersonation and non-owner member changes are rejected', () => {
  const control = controller();
  assert.throws(() => control.addMember(member, 'new', 'new@example.com'), /Owner/);
  assert.throws(() => control.addMember({ ...member, role: 'owner' }, 'new', 'new@example.com'), /Owner/);
  assert.throws(() => control.addMember(owner, 'new', config.ownerEmail), /distinct/);
  assert.equal(control.state.roster[config.owner].role, 'owner');
});

test('repo tokens use explicit repo-only scopes, short TTL and tracked subject IDs', async () => {
  const calls = [];
  const control = controller({ issueToken: async (repo, scope, ttl) => { calls.push({ repo, scope, ttl }); return { id: `id-${scope}`, plaintext: 'secret', scope, expiresAt: 'soon' }; } });
  await control.gitToken(member, 'read'); await control.gitToken(member, 'write');
  assert.deepEqual(calls, ['read', 'write'].map(scope => ({ repo: config.repo, scope, ttl: 1800 })));
  await assert.rejects(control.gitToken(member, 'admin'), /scope/);
  assert.equal(control.state.gitTokens.length, 2); assert.ok(!JSON.stringify(control.state).includes('plaintext'));
});

test('partial removal blocks fresh sessions/keys and resumes every issued Git/memory key', async () => {
  let fail = true; const git = [], memory = [];
  const control = controller({ revokeToken: async id => { if (fail && id === 'second') throw new Error('revocation failed'); git.push(id); }, deleteMemoryKey: async hash => { memory.push(hash); } });
  control.state.gitTokens.push(...['first', 'second'].map(id => ({ id, sub: member.sub, revoked: false })));
  control.state.memoryKeys.push(...['hash1', 'hash2'].map(hash => ({ hash, sub: member.sub, revoked: false })));
  const old = await signSession(secret, claims());
  await assert.rejects(control.remove(owner, member.sub), /failed/);
  assert.equal(control.state.removals[member.sub].status, 'pending'); assert.equal(control.state.roster[member.sub].status, 'removing');
  await assert.rejects(control.gitToken(member, 'read'), /Active/);
  await assert.rejects(verifySession(secret, old, control.state));
  fail = false; assert.equal((await control.remove(owner, member.sub)).status, 'complete');
  assert.deepEqual(git, ['first', 'second']); assert.deepEqual(memory, ['hash1', 'hash2']);
  assert.equal(control.state.roster[owner.sub].status, 'active');
  await assert.rejects(control.remove(owner, owner.sub), /owner/);
});

test('provider revocation acknowledgment alone does not complete removal', async () => {
  const control = controller({ tokenRevoked: async () => false });
  control.state.gitTokens.push({ id: 'id', sub: member.sub, revoked: false });
  await assert.rejects(control.remove(owner, member.sub), /not observed/);
  assert.equal(control.state.roster[member.sub].status, 'removing');
});

function memoryDB() {
  const db = new DatabaseSync(':memory:');
  const folder = new URL('../../.agents/skills/memory/migrations/', import.meta.url);
  for (const file of readdirSync(folder).filter(name => name.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, folder), 'utf8'));
  const statement = (sql, params = []) => ({ bind: (...next) => statement(sql, next), first: async () => db.prepare(sql).get(...params) || null, run: async () => db.prepare(sql).run(...params), all: async () => ({ results: db.prepare(sql).all(...params), meta: {} }) });
  return { db, binding: { prepare: sql => statement(sql), batch: async rows => { db.exec('BEGIN'); try { const results = []; for (const row of rows) results.push(await row.all()); db.exec('COMMIT'); return results; } catch (error) { db.exec('ROLLBACK'); throw error; } } } };
}
const joinMemory = async (control, env, sub, input = { machine: 'test-machine' }) => {
  const session = await signSession(secret, claims(sub));
  return pilotMemory(new Request('https://pilot/_memory/join', { method: 'POST', headers: { 'X-Pilot-Session': session }, body: JSON.stringify(input) }), env, control, secret);
};
const query = (key, body) => new Request('https://pilot/_memory/accounts/test/d1/database/test/query', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });

test('pilot join intercepts GitHub input and the unchanged memory handler enforces shared/personal fact privacy and author writes', async () => {
  const control = controller(), { db, binding } = memoryDB(), env = { MEMORY_DB: binding };
  try {
    await assert.rejects(joinMemory(control, env, member.sub, { machine: 'test', token: 'github-token', email: config.ownerEmail }), /only a machine/);
    const memberKey = (await (await joinMemory(control, env, member.sub)).json()).result.key;
    const ownerKey = (await (await joinMemory(control, env, owner.sub)).json()).result.key;
    db.prepare("INSERT INTO facts(slug,type,body,source,created_at,author,shared) VALUES(?,?,?,?,?,?,?)").run('personal', 'project', 'owner personal fact', 'save', 'now', config.ownerEmail, 0);
    db.prepare("INSERT INTO facts(slug,type,body,source,created_at,author,shared) VALUES(?,?,?,?,?,?,?)").run('shared', 'project', 'shared fact', 'save', 'now', config.ownerEmail, 1);
    const found = await (await pilotMemory(query(memberKey, { sql: 'SELECT body FROM facts' }), env, control, secret)).json();
    assert.deepEqual(found.result[0].results.map(row => row.body), ['shared fact']);
    const ownerFound = await (await pilotMemory(query(ownerKey, { sql: 'SELECT body FROM facts' }), env, control, secret)).json();
    assert.equal(ownerFound.result[0].results.length, 2);
    const forgedWrite = await pilotMemory(query(memberKey, { sql: WRITES.fact.sql, params: ['forged', 'project', 'member pretending to own', null, 'save', 'now', config.ownerEmail] }), env, control, secret);
    assert.equal(forgedWrite.status, 403);
    const ownWrite = await pilotMemory(query(memberKey, { sql: WRITES.fact.sql, params: ['own', 'project', 'member fact', null, 'save', 'now', member.email] }), env, control, secret);
    assert.equal(ownWrite.status, 200);
    control.state.roster[member.sub].status = 'removed';
    await assert.rejects(pilotMemory(query(memberKey, { sql: 'SELECT 1' }), env, control, secret), /removed/);
    assert.equal((await pilotMemory(query(ownerKey, { sql: 'SELECT 1' }), env, control, secret)).status, 200);
    assert.ok(!JSON.stringify(control.state).includes(memberKey));
  } finally { db.close(); }
});

test('runner pipeline checks exact result, isolates secrets and deploys only trusted config', async () => {
  const result = await artifact(), calls = [], requests = [];
  const logs = `Current Version ID: ${version}\nWorker Version ID: ${version}\n${deployment.url}`;
  const ci = { runner: async options => { calls.push(options); return { exitCode: 0, logs: { stdout: calls.length === 1 ? `PILOT_RESULT=${JSON.stringify(result)}` : logs, stderr: '' } }; } };
  const call = async (name, input) => { requests.push({ name, input }); return name === 'start' ? {} : {}; };
  await runPipeline({ payload: params(), instanceId: 'j' }, ci, call, config);
  assert.equal(calls[0].cloudflareCredentials, false); assert.equal(calls[0].sourceControlCredentials, false); assert.equal(calls[0].env.PILOT_COMMIT, sha);
  assert.equal(calls[1].cloudflareCredentials.accountId, account); assert.match(calls[1].command, /cd "\$work"/); assert.match(calls[1].command, /--no-bundle/);
  assert.ok(!calls[1].command.includes('npm run') && !calls[1].command.includes('npm test'));
  assert.deepEqual(requests.map(row => row.name), ['start', 'preview']);
  assert.throws(() => buildResult(`PILOT_RESULT=${JSON.stringify({ ...result, sha: sha2 })}`, sha, 0), /different/);
  assert.throws(() => deploymentCommand({ ...config, staging: 'existing-customer' }, result, 'staging'), /Unexpected/);
  assert.throws(() => deploymentCommand({ ...config, stagingDB: config.productionDB }, result, 'staging'), /shared/);
  assert.throws(() => deploymentResult(`Current Version ID: ${version}\nhttps://forged.workers.dev`, config, 'staging'), /matching/);
});

test('runner failure records failed candidate; duplicate event runs no runner', async () => {
  const operations = [];
  const ci = { runner: async () => { throw new Error('red checks'); } };
  await assert.rejects(runPipeline({ payload: params(), instanceId: 'j' }, ci, async op => { operations.push(op); return {}; }, config), /red checks/);
  assert.deepEqual(operations, ['start', 'fail']);
  await runPipeline({ payload: params(), instanceId: 'j' }, ci, async () => ({ duplicate: true }), config);
});

test('generated controller config has filtered events, separate databases and bounded public image', () => {
  const manifest = createManifest(account, run);
  manifest.resources = inventory(manifest).filter(row => ['repo', 'worker', 'd1', 'r2'].includes(row.kind)).map(row => ({ ...row, status: 'created', id: row.name }));
  const generated = controllerConfig(manifest, config.owner, config.ownerEmail);
  assert.deepEqual(generated.triggers.events[0], { type: 'cf.artifacts.repo.pushed', filter: { namespace: manifest.namespace, repo_name: config.repo }, targets: [{ type: 'workflow', workflow_name: `${manifest.prefix}-pipeline` }] });
  assert.equal(generated.containers[0].max_instances, 1);
  assert.equal(generated.containers[0].image, 'docker.io/cloudflare/sandbox:0.12.5');
  assert.equal(generated.d1_databases.length, 1); assert.ok(!JSON.stringify(generated).includes('CF_TOKEN'));
  assert.equal(existsSync(generated.main), true);
});

test('exports compare every branch/tag/object ID and reject missing or changed refs', () => {
  const expected = `${sha}\trefs/heads/main\n${sha2}\trefs/heads/feature\n${sha}\trefs/tags/v1\n`;
  compareRefs(expected, expected.split('\n').reverse().join('\n'));
  assert.throws(() => compareRefs(expected, `${sha}\trefs/heads/main\n${sha2}\trefs/heads/feature`), /lost/);
  assert.throws(() => compareRefs(expected, expected.replace(sha2, sha)), /changed/);
});

test('evidence redacts secret values and UNKNOWN or incomplete cleanup can never justify adoption', () => {
  assert.equal(redact('Bearer abc token private-api art_v1_foo wongm_key.abc https://git:pass@host/', ['private-api']), 'Bearer [REDACTED] token [REDACTED] [REDACTED] [REDACTED] https://[REDACTED]@host/');
  assert.throws(() => caseEvidence('x', 'PASS', 'mock passed'), /live/);
  const unknown = caseEvidence('x', 'UNKNOWN', 'no credential');
  assert.match(adoption([unknown], 'verified', ['x']), /Defer/);
  const passed = caseEvidence('x', 'PASS', 'actual provider readback', { live: true, providerEvidence: '.scratch/raw.json' });
  assert.match(adoption([passed], 'incomplete', ['x']), /Defer/);
  assert.match(adoption([passed], 'verified', ['x']), /Consider/);
  assert.equal(caseEvidence('x', 'UNKNOWN', 'unchecked', { outcome: 'PASS' }).outcome, 'UNKNOWN');
  assert.match(adoption([passed, unknown], 'verified', ['x']), /Defer/);
  assert.doesNotMatch(redact(JSON.stringify({ session: 'signed-test-session', R2_SECRET_ACCESS_KEY: 'reusable-key' })), /signed-test-session|reusable-key/);
});
