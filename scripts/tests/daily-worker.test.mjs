import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headlessCommand } from '../../.agents/skills/memory/scripts/lib/headless.mjs';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';
import { beat } from '../../.agents/skills/daily/scripts/chief.mjs';
import { validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { commands, personSettings, start } from '../../.agents/skills/daily/scripts/daily.mjs';
import { addLine, readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { DEFAULT_SWEEPS, SKILL_BRIEFS, briefFolders, briefFor, codeStamp, dropServeLock, fillText, loadSweeps, lockHolder, makeWorker,
  handOff, handoffFile, morningPass, runEnv, runOf, serveDaily, serveWorker, takeServeLock, workerPass }
  from '../../.agents/skills/daily/scripts/worker.mjs';

const TZ = 'America/Toronto';
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function folder() {
  const dir = mkdtempSync(join(tmpdir(), 'daily-worker-'));
  roots.push(dir);
  return dir;
}
// The judge jobs an install may keep in its own list; the default list has none since each chat checks its own stops.
const JUDGE_EVENTS = { stopped: { brief: 'judge.md', title: 'Judge {{title}}', hold: true }, asking: { brief: 'judge.md', title: 'Judge {{title}}', hold: true } };
const defaults = () => {
  const merged = loadSweeps({ project: '/repo' });
  return { ...merged, events: { ...JUDGE_EVENTS, ...merged.events } };
};

/** A worker with fake runs, clock and Paseo. `world` holds what each fake saw. */
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

test('no event sends any chat a message: stops start runs up to the cap, and the rest goes to the journal', async () => {
  const { world, worker, stateDir } = rig();
  await workerPass({ worker, stateDir, seconds: 60, now: () => world.t, watchOnce: async () => [
    stop('a'), ask('b', 'r1'), stop('c'), stop('d'), stop('e'), { event: 'gone', agent: 'x', title: 'old-chat' },
    { event: 'not-read', source: 'add-on orders.mjs', error: 'down' }, { event: 'post', text: 'Two new orders' },
    { event: 'close', agent: 'y', title: 'Dentist' }, { event: 'end', reason: 'time' }, { event: 'odd', x: 1 },
    { event: 'unsupported', reason: 'no' }] });
  assert.ok(!world.calls.some(call => call.startsWith('send')));
  assert.deepEqual(lines(stateDir).slice(0, 6), ['Closed: old-chat', 'Not read: add-on orders.mjs — down', 'Two new orders',
    'Sent /close: Dentist', 'Watch ended: time', 'odd: {"event":"odd","x":1}']);
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

// ---------------------------------------------------------------------------
// A run's handoff

/** A worker whose app keeps each report and whose chat opener answers chat-9; `running` holds three ended runs. */
function handoffRig({ dryRun = false } = {}) {
  const r = rig();
  const opened = [], reports = [], printed = [];
  const worker = r.make({ dryRun, print: item => printed.push(item), app: { report: async (id, result) => { reports.push({ id, ...result }); } },
    openChat: async chat => { opened.push(chat); return { agentId: 'chat-9' }; } });
  const run = (runId, kind = 'schedule-run') => ({ runId, pid: 1, kind, title: 'Tidy the orders', report: `report-${runId.slice(-4)}`,
    startedAt: new Date(r.world.t).toISOString(), ...(kind === 'schedule-run' && { schedule: 'tidy-orders' }) });
  const running = ['schedule-run-20261031T140000-ab12', 'schedule-run-20261031T140100-cd34', 'stopped-20261031T140200-ef56'];
  writeFileSync(join(r.stateDir, 'worker-queue.json'), JSON.stringify({ queue: [], running: [run(running[0]), run(running[1]),
    run(running[2], 'stopped')] }));
  const hand = (runId, text = 'Three orders need a reply.') =>
    handOff({ stateDir: r.stateDir, timezone: TZ, env: { WONG_DAILY_RUN_ID: runId }, text, now: new Date(r.world.t) });
  return { ...r, worker, opened, reports, printed, running, hand };
}

test('a schedule run that hands off opens one chat named for the schedule once it ends; a run with no handoff opens none', async () => {
  const r = handoffRig();
  assert.deepEqual(r.hand(r.running[0]), { status: 'handed', run: r.running[0] });
  assert.equal(r.hand(r.running[0], 'Again.').reason, 'already', 'one chat a run');
  // A check-in's run that hands off still opens nothing: it keeps what it found in its own chat.
  r.hand(r.running[2]);
  await r.worker.pump();
  await r.worker.pump();
  assert.deepEqual(r.opened, [{ title: 'Tidy the orders', message: 'Three orders need a reply.', schedule: 'tidy-orders' }]);
  assert.deepEqual(r.reports, [{ id: 'report-ab12', state: 'started', chatTitle: 'Tidy the orders', agentId: 'chat-9' }]);
  assert.deepEqual(lines(r.stateDir).filter(line => /^(Handed off|Opened)/.test(line)),
    ['Handed off: Three orders need a reply.', 'Handed off: Three orders need a reply.', 'Opened: Tidy the orders']);
  assert.equal(existsSync(handoffFile(r.stateDir, r.running[0])), false);
});

test('a handoff needs a run and words; a dry run prints wouldOpen and keeps the file', async () => {
  const r = handoffRig({ dryRun: true });
  assert.equal(handOff({ stateDir: r.stateDir, timezone: TZ, env: {}, text: 'x' }).reason, 'run');
  assert.equal(r.hand(r.running[0], '  ').reason, 'text');
  assert.equal(r.hand(r.running[0], 'x'.repeat(20001)).reason, 'text');
  r.hand(r.running[0]);
  await r.worker.pump();
  assert.deepEqual([r.printed.filter(item => item.wouldOpen), r.opened], [[{ wouldOpen: 'Tidy the orders', run: r.running[0] }], []]);
  assert.equal(existsSync(handoffFile(r.stateDir, r.running[0])), true);
});

test('a chat list the app does not take goes to the journal only, and sends no chat a message', async () => {
  const { world, worker, stateDir } = rig();
  await worker.dispatch([{ event: 'not-read', source: 'chats', error: 'unavailable: sign in again' }]);
  assert.deepEqual(lines(stateDir), ['Not read: chats — unavailable: sign in again']);
  assert.deepEqual(world.calls, []);
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(join(stateDir, 'worker-queue.json'), 'utf8')), 'told'), false);
});

test('a check line with no run is nothing to do', () => {
  assert.equal(runOf('{"line":"x"}\nnot json'), null);
  assert.deepEqual(runOf('checked\n{"run":{"who":"Kim"}}\n'), { who: 'Kim' });
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
    assert.doesNotMatch(run.brief, /Matthew|business\.md|profile\.md|email/i);
  }
  assert.deepEqual(lines(stateDir).filter(line => line.startsWith('Not started')), []);
  for (const name of Object.values(defaults().events).map(entry => entry.brief)) assert.ok(existsSync(join(SKILL_BRIEFS, name)), name);
  const lineUp = briefFor({ brief: 'line-up.md', fields: { chats: 'a,b' } }, 'r1', [SKILL_BRIEFS]);
  assert.match(lineUp, /Chats with news: a,b\./);
  assert.match(lineUp, /D journal --run r1 --line/);
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
  assert.deepEqual(Object.keys(merged.events), ['invoice']);
  assert.deepEqual(loadSweeps({ project: '/repo' }).events, {});
  assert.deepEqual([merged.maxRuns, merged.journalDays, merged.sweeps, merged.waiting], [2, 14, undefined, ['pay']]);
  assert.deepEqual(loadSweeps({ project: '/repo' }), { ...JSON.parse(readFileSync(DEFAULT_SWEEPS, 'utf8')), waiting: [] });
  assert.match(briefFor({ brief: 'judge.md', fields: { title: 'x' } }, 'r1', briefFolders(project)), /Our own judge for x\./);
  writeFileSync(join(project, '.agents/daily/bad.json'), JSON.stringify({ events: { order: { brief: '../outside.md' } } }));
  assert.throws(() => loadSweeps({ project, file: '.agents/daily/bad.json' }), /bad entry: order/);
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

test('a full Claude run with a deny list ends with --disallowedTools; no deny, a narrow grant, and Codex get none', () => {
  const deny = ['Bash(*email*send*)', 'Bash(*send-approved*)'];
  const [, args] = headlessCommand({ agent: 'claude', prompt: 'p', access: { full: true }, deny });
  assert.deepEqual(args.slice(-3), ['--disallowedTools', ...deny]);
  for (const more of [{}, { deny: [] }]) {
    assert.ok(!headlessCommand({ agent: 'claude', prompt: 'p', access: { full: true }, ...more })[1].includes('--disallowedTools'));
  }
  const narrow = { tools: ['Read'], dir: '/repo' };
  assert.ok(!headlessCommand({ agent: 'claude', prompt: 'p', access: narrow, deny })[1].includes('--disallowedTools'));
  assert.ok(!headlessCommand({ agent: 'codex', prompt: 'p', access: { full: true }, deny })[1].includes('--disallowedTools'));
});

test("an install's deny list reaches each run, a bad one is a bad entry, and with Codex no run starts", async () => {
  const project = folder();
  const own = list => {
    writeFileSync(join(project, 'jobs.json'), JSON.stringify(list));
    return loadSweeps({ project, file: 'jobs.json' });
  };
  for (const deny of ['Bash(*send*)', [''], [3], null]) assert.throws(() => own({ deny }), /bad entry: deny/);
  const deny = ['Bash(*send-approved*)'];
  assert.deepEqual([own({ deny }).deny, own({ deny: [] }).deny], [deny, []]);
  const sweeps = { ...defaults(), deny };
  const { world, worker } = rig({ sweeps });
  await worker.dispatch([stop('a'), stop('b')]);
  await worker.pump();
  assert.equal(world.spawned.length, 2);
  for (const run of world.spawned) assert.deepEqual(run.args.slice(-2), ['--disallowedTools', ...deny]);
  const codex = rig({ sweeps, agent: 'codex' });
  await codex.worker.dispatch([stop('a'), stop('b')]);
  await codex.worker.pump();
  assert.equal(codex.world.spawned.length, 0);
  assert.deepEqual(lines(codex.stateDir).filter(line => line.startsWith('Not started')), [
    'Not started: Judge a — the deny list works only with Claude Code', 'Not started: Judge b — the deny list works only with Claude Code']);
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

test("each pass after the watch tells an idle chat its note once, keeps a plain note for a working chat, and steers a now note in", async () => {
  const stateDir = folder(), project = folder();
  writeFileSync(join(project, 'jobs.json'), JSON.stringify({ sweeps: [{ id: 'wiki-tidy', off: true }, { id: 'line-up', off: true }] }));
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
    places: { home: '.' }, checks: [], sweeps: 'jobs.json' });
  const list = [{ id: 'chat-a', name: 'Checkout', status: 'idle', cwd: '/w/a' }, { id: 'chat-b', name: 'Payments', status: 'running', cwd: '/w/b' }];
  const sent = [];
  const call = async args => {
    if (args[0] === 'ls') return structuredClone(list);
    if (args[0] === 'permit' || args[0] === 'workspace') return [];
    if (args[0] === 'inspect') return { ParentAgentId: null, UpdatedAt: new Date().toISOString() };
    if (args[0] === 'logs') return 'Working.';
    if (args[0] === 'send') { sent.push([args[1], readFileSync(args[3], 'utf8').trim(), args.slice(4).join(' ')]); return { ok: true }; }
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const note = (agent, text, now = false) => ({ id: text, agent, title: agent, text, now, at: new Date().toISOString() });
  writeFileSync(join(stateDir, 'line-up.json'), JSON.stringify({ chats: {}, notes: [note('chat-a', 'Use Stripe.'), note('chat-b', 'Sign-in is live.')] }));
  const serve = more => serveDaily({ config, project, stateDir, call, env: { HOME: folder() }, once: true, watching: {},
    started: () => ({}), watcher: () => ({ close() {} }), ownRepo: () => true, typedAt: () => null, ...more });
  const printed = [];
  await serve({ dryRun: true, print: item => printed.push(item) });
  assert.deepEqual(printed.filter(item => item.wouldTell), [{ wouldTell: 'chat-a', steer: false, text: 'Use Stripe.' }]);
  assert.deepEqual(sent, []);
  await serve();
  await serve();
  assert.deepEqual(sent, [['chat-a', 'From the daily: Use Stripe.', '--behavior steer --no-wait']]);
  const queued = JSON.parse(readFileSync(join(stateDir, 'line-up.json'), 'utf8'));
  writeFileSync(join(stateDir, 'line-up.json'), JSON.stringify({ ...queued, notes: [...queued.notes, note('chat-b', 'Drop the PayPal form.', true)] }));
  await serve();
  assert.deepEqual(sent.slice(1), [['chat-b', 'From the daily: Drop the PayPal form.', '--behavior steer --no-wait']]);
  assert.ok(lines(stateDir).includes('Steered chat-b: Drop the PayPal form.'));
  assert.deepEqual(JSON.parse(readFileSync(join(stateDir, 'line-up.json'), 'utf8')).notes.map(each => each.text), ['Sign-in is live.']);
});

test("serve's next pass comes right after a chat's stop report and after a run's end, not a minute later", async () => {
  const stateDir = folder();
  await makeWorker({ stateDir, project: '/repo', timezone: TZ, sweeps: defaults(), typedAt: () => null }).dispatch([stop('a')]);
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
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
  await assert.rejects(serveDaily({ config, project: folder(), stateDir, call, env: { HOME: folder() }, watching: {},
    started: () => ({}), seconds: 60, log: text => logs.push(text), launch, watcher, sleep }), error => error === done);
  assert.deepEqual(logs, []);
  assert.deepEqual(seen, [1, 2, 3]);
});

test('serve --dry-run prints what it would do, starts nothing, and leaves the live state alone', async () => {
  const stateDir = folder();
  const printed = [];
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
    places: { home: '.' }, checks: [] });
  const call = async args => (args[0] === 'ls' || args[0] === 'permit' ? [] : { ok: true });
  await commands({ config, project: folder(), stateDir, values: { 'dry-run': true, seconds: 60 }, call, chats: { origin: async () => null },
    env: {}, print: text => printed.push(JSON.parse(text)), reread: () => ({ me: { file: null }, config }) }).serve();
  assert.deepEqual(printed.at(-1), { dryRun: true, waiting: [] });
  assert.equal(existsSync(join(stateDir, 'serve.json')), false);
  assert.equal(existsSync(join(stateDir, 'worker-queue.json')), false);
});

// ---------------------------------------------------------------------------
// One worker per person and repo, with or without Paseo

test('with no job of its own for them, a stop and a question start nothing and write no journal line', async () => {
  const { world, stateDir, make } = rig({ sweeps: loadSweeps({ project: '/repo' }) });
  const worker = make();
  await worker.dispatch([stop('a'), ask('b', 'r1'), { event: 'gone', agent: 'x', title: 'old-chat' }]);
  await worker.pump();
  assert.deepEqual(world.spawned, []);
  assert.deepEqual(lines(stateDir), ['Closed: old-chat']);
});

test('serve.lock: the first worker takes it, a second is refused, and a dead or silent holder is taken over', () => {
  const stateDir = folder();
  const now = Date.now();
  assert.equal(takeServeLock({ stateDir, pid: 11, now }), true);
  assert.equal(lockHolder(stateDir), 11);
  assert.equal(takeServeLock({ stateDir, pid: 11, now }), true, 'its own lock');
  assert.equal(takeServeLock({ stateDir, pid: 12, isAlive: () => true, now }), false);
  assert.equal(takeServeLock({ stateDir, pid: 12, isAlive: pid => pid !== 11, now }), true, 'a dead pid');
  assert.equal(lockHolder(stateDir), 12);
  // A live pid with no beat for 10 minutes may be another program's now.
  const old = (now - 10 * 60e3) / 1000;
  utimesSync(join(stateDir, 'serve.lock'), old, old);
  beat({ stateDir, seconds: 60, now: now - 10 * 60e3 });
  assert.equal(takeServeLock({ stateDir, pid: 13, isAlive: () => true, now }), true, 'a stale beat');
  beat({ stateDir, seconds: 60, now });
  utimesSync(join(stateDir, 'serve.lock'), old, old);
  assert.equal(takeServeLock({ stateDir, pid: 14, isAlive: () => true, now }), false, 'a beating worker keeps it');
  dropServeLock(stateDir, 14);
  assert.equal(lockHolder(stateDir), 13);
  dropServeLock(stateDir, 13);
  assert.equal(existsSync(join(stateDir, 'serve.lock')), false);
});

test('serve.lock: two takers racing over a dead lock never both win', async () => {
  const worker = new URL('../../.agents/skills/daily/scripts/worker.mjs', import.meta.url).href;
  // Each taker stays alive a moment, so the other sees a live holder.
  const taker = stateDir => new Promise(done => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `import { takeServeLock } from ${JSON.stringify(worker)};
      console.log(takeServeLock({ stateDir: ${JSON.stringify(stateDir)} })); setTimeout(() => {}, 1500);`], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('close', () => done(out.trim()));
  });
  for (let round = 0; round < 5; round++) {
    const stateDir = folder();
    writeFileSync(join(stateDir, 'serve.lock'), '2147483646\n');
    const won = await Promise.all([taker(stateDir), taker(stateDir), taker(stateDir)]);
    assert.equal(won.filter(each => each === 'true').length, 1, won.join(' '));
  }
  // A taker that finds another's takeover under way is refused; a takeover left by a dead taker is taken after 10 s.
  const stateDir = folder();
  writeFileSync(join(stateDir, 'serve.lock'), '2147483646\n');
  mkdirSync(join(stateDir, 'serve.lock.take'));
  assert.equal(takeServeLock({ stateDir, pid: 21 }), false);
  const old = (Date.now() - 20e3) / 1000;
  utimesSync(join(stateDir, 'serve.lock.take'), old, old);
  assert.equal(takeServeLock({ stateDir, pid: 21, isAlive: pid => pid === 21 }), true);
  assert.deepEqual([lockHolder(stateDir), existsSync(join(stateDir, 'serve.lock.take'))], [21, false]);
});

