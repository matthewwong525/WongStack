import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { finishTodo, keepTodos, repoOf, todoKey, todosFile } from '../../.agents/skills/daily/scripts/todos.mjs';

const ZONE = 'America/New_York';
// 10:00 on Wednesday 2026-10-21 in New York.
const START = Date.parse('2026-10-21T14:00:00Z');
const DAY_MS = 24 * 3600e3, MIN = 60e3;
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

/** A fake board: `tasks` by id; `down` makes each call throw; `calls` keeps each call's name and body. */
function fakeBoard() {
  const box = { tasks: new Map(), calls: [], down: false };
  const go = (name, act) => async body => { box.calls.push([name, body]); if (box.down) throw new Error('502: board down'); return act(body); };
  const byKey = key => [...box.tasks.values()].find(task => task.importKey === key);
  box.board = {
    add: go('add', ({ importKey, title, week, slot }) => {
      if (byKey(importKey)) return { ...byKey(importKey), created: false };
      const task = { id: `t${box.tasks.size + 1}`, importKey, title, week, slot, status: 'open' };
      box.tasks.set(task.id, task);
      return { ...task, created: true };
    }),
    status: go('status', ({ id, status }) => { box.tasks.get(id).status = status; return { id, status }; }),
    link: go('link', body => body),
    place: go('place', ({ id, week, slot }) => { const task = box.tasks.get(id); if (!task) throw new Error('404: not found'); Object.assign(task, { week, slot }); return task; }),
    remove: go('remove', ({ importKey }) => { const task = byKey(importKey); if (task) box.tasks.delete(task.id); return { importKey, removed: Boolean(task) }; }),
    tasks: go('tasks', week => ({ week, tasks: [...box.tasks.values()].filter(task => task.week === week) })),
  };
  box.named = name => box.calls.filter(([each]) => each === name).map(([, body]) => body);
  return box;
}

/** A fake shell: `git` gives each folder's branch and a GitHub remote; `gh` lists a PR per merged branch, or throws. */
function fakeShell(branches = {}) {
  const box = { merged: new Set(), gh: null, calls: [] };
  box.shell = async (command, args) => {
    box.calls.push([command, ...args]);
    if (command === 'git') return args.includes('rev-parse') ? `${branches[args[1]] ?? args[1].split('/').pop()}\n` : 'git@github.com:example/notes.git\n';
    if (box.gh) throw new Error(box.gh);
    return JSON.stringify(box.merged.has(args[args.indexOf('--head') + 1]) ? [{ number: 12 }] : []);
  };
  return box;
}

// A day of chats: own, handed, asked, a routine's, a board task's, and an own-looking one in a started folder.
// `pass` runs keepTodos at a time, with `more` on top.
function setup() {
  const stateDir = mkdtempSync(join(tmpdir(), 'todos-test-')); roots.push(stateDir);
  const record = {
    'routine:stretch': { workspace: 'calm-cat', cwd: '/w/calm-cat', agentId: 'agent-routine', at: new Date(START - MIN).toISOString() },
    'task:job': { workspace: 'bold-otter', cwd: '/w/bold-otter', agentId: 'agent-task', at: new Date(START - MIN).toISOString(), id: 'job' },
    'news:2026-10-21': { workspace: 'news-owl', cwd: '/w/news-owl', at: new Date(START - MIN).toISOString() },
  };
  const agent = (id, cwd) => ({ id, status: 'idle', cwd });
  const list = [agent('agent-mine', '/w/quick-elk'), agent('agent-hand', '/w/team-yak'), agent('agent-ask', '/w/new-elk'), agent('agent-routine', '/w/calm-cat'),
    agent('agent-task', '/w/bold-otter'), agent('agent-news', '/w/news-owl/')];
  const rows = [{ agentId: 'agent-mine', title: 'Fix the Notes page', workspace: 'quick-elk', source: 'own' },
    { agentId: 'agent-hand', title: 'Team plan', workspace: 'team-yak', source: 'handed' },
    { agentId: 'agent-ask', title: 'Book the dentist', workspace: 'new-elk', source: 'asked' },
    { agentId: 'agent-routine', title: 'Stretch', workspace: 'calm-cat', source: 'started' },
    { agentId: 'agent-task', title: 'Task: Post the editor job', workspace: 'bold-otter', source: 'started', task: 'job' },
    { agentId: 'agent-news', title: 'Task: News', workspace: 'news-owl', source: 'own' }];
  const box = fakeBoard();
  const shell = fakeShell({ '/w/team-yak': 'main' });
  const logs = [];
  const pass = (at, more = {}) => keepTodos({ stateDir, rows, list, started: () => record, board: box.board, timezone: ZONE, now: new Date(at), shell: shell.shell,
    read: file => readJson(file, {}), write: writeJson, log: text => logs.push(text), ...more });
  const kept = () => readJson(todosFile(stateDir), {});
  return { stateDir, record, list, rows, box, shell, logs, pass, kept };
}

