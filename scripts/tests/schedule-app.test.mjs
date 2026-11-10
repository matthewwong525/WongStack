// The helper starts a claimed run only on a version the signed-in person approved on this computer.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { approve, approvedVersion, approvalsFile } from '../../.agents/skills/schedule/scripts/lib/approvals.mjs';
import { definition, saveDefinition } from '../../.agents/skills/schedule/scripts/lib/app.mjs';
import { RUN_FLOOR_MS, checkRun, handOver, mirrorRound, openSession, runRound } from '../../.agents/skills/schedule/scripts/lib/app-runs.mjs';
import { appProgress } from '../../.agents/skills/schedule/scripts/lib/progress.mjs';
import { scheduleVersion } from '../../.agents/skills/schedule/scripts/lib/version.mjs';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';
import { COMPUTER, NOW, ORIGIN, fakeApp, folder, plan, runId } from './fixtures/scheduled-work.mjs';

const JO = 'jo@example.test', KIM = 'kim@example.test';

/** A saved schedule in the fake app, approved for `who` unless `approved` is false. */
async function saved(t, overrides = {}, { approved = JO } = {}) {
  const home = folder(t), cwd = folder(t), app = fakeApp();
  const env = { HOME: home };
  const def = definition(plan({ run: { cwd }, ...overrides }), { primary: cwd });
  const { version } = await saveDefinition(app, def, { computer: COMPUTER });
  if (approved) approve({ origin: ORIGIN, email: approved, key: def.key, version }, env);
  return { app, env, cwd, version, def, ledger: path.join(home, 'runs.json') };
}

test('the version is the sha256 of what a run does and its end, never its timing', () => {
  const vector = { key: 'weekly-plan', kind: 'chat', instructions: 'Plan the week.', run: { cwd: '/home/jo/repo', thinking: 'high' }, authority: { minIntervalMs: 600000 } };
  assert.equal(scheduleVersion(vector), '69794bedd405d57972bf86cdcbdecced8f9b0064acaafc22f4ada926f8ed4996');
  assert.equal(scheduleVersion({ ...vector, timing: { cron: '0 1 * * *' } }), scheduleVersion(vector));
  assert.notEqual(scheduleVersion({ ...vector, instructions: 'Plan the month.' }), scheduleVersion(vector));
  assert.equal(scheduleVersion({ ...vector, until: null }), scheduleVersion(vector));
  assert.equal(scheduleVersion({ ...vector, until: 'The plan is done.' }), 'c9f38c023909c9f00590c8a0c3f41b5c3181a01ae252df3553720c231f05b0f1');
});

test("one person's OK never passes another person's run on the same computer", t => {
  const env = { HOME: folder(t) }, version = 'a'.repeat(64);
  approve({ origin: `${ORIGIN}/`, email: 'Jo@Example.test', key: 'weekly-plan', version }, env);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), version);
  assert.equal(approvedVersion({ origin: ORIGIN, email: KIM, key: 'weekly-plan' }, env), null);
  assert.equal(approvedVersion({ origin: 'https://other.example.test', email: JO, key: 'weekly-plan' }, env), null);
  assert.equal(statSync(approvalsFile(env)).mode & 0o777, 0o600);
  writeFileSync(approvalsFile(env), 'not json');
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), null, 'a broken file approves nothing');
});

test('checkRun refuses an unapproved, changed, ended or folderless run, and passes an approved one', async t => {
  const { app, env, version } = await saved(t);
  const run = { id: runId(1), key: 'weekly-plan', revision: version };
  assert.equal((await checkRun(run, { client: app, env, email: () => JO })).schedule.key, 'weekly-plan');
  assert.equal((await checkRun(run, { client: app, env, email: () => KIM })).reason, 'not_approved');
  assert.equal((await checkRun(run, { client: app, env, email: () => null })).reason, 'not_approved');
  assert.equal((await checkRun({ ...run, revision: 'b'.repeat(64) }, { client: app, env, email: () => JO })).reason, 'changed');
  assert.equal((await checkRun({ ...run, key: 'nope' }, { client: app, env, email: () => JO })).reason, 'unknown_key');

  const row = app.schedules.get('weekly-plan');
  row.instructions = 'Email every customer.';
  assert.equal((await checkRun(run, { client: app, env, email: () => JO })).reason, 'changed', 'text changed in the app without a new version');
  row.instructions = 'Plan the week.';
  row.run = { cwd: '/gone/folder' }; row.version = scheduleVersion(row);
  approve({ origin: ORIGIN, email: JO, key: 'weekly-plan', version: row.version }, env);
  assert.equal((await checkRun({ ...run, revision: row.version }, { client: app, env, email: () => JO })).reason, 'no_folder');
  row.ended = { at: NOW, reason: 'paid' };
  assert.equal((await checkRun({ ...run, revision: row.version }, { client: app, env, email: () => JO })).reason, 'ended');
});