test('a second serve prints one line and returns, starting nothing', async () => {
  const stateDir = folder();
  writeFileSync(join(stateDir, 'serve.lock'), `${process.ppid}\n`);
  const warned = [], printed = [];
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
    places: {}, checks: [] });
  const call = async () => { throw new Error('no call expected'); };
  const result = await commands({ config, project: folder(), stateDir, values: { seconds: 60, once: true }, call, chats: { origin: async () => null }, env: {},
    print: text => printed.push(text), warn: text => warned.push(text) }).serve();
  assert.deepEqual([result, printed, warned], [undefined, [], ['Another daily worker runs for this person and repo.']]);
  assert.equal(existsSync(join(stateDir, 'serve.json')), false);
});

test("without Paseo the worker's pass still runs, and an own timed job waits to move; a default schedule's id does not", async () => {
  const project = folder();
  mkdirSync(join(project, '.agents/daily'), { recursive: true });
  writeFileSync(join(project, '.agents/daily/jobs.json'), JSON.stringify({ sweeps: [{ id: 'pay', every: '15m', brief: 'pay.md' },
    { id: 'wiki-tidy', every: '15m', brief: 'pay.md' }, { id: 'line-up', off: true }] }));
  const call = async () => { throw new PaseoError(EXIT.noPaseo, 'Paseo is not installed.'); };
  const stateDir = folder(), spawned = [], logs = [];
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
    places: {}, checks: [], sweeps: '.agents/daily/jobs.json' });
  await serveDaily({ config, project, stateDir, call, env: { HOME: folder() }, agent: 'codex', once: true, log: text => logs.push(text),
    watching: {}, started: () => ({}), watcher: () => ({ close() {} }),
    launch: run => { spawned.push(run.command); return { pid: process.pid, on: () => {} }; } });
  assert.deepEqual([logs, spawned], [[], []]);
  assert.deepEqual(lines(stateDir), ['Timed jobs wait to move to the app, and do not run: pay']);
});