test('a chat the person opened, handed or asked for gets one to-do on today, in progress, named for its chat; a routine, a board task or a daily folder gets none', async () => {
  const t = setup();
  await t.pass(START);
  await t.pass(START + MIN);
  assert.deepEqual(t.box.named('add'), [
    { importKey: todoKey('agent-mine'), title: 'Fix the Notes page', week: '2026-10-19', slot: 'wed' },
    { importKey: todoKey('agent-hand'), title: 'Team plan', week: '2026-10-19', slot: 'wed' },
    { importKey: todoKey('agent-ask'), title: 'Book the dentist', week: '2026-10-19', slot: 'wed' }]);
  assert.deepEqual([...t.box.tasks.values()].map(task => task.status), ['in_progress', 'in_progress', 'in_progress']);
  assert.deepEqual(t.box.named('link'), [{ id: 't1', chat: 'quick-elk' }, { id: 't2', chat: 'team-yak' }, { id: 't3', chat: 'new-elk' }]);
  const mine = t.kept()['agent-mine'];
  assert.deepEqual([mine.taskId, mine.state, mine.day, mine.branch, mine.repo], ['t1', 'open', '2026-10-21', 'quick-elk', 'example/notes']);
  assert.deepEqual(Object.keys(t.kept()).sort(), ['agent-ask', 'agent-hand', 'agent-mine']);
});

test("no to-do starts for a chat an add-on skips, while adding is off, or while a daily launch is pending", async () => {
  const t = setup();
  await t.pass(START, { skip: new Set(['agent-mine']), adding: false });
  assert.deepEqual(t.box.named('add'), []);
  t.record['task:new'] = { pending: true, at: new Date(START - 5 * MIN).toISOString() };
  await t.pass(START);
  assert.deepEqual(t.box.named('add'), [], 'a new chat may be the pending launch');
  t.record['task:new'].at = new Date(START - 11 * MIN).toISOString();
  await t.pass(START, { skip: new Set(['agent-mine']) });
  assert.deepEqual(t.box.named('add').map(body => body.importKey), [todoKey('agent-hand'), todoKey('agent-ask')]);
});

test('a board that does not answer adds nothing and says why; the next pass adds the to-do once', async () => {
  const t = setup();
  t.box.down = true;
  await t.pass(START);
  assert.deepEqual(t.kept(), {});
  assert.ok(t.logs.length && t.logs.every(text => text === 'To-do not added: 502: board down'));
  t.box.down = false;
  await t.pass(START + MIN);
  assert.equal(Object.keys(t.kept()).length, 3);
});

test("a live chat's undone to-do moves to the end of today on a new day; one done on the board stays done; one the person deleted is left", async () => {
  const t = setup();
  await t.pass(START);
  t.box.tasks.get('t2').status = 'done';
  t.box.tasks.delete('t3');
  await t.pass(START + DAY_MS);
  assert.deepEqual(t.box.named('place'), [{ id: 't1', week: '2026-10-19', slot: 'thu', index: 9999 }, { id: 't3', week: '2026-10-19', slot: 'thu', index: 9999 }]);
  assert.deepEqual(Object.values(t.kept()).map(entry => [entry.taskId, entry.state, entry.day]),
    [['t1', 'open', '2026-10-22'], ['t2', 'done-open', '2026-10-21'], ['t3', 'removed', '2026-10-21']]);
  // The same day again: nothing moves.
  await t.pass(START + DAY_MS + MIN);
  assert.equal(t.box.named('place').length, 2);
});

test("a gone chat's to-do is done on proof or a merge, leaves the board on a clear not-merged, and stays on doubt", async () => {
  const t = setup();
  await t.pass(START);
  const gone = id => { t.list.find(agent => agent.id === id).status = 'closed'; };
  // A proof the board did not take, a merged branch, and a chat on main, which holds no work branch.
  writeJson(todosFile(t.stateDir), { ...t.kept(), 'agent-ask': { ...t.kept()['agent-ask'], proof: 'PR #9 merged' } });
  t.shell.merged.add('quick-elk');
  for (const id of ['agent-mine', 'agent-hand', 'agent-ask']) gone(id);
  t.shell.gh = 'gh: not logged in';
  await t.pass(START + 10 * MIN);
  assert.deepEqual(Object.values(t.kept()).map(entry => entry.state), ['open', 'removed', 'done'], 'gh did not answer: the merged one waits');
  t.shell.gh = null;
  await t.pass(START + 11 * MIN);
  assert.deepEqual(Object.values(t.kept()).map(entry => entry.state), ['done', 'removed', 'done']);
  assert.deepEqual([...t.box.tasks.values()].map(task => [task.id, task.status]), [['t1', 'done'], ['t3', 'done']]);
  assert.deepEqual(t.box.named('remove'), [{ importKey: todoKey('agent-hand') }]);
});

