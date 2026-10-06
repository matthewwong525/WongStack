// The routine runner's management API and its clock (scripts/routine-runner/routines.mjs), wired as
// worker.mjs wires them but on stand-ins, and the Worker's config template, pins and exports.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GATEWAY } from '../routine-runner/models.mjs';
import { API_VERSION, authorized, manage, notFound, tick } from '../routine-runner/routines.mjs';
import { PINS, missing } from '../routine-runner/run.mjs';
import { AI_RUN_TOKEN, CONFIG, KIMI, PICKED, ROUTINES_KEY, clock, fakeModels, installed, list, routineInput } from './fixtures/routine-runner.mjs';

const folder = new URL('../routine-runner/', import.meta.url);
const read = (name) => readFileSync(new URL(name, folder), 'utf8');
const template = () => JSON.parse(read('wrangler.template.jsonc').replace(/^\/\/.*\n/gm, ''));
const pkg = (name = '../routine-runner/') => JSON.parse(readFileSync(new URL('package.json', new URL(name, import.meta.url)), 'utf8'));

/**
 * The API as the Durable Object serves it: the real router and list, the Worker's secrets in `env`,
 * and a stand-in for pi-ai. `picked: false` leaves the install with no model chosen.
 */
async function runner({ env = installed(), config = {}, time = clock(), models = fakeModels(), picked = true } = {}) {
  const { routines, storage } = list(time);
  if (picked) await routines.choose({ via: 'cloudflare', model: KIMI });
  const wired = { ...CONFIG, ...config };
  const state = { env: { ...env }, started: [], alarms: [] };
  const deps = {
    key: ROUTINES_KEY, routines, models,
    ready: (choice) => missing(state.env, wired, choice),
    start: async (routine, runId) => void state.started.push({ id: routine.id, runId }),
    setAlarm: async (at) => void state.alarms.push(at),
    about: { route: wired.route },
  };
  const call = async (method, path, body, key = ROUTINES_KEY) => {
    const init = { method, headers: key ? { Authorization: `Bearer ${key}` } : {} };
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    const response = await manage(new Request(`https://demo-routines.ada.workers.dev${path}`, init), deps);
    const text = await response.text();
    return { status: response.status, text, data: text ? JSON.parse(text) : null };
  };
  return { call, state, routines, storage, time, deps, models };
}

const iso = (ms) => new Date(ms).toISOString();

test('a request without the key gets the same 404 as an unknown path, and learns nothing', async () => {
  const { call, state, models } = await runner();
  await call('POST', '/routines', routineInput());
  const unknown = await call('GET', '/nothing-here');
  assert.deepEqual([unknown.status, unknown.text], [404, '']);
  const attempts = [
    ['GET', '/routines', undefined, null], ['GET', '/routines', undefined, 'wrong-key'], ['GET', '/status', undefined, null],
    ['POST', '/routines', routineInput({ name: 'intruder' }), 'wrong-key'], ['DELETE', '/routines/a1000000', undefined, `${ROUTINES_KEY}x`],
    ['GET', '/routines/a1000000/logs', undefined, ''], ['GET', '/', undefined, ROUTINES_KEY], ['PUT', '/routines', undefined, ROUTINES_KEY],
    ['GET', '/routines/a1000000/logs/more', undefined, ROUTINES_KEY], ['POST', '/routines/a1000000/explode', undefined, ROUTINES_KEY],
    ['GET', '/models', undefined, null], ['GET', '/model', undefined, 'wrong-key'], ['POST', '/model', { via: 'cloudflare', model: 'claude-sonnet-5' }, 'wrong-key'],
    ['POST', '/model/test', { key: 'sk-stolen', candidates: [{ provider: 'openai', model: 'gpt-5.5' }] }, null], ['DELETE', '/model/key', undefined, `${ROUTINES_KEY}x`],
  ];
  for (const [method, path, body, key] of attempts) assert.deepEqual(await call(method, path, body, key), unknown, `${method} ${path} with ${key}`);
  assert.equal((await call('GET', '/routines')).data.routines.length, 1, 'nothing was changed by a caller without the key');
  assert.equal(state.started.length, 0);
  assert.deepEqual(models.tested, [], 'no model was asked anything for a caller without the key');
  assert.deepEqual((await call('GET', '/model')).data.model, PICKED, 'and the model in use is the one it was');
  const plain = notFound();
  assert.deepEqual([plain.status, await plain.text(), [...plain.headers]], [404, '', []]);
});

