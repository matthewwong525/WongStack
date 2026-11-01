import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headlessCommand } from '../../.agents/skills/memory/scripts/lib/headless.mjs';
import { validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { commands } from '../../.agents/skills/daily/scripts/daily.mjs';
import { addLine, readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { DEFAULT_SWEEPS, SKILL_BRIEFS, briefFolders, briefFor, dueKey, fillText, loadSweeps, makeWorker, runEnv, runOf, serveDaily, serveWorker,
  workerPass }
  from '../../.agents/skills/daily/scripts/worker.mjs';

const TZ = 'America/Toronto';
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function folder() {
  const dir = mkdtempSync(join(tmpdir(), 'daily-worker-'));
  roots.push(dir);
  writeFileSync(join(dir, 'daily-workspace.json'), JSON.stringify({ agentId: 'daily-1' }));
  return dir;
}
const defaults = () => loadSweeps({ project: '/repo' });

/** A worker with fake runs, clock, Paseo and Daily chat. `world` holds what each fake saw. */
function rig({ stateDir = folder(), sweeps = defaults(), start = '2026-10-31T14:00:00Z', briefs = [SKILL_BRIEFS], agent } = {}) {
  const world = { t: Date.parse(start), spawned: [], live: new Set(), exits: {}, typed: {}, pending: [], calls: [], sent: [],
    killed: [], checks: [], checkOut: '', nextPid: 100 };
  const options = {
    stateDir, project: '/repo', timezone: TZ, sweeps, briefs, agent, env: { PASEO_AGENT_ID: 'daily-1', PATH: '/bin' },
    now: () => world.t, typedAt: id => world.typed[id] ?? null, isAlive: pid => world.live.has(pid), kill: pid => world.killed.push(pid),
    call: async args => { world.calls.push(args.join(' ')); return args[0] === 'permit' ? world.pending : []; },
    launch: run => {
      const pid = world.nextPid++;
      world.spawned.push({ ...run, pid, brief: run.args.find(arg => arg.includes('background run')) });
      world.live.add(pid);
      return { pid, on: (name, done) => { world.exits[pid] = done; } };
    },
    sendDaily: async text => { world.sent.push(text); },
    runCheck: async input => { world.checks.push(input); return world.checkOut; },
  };
  const make = (more = {}) => makeWorker({ ...options, ...more });
  return { world, stateDir, worker: make(), make, at: text => { world.t = Date.parse(text); },
    end: pid => { world.live.delete(pid); world.exits[pid]?.(); } };
}
const stop = (agent, more = {}) => ({ event: 'stopped', agent, title: agent, workspace: agent, source: 'own', status: 'idle', last: 'Next: tests', mark: 'm1', ...more });
const ask = (agent, id) => ({ event: 'asking', agent, title: agent, workspace: agent, source: 'own', request: { id, name: 'AskUserQuestion', description: null }, last: '?', mark: 'm2' });
const lines = stateDir => readLines({ stateDir }).map(entry => entry.line);
const agentOf = run => JSON.parse(/```json\n(.*)\n```/.exec(run.brief)[1]).agent;
/** A briefs folder with the skill's header and `extra` briefs, as an install's own folder holds them. */
function briefsWith(extra) {
  const dir = folder();
  copyFileSync(join(SKILL_BRIEFS, 'header.md'), join(dir, 'header.md'));
  for (const [name, text] of Object.entries(extra)) writeFileSync(join(dir, name), text);
  return dir;
}

test('no event sends anything to the Daily chat: stops start runs up to the cap, and the rest goes to the journal', async () => {
  const { world, worker, stateDir } = rig();
  await workerPass({ worker, stateDir, seconds: 60, now: () => world.t, watchOnce: async () => [
    stop('a'), ask('b', 'r1'), stop('c'), stop('d'), stop('e'), { event: 'gone', agent: 'x', title: 'old-chat' },
    { event: 'not-read', source: 'add-on orders.mjs', error: 'down' }, { event: 'post', text: 'Two new orders' },
    { event: 'done', agent: 'y', title: 'Dentist', task: 't1' }, { event: 'end', reason: 'time' }, { event: 'odd', x: 1 },
    { event: 'unsupported', reason: 'no' }] });
  assert.ok(!world.calls.some(call => call.startsWith('send')));
  assert.deepEqual(world.sent, []);
  assert.deepEqual(lines(stateDir).slice(0, 6), ['Closed: old-chat', 'Not read: add-on orders.mjs — down', 'Two new orders',
    'Done on the board: Dentist', 'Watch ended: time', 'odd: {"event":"odd","x":1}']);
  assert.equal(JSON.parse(readFileSync(join(stateDir, 'serve.json'), 'utf8')).seconds, 60);
  // b's card had closed; a, c and d fill the 3 places, and e waits.
  assert.deepEqual(world.spawned.map(agentOf), ['a', 'c', 'd']);
  assert.ok(lines(stateDir).includes('No action: Judge b — its question closed'));
});

test('a held stop: typed 13:56:54, stop 13:58, it runs, asks 14:01; no run starts before 14:11:54', async () => {
  const { world, worker, at, stateDir } = rig({ start: '2026-10-31T17:58:00Z' });
  world.typed.puma = '2026-10-31T17:56:54.000Z';
  await worker.dispatch([stop('puma')]);
  await worker.pump();
  at('2026-10-31T18:01:00Z');
  world.pending = [{ id: 'q1', agentId: 'puma' }];
  await worker.dispatch([ask('puma', 'q1')]);
  for (const when of ['2026-10-31T18:01:00Z', '2026-10-31T18:05:00Z', '2026-10-31T18:11:53Z']) { at(when); await worker.pump(); }
  assert.equal(world.spawned.length, 0);
  at('2026-10-31T18:11:54Z');
  await worker.pump();
  assert.equal(world.spawned.length, 1);
  assert.match(world.spawned[0].brief, /"id":"q1"/);
  assert.deepEqual(lines(stateDir), ['Started: Judge puma']);
});

test('a new message from the person drops the held event', async () => {
  const { world, worker, at, stateDir } = rig({ start: '2026-10-31T18:00:00Z' });
  world.typed.puma = '2026-10-31T17:56:54.000Z';
  await worker.dispatch([stop('puma')]);
  at('2026-10-31T18:05:00Z');
  world.typed.puma = '2026-10-31T18:04:00.000Z';
  await worker.pump();
  at('2026-10-31T19:00:00Z');
  await worker.pump();
  assert.equal(world.spawned.length, 0);
  assert.deepEqual(lines(stateDir), ['No action: Judge puma — you wrote in that chat']);
});

test('at most 3 runs at once and one per chat; a run has no Paseo id and its own log', async () => {
  const { world, worker, end } = rig();
  world.pending = [{ id: 'r1', agentId: 'a' }, { id: 'r2', agentId: 'a' }];
  await worker.dispatch([ask('a', 'r1'), ask('a', 'r2'), stop('b'), stop('c'), stop('d')]);
  await worker.pump();
  assert.deepEqual(world.spawned.map(agentOf), ['a', 'b', 'c']);
  end(101);
  await worker.pump();
  assert.deepEqual(world.spawned.map(agentOf), ['a', 'b', 'c', 'd']);
  assert.equal(world.spawned[0].env.WONG_DAILY_RUN, '1');
  assert.equal(world.spawned[0].env.PASEO_AGENT_ID, undefined);
  assert.match(world.spawned[0].logFile, /runs\/asking-\d{8}T\d{6}-\w+\.jsonl$/);
});

test("an install's lane runs one at a time, and an ownPlace job starts while 3 judge runs work", async () => {
  const briefs = briefsWith({ 'invoice.md': 'Check invoice {{invoice}}.\n' });
  const sweeps = { ...defaults(), events: { ...defaults().events, invoice: { brief: 'invoice.md', title: 'Invoice {{invoice}}', lane: 'invoices', ownPlace: true } } };
  const { world, worker, end } = rig({ sweeps, briefs: [briefs, SKILL_BRIEFS] });
  await worker.dispatch([stop('a'), stop('b'), stop('c')]);
  await worker.pump();
  await worker.dispatch([{ event: 'invoice', invoice: 7 }, stop('d'), { event: 'invoice', invoice: 8 }]);
  await worker.pump();
  assert.equal(world.spawned.length, 4);
  assert.match(world.spawned[3].brief, /Check invoice 7\./);
  end(103);
  await worker.pump();
  assert.equal(world.spawned.length, 5);
  assert.match(world.spawned[4].brief, /Check invoice 8\./);
});

test('a restart journals Not finished for a run it stopped, and starts it no second time', async () => {
  const { world, worker, make, stateDir } = rig();
  await worker.dispatch([stop('a'), stop('b')]);
  await worker.pump();
  addLine({ stateDir, timezone: TZ, line: 'Kept going: b', run: JSON.parse(readFileSync(join(stateDir, 'worker-queue.json'), 'utf8')).running[1].runId,
    kind: 'end', now: new Date(world.t) });
  world.live.clear();
  const again = make();
  again.boot();
  await again.pump();
  assert.equal(world.spawned.length, 2);
  assert.deepEqual(lines(stateDir).filter(line => line.startsWith('Not finished')), ['Not finished: Judge a — the service restarted']);
});

test('a run past 30 minutes is stopped and journaled', async () => {
  const { world, worker, at, stateDir } = rig();
  await worker.dispatch([stop('a')]);
  await worker.pump();
  at('2026-10-31T14:30:00Z');
  await worker.pump();
  assert.deepEqual(world.killed, [100]);
  assert.ok(lines(stateDir).includes('Not finished: Judge a — stopped after 30 minutes'));
});

test('a dry run stops no live run past 30 minutes: it prints wouldStop', async () => {
  const { world, worker, make, at } = rig();
  await worker.dispatch([stop('a'), stop('b')]);
  await worker.pump();
  at('2026-10-31T14:30:00Z');
  const printed = [];
  const dry = make({ dryRun: true, print: item => printed.push(item) });
  dry.boot();
  await dry.pump();
  assert.deepEqual(world.killed, []);
  assert.deepEqual(printed.map(item => item.wouldStop), ['Judge a', 'Judge b']);
});

test('a board that can not be read sends the Daily chat one line per day', async () => {
  const { world, worker, at, stateDir } = rig();
  const board = { event: 'not-read', source: 'board', error: 'unavailable: sign in again' };
  await worker.dispatch([board, { event: 'not-read', source: 'to-dos', error: 'x' }]);
  assert.deepEqual(world.sent, ['Not read: your board — unavailable: sign in again']);
  await worker.dispatch([board]);
  assert.equal(world.sent.length, 1);
  at('2026-11-01T15:00:00Z');
  await worker.dispatch([board]);
  assert.equal(world.sent.length, 2);
  assert.ok(lines(stateDir).includes('Not read: board — unavailable: sign in again'));
});

test('a timed job runs once per due time, skips a missed time, and an empty check starts nothing', async () => {
  const briefs = briefsWith({ 'pay.md': 'Check the payments for {{who}} at {{due}}.\n' });
  const sweeps = { ...defaults(), sweeps: [{ id: 'pay', title: 'Payments', at: ['09:00'], days: [1], check: 'scripts/pay-check.mjs', brief: 'pay.md' }] };
  const { world, worker, at, stateDir } = rig({ sweeps, briefs: [briefs], start: '2026-11-02T14:00:00Z' });
  await worker.sweep();
  await worker.pump();
  assert.equal(world.checks.length, 1);
  assert.equal(world.checks[0].context.sweep, 'pay');
  assert.equal(world.spawned.length, 0);
  assert.deepEqual(lines(stateDir), []);
  // The next Monday the check finds work: one run, once.
  world.checkOut = 'checked\n{"run":{"who":"Kim"}}\n';
  at('2026-11-09T14:01:00Z');
  await worker.sweep();
  await worker.pump();
  at('2026-11-09T14:05:00Z');
  await worker.sweep();
  await worker.pump();
  assert.equal(world.spawned.length, 1);
  assert.match(world.spawned[0].args.join(' '), /Check the payments for Kim at 2026-11-09T09:00\./);
  // A Monday when the computer was off at 9:00 and starts at 11:00: that day's job does not run.
  at('2026-11-16T16:00:00Z');
  await worker.sweep();
  assert.equal(world.checks.length, 2);
});

test('due times by every, at, days and hours; a check line with no run is nothing to do', () => {
  const every = { every: '15m', hours: '8-21' };
  assert.equal(dueKey(every, new Date('2026-10-31T14:07:00Z'), TZ), '2026-10-31T10:00');
  assert.equal(dueKey(every, new Date('2026-10-31T02:07:00Z'), TZ), null);
  assert.equal(dueKey({ at: ['09:00', '17:00'] }, new Date('2026-10-31T21:10:00Z'), TZ), '2026-10-31T17:00');
  assert.equal(dueKey({ at: ['09:00'], days: [1] }, new Date('2026-10-31T13:00:00Z'), TZ), null);
  assert.equal(runOf('{"line":"x"}\nnot json'), null);
});

test("each default brief loads with no placeholder left, ends in the journal, and names no install's own pages", async () => {
  const { world, worker, end, stateDir } = rig();
  world.pending = [{ id: 'r1', agentId: 'b' }];
  await worker.dispatch([stop('a'), ask('b', 'r1')]);
  await worker.pump();
  for (const run of world.spawned) end(run.pid);
  assert.equal(world.spawned.length, 2);
  for (const run of world.spawned) {
    assert.doesNotMatch(run.brief, /\{\{/);
    assert.match(run.brief, /D journal --run [\w-]+ --line/);
    assert.match(run.brief, /D who/);
    assert.doesNotMatch(run.brief, /WongOS|Matthew|business\.md|profile\.md|email/i);
  }
  assert.deepEqual(lines(stateDir).filter(line => line.startsWith('Not started')), []);
  for (const name of Object.values(defaults().events).map(entry => entry.brief)) assert.ok(existsSync(join(SKILL_BRIEFS, name)), name);
  assert.throws(() => briefFor({ brief: 'nope.md', fields: {} }, 'r', [SKILL_BRIEFS]), /no brief nope\.md/);
  assert.throws(() => fillText('{{nope}}', {}), /no value for \{\{nope\}\}/);
});

test("the install's list merges over the default, and its brief folder wins over the skill's", () => {
  const project = folder();
  mkdirSync(join(project, '.agents/daily/briefs'), { recursive: true });
  writeFileSync(join(project, '.agents/daily/briefs/judge.md'), 'Our own judge for {{title}}.\n');
  writeFileSync(join(project, '.agents/daily/jobs.json'), JSON.stringify({ maxRuns: 2,
    events: { invoice: { brief: 'invoice.md' } }, sweeps: [{ id: 'pay', at: ['09:00'], brief: 'pay.md' }] }));
  const merged = loadSweeps({ project, file: '.agents/daily/jobs.json' });
  assert.deepEqual(Object.keys(merged.events), ['stopped', 'asking', 'invoice']);
  assert.deepEqual([merged.maxRuns, merged.journalDays, merged.sweeps.map(sweep => sweep.id)], [2, 14, ['pay']]);
  assert.deepEqual(defaults().sweeps, []);
  assert.equal(JSON.parse(readFileSync(DEFAULT_SWEEPS, 'utf8')).journalDays, 14);
  assert.match(briefFor({ brief: 'judge.md', fields: { title: 'x' } }, 'r1', briefFolders(project)), /Our own judge for x\./);
  writeFileSync(join(project, '.agents/daily/bad.json'), JSON.stringify({ sweeps: [{ id: 'evil', brief: 'pay.md', check: '../outside.mjs' }] }));
  assert.throws(() => loadSweeps({ project, file: '.agents/daily/bad.json' }), /bad entry: evil/);
});

test('a run uses the AI tool the settings name, with full permissions, and a root Claude run gets IS_SANDBOX', async () => {
  const { world, worker } = rig({ agent: 'codex' });
  await worker.dispatch([stop('a')]);
  await worker.pump();
  assert.equal(world.spawned[0].command, 'codex');
  assert.deepEqual(world.spawned[0].args.slice(0, 6), ['exec', '--ephemeral', '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox', '-c',
    'approval_policy="never"']);
  assert.deepEqual(headlessCommand({ agent: 'claude', prompt: 'p', access: { full: true } }), ['claude', ['-p', 'p', '--no-session-persistence',
    '--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose']]);
  assert.deepEqual(headlessCommand({ agent: 'codex', prompt: 'p', access: { full: true } }), ['codex', ['exec', '--ephemeral', '--skip-git-repo-check',
    '--dangerously-bypass-approvals-and-sandbox', '-c', 'approval_policy="never"', 'p']]);
  const base = { WONG_DAILY_RUN: '1', WONG_DAILY_RUN_ID: 'judge-1', WONG_MEMORY_NO_HEADLESS: '1', WONG_TIDY: '0' };
  assert.deepEqual(runEnv({ PASEO_AGENT_ID: 'x', HOME: '/root' }, 'judge-1', { agent: 'claude', root: true }), { HOME: '/root', IS_SANDBOX: '1', ...base });
  assert.deepEqual(runEnv({ HOME: '/root' }, 'judge-1', { agent: 'codex', root: true }), { HOME: '/root', ...base });
  assert.deepEqual(runEnv({ HOME: '/home/jo' }, 'judge-1', { agent: 'claude', root: false }), { HOME: '/home/jo', ...base });
});

test("a heard stop starts the service's next pass within a second, and with none the pass waits the full minute", async () => {
  const times = [], signal = { heard: false };
  let clock = 0;
  const done = new Error('four passes');
  const sleep = async ms => {
    if (times.length >= 4) throw done;
    if (times.length === 2 && clock === 0) signal.heard = true;
    clock += ms;
  };
  const worker = { boot: () => times.push('boot') };
  await assert.rejects(serveWorker({ worker, signal, sleep, seconds: 60, log: () => {}, pass: async () => { times.push(clock); } }), error => error === done);
  assert.deepEqual(times.slice(0, 1), ['boot']);
  const passes = times.slice(1);
  assert.ok(passes[1] - passes[0] <= 1000, `second pass after ${passes[1] - passes[0]} ms`);
  assert.equal(passes[2] - passes[1], 60_000);
});

test("serve's next pass comes right after a chat's stop report and after a run's end, not a minute later", async () => {
  const stateDir = folder();
  await makeWorker({ stateDir, project: '/repo', timezone: TZ, sweeps: defaults(), typedAt: () => null }).dispatch([stop('a')]);
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { tasks: false, chats: true },
    places: { home: '.' }, checks: [] });
  let passes = 0, report = null, runEnd = null;
  const seen = [], logs = [], done = new Error('three sleeps');
  const call = async args => {
    if (args.join(' ') === 'ls --global') passes += 1;
    return args[0] === 'ls' || args[0] === 'permit' ? [] : { ok: true };
  };
  // Each sleep notes the pass it follows: the first sends a stop report, the second ends the run.
  const sleep = async () => {
    seen.push(passes);
    if (seen.length === 1) report('change', 'chat-1');
    else if (seen.length === 2) runEnd();
    else throw done;
  };
  const launch = () => ({ pid: process.pid, on: (name, handler) => { if (name === 'exit') runEnd = handler; } });
  const watcher = (_dir, notice) => { report = notice; return { close: () => {} }; };
  await assert.rejects(serveDaily({ config, project: folder(), stateDir, call, env: { HOME: folder() }, watching: { board: async () => ({ tasks: [] }) },
    started: () => ({}), daily: { read: () => ({}) }, seconds: 60, log: text => logs.push(text), launch, watcher, sleep }), error => error === done);
  assert.deepEqual(logs, []);
  assert.deepEqual(seen, [1, 2, 3]);
});

test('serve --dry-run prints what it would do, starts nothing, and leaves the live state alone', async () => {
  const stateDir = folder();
  const printed = [];
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { tasks: false, chats: true },
    places: { home: '.' }, checks: [] });
  const call = async args => (args[0] === 'ls' || args[0] === 'permit' ? [] : { ok: true });
  await commands({ config, project: folder(), stateDir, values: { 'dry-run': true, seconds: 60 }, call, board: { tasks: async () => ({ tasks: [] }) },
    env: {}, print: text => printed.push(JSON.parse(text)) }).serve();
  assert.deepEqual(printed.at(-1), { dryRun: true, waiting: [] });
  assert.equal(existsSync(join(stateDir, 'serve.json')), false);
  assert.equal(existsSync(join(stateDir, 'worker-queue.json')), false);
});
