// The list of routines, its clock, and the model they run on: scripts/routine-runner/routines.mjs
// over a stand-in for a Durable Object's storage.
import assert from 'node:assert/strict';
import test from 'node:test';
import { GATEWAY, SHORTLIST } from '../routine-runner/models.mjs';
import { API_VERSION, LIMITS, NEEDS, RoutineError, invalidKeyName, lastLines, launch, manage, summarize, tick } from '../routine-runner/routines.mjs';
import { CATALOG, KIMI, MAKER, PICKED, ROUTINES_KEY, START, fakeModels, list, routineInput } from './fixtures/routine-runner.mjs';

const HOUR = 60 * 60_000;
const iso = (ms) => new Date(ms).toISOString();
const refused = (code, message) => (error) => error instanceof RoutineError && error.code === code && (!message || message.test(error.message));
/** A start that records what it was asked to run, and a `ready` that lets everything through. */
function world(need = () => null) {
  const started = [];
  return { started, start: async (routine, runId) => void started.push({ id: routine.id, runId }), ready: need };
}

test('a routine is created with its next run, and shown without anything secret', async () => {
  const { routines, storage } = list();
  const made = await routines.create(routineInput({ name: '  improve demo ', keys: ['STRIPE_KEY', 'STRIPE_KEY'] }));
  assert.equal(made.id, 'a1000000');
  assert.deepEqual([made.name, made.cron, made.timezone, made.status], ['improve demo', '0 9 * * 1-5', 'UTC', 'active']);
  assert.deepEqual(made.keys, ['STRIPE_KEY'], 'a key named twice is kept once');
  assert.equal(iso(made.nextRunAt), '2026-10-05T09:00:00.000Z');
  assert.deepEqual([...storage.map.keys()], ['routine:a1000000']);
  assert.deepEqual(summarize(made), {
    id: 'a1000000', name: 'improve demo', cadence: '0 9 * * 1-5 (UTC)', cron: '0 9 * * 1-5', timezone: 'UTC', status: 'active',
    keys: ['STRIPE_KEY'], maker: { name: 'Ada', email: 'ada@example.com' }, prompt: '/improve',
    nextRunAt: '2026-10-05T09:00:00.000Z', running: false, lastRun: null, skippedTicks: 0,
  });
});

test('a create that is not valid makes nothing, and says what is wrong', async () => {
  const { routines, storage } = list();
  const cases = [
    [{ name: '  ' }, /name is empty/],
    [{ name: 'x'.repeat(LIMITS.nameChars + 1) }, /name is longer/],
    [{ prompt: '' }, /prompt is empty/],
    [{ prompt: 'x'.repeat(LIMITS.promptChars + 1) }, /prompt is longer/],
    [{ cron: '0 25 * * *' }, /Invalid cron "0 25 \* \* \*": hour/],
    [{ cron: '0 0 30 2 *' }, /never runs/],
    [{ timezone: 'Mars/Olympus' }, /Unknown timezone/],
    [{ maker: { ...MAKER, id: 'someone' } }, /does not say who made it/],
    [{ maker: { ...MAKER, email: '' } }, /maker's email is empty/],
    [{ keys: 'STRIPE_KEY' }, /not a list/],
    [{ keys: ['stripe'] }, /is not a key name/],
    [{ keys: ['CLOUDFLARE_API_TOKEN'] }, /can not be given CLOUDFLARE_API_TOKEN/],
    [{ keys: Array.from({ length: LIMITS.keys + 1 }, (_, i) => `KEY_${i}`) }, /at most/],
  ];
  for (const [change, message] of cases) await assert.rejects(routines.create(routineInput(change)), refused('input', message), JSON.stringify(change).slice(0, 60));
  await assert.rejects(routines.create(undefined), refused('input'));
  assert.equal(storage.map.size, 0);
  await routines.create(routineInput());
  await assert.rejects(routines.create(routineInput({ name: 'IMPROVE Demo' })), refused('input', /already exists \(a1000000\)/), 'a name is taken in any case');
});

test('a run is never given the person\'s Cloudflare token, a publishing key, or the model\'s key by name', () => {
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_MEMORY_TOKEN', 'CF_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN', 'WONG_ROUTINES_KEY', 'WONG_ROUTINE_MODEL_KEY', 'WONG_ROUTINE_GITHUB_TOKEN', 'ROUTINES_KEY', 'MEMORY_TOKEN', 'MODEL_KEY', 'AI_RUN_TOKEN', 'RUN_STRIPE_KEY']) {
    assert.match(invalidKeyName(name), /can not be given/, name);
  }
  for (const name of ['stripe', '1KEY', 'A-B', '', undefined]) assert.match(invalidKeyName(name), /is not a key name/, String(name));
  assert.equal(invalidKeyName('STRIPE_SECRET_KEY'), null);
});