test('the key is compared whole, and a missing key on either side is never a match', async () => {
  const request = (header) => new Request('https://x/', { headers: header ? { Authorization: header } : {} });
  assert.equal(await authorized(request(`Bearer ${ROUTINES_KEY}`), ROUTINES_KEY), true);
  for (const header of [null, ROUTINES_KEY, `Basic ${ROUTINES_KEY}`, `Bearer ${ROUTINES_KEY.slice(0, -1)}`, `Bearer ${ROUTINES_KEY}x`, 'Bearer ']) {
    assert.equal(await authorized(request(header), ROUTINES_KEY), false, String(header));
  }
  for (const key of [undefined, '']) assert.equal(await authorized(request('Bearer undefined'), key), false, 'a runner with no key answers nobody');
});

test('creating a routine sets the alarm for its next run, and the clock then starts it and sets the next alarm', async () => {
  const { call, state, routines, time, deps } = await runner();
  const made = await call('POST', '/routines', routineInput());
  assert.equal(made.status, 200);
  assert.deepEqual([made.data.ok, made.data.version, made.data.routine.id, made.data.routine.nextRunAt], [true, API_VERSION, 'a1000000', '2026-10-05T09:00:00.000Z']);
  assert.deepEqual(state.alarms.map(iso), ['2026-10-05T09:00:00.000Z']);

  time.set(Date.parse('2026-10-05T09:00:00Z'));
  const next = await tick(routines, deps);
  await deps.setAlarm(next);
  assert.deepEqual(state.started.map((run) => run.id), ['a1000000'], 'the due run started');
  assert.deepEqual(state.alarms.map(iso).at(-1), '2026-10-06T09:00:00.000Z');
  const listed = (await call('GET', '/routines')).data.routines;
  assert.deepEqual([listed[0].running, listed[0].nextRunAt, listed[0].lastRun], [true, '2026-10-06T09:00:00.000Z', null]);
});

test('with no model picked nothing is created and the shortlist comes back; a routine whose model is gone starts no run', async () => {
  const { call, state, routines, time, deps, storage } = await runner({ picked: false });
  const refused = await call('POST', '/routines', routineInput());
  assert.deepEqual([refused.status, refused.data.ok, refused.data.code, refused.data.needs, refused.data.shortlist.length, refused.data.shortlist[0].recommended], [409, false, 'needs', 'model', 3, true]);
  assert.deepEqual((await call('GET', '/routines')).data.routines, []);
  assert.deepEqual(state.alarms, []);

  assert.equal((await call('POST', '/model', { via: 'cloudflare', model: KIMI })).status, 200);
  assert.equal((await call('POST', '/routines', routineInput())).status, 200);
  await storage.delete('model');
  time.set(Date.parse('2026-10-05T09:00:00Z'));
  await tick(routines, deps);
  const manual = await call('POST', '/routines/improve%20demo/run');
  assert.deepEqual(manual.data.run, { started: false, reason: 'needs-model' });
  assert.deepEqual(state.started, [], 'no computer starts without a model');
  const [shown] = (await call('GET', '/routines')).data.routines;
  assert.deepEqual([shown.running, shown.lastRun.status], [false, 'needs-model']);
  assert.match(shown.lastRun.note, /Pick one/);
});

test('a model in use with nothing to reach it refuses a create by name', async () => {
  const keyless = await runner({ picked: false });
  await keyless.routines.choose({ via: 'key', provider: 'zai', model: 'glm-5.3' });
  const refused = await keyless.call('POST', '/routines', routineInput());
  assert.deepEqual([refused.status, refused.data.needs, refused.data.shortlist], [409, 'model-key', undefined]);
  keyless.state.env.MODEL_KEY = 'pasted-model-key-secret';
  assert.equal((await keyless.call('POST', '/routines', routineInput())).status, 200);
  const tokenless = await runner({ env: {} });
  assert.equal((await tokenless.call('POST', '/routines', routineInput())).data.needs, 'model-key', 'a Cloudflare pick needs the model-only token setup stores');
});

test('a GitHub install with no project key refuses a create by name, and starts no computer for a routine made before it went', async () => {
  const { call } = await runner({ config: { route: 'github' } });
  const refused = await call('POST', '/routines', routineInput());
  assert.deepEqual([refused.status, refused.data.needs], [409, 'project-access']);
  const open = await runner({ config: { route: 'github' }, env: installed({ GITHUB_TOKEN: 'github_pat_secret' }) });
  assert.equal((await open.call('POST', '/routines', routineInput())).status, 200);
  delete open.state.env.GITHUB_TOKEN;
  open.time.set(Date.parse('2026-10-05T09:00:00Z'));
  await open.deps.setAlarm(await tick(open.routines, open.deps));
  assert.deepEqual(open.state.started, [], 'no computer starts without project access');
  const [shown] = (await open.call('GET', '/routines')).data.routines;
  assert.deepEqual([shown.running, shown.lastRun.status], [false, 'needs-project-access']);
  assert.equal(new Date(open.state.alarms.at(-1)).toISOString(), '2026-10-06T09:00:00.000Z', 'the clock still moves on to the next run');
});

