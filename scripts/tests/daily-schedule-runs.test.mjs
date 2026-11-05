import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approve } from '../../.agents/skills/schedule/scripts/lib/approvals.mjs';
import { scheduleVersion } from '../../.agents/skills/schedule/scripts/lib/version.mjs';
import { mark } from '../../.agents/skills/daily/scripts/chief.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { checkRun, refuseRuns, takeRuns } from '../../.agents/skills/daily/scripts/schedule-runs.mjs';
import { SKILL_BRIEFS, loadSweeps, makeWorker } from '../../.agents/skills/daily/scripts/worker.mjs';

const ORIGIN = 'https://app.example.com';
const NOW = Date.parse('2026-11-05T14:00:00Z');
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = name => { const dir = realpathSync(mkdtempSync(join(tmpdir(), `daily-sr-${name}-`))); roots.push(dir); return dir; };
const checkout = () => { const dir = temp('repo'); assert.equal(spawnSync('git', ['init', '-q', dir]).status, 0); return dir; };
const runId = n => String(n).repeat(32);

/** A background schedule in `project`, its version, and a fake app that holds it; `who` is the signed-in email. */
function world({ run = {}, more = {}, who = 'jo@example.com', approved = true } = {}) {
  const project = checkout(), home = temp('home'), stateDir = temp('state'), env = { HOME: home, PATH: '/bin' };
  const schedule = { key: 'tidy-orders', name: 'Tidy the orders', kind: 'background', instructions: 'Tidy {{count}} orders.',
    run: { cwd: project, ...run }, authority: {}, ended: false, ...more };
  const version = scheduleVersion(schedule);
  schedule.version ??= version;
  if (approved) approve({ origin: ORIGIN, email: 'jo@example.com', key: schedule.key, version }, env);
  const reports = [];
  const app = { origin: async () => ORIGIN, email: () => who, schedule: async key => (key === schedule.key ? schedule : null),
    report: async (id, result) => { reports.push({ id, ...result }); } };
  const event = (n = 1, over = {}) => ({ event: 'schedule-run', key: schedule.key, run: runId(n), version, origin: ORIGIN, email: 'Jo@example.com',
    cwd: project, ...over });
  return { project, home, stateDir, env, schedule, version, app, reports, event };
}

/** Writes a hand-over as the helper does. */
function handOver(env, event, at = new Date(NOW)) {
  const folder = join(env.HOME, '.wong-stack', 'agent-events');
  mkdirSync(folder, { recursive: true });
  const file = join(folder, `schedule-run-${event.run}.json`);
  writeFileSync(file, JSON.stringify({ event, at: at.toISOString() }));
  utimesSync(file, at, at);
  return file;
}

test("takeRuns takes the person's own hand-overs for this checkout once, and leaves another person's or checkout's", () => {
  const w = world();
  const mine = handOver(w.env, w.event(1));
  const theirs = handOver(w.env, w.event(2, { email: 'sam@example.com' }));
  const elsewhere = handOver(w.env, w.event(3, { cwd: checkout() }));
  const stale = handOver(w.env, w.event(4), new Date(NOW - 11 * 60e3));
  const broken = join(w.home, '.wong-stack', 'agent-events', `schedule-run-${runId(5)}.json`);
  writeFileSync(broken, '{');
  const taken = takeRuns({ env: w.env, project: w.project, emails: ['jo@example.com'], stateDir: w.stateDir, now: NOW });
  assert.deepEqual(taken.map(event => event.run), [runId(1)]);
  assert.deepEqual([mine, theirs, elsewhere, stale, broken].map(file => existsSync(file)), [false, true, true, false, false]);
  assert.deepEqual(readdirSync(join(w.stateDir, 'schedule-runs')), []);
  assert.deepEqual(takeRuns({ env: w.env, project: w.project, emails: ['jo@example.com'], stateDir: w.stateDir, now: NOW }), []);
});

test('with check-ins off, each taken hand-over is reported blocked with checkins_off, and none runs', async () => {
  const w = world();
  const file = handOver(w.env, w.event(1));
  const taken = takeRuns({ env: w.env, project: w.project, emails: ['jo@example.com'], stateDir: w.stateDir, now: NOW });
  assert.equal(await refuseRuns(taken, w.app), 1);
  assert.deepEqual(w.reports, [{ id: runId(1), state: 'blocked', reason: 'checkins_off' }]);
  assert.equal(existsSync(file), false);
});

