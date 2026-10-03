import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, passing, sha, older, ref, versionId, projectId, config, bundle } from './hosted-runtime-fixture.mjs';
import { validateBundle, applyMigrations, uploadBundle, verifyIdentity, entryModule } from '../../server/hosted/bundle.mjs';
import { buildCommand, readResult, runHostedPipeline, publishBundle } from '../../server/hosted/pipeline.mjs';
import { runtimeFetch } from '../../server/hosted/runtime.mjs';
import { digest, to64, from64, safePath, siteHeaders, https, refName } from '../../server/hosted/security.mjs';
import { serviceConfig, inventory } from '../../server/hosted/config.mjs';
import { packApplication } from '../../server/hosted/pack.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

test('preparation is idempotent only for the reviewed exact project/source/owner', async () => {
  const f = await fixture();
  assert.equal((await f.controller.prepare({ id: projectId, owner: f.state.owner, source: { repo: 'owner/source', commit: sha } })).gitUrl, f.state.gitUrl);
  await assert.rejects(f.controller.prepare({ id: projectId, owner: f.state.owner, source: { repo: 'owner/source', commit: older } }), /identity differs/);
  f.state.preparation = 'creating';
  await assert.rejects(f.controller.prepare({ id: projectId, owner: f.state.owner, source: { repo: 'owner/source', commit: sha } }), /Interrupted/);
});
test('opaque machine grants do not trust caller role or subject and workspace exposes no secrets', async () => {
  const f = await fixture();
  await assert.rejects(f.controller.access({ subject: 'attacker', email: 'owner@example.com', role: 'owner', vmId: 'vm2' }), /owner identity/);
  await assert.rejects(f.controller.actor(f.handoff.token + '0'), /unavailable/);
  const context = f.controller.workspace(f.owner);
  assert.equal(context.subject, 'owner-subject'); assert.equal(context.role, 'owner');
  assert.equal(context.subjectEmail, 'owner@example.com');
  assert(!JSON.stringify(context).includes(f.handoff.token));
  assert.equal(f.writes[0].preparation, 'creating');
});
test('Git issuance tracks expiring repository-only credentials and removal is resumable', async () => {
  const f = await fixture();
  const result = await f.controller.gitToken(f.owner);
  assert.equal(result.gitUrl, f.handoff.gitUrl); assert.equal(f.owner.gitTokens.length, 1);
  f.provider.revoke = async () => { throw new Error('Provider unreachable'); };
  await assert.rejects(f.controller.remove('vm-owner'), /unreachable/);
  assert.equal(f.owner.status, 'revocation-pending');
  await assert.rejects(f.controller.actor(f.handoff.token), /unavailable/);
  await assert.rejects(f.controller.access({ subject: 'owner-subject', email: 'owner@example.com', role: 'owner', vmId: 'vm-owner' }), /pending/);
  f.provider.revoke = async () => {};
  assert.equal((await f.controller.remove('vm-owner')).removed, true);
  assert.equal(f.owner.gitTokens[0].revoked, true);
  assert.equal((await f.controller.remove('missing')).removed, true);
});
test('a member may save but cannot approve, provision, or publish', async () => {
  const f = await fixture();
  const handoff = await f.controller.access({ subject: 'member', email: 'member@example.com', role: 'member', vmId: 'vm-member' });
  const member = await f.controller.actor(handoff.token);
  assert.equal(handoff.subjectEmail, 'member@example.com');
  assert.equal(f.controller.workspace(member).subjectEmail, member.email);
  assert.notEqual(handoff.subjectEmail, handoff.ownerEmail);
  await passing(f);
  await assert.rejects(f.controller.approve(member, { sha, ref }), /Owner/);
  await assert.rejects(f.controller.setup(member), /Owner/);
  await assert.rejects(f.controller.beginPublication(member, 'fake'), /Owner/);
});
test('candidate queue independently verifies head and duplicate events do not rerun checks', async () => {
  const f = await fixture();
  f.provider.head = async () => older;
  await assert.rejects(f.controller.candidate({ sha, ref }), /head changed/);
  f.provider.head = async () => sha;
  await f.controller.candidate({ sha, ref }); await f.controller.candidate({ sha, ref });
  assert.equal(Object.keys(f.state.candidates).length, 1);
  assert.equal(f.operations.filter(row => row[0] === 'enqueue').length, 1);
  const started = await f.controller.start(sha, ref, 'job');
  assert.equal(await digest(started.uploadToken), started.uploadHash);
  await assert.rejects(f.controller.start(sha, ref, 'job2'), /cannot start/);
});
test('runner interruption retries are bounded and uploaded bytes prevent automatic retry', async () => {
  const f = await fixture(); await f.controller.candidate({ sha, ref });
  for (let attempt = 0; attempt < 3; attempt++) { await f.controller.start(sha, ref, `job-${attempt}`); await f.controller.fail(sha, ref, true); }
  assert.equal(f.controller.getCandidate(sha, ref).status, 'failed');
  const g = await fixture(); await g.controller.candidate({ sha, ref }); await g.controller.start(sha, ref, 'job');
  g.controller.getCandidate(sha, ref).uploadKey = 'stored'; await g.controller.fail(sha, ref, true);
  assert.equal(g.controller.getCandidate(sha, ref).status, 'failed');
});
test('passing state rejects mismatched tenant, digest and unreadable receipt', async () => {
  const f = await fixture(); await f.controller.candidate({ sha, ref }); await f.controller.start(sha, ref, 'job');
  await f.controller.prepareGit(sha, ref, 'job');
  await f.controller.readyGit(sha, ref, { sha, projectId, base: older, prepared: true });
  const c = f.controller.getCandidate(sha, ref); c.bundleDigest = 'd'.repeat(64); c.uploadKey = 'stored';
  const receipt = { sha, projectId, digest: c.bundleDigest, exitCode: 0, version: versionId, url: 'https://private-preview.workers.dev' };
  for (const change of [{ projectId: versionId }, { digest: 'e'.repeat(64) }, { exitCode: 1 }, { version: 'unknown' }]) await assert.rejects(f.controller.passed(sha, ref, { ...receipt, ...change }), /receipt mismatch/);
  await f.controller.passed(sha, ref, receipt); assert.equal(f.controller.getCandidate(sha, ref).checks, 'PASS');
});
test('approval and publication refuse changed candidate/main/production bases', async () => {
  const f = await fixture(); await passing(f);
  f.provider.mainHead = async () => sha;
  await assert.rejects(f.controller.approve(f.owner, { sha, ref }), /Default branch/);
  f.provider.mainHead = async () => older;
  const approval = await f.controller.approve(f.owner, { sha, ref });
  f.state.production = { sha: older };
  await assert.rejects(f.controller.beginPublication(f.owner, approval.id), /base changed/);
  f.state.production = null; f.provider.head = async () => older;
  await assert.rejects(f.controller.beginPublication(f.owner, approval.id), /head changed/);
  f.provider.head = async () => sha; f.provider.mainHead = async () => sha;
  await assert.rejects(f.controller.beginPublication(f.owner, approval.id), /Default branch/);
});
test('publication reserves durably and cannot complete without both exact deployment and main receipt', async () => {
  const f = await fixture(); const c = await passing(f);
  const approval = await f.controller.approve(f.owner, { sha, ref });
  await f.controller.beginPublication(f.owner, approval.id);
  assert.equal(f.state.publication.mainBase, older);
  await assert.rejects(f.controller.beginPublication(f.owner, approval.id), /approval|required|reservation/);
  await assert.rejects(f.controller.finishPublication(approval.id, { sha, version: versionId, digest: c.bundleDigest }), /receipt/);
  const result = await f.controller.finishPublication(approval.id, { sha, version: versionId, digest: c.bundleDigest, defaultSha: sha, defaultRef: 'refs/heads/main', url: 'https://production.workers.dev' });
  assert.equal(result.defaultSha, sha); assert.equal(f.state.production.sha, sha); assert.equal(f.state.publication, null);
});
test('large real bundles support modules/assets/migrations and reject corruption or another tenant', async () => {
  const b = await bundle();
  b.assets[0].content = to64(new TextEncoder().encode('x'.repeat(200000))); b.assets[0].digest = await digest(from64(b.assets[0].content));
  assert((await validateBundle(b, sha, projectId)).size > 96000);
  await assert.rejects(validateBundle(b, sha, versionId), /tenant mismatch/);
  b.assets[0].content = 'YmFk'; await assert.rejects(validateBundle(b, sha, projectId), /Corrupt/);
});
test('bundle file paths, duplicates, modules and manifests cannot escape trusted resources', async () => {
  for (const mutate of [b => { b.main = '../escape'; }, b => { b.modules[0].name = '__wongstack_entry.mjs'; }, b => { b.assets[0].path = '/../../escape'; }, b => { b.modules.push(b.modules[0]); }, b => { b.modules[0].type = 'invalid'; }, b => { b.migrations[0].name = 'script.js'; }]) {
    const b = await bundle(); mutate(b); await assert.rejects(validateBundle(b, sha, projectId));
  }
});
test('migration ledger preserves bytes and never uses another environment database', async () => {
  const b = await bundle(); const queries = [];
  const state = { resources: [{ kind: 'd1', environment: 'staging', id: projectId }, { kind: 'd1', environment: 'production', id: versionId }] };
  const provider = { query: async (id, sql) => { queries.push({ id, sql }); return [{ results: [] }]; } };
  await applyMigrations(state, provider, b, 'staging');
  assert(queries.every(row => row.id === projectId)); assert(queries.at(-1).sql.includes('CREATE TABLE widgets'));
  provider.query = async (_id, sql) => [{ results: sql.startsWith('SELECT') ? [{ digest: 'changed' }] : [] }];
  await assert.rejects(applyMigrations(state, provider, b, 'production'), /bytes changed/);
  b.migrations[0].content = to64(new TextEncoder().encode('DROP TABLE wongstack_migrations'));
  provider.query = async () => [{ results: [] }]; await assert.rejects(applyMigrations(state, provider, b, 'staging'), /reserved/);
});
test('trusted uploads allowlist bindings and disable production version previews', async () => {
  const b = await bundle(); const calls = [];
  const state = { id: projectId, runtimeSecret: 'internal', access: { verified: true, audience: 'aud', teamDomain: 'team.cloudflareaccess.com', appId: 'app-id', workers: [{name:'owned-staging',id:'1'.repeat(32)},{name:'owned-production',id:'2'.repeat(32)}] }, resources: [{ kind: 'worker', environment: 'staging', name: 'owned-staging' }, { kind: 'worker', environment: 'production', name: 'owned-production' }, { kind: 'd1', environment: 'staging', id: projectId }, { kind: 'd1', environment: 'production', id: versionId }, { kind: 'd1', environment: 'memory', id: projectId }, { kind: 'r2', name: 'owned-memory' }] };
  const provider = { assets: async () => 'jwt', version: async (target, modules, bindings) => { calls.push({ target, modules, bindings }); return versionId; }, routing: async (...args) => { calls.push({ route: args }); return 'https://worker.workers.dev'; } };
  await uploadBundle(state, provider, b, 'staging');
  assert(!calls[0].bindings.some(row => row.name === 'MEMORY_DB')); assert.equal(calls[1].route[1], versionId);
  await uploadBundle(state, provider, b, 'production'); assert(calls[2].bindings.some(row => row.name === 'MEMORY_DB')); assert.equal(calls[3].route[1], undefined);
  state.access.verified = false; await assert.rejects(uploadBundle(state, provider, b, 'production'), /Access/);
  assert(entryModule(b, projectId).includes('runtimeFetch'));
});
test('preview identity refuses redirects, another project or another commit', async () => {
  const state = { id: projectId, runtimeSecret: 'secret', access: { clientId: 'id', clientSecret: 'secret' } };
  for (const result of [new Response(null, { status: 302 }), Response.json({ sha: older, projectId }), Response.json({ sha, projectId: versionId })]) await assert.rejects(verifyIdentity(state, { url: 'https://preview.workers.dev' }, sha, async () => result));
  await verifyIdentity(state, { url: 'https://preview.workers.dev' }, sha, async (_url, input) => { assert.equal(input.redirect, 'manual'); assert.equal(input.headers['X-WongStack-Runtime'], 'secret'); return Response.json({ sha, projectId }); });
});
test('trusted runtime refuses raw business, forged Access, and candidate memory bypass', async () => {
  let called = 0;
  const candidate = { fetch: async () => { called++; return new Response('private business'); } };
  const env = { __WONGSTACK_RUNTIME: 'secret', __WONGSTACK_SHA: sha, __WONGSTACK_PROJECT: projectId, CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CF_ACCESS_AUD: 'aud' };
  assert.equal((await runtimeFetch(new Request('https://site/'), env, {}, candidate)).status, 401);
  assert.equal((await runtimeFetch(new Request('https://site/_memory/leak'), env, {}, candidate)).status, 503);
  assert.equal((await runtimeFetch(new Request('https://site/__wongstack/identity'), env, {}, candidate)).status, 401);
  assert.equal((await runtimeFetch(new Request('https://site/__wongstack/identity', { headers: { 'X-WongStack-Runtime': 'secret' } }), env, {}, candidate)).status, 200);
  assert.equal(called, 0);
});
test('trusted build never migrates remotely or invokes candidate deploy wrappers', async () => {
  const command = buildCommand(sha, projectId);
  assert(command.includes('node .github/scripts/checks.mjs test build')); assert(command.includes('CLOUDFLARE_ENV=staging'));
  assert(!command.includes('npm ')); assert(!command.includes('--remote')); assert(!command.includes('deploy'));
  await assert.rejects(readResult({ stdout: 'HOSTED_RESULT={}', stderr: '' }, sha, projectId, 1), /checks failed/);
  await assert.rejects(readResult({ stdout: 'bad', stderr: '' }, sha, projectId, 0), /unreadable/);
  const row = { sha, projectId, digest: 'a'.repeat(64) };
  assert.equal((await readResult({ stdout: 'HOSTED_RESULT=' + JSON.stringify(row), stderr: '' }, sha, projectId, 0)).sha, sha);
});
function pipelineHarness(build) {
  const operations = [], calls = [];
  const candidate = { sha, mainBase: older, base: null, attempts: 1, uploadToken: 'scoped-upload' };
  return { operations, calls, candidate,
    ci: { runner: async options => {
      calls.push(options);
      return { exitCode: 0, logs: { stdout: 'HOSTED_GIT_CONTEXT=' + JSON.stringify({ sha, base: candidate.mainBase === sha ? candidate.base : candidate.mainBase, projectId, prepared: true }) }, runner: async options => { calls.push(options); return build(options); } };
    } },
    adapters: { config, call: async (op, value) => {
      operations.push([op, value]);
      return op === 'start' ? candidate : op === 'prepare-git' ? { token: 'private-read', remote: `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git` } : { ready: true };
    }, loadBundle: async () => { throw new Error('red checks reached artifact upload'); } },
  };
}
const pipelineEvent = { instanceId: 'job', payload: { provider: 'cloudflare-artifacts', providerData: { namespace: config.namespace }, owner: config.namespace, repo: projectId, sha, ref } };
test('red checks and interruption never reach trusted upload or publication', async () => {
  for (const interruption of [false, true]) {
    const h = pipelineHarness(async options => { assert.equal(options.cloudflareCredentials, false); assert.equal(options.sourceControlCredentials, false); if (interruption) throw new Error('Sandbox stopped'); return { exitCode: 1, logs: { stdout: '', stderr: '' } }; });
    await runHostedPipeline(pipelineEvent, h.ci, h.adapters);
    assert.deepEqual(h.operations.map(row => row[0]), ['start', 'prepare-git', 'ready-git', 'fail']); assert.equal(h.operations.at(-1)[1].retryable, false);
    assert.equal(h.calls[0].env.HOSTED_GIT_READ_TOKEN, 'private-read');
    assert.deepEqual(Object.keys(h.calls[1].env).sort(), ['HOSTED_UPLOAD_TOKEN', 'HOSTED_UPLOAD_URL']);
    assert(!JSON.stringify(h.calls[1]).includes('private-read'));
  }
});
// The runner command itself, in a folder standing in for the exact commit's checkout.
function checkout(entry) {
  const root = mkdtempSync(join(tmpdir(), 'hosted-command-'));
  if (entry !== undefined) { mkdirSync(join(root, '.github/scripts'), { recursive: true }); writeFileSync(join(root, '.github/scripts/checks.mjs'), entry); }
  const git = args => { const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
  git(['init', '-q']); git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture', '--allow-empty']);
  const actualSha = git(['rev-parse', 'HEAD']);
  const runCommand = base => spawnSync('bash', ['-c', buildCommand(actualSha, projectId, base)], { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: root } });
  return { root, runCommand };
}
test('a commit without the check entry point fails its checks and packs nothing', async () => {
  for (const entry of [undefined, 'this is not JavaScript']) {
    const c = checkout(entry);
    try {
      const result = c.runCommand(older);
      assert.notEqual(result.status, 0); assert(!result.stdout.includes('HOSTED_RESULT='));
      if (entry === undefined) assert.match(result.stderr, /has no \.github\/scripts\/checks\.mjs/);
      await assert.rejects(readResult(result, sha, projectId, result.status), /checks failed/);
    } finally { rmSync(c.root, { recursive: true, force: true }); }
  }
});
test('a red entry point stops before the pack, so nothing is uploaded', async () => {
  const c = checkout("console.log('checks ran: ' + process.argv.slice(2).join(' ')); process.exit(7);");
  try {
    const result = c.runCommand(older);
    assert.equal(result.status, 7); assert.match(result.stdout, /checks ran: test build/); assert(!result.stdout.includes('HOSTED_RESULT='));
    const h = pipelineHarness(async () => ({ exitCode: result.status, logs: { stdout: result.stdout, stderr: result.stderr } }));
    await runHostedPipeline(pipelineEvent, h.ci, h.adapters);
    assert.deepEqual(h.operations.map(row => row[0]), ['start', 'prepare-git', 'ready-git', 'fail']); assert.equal(h.operations.at(-1)[1].retryable, false);
  } finally { rmSync(c.root, { recursive: true, force: true }); }
});
test('the entry point receives the candidate base and the build inputs from the environment', async () => {
  const c = checkout("console.log('INPUTS=' + JSON.stringify([process.env.CHECKS_BASE ?? null, process.env.DEFAULT_BRANCH, process.env.CHECKS_BUILD, process.env.CLOUDFLARE_ENV])); process.exit(3);");
  try {
    assert.match(c.runCommand(older).stdout, new RegExp(`INPUTS=\\["${older}","main","always","staging"\\]`));
    assert.match(c.runCommand(null).stdout, /INPUTS=\[null,"main","always","staging"\]/, 'a first commit has no base: everything runs');
    assert.throws(() => buildCommand(sha, projectId, "main'; curl evil"), /Exact project and commit/);
    // The service passes the base it recorded when the candidate was queued.
    const h = pipelineHarness(async () => ({ exitCode: 1, logs: { stdout: '', stderr: '' } }));
    await runHostedPipeline(pipelineEvent, h.ci, h.adapters);
    assert.equal(h.calls[1].command, buildCommand(sha, projectId, older)); assert(h.calls[1].command.includes(`CHECKS_BASE='${older}'`));
    const initial = pipelineHarness(async () => ({ exitCode: 1, logs: { stdout: '', stderr: '' } })); initial.candidate.mainBase = sha;
    await runHostedPipeline(pipelineEvent, initial.ci, initial.adapters);
    assert.equal(initial.calls[1].command, buildCommand(sha, projectId, null));
    assert(!initial.calls[1].command.includes('CHECKS_BASE='), 'initial pushed main runs full checks');
  } finally { rmSync(c.root, { recursive: true, force: true }); }
});
test('service configuration has explicit bounded ownership and no customer deployment token', () => {
  const c = serviceConfig(config); const inv = inventory(config, [projectId]);
  assert.equal(c.containers[0].max_instances, 2); assert.equal(inv.projects[0].resources.length, 12);
  assert(c.vars.HOSTED_CONFIG.includes('maxAttempts')); assert(!JSON.stringify(c).includes('ADMIN_TOKEN'));
  assert(inv.projects[0].resources.filter(row => row.kind === 'worker').every(row => row.name.length <= 63));
  assert.throws(() => serviceConfig({ ...config, prefix: 'far-too-long-prefix' }), /prefix/);
  assert.throws(() => inventory(config, [projectId, projectId, projectId, projectId, projectId]), /At most/);
});
test('URL/ref/header helpers reject untrusted routes and privilege forwarding', () => {
  assert.equal(https('https://host.example/'), 'https://host.example'); assert.throws(() => https('http://bad'), /HTTPS/);
  assert.equal(refName(ref), 'feature'); assert.throws(() => refName('refs/heads/../bad'), /branch/);
  assert.equal(safePath('/apps/hello/?x=1'), '/apps/hello/?x=1'); assert.throws(() => safePath('/%2e%2e/secret'), /Restricted/);
  assert.throws(() => safePath('/bad' + String.fromCharCode(0)), /Invalid/); assert.throws(() => safePath('/bad%00path'), /Restricted/);
  assert(!siteHeaders({ authorization: 'secret', cookie: 'secret', accept: 'text/html' }).has('authorization'));
  assert.deepEqual(from64(to64(new Uint8Array([0, 1, 255]))), new Uint8Array([0, 1, 255]));
});
test('actual Vite packaging retains modules, static bytes and migrations with a verified upload receipt', async () => {
  const root = mkdtempSync(join(tmpdir(), 'hosted-pack-'));
  const oldUrl = process.env.HOSTED_UPLOAD_URL, oldToken = process.env.HOSTED_UPLOAD_TOKEN;
  try {
    mkdirSync(join(root, 'app/dist/worker'), { recursive: true }); mkdirSync(join(root, 'app/dist/client/assets'), { recursive: true }); mkdirSync(join(root, 'app/migrations'), { recursive: true });
    writeFileSync(join(root, 'app/dist/worker/wrangler.json'), JSON.stringify({ main: 'index.js', assets: { directory: '../client' } }));
    writeFileSync(join(root, 'app/dist/worker/index.js'), 'import "./chunk.js";export default {}'); writeFileSync(join(root, 'app/dist/worker/chunk.js'), 'export const value=42');
    writeFileSync(join(root, 'app/dist/client/index.html'), '<script type="module" src="/assets/app.js"></script>'); writeFileSync(join(root, 'app/dist/client/assets/app.js'), 'console.log("real asset")');
    writeFileSync(join(root, 'app/migrations/0001.sql'), 'CREATE TABLE things(id TEXT)');
    process.env.HOSTED_UPLOAD_URL = 'https://service/v1/bundles/' + projectId + '/' + sha; process.env.HOSTED_UPLOAD_TOKEN = 'upload-only';
    let packaged;
    const result = await packApplication(root, { sha, projectId }, async (url, input) => {
      assert.equal(input.redirect, 'manual'); assert.equal(input.headers.Authorization, 'Bearer upload-only');
      packaged = JSON.parse(input.body); return Response.json({ digest: await digest(input.body), sha, projectId });
    });
    assert.equal(result.sha, sha); assert.equal(packaged.modules.length, 2); assert.equal(packaged.assets.length, 2); assert.equal(packaged.migrations.length, 1);
    await validateBundle(packaged, sha, projectId);
    symlinkSync('/etc/passwd', join(root, 'app/dist/client/leak'));
    await assert.rejects(packApplication(root, { sha, projectId }), /symlinks/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    if (oldUrl === undefined) delete process.env.HOSTED_UPLOAD_URL; else process.env.HOSTED_UPLOAD_URL = oldUrl;
    if (oldToken === undefined) delete process.env.HOSTED_UPLOAD_TOKEN; else process.env.HOSTED_UPLOAD_TOKEN = oldToken;
  }
});
test('trusted runtime verifies a real signed Access JWT and strips its runtime capability', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey); jwk.kid = 'signing-key';
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims = { type: 'app', iss: 'https://team.cloudflareaccess.com', aud: ['aud'], sub: 'human', email: 'owner@example.com', exp: Date.now() / 1000 + 60 };
  const token = async body => {
    const value = encode({ alg: 'RS256', kid: jwk.kid }) + '.' + encode(body);
    return value + '.' + Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(value))).toString('base64url');
  };
  const previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ keys: [jwk] });
  let calls = 0;
  const candidate = { fetch: async (request, env) => { calls++; assert(!('__WONGSTACK_RUNTIME' in env)); assert(!request.headers.has('X-WongStack-Runtime')); return new Response('business'); } };
  const env = { __WONGSTACK_RUNTIME: 'runtime-secret', CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CF_ACCESS_AUD: 'aud' };
  try {
    const request = value => new Request('https://site/', { headers: { 'Cf-Access-Jwt-Assertion': value, 'X-WongStack-Runtime': 'runtime-secret' } });
    assert.equal((await runtimeFetch(request(await token(claims)), env, {}, candidate)).status, 200);
    for (const invalid of [{ ...claims, exp: 0 }, { ...claims, aud: ['another'] }, { ...claims, iss: 'https://evil' }, { ...claims, nbf: Date.now() / 1000 + 3600 }, { ...claims, type: undefined }, { ...claims, type: 'service' }, { ...claims, common_name: 'machine' }, { ...claims, service_token_id: 'machine' }, { ...claims, service_token_status: true }, { ...claims, sub: '   ' }, { ...claims, email: 'not-email' }, { ...claims, email: ' owner@example.com' }, { ...claims, aud: ['aud', 1] }, { ...claims, nbf: '0' }, { ...claims, iat: Infinity }, { ...claims, nbf: NaN }, { ...claims, iat: Date.now() / 1000 + 60 }]) assert.equal((await runtimeFetch(request(await token(invalid)), env, {}, candidate)).status, 401);
    assert.equal((await runtimeFetch(request((await token(claims)).slice(0, -10) + 'forged'), env, {}, candidate)).status, 401);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = previous; }
});
test('publication never rebuilds and deployment failure keeps durable exact reservation', async () => {
  const f = await fixture(); const candidate = await passing(f); const approval = await f.controller.approve(f.owner, { sha, ref });
  const b = await bundle(); const calls = [];
  f.state.resources = [{ kind: 'worker', environment: 'production', name: 'owned-production' }, { kind: 'd1', environment: 'production', id: projectId }, { kind: 'd1', environment: 'memory', id: versionId }, { kind: 'r2', name: 'owned-memory' }];
  f.state.access = { verified: true, teamDomain: 'team.cloudflareaccess.com', audience: 'aud', appId:'app-id', workers:[{name:'owned-production',id:'2'.repeat(32)}] };
  f.provider.query = async () => [{ results: [] }]; f.provider.assets = async () => 'assets'; f.provider.version = async () => versionId; f.provider.routing = async () => 'https://production.workers.dev';
  f.provider.deploy = async () => { calls.push('deploy'); throw new Error('acknowledgment lost'); };
  const adapters = { provider: f.provider, loadBundle: async (_sha, _ref, hash) => { assert.equal(hash, candidate.bundleDigest); calls.push('immutable-load'); return { bundle: b, state: f.state }; } };
  await assert.rejects(publishBundle(f.controller, f.owner, approval.id, adapters), /lost/);
  assert.deepEqual(calls, ['immutable-load', 'deploy']); assert.equal(f.state.publication.version, versionId);
  assert.equal(f.state.approvals[approval.id].status, 'publishing'); assert.equal(f.state.production, null);
});