test("an install's timed job waits to move, unless it names a default schedule or is off; the merged list runs no timed job", () => {
  const project = folder();
  const own = sweeps => {
    writeFileSync(join(project, 'jobs.json'), JSON.stringify({ sweeps }));
    const merged = loadSweeps({ project, file: 'jobs.json' });
    return [merged.sweeps, merged.waiting];
  };
  // `wrap-up` was once a default job: an install list that still turns it off keeps working, and waits for nothing.
  assert.deepEqual(own([{ id: 'wiki-tidy', every: '60m', brief: 'tidy.md' }, { id: 'wrap-up', off: true }, { id: 'pay', at: ['09:00'], brief: 'pay.md' },
    { id: 'nap', every: '5m', do: 'sleep' }]), [undefined, ['pay', 'nap']]);
  assert.deepEqual(own([{ id: 'wiki-tidy', off: true }, { id: 'line-up', off: true }]), [undefined, []]);
});

test('timed jobs that wait get one journal line a day, and a dry run writes none', async () => {
  const { worker, stateDir, at, make } = rig({ sweeps: { ...defaults(), waiting: ['pay', 'nap'] } });
  await worker.sweep();
  at('2026-10-31T20:00:00Z');
  await worker.sweep();
  assert.deepEqual(lines(stateDir), ['Timed jobs wait to move to the app, and do not run: pay, nap']);
  at('2026-11-01T14:00:00Z');
  await make({ dryRun: true }).sweep();
  assert.equal(lines(stateDir).length, 1);
  await worker.sweep();
  assert.equal(lines(stateDir).length, 2);
});

