import test from 'node:test';
import assert from 'node:assert/strict';
import { build, version as esbuildVersion } from 'esbuild';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { gitContextSource } from '../../server/hosted/git-context.mjs';
import { packSource } from '../../server/hosted/pack.mjs';
import { runtimeSource } from '../../server/hosted/runtime.mjs';
import { validateBundle } from '../../server/hosted/bundle.mjs';
import { projectId, config } from './hosted-runtime-fixture.mjs';

const execute = promisify(execFile);
const hosted = new URL('../../server/hosted/', import.meta.url);

async function bundledWorker(t, minifyIdentifiers) {
  const root = mkdtempSync(join(tmpdir(), 'hosted-worker-bundle-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const pin = JSON.parse(readFileSync(new URL('package-lock.json', hosted))).packages['node_modules/esbuild'].version;
  assert.equal(esbuildVersion, pin, 'regression uses the deployment bundler version');
  // Bundle the actual Worker and all service modules. Only platform/SDK entry points are
  // inert Node test doubles; this test does not claim to execute workerd or provider RPC.
  const result = await build({
    stdin: { resolveDir: hosted.pathname, sourcefile: 'bundled-source-probe.mjs', contents: `
      import worker, { HostedProject, HostedCI } from './worker.mjs';
      export { prepareGitCommand, gitContextSource } from './git-context.mjs';
      export { buildCommand } from './pipeline.mjs';
      export { entryModule } from './bundle.mjs';
      export { bootstrapModule } from './bootstrap.mjs';
      export { packSource } from './pack.mjs';
      export { runtimeSource } from './runtime.mjs';
      import { readFileSync } from 'node:fs';
      export function readProbe(path) { return readFileSync(path, 'utf8'); }
      export { collisionProbe } from 'import-collision-probe';
      export const workerExports = { worker, HostedProject, HostedCI };
    ` },
    bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2022',
    keepNames: true, minifyIdentifiers, external: ['node:*'],
    plugins: [{ name: 'node-worker-platform', setup(builder) {
      builder.onResolve({ filter: /^(cloudflare:workers|@cloudflare\/ci(?:\/worker)?|import-collision-probe)$/ }, args => ({ path: args.path, namespace: 'platform-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'platform-test' }, args => ({ loader: 'js', contents:
        args.path === 'cloudflare:workers' ? 'export class DurableObject {}' :
          args.path === '@cloudflare/ci' ? 'export class CIWorkflow {} export const cloudflareArtifacts=()=>({});' :
            args.path === '@cloudflare/ci/worker' ? 'export class CiSandbox {}' :
              "import { readFileSync } from 'node:fs'; export function collisionProbe(path){return readFileSync(path,'utf8')}" }));
    } }],
  });
  const code = result.outputFiles[0].text;
  assert(code.includes('Object.defineProperty'), 'keepNames injects its name helper into the actual bundle');
  if (!minifyIdentifiers) assert.match(code, /readFileSync as readFileSync2/, 'the actual bundle renames colliding lexical imports');
  const path = join(root, 'worker.mjs'); writeFileSync(path, code);
  const bundled = await import(pathToFileURL(path));
  assert.equal(typeof bundled.workerExports.worker.fetch, 'function');
  assert.equal(typeof bundled.workerExports.HostedCI, 'function');
  assert.equal(bundled.gitContextSource, gitContextSource);
  assert.equal(bundled.packSource, packSource);
  assert.equal(bundled.runtimeSource, runtimeSource);
  assert.equal(bundled.readProbe(path), code); assert.equal(bundled.collisionProbe(path), code);
  return { root, bundled };
}

async function checkout(root) {
  const source = join(root, 'sdk'), workspace = join(root, 'workspace');
  mkdirSync(join(source, '.github/scripts'), { recursive: true }); mkdirSync(workspace);
  writeFileSync(join(source, '.github/scripts/checks.mjs'), "if(process.env.CHECKS_FAIL)process.exit(23);console.log('Exact candidate checks passed');\n");
  mkdirSync(join(source, 'app/dist/worker'), { recursive: true });
  mkdirSync(join(source, 'app/dist/client/assets'), { recursive: true });
  mkdirSync(join(source, 'app/migrations'), { recursive: true });
  writeFileSync(join(source, 'app/dist/worker/wrangler.json'), JSON.stringify({ main: 'index.mjs', assets: { directory: '../client' } }));
  writeFileSync(join(source, 'app/dist/worker/index.mjs'), 'import "./chunk.mjs";export default {}');
  writeFileSync(join(source, 'app/dist/worker/chunk.mjs'), 'export const value=42');
  writeFileSync(join(source, 'app/dist/client/index.html'), '<script src="/assets/app.js"></script>');
  writeFileSync(join(source, 'app/dist/client/assets/app.js'), 'console.log("asset bytes")');
  writeFileSync(join(source, 'app/migrations/0001.sql'), 'CREATE TABLE things(id TEXT)');
  const env = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  const git = async args => (await execute('git', args, { cwd: source, env })).stdout.trim();
  await git(['init', '-q', '-b', 'main']);
  await git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'add', '.']);
  await git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'candidate']);
  const sha = await git(['rev-parse', 'HEAD']);
  const remote = `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git`;
  await git(['remote', 'add', 'origin', remote]);
  cpSync(join(source, '.github'), join(workspace, '.github'), { recursive: true });
  cpSync(join(source, 'app'), join(workspace, 'app'), { recursive: true });
  return { source, workspace, sha, remote, env };
}

