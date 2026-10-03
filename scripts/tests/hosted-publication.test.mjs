import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, passing, bundle, sha, older, ref, projectId, versionId, config } from './hosted-runtime-fixture.mjs';
import { publishBundle } from '../../server/hosted/pipeline.mjs';
import { observePublicationIdentity, observationBounds } from '../../server/hosted/publication-identity.mjs';
import { HostedProvider } from '../../server/hosted/provider.mjs';
import { ProjectService } from '../../server/hosted/service.mjs';
import { ProjectController } from '../../server/hosted/project.mjs';
import { packet } from '../../server/hosted/git.mjs';

function fakeClock(onWait = () => {}) {
  let elapsed = 0, pending;
  const reads = [], waits = [];
  return {
    now: () => elapsed,
    timer: (fn, ms) => { reads.push(ms); pending = { fn, ms }; return pending; },
    cancel: token => { if (pending === token) pending = null; },
    wait: async ms => { waits.push(ms); elapsed += ms; onWait(); },
    expire: () => { const timer = pending; elapsed += timer.ms; timer.fn(); },
    elapse: ms => { elapsed += ms; },
    reads, waits,
  };
}
const identity = value => Response.json({ sha: value, projectId });
async function publication(previous = false) {
  const f = await fixture();
  if (previous) f.state.production = { sha: older, version: projectId, url: 'https://production.workers.dev' };
  const candidate = await passing(f), approval = await f.controller.approve(f.owner, { sha, ref });
  const b = await bundle(), calls = [];
  f.state.resources = [{ kind: 'worker', environment: 'production', name: 'owned-production' }, { kind: 'd1', environment: 'production', id: projectId }, { kind: 'd1', environment: 'memory', id: versionId }, { kind: 'r2', name: 'owned-memory' }];
  f.state.access = { verified: true, teamDomain: 'team.cloudflareaccess.com', audience: 'aud', appId: 'app', workers: [{ name: 'owned-production', id: '2'.repeat(32) }] };
  f.state.bootstrap = { production: { status: 'verified', target: 'owned-production', version: versionId, deployment: projectId } };
  f.provider.query = async () => { calls.push('query'); assert.equal(f.writes.at(-1).publication.status, 'reserved'); return [{ results: [] }]; };
  f.provider.assets = async () => { calls.push('assets'); return 'assets'; };
  f.provider.version = async () => { calls.push('version'); return versionId; };
  f.provider.deploy = async (target, version) => {
    calls.push('deploy'); assert.equal(target, 'owned-production'); assert.equal(version, versionId);
    assert.equal(f.writes.at(-1).publication.status, 'reserved'); return projectId;
  };
  f.provider.routing = async (target, version, readOnly) => {
    calls.push(readOnly ? 'routing-read' : 'routing-setup');
    if (readOnly) {
      assert.equal(target, 'owned-production'); assert.equal(version, undefined);
      assert.deepEqual(f.writes.at(-1).publication, f.state.publication);
      assert.equal(f.state.publication.status, 'deployed-awaiting-identity');
      assert.equal(f.state.publication.deployment, projectId);
      assert.equal(f.state.publication.version, versionId);
      assert.equal(f.state.publication.target, target);
    }
    return 'https://production.workers.dev';
  };
  let main = older;
  f.provider.mainHead = async () => main;
  f.provider.fetcher = async (_url, input) => {
    assert.equal(f.writes.at(-1).publication.status, 'deployed-awaiting-main');
    if (input.method === 'POST') {
      calls.push('git-write'); main = sha;
      return new Response(packet('unpack ok\n') + packet('ok refs/heads/main\n') + '0000', { headers: { 'Content-Type': 'application/x-git-receive-pack-result' } });
    }
    return new Response(packet('# service=git-receive-pack\n') + '0000' + packet(`${older} refs/heads/main\0report-status\n`) + '0000', { headers: { 'Content-Type': 'application/x-git-receive-pack-advertisement' } });
  };
  const adapters = { provider: f.provider, observationClock: fakeClock(), fetch: async () => identity(sha), loadBundle: async (commit, branch, digest) => {
    assert.equal(commit, sha); assert.equal(branch, ref); assert.equal(digest, candidate.bundleDigest);
    calls.push('load'); return { bundle: b, state: f.state };
  } };
  return { ...f, candidate, approval, adapters, calls, publish: () => publishBundle(f.controller, f.owner, approval.id, adapters) };
}
const mutations = calls => calls.filter(call => ['query', 'assets', 'version', 'routing-setup', 'deploy', 'git-write'].includes(call));
async function retained(f, phase = 'deployed-awaiting-identity') {
  assert.equal(f.state.publication.status, phase);
  assert.equal(f.state.publication.deployment, projectId);
  assert.equal(f.state.production?.sha || null, f.state.publication.base);
  const before = [...f.calls];
  await assert.rejects(f.publish(), /approval|reservation/);
  assert.deepEqual(f.calls, before, 'a second publication must replay no mutations or reads');
  const status = f.controller.status();
  assert.equal(status.publication.deployment, projectId);
  assert.equal(status.publication.version, versionId);
  const service = new ProjectService({ storage: { get: async () => structuredClone(f.state) } }, { HOSTED_CONFIG: JSON.stringify(config), CF_TOKEN: 'secret' });
  service.state = f.state; service.controller = f.controller; service.provider = f.provider;
  f.state.stopped = true; f.state.exportVerified = true;
  await assert.rejects(service.cleanup(), /reconcile publication/);
  await assert.rejects(service.dispatch(new Request('https://project/admin/export-receipt', { method: 'POST', body: '{}' })), /reconcile|Quiesce/);
}