// ---------------------------------------------------------------------------
// A problem that needs the person

/** A worker whose chat opener records each chat and answers `answer`. */
function needsRig(answer = opened => ({ ok: true, agentId: `needs-${opened.length}` }), more = {}) {
  const r = rig(more);
  const opened = [];
  const openChat = async chat => { opened.push(chat); const out = answer(opened); if (out instanceof Error) throw out; return out; };
  return { ...r, opened, worker: r.make({ openChat, guide: () => '.agents/daily/guide.md' }) };
}
const chatsDown = (again = false) => ({ event: 'not-read', source: 'chats', error: 'unavailable: sign in again', ...(again && { again: true }) });
const needs = stateDir => JSON.parse(readFileSync(join(stateDir, 'needs-you.json'), 'utf8'));

test('one chat list failure writes one line and opens nothing; a second in a row opens one Needs you chat with the reason, steps and guide', async () => {
  const { worker, stateDir, opened, world } = needsRig();
  await worker.dispatch([chatsDown()]);
  assert.deepEqual([lines(stateDir), opened], [['Not read: chats — unavailable: sign in again'], []]);
  await worker.dispatch([chatsDown(true)]);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].title, 'Needs you: the chat list');
  assert.match(opened[0].message, /failed two times in a row at the chat list\.\nReason: unavailable: sign in again\n/);
  assert.match(opened[0].message, /First read \.agents\/daily\/guide\.md\. When it gives its own fix for this problem, follow that/);
  assert.match(opened[0].message, /1\. Run `node \.claude\/skills\/daily\/scripts\/daily\.mjs who`\. On `missing` or `expired`, run its `login` command/);
  assert.match(opened[0].message, /Ask the person only for a step that needs them/);
  assert.deepEqual(lines(stateDir), ['Not read: chats — unavailable: sign in again', 'Opened: Needs you: the chat list']);
  assert.deepEqual([worker.ignored(), world.calls], [['needs-1'], []]);
  // A third failure, and a later run of failures that day, open none; the later run's first failure is one line.
  await worker.dispatch([chatsDown(true)]);
  await worker.dispatch([{ event: 'read', source: 'chats' }]);
  await worker.dispatch([chatsDown()]);
  await worker.dispatch([chatsDown(true)]);
  assert.equal(opened.length, 1);
  assert.equal(lines(stateDir).length, 3);
  // The next day opens one again.
  world.t = Date.parse('2026-11-01T14:00:00Z');
  await worker.dispatch([chatsDown(true)]);
  assert.equal(opened.length, 2);
  assert.deepEqual(needs(stateDir).chats, ['needs-1', 'needs-2']);
});

