// Daily as a module: the profile's parts, the schedule store it finds, the Paseo store, and the worker's own line-up.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { forgetProfile, loadProfile, slot, slotNow, slotResult } from '../../.agents/skills/daily/scripts/lib/slot.mjs';
import { LINE_UP, lineUpOffFile, loadSweeps, makeWorker } from '../../.agents/skills/daily/scripts/worker.mjs';
import { paseoStore } from '../../.agents/skills/schedule/scripts/lib/paseo-store.mjs';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';

const roots = [];
afterEach(() => { forgetProfile(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'daily-module-')); roots.push(dir); return dir; };
/** A profile file with `body` as its default export, and the env that points Daily at it. */
function profile(body) {
  const file = join(temp(), 'profile.mjs');
  writeFileSync(file, `export default ${body};\n`);
  return { WONG_DAILY_PROFILE: file };
}

// ---------------------------------------------------------------------------
// The profile's parts

test('with no profile file every part is empty', async () => {
  const env = { WONG_DAILY_PROFILE: join(temp(), 'none.mjs') };
  assert.deepEqual(await loadProfile(env), {});
  for (const part of ['person', 'chatName', 'schedules', 'offeredChoices', 'prepareRun', 'checkout']) {
    assert.equal(await slot(part, [], { env }), undefined, part);
    assert.equal(slotNow(part), undefined, part);
  }
});

test('a filled part answers: a function with its arguments, an object as it is; slotNow only for a sync answer', async () => {
  const env = profile(`{ person: cwd => ({ email: 'jo@example.com', cwd }), schedules: { name: 'stand-in' },
    chatName: async () => ({ step: 'PLAN', task: 'Late' }) }`);
  assert.deepEqual(await slot('person', ['/w'], { env }), { email: 'jo@example.com', cwd: '/w' });
  assert.equal((await slot('schedules', [], { env })).name, 'stand-in');
  assert.deepEqual(await slot('chatName', [], { env }), { step: 'PLAN', task: 'Late' });
  await loadProfile(env);
  assert.deepEqual(slotNow('person', ['/x']), { email: 'jo@example.com', cwd: '/x' });
  assert.equal(slotNow('chatName'), undefined, 'a hook can not wait for a promise');
});

test('a part that throws or answers late counts as empty, and journals once a day', async () => {
  const env = profile(`{ person: () => { throw new Error('no app'); }, chatName: () => new Promise(() => {}) }`);
  const stateDir = temp(), journal = { stateDir, timezone: 'UTC' }, now = new Date('2026-11-11T12:00:00Z');
  assert.equal(await slot('person', [], { env, journal, now }), undefined);
  assert.equal(await slot('person', [], { env, journal, now }), undefined);
  assert.equal(await slot('chatName', [], { env, journal, now, ms: 20 }), undefined);
  assert.deepEqual(readLines({ stateDir }).map(entry => entry.line), ["Daily's person part failed and counts as empty: no app",
    "Daily's chatName part failed and counts as empty: no answer in 0.02 seconds"]);
  await slot('person', [], { env, journal, now: new Date('2026-11-12T12:00:00Z') });
  assert.equal(readLines({ stateDir }).length, 3, 'a new day journals again');
});

test('a profile that does not load counts as empty', async () => {
  const env = profile('{ person: ');
  assert.equal(await slot('person', [], { env, journal: null }), undefined);
});

test('slotResult tells an absent part from a failed one: no profile, no part, a throw, a broken profile, a late answer', async () => {
  assert.deepEqual(await slotResult('checkout', [], { env: { WONG_DAILY_PROFILE: join(temp(), 'none.mjs') } }), { absent: true });
  forgetProfile();
  const env = profile(`{ person: () => ({ email: 'jo@example.com' }), checkout: () => { throw new Error('no git'); },
    chatName: () => new Promise(() => {}) }`);
  assert.deepEqual(await slotResult('prepareRun', [], { env }), { absent: true });
  assert.deepEqual(await slotResult('person', [], { env }), { value: { email: 'jo@example.com' } });
  assert.match((await slotResult('checkout', [], { env })).error.message, /no git/);
  assert.match((await slotResult('chatName', [], { env, ms: 20 })).error.message, /no answer in 0\.02 seconds/);
  forgetProfile();
  assert.ok((await slotResult('checkout', [], { env: profile('{ checkout: ') })).error, 'a profile that does not load');
});

