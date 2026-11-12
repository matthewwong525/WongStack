// The services module's definitions library: record, refresh, the api view, the hint, and the check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACEHOLDER } from '../../.agents/skills/access/scripts/lib/openapi.mjs';
import { apiCommand, callCount, checkServices, examplesOf, keepLast, loadDefinition, notAddedHint, record, refresh, serviceKeys, writeTypes } from '../../.agents/skills/access/scripts/lib/services.mjs';

const CHECK = fileURLToPath(new URL('../../.agents/skills/access/scripts/check-definitions.mjs', import.meta.url));
// A temporary folder that reads as WongStack, which has scripts/company-api.mjs, so the services keep its places.
function stack(t, prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix)); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts')); writeFileSync(join(root, 'scripts/company-api.mjs'), '');
  return root;
}
const NOW = Date.parse('2026-11-06T09:00:00Z');
const real = '1a2b3c4d-1111-2222-3333-444455556666';
const searched = { status: 200, contentType: 'application/json', body: { object: 'list', results: [{ id: real, url: `https://www.notion.so/Plan-${real}` }], has_more: false, next_cursor: null } };

// A repo with the app's worker folder, a key registry naming notion, and a client that answers like the direct route.
function repo(t, { answers = [searched] } = {}) {
  const root = stack(t, 'wong-services-');
  mkdirSync(join(root, 'app', 'worker'), { recursive: true });
  writeFileSync(join(root, 'app', 'worker', 'keys.ts'), 'export const keys = { notion: { title: "Notion" } };\n');
  const sent = [];
  const client = {
    async call(id, input) { sent.push({ id, input }); return answers.length > 1 ? answers.shift() : answers[0]; },
    async describe(id) { return { operationId: id, description: 'Send one request to Notion\'s API at https://api.notion.test/v1/ with the saved key, and return the status.',
      keys: [{ id: 'notion', name: 'Notion', docs: 'https://developers.notion.test/reference', level: 'read' }] }; },
    async http(path) { assert.equal(path, '/api/openapi.json'); return { value: { openapi: '3.2.0', paths: { '/api/health': { get: { operationId: 'health.read', summary: 'Is the app up?', 'x-effect': 'read', responses: {} } } } } }; },
  };
  return { root, client, sent, doc: () => loadDefinition(root, 'notion') };
}
const describeSearch = root => {
  const file = join(root, 'schema/services/notion/openapi.json');
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  Object.assign(doc.paths['/search'].post, { operationId: 'search', summary: 'Find pages by title', description: 'We send page_size 1 to test a key.' });
  writeFileSync(file, JSON.stringify(doc, null, 2));
};

