// The store contract against the stand-in and against WongStack's D1 store, and one trip over the wire.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { checkStore } from '../../.agents/plugins/memory/store/contract.mjs';
import { httpStore } from '../../.agents/plugins/memory/store/interface.mjs';
import { openStore } from '../../.agents/plugins/memory/scripts/lib/store.mjs';
import { d1Store, handleMemory } from '../../.agents/memory/d1/store.mjs';
import { d1Binding } from './fixtures/memory/harness.mjs';
import { standInStore } from './fixtures/memory/stand-in-store.mjs';

const MIGRATIONS = new URL('../../.agents/memory/d1/migrations/', import.meta.url);
const opened = [];
after(() => { for (const db of opened) db.close(); });

// A migrated in-memory D1 and an R2 bucket of plain bytes, closed when the file ends.
function d1Backend() {
  const db = new DatabaseSync(':memory:');
  opened.push(db);
  for (const file of readdirSync(MIGRATIONS).filter(name => name.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
  const objects = new Map();
  const bucket = { get: async key => objects.has(key) ? { body: objects.get(key) } : null, put: async (key, value) => { objects.set(key, new Uint8Array(value)); } };
  const binding = d1Binding(db);
  return { binding, bucket, as: caller => d1Store(binding, bucket, caller) };
}

checkStore(standInStore, 'stand-in store');
checkStore(d1Backend, 'D1 store');

test('the wire carries each call to the store and its refusals back', async t => {
  const { binding, bucket } = d1Backend();
  const env = { MEMORY_DB: binding, MEMORY_BUCKET: bucket };
  // The app's sign-in, faked: the caller rides in a test header.
  const signedIn = async request => JSON.parse(request.headers.get('x-test-caller') || 'null');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => handleMemory(new Request(url, init), env, signedIn);
  t.after(() => { globalThis.fetch = realFetch; });
  const ana = { role: 'member', subject: 'ana', email: 'ana@example.com' };
  const store = httpStore({ url: 'http://memory.test/_memory', headers: () => ({ 'x-test-caller': JSON.stringify(ana) }) });

  assert.deepEqual(await store.caller(), ana);
  assert.equal(store.role, 'member');
  const session = { id: 'claude:0a0a-0001', agent: 'claude', status: 'captured' };
  const { ids } = await store.write({ session, source: 'save', slug: 'demo', facts: [{ type: 'project', body: 'Sent over the wire.' }] });
  assert.deepEqual((await store.facts([{ ids }]))[0].map(fact => fact.sources), [['session:claude:0a0a-0001']]);
  const bytes = new TextEncoder().encode('{"type":"user"}\n');
  assert.equal(typeof (await store.putTranscript({ sessionId: session.id, agent: 'claude' }, bytes)).key, 'string');
  assert.deepEqual([...await store.transcript({ factId: ids[0] })], [...bytes]);
  await assert.rejects(store.defineTag({ name: 'ci', definition: 'CI.' }), { kind: 'forbidden' });
  await assert.rejects(httpStore({ url: 'http://memory.test/_memory' }).caller(), { kind: 'auth' });
  const unknown = await fetch('http://memory.test/_memory/v2/drop', { method: 'POST', headers: { 'x-test-caller': JSON.stringify(ana) }, body: '{}' });
  assert.equal(unknown.status, 404);
  assert.equal((await fetch('http://memory.test/_memory/query', { method: 'POST', body: '{}' })).status, 404, 'only /v2/ answers');
});

test('a profile that gives only a url and headers gets the plugin\'s own client', async t => {
  const root = mkdtempSync(join(tmpdir(), 'memory-profile-'));
  const ana = { role: 'member', subject: 'ana', email: 'ana@example.com' };
  mkdirSync(join(root, '.agents', 'memory'), { recursive: true });
  writeFileSync(join(root, '.agents', 'memory', 'profile.mjs'), `export default { connect: () => ({ url: 'http://memory.test/_memory',
    headers: () => ({ 'x-test-caller': ${JSON.stringify(JSON.stringify(ana))} }) }) };\n`);
  const { binding, bucket } = d1Backend();
  const realFetch = globalThis.fetch, profile = process.env.WONG_MEMORY_PROFILE;
  delete process.env.WONG_MEMORY_PROFILE;
  globalThis.fetch = async (url, init) => handleMemory(new Request(url, init), { MEMORY_DB: binding, MEMORY_BUCKET: bucket },
    async request => JSON.parse(request.headers.get('x-test-caller') || 'null'));
  t.after(() => {
    globalThis.fetch = realFetch;
    if (profile !== undefined) process.env.WONG_MEMORY_PROFILE = profile;
    rmSync(root, { recursive: true, force: true });
  });
  const store = await openStore({ root, stateDir: join(root, 'state') });
  assert.deepEqual(await store.caller(), ana);
  assert.equal(store.role, 'member');
});