for (const minifyIdentifiers of [false, true]) {
  test(`actual keepNames Worker bundle generates executable Git preparation and packing (minify=${minifyIdentifiers})`, async t => {
    const { root, bundled } = await bundledWorker(t, minifyIdentifiers);
    const f = await checkout(root);
    // Only the SDK's fixed path changes, keeping the generated command and identity intact.
    const command = bundled.prepareGitCommand(f.sha, projectId, null, f.remote).replace('/tmp/ci-source', f.source);
    assert(!command.includes('__name'));
    const prepared = await execute('bash', ['-c', command], { cwd: f.workspace, env: { ...f.env, HOSTED_GIT_READ_TOKEN: 'read-only-test' } });
    const receipt = JSON.parse(prepared.stdout.trim().slice('HOSTED_GIT_CONTEXT='.length));
    assert.deepEqual(receipt, { sha: f.sha, base: null, projectId, prepared: true });
    const gitConfig = readFileSync(join(f.workspace, '.git/config'), 'utf8');
    assert(!gitConfig.includes('read-only-test')); assert(!gitConfig.includes('extraHeader'));
    assert.equal((await execute('git', ['rev-parse', 'HEAD'], { cwd: f.workspace, env: f.env })).stdout.trim(), f.sha);

    const uploads = [];
    const server = createServer(async (request, response) => {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      uploads.push({ method: request.method, authorization: request.headers.authorization, bundle: JSON.parse(body) });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ sha: f.sha, projectId, digest: createHash('sha256').update(body).digest('hex') }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const env = { ...f.env, HOSTED_UPLOAD_URL: `http://127.0.0.1:${server.address().port}/bundle`, HOSTED_UPLOAD_TOKEN: 'upload-only-test' };
    const buildCommand = bundled.buildCommand(f.sha, projectId, null);
    assert(!buildCommand.includes('__name'));
    const packed = await execute('bash', ['-c', buildCommand], { cwd: f.workspace, env });
    const result = JSON.parse(packed.stdout.split('\n').find(line => line.startsWith('HOSTED_RESULT=')).slice(14));
    assert.equal(result.sha, f.sha); assert.equal(result.projectId, projectId);
    assert.equal(uploads.length, 1); assert.equal(uploads[0].method, 'PUT');
    assert.equal(uploads[0].authorization, 'Bearer upload-only-test');
    const valid = await validateBundle(uploads[0].bundle, f.sha, projectId);
    assert.equal(result.digest, valid.digest);
    assert.equal(valid.bundle.modules.length, 2); assert.equal(valid.bundle.assets.length, 2); assert.equal(valid.bundle.migrations.length, 1);
    assert.equal(Buffer.from(valid.bundle.assets.find(row => row.path === '/assets/app.js').content, 'base64').toString(), 'console.log("asset bytes")');
    await assert.rejects(execute('bash', ['-c', buildCommand], { cwd: f.workspace, env: { ...env, CHECKS_FAIL: '1' } }), error => error.code === 23);
    assert.equal(uploads.length, 1, 'red checks do not upload');
    symlinkSync('/etc/passwd', join(f.workspace, 'app/dist/client/leak'));
    await assert.rejects(execute('bash', ['-c', buildCommand], { cwd: f.workspace, env }), /Build symlinks are refused/);
    assert.equal(uploads.length, 1, 'unsafe packaging does not upload');
  });

  test(`actual keepNames Worker bundle generates protected runtime entry and bootstrap (minify=${minifyIdentifiers})`, async t => {
    const { root, bundled } = await bundledWorker(t, minifyIdentifiers);
    const sha = 'a'.repeat(40);
    const entry = bundled.entryModule({ sha, main: 'candidate.mjs' }, projectId);
    const bootstrap = bundled.bootstrapModule(projectId);
    assert(!entry.includes('__name')); assert(!bootstrap.includes('__name'));
    writeFileSync(join(root, 'candidate.mjs'), "export default {fetch(request,env){return Response.json({env,runtime:request.headers.get('X-WongStack-Runtime')})}};");
    writeFileSync(join(root, 'entry.mjs'), entry); writeFileSync(join(root, 'bootstrap.mjs'), bootstrap);
    const app = (await import(pathToFileURL(join(root, 'entry.mjs')))).default;
    const pending = (await import(pathToFileURL(join(root, 'bootstrap.mjs')))).default;
    const env = { __WONGSTACK_RUNTIME: 'runtime-test', CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CF_ACCESS_AUD: 'aud', DB: 'business-only' };
    for (const [runtime, commit] of [[app, sha], [pending, 'bootstrap']]) {
      assert.equal((await runtime.fetch(new Request('https://site/'), env, {})).status, 401);
      assert.equal((await runtime.fetch(new Request('https://site/_memory/leak'), env, {})).status, 503);
      assert.equal((await runtime.fetch(new Request('https://site/__wongstack/identity'), env, {})).status, 401);
      const identity = await runtime.fetch(new Request('https://site/__wongstack/identity', { headers: { 'X-WongStack-Runtime': 'runtime-test' } }), env, {});
      assert.deepEqual(await identity.json(), { sha: commit, projectId });
    }
    const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey); jwk.kid = 'test-key';
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const body = encode({ alg: 'RS256', kid: jwk.kid }) + '.' + encode({ iss: 'https://team.cloudflareaccess.com', aud: ['aud'], type: 'app', sub: 'owner', email: 'owner@example.com', exp: Date.now() / 1000 + 60 });
    const token = body + '.' + Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(body))).toString('base64url');
    const previous = globalThis.fetch;
    t.after(() => { globalThis.fetch = previous; });
    globalThis.fetch = async () => Response.json({ keys: [jwk] });
    const request = () => new Request('https://site/', { headers: { 'Cf-Access-Jwt-Assertion': token, 'X-WongStack-Runtime': 'runtime-test' } });
    const response = await app.fetch(request(), env, {});
    assert.equal(response.status, 200);
    const safe = await response.json(); assert.equal(safe.env.DB, 'business-only'); assert.equal(safe.runtime, null);
    for (const name of ['__WONGSTACK_RUNTIME', '__WONGSTACK_SHA', '__WONGSTACK_PROJECT']) assert(!(name in safe.env));
    assert.equal((await pending.fetch(request(), env, {})).status, 503);
  });
}
