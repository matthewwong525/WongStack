// The helper starts a claimed run only on a version the signed-in person approved on this computer.
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { approve, approvedVersion, approvalsFile } from '../../.agents/skills/schedule/scripts/lib/approvals.mjs';
import { definition, saveDefinition } from '../../.agents/skills/schedule/scripts/lib/app.mjs';
import { FETCH_TIMEOUT_MS, RUN_FLOOR_MS, checkRun, handOver, mirrorRound, openSession, runRound } from '../../.agents/skills/schedule/scripts/lib/app-runs.mjs';
import { appProgress } from '../../.agents/skills/schedule/scripts/lib/progress.mjs';
import { scheduleVersion } from '../../.agents/skills/schedule/scripts/lib/version.mjs';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';
import { freshBase } from '../../.agents/skills/schedule/scripts/workspace.mjs';
import { logAction } from '../../.agents/skills/hand-over/scripts/lib/helper-log.mjs';
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
  assert.equal(logged[0].warning, 'kept "main"');
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

/** A fake `paseo` that logs its arguments to `log`: `run` prints Paseo's *Created workspace* line on stderr, and
 *  `workspace rename` fails when FAKE_RENAME_FAIL is set. */
function fakePaseo(root) {
  const bin = path.join(root, 'paseo'), log = path.join(root, 'log.jsonl');
  writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (args[0] === 'provider') { console.log(process.env.FAKE_MODELS); process.exit(0); }
if (args[0] === 'workspace') {
  if (process.env.FAKE_RENAME_FAIL) { console.error('rename refused'); process.exit(1); }
  console.log(JSON.stringify({ title: args[3] })); process.exit(0);
}
console.error('Created workspace ws-run - main (main)');
console.log(JSON.stringify({ agentId: 'agent-run', title: 'Weekly plan' }));
`);
  chmodSync(bin, 0o755);
  const calls = kind => readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)).filter(args => args[0] === kind);
  return { bin, calls };
}

/** A git project with a `main` branch, cloned from an origin, as a schedule's folder. */
function gitProject(t) {
  const origin = folder(t), work = path.join(folder(t), 'app');
  const run = (cwd, ...args) => execFileSync('git', ['-C', cwd, '-c', 'user.name=Jo', '-c', 'user.email=jo@example.test', ...args], { stdio: 'ignore' });
  run(origin, 'init', '-q', '-b', 'main');
  run(origin, 'commit', '-q', '--allow-empty', '-m', 'first');
  execFileSync('git', ['clone', '-q', origin, work], { stdio: 'ignore' });
  return work;
}

test("a run's chat opens at medium thinking or more, with the approved instructions first and the finish line last", async t => {
  const root = folder(t), { bin, calls } = fakePaseo(root);
  const runs = () => calls('run');
  const version = 'a'.repeat(64);
  const finish = `schedule.mjs finish --key weekly-plan --run ${runId(1)} [--progress <json file>] [--done <proof the end is met>]`;
  const open = (models, provider, instructions = 'Plan the week.') => openSession({ schedule: { key: 'weekly-plan', name: 'Weekly plan', version, instructions,
    run: { cwd: root, provider } }, run: { id: runId(1) }, title: 'Weekly plan', env: { ...process.env, WONG_PASEO_BIN: bin, FAKE_MODELS: JSON.stringify(models) } });
  assert.deepEqual(await open([{ id: 'gpt-low', defaultThinkingOptionId: 'low' }], 'codex'), { agentId: 'agent-run', chatTitle: 'Weekly plan' });
  assert.equal(runs()[0][runs()[0].indexOf('--thinking') + 1], 'medium');
  const prompt = runs()[0].at(-1);
  assert.ok(prompt.startsWith('Plan the week.\n'));
  assert.ok(prompt.endsWith(finish));
  await open([{ id: 'claude-high', defaultThinkingOptionId: 'high' }], 'claude/claude-high');
  assert.ok(!runs()[1].includes('--thinking'));
  await open([{ id: 'claude-high', defaultThinkingOptionId: 'high' }]);
  assert.equal(runs()[2][runs()[2].indexOf('--provider') + 1], 'claude', 'Paseo refuses a run with no provider');
  assert.equal(runs()[2][runs()[2].indexOf('--mode') + 1], 'bypassPermissions', 'no one is there to allow a step');
  assert.equal(runs()[0][runs()[0].indexOf('--mode') + 1], 'full-access');
  assert.equal(runs()[0][runs()[0].indexOf('--label') + 1], 'wong-schedule=weekly-plan', 'the Inbox keeps a running schedule chat off the list');

  await open([], 'claude', '/news');
  assert.equal(runs().at(-1).at(-1).split('\n')[0], '/news', 'a skill as the instructions reaches the chat app first');
});

test('a chat run opens in its own workspace named after the schedule: a fresh copy in a git project, else its folder', async t => {
  const root = folder(t), { bin, calls } = fakePaseo(root), version = 'a'.repeat(64);
  const open = (cwd, extra = {}) => openSession({ schedule: { key: 'standup', name: 'Standup', version, run: { cwd } }, run: { id: runId(1) },
    title: 'Standup', env: { ...process.env, WONG_PASEO_BIN: bin, FAKE_MODELS: '[]', ...extra } });

  assert.deepEqual(await open(gitProject(t)), { agentId: 'agent-run', chatTitle: 'Weekly plan' });
  const [inGit] = calls('run');
  assert.equal(inGit[inGit.indexOf('--new-workspace') + 1], 'worktree', 'the run never works on the main copy');
  assert.equal(inGit[inGit.indexOf('--worktree-mode') + 1], 'branch-off');
  assert.equal(inGit[inGit.indexOf('--base') + 1], 'origin/main');
  assert.deepEqual(calls('workspace')[0].slice(0, 4), ['workspace', 'rename', 'ws-run', 'Standup'], 'the sidebar shows the schedule, not main');

  await open(root);
  const plain = calls('run')[1];
  assert.equal(plain[plain.indexOf('--new-workspace') + 1], 'local', 'a worktree needs git');
  assert.ok(!plain.includes('--base'));
  assert.deepEqual(calls('workspace')[1].slice(0, 4), ['workspace', 'rename', 'ws-run', 'Standup']);

  const refused = await open(root, { FAKE_RENAME_FAIL: '1' });
  assert.equal(refused.agentId, 'agent-run', 'a refused rename still starts the run');
  assert.match(refused.warning, /kept Paseo's name, "main"/);
  for (const args of calls('run')) assert.equal(args[args.indexOf('--label') + 1], 'wong-schedule=standup');
});

test("the helper's real log keeps a run's workspace warning on its run line", async t => {
  const { app, env, version } = await saved(t);
  claimRoute(app, [{ id: runId(1), key: 'weekly-plan', revision: version }]);
  const open = async () => ({ agentId: 'agent-1', chatTitle: 'Weekly plan', warning: 'The workspace kept Paseo\'s name, "main": refused' });
  await runRound(app, { computer: COMPUTER, open, env, ledger: path.join(env.HOME, 'runs.json'), email: () => JO, log: entry => logAction(entry, { env }) });
  const [line] = readFileSync(path.join(env.HOME, '.wong-stack', 'helper', 'log.jsonl'), 'utf8').trim().split('\n').map(row => JSON.parse(row));
  assert.equal(line.event, 'run');
  assert.equal(line.outcome, 'started');
  assert.match(line.warning, /kept Paseo's name/, 'the log drops a field it does not allow, so the warning must be one');
});

test('a git project with no default branch to copy still starts its run, named, in its folder', async t => {
  const root = folder(t), { bin, calls } = fakePaseo(root), work = folder(t);
  execFileSync('git', ['-C', work, '-c', 'user.name=Jo', '-c', 'user.email=jo@example.test', 'init', '-q', '-b', 'trunk'], { stdio: 'ignore' });
  execFileSync('git', ['-C', work, '-c', 'user.name=Jo', '-c', 'user.email=jo@example.test', 'commit', '-q', '--allow-empty', '-m', 'first'], { stdio: 'ignore' });
  const opened = await openSession({ schedule: { key: 'standup', name: 'Standup', version: 'a'.repeat(64), run: { cwd: work } }, run: { id: runId(1) },
    title: 'Standup', env: { ...process.env, WONG_PASEO_BIN: bin, FAKE_MODELS: '[]', FAKE_RENAME_FAIL: '1' } });
  const [args] = calls('run');
  assert.equal(args[args.indexOf('--new-workspace') + 1], 'local');
  assert.ok(!args.includes('--base'));
  assert.deepEqual(calls('workspace')[0].slice(0, 4), ['workspace', 'rename', 'ws-run', 'Standup']);
  assert.equal(opened.agentId, 'agent-run');
  assert.match(opened.warning, /not a fresh copy[\s\S]*\nThe workspace kept Paseo's name/, 'both warnings reach the log, one per line');
});

test('a fetch that hangs stops at its timeout, and the workspace starts from the last fetched copy', async t => {
  const work = gitProject(t);
  // The remote's transport never answers.
  execFileSync('git', ['-C', work, 'remote', 'set-url', 'origin', 'ssh://hang.invalid/app']);
  execFileSync('git', ['-C', work, 'config', 'core.sshCommand', 'sh -c "sleep 5"']);
  const started = Date.now();
  const { base, warning } = await freshBase(work, 'main', { fetch: true, timeout: 300 });
  assert.ok(Date.now() - started < 3000, 'the helper does not wait on a hung fetch');
  assert.equal(base, 'origin/main');
  assert.match(warning, /Could not fetch origin\/main, so the workspace starts from the last fetched copy: no answer in 0.3 s/);
  assert.equal(FETCH_TIMEOUT_MS, 60_000);
});