test('the list holds at most its limit of routines', async () => {
  const { routines } = list();
  for (let i = 0; i < LIMITS.routines; i++) await routines.create(routineInput({ name: `routine ${i}` }));
  await assert.rejects(routines.create(routineInput({ name: 'one too many' })), refused('input', /already has 50 routines/));
});

test('a change keeps what it does not name, moves the next run, and refuses a bad or empty one', async () => {
  const { routines } = list();
  await routines.create(routineInput());
  const later = await routines.change('improve demo', { cron: '30 14 * * *' });
  assert.deepEqual([later.cron, later.timezone, later.prompt, iso(later.nextRunAt)], ['30 14 * * *', 'UTC', '/improve', '2026-10-05T14:30:00.000Z']);
  const zoned = await routines.change('a1000000', { timezone: 'America/Toronto', prompt: ' /improve docs ' });
  assert.deepEqual([zoned.cron, zoned.timezone, zoned.prompt, iso(zoned.nextRunAt)], ['30 14 * * *', 'America/Toronto', '/improve docs', '2026-10-05T18:30:00.000Z']);
  await assert.rejects(routines.change('a1000000', {}), refused('input', /Nothing to change/));
  await assert.rejects(routines.change('a1000000', undefined), refused('input', /Nothing to change/));
  await assert.rejects(routines.change('a1000000', { cron: 'soon' }), refused('input', /Invalid cron/));
  await assert.rejects(routines.change('a1000000', { prompt: '' }), refused('input', /prompt is empty/));
  assert.equal((await routines.get('a1000000')).cron, '30 14 * * *', 'a refused change changes nothing');
});

test('a paused routine has no next run and is never due; resuming gives it one', async () => {
  const { routines, time } = list();
  await routines.create(routineInput());
  const paused = await routines.pause('improve demo');
  assert.deepEqual([paused.status, paused.nextRunAt, summarize(paused).nextRunAt], ['paused', null, null]);
  time.advance(2 * HOUR);
  assert.deepEqual(await routines.due(), []);
  assert.equal(await routines.nextAlarm(), null);
  const resumed = await routines.resume('improve demo');
  assert.deepEqual([resumed.status, iso(resumed.nextRunAt)], ['active', '2026-10-06T09:00:00.000Z'], 'the run it missed while paused is not made up');
});

test('a routine is found by id, by name in any case, or by a unique start of its id', async () => {
  const { routines } = list();
  await routines.create(routineInput({ name: 'Weekly report' }));
  await routines.create(routineInput({ name: 'weekly digest' }));
  assert.equal((await routines.find('a2000000')).name, 'weekly digest');
  assert.equal((await routines.find(' WEEKLY REPORT ')).id, 'a1000000');
  assert.equal((await routines.find('a2')).id, 'a2000000');
  await assert.rejects(routines.find(''), refused('input', /Name or id a routine/));
  await assert.rejects(routines.find('monthly'), (error) => refused('no-match')(error) && error.extra.routines.length === 2);
});

test('an ambiguous name changes nothing and lists the matching ids', async () => {
  const { routines, storage } = list();
  await routines.create(routineInput({ name: 'first' }));
  await routines.create(routineInput({ name: 'second' }));
  const before = JSON.stringify([...storage.map]);
  for (const act of [() => routines.pause('a'), () => routines.remove('a'), () => routines.change('a', { prompt: 'x' })]) {
    await assert.rejects(act(), (error) => refused('ambiguous', /matches more than one routine/)(error) && assert.deepEqual(error.extra.matches, [{ id: 'a1000000', name: 'first' }, { id: 'a2000000', name: 'second' }]) === undefined);
  }
  assert.equal(JSON.stringify([...storage.map]), before);
});

