import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';
import { appAdapter, appHost, selectHost, startupPrompt } from '../../.agents/skills/schedule/scripts/lib/hosts.mjs';
import { RUN_FLOOR_MS, mirrorRound, openSession, runRound } from '../../.agents/skills/schedule/scripts/lib/app-runs.mjs';
import { writeRoutine } from '../../.agents/skills/schedule/scripts/lib/records.mjs';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';
import { NOW, host, item, routine } from './fixtures/scheduled-work.mjs';

const COMPUTER = 'c'.repeat(32);
function workspace(t) { const root = mkdtempSync(path.join(tmpdir(), 'wong-schedule-app-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
function appRoutine(overrides = {}, nativeId = 'synthetic') {
  const row = routine(overrides);
  row.binding.execution = { ...row.binding.execution, host: 'app', nativeId };
  return row;
}
const ledgerIn = root => path.join(root, 'ledger', 'runs.json');
const readRecord = root => JSON.parse(readFileSync(path.join(root, 'schedules/synthetic.json'), 'utf8'));

// A stand-in for the inbox's schedule routes, answering copies as HTTP would. `broken[route]` is 'throw' (network
// error) or 'ignore' (500, no change).
function fakeApp({ broken = {}, claimable = [] } = {}) {
  const schedules = new Map(), runs = [], results = [], calls = [];
  const reply = (value, status = 200) => ({ value: structuredClone(value), status });
  const http = async (address, init = {}) => {
    const [route, query] = address.replace('/apps/inbox/api/', '').split('?');
    const method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : {};
    calls.push([method, route, body]);
    if (broken[route] === 'throw') throw new Error('network');
    if (broken[route] === 'ignore') return reply({ error: 'server' }, 500);
    const found = schedules.get(body.key);
    if (route === 'schedule' && method === 'GET') {
      const key = new URLSearchParams(query).get('key'), row = schedules.get(key);
      return row ? reply({ schedule: row, runs: runs.filter(run => run.key === key) }) : reply({ error: 'not_found' }, 404);
    }
    if (route === 'schedule') {
      const row = { key: body.key, host: 'app', name: body.name, summary: body.summary, timing: body.timing, state: found?.state ?? 'on', nextRunAt: NOW + 3600e3, computer: body.computer, lastRun: null, waiting: null };
      schedules.set(body.key, row); return reply({ schedule: row });
    }
    if (route === 'pause' || route === 'resume') {
      Object.assign(found, route === 'pause' ? { state: 'paused', nextRunAt: null, waiting: null } : { state: 'on', nextRunAt: NOW + 3600e3 });
      return reply({ schedule: found });
    }
    if (route === 'delete') { schedules.delete(body.key); return reply({ deleted: true }); }
    if (route === 'run-now') {
      if (found.state === 'paused') return reply({ error: 'paused' }, 409);
      if (found.waiting) return reply({ error: 'already_waiting' }, 409);
      const run = { id: String(runs.length + 1).padStart(32, '0'), key: body.key, dueAt: NOW, source: 'now', state: 'due', result: null, chatTitle: null, agentId: null };
      runs.unshift(run); found.waiting = run; return reply({ run });
    }
    if (route === 'claim') return reply({ runs: claimable.splice(0) });
    if (route === 'run-result') { results.push(body); return reply({ run: body }); }
    if (route === 'mirror') return reply({ mirrored: body.schedules.length });
    if (route === 'schedules') return reply({ schedules: [...schedules.values()], computerOnline: true });
    return reply({ error: 'not_found' }, 404);
  };
  return { schedules, runs, results, calls, http };
}
const adapter = (client, extra = {}) => appAdapter({ client, computer: COMPUTER, remember: () => true, ...extra });

test('a claimed run starts only from a current app record; changed or unknown ones are blocked and open nothing', async t => {
  const root = workspace(t), record = appRoutine();
  writeRoutine(root, record);
  const revision = record.binding.revision, opened = [], logged = [];
  const open = async ({ binding, title }) => { opened.push({ prompt: startupPrompt(binding), title, cwd: binding.execution.context.cwd }); return { agentId: 'agent-9', chatTitle: title }; };
  const app = fakeApp({ claimable: [
    { id: 'a'.repeat(32), key: 'synthetic', revision, dueAt: NOW },
    { id: 'b'.repeat(32), key: 'synthetic', revision: 'f'.repeat(64), dueAt: NOW },
    { id: 'c'.repeat(32), key: 'missing', revision, dueAt: NOW },
    { id: 'd'.repeat(32), key: '../escape', revision, dueAt: NOW },
  ] });
  assert.equal(await runRound(app, { computer: COMPUTER, root, open, log: entry => logged.push(entry), ledger: ledgerIn(root) }), 4);
  assert.deepEqual(app.results.map(result => [result.state, result.reason ?? null]), [['started', null], ['blocked', 'changed'], ['blocked', 'unknown_key'], ['blocked', 'unknown_key']]);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].prompt, startupPrompt(record.binding)); assert.equal(opened[0].cwd, '/durable/primary'); assert.equal(opened[0].title, 'Weekly synthetic');
  assert.equal(app.results[0].agentId, 'agent-9');
  assert.deepEqual(logged[1], { event: 'run', key: 'synthetic', run: 'b'.repeat(32), outcome: 'blocked', reason: 'changed', chat: undefined });

  const edited = readRecord(root); edited.instructions = 'Email every customer now.';
  writeFileSync(path.join(root, 'schedules/synthetic.json'), JSON.stringify(edited));
  const later = fakeApp({ claimable: [{ id: 'e'.repeat(32), key: 'synthetic', revision, dueAt: NOW }] });
  await runRound(later, { computer: COMPUTER, root, open, ledger: ledgerIn(root) });
  assert.deepEqual(later.results, [{ id: 'e'.repeat(32), state: 'blocked', reason: 'changed' }]);
  assert.equal(opened.length, 1);
});

test('a run is refused for a Paseo-bound or paused record, and a missing opener reports failed', async t => {
  const root = workspace(t), paseo = routine();
  writeRoutine(root, paseo);
  const app = fakeApp({ claimable: [{ id: 'a'.repeat(32), key: 'synthetic', revision: paseo.binding.revision, dueAt: NOW }] });
  await runRound(app, { computer: COMPUTER, root, open: async () => assert.fail('opened'), ledger: ledgerIn(root) });
  assert.equal(app.results[0].reason, 'not_app');

  const paused = appRoutine(); paused.binding.lifecycle = { ...paused.binding.lifecycle, state: 'paused' };
  writeRoutine(root, paused);
  const second = fakeApp({ claimable: [{ id: 'b'.repeat(32), key: 'synthetic', revision: paused.binding.revision, dueAt: NOW }] });
  await runRound(second, { computer: COMPUTER, root, open: async () => assert.fail('opened'), ledger: ledgerIn(root) });
  assert.equal(second.results[0].reason, 'disabled');

  writeRoutine(root, appRoutine());
  const third = fakeApp({ claimable: [{ id: 'c'.repeat(32), key: 'synthetic', revision: paused.binding.revision, dueAt: NOW }] });
  await runRound(third, { computer: COMPUTER, root, open: async () => { throw new PaseoError(EXIT.noPaseo, 'no paseo'); }, ledger: ledgerIn(root) });
  assert.deepEqual(third.results[0], { id: 'c'.repeat(32), state: 'failed', reason: 'no_opener' });
  assert.equal(await runRound(fakeApp({ broken: { claim: 'throw' } }), { computer: COMPUTER, root }), 0);
});

test('the computer never starts one run twice, nor a schedule more often than its least gap, and logs each refusal', async t => {
  const root = workspace(t), record = appRoutine(), revision = record.binding.revision;
  writeRoutine(root, record);
  let clock = NOW, opened = 0;
  const logged = [], ledger = ledgerIn(root);
  const round = async claimable => {
    const app = fakeApp({ claimable });
    await runRound(app, { computer: COMPUTER, root, ledger, now: () => clock, log: entry => logged.push(entry), open: async () => { opened += 1; return {}; } });
    return app.results.map(result => [result.state, result.reason ?? null]);
  };
  const run = id => ({ id: id.repeat(32), key: 'synthetic', revision, dueAt: NOW });
  assert.deepEqual(await round([run('a'), run('a'), run('b')]), [['started', null], ['blocked', 'repeat'], ['blocked', 'too_soon']]);
  assert.deepEqual(logged.slice(1).map(entry => [entry.run, entry.outcome, entry.reason]), [['a'.repeat(32), 'blocked', 'repeat'], ['b'.repeat(32), 'blocked', 'too_soon']]);
  // With no gap in the record, the floor holds; the started id stays refused after it.
  clock += RUN_FLOOR_MS - 1;
  assert.deepEqual(await round([run('c')]), [['blocked', 'too_soon']]);
  clock += 1;
  assert.deepEqual(await round([run('a'), run('c')]), [['blocked', 'repeat'], ['started', null]]);
  assert.equal(opened, 2);

  const hourly = appRoutine({ authority: { actions: ['read'], recipients: [], channels: [], minIntervalMs: 3_600_000 } });
  writeRoutine(root, hourly);
  const every = id => ({ ...run(id), revision: hourly.binding.revision });
  clock += 30 * 60_000;
  assert.deepEqual(await round([every('d')]), [['blocked', 'too_soon']]);
  clock += 30 * 60_000;
  assert.deepEqual(await round([every('d')]), [['started', null]]);

  writeFileSync(ledger, 'not json');
  clock += 86_400_000;
  assert.deepEqual(await round([every('e')]), [['blocked', 'no_ledger']]);
  assert.equal(opened, 3);
});

test('a run starts from whichever folder signed in to the app holds its record, the one its binding names first', async t => {
  const first = workspace(t), second = workspace(t), opened = [];
  const open = async ({ binding }) => { opened.push(binding.execution.context.cwd); return {}; };
  const record = appRoutine();
  writeRoutine(second, record);
  const app = fakeApp({ claimable: [{ id: 'a'.repeat(32), key: 'synthetic', revision: record.binding.revision, dueAt: NOW }] });
  await runRound(app, { computer: COMPUTER, roots: [first, second], open, ledger: ledgerIn(first) });
  assert.deepEqual(app.results.map(result => result.state), ['started']);

  const named = appRoutine();
  named.binding.execution.context = { ...named.binding.execution.context, cwd: second };
  writeRoutine(first, appRoutine());
  writeRoutine(second, named);
  const both = fakeApp({ claimable: [{ id: 'b'.repeat(32), key: 'synthetic', revision: named.binding.revision, dueAt: NOW }] });
  await runRound(both, { computer: COMPUTER, roots: [first, second], open, ledger: ledgerIn(second) });
  assert.deepEqual(opened, ['/durable/primary', second]);
});

test('the gap follows the folder the chat opens in, so a clone holding the same record cannot reset it', async t => {
  const first = workspace(t), second = workspace(t), ledger = ledgerIn(first), record = appRoutine();
  writeRoutine(first, record);
  writeRoutine(second, record);
  const round = async (roots, id) => {
    const app = fakeApp({ claimable: [{ id: id.repeat(32), key: 'synthetic', revision: record.binding.revision, dueAt: NOW }] });
    await runRound(app, { computer: COMPUTER, roots, ledger, now: () => NOW, open: async () => ({}) });
    return app.results.map(result => [result.state, result.reason ?? null]);
  };
  assert.deepEqual(await round([first], 'a'), [['started', null]]);
  assert.deepEqual(await round([second], 'b'), [['blocked', 'too_soon']]);
  assert.deepEqual(readdirSync(path.dirname(ledger)), ['runs.json']);
});

test('the app adapter reads back every change and maps the app schedule like Paseo inspect', async () => {
  const app = fakeApp(), remembered = [], record = appRoutine(), binding = record.binding;
  const host = adapter(app, { item: { name: record.name, record, binding }, remember: cwd => remembered.push(cwd) });
  const created = await host.create(binding, 'op-1');
  assert.equal(created.outcome, 'verified'); assert.equal(created.nativeId, 'synthetic');
  const sent = app.calls.find(([method, route]) => method === 'PUT' && route === 'schedule')[2];
  assert.equal(sent.computer, COMPUTER); assert.equal(sent.revision, binding.revision); assert.equal(sent.name, 'Weekly synthetic');
  assert.deepEqual(sent.timing, { mode: 'recurring', every: '1h', timezone: 'UTC', allowedLatenessMs: 60000 });
  assert.deepEqual(remembered, ['/durable/primary']);
  const seen = await host.inspect('synthetic');
  assert.equal(seen.status, 'active'); assert.equal(seen.prompt, startupPrompt(binding)); assert.equal(seen.nextRunAt, new Date(NOW + 3600e3).toISOString());
  assert.equal((await host.pause('synthetic')).outcome, 'verified');
  const paused = await host.inspect('synthetic');
  assert.equal(paused.status, 'paused'); assert.equal(paused.nextRunAt, null);
  assert.equal((await host.run('synthetic')).outcome, 'unknown');
  assert.equal((await host.resume('synthetic')).outcome, 'verified');
  const ran = await host.run('synthetic');
  assert.equal(ran.outcome, 'verified'); assert.equal(ran.observation.runs.at(-1).state, 'due');
  assert.equal((await host.run('synthetic')).outcome, 'unknown');
  const updated = await host.update('synthetic', { timing: { ...binding.timing, every: '1d' } });
  assert.equal(updated.outcome, 'verified'); assert.equal(app.schedules.get('synthetic').timing.every, '1d');
  assert.equal((await host.cancel('synthetic')).outcome, 'verified'); assert.equal(app.schedules.size, 0);
  await assert.rejects(host.inspect('synthetic'), /no schedule/);
});

test('the app adapter reports unknown when a change is not seen, and refuses what it can not run', async () => {
  const record = appRoutine(), binding = record.binding;
  const ignoring = fakeApp({ broken: { pause: 'ignore', 'run-now': 'throw' } }), host = adapter(ignoring, { item: { name: record.name, record, binding } });
  await host.create(binding, 'op-1');
  assert.equal((await host.pause('synthetic')).outcome, 'unknown');
  assert.equal((await host.run('synthetic')).outcome, 'unknown');
  assert.equal((await adapter(fakeApp({ broken: { schedule: 'throw' } })).create(binding, 'op-1')).outcome, 'unknown');
  assert.equal((await adapter(fakeApp({ broken: { delete: 'ignore' } })).cancel('synthetic')).outcome, 'verified');
  const kept = fakeApp({ broken: { delete: 'ignore' } }), keeper = adapter(kept, { item: { name: record.name, record, binding } });
  await keeper.create(binding, 'op-1');
  assert.equal((await keeper.cancel('synthetic')).outcome, 'unknown');
  const worktree = structuredClone(binding); worktree.execution.context.cwd = '/home/me/.paseo/worktrees/x/y';
  await assert.rejects(adapter(fakeApp()).create(worktree, 'op-1'), /durable primary/);
  await assert.rejects(adapter(null).inspect('synthetic'), error => error.code === 3);
});

test('the app host is preferred only when the helper runs as a service and the app answers', async () => {
  assert.equal((await appHost({ service: () => false, client: async () => fakeApp() })).supported, false);
  assert.equal((await appHost({ service: () => true, client: async () => null })).supported, false);
  assert.equal((await appHost({ service: () => true, client: async () => fakeApp({ broken: { schedules: 'throw' } }) })).supported, false);
  const answering = await appHost({ service: () => true, client: async () => fakeApp() });
  assert.equal(answering.supported, true);
  assert.equal(selectHost({ enclosing: 'paseo', available: [answering, { name: 'paseo', supported: true }] }).name, 'app');
  assert.equal(selectHost({ preferred: 'paseo', available: [answering, { name: 'paseo', supported: true }] }).name, 'paseo');
  let text = '';
  assert.equal(await main(['hosts'], { out: value => { text += value; }, appHost: async () => answering }), 0);
  assert.equal(JSON.parse(text).preferred, 'app');
});

async function move(root, hosts) {
  let text = '';
  const code = await main(['move', 'synthetic'], { root, out: value => { text += value; }, hosts });
  return { code, data: JSON.parse(text) };
}

test('move pauses Paseo, creates on the app, rebinds the record, then deletes in Paseo', async t => {
  const root = workspace(t), app = fakeApp(), paseo = host();
  writeRoutine(root, routine());
  const { code, data } = await move(root, { paseo, app: adapter(app) });
  assert.equal(code, 0, JSON.stringify(data)); assert.equal(data.state, 'moved');
  assert.deepEqual(paseo.called.map(([action]) => action), ['pause', 'cancel']);
  const saved = readRecord(root).binding;
  assert.equal(saved.execution.host, 'app'); assert.equal(saved.execution.nativeId, 'synthetic');
  assert.equal(saved.lifecycle.state, 'scheduled'); assert.equal(saved.lifecycle.move, undefined);
  assert.equal(app.schedules.get('synthetic').state, 'on');
});

test('a move that fails midway leaves Paseo paused, the move pending, and never both active', async t => {
  const root = workspace(t), paseo = host();
  writeRoutine(root, routine());
  const broken = fakeApp({ broken: { schedule: 'ignore' } });
  const failed = await move(root, { paseo, app: adapter(broken) });
  assert.equal(failed.code, 1); assert.equal(failed.data.state, 'move-pending'); assert.equal(failed.data.step, 'create');
  assert.deepEqual(paseo.called.map(([action]) => action), ['pause']);
  assert.equal(broken.schedules.size, 0);
  let saved = readRecord(root).binding;
  assert.equal(saved.execution.host, 'paseo'); assert.equal(saved.lifecycle.state, 'paused'); assert.deepEqual(saved.lifecycle.move, { from: 'job-1', step: 'paused', resumeTo: 'scheduled' });

  const app = fakeApp(), stuck = host({ async cancel(id) { stuck.called.push(['cancel', id]); return { version: 1, host: 'paseo', action: 'cancel', nativeId: id, outcome: 'unknown' }; } });
  const half = await move(root, { paseo: stuck, app: adapter(app) });
  assert.equal(half.code, 1); assert.equal(half.data.step, 'delete');
  saved = readRecord(root).binding;
  assert.equal(saved.execution.host, 'app'); assert.equal(saved.lifecycle.state, 'scheduled'); assert.equal(saved.lifecycle.move.step, 'created');

  const done = await move(root, { paseo, app: adapter(app) });
  assert.equal(done.code, 0, JSON.stringify(done.data));
  assert.equal(paseo.called.filter(([action]) => action === 'cancel').length, 1);
  assert.equal(readRecord(root).binding.lifecycle.move, undefined);
});

test('a move whose Paseo pause is not confirmed changes nothing', async t => {
  const root = workspace(t), app = fakeApp();
  writeRoutine(root, routine());
  const before = readFileSync(path.join(root, 'schedules/synthetic.json'), 'utf8');
  const paseo = host({ async pause(id) { return { version: 1, host: 'paseo', action: 'pause', nativeId: id, outcome: 'unknown' }; } });
  const { code } = await move(root, { paseo, app: adapter(app) });
  assert.equal(code, 1);
  assert.equal(readFileSync(path.join(root, 'schedules/synthetic.json'), 'utf8'), before);
  assert.equal(app.schedules.size, 0);
});

test('the mirror sends one row per live Paseo record with its next run', async () => {
  const app = fakeApp(), ended = item({ key: 'ended' });
  ended.binding = { ...ended.binding, key: 'ended', lifecycle: { ...ended.binding.lifecycle, state: 'cancelled' } };
  const list = async () => ({ records: [item(), ended] });
  const inspect = async id => ({ id, status: 'active', nextRunAt: '2026-10-10T10:00:00Z' });
  assert.equal(await mirrorRound(app, { computer: COMPUTER, root: '/unused', list, inspect }), 1);
  const [, , sent] = app.calls.find(([, route]) => route === 'mirror');
  assert.equal(sent.computer, COMPUTER);
  assert.deepEqual(sent.schedules, [{ key: 'synthetic', name: 'synthetic', summary: '', timing: { mode: 'recurring', cron: '0 10 * * *', timezone: 'UTC', expiresAt: '2026-11-01T11:00:00Z', allowedLatenessMs: 60000 }, nextRunAt: Date.parse('2026-10-10T10:00:00Z'), state: 'on' }]);
  assert.equal(await mirrorRound(fakeApp({ broken: { mirror: 'ignore' } }), { computer: COMPUTER, root: '/unused', list, inspect }), null);
});

test('the mirror merges the Paseo records of every folder signed in to the app into one upload', async () => {
  const other = item({ key: 'other' });
  other.binding = { ...other.binding, key: 'other' };
  const folders = { '/one': [item()], '/two': [other, item()] };
  const inspect = async id => ({ id, status: 'active', nextRunAt: '2026-10-10T10:00:00Z' });
  const app = fakeApp();
  assert.equal(await mirrorRound(app, { computer: COMPUTER, roots: ['/one', '/two'], list: async folder => ({ records: folders[folder] }), inspect }), 2);
  const uploads = app.calls.filter(([, route]) => route === 'mirror');
  assert.deepEqual(uploads.map(([, , sent]) => sent.schedules.map(row => row.key)), [['synthetic', 'other']]);

  const broken = fakeApp();
  const list = async folder => { if (folder === '/two') throw new Error('unreadable'); return { records: folders[folder] }; };
  assert.equal(await mirrorRound(broken, { computer: COMPUTER, roots: ['/one', '/two'], list, inspect }), null);
  assert.equal(broken.calls.length, 0, 'one unreadable folder sends nothing, so its rows stay');
});

test("a run's chat opens at medium thinking or more: a low-default model gets medium, a high-default one keeps its own", async t => {
  const root = workspace(t), bin = path.join(root, 'paseo'), log = path.join(root, 'log.jsonl');
  writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (args[0] === 'provider') { console.log(process.env.FAKE_MODELS); process.exit(0); }
console.log(JSON.stringify({ agentId: 'agent-run', title: 'Weekly synthetic' }));
`);
  chmodSync(bin, 0o755);
  const runs = () => readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)).filter(args => args[0] === 'run');
  const open = (models, provider = 'codex') => openSession({ binding: { ...appRoutine().binding, execution: { ...appRoutine().binding.execution,
    context: { ...appRoutine().binding.execution.context, provider } } }, title: 'Weekly synthetic',
  env: { ...process.env, WONG_PASEO_BIN: bin, FAKE_MODELS: JSON.stringify(models) } });
  assert.deepEqual(await open([{ id: 'gpt-low', defaultThinkingOptionId: 'low' }]), { agentId: 'agent-run', chatTitle: 'Weekly synthetic' });
  assert.equal(runs()[0][runs()[0].indexOf('--thinking') + 1], 'medium');
  await open([{ id: 'claude-high', defaultThinkingOptionId: 'high' }], 'claude/claude-high');
  assert.ok(!runs()[1].includes('--thinking'));
});
