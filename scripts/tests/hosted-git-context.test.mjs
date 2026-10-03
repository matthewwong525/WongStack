import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gitContextSource, prepareGitCommand, checksBase, readGitContext } from '../../server/hosted/git-context.mjs';
import { trackedSourceAdapter } from '../../server/hosted/source-checkout.mjs';
import { buildCommand, runHostedPipeline, readResult } from '../../server/hosted/pipeline.mjs';
import { fixture, sha, older, ref, projectId, config } from './hosted-runtime-fixture.mjs';
import { ProjectService } from '../../server/hosted/service.mjs';

const { prepareGitContext } = await import('data:text/javascript;base64,' + Buffer.from(gitContextSource + '\nexport { prepareGitContext };').toString('base64'));

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
function realCheckout(t) {
  const root = mkdtempSync(join(tmpdir(), 'hosted-git-context-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const origin = join(root, 'origin'), source = join(root, 'sdk'), workspace = join(root, 'workspace');
  for (const dir of [origin, source, workspace]) mkdirSync(dir);
  git(origin, ['init', '-q', '-b', 'main']);
  git(origin, ['config', 'user.name', 'Test']); git(origin, ['config', 'user.email', 'test@example.com']);
  writeFileSync(join(origin, 'app.txt'), 'initial'); git(origin, ['add', 'app.txt']); git(origin, ['commit', '-qm', 'initial']);
  const base = git(origin, ['rev-parse', 'HEAD']);
  writeFileSync(join(origin, 'app.txt'), 'changed'); git(origin, ['commit', '-qam', 'next']);
  const sha = git(origin, ['rev-parse', 'HEAD']), remote = 'file://' + origin;
  git(source, ['init', '-q']); git(source, ['remote', 'add', 'origin', remote]);
  git(source, ['fetch', '-q', '--depth=1', 'origin', sha]); git(source, ['checkout', '-q', '--detach', 'FETCH_HEAD']);
  cpSync(join(source, 'app.txt'), join(workspace, 'app.txt'));
  const old = process.env.HOSTED_GIT_READ_TOKEN;
  process.env.HOSTED_GIT_READ_TOKEN = 'private-read-test';
  t.after(() => { if (old === undefined) delete process.env.HOSTED_GIT_READ_TOKEN; else process.env.HOSTED_GIT_READ_TOKEN = old; });
  const identity = { sha, base, remote, projectId };
  return { root, origin, source, workspace, identity, prepare: value => prepareGitContext(workspace, source, { ...identity, ...value }) };
}

test('real shallow SDK checkout retains actual ancestry and no credential/config/hooks in the build snapshot', t => {
  const f = realCheckout(t);
  assert(!existsSync(join(f.workspace, '.git')));
  assert.throws(() => git(f.source, ['cat-file', '-e', f.identity.base]), assert.AssertionError);
  assert.deepEqual(f.prepare(), { sha: f.identity.sha, base: f.identity.base, projectId, prepared: true });
  assert.equal(git(f.workspace, ['merge-base', f.identity.sha, f.identity.base]), f.identity.base);
  assert.equal(git(f.workspace, ['rev-parse', 'HEAD']), f.identity.sha);
  assert.match(git(f.workspace, ['diff', '--name-only', f.identity.base, 'HEAD']), /app.txt/);
  const config = readFileSync(join(f.workspace, '.git/config'), 'utf8');
  for (const forbidden of ['private-read-test', 'extraheader', 'credential', 'insteadof', 'hookspath']) assert(!config.toLowerCase().includes(forbidden));
  assert(!existsSync(join(f.workspace, '.git/hooks')));
  assert.equal(process.env.HOSTED_GIT_READ_TOKEN, undefined);
});

test('initial install has actual Git metadata and full checks with no comparison against itself', t => {
  const f = realCheckout(t);
  assert.equal(f.prepare({ base: null }).base, null);
  assert.equal(checksBase({ sha, mainBase: sha, base: null }), null);
  assert.equal(checksBase({ sha, mainBase: sha, base: older }), older);
  assert.equal(checksBase({ sha, mainBase: older, base: null }), older);
  assert.throws(() => checksBase({ sha, mainBase: sha, base: sha }), /invalid/);
  const command = buildCommand(f.identity.sha, projectId, null);
  assert(command.includes('GITHUB_EVENT_NAME=workflow_dispatch')); assert(!command.includes('CHECKS_BASE='));
});

for (const [name, change] of [
  ['wrong commit', () => ({ sha: older })],
  ['wrong remote', () => ({ remote: 'https://other.example/repo.git' })],
  ['self base', f => ({ base: f.identity.sha })],
  ['missing commit', () => ({ base: older })],
  ['modified workspace', f => { writeFileSync(join(f.workspace, 'app.txt'), 'substitution'); return {}; }],
  ['existing metadata', f => { mkdirSync(join(f.workspace, '.git')); return {}; }],
  ['symlink metadata', f => { symlinkSync(f.origin, join(f.source, '.git/escape')); return {}; }],
  ['external objects', f => { writeFileSync(join(f.source, '.git/objects/info/alternates'), f.origin); return {}; }],
  ['authorization header', f => { git(f.source, ['config', 'http.extraHeader', 'Authorization: private']); return {}; }],
  ['credential helper', f => { git(f.source, ['config', 'credential.helper', 'store']); return {}; }],
  ['filesystem monitor', f => { git(f.source, ['config', 'core.fsmonitor', 'false']); return {}; }],
  ['included config', f => { git(f.source, ['config', 'include.path', '../outside']); return {}; }],
  ['URL rewrite', f => { git(f.source, ['config', 'url.https://evil/.insteadOf', 'file:']); return {}; }],
  ['malformed shallow', f => { writeFileSync(join(f.source, '.git/shallow'), '../secret'); return {}; }],
  ['missing token', () => { delete process.env.HOSTED_GIT_READ_TOKEN; return {}; }],
]) test(`trusted preparation fails closed for ${name} before candidate code`, t => {
  const f = realCheckout(t); const input = change(f);
  assert.throws(() => f.prepare(input), /Trusted Git preparation failed/);
});

test('service-owned command pins the owned HTTPS repository and never embeds its read token', () => {
  const remote = `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git`;
  const command = prepareGitCommand(sha, projectId, older, remote);
  assert(command.includes('/tmp/ci-source')); assert(command.includes('HOSTED_GIT_READ_TOKEN'));
  assert(!command.includes('private-read-test'));
  for (const bad of ['https://evil/' + projectId + '.git', remote + '?token=bad', remote.replace('https://', 'https://user:secret@'), remote.replace(projectId, 'another')]) assert.throws(() => prepareGitCommand(sha, projectId, older, bad));
  assert.throws(() => prepareGitCommand(sha, projectId, sha, remote));
});

test('missing, duplicated, wrong identity or failed preparation receipts do not release a build', async () => {
  const row = { prepared: true, sha, base: older, projectId };
  const result = text => ({ exitCode: 0, runner: async () => {}, logs: { stdout: text } });
  assert.deepEqual(await readGitContext(result('HOSTED_GIT_CONTEXT=' + JSON.stringify(row)), sha, projectId, older), row);
  for (const value of [{ ...result(''), exitCode: 1 }, { ...result(''), runner: undefined }, result('unreadable'), result('x'.repeat(65536)), result('HOSTED_GIT_CONTEXT={}'), result('HOSTED_GIT_CONTEXT=' + JSON.stringify({ ...row, base: sha })), result(('HOSTED_GIT_CONTEXT=' + JSON.stringify(row) + '\n').repeat(2))]) await assert.rejects(readGitContext(value, sha, projectId, older));
});

async function active() {
  const f = await fixture(); await f.controller.candidate({ sha, ref }); await f.controller.start(sha, ref, 'job'); return f;
}
test('one tracked read grant is durable before use, hidden from status and revoked before build checkout', async () => {
  const f = await active(); let issued = 0;
  f.provider.gitToken = async (_s, scope) => { assert.equal(scope, 'read'); assert.equal(f.writes.at(-1).candidates[`${ref}:${sha}`].gitPreparation.status, 'minting'); issued++; return { id: 'read1', token: 'private-read', expiresAt: '2030-01-01' }; };
  await f.controller.prepareGit(sha, ref, 'job');
  assert.equal(f.controller.gitCheckout(sha).token, 'private-read');
  assert(!JSON.stringify(f.controller.status()).includes('private-read'));
  await assert.rejects(f.controller.prepareGit(sha, ref, 'job'), /reconciliation/);
  assert.throws(() => f.controller.gitCheckout(older), /unavailable/);
  await f.controller.readyGit(sha, ref, { prepared: true, sha, projectId, base: older });
  assert.equal(issued, 1); assert.deepEqual(f.operations.filter(row => row[0] === 'revoke'), [['revoke', 'read1']]);
  assert.equal(f.controller.gitCheckout(sha).token, '');
  const prep = f.controller.getCandidate(sha, ref).gitPreparation;
  assert.equal(prep.revoked, true); assert(!('token' in prep));
});

test('read expiry, mismatched workflow and preparation receipt fail closed', async () => {
  const f = await active(); await assert.rejects(f.controller.prepareGit(sha, ref, 'other'), /Active exact/);
  await f.controller.prepareGit(sha, ref, 'job');
  const prep = f.controller.getCandidate(sha, ref).gitPreparation; prep.expiresAt = '2000-01-01';
  assert.throws(() => f.controller.gitCheckout(sha), /expired/); prep.expiresAt = '2030-01-01';
  for (const change of [{ sha: older }, { base: sha }, { projectId: 'another' }, { prepared: false }]) await assert.rejects(f.controller.readyGit(sha, ref, { prepared: true, sha, projectId, base: older, ...change }), /differs/);
  assert.equal(prep.revoked, false);
});

test('failed preparation revokes before queue release; provider revocation failure preserves active durable state', async () => {
  const f = await active(); await f.controller.prepareGit(sha, ref, 'job');
  f.provider.revoke = async () => { throw new Error('readback unavailable'); };
  await assert.rejects(f.controller.fail(sha, ref, false), /readback unavailable/);
  const c = f.controller.getCandidate(sha, ref);
  assert.equal(c.status, 'checking'); assert.equal(c.gitPreparation.status, 'revocation-pending'); assert.equal(f.state.active, `${ref}:${sha}`); assert.equal(c.workflow, 'job');
  assert.throws(() => f.controller.gitCheckout(sha), /unavailable/);
  f.provider.revoke = async () => {};
  await f.controller.fail(sha, ref, false);
  assert.equal(c.status, 'failed'); assert.equal(c.gitPreparation.revoked, true); assert(!c.gitPreparation.token); assert.equal(f.state.active, null);
});

test('lost mint acknowledgment is a blocked durable intent, never an automatic replacement or cleanup success', async () => {
  const f = await active(); let issued = 0;
  f.provider.gitToken = async () => { issued++; throw new Error('mint acknowledgment lost'); };
  await assert.rejects(f.controller.prepareGit(sha, ref, 'job'), /acknowledgment lost/);
  await assert.rejects(f.controller.prepareGit(sha, ref, 'job'), /reconciliation/);
  await assert.rejects(f.controller.fail(sha, ref, false), /operator reconciliation/);
  assert.equal(issued, 1); assert.equal(f.state.active, `${ref}:${sha}`);
  assert.equal(f.controller.getCandidate(sha, ref).gitPreparation.status, 'minting');
});

test('stop terminates the exact workflow and revokes its read grant, also without a surviving workflow ID', async () => {
  for (const withWorkflow of [true, false]) {
    const f = await active(); await f.controller.prepareGit(sha, ref, 'job');
    if (!withWorkflow) delete f.controller.getCandidate(sha, ref).workflow;
    const calls = [];
    const service = new ProjectService({ storage: { get: async () => f.state, put: async () => {}, setAlarm: async () => {} } }, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'private', CI_WORKFLOW: { get: async id => ({ terminate: async () => calls.push(id) }) } });
    service.provider = f.provider;
    await service.dispatch(new Request('https://project/admin/stop', { method: 'POST', body: '{}' }));
    assert.deepEqual(calls, withWorkflow ? ['job'] : []);
    assert.equal(f.state.stopped, true); assert.equal(f.state.active, null);
    assert.equal(f.controller.getCandidate(sha, ref).gitPreparation.revoked, true);
    assert.throws(() => f.controller.gitCheckout(sha), /unavailable/);
  }
});

test('SDK adapter uses only private tracked checkout, rejects privileged source env, and preserves reporting', async () => {
  const source = { owner: config.namespace, repo: projectId, sha, providerData: { namespace: config.namespace } };
  let issued = 0, calls = 0, token = 'tracked-read';
  const underlying = { getSourceCheckout: async () => { issued++; }, receiveEvent: async () => 'event', listTreeBlobs: async () => ['tree'], startStepNotification: async () => 'notification' };
  const adapter = trackedSourceAdapter({ id: 'cloudflare-artifacts', create: () => underlying });
  const provider = adapter.create({ HOSTED_CONFIG: JSON.stringify(config), PROJECTS: { idFromName: id => id, get: id => { assert.equal(id, projectId); return { fetch: async request => { calls++; assert.equal(request.url, 'https://project/internal/git-checkout'); assert.deepEqual(await request.json(), { sha }); return Response.json({ sha, remote: `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git`, token, snapshotOnly: token === '' }); } }; } } });
  assert.equal((await provider.getSourceCheckout(source)).token, token);
  token = ''; const restored = await provider.getSourceCheckout(source); assert.equal(restored.token, ''); assert.equal(restored.remote, 'file:///workspace');
  assert.equal(issued, 0); assert.equal(calls, 2);
  assert.equal(await provider.receiveEvent(), 'event'); assert.deepEqual(await provider.listTreeBlobs(), ['tree']); assert.equal(await provider.startStepNotification(), 'notification');
  for (const change of [{ sha: 'bad' }, { owner: 'other' }, { repo: 'bad' }, { providerData: {} }]) await assert.rejects(provider.getSourceCheckout({ ...source, ...change }));
  await assert.rejects(provider.getStepCredentialEnv(source), /unavailable/); await assert.rejects(provider.getPushCredentials(source), /unavailable/);
});

test('preparation failure or failed revocation never starts candidate code, and all metadata errors fail the candidate', async () => {
  for (const failure of ['prepare', 'receipt', 'revoke']) {
    const operations = []; let builds = 0;
    const event = { instanceId: 'job', payload: { provider: 'cloudflare-artifacts', providerData: { namespace: config.namespace }, owner: config.namespace, repo: projectId, sha, ref } };
    const ci = { runner: async options => {
      assert.equal(options.cloudflareCredentials, false); assert.equal(options.sourceControlCredentials, false);
      if (failure === 'prepare') throw new Error('preparation failed');
      return { exitCode: 0, logs: { stdout: failure === 'receipt' ? 'unreadable' : 'HOSTED_GIT_CONTEXT=' + JSON.stringify({ prepared: true, sha, projectId, base: older }) }, runner: async () => { builds++; } };
    } };
    await runHostedPipeline(event, ci, { config, call: async op => {
      operations.push(op);
      if (op === 'start') return { sha, mainBase: older, base: null, attempts: 1 };
      if (op === 'prepare-git') return { token: 'read-only', remote: `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git` };
      if (op === 'ready-git' && failure === 'revoke') throw new Error('revocation failed');
      return {};
    } });
    assert.equal(builds, 0); assert.equal(operations.at(-1), 'fail');
  }
});

test('the actual pinned SDK overlay reuses the restored real Git snapshot without a network credential', async t => {
  const f = realCheckout(t); f.prepare();
  const { transform } = await import('../../server/hosted/node_modules/esbuild/lib/main.js');
  const sdk = new URL('../../server/hosted/node_modules/@cloudflare/ci/src/shared/', import.meta.url);
  // Only the SDK's fixed temporary clone path changes for test isolation.
  const source = readFileSync(new URL('shell.ts', sdk), 'utf8') + '\n' + readFileSync(new URL('source-checkout.ts', sdk), 'utf8').replace("import { shellQuote } from './shell';", '').replace("const CLONE_DIR = '/tmp/ci-source';", `const CLONE_DIR = ${JSON.stringify(join(f.root, 'overlay-clone'))};`);
  const compiled = await transform(source, { loader: 'ts', format: 'esm' });
  const { checkoutSourceScript, checkoutSourceEnv } = await import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));
  const checkout = { kind: 'git', remote: 'file://' + f.workspace, sha: f.identity.sha, token: '' };
  const command = checkoutSourceScript(checkout, f.workspace, true);
  assert.deepEqual(checkoutSourceEnv(checkout), { SOURCE_CONTROL_TOKEN: '' });
  const result = spawnSync('bash', ['-c', command], { cwd: f.root, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: f.root, ...checkoutSourceEnv(checkout) } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(f.workspace, ['rev-parse', 'HEAD']), f.identity.sha);
  assert.equal(git(f.workspace, ['merge-base', f.identity.sha, f.identity.base]), f.identity.base);
  assert(!readFileSync(join(f.workspace, '.git/config'), 'utf8').includes('Authorization'));
  rmSync(join(f.workspace, '.git'), { recursive: true });
  const absent = spawnSync('bash', ['-c', command], { cwd: f.root, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: f.root, ...checkoutSourceEnv(checkout) } });
  assert.notEqual(absent.status, 0, 'missing restored Git metadata cannot trigger a fresh authenticated network checkout');
});