const claimRoute = (app, runs) => { app.http = (inner => async (address, init) => (address.endsWith('/claim') ? { value: { runs: runs.splice(0) }, status: 200 } : inner(address, init)))(app.http); };
const holder = async app => (await appProgress(app, 'weekly-plan').read()).claim?.run ?? null;

test('a chat run claims the progress before it opens, and opens with it; the log names a rename warning', async t => {
  const { app, env, version, ledger } = await saved(t);
  await appProgress(app, 'weekly-plan').claim(runId(1));
  await appProgress(app, 'weekly-plan').write(runId(1), { done: ['monday'] });
  await appProgress(app, 'weekly-plan').release(runId(1));
  const opened = [], logged = [];
  claimRoute(app, [{ id: runId(2), key: 'weekly-plan', revision: version }]);
  const open = async args => { opened.push({ ...args, holder: await holder(app) }); return { agentId: 'agent-2', chatTitle: 'Weekly plan', warning: 'kept "main"' }; };
  assert.equal(await runRound(app, { computer: COMPUTER, open, env, ledger, email: () => JO, log: line => logged.push(line) }), 1);
  assert.deepEqual(app.results, [{ id: runId(2), state: 'started', agentId: 'agent-2', chatTitle: 'Weekly plan' }], 'the warning stays out of the report');
  assert.equal(opened[0].holder, runId(2));
  assert.deepEqual(opened[0].progress, { done: ['monday'] });
  assert.equal(logged[0].message, 'kept "main"');
});

test('a run another run holds opens no chat; a failed open gives the claim back', async t => {
  const { app, env, version, ledger } = await saved(t);
  await appProgress(app, 'weekly-plan').claim(runId(9));
  const runs = [{ id: runId(1), key: 'weekly-plan', revision: version }];
  claimRoute(app, runs);
  await runRound(app, { computer: COMPUTER, open: () => assert.fail('no chat'), env, ledger, now: () => NOW, email: () => JO });
  assert.deepEqual(app.results, [{ id: runId(1), state: 'blocked', reason: 'already_running' }]);
  await appProgress(app, 'weekly-plan').release(runId(9));
  runs.push({ id: runId(2), key: 'weekly-plan', revision: version });
  const open = async () => { throw new PaseoError(EXIT.input, 'paseo run failed'); };
  await runRound(app, { computer: COMPUTER, open, env, ledger, now: () => NOW + RUN_FLOOR_MS, email: () => JO });
  assert.deepEqual(app.results[1], { id: runId(2), state: 'failed', reason: 'open_failed' });
  assert.equal(await holder(app), null);
});

test('a progress read that fails after the claim gives the claim back and opens no chat', async t => {
  const { app, env, version, ledger } = await saved(t);
  claimRoute(app, [{ id: runId(1), key: 'weekly-plan', revision: version }]);
  let fail = true;
  app.http = (inner => async (address, init) => (fail && address.includes('/schedule-progress?') ? { value: null, status: 503 } : inner(address, init)))(app.http);
  await runRound(app, { computer: COMPUTER, open: () => assert.fail('no chat'), env, ledger, now: () => NOW, email: () => JO });
  assert.deepEqual(app.results, [{ id: runId(1), state: 'blocked', reason: 'no_app' }]);
  fail = false;
  assert.equal(await holder(app), null);
});

