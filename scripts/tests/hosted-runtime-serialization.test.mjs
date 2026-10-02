import test from 'node:test';
import assert from 'node:assert/strict';
import { ProjectOperations } from '../../server/hosted/serialization.mjs';
import { ProjectService } from '../../server/hosted/service.mjs';
import { fixture, passing, config, sha, ref, projectId, versionId } from './hosted-runtime-fixture.mjs';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function clock() {
  const timers = new Map(); let id = 0;
  return {
    setTimer(callback, ms) { timers.set(++id, { callback, ms }); return id; },
    clearTimer(key) { timers.delete(key); },
    expire() { for (const [key, timer] of [...timers]) { timers.delete(key); timer.callback(); } },
    timers,
  };
}
function storedService(f, extraEnv = {}) {
  let state = structuredClone(f.state); const loads = [];
  const ctx = { storage: {
    get: async () => { loads.push(structuredClone(state)); return structuredClone(state); },
    put: async (_key, value) => { state = structuredClone(value); },
    setAlarm: async () => {},
  } };
  return {
    loads, read: () => structuredClone(state),
    create() {
      const service = new ProjectService(ctx, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'private', ...extraEnv });
      service.provider = f.provider; return service;
    },
  };
}

test('queued operations preserve FIFO across asynchronous provider work and release after rejection', async () => {
  const queue = new ProjectOperations(); const gate = deferred(), started = deferred(); const order = [];
  const first = queue.run(async () => { order.push('first'); started.resolve(); await gate.promise; throw new Error('provider response lost'); });
  const rejected = assert.rejects(first, /response lost/);
  await started.promise;
  const second = queue.run(() => { order.push('second'); return 'receipt'; });
  const third = queue.run(() => { order.push('third'); throw new Error('synchronous failure'); });
  const thirdRejected = assert.rejects(third, /synchronous failure/);
  assert.deepEqual(order, ['first']); gate.resolve();
  await rejected; assert.equal(await second, 'receipt'); await thirdRejected;
  assert.equal(await queue.run(() => 'released'), 'released');
  assert.deepEqual(order, ['first', 'second', 'third']);
});

test('finite admission and wait expiry reject safely without starting expired provider writes', async () => {
  const timer = clock(); const queue = new ProjectOperations({ maxPending: 2, maxWaitMs: 30000, ...timer });
  const gate = deferred(), started = deferred(); let writes = 0;
  const active = queue.run(async () => { started.resolve(); await gate.promise; return 'active receipt'; });
  await started.promise;
  const expired = queue.run(() => { writes++; });
  const expiry = assert.rejects(expired, error => error.status === 503);
  assert.equal([...timer.timers.values()][0].ms, 30000);
  await assert.rejects(queue.run(() => { writes++; }), error => error.status === 503);
  timer.expire(); await expiry;
  // Expiring a waiter must not release the in-flight operation, even if a new
  // request arrives after the active provider call has exceeded the wait bound.
  const replacement = queue.run(() => { writes++; return 'replacement'; });
  assert.equal(writes, 0); gate.resolve();
  assert.equal(await active, 'active receipt'); assert.equal(await replacement, 'replacement');
  assert.equal(writes, 1); assert.equal(timer.timers.size, 0);
});

test('failed publication leaves its durable reservation visible to the next request', async () => {
  const f = await fixture(); await passing(f);
  const approval = await f.controller.approve(f.owner, { sha, ref });
  const stored = storedService(f); const queue = new ProjectOperations();
  const gate = deferred(), reserved = deferred();
  const first = queue.run(async () => {
    const service = stored.create(); await service.load();
    await service.controller.beginPublication(await service.controller.actor(f.handoff.token), approval.id);
    reserved.resolve(); await gate.promise; throw new Error('deployment acknowledgment lost');
  });
  const failed = assert.rejects(first, /acknowledgment lost/);
  await reserved.promise;
  const second = queue.run(async () => {
    const service = stored.create(); await service.load();
    return service.controller.beginPublication(await service.controller.actor(f.handoff.token), approval.id);
  });
  const refused = assert.rejects(second, /approval|reservation/);
  assert.equal(stored.loads.length, 1);
  assert.equal(stored.read().publication.status, 'reserved');
  gate.resolve(); await failed; await refused;
  assert.equal(stored.loads.length, 2);
  assert.equal(stored.read().publication.sha, sha);
  assert.equal(stored.read().approvals[approval.id].status, 'publishing');
});

test('internal start, alarm and pass share serialized latest-state reads', async () => {
  const f = await fixture(); await f.controller.candidate({ sha, ref });
  const c = f.controller.getCandidate(sha, ref);
  c.bundleDigest = 'd'.repeat(64); c.uploadKey = `${projectId}/bundles/${sha}/${c.bundleDigest}`;
  const gate = deferred(), checkingHead = deferred();
  f.provider.head = async () => { checkingHead.resolve(); await gate.promise; return sha; };
  const stored = storedService(f, { CI_WORKFLOW: { get: async () => ({ status: async () => ({ status: 'running' }) }) } });
  const queue = new ProjectOperations();
  const request = (operation, body) => new Request(`https://project/internal/${operation}`, { method: 'POST', body: JSON.stringify(body) });
  const start = queue.run(() => stored.create().dispatch(request('start', { sha, ref, workflow: 'job' })));
  await checkingHead.promise;
  const alarm = queue.run(() => stored.create().recover());
  const passed = queue.run(() => stored.create().dispatch(request('passed', { sha, ref, result: { sha, projectId, digest: c.bundleDigest, exitCode: 0, version: versionId, url: 'https://private-preview.workers.dev' } })));
  assert.equal(stored.loads.length, 1); assert(!stored.read().active);
  gate.resolve(); await start; await alarm;
  assert.equal((await passed).status, 'passed');
  assert.equal(stored.loads.length, 3);
  assert.equal(stored.loads[1].active, `${ref}:${sha}`);
  assert.equal(stored.read().active, null);
  assert.equal(stored.read().candidates[`${ref}:${sha}`].checks, 'PASS');
});