test('a success between two failures opens none, and each kind counts alone', async () => {
  const { worker, opened, stateDir } = needsRig();
  const paseoDown = { event: 'not-read', source: 'workspaces', error: 'daemon stopped' };
  await worker.dispatch([chatsDown(), paseoDown, { event: 'read', source: 'chats' }]);
  await worker.dispatch([chatsDown(), { event: 'not-read', source: 'to-dos', error: 'git' }, { event: 'not-read', source: 'add-on a.mjs', again: true }]);
  assert.deepEqual(opened, []);
  assert.deepEqual(lines(stateDir), ['Not read: chats — unavailable: sign in again', 'Not read: workspaces — daemon stopped',
    'Not read: chats — unavailable: sign in again', 'Not read: to-dos — git']);
  await worker.dispatch([{ ...paseoDown, again: true }]);
  assert.deepEqual(opened.map(chat => chat.title), ['Needs you: Paseo']);
  assert.match(opened[0].message, /1\. Run `paseo ls`\./);
  assert.deepEqual(needs(stateDir).counts, { chats: 1, paseo: 2 });
});

test('a chat Paseo can not open journals Not opened with the reason, and is not tried again that day', async () => {
  const { worker, opened, stateDir } = needsRig(() => new Error('Paseo daemon is not running'));
  for (const again of [false, true, true]) await worker.dispatch([chatsDown(again)]);
  assert.equal(opened.length, 1);
  assert.deepEqual(lines(stateDir).slice(1), ['Not opened: Needs you: the chat list — Paseo daemon is not running']);
  assert.deepEqual(worker.ignored(), []);
  const none = needsRig(() => ({ ok: true }));
  for (const again of [false, true]) await none.worker.dispatch([chatsDown(again)]);
  assert.deepEqual(lines(none.stateDir).slice(1), ['Not opened: Needs you: the chat list — Paseo did not start the chat.']);
});

