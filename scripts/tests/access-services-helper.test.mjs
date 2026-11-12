// The services module's helper: where a project keeps its service files, the client to the app, and the commands
// `services`, `api`, `record`, `tool` and `key` as runServices runs them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accessClient, appOrigin } from '../../.agents/skills/access/scripts/lib/client.mjs';
import { layout, missingPlace, notesPage } from '../../.agents/skills/access/scripts/lib/services.mjs';
import { KEYS_UNSET, runServices, serviceLines, usage, withNotes } from '../../.agents/skills/access/scripts/services.mjs';

const MODULE = fileURLToPath(new URL('../../.agents/skills/access/scripts/', import.meta.url));
const APP = 'https://app.example.com';

// A temporary project: `stack` makes it read as WongStack; `slots` is its .agents/access/slots.json.
function project(t, { stack = false, slots } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'access-helper-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  if (stack) { mkdirSync(join(root, 'scripts')); writeFileSync(join(root, 'scripts/company-api.mjs'), ''); }
  if (slots) { mkdirSync(join(root, '.agents/access'), { recursive: true }); writeFileSync(join(root, '.agents/access/slots.json'), JSON.stringify(slots)); }
  return root;
}
// Runs one command with console.log caught: its printed lines and the exit code it set.
async function ran(command, args, values, options) {
  const lines = [], log = console.log, code = process.exitCode;
  console.log = line => lines.push(String(line));
  try { await runServices({ command, args, values }, options); return { out: lines.join('\n'), failed: process.exitCode === 1 }; }
  finally { console.log = log; process.exitCode = code; }
}

test('layout keeps WongStack\'s places, takes each one slots.json names, and names none in a bare project', t => {
  assert.deepEqual(layout(project(t, { stack: true })), { definitions: 'schema/services', types: 'app/worker/services', notes: 'wiki/services',
    keys: 'app/worker/keys.ts', app: null, helper: 'node scripts/company-api.mjs', check: 'node .claude/skills/access/scripts/check-definitions.mjs' });
  const named = project(t, { slots: { definitions: 'services', notes: 'docs/services', app: APP } });
  assert.deepEqual(layout(named), { definitions: 'services', types: null, notes: 'docs/services', keys: null, app: APP,
    helper: 'node .claude/skills/access/scripts/services.mjs', check: 'node .claude/skills/access/scripts/check-definitions.mjs' });
  assert.equal(missingPlace(named), null);
  const bare = project(t);
  assert.match(missingPlace(bare), /add "definitions" \(such as "schema\/services"\) to \.agents\/access\/slots\.json/);
  assert.equal(notesPage(bare, 'stripe'), null);
  assert.deepEqual(notesPage(named, 'stripe'), { path: 'docs/services/stripe.md', exists: false });
  assert.equal(notesPage(named, '../odd'), null);
});