test('a gone chat whose branch did not merge leaves the board, unless the board does not answer', async () => {
  const t = setup();
  await t.pass(START);
  t.list.find(agent => agent.id === 'agent-mine').status = 'closed';
  t.box.down = true;
  await t.pass(START + MIN);
  assert.equal(t.kept()['agent-mine'].state, 'open');
  t.box.down = false;
  await t.pass(START + 2 * MIN);
  assert.equal(t.kept()['agent-mine'].state, 'removed');
  assert.equal(t.box.tasks.has('t1'), false);
  // A chat seen again never gets a second to-do.
  t.list.find(agent => agent.id === 'agent-mine').status = 'idle';
  await t.pass(START + 3 * MIN);
  assert.equal(t.box.named('add').filter(body => body.importKey === todoKey('agent-mine')).length, 1);
});

test("a to-do for a chat that an add-on skips later leaves the board", async () => {
  const t = setup();
  await t.pass(START);
  await t.pass(START + MIN, { skip: new Set(['agent-mine']) });
  assert.deepEqual([t.kept()['agent-mine'].state, t.box.tasks.has('t1')], ['removed', false]);
});

test('a final entry is kept 60 days, then goes', async () => {
  const t = setup();
  writeJson(todosFile(t.stateDir), { 'agent-gone': { taskId: 'x', state: 'done', at: new Date(START).toISOString(), endedAt: new Date(START).toISOString() } });
  await t.pass(START + 59 * DAY_MS, { adding: false });
  assert.ok(t.kept()['agent-gone']);
  await t.pass(START + 61 * DAY_MS, { adding: false });
  assert.equal(t.kept()['agent-gone'], undefined);
});

test('finishTodo marks an open to-do done, says none for a chat with none, and keeps the proof when the board does not confirm', async () => {
  const t = setup();
  await t.pass(START);
  const go = agentId => finishTodo({ stateDir: t.stateDir, agentId, proof: 'PR #12 merged', board: t.box.board, read: file => readJson(file, {}), write: writeJson });
  assert.deepEqual(await go('agent-mine'), { state: 'done', task: 't1' });
  assert.equal(t.kept()['agent-mine'].state, 'done-open', 'its chat gets /close next');
  assert.deepEqual(await go('agent-mine'), { state: 'done' });
  assert.deepEqual(await go('agent-other'), { state: 'none' });
  t.box.down = true;
  assert.deepEqual(await go('agent-hand'), { state: 'not confirmed', reason: '502: board down' });
  const kept = JSON.parse(readFileSync(todosFile(t.stateDir), 'utf8'));
  assert.deepEqual([kept['agent-hand'].state, kept['agent-hand'].proof], ['open', 'PR #12 merged']);
});

test('repoOf reads a GitHub remote over https or ssh, and null for any other', () => {
  assert.equal(repoOf('https://github.com/example/notes.git'), 'example/notes');
  assert.equal(repoOf('git@github.com:example/notes.git\n'), 'example/notes');
  assert.equal(repoOf('https://github.com/example/notes'), 'example/notes');
  for (const other of ['https://gitlab.com/a/b.git', '', null, 'not a remote']) assert.equal(repoOf(other), null, String(other));
});

/** A fake `/close` sender: `sent` keeps each chat it reached; `fail` makes each send throw. */
function fakeSend() {
  const box = { sent: [], fail: null, lines: [], typed: {} };
  box.more = { send: async id => { if (box.fail) throw new Error(box.fail); box.sent.push(id); }, line: event => box.lines.push(event),
    typedAt: id => box.typed[id] ?? null };
  return box;
}