test('record saves a look-up made through the read action: scrubbed, described from the action, typed, and asks for its words', async t => {
  const { root, client, sent, doc } = repo(t);
  const text = await record(client, root, 'notion', 'search', { input: { method: 'POST', path: 'search', body: { page_size: 1 } }, now: NOW });
  assert.deepEqual(sent, [{ id: 'notion.read', input: { method: 'POST', path: 'search', body: { page_size: 1 } } }]);
  assert.deepEqual([doc().info.title, doc().servers[0].url, doc().externalDocs.url], ['Notion', 'https://api.notion.test/v1/', 'https://developers.notion.test/reference']);
  const saved = JSON.parse(readFileSync(join(root, 'schema/services/notion/examples/search.json'), 'utf8'));
  assert.deepEqual([saved.source, saved.recorded, saved.answer.body.results[0].id], ['live', '2026-11-06', '00000000-0000-4000-8000-000000000001']);
  assert.ok(!JSON.stringify(saved).includes(real), 'no real ID is saved');
  assert.match(text, /^POST search — Recorded call: describe it\n/);
  assert.match(text, /example: schema\/services\/notion\/examples\/search\.json/);
  assert.match(text, /Write this call's summary \(what we use it for\) and description \(how we use it, its quirks\) in schema\/services\/notion\/openapi\.json\.$/);
  assert.match(readFileSync(join(root, 'app/worker/services/notion.ts'), 'utf8'), /export type NotionSearchAnswer = \{/);
  assert.equal(callCount(root, 'notion'), 1); assert.deepEqual(serviceKeys(root), ['notion']);
  assert.deepEqual(await checkServices({ root }), ['schema/services/notion/openapi.json: POST search: needs a summary: what we use it for',
    'schema/services/notion/openapi.json: POST search: needs a description: how we use it, and its quirks']);
  describeSearch(root);
  assert.deepEqual(await checkServices({ root }), []);
  const ran = spawnSync(process.execPath, [CHECK, '--root', root], { encoding: 'utf8' });
  assert.equal(ran.status, 0, ran.stderr); assert.match(ran.stdout, /1 service\(s\) described/);
});

test('a second example widens its call and keeps every written word; a refusal saves nothing', async t => {
  const wider = { ...searched, body: { ...searched.body, has_more: true, next_cursor: 'cursor-2', results: [] } };
  const { root, client, doc } = repo(t, { answers: [searched, wider, { error: { code: 'not_a_lookup' } }] });
  await record(client, root, 'notion', 'search', { input: { method: 'POST', path: 'search', body: { page_size: 1 } }, now: NOW });
  describeSearch(root);
  const text = await record(client, root, 'notion', 'search-more', { input: { method: 'POST', path: 'search', body: { page_size: 2, start_cursor: 'c' } }, now: NOW });
  assert.doesNotMatch(text, /Write this call's summary/);
  assert.match(text, /^POST search — Find pages by title\n {2}We send page_size 1 to test a key\./);
  assert.deepEqual(examplesOf(root, 'notion').map(example => example.name), ['search', 'search-more']);
  const call = doc().paths['/search'].post;
  assert.equal(call.operationId, 'search');
  assert.deepEqual(Object.keys(call.requestBody.content['application/json'].schema.properties), ['page_size', 'start_cursor']);
  await assert.rejects(record(client, root, 'notion', 'archive', { input: { method: 'PATCH', path: `pages/${real}`, body: { archived: true } } }), /notion\.read refused it \(not_a_lookup\), so nothing was saved/);
  assert.ok(!existsSync(join(root, 'schema/services/notion/examples/archive.json')));
  assert.equal(callCount(root, 'notion'), 1);
  assert.deepEqual(await checkServices({ root }), []);
});

test('record --last saves the change already made, never sending it, and needs one kept for that key', async t => {
  const { root, client, sent, doc } = repo(t);
  await assert.rejects(record(client, root, 'notion', 'create-page', { last: true }), /No change to notion is kept/);
  keepLast(root, 'notion.read', { method: 'GET', path: 'users' }, searched);
  assert.ok(!existsSync(join(root, '.cache')), 'a look-up is never kept');
  keepLast(root, 'notion.change', { method: 'POST', path: 'pages', body: { parent: { page_id: real }, title: 'Board notes' } }, { status: 200, contentType: 'application/json', body: { id: real } });
  assert.equal(readFileSync(join(root, '.cache/company-api/.gitignore'), 'utf8'), '*\n');
  assert.equal(statSync(join(root, '.cache/company-api/last.json')).mode & 0o777, 0o600);
  await assert.rejects(record(client, root, 'other', 'x', { last: true }), /No change to other is kept/);
  await record(client, root, 'notion', 'create-page', { last: true, now: NOW });
  assert.equal(sent.length, 0, 'the change is never sent again');
  assert.equal(doc().paths['/pages'].post['x-effect'], 'change');
  const saved = JSON.parse(readFileSync(join(root, 'schema/services/notion/examples/create-page.json'), 'utf8'));
  assert.deepEqual([saved.source, saved.request.body.title, saved.answer.body.id], ['change', 'Sample text 1', '00000000-0000-4000-8000-000000000001']);
  keepLast(root, 'notion.change', { method: 'POST', path: 'pages' }, { error: { code: 'forbidden' } });
  keepLast(root, 'notion.change', { method: 'POST', path: 'pages' }, { status: 400, contentType: 'application/json', body: { object: 'error' } });
  assert.match(readFileSync(join(root, '.cache/company-api/last.json'), 'utf8'), /"status":200/, 'a refused change replaces nothing');
});

test('record refuses a name or key it cannot use', async t => {
  const { root, client } = repo(t);
  await assert.rejects(record(client, root, 'company', 'x', { input: {} }), /company is the app's own/);
  await assert.rejects(record(client, root, 'Notion', 'x', { input: {} }), /Name a service key/);
  await assert.rejects(record(client, root, 'notion', 'Bad Name', { input: {} }), /lowercase letters, digits and hyphens/);
});

test('api lists a service\'s calls, shows one with its examples, reads the app\'s own live, and says how to start one', async t => {
  const { root, client } = repo(t);
  assert.match(await apiCommand(client, root, 'notion'), /^No calls saved for notion yet\. .*record notion <name> --file -$/);
  await assert.rejects(apiCommand(client, root, '../x'), /usage: node scripts\/company-api\.mjs api <key> \[<call>\]/);
  await record(client, root, 'notion', 'search', { input: { method: 'POST', path: 'search', body: { page_size: 1 } } });
  describeSearch(root);
  assert.equal(await apiCommand(client, root, 'notion'), 'POST search  Find pages by title');
  assert.match(await apiCommand(client, root, 'notion', 'search'), /We send page_size 1 to test a key\.\n[\s\S]*example: schema\/services\/notion\/examples\/search\.json$/);
  await assert.rejects(apiCommand(client, root, 'notion', 'serch'), { message: 'No call "serch" yet. Closest: POST search.' });
  assert.equal(await apiCommand(client, root, 'company'), 'GET  api/health  Is the app up?');
  assert.equal(await apiCommand(client, root, 'company', 'health.read'), 'GET api/health — Is the app up?');
  const empty = join(root, 'schema/services/empty'); mkdirSync(empty, { recursive: true });
  writeFileSync(join(empty, 'openapi.json'), JSON.stringify({ openapi: '3.2.0', paths: {} }));
  assert.equal(await apiCommand(client, root, 'empty'), 'No calls yet.');
});

test('refresh asks each saved look-up again, never sends a kept change or a made-up request, keeps an example the service refused, and names new fields', async t => {
  const grown = { ...searched, body: { ...searched.body, request_id: 'req_Ab12Cd34Ef56' } };
  const { root, client, sent } = repo(t, { answers: [searched, searched, searched, grown, { status: 500, contentType: 'text/plain', body: 'down' }] });
  await assert.rejects(refresh(client, root, 'notion'), /No definition for notion yet/);
  await record(client, root, 'notion', 'search', { input: { method: 'POST', path: 'search', body: { page_size: 1 } } });
  await record(client, root, 'notion', 'search-two', { input: { method: 'POST', path: 'search', body: { page_size: 2 } } });
  await record(client, root, 'notion', 'search-acme', { input: { method: 'POST', path: 'search', body: { query: 'Acme plan' } } });
  describeSearch(root);
  keepLast(root, 'notion.change', { method: 'POST', path: 'pages', body: {} }, { status: 201, contentType: 'application/json', body: { id: 'p' } });
  await record(client, root, 'notion', 'create-page', { last: true });
  const file = join(root, 'schema/services/notion/openapi.json');
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  Object.assign(doc.paths['/pages'].post, { summary: 'Make a page', description: 'Under the shared board.' });
  writeFileSync(file, JSON.stringify(doc));
  const before = readFileSync(join(root, 'schema/services/notion/examples/search.json'), 'utf8');
  sent.length = 0;
  const { text, ok } = await refresh(client, root, undefined, { now: NOW });
  assert.deepEqual(sent.map(({ input }) => input.body.page_size), [1, 2], 'only the look-ups are sent');
  assert.equal(text, ['saved again  notion/search', 'new fields   notion/search: request_id', 'not checked  notion/create-page (a real change)',
    'not checked  notion/search-acme (its request was made up)', 'not saved    notion/search-two: status 500; the saved one stays'].join('\n'));
  assert.equal(ok, false);
  assert.notEqual(readFileSync(join(root, 'schema/services/notion/examples/search.json'), 'utf8'), before);
  assert.match(readFileSync(join(root, 'schema/services/notion/examples/search.json'), 'utf8'), /"request_id": "req_000000000001"/);
  assert.match(readFileSync(join(root, 'schema/services/notion/examples/search-two.json'), 'utf8'), /"has_more": false/);
});

test('refresh names a field the new answer lacks before saving widens the call to fit it', async t => {
  const lacking = { ...searched.body }; delete lacking.has_more;
  const { root, client, doc } = repo(t, { answers: [searched, { ...searched, body: lacking }] });
  await record(client, root, 'notion', 'search', { input: { method: 'POST', path: 'search', body: { page_size: 1 } } });
  describeSearch(root);
  const { text, ok } = await refresh(client, root, 'notion');
  assert.equal(ok, false);
  assert.equal(text, 'saved again  notion/search\ndoesn\'t fit  notion/search: answer.body.has_more: missing');
  assert.ok(!doc().paths['/search'].post.responses['200'].content['application/json'].schema.required.includes('has_more'), 'the saved call is widened');
  assert.deepEqual(await checkServices({ root }), []);
  assert.equal(await refresh(client, stack(t, 'wong-none-')).then(result => result.text), 'No examples to refresh.');
});

test('after a direct call its definition lacks, the hint names the one command that saves it', t => {
  const { root } = repo(t);
  assert.equal(notAddedHint(root, 'notion.read', { method: 'POST', path: 'search', body: { page_size: 1 } }, searched),
    'Not in schema/services/notion yet. Add it: node scripts/company-api.mjs record notion search --file - <<\'EOF\'\n{"method":"POST","path":"search","body":{"page_size":1}}\nEOF');
  assert.equal(notAddedHint(root, 'notion.change', { method: 'PATCH', path: `pages/${real}` }, searched),
    'Not in schema/services/notion yet. Add it: node scripts/company-api.mjs record notion pages-id --last');
  assert.equal(notAddedHint(root, 'notion.read', { method: 'GET', path: '' }, searched), 'Not in schema/services/notion yet. Add it: node scripts/company-api.mjs record notion call --file - <<\'EOF\'\n{"method":"GET","path":""}\nEOF');
  for (const [id, input, answer] of [['notion.read', { method: 'GET', path: 'x' }, { error: { code: 'forbidden' } }],
    ['notion.read', { method: 'GET', path: 'x' }, { status: 404, contentType: 'application/json', body: { object: 'error' } }], ['company.read', { method: 'GET', path: 'x' }, searched],
    ['hello.greeting', { name: 'x' }, {}], ['notion.read', { name: 'x' }, searched]]) assert.equal(notAddedHint(root, id, input, answer), null, id);
  mkdirSync(join(root, 'schema/services/notion'), { recursive: true });
  writeFileSync(join(root, 'schema/services/notion/openapi.json'), JSON.stringify({ openapi: '3.2.0', paths: { '/pages/{id}': { patch: {} } } }));
  assert.equal(notAddedHint(root, 'notion.change', { method: 'PATCH', path: `pages/${real}` }, searched), null, 'a call it holds');
});

// One service folder per broken rule, each with a valid example to start from.
function broken(t, key, edit = doc => doc, { example = searched, request = { method: 'POST', path: 'search', body: { page_size: 1 } }, types = true } = {}) {
  const root = stack(t, 'wong-broken-');
  mkdirSync(join(root, 'wiki/services'), { recursive: true }); writeFileSync(join(root, 'wiki/services/notion.md'), '# Notion\n');
  mkdirSync(join(root, `schema/services/${key}/examples`), { recursive: true });
  const doc = edit({ openapi: '3.2.0', info: { title: 'Notion', version: 'recorded' }, servers: [{ url: 'https://api.notion.test/v1/' }], paths: { '/search': { post: {
    operationId: 'search', summary: 'Find pages', description: 'How we use it.', 'x-effect': 'read',
    responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'object', required: ['object'], properties: { object: { type: 'string' } } } } } } } } } } });
  writeFileSync(join(root, `schema/services/${key}/openapi.json`), typeof doc === 'string' ? doc : JSON.stringify(doc));
  writeFileSync(join(root, `schema/services/${key}/examples/one.json`), typeof example === 'string' ? example
    : JSON.stringify({ source: 'live', recorded: '2026-11-06', request, answer: { ...example, body: { object: 'list' } } }));
  if (types) mkdirSync(join(root, 'app/worker'), { recursive: true });
  if (types && typeof doc !== 'string') writeTypes(root);
  return root;
}