test('a key test asks the service once per candidate and stores nothing: no model, no key, no routine', async () => {
  const key = 'sk-pasted-model-key-secret';
  const models = fakeModels({ accepts: ({ provider }) => provider === 'openai' });
  const { call, storage, state } = await runner({ models });
  const before = JSON.stringify([...storage.map]);
  const accepted = await call('POST', '/model/test', { key, candidates: [{ provider: 'openai', model: 'gpt-5.5' }, { provider: 'deepseek', model: 'deepseek-v4-pro' }] });
  assert.deepEqual([accepted.status, accepted.data.accepted, accepted.data.refusals], [200, { provider: 'openai', model: 'gpt-5.5' }, []]);
  const refused = await call('POST', '/model/test', { key, candidates: [{ provider: 'deepseek', model: 'deepseek-v4-pro' }] });
  assert.deepEqual([refused.data.accepted, refused.data.refusals], [null, [{ provider: 'deepseek', model: 'deepseek-v4-pro', status: 401 }]]);
  assert.equal(JSON.stringify([...storage.map]), before, 'the list holds what it held');
  assert.deepEqual((await call('GET', '/model')).data.model, PICKED, 'the model in use is the one it was');
  assert.equal(JSON.stringify(state.env).includes(key), false, 'the key is in no Worker secret');
  for (const answer of [accepted, refused]) assert.equal(answer.text.includes(key), false);
  assert.deepEqual(models.tested.map((each) => each.provider), ['openai', 'deepseek']);

  const pick = await call('POST', '/model/test', { model: 'claude-sonnet-5' });
  assert.deepEqual(models.tested.at(-1), { provider: GATEWAY, model: 'claude-sonnet-5', key: null });
  assert.equal(pick.data.accepted, null);
  assert.equal(JSON.stringify([...storage.map]), before);
});

test('a routine is listed, changed, paused, resumed, run now, read, and deleted by name or id', async () => {
  const { call, state, routines } = await runner();
  await call('POST', '/routines', routineInput());
  const status = await call('GET', '/status');
  assert.deepEqual(status.data, { version: API_VERSION, ok: true, route: 'artifacts', routines: 1, model: PICKED });

  const changed = await call('PATCH', '/routines/improve%20demo', { cron: '30 14 * * *', timezone: 'America/Toronto' });
  assert.deepEqual([changed.data.action, changed.data.routine.cadence, changed.data.routine.nextRunAt], ['change', '30 14 * * * (America/Toronto)', '2026-10-05T18:30:00.000Z']);
  const paused = await call('POST', '/routines/a1000000/pause');
  assert.deepEqual([paused.data.action, paused.data.routine.status, paused.data.routine.nextRunAt], ['pause', 'paused', null]);
  assert.equal(state.alarms.at(-1), null, 'with nothing active the alarm is cleared');
  const resumed = await call('POST', '/routines/a1/resume');
  assert.deepEqual([resumed.data.action, resumed.data.routine.status], ['resume', 'active']);
  assert.equal(iso(state.alarms.at(-1)), '2026-10-05T18:30:00.000Z');
  assert.equal((await call('GET', '/routines/a1000000')).data.routine.name, 'improve demo');

  const ran = await call('POST', '/routines/a1000000/run');
  assert.deepEqual([ran.data.action, ran.data.run.started, ran.data.routine.running], ['run', true, true]);
  assert.deepEqual(state.started, [{ id: 'a1000000', runId: ran.data.run.runId }]);
  const again = await call('POST', '/routines/a1000000/run');
  assert.deepEqual(again.data.run, { started: false, reason: 'running' }, 'a routine never runs twice at once');
  await routines.finish('a1000000', ran.data.run.runId, { status: 'ok', exitCode: 0, durationMs: 1000, log: 'shipped one fix\n' });
  const logs = await call('GET', '/routines/improve%20demo/logs');
  assert.deepEqual([logs.data.action, logs.data.routine, logs.data.log, logs.data.results.map((result) => result.status)], ['logs', { id: 'a1000000', name: 'improve demo' }, 'shipped one fix', ['skipped', 'ok']]);

  const deleted = await call('DELETE', '/routines/improve%20demo');
  assert.deepEqual([deleted.data.action, deleted.data.routine], ['delete', { id: 'a1000000', name: 'improve demo' }]);
  assert.deepEqual((await call('GET', '/routines')).data.routines, []);
  assert.equal(state.alarms.at(-1), null);
});