test('the app\'s address comes from slots.json and must be HTTPS', t => {
  assert.equal(appOrigin(project(t, { slots: { app: `${APP}/` } })), APP);
  for (const slots of [undefined, { app: 'http://app.example.com' }, { app: 'nope' }]) {
    assert.throws(() => appOrigin(project(t, { slots })), /Name the app's HTTPS address: add "app"/);
  }
  // With no `app`, a WongStack install's record names it: the company origin, then the origin memory runs on.
  const installed = components => {
    const root = project(t, { slots: { slots: 'app/worker/access-slots.ts' } });
    mkdirSync(join(root, '.claude')); writeFileSync(join(root, '.claude/.wong-stack.json'), JSON.stringify({ components }));
    return root;
  };
  assert.equal(appOrigin(installed({ companyApi: { origin: APP }, memory: { worker: 'https://other.example.com/_memory' } })), APP);
  assert.equal(appOrigin(installed({ memory: { worker: `${APP}/_memory` } })), APP);
  assert.throws(() => appOrigin(installed({})), /Name the app's HTTPS address/);
});

test('the client signs each request in, refuses a stray path, and turns each failure into one plain line', async t => {
  const root = project(t, { slots: { app: APP } });
  const sent = [];
  let answer = () => Response.json({ ok: true });
  const client = accessClient({ root, headers: async origin => ({ 'cf-access-token': `signed-for-${origin}` }),
    send: async (url, init) => { sent.push({ url: String(url), ...init }); return answer(); } });
  assert.equal(client.target(), APP);
  assert.deepEqual(await client.http('/api/services'), { value: { ok: true }, status: 200 });
  assert.equal(sent[0].url, `${APP}/api/services`); assert.equal(sent[0].redirect, 'manual');
  assert.equal(sent[0].headers['cf-access-token'], `signed-for-${APP}`);
  for (const path of ['https://elsewhere.example.com/api/x', '/api/../admin', '/other', '/api/x\\y']) await assert.rejects(client.http(path), /arbitrary server URL/);
  for (const [response, said] of [[new Response(null, { status: 302 }), /redirect: sign in again/], [new Response('{}', { status: 401 }), /sign-in expired/],
    [new Response('<html>'), /did not answer with JSON \(HTTP 200\)/], [Response.json({ echo: `signed-for-${APP}` }), /held sign-in material/],
    [Response.json({}, { status: 500 }), /refused the request \(HTTP 500\)/]]) {
    answer = () => response; await assert.rejects(client.http('/api/services'), said);
  }
  answer = () => Response.json({ error: { code: 'bad_tool' } }, { status: 400 });
  assert.deepEqual(await client.http('/api/access/tools/x'), { value: { error: { code: 'bad_tool' } }, status: 400 });
  answer = () => { throw new Error('offline'); };
  await assert.rejects(client.http('/api/services'), /could not be reached/);
  await assert.rejects(client.call('notion.change', {}), /outcome may be unknown\. Do not repeat it at once\. Look it up with notion\.read first\./);
});

test('call sends a key\'s read or change to its direct route, and describe reads the key from the services list', async t => {
  const root = project(t, { slots: { app: APP } });
  const sent = [];
  const client = accessClient({ root, headers: async () => ({}), send: async (url, init) => {
    sent.push({ path: new URL(url).pathname, method: init.method, body: init.body });
    return new URL(url).pathname === '/api/services' ? Response.json({ services: [{ id: 'notion', name: 'Notion', docs: 'https://developers.notion.test' }] })
      : Response.json({ status: 200, contentType: 'application/json', body: {} });
  } });
  assert.deepEqual(await client.call('notion.read', { method: 'GET', path: 'users' }), { status: 200, contentType: 'application/json', body: {} });
  assert.deepEqual(sent[0], { path: '/api/direct/notion/read', method: 'POST', body: '{"method":"GET","path":"users"}' });
  await assert.rejects(client.call('hello.greeting', {}), /not a key's read or change/);
  assert.deepEqual(await client.describe('notion.read'), { operationId: 'notion.read', description: '',
    keys: [{ id: 'notion', name: 'Notion', docs: 'https://developers.notion.test' }] });
  await assert.rejects(client.describe('stripe.read'), /No service named stripe: run services --all\./);
});

test('services shows each key on one line with its level, notes page and guide, and counts the keys left out', t => {
  const root = project(t, { stack: true });
  mkdirSync(join(root, 'wiki/services'), { recursive: true }); writeFileSync(join(root, 'wiki/services/stripe.md'), '# Stripe\n');
  const answer = { revision: 'r', needAccess: 2, services: [
    { id: 'stripe', name: 'Stripe', purpose: 'payments and refunds', ready: true, level: 'read', direct: true, docs: 'https://docs.stripe.com/api' },
    { id: 'mailchimp', name: 'Mailchimp', purpose: 'email lists', ready: false, level: 'write', direct: false },
    { id: '../odd', name: 'Odd', purpose: 'an id no page can have', ready: true, level: 'write', direct: false }] };
  const noted = withNotes(answer, root);
  assert.deepEqual(noted.services.map(service => service.notes), [{ path: 'wiki/services/stripe.md', exists: true }, { path: 'wiki/services/mailchimp.md', exists: false }, undefined]);
  assert.deepEqual(noted.services.map(service => service.calls), [0, undefined, undefined], 'a key used directly counts its saved calls');
  assert.deepEqual(serviceLines(noted, 'node scripts/company-api.mjs').map(line => line.trimEnd().split(/ {2,}/)), [
    ['Stripe', 'payments and refunds', 'ready', 'Read'], ['', 'notes: wiki/services/stripe.md', 'guide: https://docs.stripe.com/api'],
    ['', 'calls: 0 · node scripts/company-api.mjs api stripe'],
    ['Mailchimp', 'email lists', 'not saved yet: ask the owner'], ['', 'notes: none yet; start wiki/services/mailchimp.md'],
    ['Odd', 'an id no page can have', 'ready', 'Read & write'],
    ['2 more keys need access: ask the owner']]);
  // With --all the keys left out are rows of their own, so no count follows.
  const all = serviceLines({ needAccess: 1, services: [{ id: 'xero', name: 'Xero', purpose: 'books', ready: true, level: null, direct: false, notes: { path: 'wiki/services/xero.md', exists: false } }] });
  assert.deepEqual(all.map(line => line.trimEnd().split(/ {2,}/)), [['Xero', 'books', 'needs access: ask the owner'], ['', 'notes: none yet; start wiki/services/xero.md']]);
  assert.deepEqual(serviceLines({ services: [], needAccess: 1 }), ['1 more key needs access: ask the owner']);
  assert.deepEqual(serviceLines({ services: [], needAccess: 0 }), ['No services yet.']);
  // A bare project has no notes folder and no definitions, so a row gains neither.
  assert.deepEqual(withNotes(answer, project(t)).services[0], answer.services[0]);
});

test('runServices runs each command with the client it is handed, and a bare project is told what to fill', async t => {
  const root = project(t, { slots: { definitions: 'schema/services' } });
  const bare = project(t);
  const seen = [];
  const client = { target: () => APP, async http(path, init = {}) {
    seen.push([path, init.method ?? 'GET', init.headers?.Origin]);
    if (path.startsWith('/api/services')) return { value: { needAccess: 0, services: [{ id: 'stripe', name: 'Stripe', purpose: 'payments', ready: true, level: 'write', direct: true }] } };
    if (path === '/api/access/tools/bad') return { value: { error: { code: 'bad_tool' } } };
    return { value: path.startsWith('/api/access/keys/') ? { name: path.split('/').at(-1), waiting: true } : init.method === 'PUT' ? { id: 'stripe', secret: 'TOOL_STRIPE' } : { removed: true } };
  } };
  const options = { client, root, input: () => ({ title: 'Stripe' }) };
  assert.equal((await ran('services', [], {}, options)).out, 'Stripe  payments  ready  Read & write\n  calls: 0 · node .claude/skills/access/scripts/services.mjs api stripe');
  assert.deepEqual(JSON.parse((await ran('services', [], { all: true, json: true }, options)).out).services[0].id, 'stripe');
  assert.deepEqual(JSON.parse((await ran('tool', ['add', 'stripe'], {}, options)).out), { id: 'stripe', secret: 'TOOL_STRIPE' });
  assert.deepEqual(JSON.parse((await ran('tool', ['remove', 'stripe'], {}, options)).out), { removed: true });
  assert.equal((await ran('tool', ['add', 'bad'], {}, options)).failed, true, 'a refusal ends as a failure');
  const sealed = join(root, 'sealed.json'); writeFileSync(sealed, JSON.stringify({ sealed: { v: 1 }, ends: 'abcd' }));
  assert.deepEqual(JSON.parse((await ran('key', ['send', 'TOOL_STRIPE'], { 'sealed-file': sealed }, options)).out), { name: 'TOOL_STRIPE', waiting: true });
  assert.deepEqual(seen.slice(2), [['/api/access/tools/stripe', 'PUT', APP], ['/api/access/tools/stripe', 'DELETE', APP],
    ['/api/access/tools/bad', 'PUT', APP], ['/api/access/keys/TOOL_STRIPE', 'PUT', APP]]);
  const none = { client: { http: async () => ({ value: { needAccess: 0, services: [] } }) }, root };
  assert.equal((await ran('services', [], {}, none)).out, 'No services yet.');
  const unasked = { client: { http: async () => assert.fail('a bare project asks the app nothing') }, root: bare };
  assert.deepEqual(await ran('services', [], {}, unasked), { out: KEYS_UNSET, failed: false }, 'a bare project is told what to fill');
  for (const [command, args] of [['api', ['stripe']], ['record', ['stripe', 'search']]]) {
    await assert.rejects(ran(command, args, { last: true }, { ...options, root: bare }), /add "definitions"/);
  }
  const wrong = new RegExp(usage('node .claude/skills/access/scripts/services.mjs').split('\n')[0]);
  for (const [command, args, values] of [['mcp', ['docs'], {}], ['services', ['extra'], {}], ['tool', ['add', 'Stripe'], {}],
    ['key', ['send', 'TOOL_X'], {}], ['key', ['send', 'TOOL_X'], { 'value-stdin': true, 'sealed-file': '-' }]]) {
    await assert.rejects(ran(command, args, values, options), wrong, `${command} ${args.join(' ')}`);
  }
});

test('the helper and the check follow the CLI convention, and the check passes a project with nothing to check', t => {
  const run = (script, ...args) => spawnSync(process.execPath, [join(MODULE, script), ...args], { encoding: 'utf8' });
  for (const script of ['services.mjs', 'check-definitions.mjs']) {
    const help = run(script, '--help'); assert.equal(help.status, 0, help.stderr); assert.match(help.stdout, /^usage: /);
    const bad = run(script, '--bogus'); assert.equal(bad.status, 2); assert.match(bad.stderr, /usage: /);
  }
  const none = run('check-definitions.mjs', '--root', project(t));
  assert.equal(none.status, 0, none.stderr); assert.equal(none.stdout, 'service definitions: no definitions folder, so nothing to check\n');
});

test('the real helper, in a project with Access alone and no keys named, says so with no app to reach', t => {
  const root = project(t, { slots: { slots: 'app/access-slots.mjs' } });
  cpSync(realpathSync(join(MODULE, '..')), join(root, '.claude/skills/access'), { recursive: true });
  const ran = spawnSync(process.execPath, [join(root, '.claude/skills/access/scripts/services.mjs'), 'services'], { encoding: 'utf8',
    env: { ...process.env, PATH: '' } });
  assert.deepEqual([ran.status, ran.stdout, ran.stderr], [0, `${KEYS_UNSET}\n`, '']);
});