test('confirmed deployment is checkpointed before read-only routing and safe stale identity observations', async () => {
  for (const previous of [false, true]) {
    const f = await publication(previous); let reads = 0;
    f.adapters.fetch = async (_url, input) => {
      assert.equal(input.redirect, 'manual'); assert(input.signal instanceof AbortSignal);
      assert.equal(f.state.publication.status, 'deployed-awaiting-identity');
      return identity(++reads < 3 ? previous ? older : 'bootstrap' : sha);
    };
    const result = await f.publish();
    assert.equal(result.status, 'published'); assert.equal(result.defaultSha, sha); assert.equal(reads, 3);
    assert.equal(f.state.production.deployment, projectId); assert.equal(f.state.publication, null);
    assert.deepEqual(mutations(f.calls), ['query', 'query', 'query', 'assets', 'version', 'routing-setup', 'deploy', 'git-write']);
    assert.deepEqual(f.adapters.observationClock.waits, [5000, 5000]);
  }
});
test('bounded identity exhaustion retains the exact deployed phase and blocks cleanup/export and replay', async () => {
  const f = await publication(); let reads = 0;
  f.adapters.fetch = async () => { reads++; return identity('bootstrap'); };
  await assert.rejects(f.publish(), /observation exhausted/);
  assert.equal(reads, 12); assert.equal(f.adapters.observationClock.now(), 55000);
  assert(f.adapters.observationClock.reads.every(ms => ms === 5000));
  assert(!f.calls.includes('git-write')); await retained(f);
});
test('fetch and body timeouts abort each read and total observation including waits cannot exceed sixty seconds', async () => {
  for (const body of [false, true]) {
    const f = await publication(); let aborted = 0;
    f.adapters.fetch = async (_url, input) => {
      input.signal.addEventListener('abort', () => aborted++);
      const hang = () => { queueMicrotask(() => f.adapters.observationClock.expire()); return new Promise(() => {}); };
      return body ? { status: 200, ok: true, json: hang } : hang();
    };
    await assert.rejects(f.publish(), /observation exhausted/);
    assert.equal(aborted, 6); assert.equal(f.adapters.observationClock.now(), 60000);
    assert.equal(f.adapters.observationClock.reads.length, 6); assert(!f.calls.includes('git-write'));
    await retained(f);
  }
});
test('transport errors and server errors may wait, and exact identity at the observation deadline is refused', async () => {
  const f = await publication(); let reads = 0;
  f.adapters.fetch = async () => {
    if (++reads === 1) throw new TypeError('network failure');
    if (reads === 2) return new Response(null, { status: 503 });
    return identity(sha);
  };
  assert.equal((await f.publish()).status, 'published'); assert.equal(reads, 3);
  const g = await publication();
  g.adapters.fetch = async () => { g.adapters.observationClock.elapse(60000); return identity(sha); };
  await assert.rejects(g.publish(), /observation exhausted/); await retained(g);
});
test('early transient and permanent HTTP responses abort their reads and close unread bodies before returning', async () => {
  for (const status of [503, 403]) {
    const f = await publication(); let reads = 0, open = 0, cancelled = 0, aborted = 0;
    f.adapters.fetch = async (_url, input) => {
      if (++reads > 1) return identity(sha);
      input.signal.addEventListener('abort', () => aborted++);
      return new Response(new ReadableStream({
        start(controller) { open++; controller.enqueue(new TextEncoder().encode('unread provider response')); },
        cancel() { open--; cancelled++; },
      }), { status });
    };
    if (status === 503) assert.equal((await f.publish()).status, 'published');
    else await assert.rejects(f.publish(), /permanently denied/);
    assert.equal(open, 0); assert.equal(cancelled, 1); assert.equal(aborted, 1);
    assert.equal(reads, status === 503 ? 2 : 1);
    assert.deepEqual(f.adapters.observationClock.waits, status === 503 ? [5000] : []);
    if (status === 403) { assert(!f.calls.includes('git-write')); await retained(f); }
  }
});
test('wrong tenant, malformed identity, redirects, unexpected commits and permanent denial never wait', async () => {
  const cases = [
    () => Response.json({ sha, projectId: versionId }),
    () => Response.json({ sha: 1, projectId }),
    () => Response.json(null),
    () => new Response('invalid json'),
    () => new Response(null, { status: 302, headers: { Location: 'https://other/' } }),
    () => ({ status: 200, ok: true, redirected: true, json: async () => ({ sha, projectId }) }),
    () => identity('c'.repeat(40)),
    () => new Response(null, { status: 401 }),
    () => new Response(null, { status: 403 }),
    () => new Response(null, { status: 404 }),
    () => { throw new Error('permanent fetch failure'); },
  ];
  for (const response of cases) {
    const f = await publication(); let reads = 0;
    f.adapters.fetch = async () => { reads++; return response(); };
    await assert.rejects(f.publish()); assert.equal(reads, 1); assert.deepEqual(f.adapters.observationClock.waits, []);
    assert(!f.calls.includes('git-write')); await retained(f);
  }
});
test('an unrecorded bootstrap or previous SHA is not a permitted transition', async () => {
  for (const value of ['bootstrap', older]) {
    const f = await publication(); delete f.state.bootstrap;
    f.adapters.fetch = async () => identity(value);
    await assert.rejects(f.publish(), /unexpected commit/); await retained(f);
  }
});
test('heads and candidate guards are checked again after waiting before any default-ref write', async () => {
  for (const change of [
    f => { f.provider.head = async () => older; },
    f => { f.provider.mainHead = async () => 'c'.repeat(40); },
    f => { f.candidate.checks = 'FAIL'; },
    f => { f.candidate.bundleDigest = 'e'.repeat(64); },
    f => { f.state.approvals[f.approval.id].status = 'approved'; },
    f => { f.state.approvals[f.approval.id].digest = 'e'.repeat(64); },
    f => { assert.equal(f.owner, f.state.grants['vm-owner']); f.state.grants['vm-owner'].status = 'removed'; },
    f => { f.state.grants['vm-owner'] = { ...f.owner, status: 'removed' }; },
    f => { f.state.stopped = true; },
    f => { f.state.production = { sha: older }; },
  ]) {
    const f = await publication(); let reads = 0;
    f.adapters.observationClock = fakeClock(() => change(f));
    f.adapters.fetch = async () => identity(++reads === 1 ? 'bootstrap' : sha);
    await assert.rejects(f.publish(), /changed|Owner approval/);
    assert.equal(reads, 2); assert(!f.calls.includes('git-write'));
    assert.equal(f.state.publication.status, 'deployed-awaiting-identity');
    const before = [...f.calls]; await assert.rejects(f.publish()); assert.deepEqual(f.calls, before);
  }
});
test('a failed deployment checkpoint cannot claim a durable phase and reloaded reservations prevent mutation replay', async () => {
  for (const persisted of [false, true]) {
    const f = await publication();
    let finishes = 0;
    f.provider.fetcher = async () => assert.fail('a failed deployment checkpoint must never advance the default ref');
    f.controller.finishPublication = async () => { finishes++; assert.fail('a failed deployment checkpoint must never finish publication'); };
    const checkpoint = f.controller.a.checkpoint;
    f.controller.a.checkpoint = async value => {
      if (value.publication?.status === 'deployed-awaiting-identity') {
        if (persisted) await checkpoint(value);
        throw new Error('deployment checkpoint failed');
      }
      return checkpoint(value);
    };
    await assert.rejects(f.publish(), /checkpoint failed/);
    assert.equal(f.state.publication.status, 'deployed-awaiting-identity', 'the mutable object is not proof of persistence');
    const durable = structuredClone(f.writes.at(-1));
    assert.equal(durable.publication.status, persisted ? 'deployed-awaiting-identity' : 'reserved');
    assert.equal(durable.publication.deployment, persisted ? projectId : undefined);
    assert.equal(durable.production, null);
    assert(!f.calls.includes('routing-read')); assert.equal(f.calls.filter(call => call === 'deploy').length, 1);
    assert.equal(finishes, 0);
    const reloaded = new ProjectController(durable, f.controller.a), owner = await reloaded.actor(f.handoff.token);
    const before = [...f.calls];
    await assert.rejects(publishBundle(reloaded, owner, f.approval.id, f.adapters), /approval|reservation/);
    assert.deepEqual(f.calls, before);
  }
});
test('identity and finish checkpoint failures return no publication success and leave durable reservations', async () => {
  for (const phase of ['deployed-awaiting-main', 'published']) {
    const f = await publication(), checkpoint = f.controller.a.checkpoint;
    f.controller.a.checkpoint = async value => {
      if (phase === 'published' ? value.production?.sha === sha && !value.publication : value.publication?.status === phase) throw new Error(`${phase} checkpoint failed`);
      return checkpoint(value);
    };
    await assert.rejects(f.publish(), /checkpoint failed/);
    const durable = structuredClone(f.writes.at(-1));
    assert.equal(durable.publication.status, phase === 'published' ? 'deployed-awaiting-main' : 'deployed-awaiting-identity');
    assert.equal(durable.publication.deployment, projectId); assert.equal(durable.production, null);
    assert.equal(f.calls.includes('git-write'), phase === 'published');
    const reloaded = new ProjectController(durable, f.controller.a), owner = await reloaded.actor(f.handoff.token);
    const before = [...f.calls];
    await assert.rejects(publishBundle(reloaded, owner, f.approval.id, f.adapters), /approval|reservation/);
    assert.deepEqual(f.calls, before);
  }
});
test('routing, checkpoint, and default-ref failures preserve confirmed deployment without mutation replay', async () => {
  for (const failure of ['routing', 'routing-changed', 'checkpoint', 'default-ref']) {
    const f = await publication();
    if (failure.startsWith('routing')) {
      const routing = f.provider.routing;
      f.provider.routing = async (...args) => { const url = await routing(...args); if (!args[2]) return url; if (failure === 'routing') throw new Error('routing failed'); return 'https://other.workers.dev'; };
    } else if (failure === 'checkpoint') {
      const checkpoint = f.controller.a.checkpoint;
      f.controller.a.checkpoint = async value => { await checkpoint(value); if (value.publication?.status === 'deployed-awaiting-identity') throw new Error('checkpoint acknowledgment lost'); };
    } else f.provider.fetcher = async () => { throw new Error('default-ref failed'); };
    await assert.rejects(f.publish(), /routing|checkpoint|default-ref/);
    assert.equal(f.calls.filter(call => call === 'deploy').length, 1);
    await retained(f, failure === 'default-ref' ? 'deployed-awaiting-main' : 'deployed-awaiting-identity');
  }
});
test('publication routing observation uses only provider GETs and retains private origin validation', async () => {
  const calls = [];
  const provider = new HostedProvider(config, 'secret', async (_url, input) => {
    calls.push(input.method);
    return Response.json({ success: true, result: { subdomain: { enabled: true, previews_enabled: false, url: 'https://owned-production.team.workers.dev' } } });
  });
  assert.equal(await provider.routing('owned-production', undefined, true), 'https://owned-production.team.workers.dev');
  assert.deepEqual(calls, ['GET']);
  assert.deepEqual(observationBounds, { attempts: 12, readMs: 5000, totalMs: 60000, waitMs: 5000 });
  const clock = fakeClock();
  const state = { id: projectId, access: { clientId: 'verification-client', clientSecret: 'verification-secret' }, runtimeSecret: 'runtime-secret' };
  let reads = 0;
  await assert.rejects(observePublicationIdentity(state, { url: 'https://private.workers.dev' }, sha, async () => { reads++; return identity(older); }, clock), /unexpected/);
  assert.equal(reads, 1); assert.deepEqual(clock.waits, []);
  const missing = fakeClock();
  await assert.rejects(observePublicationIdentity({ id: projectId }, { url: 'https://private.workers.dev' }, sha, async () => { reads++; return identity(sha); }, missing), TypeError);
  assert.equal(reads, 1, 'missing local Access configuration must never issue a request');
  assert.deepEqual(missing.reads, []); assert.deepEqual(missing.waits, []);
});