test('the clock starts every due routine once, moves it on, and reports the earliest next run for the alarm', async () => {
  const { routines, time } = list();
  await routines.create(routineInput({ name: 'nine', cron: '0 9 * * *' }));
  await routines.create(routineInput({ name: 'ten', cron: '0 10 * * *' }));
  await routines.create(routineInput({ name: 'resting', cron: '0 9 * * *' }));
  await routines.pause('resting');
  assert.equal(iso(await routines.nextAlarm()), '2026-10-05T09:00:00.000Z');
  assert.deepEqual(await routines.due(), [], 'nothing is due before its time');

  time.set(Date.parse('2026-10-05T09:00:02Z'));
  assert.deepEqual((await routines.due()).map((routine) => routine.name), ['nine']);
  const { started, ...deps } = world();
  const next = await tick(routines, deps);
  assert.equal(iso(next), '2026-10-05T10:00:00.000Z', 'the alarm is set for the earliest next run');
  assert.deepEqual(started.map((run) => run.id), ['a1000000']);
  assert.match(started[0].runId, /^run-a1000000-[0-9a-z]+-[0-9a-f]{4}$/);
  const nine = await routines.get('a1000000');
  assert.equal(iso(nine.nextRunAt), '2026-10-06T09:00:00.000Z');
  assert.deepEqual(nine.running, { runId: started[0].runId, startedAt: time.now(), tick: Date.parse('2026-10-05T09:00:00Z') });
  assert.deepEqual(await tick(routines, deps), next, 'a second ring at the same time starts nothing more');
  assert.equal(started.length, 1);
});

test('a tick that arrives while the last run is still going is skipped and recorded, and no second run starts', async () => {
  const { routines, time } = list();
  await routines.create(routineInput({ cron: '*/15 * * * *' }));
  const { started, ...deps } = world();
  time.set(Date.parse('2026-10-05T08:15:00Z'));
  await tick(routines, deps);
  time.set(Date.parse('2026-10-05T08:30:00Z'));
  await tick(routines, deps);
  assert.equal(started.length, 1, 'no second run');
  const shown = summarize(await routines.get('a1000000'));
  assert.deepEqual([shown.running, shown.skippedTicks, shown.lastRun.status, shown.lastRun.note], [true, 1, 'skipped', 'The run before this one was still going.']);

  await routines.finish('a1000000', started[0].runId, { status: 'ok', exitCode: 0, durationMs: 20 * 60_000, log: 'all done\n' });
  time.set(Date.parse('2026-10-05T08:45:00Z'));
  await tick(routines, deps);
  assert.equal(started.length, 2, 'the tick after the run ended starts one');
  assert.deepEqual((await routines.get('a1000000')).results.map((result) => result.status), ['skipped', 'ok']);
});

test('a run never heard from again is recorded as lost, so its routine runs again', async () => {
  const { routines, time } = list();
  await routines.create(routineInput());
  const first = await routines.begin('a1000000');
  time.advance(LIMITS.lostMs - 1);
  assert.deepEqual(await routines.begin('a1000000'), { started: false, reason: 'running' });
  time.advance(1);
  const second = await routines.begin('a1000000');
  assert.equal(second.started, true);
  const { results, running } = await routines.get('a1000000');
  assert.deepEqual(results.map((result) => [result.status, result.runId ?? null]), [['skipped', null], ['lost', first.runId]]);
  assert.equal(running.runId, second.runId);
  assert.deepEqual(await routines.begin('gone'), { started: false, reason: 'gone' });
});

test('a routine keeps its last 10 results and the saved output of those runs only', async () => {
  const { routines, storage, time } = list();
  await routines.create(routineInput());
  const runs = [];
  for (let i = 0; i < LIMITS.results + 3; i++) {
    const { runId } = await routines.begin('a1000000');
    runs.push(runId);
    time.advance(60_000);
    await routines.finish('a1000000', runId, { status: i % 2 ? 'failed' : 'ok', exitCode: i % 2, startupMs: 31_000, durationMs: 60_000, log: `output of run ${i}\n` });
  }
  const { results, running } = await routines.get('a1000000');
  assert.equal(results.length, LIMITS.results);
  assert.deepEqual(results.map((result) => result.runId), runs.slice(3));
  assert.equal(running, null);
  assert.deepEqual([...storage.map.keys()].filter((key) => key.startsWith('log:')).sort(), runs.slice(3).map((runId) => `log:a1000000:${runId}`).sort());

  const logs = await routines.logs('improve demo');
  assert.equal(logs.log, 'output of run 12');
  assert.equal(logs.results.length, LIMITS.results);
  assert.equal(logs.results.at(-1).at, iso(time.now()));
  const shown = summarize(await routines.get('a1000000'));
  assert.deepEqual(shown.lastRun, { status: 'ok', at: iso(time.now()), startupMs: 31_000, durationMs: 60_000, exitCode: 0, note: null }, 'the list shows how long the run took to start and to run');
  assert.equal(JSON.stringify(shown).includes('output of run'), false, 'the list carries no saved output');
});