test('a profile with a syntax error crashes no entry point: the stop hook exits 0, and the check names the error', () => {
  const scripts = new URL('../../.agents/skills/daily/scripts/', import.meta.url).pathname;
  const git = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  const env = { ...process.env, ...profile('{ person: '), PATH: `${dirname(process.execPath)}:${dirname(git)}` };
  const stop = spawnSync(process.execPath, [join(scripts, 'stop-check.mjs'), 'stop', '--agent', 'claude'],
    { encoding: 'utf8', env, input: JSON.stringify({ session_id: 'broken', transcript_path: join(temp(), 'none.jsonl'), cwd: temp() }) });
  assert.equal(stop.status, 0, stop.stderr);
  assert.equal(stop.stdout, '');
  assert.equal(stop.stderr.match(/Daily's profile part failed/g)?.length, 1, 'one line, once');
  // Its own settings file: a CI runner's git email names no person.
  const config = join(temp(), 'jo.json');
  writeFileSync(config, JSON.stringify({ version: 1, person: 'jo', emails: ['jo@example.com'], timezone: 'UTC', morning: '08:00', sources: {}, places: { home: '.' }, addons: { morning: [], pass: [] } }));
  const checked = spawnSync(process.execPath, [join(scripts, 'daily.mjs'), 'check', '--config', config], { encoding: 'utf8', env });
  assert.doesNotMatch(checked.stderr, /\n\s+at /, 'no stack trace');
  const report = JSON.parse(checked.stdout);
  assert.equal(report.status, 'failed', 'a broken profile is never ready');
  assert.match(report.profileError, /Unexpected/);
  assert.deepEqual([report.profile, report.store], [[], 'off']);
});

// ---------------------------------------------------------------------------
// The schedule store

/** A stand-in store that keeps each call. */
function standIn() {
  const calls = [];
  const keep = name => async (...args) => { calls.push([name, ...args]); return { done: name }; };
  return { calls, store: { name: 'stand-in', list: keep('list'), get: keep('get'), show: keep('show'), save: keep('save'), approve: keep('approve'),
    control: keep('control'), defaults: keep('defaults'), extra: keep('extra') } };
}
async function cli(argv, world) {
  let text = '';
  const code = await main(argv, { root: '/w', primary: '/w', env: {}, out: chunk => { text += chunk; }, ...world });
  return { exit: code, ...JSON.parse(text) };
}

test('schedule.mjs sends each command to the store it finds; with none it says so and exits 3', async () => {
  const { calls, store } = standIn();
  const file = join(temp(), 'plan.json');
  writeFileSync(file, JSON.stringify({ key: 'tidy', timing: { mode: 'recurring', cron: '0 9 * * 1' } }));
  assert.equal((await cli(['store'], { store })).store, 'stand-in');
  assert.equal((await cli([], { store })).done, 'list');
  await cli(['save', '--file', file, '--approve'], { store });
  await cli(['show', '--file', file], { store });
  await cli(['pause', 'tidy'], { store });
  await cli(['move-in', '--dry-run'], { store });
  assert.deepEqual(calls.map(([name]) => name), ['list', 'save', 'show', 'control', 'extra']);
  assert.equal(calls[1][1].key, 'tidy');
  assert.deepEqual([calls[3][1], calls[3][2]], ['pause', 'tidy']);
  assert.equal((await cli(['approve', 'tidy'], { store })).ok, false, 'an approval names its version');
  const none = await cli(['list'], { store: null });
  assert.deepEqual([none.exit, none.ok, none.code], [3, false, 'no-store']);
  assert.match(none.error, /^No schedule store/);
  assert.equal(none.crontab, "<minute> <hour> <day> <month> <weekday> cd '/w' && <command>", 'a line for the computer\'s own timer');
  assert.ok(none.error.endsWith(none.crontab));
  const weekly = await cli(['save', '--file', file], { store: null, primary: "/w/jo's shop" });
  assert.equal(weekly.crontab, "0 9 * * 1 cd '/w/jo'\\''s shop' && <command>", 'the plan\'s own time, the folder quoted');
  assert.equal((await cli(['store'], { store: null })).store, 'off');
  writeFileSync(file, JSON.stringify({ key: 'tidy', timing: { mode: 'recurring', cron: '0 9 * * 1', timezone: 'America/Toronto' } }));
  const zoned = await cli(['save', '--file', file], { store: null });
  assert.match(zoned.error, /The time is in America\/Toronto/, 'the plan\'s timezone is named beside the line');
  assert.equal(zoned.timezone, 'America/Toronto');
  const bare = { PATH: temp(), WONG_DAILY_PROFILE: join(temp(), 'none.mjs') };
  assert.equal((await cli(['store'], { env: bare })).store, 'off', 'no profile store and no Paseo');
});

/** A Paseo store over a fake `paseo` call that keeps each command. */
function fakePaseo(rows = []) {
  const calls = [];
  const call = async args => {
    calls.push(args.join(' '));
    if (args[1] === 'ls') return rows;
    if (args[1] === 'create') return { id: 'job-9' };
    return { ok: true };
  };
  return { calls, store: paseoStore({}, call) };
}
const plan = (more = {}) => ({ key: 'weekly-plan', name: 'Weekly plan', instructions: 'Plan the week.',
  timing: { mode: 'recurring', cron: '0 9 * * 1', timezone: 'America/Toronto', allowedLatenessMs: 600000 }, ...more });
const world = { primary: '/w/main' };

test('the Paseo store saves only after the OK, as a chat schedule named for its key; it lists only keyed schedules', async () => {
  const { calls, store } = fakePaseo([{ id: 'job-1', name: 'standup: Standup', status: 'active' }, { id: 'job-2', name: 'Not ours' }]);
  const shown = await store.show(null, world, plan());
  assert.match(shown.text, /^> Plan the week\.$/m);
  await assert.rejects(store.save(plan(), {}, world), /get the person's OK/);
  const saved = await store.save(plan(), { approve: true, version: shown.version }, world);
  assert.deepEqual(saved, { key: 'weekly-plan', version: shown.version, host: 'paseo', id: 'job-9' });
  assert.equal(calls.at(-1), 'schedule create --name weekly-plan: Weekly plan --cron 0 9 * * 1 --timezone America/Toronto --cwd /w/main --provider claude --mode bypassPermissions -- Plan the week.');
  assert.deepEqual((await store.list()).schedules.map(row => [row.key, row.name, row.state]), [['standup', 'Standup', 'active']]);
  assert.equal((await store.control('pause', 'standup')).done, 'pause');
  assert.equal(calls.at(-1), 'schedule pause job-1');
  await assert.rejects(store.control('pause', 'nope'), /no schedule with this key/);
});

test('a Paseo schedule runs unattended in the mode the app uses for its provider, unless it names its own', async () => {
  const { calls, store } = fakePaseo();
  const modeOf = async run => { await store.save(plan({ run }), { approve: true }, world); return calls.at(-1).match(/--provider (\S+)(?: --mode (\S+))?/).slice(1); };
  assert.deepEqual(await modeOf(undefined), ['claude', 'bypassPermissions']);
  assert.deepEqual(await modeOf({ provider: 'codex' }), ['codex', 'full-access']);
  assert.deepEqual(await modeOf({ provider: 'claude', mode: 'default' }), ['claude', 'default'], "the schedule's own mode wins");
});

test('the Paseo store refuses what Paseo can not run, and a one-time run becomes one cron run', async () => {
  const { calls, store } = fakePaseo();
  for (const [more, reason] of [[{ kind: 'background' }, /only as a chat/], [{ run: { check: 'x.mjs' } }, /no check/], [{ until: 'done' }, /goal is met/]]) {
    await assert.rejects(store.save(plan(more), { approve: true }, world), reason);
  }
  await assert.rejects(store.save(plan(), { approve: true, team: 'a@b.co' }, world), /this computer only/);
  await assert.rejects(store.defaults(), /line-up runs from Daily's worker/);
  await store.save(plan({ timing: { mode: 'once', dueAt: '2026-11-12T14:30:00Z', timezone: 'America/Toronto', allowedLatenessMs: 600000 } }), { approve: true }, world);
  assert.match(calls.at(-1), / --cron 30 9 12 11 \* --max-runs 1 --timezone America\/Toronto /);
});

// ---------------------------------------------------------------------------
// The worker's own line-up, with no schedule store

test('with no schedule store the worker runs the line-up every 5 minutes, until the person turns it off', async () => {
  const stateDir = temp(), checks = [];
  let t = Date.parse('2026-11-11T14:00:00Z');
  const worker = makeWorker({ stateDir, project: '/repo', timezone: 'UTC', sweeps: loadSweeps({ project: '/repo' }), env: { PATH: '/bin' },
    now: () => t, call: async () => [], lineUp: LINE_UP, runCheck: async ({ sweep }) => { checks.push(sweep.check); return '{"run":{"chats":2}}\n'; } });
  const queued = () => JSON.parse(readFileSync(join(stateDir, 'worker-queue.json'), 'utf8')).queue.map(item => [item.key, item.title, item.minutes]);
  await worker.sweep();
  assert.deepEqual([checks, queued()], [[LINE_UP.check], [['line-up', 'Keep my chats in line', 15]]]);
  t += 60e3;
  await worker.sweep();
  assert.equal(checks.length, 1, 'not again within 5 minutes');
  writeFileSync(lineUpOffFile(stateDir), '{}');
  t += 10 * 60e3;
  await worker.sweep();
  assert.equal(checks.length, 1, 'off: no line-up');
  assert.ok(existsSync(LINE_UP.check));
});

test('a profile that fails to load stops schedule.mjs; nothing falls back to Paseo', async () => {
  const file = join(temp(), 'profile.mjs');
  writeFileSync(file, 'export default {;\n');
  const failed = await cli(['list'], { env: { WONG_DAILY_PROFILE: file } });
  assert.deepEqual([failed.exit, failed.ok, failed.code], [3, false, 'store-failed']);
  assert.match(failed.error, /nothing moved to Paseo/);
});