test('the computer never starts one run twice, nor a schedule more often than its least gap', async t => {
  const { app, env, version, ledger } = await saved(t);
  let now = NOW, queue = [];
  app.http = (inner => async (address, init) => (address.endsWith('/claim') ? { value: { runs: queue.splice(0) }, status: 200 } : inner(address, init)))(app.http);
  const open = async () => ({ agentId: 'agent', chatTitle: 'Weekly plan' }), round = () => runRound(app, { computer: COMPUTER, open, env, ledger, now: () => now, email: () => JO });
  queue = [{ id: runId(1), key: 'weekly-plan', revision: version }]; await round();
  queue = [{ id: runId(2), key: 'weekly-plan', revision: version }]; now += 1000; await round();
  queue = [{ id: runId(1), key: 'weekly-plan', revision: version }]; now += RUN_FLOOR_MS * 2; await round();
  await appProgress(app, 'weekly-plan').release(runId(1));
  queue = [{ id: runId(3), key: 'weekly-plan', revision: version }]; await round();
  assert.deepEqual(app.results.map(result => result.reason ?? result.state), ['started', 'too_soon', 'repeat', 'started']);
  writeFileSync(ledger, 'broken');
  queue = [{ id: runId(4), key: 'weekly-plan', revision: version }]; now += RUN_FLOOR_MS; await round();
  assert.equal(app.results.at(-1).reason, 'no_ledger');
});

test('a background run is handed to the worker, which reports it; a failed hand-over reports no_worker', async t => {
  const { app, env, version, ledger, cwd } = await saved(t, { kind: 'background', run: { cwd: undefined, check: 'scripts/has-work.mjs', minutes: 30 } });
  const spawned = [], spawn = (...args) => { spawned.push(args); return { unref() {} }; };
  const hand = (found, options) => handOver(found, { ...options, spawn, now: () => NOW });
  app.http = (inner => async (address, init) => (address.endsWith('/claim') ? { value: { runs: [{ id: runId(1), key: 'weekly-plan', revision: version }] }, status: 200 } : inner(address, init)))(app.http);
  const logged = [];
  await runRound(app, { computer: COMPUTER, env, ledger, hand, email: () => JO, log: line => logged.push(line), open: () => assert.fail('no chat') });
  assert.deepEqual(app.results, [], 'the worker reports a handed run');
  assert.equal(logged[0].outcome, 'handed');
  const file = path.join(env.HOME, '.wong-stack', 'agent-events', `schedule-run-${runId(1)}.json`);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { event: { event: 'schedule-run', key: 'weekly-plan', run: runId(1), version, origin: ORIGIN, email: JO, cwd },
    at: new Date(NOW).toISOString() });
  assert.deepEqual(spawned[0][1], [path.join(cwd, '.agents/skills/daily/scripts/daily.mjs'), 'ensure']);
  assert.equal(spawned[0][2].detached, true);

  mkdirSync(path.join(env.HOME, 'blocked'));
  writeFileSync(path.join(env.HOME, 'blocked', '.wong-stack'), 'a file, not a folder');
  const result = handOver({ schedule: app.schedules.get('weekly-plan'), run: { id: runId(2) }, origin: ORIGIN, email: JO }, { env: { HOME: path.join(env.HOME, 'blocked') }, spawn });
  assert.deepEqual(result, { state: 'failed', reason: 'no_worker' });
});

test('a missing opener reports failed with its reason', async t => {
  const { app, env, version, ledger } = await saved(t);
  app.http = (inner => async (address, init) => (address.endsWith('/claim') ? { value: { runs: [{ id: runId(1), key: 'weekly-plan', revision: version }] }, status: 200 } : inner(address, init)))(app.http);
  const open = async () => { throw new PaseoError(EXIT.noPaseo, 'no paseo'); };
  await runRound(app, { computer: COMPUTER, open, env, ledger, email: () => JO });
  assert.deepEqual(app.results, [{ id: runId(1), state: 'failed', reason: 'no_opener' }]);
});