test('saved output is the last 200 lines, and a result with no status counts as failed', async () => {
  const { routines } = list();
  await routines.create(routineInput());
  const { runId } = await routines.begin('a1000000');
  const long = Array.from({ length: 500 }, (_, i) => `line ${i}`).join('\r\n');
  await routines.finish('a1000000', runId, { log: `${long}\n\n` });
  const { log, results } = await routines.logs('a1000000');
  assert.deepEqual([log.split('\n').length, log.split('\n')[0], log.split('\n').at(-1)], [LIMITS.logLines, 'line 300', 'line 499']);
  assert.equal(results[0].status, 'failed');
  assert.equal(lastLines('x'.repeat(LIMITS.logChars + 50)).length, LIMITS.logChars);
  assert.equal(lastLines(undefined), '');
  assert.equal(await routines.finish('gone', 'run-x', { status: 'ok' }), null, 'a result for a deleted routine is dropped');
  assert.equal((await routines.logs('a1000000')).log.length > 0, true);
});

test('deleting a routine removes it and its saved output, and nothing else', async () => {
  const { routines, storage } = list();
  await routines.create(routineInput({ name: 'keep' }));
  await routines.create(routineInput({ name: 'drop' }));
  for (const id of ['a1000000', 'a2000000']) {
    const { runId } = await routines.begin(id);
    await routines.finish(id, runId, { status: 'ok', log: 'out' });
  }
  assert.equal((await routines.remove('drop')).id, 'a2000000');
  assert.deepEqual([...storage.map.keys()].map((key) => key.split(':').slice(0, 2).join(':')).sort(), ['log:a1000000', 'routine:a1000000']);
  assert.equal(await routines.advance('a2000000'), null);
  assert.equal((await routines.logs('keep')).log, 'out');
  const fresh = list();
  await fresh.routines.create(routineInput());
  assert.equal((await fresh.routines.logs('a1000000')).log, '', 'a routine that never ran has no output');
});

test('two computers run at once; a third run waits until one leaves or is lost', async () => {
  const { routines, time } = list();
  assert.deepEqual([await routines.takeSlot('one'), await routines.takeSlot('two'), await routines.takeSlot('three')], [true, true, false]);
  assert.equal(await routines.takeSlot('one'), true, 'asking again keeps the place it has');
  await routines.leaveSlot('one');
  assert.equal(await routines.takeSlot('three'), true);
  assert.equal(await routines.takeSlot('four'), false);
  time.advance(LIMITS.lostMs);
  assert.equal(await routines.takeSlot('four'), true, 'a place never given back is passed over');
  assert.equal(LIMITS.slots, 2);
});

test('a run with no model, no key for it, or no project access is recorded and never started', async () => {
  const { routines } = list();
  const routine = await routines.create(routineInput());
  assert.deepEqual(Object.keys(NEEDS), ['model', 'model-key', 'project-access']);
  for (const [need, status, note] of [['model', 'needs-model', /Pick one/], ['model-key', 'needs-model-key', /Paste it again/], ['project-access', 'needs-project-access', /project key/]]) {
    const { started, ...deps } = world(() => need);
    assert.deepEqual(await launch(routines, routine, deps), { started: false, reason: status });
    assert.deepEqual(started, []);
    const { results, running } = await routines.get(routine.id);
    assert.equal(results.at(-1).status, status);
    assert.match(results.at(-1).note, note);
    assert.equal(running, null);
  }
});

test('a run the Workflow refuses to start is recorded as failed and frees its routine', async () => {
  const { routines } = list();
  const routine = await routines.create(routineInput());
  const outcome = await launch(routines, routine, { ready: () => null, start: async () => { throw new Error('workflow limit'); } });
  assert.deepEqual(outcome, { started: false, reason: 'failed' });
  const { results, running } = await routines.get(routine.id);
  assert.deepEqual([results.at(-1).status, results.at(-1).note, running], ['failed', 'The run could not start: workflow limit', null]);
  assert.equal(START, Date.parse('2026-10-05T08:00:00Z'));
});

// ---------------------------------------------------------------------------
// The model the install's routines run on

