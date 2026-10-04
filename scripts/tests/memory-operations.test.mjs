import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { callMemory, memoryOperations } from '../../.agents/skills/memory/scripts/operations.mjs';
import { readArguments, READ_OPTIONS } from '../../.agents/skills/memory/scripts/lib/read-options.mjs';
import { memory, node, rows, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

test('memory contracts are deterministic, synthetic, standalone, truthful and limited to supported reads', () => {
  assert.deepEqual(memoryOperations.map(action => action.operationId), ['memory.search', 'memory.show']);
  for (const action of memoryOperations) {
    assert.equal(action.authentication, 'installed-memory-credential'); assert.equal(action.transport, 'installed-client');
    assert.equal(action.outputSchema.properties.text.maxLength, 32768); assert.equal(action.readiness, 'not_checked');
    assert.ok(action.revision.length === 64); assert.ok(!Object.hasOwn(action.inputSchema.properties, 'everyone'));
    assert.ok(!Object.hasOwn(action, 'path')); assert.equal(action.examples[0].output.truncated, false);
  }
  assert.equal(memoryOperations[0].revision, memoryOperations[1].revision);
  assert.deepEqual(READ_OPTIONS.limit, { type: 'string' });
  assert.deepEqual(readArguments('search', { terms: '--danger', all: true, limit: 5 }), ['--all', '--limit', '5', '--', '--danger']);
  assert.deepEqual(readArguments('show', { slug: 'sample', all: false }), ['--', 'sample']);
});
test('rejects input and unknown operations before context, credential or store access', async () => {
  let executed = 0;
  const options = { cwd: '/not-a-checkout', execute: async () => { executed++; } };
  for (const [id, input] of [['memory.admin', {}], ['memory.search', { sql: 'SELECT *' }], ['memory.search', { everyone: true }],
    ['memory.search', { terms: 'a'.repeat(4001) }], ['memory.search', { limit: 101 }], ['memory.search', { limit: 0 }],
    ['memory.search', { limit: 1.5 }], ['memory.search', { state: 'wrong' }], ['memory.search', { all: 'yes' }], ['memory.show', {}],
    ['memory.show', { slug: '' }], ['memory.show', { slug: 'x', command: 'rm' }], ['memory.show', null], ['memory.search', []]]) {
    await assert.rejects(callMemory(id, input, options), /Unknown|Invalid|topic/);
  }
  assert.equal(executed, 0);
});
test('the adapter exactly matches installed search/show reads without app packages or company login', async t => {
  const { repo, fake } = await setup(t);
  const saved = await memory(repo, fake, ['put-facts', '--file', writeJsonFile(repo.home, 'facts.json', { source: 'save', slug: 'shipping',
    facts: [{ action: 'add', type: 'project', body: 'Delivery uses the approved carrier.' }] })]);
  assert.equal(saved.code, 0, saved.stderr);
  const directSearch = await memory(repo, fake, ['search', 'delivery', '--limit', '5']);
  const adaptedSearch = await node(repo, fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: JSON.stringify({ terms: 'delivery', limit: 5 }) });
  assert.equal(adaptedSearch.code, 0, adaptedSearch.stderr); assert.equal(JSON.parse(adaptedSearch.stdout).text, directSearch.stdout);
  const directShow = await memory(repo, fake, ['show', 'shipping']);
  const adaptedShow = await node(repo, fake, 'operations.mjs', ['call', 'memory.show', '--file', '-'], { input: JSON.stringify({ slug: 'shipping' }) });
  assert.equal(JSON.parse(adaptedShow.stdout).text, directShow.stdout); assert.equal(JSON.parse(adaptedShow.stdout).truncated, false);
  const before = fake.calls.length;
  const describe = await node(repo, fake, 'operations.mjs', ['describe', 'memory.search']);
  assert.equal(JSON.parse(describe.stdout).source, 'memory');
  const list = await node(repo, fake, 'operations.mjs', ['list']); assert.equal(JSON.parse(list.stdout).length, 2);
  assert.equal(fake.calls.length, before, 'listing/describing makes no store request');
  const malformed = await node(repo, fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{"terms":"sk-syntheticprivatekeymaterial12345678",broken}' });
  assert.match(malformed.stderr, /Invalid JSON input/); assert.doesNotMatch(malformed.stderr, /syntheticprivatekeymaterial/);
  const rejected = await node(repo, fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{"everyone":true}' });
  assert.equal(rejected.code, 1); assert.equal(fake.calls.length, before);
  assert.equal(rows({ repo, fake }, 'SELECT count(*) AS n FROM facts')[0].n, 1, 'reads never change captured facts');
});
test('preserves memory-key redaction from the primary .env, bounds text and hides provider errors', async t => {
  const { repo, fake } = await setup(t);
  const secret = 'saved-key-secret-value'; writeFileSync(join(repo.root, '.env'), `CLOUDFLARE_MEMORY_TOKEN=${secret}\n`);
  const bounded = await callMemory('memory.search', {}, { cwd: repo.root, execute: async (_command, args, options) => {
    assert.ok(!args.join(' ').includes(secret)); assert.equal(options.maxBuffer, 1048576);
    return { stdout: `${secret}\n${'a'.repeat(40000)}`, stderr: '' };
  } });
  assert.equal(bounded.text.length, 32768); assert.equal(bounded.truncated, true); assert.ok(!bounded.text.includes(secret));
  for (const code of ['ERR_CHILD_PROCESS_STDIO_MAXBUFFER', 'network']) {
    const response = await callMemory('memory.show', { slug: 'shipping' }, { cwd: repo.root, execute: async () => { throw Object.assign(new Error(secret), { code, stderr: secret }); } });
    assert.equal(response.error.code, code === 'network' ? 'unavailable' : 'output_limit'); assert.ok(!JSON.stringify(response).includes(secret));
  }
  const before = fake.calls.length;
  const denied = await node(repo, fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{}', env: { CLOUDFLARE_MEMORY_TOKEN: 'wongm_missing.bad' } });
  assert.equal(JSON.parse(denied.stdout).error.code, 'unavailable'); assert.equal(fake.calls.length, before, 'there is no owner credential fallback');
});

test('the memory transport refuses redirects before a credential can reach another origin', async t => {
  const { repo } = await setup(t);
  const { openStore } = await import('../../.agents/skills/memory/scripts/lib/store.mjs');
  let called = 0;
  t.mock.method(globalThis, 'fetch', async (_url, init) => { called++; assert.equal(init.redirect, 'manual'); return new Response(null, { status: 302, headers: { Location: 'https://attacker.example.com' } }); });
  const ctx = { root: repo.root, primaryRoot: repo.root, machineId: repo.machineId, stateDir: repo.stateDir, author: 'dev@example.com' };
  await assert.rejects(openStore(ctx).query('SELECT id FROM facts'), /refused a redirect/); assert.equal(called, 1);
});