test('workflow controller operations use supported durable steps and do not remint on replay', async () => {
  const url = new URL('../../server/hosted/worker.mjs', import.meta.url);
  const source = readFileSync(url, 'utf8')
    .replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject {}')
    .replace("import { CIWorkflow, cloudflareArtifacts } from '@cloudflare/ci';", 'class CIWorkflow {} const cloudflareArtifacts=()=>({create:()=>({})});')
    .replace("export { CiSandbox } from '@cloudflare/ci/worker';", '')
    .replace(/from '(\.\/[^']+)'/g, (_whole, path) => `from '${new URL(path, url).href}'`);
  const { HostedCI } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const cache = new Map(), calls = [];
  const step = { do: async (name, options, action) => {
    assert.equal(options.timeout, '3 minutes'); assert.equal(options.retries.delay, '1 second'); assert.equal(options.retries.limit, 0);
    if (!cache.has(name)) cache.set(name, await action()); return cache.get(name);
  } };
  const workflow = new HostedCI();
  workflow.env = { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'platform-private', PROJECTS: { idFromName: id => id, get: () => ({ fetch: async request => {
    const operation = new URL(request.url).pathname.split('/').at(-1); calls.push(operation);
    return Response.json(operation === 'start' ? { sha, mainBase: older, base: null, attempts: 1, uploadToken: 'upload-only' } : operation === 'prepare-git' ? { token: 'read-only', remote: `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git` } : { ready: true });
  } }) } };
  const event = { instanceId: 'job', payload: { provider: 'cloudflare-artifacts', providerData: { namespace: config.namespace }, owner: config.namespace, repo: projectId, sha, ref } };
  const ci = { runner: async () => ({ exitCode: 0, logs: { stdout: 'HOSTED_GIT_CONTEXT=' + JSON.stringify({ prepared: true, sha, projectId, base: older }) }, runner: async options => {
    assert(!JSON.stringify(options).includes('platform-private')); assert(!JSON.stringify(options).includes('read-only'));
    return { exitCode: 1, logs: { stdout: '', stderr: '' } };
  } }) };
  await workflow.pipeline(event, step, ci); await workflow.pipeline(event, step, ci);
  assert.deepEqual(calls, ['start', 'prepare-git', 'ready-git', 'fail']);
  assert.equal(typeof HostedCI.getProvider().create(workflow.env).getSourceCheckout, 'function');
});