test('no model is in use until one is picked, and a run is asked about the one in use', async () => {
  const { routines, storage } = list();
  assert.equal(await routines.model(), null);
  const asked = [];
  const ready = (choice) => {
    asked.push(choice);
    return null;
  };
  const routine = await routines.create(routineInput());
  await launch(routines, routine, { start: async () => {}, ready });
  assert.deepEqual(asked, [null]);
  assert.deepEqual(await routines.choose({ via: 'cloudflare', model: KIMI }), PICKED);
  assert.deepEqual(await storage.get('model'), { use: 'cloudflare', cloudflare: KIMI, key: null });
  await routines.finish(routine.id, (await routines.get(routine.id)).running.runId, { status: 'ok' });
  await launch(routines, routine, { start: async () => {}, ready });
  assert.deepEqual(asked.at(-1), PICKED);
});

test('a pasted key takes over from the Cloudflare pick, and removing it returns to that pick', async () => {
  const { routines } = list();
  await routines.choose({ via: 'cloudflare', model: KIMI });
  const zai = { via: 'key', provider: 'zai', model: 'glm-5.3' };
  assert.deepEqual(await routines.choose(zai), zai);
  assert.deepEqual(await routines.choose({ via: 'key', provider: 'anthropic', model: 'claude-sonnet-5' }), { via: 'key', provider: 'anthropic', model: 'claude-sonnet-5' }, 'a second key replaces the first');
  assert.deepEqual(await routines.choose({ via: 'cloudflare', model: 'claude-sonnet-5' }), { via: 'cloudflare', provider: GATEWAY, model: 'claude-sonnet-5' }, 'a later pick is the one in use');
  await routines.choose(zai);
  assert.deepEqual(await routines.forgetKey(), { via: 'cloudflare', provider: GATEWAY, model: 'claude-sonnet-5' });
  assert.deepEqual(await routines.forgetKey(), { via: 'cloudflare', provider: GATEWAY, model: 'claude-sonnet-5' }, 'removing a key that is not there changes nothing');

  const keyOnly = list();
  await keyOnly.routines.choose(zai);
  assert.equal(await keyOnly.routines.forgetKey(), null, 'with no pick to return to, no model is in use');
});

test('a model choice that is not valid stores nothing', async () => {
  const { routines, storage } = list();
  const cases = [
    [undefined, /model is empty/], [{ via: 'cloudflare', model: ' ' }, /model is empty/], [{ via: 'cloudflare', model: 'x'.repeat(LIMITS.modelChars + 1) }, /model is longer/],
    [{ via: 'key', model: 'glm-5.3' }, /service is not named/], [{ via: 'key', provider: 'Z.ai', model: 'glm-5.3' }, /service is not named/], [{ via: 'guess', model: KIMI }, /cloudflare or key/],
  ];
  for (const [choice, message] of cases) await assert.rejects(routines.choose(choice), refused('input', message), JSON.stringify(choice));
  assert.equal(storage.map.size, 0);
});

