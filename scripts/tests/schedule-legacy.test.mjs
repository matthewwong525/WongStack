import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyAdapter, legacyPromptStatus, teardownLegacy } from '../../.agents/skills/schedule/scripts/lib/legacy.mjs';
const context = { installed: { url: 'https://legacy.example.test', accountId: 'synthetic-account', worker: 'synthetic-routines', gateway: 'synthetic-routines', containerId: 'owned-container' }, keys: { WONG_ROUTINES_KEY: 'private-management', CLOUDFLARE_API_TOKEN: 'private-provision' } };
function service() {
  let rows = [{ id: 'old-1', status: 'active' }, { id: 'other-2', status: 'active' }], lost = false;
  const calls = [];
  const fetch = async (url, init) => {
    const route = new URL(url).pathname; calls.push([init.method, route]);
    if (route === '/routines') return Response.json({ ok: true, version: 1, routines: rows });
    const id = route.split('/')[2], row = rows.find(each => each.id === id);
    if (init.method === 'POST') row.status = route.endsWith('/pause') ? 'paused' : 'active';
    if (init.method === 'DELETE') rows = rows.filter(each => each.id !== id);
    if (lost && init.method !== 'GET') throw Error('lost response');
    return Response.json({ ok: true, version: 1, routine: row });
  };
  return { fetch, calls, get rows() { return rows; }, lose() { lost = true; }, empty() { rows = []; } };
}
test('installed legacy list/inspect/pause/resume/cancel preserves every unrelated job and secret', async () => {
  const fake = service(), adapter = legacyAdapter(context, fake);
  assert.equal((await adapter.list()).length, 2); assert.equal((await adapter.inspect('old-1')).id, 'old-1');
  assert.equal((await adapter.pause('old-1')).outcome, 'verified'); assert.equal((await adapter.resume('old-1')).outcome, 'verified');
  fake.lose(); assert.equal((await adapter.cancel('old-1')).outcome, 'verified'); assert.deepEqual(fake.rows, [{ id: 'other-2', status: 'active' }]);
  assert.equal(Object.hasOwn(adapter, 'create'), false); assert.equal(Object.hasOwn(adapter, 'setup'), false);
  assert.equal(context.keys.WONG_ROUTINES_KEY, 'private-management');
});
test('legacy failures disclose no keys and changed identity/receipt is rejected', async () => {
  assert.throws(() => legacyAdapter({}), /retired/);
  await assert.rejects(legacyAdapter(context, { fetch: async () => { throw Error('private-management'); } }).list(), /unavailable/);
  await assert.rejects(legacyAdapter(context, { fetch: async () => Response.json({ ok: true, version: 99 }) }).list(), /contract/);
  await assert.rejects(legacyAdapter(context, { fetch: async () => Response.json({ ok: true, version: 1, routine: { id: 'foreign' } }) }).inspect('old-1'), /full selected/);
});
test('explicit legacy teardown requires empty jobs and removes only recorded selected resources', async () => {
  const fake = service(); await assert.rejects(teardownLegacy(context, ['worker'], fake), /jobs still/);
  await assert.rejects(teardownLegacy(context, ['unknown'], fake), /explicitly recorded/);
  await assert.rejects(teardownLegacy({ ...context, installed: { ...context.installed, containerId: undefined } }, ['container'], fake), /explicitly recorded/);
  fake.empty(); const calls = [];
  const fetch = async (url, init) => { calls.push([init.method, url]); return url.startsWith(context.installed.url) ? fake.fetch(url, init) : new Response('', { status: init.method === 'GET' ? 404 : 200 }); };
  const result = await teardownLegacy(context, ['worker', 'gateway', 'workflow', 'container'], { fetch }); assert.equal(result.complete, true); assert.equal(result.keysRetained, true);
  assert.equal(calls.filter(([method]) => method === 'DELETE').length, 4);
  const failed = await teardownLegacy(context, ['worker'], { fetch: async (url, init) => url.startsWith(context.installed.url) ? fake.fetch(url, init) : new Response('', { status: 500 }) }); assert.equal(failed.complete, false);
});
test('old improve/dream prompts retain compatibility, recursive scheduling prompts require repair', () => {
  assert.equal(legacyPromptStatus('/improve --audit-only').prompt, '/improve-code --audit-only'); assert.equal(legacyPromptStatus('/dream').prompt, '/dream-memory');
  assert.equal(legacyPromptStatus('/routine create a thing').repairRequired, true); assert.equal(legacyPromptStatus('Read news').compatible, true);
});
