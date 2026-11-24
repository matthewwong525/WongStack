// Daily's schedule store: the one schedule.mjs finds, the Paseo store, and the worker's own line-up with no store.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LINE_UP, lineUpOffFile, loadSweeps, makeWorker } from '../../.agents/skills/daily/scripts/worker.mjs';
import { paseoStore } from '../../.agents/skills/schedule/scripts/lib/paseo-store.mjs';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'daily-store-')); roots.push(dir); return dir; };

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
  await cli(['hosts'], { store });
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
  const bare = { env: { PATH: temp() }, appStore: async () => null };
  assert.equal((await cli(['store'], bare)).store, 'off', 'no company app code and no Paseo');
  assert.equal((await cli(['store'], { env: { PATH: temp() } })).store, 'app', "the repo's own store is the company app's");
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

test('a schedule store that fails to load stops schedule.mjs; nothing falls back to Paseo', async () => {
  const failed = await cli(['list'], { appStore: async () => { throw new Error('broken'); } });
  assert.deepEqual([failed.exit, failed.ok, failed.code], [3, false, 'store-failed']);
  assert.match(failed.error, /nothing moved to Paseo/);
});