test('a dry run prints wouldOpen and opens nothing', async () => {
  const r = needsRig();
  await r.worker.dispatch([chatsDown()]);
  const printed = [];
  const dry = r.make({ dryRun: true, print: item => printed.push(item), openChat: async () => assert.fail('opened') });
  await dry.dispatch([chatsDown(true)]);
  assert.deepEqual(printed.map(item => item.wouldOpen), ['Needs you: the chat list']);
  assert.deepEqual(needs(r.stateDir), { counts: { chats: 1 }, opened: {}, chats: [] });
});

test("the service watch leaves a Needs you chat alone", async () => {
  const stateDir = folder();
  writeFileSync(join(stateDir, 'needs-you.json'), JSON.stringify({ counts: {}, opened: {}, chats: ['needs-1'] }));
  const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
    places: { home: '.' }, checks: [] });
  const inspected = [];
  const chat = id => ({ id, shortId: id, name: id, provider: 'claude', status: 'idle', cwd: `/w/${id}`, created: '2026-11-03T13:00:00Z' });
  const call = async args => {
    if (args[0] === 'ls') return [chat('needs-1'), chat('other-1')];
    if (args[0] === 'inspect') { inspected.push(args[1]); return { Id: args[1], ParentAgentId: null, UpdatedAt: '2026-11-03T13:30:00Z' }; }
    return [];
  };
  await serveDaily({ config, project: folder(), stateDir, call, env: { HOME: folder() }, once: true, watching: {},
    started: () => ({}), watcher: () => ({ close() {} }), ownRepo: () => true, now: () => Date.parse('2026-11-03T14:00:00Z') });
  assert.deepEqual(inspected, ['other-1']);
});