test('a refused request changes nothing and says why in one shape', async () => {
  const { call, storage } = await runner();
  await call('POST', '/routines', routineInput({ name: 'first' }));
  await call('POST', '/routines', routineInput({ name: 'second' }));
  const before = JSON.stringify([...storage.map]);
  const ambiguous = await call('POST', '/routines/a/pause');
  assert.deepEqual([ambiguous.status, ambiguous.data.ok, ambiguous.data.code, ambiguous.data.matches], [400, false, 'ambiguous', [{ id: 'a1000000', name: 'first' }, { id: 'a2000000', name: 'second' }]]);
  const none = await call('DELETE', '/routines/monthly');
  assert.deepEqual([none.status, none.data.code, none.data.error], [400, 'no-match', 'No routine matches "monthly".']);
  for (const body of ['not json', '[]', '"text"']) {
    const bad = await call('POST', '/routines', body);
    assert.deepEqual([bad.status, bad.data.code, bad.data.error], [400, 'input', 'The request is not a JSON object.'], body);
  }
  assert.equal((await call('PATCH', '/routines/first', {})).data.error, 'Nothing to change. Give a new time, timezone, or prompt.');
  assert.equal((await call('POST', '/routines', routineInput({ name: 'third', cron: 'soon' }))).data.field, 'field count (1, expected 5)');
  assert.equal((await call('POST', '/routines', { name: 'no prompt' })).status, 400);
  assert.equal((await call('GET', '/routines/%E0%A4%A')).data.error, 'The routine\'s name is not readable.');
  assert.equal(JSON.stringify([...storage.map]), before);
});

test('no answer carries a key\'s value', async () => {
  const secret = 'sk-ant-oat-subscription-secret';
  const { call, routines } = await runner({ env: installed({ MODEL_KEY: secret, RUN_STRIPE_KEY: 'sk_live_stripe-secret', MEMORY_TOKEN: 'wongm_memory-secret' }) });
  await routines.choose({ via: 'key', provider: 'anthropic', model: 'claude-sonnet-5' });
  await call('POST', '/routines', routineInput({ keys: ['STRIPE_KEY'] }));
  const { runId } = await routines.begin('a1000000');
  await routines.finish('a1000000', runId, { status: 'ok', log: 'done' });
  const answers = [];
  for (const [method, path] of [['GET', '/status'], ['GET', '/routines'], ['GET', '/routines/a1000000'], ['GET', '/routines/a1000000/logs'], ['POST', '/routines/a1000000/pause'], ['GET', '/models'], ['GET', '/model'], ['DELETE', '/model/key']]) answers.push((await call(method, path)).text);
  answers.push((await call('POST', '/model/test', { key: secret, candidates: [{ provider: 'anthropic', model: 'claude-sonnet-5' }] })).text);
  for (const value of [secret, 'sk_live_stripe-secret', 'wongm_memory-secret', ROUTINES_KEY, AI_RUN_TOKEN]) assert.equal(answers.join('\n').includes(value), false, value);
  assert.ok(answers[1].includes('"keys":["STRIPE_KEY"]'), 'a named key is shown by name');
});

// ---------------------------------------------------------------------------
// The Worker and its config

test('the template names one Worker with the list, the run, and a two-at-once stock computer', () => {
  const config = template();
  const sdk = pkg().dependencies['@cloudflare/sandbox'];
  assert.deepEqual([config.name, config.account_id, config.main, config.workers_dev, config.preview_urls], ['<runner>', '<account id>', 'worker.mjs', true, false]);
  assert.deepEqual(config.containers, [{ name: '<runner>', class_name: 'RoutineSandbox', image: `docker.io/cloudflare/sandbox:${sdk}`, max_instances: 2, instance_type: 'standard-4' }]);
  assert.deepEqual(config.durable_objects.bindings, [{ name: 'SANDBOX', class_name: 'RoutineSandbox' }, { name: 'ROUTINES', class_name: 'Routines' }]);
  assert.deepEqual(config.migrations, [{ tag: 'v1', new_sqlite_classes: ['RoutineSandbox', 'Routines'] }]);
  assert.deepEqual(config.workflows, [{ name: '<runner>', binding: 'RUN', class_name: 'Run' }]);
  assert.deepEqual(config.artifacts, [{ binding: 'ARTIFACTS', namespace: '<namespace>' }]);
  assert.deepEqual(JSON.parse(config.vars.WONG_ROUTINES), { account: '<account id>', route: '<route>', remote: '<remote>', repo: '<repo>', gateway: '<runner>' });
  assert.deepEqual(Object.keys(config.vars), ['WONG_ROUTINES'], 'every key is a secret set after the deploy, never a var in this file');
  assert.equal(config.triggers, undefined, 'the clock is the list\'s own alarm, not a fixed trigger');
  assert.equal(read('wrangler.template.jsonc').match(/^.*"artifacts":.*\n/m).length, 1, 'the Artifacts binding sits on one line a GitHub install drops');
});

