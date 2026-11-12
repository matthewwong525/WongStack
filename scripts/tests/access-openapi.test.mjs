import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACEHOLDER, VERSION, addExample, brokenRefs, buildOperation, callLines, findOperation, matching, newDefinition, newFields, pointer,
  resolve, responseFor, schemaOf, shortView, template, typeText, typesFile, validate, widen } from '../../.agents/skills/access/scripts/lib/openapi.mjs';

// The app's own compiler: a checkout with no app install skips the compile test.
const TSC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'node_modules', '.bin', 'tsc');

// A small definition in the shape a service file takes: references, a 2XX answer as the app's own file writes it,
// and objects nested past the short view's cut.
const fixture = () => ({
  openapi: VERSION, info: { title: 'Notion', version: 'recorded' }, servers: [{ url: 'https://api.notion.test/v1/' }],
  components: { schemas: {
    Page: { type: 'object', required: ['id', 'url'], properties: { id: { type: 'string', description: 'The page ID.' }, url: { type: 'string' },
      parent: { type: 'object', properties: { deep: { type: 'object', properties: { deeper: { type: 'object', properties: { x: { type: 'string' } } } } } } } } },
    Loop: { type: 'object', properties: { next: { $ref: '#/components/schemas/Loop' } } } } },
  paths: {
    '/search': { post: { operationId: 'searchPages', summary: 'Search pages', description: 'We sort by last edit for the newest.\nPitfall: shared pages only.', 'x-effect': 'read',
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string', description: 'Words to find' }, page_size: { type: 'integer' } } } } } },
      responses: { '2XX': { description: 'ok', content: { 'application/json': { schema: { type: 'object', required: ['results', 'has_more'],
        properties: { results: { type: 'array', items: { $ref: '#/components/schemas/Page' } }, has_more: { type: 'boolean' }, next_cursor: { type: ['string', 'null'] } } } } } } } } },
    '/pages/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { operationId: 'getPage', summary: 'Read one page', 'x-effect': 'read', parameters: [{ name: 'filter_properties', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/Page' } } } } } },
      patch: { operationId: 'updatePage', summary: 'Archive a page', 'x-effect': 'change', responses: { 204: { description: 'done' } } } },
  },
});

test('references resolve, and one that names nothing is listed by where it sits', () => {
  const doc = fixture();
  assert.equal(resolve(doc, { $ref: '#/components/schemas/Page' }).required[0], 'id');
  assert.deepEqual(resolve(doc, { $ref: '#/components/schemas/Loop' }).type, 'object');
  assert.deepEqual(brokenRefs(doc), []);
  doc.paths['/search'].post.responses['2XX'].content['application/json'].schema.properties.results.items.$ref = '#/components/schemas/Missing';
  assert.deepEqual(brokenRefs(doc), ['/paths//search/post/responses/2XX/content/application/json/schema/properties/results/items: #/components/schemas/Missing names nothing']);
  assert.throws(() => pointer(doc, 'https://outside.test/schema'), /inside the same file/);
});

test('the call list is one line per call, and a call is found by operationId, path, real path, method and path, or a word', () => {
  const doc = fixture();
  assert.deepEqual(callLines(doc), ['POST  search      Search pages', 'GET   pages/{id}  Read one page', 'PATCH pages/{id}  Archive a page']);
  assert.equal(findOperation(doc, 'searchPages').path, 'search');
  assert.equal(findOperation(doc, '/search').method, 'POST');
  assert.equal(findOperation(doc, 'PATCH pages/abc').operation.operationId, 'updatePage');
  assert.equal(findOperation(doc, 'getPage').method, 'GET');
  assert.throws(() => findOperation(doc, 'pages/abc'), /fits 2 calls: GET pages\/\{id\}, PATCH pages\/\{id\}/);
  assert.throws(() => findOperation(doc, 'serch'), { message: 'No call "serch" yet. Closest: POST search.' });
  assert.throws(() => findOperation({ paths: {} }, 'x'), { message: 'No call "x" yet.' });
  assert.equal(findOperation(doc, 'update').operation.operationId, 'updatePage', 'a word of the operationId');
});