// ---------------------------------------------------------------------------
// The morning start, with no chat

/** A settings file with a routine left in it and a morning add-on, fake add-ons, and one serve pass at `at`. */
function morningRig({ morning, addonEvents = [] } = {}) {
  const project = folder(), stateDir = folder(), ran = [];
  mkdirSync(join(project, '.agents/daily'), { recursive: true });
  writeFileSync(join(project, '.agents/daily/jobs.json'), JSON.stringify({ sweeps: [{ id: 'wiki-tidy', off: true }, { id: 'line-up', off: true }] }));
  const raw = { version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { chats: true },
    places: { home: '.' }, sweeps: '.agents/daily/jobs.json', addons: { morning: ['shop.mjs'], pass: [] }, ...(morning && { morning }),
    checks: [{ id: 'news', enabled: true, title: 'Morning news', place: 'home', scope: 'Today', result: 'A list', procedure: '.agents/skills/news/SKILL.md',
      cadence: { kind: 'daily' }, effects: 'Reads only', activeFrom: '2026-01-05', start: 'run', missed: 'latest' }] };
  const config = validateConfig(raw);
  const addons = async ({ context }) => { ran.push(context.kind); return { lines: ['Two new orders'], events: addonEvents, skip: [],
    failed: [{ addon: 'bank.mjs', error: 'down' }] }; };
  const startDay = options => start({ config, project, stateDir, addons, ...options });
  const call = async args => (args[0] === 'ls' || args[0] === 'permit' ? [] : { ok: true });
  const serve = (at, more = {}) => serveDaily({ config, project, stateDir, call, env: { HOME: folder() }, once: true, hasFile: true, start: startDay,
    watching: {}, started: () => ({}), watcher: () => ({ close() {} }), ownRepo: () => true,
    now: () => Date.parse(at), ...more });
  return { raw, config, project, stateDir, ran, addons, startDay, serve };
}

/** One worker over `r` that reads the settings file each pass as `daily.mjs serve` does; `steps` run between passes. */
async function servePasses(r, steps) {
  const clock = { at: '2026-11-03T14:00:00Z' };
  const settings = () => {
    const found = personSettings({ repo: r.project, ctx: { author: 'alex@example.com' }, origin: null });
    return { config: found.config, hasFile: Boolean(found.me.file) };
  };
  const done = new Error('passes done');
  let sleeps = 0;
  await assert.rejects(r.serve(clock.at, { settings, once: false, seconds: 5, now: () => Date.parse(clock.at), sleep: async () => {
    if (++sleeps % 5) return;
    const step = steps.shift();
    if (!step) throw done;
    step(clock);
  } }), error => error === done);
}
const writeSettings = (r, more) => writeFileSync(join(r.project, '.agents/daily/alex.json'), JSON.stringify({ ...r.raw, ...more }));

test('the morning runs nothing before 8:00, and at 8:00 runs the add-ons once; a left routine starts nothing and gets one line', async () => {
  const r = morningRig();
  await r.serve('2026-11-03T12:59:00Z');
  assert.deepEqual([r.ran, lines(r.stateDir)], [[], []]);
  await r.serve('2026-11-03T13:00:00Z');
  assert.deepEqual(r.ran, ['morning']);
  assert.deepEqual(lines(r.stateDir), ['Routines wait to move to the app, and do not start: Morning news', 'Two new orders',
    'Not read: add-on bank.mjs — down']);
  // A second pass, and a second worker over the same state after a restart, run nothing again.
  await r.serve('2026-11-03T15:30:00Z');
  await r.serve('2026-11-03T15:31:00Z', { start: options => start({ config: r.config, project: r.project, stateDir: r.stateDir,
    addons: r.addons, ...options }) });
  assert.deepEqual(r.ran, ['morning']);
  assert.equal(lines(r.stateDir).length, 3);
});

test('the first pass after a late start runs the morning, at the time the settings name', async () => {
  const r = morningRig({ morning: '10:30' });
  await r.serve('2026-11-03T15:29:00Z');
  assert.deepEqual(r.ran, []);
  await r.serve('2026-11-03T18:00:00Z');
  assert.deepEqual(r.ran, ['morning']);
});