test('the check passes on a good folder and names each rule a folder breaks', async t => {
  const problems = async (...args) => checkServices({ root: broken(t, ...args) });
  assert.deepEqual(await problems('notion'), []);
  assert.deepEqual(await problems('company'), ['schema/services/company: company is kept for the app\'s own calls (`api company`); name the folder for its key']);
  assert.deepEqual(await problems('stranger'), ['schema/services/stranger: no key stranger in app/worker/keys.ts and no notes page wiki/services/stranger.md']);
  assert.deepEqual(await problems('notion', () => '{'), [`schema/services/notion/openapi.json: does not parse: ${(() => { try { JSON.parse('{'); } catch (error) { return error.message; } })()}`]);
  assert.deepEqual(await problems('notion', doc => ({ ...doc, openapi: '3.1.0' })), ['schema/services/notion/openapi.json: openapi is "3.1.0", not 3.2.0, the app\'s own version']);
  const call = doc => doc.paths['/search'].post;
  assert.deepEqual(await problems('notion', doc => { call(doc).responses['200'].content['application/json'].schema = { $ref: '#/components/schemas/Gone' }; return doc; }),
    ['schema/services/notion/openapi.json: /paths//search/post/responses/200/content/application/json/schema: #/components/schemas/Gone names nothing']);
  assert.deepEqual(await problems('notion', doc => { const op = call(doc); delete op.operationId; op['x-effect'] = 'write'; op.summary = PLACEHOLDER; op.description = ' '; return doc; }), [
    'schema/services/notion/openapi.json: POST search: needs an operationId', 'schema/services/notion/openapi.json: POST search: needs x-effect: read or change',
    'schema/services/notion/openapi.json: POST search: needs a summary: what we use it for', 'schema/services/notion/openapi.json: POST search: needs a description: how we use it, and its quirks']);
  assert.deepEqual(await problems('notion', doc => doc, { request: { method: 'GET', path: 'search' } }),
    ['schema/services/notion/examples/one.json: its request GET search fits 0 calls, not one']);
  assert.deepEqual(await problems('notion', doc => { doc.paths['/{kind}'] = { post: { ...call(doc) } }; return doc; }),
    ['schema/services/notion/examples/one.json: its request POST search fits 2 calls, not one']);
  assert.deepEqual(await problems('notion', doc => doc, { example: { ...searched, status: 404 } }),
    ['schema/services/notion/examples/one.json: POST search describes no answer for status 404']);
  assert.deepEqual(await problems('notion', doc => { call(doc).responses['200'].content['application/json'].schema.properties.object.type = 'number'; return doc; }),
    ['schema/services/notion/examples/one.json: answer.body.object: is string, not number']);
  assert.deepEqual(await problems('notion', doc => { call(doc).responses['200'].content['application/json'].schema.type = 'array'; return doc; }),
    ['schema/services/notion/examples/one.json: answer.body: is object, not array']);
  assert.deepEqual(await problems('notion', doc => doc, { request: { method: 'POST', path: 'search', body: { query: 'jane@acme.com' } } }),
    ['schema/services/notion/examples/one.json: request.body.query: looks private (an email)']);
  assert.deepEqual(await problems('notion', doc => doc, { example: '{"source":"guess"}' }), ['schema/services/notion/examples/one.json: needs source (live or change), request and answer']);
  assert.match((await problems('notion', doc => doc, { example: 'nope' }))[0], /^schema\/services\/notion\/examples\/one\.json: does not parse: /);
  const stale = broken(t, 'notion');
  writeFileSync(join(stale, 'app/worker/services/notion.ts'), '// edited\n');
  assert.deepEqual(await checkServices({ root: stale }), ['app/worker/services/notion.ts: out of date with schema/services/notion/openapi.json; rebuild it: node .claude/skills/access/scripts/check-definitions.mjs --types']);
  const fixed = spawnSync(process.execPath, [CHECK, '--root', stale, '--types'], { encoding: 'utf8' });
  assert.equal(fixed.status, 0, fixed.stderr);
  assert.deepEqual(await problems('notion', doc => doc, { types: false }), [], 'a repo with no app has no types file to match');
});

test('the check command passes with no services folder and fails, naming each problem and the rules page', t => {
  const empty = stack(t, 'wong-empty-');
  const none = spawnSync(process.execPath, [CHECK, '--root', empty], { encoding: 'utf8' });
  assert.equal(none.status, 0); assert.equal(none.stdout, 'service definitions: no schema/services/, so nothing to check\n');
  const bad = spawnSync(process.execPath, [CHECK, '--root', broken(t, 'stranger')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr, 'schema/services/stranger: no key stranger in app/worker/keys.ts and no notes page wiki/services/stranger.md\n\n'
    + '1 problem(s) in the service definitions: wiki/stack/service-catalogue.md#each-services-definition\n');
});