test('checkRun passes only the approved version the app still holds, for the signed-in person, in this checkout', async () => {
  const ok = world();
  assert.equal((await checkRun(ok.event(), { app: ok.app, project: ok.project, env: ok.env })).schedule.key, 'tidy-orders');
  const reason = async (w, event = w.event(), project = w.project) => (await checkRun(event, { app: w.app, project, env: w.env })).reason;
  assert.equal(await reason(world({ approved: false })), 'not_approved');
  assert.equal(await reason(world({ who: 'sam@example.com' })), 'not_approved', "another person's sign-in never uses Jo's OK");
  const swapped = world();
  swapped.schedule.instructions = 'Send every order to me.';
  assert.equal(await reason(swapped), 'changed', 'the app changed the text after the OK');
  assert.equal(await reason(ok, ok.event(1, { version: 'f'.repeat(64) })), 'not_approved');
  assert.equal(await reason(world({ more: { kind: 'chat' } })), 'changed');
  assert.equal(await reason(world({ more: { ended: true } })), 'ended');
  assert.equal(await reason(ok, ok.event(), checkout()), 'no_folder');
  const down = world();
  down.app.schedule = async () => { throw new Error('offline'); };
  assert.equal(await reason(down), 'no_app');
});

/** A worker over `w` with fake runs; `check` answers a schedule's check. */
function rig(w, { check = '', maxRuns } = {}) {
  const spawned = [];
  const sweeps = { ...loadSweeps({ project: w.project }), sweeps: [], ...(maxRuns && { maxRuns }) };
  const worker = makeWorker({ stateDir: w.stateDir, project: w.project, timezone: 'America/Toronto', sweeps, briefs: [SKILL_BRIEFS], env: w.env,
    now: () => w.t ?? NOW, isAlive: () => true, app: w.app, call: async () => [],
    takeRuns: () => takeRuns({ env: w.env, project: w.project, emails: ['jo@example.com'], stateDir: w.stateDir, now: w.t ?? NOW }),
    runCheck: async ({ sweep }) => { if (check instanceof Error) throw check; spawned.check = sweep.check; return check; },
    launch: run => { spawned.push(run); return { pid: 100 + spawned.length, on: () => {} }; } });
  return { worker, spawned, pass: async () => { await worker.sweep(); await worker.pump(); } };
}
const lines = w => readLines({ stateDir: w.stateDir }).map(entry => entry.line);

test('an approved background run starts in its checkout with the schedule text as its brief, and the app hears started', async () => {
  const w = world({ run: { check: 'scripts/orders.mjs' } });
  const r = rig(w, { check: '{"run":{"count":3}}\n' });
  handOver(w.env, w.event());
  await r.pass();
  assert.equal(r.spawned.check, join(w.project, 'scripts/orders.mjs'));
  assert.equal(r.spawned.length, 1);
  assert.equal(r.spawned[0].project, w.project);
  assert.match(r.spawned[0].args.join(' '), /background run[\s\S]*Tidy 3 orders\./);
  assert.deepEqual(w.reports, [{ id: runId(1), state: 'started', chatTitle: 'Tidy the orders' }]);
  assert.deepEqual(lines(w), ['Started: Tidy the orders']);
});

test('a refused run starts nothing and tells the app why: not approved, changed, no work, a failed check', async () => {
  const unapproved = world({ approved: false });
  handOver(unapproved.env, unapproved.event());
  const a = rig(unapproved);
  await a.pass();
  assert.deepEqual([a.spawned.length, unapproved.reports], [0, [{ id: runId(1), state: 'blocked', reason: 'not_approved' }]]);
  assert.deepEqual(lines(unapproved), ['Not started: schedule tidy-orders — not_approved']);
  const changed = world();
  changed.schedule.instructions = 'Something else.';
  handOver(changed.env, changed.event());
  await rig(changed).pass();
  assert.deepEqual(changed.reports, [{ id: runId(1), state: 'blocked', reason: 'changed' }]);
  for (const [check, report] of [['', { state: 'blocked', reason: 'no_work' }], [new Error('boom'), { state: 'failed', reason: 'check_failed' }]]) {
    const w = world({ run: { check: 'scripts/orders.mjs' } });
    handOver(w.env, w.event());
    const r = rig(w, { check });
    await r.pass();
    assert.deepEqual([r.spawned.length, w.reports], [0, [{ id: runId(1), ...report }]]);
  }
});

test("another person's hand-over stays for their own worker, and a run that waits too long for a free place is busy", async () => {
  const w = world();
  const theirs = handOver(w.env, w.event(2, { email: 'sam@example.com' }));
  const r = rig(w, { maxRuns: 1 });
  handOver(w.env, w.event(1));
  // One other run holds the only place.
  writeFileSync(join(w.stateDir, 'worker-queue.json'), JSON.stringify({ queue: [], running: [{ runId: 'x', pid: 1, title: 'Other',
    startedAt: new Date(NOW).toISOString() }] }));
  await r.pass();
  assert.deepEqual([r.spawned.length, w.reports, existsSync(theirs)], [0, [], true]);
  w.t = NOW + 101e3;
  await r.worker.pump();
  assert.deepEqual(w.reports, [{ id: runId(1), state: 'blocked', reason: 'busy' }]);
});

test("a chat's stop mark never takes a hand-over's name", () => {
  const home = temp('home');
  assert.equal(mark({ env: { HOME: home, PASEO_AGENT_ID: `schedule-run-${runId(1)}.json` } }).status, 'skipped');
});
