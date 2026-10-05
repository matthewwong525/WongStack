import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, statSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { companyClient, cleanEnvironment, connectionState } from '../employee-bootstrap.mjs';
const origin = 'https://business.example.com';
const identity = { email: 'employee@example.com', subject: 'employee-subject' };
const jwt = (extra = {}) => `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({ email: identity.email, sub: identity.subject, exp: Date.now() / 1000 + 1000, ...extra })).toString('base64url')}.c2ln`;
const setup = () => ({ identity, role: 'employee', apps: [], api: 'authenticated', repository: 'manual_provider_setup', memory: 'independent_operator_setup' });
function directories(t) {
  const base = mkdtempSync(join(tmpdir(), 'employee-bootstrap-')); t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'empty'), stateDir = join(base, 'private'), cacheDir = join(base, 'cache'), routesDir = join(base, 'routes');
  mkdirSync(root); return { base, root, stateDir, cacheDir, routesDir };
}
test('standalone copied file runs without checkout, memory packages or any repository adapter', t => {
  const f = directories(t), source = readFileSync(new URL('../employee-bootstrap.mjs', import.meta.url));
  const file = join(f.root, 'bootstrap.mjs'); writeFileSync(file, source);
  const child = spawnSync(process.execPath, [file, '--help'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr); assert.match(child.stdout, /usage:/);
  assert.doesNotMatch(source.toString(), /from ['"]\.\.?\//);
  assert.doesNotMatch(source.toString(), /api\.github\.com|projectClient|\/api\/access\/(?:token|identity|activate|prepare|rollout|login)|ownerSetup|git clone/);
  const denied = spawnSync(process.execPath, [file, 'git', 'clone', 'existing-work'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(denied.status, 1); assert.match(denied.stderr, /employee-bootstrap.mjs login/);
});
test('empty-folder connection proves current API permission with zero apps and private noncredential state', async t => {
  const f = directories(t), requests = [];
  writeFileSync(join(f.root, 'work.txt'), 'preserve');
  const client = companyClient({ ...f, run: async () => jwt(), request: async (url, init) => {
    requests.push({ url, init }); assert.equal(init.redirect, 'manual'); return Response.json(setup());
  } });
  assert.deepEqual(await client.login(origin), { connected: origin, connection: 'employee_setup' });
  assert.equal(requests[0].url.pathname, '/api/access/setup');
  assert.deepEqual(await client.setup(), setup());
  assert.equal(statSync(f.stateDir).mode & 0o777, 0o700);
  assert.equal(statSync(join(f.stateDir, 'target.json')).mode & 0o777, 0o600);
  assert.ok(!readFileSync(join(f.stateDir, 'target.json'), 'utf8').includes(jwt()));
  assert.equal(readFileSync(join(f.root, 'work.txt'), 'utf8'), 'preserve');
});
test('a server that proves no API readiness or no signed identity is never connected', async t => {
  for (const [answer, message] of [[{ ...setup(), api: 'pending' }, /no API readiness was established/], [{ code: 'not_found' }, /no API readiness was established/],
    [{ ...setup(), identity: { email: identity.email } }, /Verified employee identity is unavailable/], [{ ...setup(), identity: undefined }, /Verified employee identity is unavailable/]]) {
    const f = directories(t), requests = [];
    const client = companyClient({ ...f, run: async () => jwt(), request: async url => { requests.push(url.pathname); return Response.json(answer); } });
    await assert.rejects(client.login(origin), message);
    // Setup is the one readback: the withdrawn identity and owner-setup routes are never asked.
    assert.deepEqual(requests, ['/api/access/setup']);
    assert.equal(client.ownerSetup, undefined);
    await assert.rejects(client.setup(), /Connect first/);
  }
});
test('standalone denies redirects, expired/new-device/removed logins and never forwards credentials', async t => {
  for (const status of [302, 401, 403, 503]) {
    const f = directories(t), requests = [];
    const client = companyClient({ ...f, run: async () => jwt(), request: async (url, init) => { requests.push({ url, init }); return new Response('{}', { status }); } });
    const message = status === 302 ? 'Company redirect refused; use company login.' : status === 503
      ? 'Company request failed (HTTP 503)' : 'Company session expired or access was denied; use the employee’s own login.';
    await assert.rejects(client.login(origin), { message });
    assert.ok(requests.every(row => row.url.origin === origin && row.init.redirect === 'manual'));
    await assert.rejects(client.setup(), /Connect first/);
  }
  const f = directories(t), runs = [];
  let expired = true;
  const client = companyClient({ ...f, run: async args => { runs.push(args); return jwt({ exp: expired ? 1 : Date.now() / 1000 + 1000 }); }, request: async () => Response.json(setup()) });
  await assert.rejects(client.login(origin), /expired/); expired = false; await client.login(origin);
  assert.equal(runs.filter(args => args[0] === 'login').length, 2);
});
test('changed human identity requires separate private state before further requests or overwrite', async t => {
  const f = directories(t); let current = identity, requests = 0;
  const client = companyClient({ ...f, run: async () => jwt({ email: current.email, sub: current.subject }), request: async () => { requests++; return Response.json({ ...setup(), identity: current }); } });
  await client.login(origin); const before = readFileSync(join(f.stateDir, 'target.json'), 'utf8');
  current = { email: 'other@example.com', subject: 'other-subject' };
  await assert.rejects(client.setup(), /signed-in person changed/); assert.equal(requests, 1);
  await assert.rejects(client.login(origin), /signed-in person changed/);
  assert.equal(readFileSync(join(f.stateDir, 'target.json'), 'utf8'), before);
});
test('unavailable private locator cannot interfere with independently installed memory', async t => {
  const f = directories(t); assert.equal(connectionState(f.root, f.routesDir), null);
  mkdirSync(f.routesDir, { mode: 0o755 }); chmodSync(f.routesDir, 0o755);
  const client = companyClient({ root: f.root, routesDir: f.routesDir });
  const { combinedList } = await import('../company-api.mjs');
  const result = await combinedList(client, { scope: 'memory' });
  assert.ok(result.actions.some(action => action.operationId === 'memory.search'));
  assert.equal(result.companyStatus, 'not_requested'); await assert.rejects(client.setup(), { message: 'Company login state must be owned by this user and private (directory mode 0700)' });
});
test('unrelated commands receive no company/provider/verification credential environment', () => {
  const previous = process.env.GH_TOKEN; process.env.GH_TOKEN = 'synthetic-private';
  try { assert.equal(cleanEnvironment().GH_TOKEN, undefined); }
  finally { if (previous === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = previous; }
});
test('actual packaged CLI connects from empty folder and keeps headless login output private', t => {
  const f = directories(t), bin = join(f.base, 'bin'); mkdirSync(bin);
  const helper = join(f.stateDir, 'bootstrap.mjs'); mkdirSync(f.stateDir, { mode: 0o700 });
  writeFileSync(helper, readFileSync(new URL('../employee-bootstrap.mjs', import.meta.url)), { mode: 0o600 });
  const session = jwt();
  writeFileSync(join(bin, 'cloudflared'), `#!${process.execPath}\nconsole.error('private helper output ${session}'); console.error('${origin}/cdn-cgi/access/cli?aud=synthetic'); console.log('${session}');\n`, { mode: 0o700 });
  const preloader = join(f.base, 'synthetic-transport.mjs');
  writeFileSync(preloader, `import assert from 'node:assert/strict';
    globalThis.fetch = async (url, init) => {
      const target = new URL(url); assert.equal(target.origin, '${origin}');
      assert.equal(init.headers['cf-access-token'], '${session}'); assert.equal(init.redirect, 'manual');
      if (target.pathname === '/api/access/setup') return Response.json(${JSON.stringify(setup())});
      if (target.searchParams.get('id') === 'orders.create') return Response.json({
        operationId: 'orders.create', source: 'company', transport: 'http', method: 'POST', encoding: 'json', path: '/api/orders/create', confirmWith: 'orders.lookup'
      });
      if (target.pathname === '/api/orders/create') return Response.json({ error: { code: 'timeout', message: 'Action timed out; its outcome may be unknown', requestId: 'synthetic' } }, { status: 504 });
      if (target.pathname === '/api/actions') return Response.json(target.searchParams.has('id') ? {
        operationId: 'orders.lookup', source: 'company', transport: 'http', method: 'GET', encoding: 'query', path: '/api/orders'
      } : { actions: [], total: 0 });
      if (target.pathname === '/api/orders') return Response.json({ reference: target.searchParams.get('reference') });
      throw new Error('Unexpected destination');
    };`);
  const env = { ...cleanEnvironment(), HOME: f.base, PATH: `${bin}:${process.env.PATH}` };
  const run = (args, input) => spawnSync(process.execPath, ['--import', preloader, helper, ...args, '--state', f.stateDir], { cwd: f.root, env, input, encoding: 'utf8' });
  for (const [args, expected, input] of [
    [['login', '--origin', origin], /employee_setup/], [['status'], /manual_provider_setup/],
    [['list'], /"actions": \[\]/], [['describe', 'orders.lookup'], /orders.lookup/],
    [['call', 'orders.lookup', '--file', '-'], /synthetic-order/, '{"reference":"synthetic-order"}'],
  ]) {
    const result = run(args, input); assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, expected);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(session));
  }
  // A returned error is still printed, names the read to check first, and ends as a failure.
  const uncertain = run(['call', 'orders.create', '--file', '-'], '{}');
  assert.equal(uncertain.status, 1); assert.ok(!`${uncertain.stdout}${uncertain.stderr}`.includes(session));
  assert.deepEqual(JSON.parse(uncertain.stdout).error, { code: 'timeout', message: 'Action timed out; its outcome may be unknown', requestId: 'synthetic', confirmWith: 'orders.lookup' });
  assert.equal(statSync(join(f.base, '.cloudflared')).mode & 0o777, 0o700);
});
test('published immutable bootstrap pins carry the digest of the checked source', () => {
  const root = new URL('../..', import.meta.url);
  const pin = JSON.parse(readFileSync(new URL('app/worker/employee-access/bootstrap-release.json', root), 'utf8'));
  assert.equal(pin.version, 1);
  if (!pin.commit && !pin.sha256) return; // missing pins deliberately leave setup unavailable
  assert.match(pin.commit, /^[a-f0-9]{40}$/); assert.match(pin.sha256, /^[a-f0-9]{64}$/);
  const checked = readFileSync(new URL('../employee-bootstrap.mjs', import.meta.url));
  assert.equal(createHash('sha256').update(checked).digest('hex'), pin.sha256);
  // Publishing squashes the branch, so the pinned commit is not in main's history and ancestry
  // can not be required. Where this checkout holds the commit, its bytes are the checked source.
  const pinned = spawnSync('git', ['show', `${pin.commit}:scripts/employee-bootstrap.mjs`], { cwd: root });
  if (pinned.status === 0) assert.deepEqual(pinned.stdout, checked);
});