test('with no settings file the morning starts nothing', async () => {
  const r = morningRig();
  await r.serve('2026-11-03T14:00:00Z', { hasFile: false });
  assert.deepEqual([r.ran, lines(r.stateDir)], [[], []]);
});

test('a settings file made after the worker started gets its morning at the next pass', async () => {
  const r = morningRig();
  const seen = [];
  await servePasses(r, [() => { seen.push([...r.ran]); writeSettings(r); }]);
  assert.deepEqual([seen, r.ran], [[[]], ['morning']]);
});

test("a changed morning time counts at the worker's next pass", async () => {
  const r = morningRig();
  writeSettings(r, { morning: '10:30' });
  const seen = [];
  await servePasses(r, [
    clock => { seen.push([...r.ran]); clock.at = '2026-11-03T14:30:00Z'; },
    () => { seen.push([...r.ran]); writeSettings(r, { morning: '09:00' }); }]);
  assert.deepEqual([seen, r.ran], [[[], []], ['morning']]);
});

test('a settings file the worker can not read is journaled once a day and skips the morning until it is fixed', async () => {
  const r = morningRig();
  writeSettings(r, { morning: '8am' });
  await servePasses(r, [() => {}, () => writeSettings(r)]);
  assert.deepEqual(r.ran, ['morning']);
  assert.equal(lines(r.stateDir).filter(line => line.startsWith('Not read: the settings file')).length, 1);
});

test('the beat holds the stamp of the code the worker started with', async () => {
  const r = morningRig();
  await r.serve('2026-11-03T12:00:00Z');
  assert.equal(JSON.parse(readFileSync(join(r.stateDir, 'serve.json'), 'utf8')).code, codeStamp());
  assert.match(codeStamp(), /^[0-9a-f]{12}$/);
});

test("a morning add-on's events go to dispatch, the same path as a pass add-on's", async () => {
  const r = morningRig({ addonEvents: [{ event: 'order', id: 7, addon: 'shop.mjs' }] });
  const dispatched = [];
  await morningPass({ config: r.config, stateDir: r.stateDir, start: r.startDay, dispatch: async events => { dispatched.push(...events); },
    date: new Date('2026-11-03T13:05:00Z') });
  assert.deepEqual(dispatched, [{ event: 'order', id: 7, addon: 'shop.mjs' }]);
});

test('a dry run prints the add-on it would run, and runs nothing', async () => {
  const r = morningRig();
  const printed = [];
  await r.serve('2026-11-03T13:05:00Z', { dryRun: true, print: item => printed.push(item) });
  assert.deepEqual(printed.filter(item => item.wouldRun), [{ wouldRun: 'add-on', addon: 'shop.mjs' }]);
  assert.deepEqual(r.ran, []);
  assert.equal(existsSync(join(r.stateDir, 'morning-2026-11-03.json')), false);
});

test('a morning that throws is one line, the second pass opens one Needs you chat, and the watch still runs', async () => {
  const r = morningRig();
  let watched = 0;
  const call = async args => { if (args.join(' ') === 'ls --global') watched += 1; return args[0] === 'ls' || args[0] === 'permit' ? [] : { ok: true }; };
  const broken = async () => { throw new Error('no place'); };
  const opened = [];
  const openChat = async chat => { opened.push(chat); return { agentId: 'needs-morning' }; };
  let sleeps = 0;
  const done = new Error('three passes');
  await assert.rejects(r.serve('2026-11-03T14:00:00Z', { call, start: broken, once: false, openChat, guide: null,
    sleep: async () => { if (++sleeps > 120) throw done; } }), error => error === done);
  assert.deepEqual(lines(r.stateDir), ['Not started: the morning — no place', 'Opened: Needs you: the morning start']);
  assert.equal(opened.length, 1);
  assert.match(opened[0].message, /Reason: no place\nSteps to fix it:\n1\. Run `node \.claude\/skills\/daily\/scripts\/daily\.mjs start --dry-run`/);
  assert.equal(watched, 3);
});

test('a morning that works between two failures opens no chat', async () => {
  const r = morningRig();
  const fails = [true, false, true];
  const start = async options => { if (fails.shift()) throw new Error('no place'); return { ...(await r.startDay({ ...options, dryRun: true })), waiting: [] }; };
  const openChat = async () => assert.fail('opened');
  let sleeps = 0;
  const done = new Error('three passes');
  await assert.rejects(r.serve('2026-11-03T14:00:00Z', { start, once: false, openChat, sleep: async () => { if (++sleeps > 120) throw done; } }),
    error => error === done);
  assert.deepEqual(lines(r.stateDir), ['Not started: the morning — no place', 'Not started: the morning — no place']);
});