test('the short view prints how we use the call, what to send, what comes back, cut past three levels, and its examples', () => {
  const doc = fixture();
  assert.equal(shortView(doc, findOperation(doc, 'search'), ['schema/services/notion/examples/search.json']), [
    'POST search — Search pages', '  We sort by last edit for the newest.', '  Pitfall: shared pages only.',
    '  send { query?: string, page_size?: number }', '    query: Words to find',
    '  answer 2XX { results: { id: string, url: string, parent?: { deep?: {…} } }[], has_more: boolean, next_cursor?: string | null }',
    '  example: schema/services/notion/examples/search.json'].join('\n'));
  assert.equal(shortView(doc, findOperation(doc, 'getPage')), ['GET pages/{id} — Read one page', '  path { id: string }', '  query { filter_properties?: string }',
    '  answer 200 { id: string, url: string, parent?: { deep?: { deeper?: {…} } } }', '    id: The page ID.'].join('\n'));
  assert.equal(shortView(doc, findOperation(doc, 'updatePage')), 'PATCH pages/{id} — Archive a page\n  path { id: string }\n  answer 204 (no body)');
});

test('the type notation reads unions, lists, records, choices and references', () => {
  const doc = fixture();
  assert.equal(typeText(doc, { enum: ['a', 1] }), '"a" | 1');
  assert.equal(typeText(doc, { oneOf: [{ type: 'string' }, { type: 'null' }] }), 'string | null');
  assert.equal(typeText(doc, { allOf: [{ type: 'object', properties: { a: { type: 'string' } } }, { anyOf: [{ type: 'number' }, { type: 'boolean' }] }] }), '{ a?: string } & (number | boolean)');
  assert.equal(typeText(doc, { type: 'array', items: { type: ['string', 'null'] } }), '(string | null)[]');
  assert.equal(typeText(doc, { type: 'object', additionalProperties: { type: 'number' } }), 'Record<string, number>');
  assert.equal(typeText(doc, { type: 'object' }), 'Record<string, unknown>');
  assert.equal(typeText(doc, { type: 'object', properties: { 'odd-name': { type: 'string' } }, required: ['odd-name'] }), '{ "odd-name": string }');
  assert.equal(typeText(doc, { $ref: '#/components/schemas/Loop' }), '{ next?: unknown }');
  assert.equal(typeText(doc, {}), 'unknown'); assert.equal(typeText(doc, undefined), 'unknown'); assert.equal(typeText(doc, { type: 'weird' }), 'unknown');
});

test('an example matches its one call by method and path, and an answer key may be its status, its class or the default', () => {
  const doc = fixture();
  assert.deepEqual(matching(doc, { method: 'get', path: '/pages/123' }).map(call => call.operation.operationId), ['getPage']);
  assert.deepEqual(matching(doc, { method: 'GET', path: 'pages/123/children' }), []);
  assert.equal(responseFor(doc.paths['/search'].post, 201).description, 'ok');
  assert.equal(responseFor({ responses: { default: { description: 'any' } } }, 500).description, 'any');
  assert.equal(responseFor({}, 200), undefined);
});