/** The management API on a list, with a stand-in for pi-ai. */
function api(models = fakeModels()) {
  const { routines, storage } = list();
  const deps = { key: ROUTINES_KEY, routines, models, ready: () => null, start: async () => {}, setAlarm: async () => {} };
  const call = async (method, path, body) => {
    const init = { method, headers: { Authorization: `Bearer ${ROUTINES_KEY}` } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await manage(new Request(`https://demo-routines.ada.workers.dev${path}`, init), deps);
    const text = await response.text();
    return { status: response.status, text, data: text ? JSON.parse(text) : null };
  };
  return { call, routines, storage, models };
}

test('/models lists the shortlist with the recommended model first, the catalog, and the model in use', async () => {
  const { call, routines } = api();
  const first = await call('GET', '/models');
  assert.deepEqual(first.data, { version: API_VERSION, ok: true, model: null, shortlist: SHORTLIST, models: CATALOG });
  assert.deepEqual([first.data.shortlist.length, first.data.shortlist[0].recommended], [3, true]);
  await routines.choose({ via: 'cloudflare', model: KIMI });
  assert.deepEqual((await call('GET', '/models')).data.model, PICKED);
  assert.deepEqual((await call('GET', '/model')).data, { version: API_VERSION, ok: true, model: PICKED });
});

test('/model stores a pick Cloudflare lists or a key\'s service, and refuses a model Cloudflare does not list', async () => {
  const { call, storage } = api();
  const unknown = await call('POST', '/model', { via: 'cloudflare', model: 'no-such-model' });
  assert.deepEqual([unknown.status, unknown.data.ok, unknown.data.error, unknown.data.shortlist.length], [400, false, 'Cloudflare lists no model "no-such-model".', 3]);
  assert.equal(storage.map.size, 0);
  assert.deepEqual((await call('POST', '/model', { via: 'cloudflare', model: KIMI })).data, { version: API_VERSION, ok: true, action: 'model', model: PICKED });
  const keyed = await call('POST', '/model', { via: 'key', provider: 'zai', model: 'glm-5.3' });
  assert.deepEqual(keyed.data.model, { via: 'key', provider: 'zai', model: 'glm-5.3' });
  assert.deepEqual((await call('DELETE', '/model/key')).data, { version: API_VERSION, ok: true, action: 'forget-key', model: PICKED });
  assert.equal((await call('POST', '/model', { via: 'key', model: 'glm-5.3' })).status, 400);
  for (const [method, path] of [['PUT', '/model'], ['GET', '/model/test'], ['DELETE', '/model'], ['GET', '/model/key'], ['GET', '/models/more']]) assert.equal((await call(method, path)).status, 404, `${method} ${path}`);
});

test('/model/test tries each candidate in order, stops at the first that works, and stores nothing', async () => {
  const key = 'sk-pasted-model-key-secret';
  const models = fakeModels({ accepts: ({ provider }) => provider === 'deepseek', status: 401, message: ({ key: sent }) => `Incorrect API key provided: ${sent}` });
  const { call, storage } = api(models);
  const candidates = [{ provider: 'openai', model: 'gpt-5.5' }, { provider: 'deepseek', model: 'deepseek-v4-pro' }, { provider: 'moonshotai', model: 'kimi-k2.6' }];
  const tested = await call('POST', '/model/test', { key, candidates });
  assert.deepEqual(tested.data, { version: API_VERSION, ok: true, accepted: candidates[1], refusals: [{ ...candidates[0], status: 401 }] });
  assert.deepEqual(models.tested, [{ ...candidates[0], key }, { ...candidates[1], key }], 'the third service is never asked');
  assert.equal(tested.text.includes(key), false, 'a refusal never quotes the key back');
  assert.equal(storage.map.size, 0, 'a test stores nothing');

  const none = await call('POST', '/model/test', { key, candidates: [candidates[0]] });
  assert.deepEqual([none.data.ok, none.data.accepted, none.data.refusals], [true, null, [{ ...candidates[0], status: 401 }]]);
  assert.equal(storage.map.size, 0);
});

test('/model/test with no key tests a Cloudflare pick, and says what Cloudflare answered', async () => {
  const models = fakeModels({ accepts: ({ model }) => model === KIMI, status: 402, message: `Add credit to use this model. ${'x'.repeat(LIMITS.refusalChars)}` });
  const { call, storage } = api(models);
  assert.deepEqual((await call('POST', '/model/test', { model: KIMI })).data.accepted, { provider: GATEWAY, model: KIMI });
  assert.deepEqual(models.tested[0], { provider: GATEWAY, model: KIMI, key: null });
  const refused402 = await call('POST', '/model/test', { model: 'claude-sonnet-5' });
  assert.deepEqual([refused402.data.accepted, refused402.data.refusals[0].status, refused402.data.refusals[0].message.length], [null, 402, LIMITS.refusalChars]);
  assert.match(refused402.data.refusals[0].message, /^Add credit to use this model\./);
  assert.equal(storage.map.size, 0);

  const bad = [[{}, /model is empty/], [{ key: ' ', candidates: [] }, /key is empty/], [{ key: 'k', candidates: [] }, /one to 5 services/], [{ key: 'k', candidates: 'zai' }, /one to 5 services/],
    [{ key: 'k', candidates: Array.from({ length: LIMITS.candidates + 1 }, () => ({ provider: 'zai', model: 'glm-5.3' })) }, /one to 5 services/], [{ key: 'k', candidates: [{ provider: 'Z.ai', model: 'x' }] }, /not named/]];
  for (const [body, message] of bad) {
    const answer = await call('POST', '/model/test', body);
    assert.deepEqual([answer.status, answer.data.code], [400, 'input'], JSON.stringify(body));
    assert.match(answer.data.error, message);
  }
  assert.equal(models.tested.length, 2, 'a request that is not valid tests nothing');
});