test("a Done marked mid-day is seen within 5 minutes, and the idle chat gets /close once; a gone chat's entry ends done", async () => {
  const t = setup();
  const close = fakeSend();
  await t.pass(START, close.more);
  t.box.tasks.get('t1').status = 'done';
  await t.pass(START + 2 * MIN, close.more);
  assert.deepEqual([close.sent, t.box.named('tasks').length], [[], 0], 'the board is read at most every 5 minutes');
  await t.pass(START + 5 * MIN, close.more);
  assert.deepEqual(close.sent, ['agent-mine']);
  assert.deepEqual(close.lines.map(event => [event.event, event.text]), [['closed-on-done', 'Closed on Done: Fix the Notes page']]);
  assert.equal(t.kept()['agent-mine'].state, 'done-open');
  await t.pass(START + 6 * MIN, close.more);
  assert.deepEqual(close.sent, ['agent-mine'], 'sent once');
  t.list.find(agent => agent.id === 'agent-mine').status = 'closed';
  await t.pass(START + 7 * MIN, close.more);
  assert.equal(t.kept()['agent-mine'].state, 'done');
  assert.equal(t.box.tasks.get('t1').status, 'done');
});

test('a Done chat waits while it works and for 15 minutes after the person wrote; the chief never closes its own chats', async () => {
  const t = setup();
  const close = fakeSend();
  await t.pass(START, close.more);
  for (const id of ['t1', 't2', 't3']) t.box.tasks.get(id).status = 'done';
  t.list.find(agent => agent.id === 'agent-mine').status = 'running';
  close.typed['agent-hand'] = new Date(START).toISOString();
  await t.pass(START + 5 * MIN, { ...close.more, never: new Set(['agent-ask']) });
  assert.deepEqual(close.sent, []);
  assert.equal(t.kept()['agent-ask'].state, 'done', 'never closed, and not tried again');
  t.list.find(agent => agent.id === 'agent-mine').status = 'idle';
  await t.pass(START + 6 * MIN, close.more);
  assert.deepEqual(close.sent, ['agent-mine'], 'the person wrote 6 minutes ago: team plan waits');
  await t.pass(START + 15 * MIN, close.more);
  assert.deepEqual(close.sent, ['agent-mine', 'agent-hand']);
});

test('a /close that fails is tried on the next pass, and after 3 failures says Not closed and stops', async () => {
  const t = setup();
  const close = fakeSend();
  await t.pass(START, close.more);
  t.box.tasks.get('t1').status = 'done';
  close.fail = 'paseo: send failed';
  for (const minutes of [5, 6, 7, 8]) await t.pass(START + minutes * MIN, { ...close.more, never: new Set(['agent-hand', 'agent-ask']) });
  assert.deepEqual(close.lines.map(event => [event.event, event.text]), [['not-closed', 'Not closed: Fix the Notes page']]);
  assert.deepEqual([t.kept()['agent-mine'].state, t.kept()['agent-mine'].closeTries], ['done', 3]);
});

test('a to-do the person sets back to undone before the /close goes is open again, and its chat gets no /close', async () => {
  const t = setup();
  const close = fakeSend();
  await t.pass(START, close.more);
  t.box.tasks.get('t1').status = 'done';
  t.list.find(agent => agent.id === 'agent-mine').status = 'running';
  await t.pass(START + 5 * MIN, { ...close.more, never: new Set(['agent-hand', 'agent-ask']) });
  assert.equal(t.kept()['agent-mine'].state, 'done-open', 'it waits while its chat works');
  t.box.tasks.get('t1').status = 'in_progress';
  t.list.find(agent => agent.id === 'agent-mine').status = 'idle';
  await t.pass(START + 6 * MIN, close.more);
  assert.deepEqual(close.sent, []);
  assert.deepEqual([t.kept()['agent-mine'].state, t.kept()['agent-mine'].endedAt], ['open', null]);
  t.box.down = true;
  t.box.tasks.get('t1').status = 'done';
  await t.pass(START + 12 * MIN, close.more);
  t.box.down = false;
  await t.pass(START + 13 * MIN, close.more);
  assert.deepEqual(close.sent, ['agent-mine'], 'Done again: the /close goes');
});

test('a done-open entry whose /close went, or whose chat never went quiet, goes 60 days after its Done', async () => {
  const t = setup();
  const at = new Date(START).toISOString();
  writeJson(todosFile(t.stateDir), {
    'agent-mine': { taskId: 'x', state: 'done-open', day: '2026-10-21', closeAsked: at, closeTries: 0, at, endedAt: at },
    'agent-hand': { taskId: 'y', state: 'done-open', day: '2026-10-21', closeAsked: null, closeTries: 0, at, endedAt: at },
  });
  const close = fakeSend();
  t.list.find(agent => agent.id === 'agent-hand').status = 'running';
  await t.pass(START + 59 * DAY_MS, { ...close.more, adding: false });
  assert.deepEqual(Object.keys(t.kept()).sort(), ['agent-hand', 'agent-mine']);
  await t.pass(START + 61 * DAY_MS, { ...close.more, adding: false });
  assert.deepEqual([t.kept(), close.sent], [{}, []]);
});