test('the Worker exports every class its config names, and holds no Cloudflare user or publishing token', () => {
  const config = template();
  const worker = read('worker.mjs');
  const named = [config.workflows[0].class_name, config.containers[0].class_name, ...config.durable_objects.bindings.map((binding) => binding.class_name)];
  assert.deepEqual([...new Set(named)].sort(), ['RoutineSandbox', 'Routines', 'Run']);
  for (const name of new Set(named)) assert.match(worker, new RegExp(`^export class ${name}\\b`, 'm'), name);
  assert.match(worker, /^export default\b/m);
  for (const module of ['routines.mjs', 'run.mjs', 'models.mjs']) assert.ok(worker.includes(`from './${module}'`), module);
  for (const file of ['worker.mjs', 'run.mjs', 'routines.mjs', 'models.mjs', 'schedule.mjs']) {
    assert.doesNotMatch(read(file), /env\.(CLOUDFLARE_API_TOKEN|CF_TOKEN)\b/, `${file} reads a token a run must never reach`);
  }
  for (const file of ['run.mjs', 'routines.mjs', 'models.mjs', 'schedule.mjs']) assert.doesNotMatch(read(file), /from '(cloudflare:|@cloudflare\/|@earendil-works\/|node:)/, `${file} must run in a Worker and in the tests alike`);
});

test('the Worker tests a key through pi-ai in memory, and hands a run this folder\'s own locked tools', () => {
  const worker = read('worker.mjs');
  assert.match(worker, /import\('@earendil-works\/pi-ai\/providers\/all'\)/, 'pi-ai loads on a model request, never when the clock rings');
  assert.doesNotMatch(worker, /^import .* from '@earendil-works\//m);
  assert.match(worker, /models: \{ catalog: gatewayModels, test: \(candidate\) => testModel\(candidate, this\.env\) \}/);
  assert.doesNotMatch(worker, /storage\.put\([^)]*key/i, 'a tested key is never written to storage');
  assert.doesNotMatch(worker, /console\./, 'nothing is logged, so no key reaches a log');
  for (const file of ['package.json', 'package-lock.json']) assert.ok(worker.includes(`from './tools/${file}' with { type: 'json' }`), file);
  assert.match(worker, /tools: TOOLS/);
});

test('the runner\'s tools are pinned to exact versions, the lockfile locks the same ones, and both runners share them', () => {
  const { dependencies, devDependencies } = pkg();
  const pins = { '@cloudflare/sandbox': dependencies['@cloudflare/sandbox'], wrangler: devDependencies.wrangler };
  assert.deepEqual(Object.keys(dependencies), ['@cloudflare/sandbox', '@earendil-works/pi-ai']);
  assert.match(dependencies['@earendil-works/pi-ai'], /^\d+\.\d+\.\d+$/);
  assert.equal(`@earendil-works/pi-coding-agent@${dependencies['@earendil-works/pi-ai']}`, PINS.pi, 'the Worker tests a key with the same pi-ai the assistant runs on');
  const lock = JSON.parse(read('package-lock.json'));
  for (const [name, version] of Object.entries({ ...pins, '@earendil-works/pi-ai': dependencies['@earendil-works/pi-ai'] })) {
    assert.match(String(version), /^\d+\.\d+\.\d+$/, `${name} is not pinned to one exact version`);
    assert.equal(lock.packages[`node_modules/${name}`]?.version, version, `the lockfile locks another ${name}`);
  }
  assert.deepEqual(lock.packages[''].dependencies, dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, devDependencies);
  const sandboxes = Object.keys(lock.packages).filter((key) => key.endsWith('node_modules/@cloudflare/sandbox'));
  assert.deepEqual(sandboxes, ['node_modules/@cloudflare/sandbox'], 'a second copy of the Sandbox SDK would not match the image');
  const checks = pkg('../check-runner/');
  assert.deepEqual(pins, { '@cloudflare/sandbox': checks.dependencies['@cloudflare/sandbox'], wrangler: checks.devDependencies.wrangler }, 'the two runners moved apart: update both together');
});