test('a call built from one example, then widened by a second that keeps every written word', () => {
  const first = { source: 'live', request: { method: 'GET', path: 'pages/00000000-0000-4000-8000-000000000001/blocks/00001', query: 'page_size=2' },
    answer: { status: 200, contentType: 'application/json; charset=utf-8', body: { results: [{ id: 'a', archived: false }], next_cursor: null } } };
  assert.equal(template(first.request.path), 'pages/{id}/blocks/{id2}');
  const built = buildOperation(first, 'read');
  assert.deepEqual([built.operationId, built.summary, built['x-effect']], ['getPagesByIdBlocksById2', PLACEHOLDER, 'read']);
  assert.deepEqual(built.parameters.map(parameter => `${parameter.in}:${parameter.name}`), ['path:id', 'path:id2', 'query:page_size']);
  let { doc, added } = addExample(newDefinition({ title: 'Notion', base: 'https://api.notion.test/v1/', docs: 'https://developers.notion.test/' }), first, 'read');
  assert.equal(added, true); assert.equal(doc.openapi, VERSION); assert.equal(doc.externalDocs.url, 'https://developers.notion.test/');
  const route = doc.paths['/pages/{id}/blocks/{id2}'].get;
  Object.assign(route, { summary: 'List a block\'s children', description: 'We page with page_size.' });
  route.responses['200'].content['application/json'].schema.properties.next_cursor.description = 'Cursor for the next page.';
  const second = { ...first, request: { ...first.request, query: 'page_size=2&start_cursor=x' },
    answer: { ...first.answer, body: { results: [{ id: 'b', title: 'Sample text 1' }, { id: 'c' }], next_cursor: 'x', has_more: true } } };
  ({ doc, added } = addExample(doc, second, 'read'));
  const grown = doc.paths['/pages/{id}/blocks/{id2}'].get;
  assert.equal(added, false);
  assert.deepEqual([grown.summary, grown.description], ['List a block\'s children', 'We page with page_size.']);
  assert.deepEqual(grown.parameters.map(parameter => parameter.name), ['id', 'id2', 'page_size', 'start_cursor']);
  const schema = grown.responses['200'].content['application/json'].schema;
  assert.deepEqual(schema.required, ['results', 'next_cursor']);
  assert.deepEqual(schema.properties.next_cursor, { type: ['null', 'string'], description: 'Cursor for the next page.' });
  assert.deepEqual(schema.properties.results.items.required, ['id']);
  assert.deepEqual(newFields(route.responses['200'].content['application/json'].schema, schema), ['results[].title', 'has_more']);
  const posted = addExample(doc, { source: 'change', request: { method: 'POST', path: 'pages', body: { title: 'x', tags: [] } }, answer: { status: 201, contentType: 'application/json', body: { id: 'p' } } }, 'change');
  const made = posted.doc.paths['/pages'].post;
  assert.deepEqual([made['x-effect'], made.requestBody.content['application/json'].schema], ['change', { type: 'object', properties: { title: { type: 'string' }, tags: { type: 'array', items: {} } } }]);
  const again = addExample(posted.doc, { source: 'change', request: { method: 'POST', path: 'pages', body: { tags: ['a'] } }, answer: { status: 400, contentType: 'text/plain', body: 'bad' } }, 'change');
  assert.deepEqual(Object.keys(again.doc.paths['/pages'].post.responses), ['201', '400']);
  assert.deepEqual(again.doc.paths['/pages'].post.requestBody.content['application/json'].schema.properties.tags.items, { type: 'string' });
  assert.throws(() => addExample({ paths: { '/a/{x}': { get: {} }, '/{y}/b': { get: {} } } }, { request: { method: 'GET', path: 'a/b' } }, 'read'), /fits 2 calls/);
});

test('a hand-written choice is never widened, and an unknown shape takes the new one', () => {
  const choice = { oneOf: [{ type: 'string' }] };
  assert.equal(widen(choice, { type: 'number' }), choice);
  assert.deepEqual(widen({ description: 'kept' }, { type: 'string' }), { type: 'string', description: 'kept' });
  assert.deepEqual(widen({ type: 'null' }, schemaOf({ a: 1 })), { type: ['null', 'object'], properties: { a: { type: 'number' } }, required: ['a'] });
  assert.deepEqual(widen({ type: 'object', properties: { a: { type: 'number' } }, required: ['a'] }, { type: 'null' }), { type: ['object', 'null'], properties: { a: { type: 'number' } }, required: ['a'] });
  assert.deepEqual(widen(undefined, { type: 'string' }), { type: 'string' });
  assert.deepEqual(widen({ type: 'string' }, schemaOf([1])), { type: ['string', 'array'], items: { type: 'number' } });
  assert.deepEqual(widen({ properties: { a: { type: 'string' } } }, schemaOf({ b: true })), { type: 'object', properties: { a: { type: 'string' }, b: { type: 'boolean' } } });
});