test('both receipt readers drain both SDK streams so a successful runner can be destroyed', async () => {
  for (const preparation of [true, false]) {
    const drained = [];
    const stream = (name, text) => new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); }, cancel() { drained.push(name + '-cancel'); } });
    const counted = (name, text) => stream(name, text).pipeThrough(new TransformStream({ transform(chunk, controller) { controller.enqueue(chunk); }, flush() { drained.push(name); } }));
    const receipt = preparation ? { prepared: true, sha, projectId, base: older } : { sha, projectId, digest: 'a'.repeat(64) };
    const logs = { stdout: counted('stdout', (preparation ? 'HOSTED_GIT_CONTEXT=' : 'HOSTED_RESULT=') + JSON.stringify(receipt)), stderr: counted('stderr', 'private provider diagnostics') };
    if (preparation) await readGitContext({ exitCode: 0, runner: async () => {}, logs }, sha, projectId, older);
    else await readResult(logs, sha, projectId, 0);
    assert.deepEqual(drained.sort(), ['stderr', 'stdout']);
  }
  await assert.rejects(readGitContext({ exitCode: 0, runner: async () => {}, logs: { stdout: '', stderr: 'x'.repeat(65536) } }, sha, projectId, older), /diagnostics exceed/);
  await assert.rejects(readResult({ stdout: '', stderr: 'x'.repeat(2 * 1024 * 1024 + 1) }, sha, projectId, 0), /diagnostics exceed/);
});