test('the mirror sends one row per live Paseo record, from every folder, or nothing when one folder fails', async () => {
  const record = (key, state = 'scheduled') => ({ key, name: key, record: { instructions: 'Read it.' }, binding: { execution: { host: 'paseo', nativeId: `job-${key}` },
    lifecycle: { state }, timing: { mode: 'recurring', cron: '0 10 * * *', timezone: 'UTC', allowedLatenessMs: 60000 } } });
  const folders = { '/one': [record('one'), record('ended', 'cancelled')], '/two': [record('two'), record('one')] };
  const inspect = async id => ({ id, status: 'active', nextRunAt: '2026-10-10T10:00:00Z' });
  const app = fakeApp();
  assert.equal(await mirrorRound(app, { computer: COMPUTER, roots: ['/one', '/two'], list: async dir => ({ records: folders[dir] }), inspect }), 2);
  const [, , sent] = app.calls.find(([, route]) => route === 'mirror');
  assert.deepEqual(sent.schedules[0], { key: 'one', name: 'one', summary: 'Read it.', timing: { mode: 'recurring', cron: '0 10 * * *', timezone: 'UTC', allowedLatenessMs: 60000 },
    nextRunAt: Date.parse('2026-10-10T10:00:00Z'), state: 'on' });
  const broken = fakeApp();
  assert.equal(await mirrorRound(broken, { computer: COMPUTER, roots: ['/one', '/two'], list: async dir => { if (dir === '/two') throw new Error('x'); return { records: folders[dir] }; }, inspect }), null);
  assert.equal(broken.calls.length, 0);
});

test("a run's chat opens at medium thinking or more, with the instructions first, and its workspace takes the schedule's name", async t => {
  const root = folder(t), bin = path.join(root, 'paseo'), log = path.join(root, 'log.jsonl');
  writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (args[0] === 'provider') { console.log(process.env.FAKE_MODELS); process.exit(0); }
if (args[0] === 'workspace') { if (process.env.FAKE_RENAME === 'refuse') { console.error('no rename'); process.exit(1); } console.log(JSON.stringify({ title: args[3] })); process.exit(0); }
if (process.env.FAKE_STDERR !== 'none') console.error('Created workspace wks_1 - main (main)');
console.log(JSON.stringify({ agentId: 'agent-run', title: 'Weekly plan' }));
`);
  chmodSync(bin, 0o755);
  const calls = () => readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const runs = () => calls().filter(args => args[0] === 'run');
  const version = 'a'.repeat(64), finish = `schedule.mjs finish --key weekly-plan --run ${runId(1)} [--progress <json file>] [--done <proof the end is met>]`;
  const open = (models, provider, more = {}, instructions = 'Plan the week.') => openSession({ schedule: { key: 'weekly-plan', name: 'Weekly plan', version, instructions,
    run: { cwd: root, provider } }, run: { id: runId(1) }, title: 'Weekly plan', env: { ...process.env, WONG_PASEO_BIN: bin, FAKE_MODELS: JSON.stringify(models), ...more } });
  assert.deepEqual(await open([{ id: 'gpt-low', defaultThinkingOptionId: 'low' }], 'codex'), { agentId: 'agent-run', chatTitle: 'Weekly plan', warning: null });
  assert.equal(runs()[0][runs()[0].indexOf('--thinking') + 1], 'medium');
  const prompt = runs()[0].at(-1);
  assert.ok(prompt.startsWith('Plan the week.\n'));
  assert.ok(prompt.endsWith(finish));
  assert.deepEqual(calls().at(-1), ['workspace', 'rename', 'wks_1', 'Weekly plan', '--json']);
  await open([{ id: 'claude-high', defaultThinkingOptionId: 'high' }], 'claude/claude-high');
  assert.ok(!runs()[1].includes('--thinking'));
  await open([{ id: 'claude-high', defaultThinkingOptionId: 'high' }]);
  assert.equal(runs()[2][runs()[2].indexOf('--provider') + 1], 'claude', 'Paseo refuses a run with no provider');
  assert.equal(runs()[2][runs()[2].indexOf('--mode') + 1], 'bypassPermissions', 'no one is there to allow a step');
  assert.equal(runs()[0][runs()[0].indexOf('--mode') + 1], 'full-access');
  assert.equal(runs()[0][runs()[0].indexOf('--label') + 1], 'wong-schedule=weekly-plan', 'the Inbox keeps a running schedule chat off the list');

  const refused = await open([], 'claude', { FAKE_RENAME: 'refuse' });
  assert.equal(refused.agentId, 'agent-run', 'a refused name still starts the chat');
  assert.match(refused.warning, /kept Paseo's name, "main"/);
  const unnamed = await open([], 'claude', { FAKE_STDERR: 'none' });
  assert.equal(unnamed.agentId, 'agent-run');
  assert.match(unnamed.warning, /did not print the workspace line/);
  await open([], 'claude', {}, '/news');
  assert.equal(runs().at(-1).at(-1).split('\n')[0], '/news', 'a skill as the instructions reaches the chat app first');
});