test('the answer check reads its keywords and names each field that does not fit', () => {
  const doc = fixture();
  const schema = doc.paths['/search'].post.responses['2XX'].content['application/json'].schema;
  assert.deepEqual(validate(doc, schema, { results: [{ id: 'a', url: 'u' }], has_more: false, next_cursor: null }), []);
  assert.deepEqual(validate(doc, schema, { results: [{ id: 3 }], extra: 1 }), ['has_more: missing', 'results[0].url: missing', 'results[0].id: is integer, not string']);
  assert.deepEqual(validate(doc, schema, []), ['(the whole answer): is array, not object']);
  assert.deepEqual(validate(doc, { type: 'number' }, 2), []);
  assert.deepEqual(validate(doc, { enum: ['a'] }, 'b'), ['(the whole answer): "b" is not one of "a"']);
  assert.deepEqual(validate(doc, { allOf: [{ required: ['a'] }] }, {}), ['a: missing']);
  assert.deepEqual(validate(doc, { anyOf: [{ type: 'string' }, { type: 'null' }] }, 1), ['(the whole answer): fits none of its anyOf choices']);
  assert.deepEqual(validate(doc, { oneOf: [{ type: 'number' }, { type: 'integer' }] }, 1), ['(the whole answer): fits 2 of its oneOf choices, not exactly one']);
  assert.deepEqual(validate(doc, { minLength: 9, type: 'string' }, 'short'), [], 'a keyword it does not read is left unchecked');
  assert.deepEqual(validate(doc, true, 'x'), []);
});

test('the types file is the same for the same file', () => {
  const doc = fixture();
  const text = typesFile('notion', doc);
  assert.equal(typesFile('notion', structuredClone(doc)), text);
  assert.match(text, /^\/\/ Generated from schema\/services\/notion\/openapi\.json/);
  assert.match(text, /export type NotionSearchRequest = \{\n {2}query\?: string;\n {2}page_size\?: number;\n\};/);
  assert.match(text, /export type NotionGetPagesIdAnswer = \{/);
  assert.doesNotMatch(text, /NotionPatchPagesIdAnswer/, 'a call that answers with no body has no answer type');
  assert.equal(typesFile('empty', { paths: {} }).split('\n').at(-2), 'export {};');
});

test('the types file compiles with what it names, and fails on a field it lacks', { skip: !existsSync(TSC) && 'no app/node_modules: run npm ci in app/' }, t => {
  const text = typesFile('notion', fixture());
  const dir = mkdtempSync(join(tmpdir(), 'wong-types-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'notion.ts'), text);
  writeFileSync(join(dir, 'use.ts'), 'import type { NotionSearchAnswer } from "./notion.ts";\nexport const first = (body: unknown) => (body as NotionSearchAnswer).results[0]?.url;\n');
  writeFileSync(join(dir, 'wrong.ts'), 'import type { NotionSearchAnswer } from "./notion.ts";\nexport const wrong = (body: unknown) => (body as NotionSearchAnswer).results[0]?.heading;\n');
  const compile = file => spawnSync(TSC, ['--noEmit', '--strict', '--allowImportingTsExtensions', '--module', 'nodenext', '--target', 'es2022', join(dir, file)], { encoding: 'utf8' });
  const good = compile('use.ts');
  assert.equal(good.status, 0, good.stdout + good.stderr);
  const bad = compile('wrong.ts');
  assert.notEqual(bad.status, 0); assert.match(bad.stdout, /Property 'heading' does not exist/);
});
