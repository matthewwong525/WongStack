import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';
import { actions, agentEvents, allow, answer, chiefDay, chiefEnv, close, doneAgent, hand, linkAllowed, mark, messageMark, noteEnd, reply, remind,
  remindKey, serve, status, streak, todoLink, userAt, watch, watchStops, watched } from '../../.agents/skills/daily/scripts/chief.mjs';

const ZONE = 'America/New_York';
const SELF = 'agent-self';
const env = { PASEO_AGENT_ID: SELF };
// 10:00 on Wednesday 2026-10-21 in New York.
const START = Date.parse('2026-10-21T14:00:00Z');
const HOUR = 3600e3, MIN = 60e3;
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

// Two rows started today (one by id, one by folder), one from yesterday, this chat and a stranger's; `paseo` fakes
// the CLI, and a chat with no `inspect` entry last worked 30 hours ago.
function day() {
  const stateDir = mkdtempSync(join(tmpdir(), 'chief-test-')); roots.push(stateDir);
  const record = {
    'task:job': { workspace: 'bold-otter', cwd: '/w/bold-otter', agentId: 'agent-job', at: new Date(START - HOUR).toISOString(), title: 'Post the editor job', id: 'job' },
    'email:2026-10-21': { workspace: 'calm-cat', cwd: join(homedir(), 'w/calm-cat'), at: new Date(START - HOUR).toISOString() },
    'task:old': { workspace: 'old-owl', cwd: '/w/old-owl', agentId: 'agent-old', at: new Date(START - 30 * HOUR).toISOString(), title: 'Old task', id: 'old' },
  };
  const agent = (id, name, cwd, status = 'idle') => ({ id, shortId: id.slice(0, 7), name, provider: 'claude', status, cwd, created: '2026-10-21T13:00:00Z' });
  const paseo = {
    list: [agent('agent-job', 'Task: Post the editor job', '/w/bold-otter'), agent('agent-email', 'Answer email', '~/w/calm-cat', 'running'),
      agent('agent-old', 'Task: Old task', '/w/old-owl'), agent('agent-team', 'Team plan', '/w/team-yak'), agent('agent-stranger', 'Other work', '/w/sly-fox'),
      agent(SELF, 'Daily', '/w/daily')],
    pending: [{ id: 'req-x', agentId: 'agent-stranger', name: 'AskUserQuestion', description: 'Yes / No' }],
    logs: { 'agent-job': 'I made the draft. Next I check the copy.', 'agent-team': 'Which plan do you want?' },
    inspect: {}, calls: [], sent: [], workspaces: [], tools: {},
  };
  const call = async args => {
    paseo.calls.push(args);
    const [name, sub] = args;
    if (name === 'ls') {
      const [key, value] = args.includes('--label') ? args[args.indexOf('--label') + 1].split('=') : [];
      return structuredClone(key ? paseo.list.filter(agent => agent.labels?.[key] === value) : paseo.list);
    }
    if (name === 'permit' && sub === 'ls') return structuredClone(paseo.pending);
    if (name === 'permit' && (sub === 'deny' || sub === 'allow')) { paseo.pending = paseo.pending.filter(ask => ask.id !== args[3]); return { ok: true }; }
    if (name === 'logs' && args.includes('tools')) return paseo.tools[args[1]] ?? '';
    if (name === 'logs') {
      const tail = args.indexOf('--tail');
      const lines = (paseo.logs[args[1]] ?? '').split('\n');
      return (tail < 0 ? lines : lines.slice(-Number(args[tail + 1]))).join('\n');
    }
    if (name === 'inspect') return { Id: args[1], ParentAgentId: null, UpdatedAt: new Date(START - 30 * HOUR).toISOString(), ...paseo.inspect[args[1]] };
    if (name === 'send') { paseo.sent.push([args[1], readFileSync(args[3], 'utf8')]); return { ok: true }; }
    if (name === 'workspace' && sub === 'ls') return structuredClone(paseo.workspaces);
    if (name === 'workspace' && sub === 'archive' || name === 'archive') {
      const gone = name === 'archive' ? args[1] : paseo.list.find(agent => paseo.workspaces.some(each => each.workspaceId === args[2] && each.cwd === agent.cwd))?.id;
      paseo.list = paseo.list.filter(agent => agent.id !== gone);
      return { ok: true };
    }
    throw new Error(`unexpected call ${args.join(' ')}`);
  };
  const boardTasks = { job: 'in_progress' };
  let boardDown = false;
  const board = async week => { if (boardDown) throw new Error('502: board down'); return { week, tasks: Object.entries(boardTasks).map(([id, status]) => ({ id, status })) }; };
  const started = () => record;
  const at = { stateDir, started, timezone: ZONE, call };
  const lines = [];
  // When the person last typed in each chat, as Paseo's agent record keeps it.
  const typed = {};
  const once = (now, more = {}) => watch({ ...at, board, env, once: true, now: () => now, print: line => lines.push(JSON.parse(line)),
    typedAt: id => typed[id] ?? null, ...more });
  const taken = () => lines.splice(0).map(({ event, agent, request, source, reason }) => [event, agent ?? source ?? reason, request?.id].filter(Boolean));
  // A chat of the person's own that worked `ago` before START.
  const own = (id, name, { status = 'idle', ago = 2 * HOUR, parent = null, cwd = `/w/${id}` } = {}) => {
    paseo.list.push(agent(id, name, cwd, status));
    paseo.inspect[id] = { ParentAgentId: parent, UpdatedAt: new Date(START - ago).toISOString() };
  };
  return { stateDir, record, paseo, call, at, board: boardTasks, down: value => { boardDown = value; }, lines, once, taken, own, typed,
    dayAt: now => chiefDay({ ...at, now: new Date(now) }) };
}

test('the watch list is today\'s started rows, by id or by folder, and the hands; never yesterday\'s rows, this chat or a stranger', async () => {
  const { at, paseo } = day();
  const today = '2026-10-21';
  assert.deepEqual(watched({ ...at, day: today, list: paseo.list, self: SELF }).map(row => [row.agentId, row.source, row.task]),
    [['agent-job', 'started', 'job'], ['agent-email', 'started', undefined]]);
  assert.deepEqual(await hand({ ...at, day: today, agent: 'Team plan', source: 'asked', env, now: new Date(START) }),
    { status: 'handed', agent: 'agent-team', title: 'Team plan', workspace: 'team-yak', source: 'asked' });
  assert.deepEqual(watched({ ...at, day: today, list: paseo.list, self: SELF }).map(row => row.agentId), ['agent-job', 'agent-email', 'agent-team']);
  // A stranger's chat is never sent anything.
  const refused = await reply({ ...at, day: today, agent: 'agent-stranger', text: 'Keep going.', bucket: 'keep-going', label: 'x', env });
  assert.equal(refused.reason, 'unwatched');
  assert.deepEqual(paseo.sent, []);
});

test('hand finds a chat by id, id prefix, title or workspace, and refuses this chat, an unknown name and a name for two chats', async () => {
  const { at, paseo } = day();
  const go = agent => hand({ ...at, day: '2026-10-21', agent, env, now: new Date(START) });
  assert.equal((await go('agent-team')).status, 'handed');
  assert.equal((await go('team plan')).status, 'already');
  assert.deepEqual([(await go('agent-st')).agent, (await go('sly-fox')).status], ['agent-stranger', 'already']);
  assert.equal((await go('agent-job')).status, 'already');
  assert.equal((await go(SELF)).status, 'refused');
  assert.equal((await go('Nobody')).status, 'unknown');
  paseo.list.push({ ...paseo.list[3], id: 'agent-team-2' });
  assert.equal((await go('Team plan')).status, 'ambiguous');
  assert.equal((await hand({ ...at, day: '2026-10-21', agent: 'agent-team', env: {} })).status, 'unsupported');
});

test('watch says asking, stopped once per idle spell, gone, done and not read one time each, and a second watch repeats none of it', async () => {
  const t = day();
  await hand({ ...t.at, day: '2026-10-21', agent: 'Team plan', env, now: new Date(START) });
  t.paseo.pending.push({ id: 'req-1', agentId: 'agent-team', name: 'AskUserQuestion', description: 'Build it (Recommended) / Wait' });
  await t.once(START);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job'], ['asking', 'agent-team', 'req-1']]);
  t.paseo.pending.push({ id: 'req-2', agentId: 'agent-team', name: 'AskUserQuestion', description: 'A / B' });
  await t.once(START + 60e3);
  // The asking line holds the card's choices and the agent's last message: the CLI lists no question text.
  assert.deepEqual(t.lines.splice(0), [{ event: 'asking', agent: 'agent-team', title: 'Team plan', workspace: 'team-yak', source: 'handed',
    request: { id: 'req-2', name: 'AskUserQuestion', description: 'A / B' }, last: 'Which plan do you want?', mark: messageMark('Which plan do you want?') }]);
  // Nothing changed: nothing is said. A stranger's question is never said.
  await t.once(START + 120e3);
  assert.deepEqual(t.taken(), []);
  // The job runs and stops again: a new idle spell. The chief replies to an idle agent: that also starts a new spell.
  t.paseo.list[0].status = 'running';
  await t.once(START + 180e3);
  t.paseo.list[0].status = 'idle';
  await t.once(START + 240e3);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  assert.equal((await reply({ ...t.at, day: '2026-10-21', agent: 'bold-otter', text: 'Keep going.', bucket: 'keep-going', label: 'Keep going: job', env,
    now: new Date(START + 250e3) })).status, 'sent');
  await t.once(START + 300e3);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  // The team chat closes and the board shows the job done; then Paseo can't be read twice: one line each.
  t.paseo.list = t.paseo.list.filter(agent => agent.id !== 'agent-team');
  t.board.job = 'done';
  await t.once(START + 360e3);
  assert.deepEqual(t.taken(), [['gone', 'agent-team'], ['done', 'agent-job']]);
  const failing = async args => { if (args[0] === 'ls') throw new Error('daemon down'); return t.call(args); };
  await t.once(START + 420e3, { call: failing });
  await t.once(START + 480e3, { call: failing });
  assert.deepEqual(t.taken(), [['not-read', 'workspaces']]);
  // A second watch the same day says none of it again.
  await t.once(START + 540e3);
  assert.deepEqual(t.taken(), []);
  // No Paseo agent id: the watch says it can't watch, and changes nothing.
  await watch({ ...t.at, board: async () => ({ tasks: [] }), env: {}, once: true, print: line => t.lines.push(JSON.parse(line)) });
  assert.deepEqual(t.taken(), [['unsupported', 'This chat is not in Paseo, so it cannot watch other chats.']]);
});

test('a short run between two looks shows as a new last message: the watch says stopped again, and an unread message says nothing', async () => {
  const t = day();
  await t.once(START);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  // the person answers in the workspace; the job runs 30 s and stops with a new question. Both looks see it idle.
  t.paseo.logs['agent-job'] = 'Monday is set. Post at 9 or at noon?';
  await t.once(START + 60e3);
  assert.deepEqual(t.lines.splice(0).map(line => [line.event, line.last]), [['stopped', 'Monday is set. Post at 9 or at noon?']]);
  await t.once(START + 120e3);
  assert.deepEqual(t.taken(), []);
  // A message that can not be read is no new spell.
  const failing = async args => { if (args[0] === 'logs') throw new Error('logs down'); return t.call(args); };
  await t.once(START + 180e3, { call: failing });
  await t.once(START + 240e3);
  assert.deepEqual(t.taken(), []);
});

test('a board not read is said one time, and a done task is said once the board reads again', async () => {
  const t = day();
  t.down(true);
  await t.once(START);
  await t.once(START + 60e3);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job'], ['not-read', 'board']]);
  t.down(false);
  t.board.job = 'done';
  await t.once(START + 120e3);
  t.down(true);
  await t.once(START + 180e3);
  assert.deepEqual(t.taken(), [['done', 'agent-job']]);
});

test('the watch keeps its day after midnight, counts its hours from the first watch, and ends when the next daily starts', async () => {
  const t = day();
  await t.once(START);
  t.taken();
  // 01:00 the next day: no daily has started yet, so the watch keeps yesterday's list and repeats nothing.
  const night = Date.parse('2026-10-22T05:00:00Z');
  assert.equal(t.dayAt(night), '2026-10-21');
  await t.once(night);
  assert.deepEqual(t.taken(), []);
  await t.once(night, { hours: 2 });
  assert.deepEqual(t.taken(), [['end', 'time']]);
  // More than 24 hours after the first watch, today holds nothing.
  assert.equal(t.dayAt(START + 25 * HOUR), '2026-10-22');
  // A running watch ends once the next day's daily starts a task.
  const loop = watch({ ...t.at, board: async () => ({ tasks: [] }), env, now: () => night, print: line => t.lines.push(JSON.parse(line)),
    sleep: async () => { t.record['email:2026-10-22'] = { workspace: 'new-elk', cwd: '/w/new-elk', agentId: 'agent-new', at: new Date(night + HOUR).toISOString() }; } });
  await loop;
  assert.deepEqual(t.taken(), [['end', 'next-daily']]);
  assert.equal(t.dayAt(night + 2 * HOUR), '2026-10-22');
});

test('a watch with nothing left to watch ends', async () => {
  const t = day();
  t.paseo.list = t.paseo.list.filter(agent => !['agent-job', 'agent-email'].includes(agent.id));
  await t.once(START);
  // The email row, recorded before agent ids, is found only by its folder: with its chat gone, it leaves the list.
  assert.deepEqual(t.taken(), [['gone', 'agent-job']]);
  await t.once(START + 60e3);
  assert.deepEqual(t.taken(), [['end', 'empty']]);
  assert.ok(existsSync(join(t.stateDir, '2026-10-21.watch.json')));
});

test('reply sends one message to an idle watched agent, and refuses a working one, an empty message and the sixth action in a row', async () => {
  const t = day();
  const go = (agent, bucket = 'keep-going', text = 'Keep going.', n = 0) =>
    reply({ ...t.at, day: '2026-10-21', agent, text, bucket, label: `${bucket}: job`, env, now: new Date(START + n * 1000) });
  assert.equal((await go('agent-email')).reason, 'running');
  assert.equal((await go('agent-job', 'pick', '   ')).reason, 'message');
  for (let n = 0; n < 5; n++) assert.equal((await go('agent-job', n % 2 ? 'pick' : 'keep-going', 'Keep going.', n)).status, 'sent');
  const sixth = await go('Post the editor job', 'keep-going', 'Keep going.', 6);
  assert.deepEqual([sixth.status, sixth.reason], ['refused', 'streak']);
  // A word from the person resets the count.
  assert.equal((await go('agent-job', 'person', 'the person says: use the short text.', 7)).status, 'sent');
  assert.equal((await go('agent-job', 'keep-going', 'Keep going.', 8)).status, 'sent');
  assert.deepEqual(t.paseo.sent.at(-2), ['agent-job', 'the person says: use the short text.\n']);
  assert.ok(!t.paseo.calls.some(([name, id]) => name === 'send' && id !== 'agent-job'));
  // status lists each watched agent with its last action.
  const read = await status({ ...t.at, day: '2026-10-21', env });
  assert.deepEqual(read.agents.map(row => [row.agent, row.status, row.asking, row.last?.bucket ?? null]),
    [['agent-job', 'idle', 0, 'keep-going'], ['agent-email', 'running', 0, null]]);
});

test('answer passes the answer on the pending card, and refuses a card that is not pending', async () => {
  const t = day();
  await hand({ ...t.at, day: '2026-10-21', agent: 'agent-team', env, now: new Date(START) });
  t.paseo.pending.push({ id: 'req-1', agentId: 'agent-team', name: 'AskUserQuestion', description: 'Build it (Recommended) / Wait' });
  const go = request => answer({ ...t.at, day: '2026-10-21', agent: 'Team plan', request, text: 'Build it', bucket: 'pick', label: 'Picked "Build it": Team plan', env });
  assert.equal((await go('req-1')).status, 'answered');
  assert.deepEqual(t.paseo.calls.find(([name, sub]) => name === 'permit' && sub === 'deny'), ['permit', 'deny', 'agent-team', 'req-1', '--message', 'Answer: Build it']);
  assert.equal((await go('req-1')).reason, 'request');
  // The stranger's card is never answered.
  const stranger = await answer({ ...t.at, day: '2026-10-21', agent: 'agent-stranger', request: 'req-x', text: 'Yes', bucket: 'pick', label: 'x', env });
  assert.equal(stranger.reason, 'unwatched');
});

test('remind adds one board task on that day with its key, adds nothing twice, and refuses a past day', async () => {
  const added = [], keys = new Set();
  const add = async body => { added.push(body); const created = !keys.has(body.importKey); keys.add(body.importKey); return { id: `t${added.length}`, created }; };
  const go = (day, text) => remind({ day, text, today: '2026-10-21', add });
  assert.deepEqual(await go('2026-10-23', 'Call Kim'), { state: 'added', day: '2026-10-23', title: 'Call Kim', id: 't1' });
  assert.equal((await go('2026-10-23', '  call   kim ')).state, 'already');
  assert.deepEqual(added[0], { importKey: remindKey('2026-10-23', 'Call Kim'), title: 'Call Kim', week: '2026-10-19', slot: 'fri' });
  assert.match(added[0].importKey, /^daily:[A-Za-z0-9:-]{1,80}$/);
  assert.equal(added[1].importKey, added[0].importKey);
  assert.equal((await go('2026-10-20', 'Call Kim')).state, 'refused');
  assert.equal((await go('Friday', 'Call Kim')).state, 'refused');
  assert.equal((await go('2026-10-23', 'x'.repeat(201))).state, 'refused');
  assert.equal(added.length, 2);
  assert.equal((await remind({ day: '2026-10-23', text: 'Call Kim', today: '2026-10-21', add: async () => { throw new Error('401: no key'); } })).state, 'not confirmed');
});

test('the watch admits every top-level chat that worked in the last 24 hours, one inspect per chat, and never a helper or this chat', async () => {
  const t = day();
  t.own('agent-mine', 'My own chat');
  t.own('agent-older', 'Last week', { ago: 30 * HOUR });
  t.own('agent-helper', 'A helper', { status: 'running', parent: 'agent-mine' });
  const rows = () => watched({ ...t.at, day: '2026-10-21', list: t.paseo.list, self: SELF }).map(row => [row.agentId, row.source]);
  const inspected = () => t.paseo.calls.filter(([name]) => name === 'inspect').map(([, id]) => id).sort();
  await t.once(START);
  await t.once(START + MIN);
  assert.deepEqual(rows(), [['agent-job', 'started'], ['agent-email', 'started'], ['agent-mine', 'own']]);
  assert.deepEqual(inspected(), ['agent-helper', 'agent-mine', 'agent-old', 'agent-older', 'agent-stranger', 'agent-team']);
  // The older chat works again: it is inspected one more time and joins. status and reply see the same list.
  t.paseo.list.find(agent => agent.id === 'agent-older').status = 'running';
  await t.once(START + 2 * MIN);
  assert.deepEqual(rows().at(-1), ['agent-older', 'own']);
  assert.equal(inspected().filter(id => id === 'agent-older').length, 2);
  assert.deepEqual((await status({ ...t.at, day: '2026-10-21', env })).agents.map(row => row.agent), ['agent-job', 'agent-email', 'agent-mine', 'agent-older']);
  assert.equal((await reply({ ...t.at, day: '2026-10-21', agent: 'agent-helper', text: 'Keep going.', bucket: 'keep-going', label: 'x', env })).reason, 'unwatched');
  assert.ok(!inspected().includes(SELF));
});

test("a stop right after the person's own message waits 15 minutes, and a stop he answers in that time is never said", async () => {
  const t = day();
  t.own('agent-mine', 'My own chat');
  t.paseo.logs['agent-mine'] = '[User] Which tile looks best?\n[Thought] Let me look.\nThe blue one. Want me to build it?';
  await t.once(START);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  await t.once(START + 14 * MIN);
  assert.deepEqual(t.taken(), []);
  await t.once(START + 15 * MIN);
  assert.deepEqual(t.lines.splice(0).map(line => [line.event, line.agent, line.source, line.last]),
    [['stopped', 'agent-mine', 'own', 'The blue one. Want me to build it?']]);
  // Their message is their word on that chat, one time.
  const own = () => actions({ stateDir: t.stateDir, day: '2026-10-21' }).filter(entry => entry.kind === 'own-chat');
  assert.deepEqual(own().map(entry => [entry.agent, entry.bucket]), [['agent-mine', 'person']]);
  // He writes again: the agent says something new between two looks, and the stop is held again.
  const T = START + 20 * MIN;
  t.paseo.logs['agent-mine'] += '\n[User] Yes, but smaller.\nMade it smaller. Build it now?';
  await t.once(T);
  // Five minutes later he writes again and the agent runs: the stop at T is never said.
  t.paseo.list.find(agent => agent.id === 'agent-mine').status = 'running';
  await t.once(T + 5 * MIN);
  t.paseo.logs['agent-mine'] += '\n[User] Build it.\nBuilt. Look at the preview?';
  t.paseo.list.find(agent => agent.id === 'agent-mine').status = 'idle';
  await t.once(T + 6 * MIN);
  await t.once(T + 15 * MIN);
  assert.deepEqual(t.taken(), []);
  await t.once(T + 21 * MIN);
  assert.deepEqual(t.lines.splice(0).map(line => [line.event, line.last]), [['stopped', 'Built. Look at the preview?']]);
  assert.equal(own().length, 3);
});

test("a launcher's first message is not the person's, the chief's own message is never theirs, and their word resets the streak", async () => {
  const t = day();
  t.paseo.logs['agent-job'] = '[User] Post the editor job.\nI made the draft.';
  await t.once(START);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  const go = n => reply({ ...t.at, day: '2026-10-21', agent: 'agent-job', text: 'Keep going.', bucket: 'keep-going', label: 'Kept going: job', env,
    now: new Date(START + n * MIN) });
  for (let n = 1; n <= 5; n++) {
    assert.equal((await go(n)).status, 'sent');
    t.paseo.logs['agent-job'] += `\n[User] Keep going.\nStep ${n} done.`;
    await t.once(START + n * MIN + 30e3);
    assert.deepEqual(t.taken(), [['stopped', 'agent-job']], 'the stop after the chief\'s own message is said at once');
  }
  assert.equal((await go(6)).reason, 'streak');
  // the person writes in the chat: the stop waits for them, and their word ends the streak.
  t.paseo.logs['agent-job'] += '\n[User] Use the short text.\nShort text is in. Post it?';
  await t.once(START + 7 * MIN);
  assert.deepEqual(t.taken(), []);
  assert.equal(streak(actions({ stateDir: t.stateDir, day: '2026-10-21' }), 'agent-job'), 0);
  assert.equal((await go(8)).status, 'sent');
});

test("a turn longer than the log's tail still finds the person's message and the launcher's brief", async () => {
  const t = day();
  const long = said => `${'[Thought] Look at one more file.\n'.repeat(90)}${said}`;
  t.own('agent-mine', 'My own chat');
  t.paseo.logs['agent-mine'] = `[User] Clean up the tiles.\n${long('Done. Build it?')}`;
  t.paseo.logs['agent-job'] = `[User] Post the editor job.\n${long('I made the draft.')}`;
  await t.once(START);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']], "the brief is not the person's; their own chat waits for them");
  assert.ok(t.paseo.calls.some(args => args[0] === 'logs' && !args.includes('--tail')));
  // the person writes in the started chat, and its next turn is long too: it waits for them, and their word counts.
  t.paseo.logs['agent-job'] += `\n[User] Use the short text.\n${long('Short text is in. Post it?')}`;
  await t.once(START + MIN);
  assert.deepEqual(t.taken(), []);
  assert.deepEqual(actions({ stateDir: t.stateDir, day: '2026-10-21' }).filter(entry => entry.kind === 'own-chat').map(entry => entry.agent),
    ['agent-mine', 'agent-job']);
});

test('a stop whose log can not be read waits 15 minutes, as if the person wrote', async () => {
  const t = day();
  const failing = async args => { if (args[0] === 'logs') throw new Error('logs down'); return t.call(args); };
  await t.once(START, { call: failing });
  await t.once(START + 14 * MIN, { call: failing });
  assert.deepEqual(t.taken(), []);
  await t.once(START + 15 * MIN, { call: failing });
  assert.deepEqual(t.lines.splice(0).map(line => [line.event, line.agent, line.last, line.mark]), [['stopped', 'agent-job', null, null]]);
});

test('a stopped line carries a one-line preview of at most 200 characters, its mark and source; reply with an old mark is refused moved', async () => {
  const t = day();
  const said = `First part.\n\n${'word '.repeat(100)}\nLast line: post it?`;
  t.paseo.logs['agent-job'] = `[User] Post the editor job.\n${said}`;
  await t.once(START);
  const [line] = t.lines.splice(0);
  assert.deepEqual([line.event, line.source, line.mark], ['stopped', 'started', messageMark(said)]);
  assert.ok(line.last.length <= 200 && !line.last.includes('\n') && line.last.endsWith('Last line: post it?'));
  t.paseo.logs['agent-job'] += '\nOne more thing: noon or 9?';
  const go = mark => reply({ ...t.at, day: '2026-10-21', agent: 'agent-job', text: 'Noon.', bucket: 'pick', label: 'Picked "Noon": job', env, mark });
  const moved = await go(line.mark);
  assert.deepEqual([moved.status, moved.reason], ['refused', 'moved']);
  assert.deepEqual(t.paseo.sent, []);
  assert.equal((await go(messageMark(`${said}\nOne more thing: noon or 9?`))).status, 'sent');
});

const DAY = '2026-10-21';

test('close archives a workspace this Daily opened on request, takes it off the watch, and never closes the person\'s chats', async () => {
  const t = day();
  t.own('agent-fix', 'Fix the plan bug', { cwd: '/w/quick-elk', status: 'running', ago: 0 });
  t.paseo.workspaces = [{ workspaceId: 'ws-elk', cwd: '/w/quick-elk', name: 'quick-elk' }, { workspaceId: 'ws-daily', cwd: '/w/daily', name: 'Daily' }];
  t.own('agent-mine', 'My own chat');
  assert.equal((await hand({ ...t.at, day: DAY, agent: 'agent-fix', source: 'asked', env, now: new Date(START) })).status, 'handed');
  await t.once(START);
  const go = agent => close({ ...t.at, day: DAY, agent, env, now: new Date(START + MIN) });
  for (const name of ['agent-job', 'agent-mine']) assert.equal((await go(name)).status, 'refused', name);
  assert.equal((await go('agent-stranger')).status, 'unknown');
  assert.deepEqual(await go('quick-elk'), { status: 'closed', agent: 'agent-fix', title: 'Fix the plan bug', workspace: 'quick-elk', source: 'asked' });
  assert.ok(t.paseo.calls.some(args => args.join(' ') === 'workspace archive ws-elk'));
  // It leaves the watch with no gone line, and the watch never sends it anything again.
  await t.once(START + 2 * MIN);
  assert.ok(!t.lines.splice(0).some(line => line.agent === 'agent-fix'));
  assert.ok(!watched({ ...t.at, day: DAY, list: t.paseo.list, self: SELF }).some(row => row.agentId === 'agent-fix'));
  // A chat with no workspace of its own: only its agent is archived. No Paseo: unsupported.
  t.own('agent-here', 'Here', { cwd: '/w/daily' });
  await hand({ ...t.at, day: DAY, agent: 'agent-here', source: 'asked', env, now: new Date(START) });
  assert.equal((await go('agent-here')).status, 'closed');
  assert.ok(t.paseo.calls.some(args => args.join(' ') === 'archive agent-here --force'));
  assert.equal((await close({ ...t.at, day: DAY, agent: 'agent-job', env: {} })).status, 'unsupported');
});

test('a workspace a watch pass admitted before its hand still counts as one this Daily opened, so close archives it', async () => {
  const t = day();
  t.own('agent-new', 'New task', { cwd: '/w/new-elk', status: 'running', ago: 0 });
  t.paseo.workspaces = [{ workspaceId: 'ws-new', cwd: '/w/new-elk', name: 'new-elk' }];
  await t.once(START);
  const row = () => watched({ ...t.at, day: DAY, list: t.paseo.list, self: SELF }).find(each => each.agentId === 'agent-new');
  assert.equal(row().source, 'own');
  // Only an asked hand takes over an own row; a second hand finds it already watched.
  assert.equal((await hand({ ...t.at, day: DAY, agent: 'agent-new', env, now: new Date(START) })).status, 'already');
  assert.equal((await hand({ ...t.at, day: DAY, agent: 'agent-new', source: 'asked', env, now: new Date(START) })).status, 'handed');
  assert.equal((await hand({ ...t.at, day: DAY, agent: 'agent-new', source: 'asked', env, now: new Date(START) })).status, 'already');
  assert.equal(row().source, 'asked');
  assert.equal((await close({ ...t.at, day: DAY, agent: 'agent-new', env, now: new Date(START + MIN) })).status, 'closed');
  assert.ok(t.paseo.calls.some(args => args.join(' ') === 'workspace archive ws-new'));
});

// ---------------------------------------------------------------------------
// The chief on the host

/** The saved Daily agent, as `daily-workspace.json` keeps it. */
function dailyStore(saved = { workspaceId: 'wks_daily', agentId: SELF }) {
  const store = { saved };
  store.daily = { read: () => ({ ...store.saved }), write: value => { store.saved = value; } };
  return store;
}
/** The events of each `Watch ·` batch sent to `to`. */
const batches = (t, to = SELF) => t.paseo.sent.filter(([id, message]) => id === to && message.startsWith('Watch · '))
  .map(([, message]) => message.trim().split('\n').slice(1).map(text => JSON.parse(text)));
const served = (t, store, now, more = {}) => serve({ ...t.at, daily: store.daily, board: async week => ({ week, tasks: [] }),
  env: {}, once: true, now: () => now, ...more });
const todos = (t, value) => writeFileSync(join(t.stateDir, 'todos.json'), JSON.stringify(value));
/** A fake board for one command: `calls` keeps each body; `fail` makes each call throw. */
function oneBoard() {
  const box = { calls: [], fail: null };
  const go = name => async body => { box.calls.push([name, body]); if (box.fail) throw new Error(box.fail); return { ok: true }; };
  box.board = { link: go('link'), status: go('status') };
  return box;
}

test('todo link shows an allowed plan link on the chat\'s to-do or its board task, and refuses a look-alike or a chat with no task', async () => {
  const t = day();
  t.own('agent-mine', 'My own chat');
  await t.once(START);
  todos(t, { 'agent-mine': { taskId: 't-mine', state: 'open', at: new Date(START).toISOString() } });
  await hand({ ...t.at, day: DAY, agent: 'agent-team', env, now: new Date(START) });
  const box = oneBoard();
  const go = (agent, url) => todoLink({ ...t.at, day: DAY, agent, url, board: box.board, hosts: ['app.example.com'], env });
  const plan = 'https://app.example.com/apps/inbox/?item=abc';
  assert.deepEqual([(await go('agent-mine', plan)).status, (await go('agent-job', plan)).status], ['linked', 'linked']);
  assert.deepEqual(box.calls, [['link', { id: 't-mine', link: plan }], ['link', { id: 'job', link: plan }]]);
  assert.equal((await go('agent-mine', 'https://app.example.com.evil.test/inbox')).reason, 'url');
  assert.equal((await go('agent-team', plan)).reason, 'no-task');
  assert.equal((await go('agent-stranger', plan)).reason, 'unwatched');
  box.fail = '502: board down';
  assert.equal((await go('agent-mine', plan)).status, 'not confirmed');
  assert.equal(box.calls.length, 3);
});

test('done-agent marks the chat\'s to-do done with its proof, keeps a board task chat as it is, and says when the board did not confirm', async () => {
  const t = day();
  t.own('agent-mine', 'My own chat');
  t.own('agent-two', 'Second chat');
  await t.once(START);
  todos(t, { 'agent-mine': { taskId: 't-mine', state: 'open', at: new Date(START).toISOString() },
    'agent-two': { taskId: 't-two', state: 'open', at: new Date(START).toISOString() } });
  const box = oneBoard();
  const go = (agent, proof = 'PR #12 merged') => doneAgent({ ...t.at, day: DAY, agent, proof, board: box.board, env });
  const marked = await go('agent-mine');
  assert.equal(marked.todo, 'done');
  assert.deepEqual({ ...marked, todo: undefined }, { status: 'marked', agent: 'agent-mine', title: 'My own chat', workspace: 'agent-mine', source: 'own',
    proof: 'PR #12 merged', todo: undefined });
  assert.deepEqual(box.calls, [['status', { id: 't-mine', status: 'done' }]]);
  assert.equal((await go('agent-mine')).todo, 'done', 'a second done changes nothing');
  assert.equal(box.calls.length, 1);
  assert.equal((await go('agent-job')).todo, 'done', 'a board task chat marks its task done');
  assert.deepEqual(box.calls.at(-1), ['status', { id: 'job', status: 'done' }]);
  assert.equal((await go('agent-mine', '  ')).reason, 'proof');
  box.fail = '502: board down';
  const doubt = await go('agent-two');
  assert.deepEqual([doubt.status, doubt.todo], ['not confirmed', 'not confirmed']);
  assert.equal(JSON.parse(readFileSync(join(t.stateDir, 'todos.json'), 'utf8'))['agent-two'].proof, 'PR #12 merged');
});

test("a chat's own watch ends with reason service while the service runs, and watches once the service stops", async () => {
  const t = day();
  await served(t, dailyStore(), START);
  await t.once(START + MIN);
  assert.deepEqual(t.taken(), [['end', 'service']]);
  assert.equal(JSON.parse(readFileSync(join(t.stateDir, `${DAY}.watch.json`), 'utf8')).ended, undefined);
  // No pass for 10 minutes: the service is down, and the chat watches by itself.
  await t.once(START + 10 * MIN);
  assert.ok(!t.taken().some(([event]) => event === 'end'));
});

test("a chief command takes the Daily agent's id when its chat has none, and its parent's id when it is the Daily agent's helper", async () => {
  const inspect = { helper: { ParentAgentId: 'agent-daily' }, judge: { ParentAgentId: 'agent-worker' }, other: { ParentAgentId: null } };
  const call = async ([name, id]) => (name === 'inspect' ? inspect[id] : null);
  const ids = { daily: 'agent-daily' };
  const idOf = async (env, own = ids, read = call) => (await chiefEnv(env, own, read)).PASEO_AGENT_ID;
  assert.equal(await idOf({}), 'agent-daily');
  assert.equal(await idOf({ PASEO_AGENT_ID: 'helper' }), 'agent-daily');
  assert.equal(await idOf({ PASEO_AGENT_ID: 'judge' }), 'judge', 'an old helper is not the Daily agent');
  assert.equal(await idOf({ PASEO_AGENT_ID: 'other' }), 'other');
  assert.equal(await idOf({ PASEO_AGENT_ID: 'other' }, {}), 'other');
  assert.equal(await idOf({ PASEO_AGENT_ID: 'x' }, ids, async () => { throw new Error('gone'); }), 'x');
});

// ---------------------------------------------------------------------------
// Stop reports

const tempHome = () => { const home = mkdtempSync(join(tmpdir(), 'chief-home-')); roots.push(home); return home; };

test("mark touches this chat's stop report, and without a usable agent id does nothing", () => {
  const home = tempHome();
  assert.equal(agentEvents({ HOME: home }), join(home, '.wong-stack', 'agent-events'));
  assert.deepEqual(mark({ env: { HOME: home } }), { status: 'skipped' });
  for (const id of ['../escape', '..', 'a/b', '']) assert.deepEqual(mark({ env: { HOME: home, PASEO_AGENT_ID: id } }), { status: 'skipped' });
  assert.equal(existsSync(agentEvents({ HOME: home })), false);
  assert.deepEqual(mark({ env: { HOME: home, PASEO_AGENT_ID: 'agent-7' } }), { status: 'marked' });
  assert.match(readFileSync(join(agentEvents({ HOME: home }), 'agent-7'), 'utf8'), /^\d{4}-\d{2}-\d{2}T/);
});

test('daily.mjs mark prints nothing and exits 0, with or without an agent id', () => {
  const script = fileURLToPath(new URL('../../.agents/skills/daily/scripts/daily.mjs', import.meta.url));
  for (const id of [undefined, 'agent-8']) {
    const home = tempHome();
    const env = { PATH: process.env.PATH, HOME: home, ...(id && { PASEO_AGENT_ID: id }) };
    const run = spawnSync(process.execPath, [script, 'mark'], { env, encoding: 'utf8' });
    assert.deepEqual([run.status, run.stdout, run.stderr], [0, '', '']);
    assert.equal(existsSync(join(agentEvents({ HOME: home }), id ?? 'none')), Boolean(id));
  }
});

test('watchStops makes the folder and names the agent behind each report; a folder it can not watch is null', () => {
  const home = tempHome(), heard = [];
  let handler, closed = false;
  const watcher = (dir, listen) => { assert.equal(dir, agentEvents({ HOME: home })); handler = listen; return { close() { closed = true; } }; };
  const handle = watchStops({ HOME: home }, name => heard.push(name), watcher);
  assert.equal(existsSync(agentEvents({ HOME: home })), true);
  handler('change', 'a-1'); handler('rename', null);
  assert.deepEqual(heard, ['a-1', null]);
  handle.close();
  assert.equal(closed, true);
  assert.equal(watchStops({ HOME: home }, () => {}, () => { throw new Error('no watching here'); }), null);
});

// Runs a chat's watch for two minutes, with `report` on the first wait; returns the clock time of each Paseo list read.
async function stopTimes(report) {
  const t = day();
  let clock = START, notice, closed = false, fired = false;
  const times = [];
  const call = async args => { if (args[0] === 'ls') times.push(clock - START); return t.call(args); };
  const sleep = async ms => { if (!fired) { fired = true; notice(report); } clock += ms; };
  const stops = listen => { notice = listen; return { close() { closed = true; } }; };
  await watch({ ...t.at, call, board: async week => ({ week, tasks: [] }), env, print: () => {}, seconds: 60, hours: 2 / 60,
    now: () => clock, sleep, stops });
  assert.equal(closed, true);
  return times;
}

test("a chat's watch sees a watched chat's stop within a second; another chat's stop waits for the minute", async () => {
  const watched = await stopTimes('agent-job');
  assert.ok(watched[1] - watched[0] <= 1000, `second pass after ${watched[1] - watched[0]} ms`);
  assert.equal(watched[2] - watched[1], 60_000);
  const other = await stopTimes('z-unwatched');
  assert.equal(other[1] - other[0], 60_000);
});

// Runs the service for three passes, with `stops` given the first wait's report; returns each pass's clock time.
async function servicePasses(stops) {
  const t = day();
  const store = dailyStore();
  let clock = START, fired = false;
  const times = [], done = new Error('three passes');
  // A pass reads the store again to send its batch: count each pass's time once.
  const daily = { ...store.daily, read: () => { if (times.at(-1) !== clock - START) times.push(clock - START); return store.daily.read(); } };
  const sleep = async ms => {
    if (times.length >= 3) throw done;
    if (!fired) { fired = true; stops.notice?.('any-chat'); }
    clock += ms;
  };
  // A null watcher could not watch the folder, so no report ever reaches the service.
  const opened = listen => { if (stops.watcher) stops.notice = listen; return stops.watcher; };
  await assert.rejects(served(t, { daily }, START, { once: false, now: () => clock, sleep, stops: opened }), error => error === done);
  return times;
}

test("any chat's stop starts the service's next pass within a second; a null watcher keeps the minute pass", async () => {
  let closed = false;
  const heard = await servicePasses({ watcher: { close() { closed = true; } } });
  assert.ok(heard[1] - heard[0] <= 1000, `second pass after ${heard[1] - heard[0]} ms`);
  assert.equal(heard[2] - heard[1], 60_000);
  assert.equal(closed, true);
  const unwatched = await servicePasses({ watcher: null });
  assert.deepEqual(unwatched, [0, 60_000, 120_000]);
});

test("userAt reads lastUserMessageAt from Paseo's agent record, and null for a missing record or a bad id", () => {
  const home = tempHome();
  const folder = join(home, '.paseo', 'agents', 'root-w-bold-otter');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'agent-job.json'), JSON.stringify({ id: 'agent-job', lastUserMessageAt: '2026-10-21T14:05:00.000Z' }));
  assert.equal(userAt('agent-job', home), '2026-10-21T14:05:00.000Z');
  assert.equal(userAt('agent-none', home), null);
  assert.equal(userAt('../agent-job', home), null);
  assert.equal(userAt('agent-job', tempHome()), null);
});

test('each message the person types resets the streak, a repeated /ship too; a chief message that leaves their time alone does not', async () => {
  const t = day();
  t.own('agent-mine', 'My own chat');
  t.paseo.logs['agent-mine'] = '[User] /ship\nShipped. Next?';
  t.typed['agent-mine'] = new Date(START - MIN).toISOString();
  await t.once(START);
  const go = n => reply({ ...t.at, day: DAY, agent: 'agent-mine', text: 'Keep going.', bucket: 'keep-going', label: 'Kept going: mine', env,
    now: new Date(START + n * MIN), typedAt: id => t.typed[id] ?? null });
  for (let n = 1; n <= 5; n++) {
    assert.equal((await go(n)).status, 'sent');
    // The chief's message arrives as an agent message: Paseo's time stays.
    t.paseo.logs['agent-mine'] += `\nStep ${n} done.`;
    await t.once(START + n * MIN + 30e3);
  }
  assert.equal((await go(6)).reason, 'streak');
  t.taken();
  // the person types /ship again: the same words, a new time.
  t.typed['agent-mine'] = new Date(START + 7 * MIN).toISOString();
  t.paseo.logs['agent-mine'] += '\n[User] /ship\nShipped again. Next?';
  await t.once(START + 7 * MIN + 30e3);
  assert.equal(t.taken().filter(([event, agent]) => event === 'stopped' && agent === 'agent-mine').length, 0, 'their word holds the stop for them');
  assert.equal(actions({ stateDir: t.stateDir, day: DAY }).filter(entry => entry.kind === 'own-chat' && entry.user === t.typed['agent-mine']).length, 1);
  assert.equal((await go(8)).status, 'sent');
  // The streak counts from their time even with no stop between.
  t.typed['agent-mine'] = new Date(START + 9 * MIN).toISOString();
  const log = actions({ stateDir: t.stateDir, day: DAY });
  assert.equal(streak(log, 'agent-mine', t.typed['agent-mine']), 0);
  assert.equal(streak(log, 'agent-mine'), 1);
});

test('with no record to read, the first-line mark still finds their word', async () => {
  const t = day();
  t.paseo.logs['agent-job'] = '[User] Post the editor job.\nI made the draft.';
  await t.once(START);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  t.paseo.logs['agent-job'] += '\n[User] Use the short text.\nShort text is in. Post it?';
  await t.once(START + MIN);
  assert.deepEqual(t.taken(), [], 'a new first line is their word');
  assert.deepEqual(actions({ stateDir: t.stateDir, day: DAY }).filter(entry => entry.kind === 'own-chat').map(entry => entry.agent), ['agent-job']);
});

test('allow lets a safe command card run, refuses an outward command unless the person approved it, and counts in the streak', async () => {
  const t = day();
  await hand({ ...t.at, day: DAY, agent: 'agent-team', env, now: new Date(START) });
  const card = (id, name = 'Bash') => t.paseo.pending.push({ id, agentId: 'agent-team', name, description: '-' });
  const go = (request, bucket = 'keep-going', n = 0) => allow({ ...t.at, day: DAY, agent: 'Team plan', request, bucket, label: `Allowed: ${request}`, env,
    now: new Date(START + n * MIN), typedAt: () => null });
  card('req-test');
  t.paseo.tools['agent-team'] = '[Shell] cd /w/team-yak; npm test 2>&1 | tail -5';
  assert.equal((await go('req-test')).status, 'allowed');
  assert.deepEqual(t.paseo.calls.find(([name, sub]) => name === 'permit' && sub === 'allow'), ['permit', 'allow', 'agent-team', 'req-test']);
  for (const command of ['git push origin soggy-bird', 'gh pr merge 12 --squash', 'npx wrangler deploy', 'curl -X POST https://x.test/api']) {
    card('req-out');
    t.paseo.tools['agent-team'] = `[Shell] ${command}`;
    const refused = await go('req-out');
    assert.deepEqual([refused.status, refused.reason], ['refused', 'outward'], command);
    t.paseo.pending = t.paseo.pending.filter(ask => ask.id !== 'req-out');
  }
  // A command the log cuts short, or none in the log, waits for the person too.
  card('req-long');
  t.paseo.tools['agent-team'] = `[Shell] ${'x'.repeat(197)}...`;
  assert.equal((await go('req-long')).reason, 'outward');
  t.paseo.tools['agent-team'] = '[Read] notes.md';
  assert.equal((await go('req-long')).reason, 'outward');
  // the person's Approve on an Inbox approval runs the push.
  t.paseo.tools['agent-team'] = '[Shell] git push origin soggy-bird';
  assert.equal((await go('req-long', 'person')).status, 'allowed');
  card('req-q', 'AskUserQuestion');
  assert.equal((await go('req-q')).reason, 'tool');
  assert.equal((await go('req-none')).reason, 'request');
  assert.equal((await go('req-q', 'pick')).reason, 'bucket');
  const log = actions({ stateDir: t.stateDir, day: DAY });
  assert.deepEqual(log.map(entry => [entry.kind, entry.bucket, entry.request]), [['allow', 'keep-going', 'req-test'], ['allow', 'person', 'req-long']]);
  assert.equal(streak(log.slice(0, 1), 'agent-team'), 1);
});

test('allow with keep-going refuses when two command cards wait, since the log\'s last command may be the other card\'s', async () => {
  const t = day();
  await hand({ ...t.at, day: DAY, agent: 'agent-team', env, now: new Date(START) });
  t.paseo.pending.push({ id: 'req-push', agentId: 'agent-team', name: 'Bash', description: '-' }, { id: 'req-test', agentId: 'agent-team', name: 'Bash', description: '-' });
  t.paseo.tools['agent-team'] = '[Shell] npm test';
  const go = (request, bucket = 'keep-going') => allow({ ...t.at, day: DAY, agent: 'Team plan', request, bucket, label: `Allowed: ${request}`, env, typedAt: () => null });
  for (const request of ['req-push', 'req-test']) {
    const refused = await go(request);
    assert.deepEqual([refused.status, refused.reason], ['refused', 'outward'], request);
  }
  assert.ok(!t.paseo.calls.some(([name, sub]) => name === 'permit' && sub === 'allow'));
  // the person's Approve still allows; with one card left, keep-going reads the log again.
  assert.equal((await go('req-push', 'person')).status, 'allowed');
  assert.equal((await go('req-test')).status, 'allowed');
});

test('answer refuses a command card, so the deny loop can not start; the person\'s Decline still declines it', async () => {
  const t = day();
  await hand({ ...t.at, day: DAY, agent: 'agent-team', env, now: new Date(START) });
  t.paseo.pending.push({ id: 'req-cmd', agentId: 'agent-team', name: 'Bash', description: '-' });
  const go = (bucket, text) => answer({ ...t.at, day: DAY, agent: 'Team plan', request: 'req-cmd', text, bucket, label: 'x', env, typedAt: () => null });
  const refused = await go('keep-going', 'Go on.');
  assert.deepEqual([refused.status, refused.reason], ['refused', 'tool']);
  assert.ok(!t.paseo.calls.some(([name, sub]) => name === 'permit' && sub === 'deny'));
  assert.equal((await go('person', 'Not approved; stop before that step.')).status, 'answered');
});

test("status shows the watched chats, the lines waiting in the outbox, and the chief's last 5 actions and end lines", async () => {
  const t = day();
  const store = dailyStore();
  await served(t, store, START);
  for (let n = 0; n < 5; n++) {
    await reply({ ...t.at, day: DAY, agent: 'agent-job', text: `Step ${n}.`, bucket: 'person', label: `Answered ${n}`, env, now: new Date(START + n * 1000) });
  }
  assert.deepEqual(noteEnd({ ...t.at, day: DAY, line: 'Judge: kept going on Post the editor job', now: new Date(START + 9000) }),
    { status: 'noted', line: 'Judge: kept going on Post the editor job' });
  for (const line of ['', 'a\nb', 'x'.repeat(301)]) assert.equal(noteEnd({ ...t.at, day: DAY, line }).status, 'refused');
  const read = await status({ ...t.at, day: DAY, env, dailyId: SELF });
  assert.equal(read.worker, undefined);
  assert.equal(read.outbox, 0);
  assert.deepEqual(read.recent, ['Answered 1', 'Answered 2', 'Answered 3', 'Answered 4', 'Judge: kept going on Post the editor job']);
  assert.ok(!read.agents.some(row => row.agent === SELF));
});


test('serve sends each pass as one Watch message to the Daily chat; with none open it keeps the lines and starts none', async () => {
  const t = day();
  const none = dailyStore({ workspaceId: 'wks_daily' });
  t.paseo.list = t.paseo.list.filter(agent => agent.id !== SELF);
  const logged = [];
  await served(t, none, START, { log: text => logged.push(text) });
  assert.deepEqual(batches(t), []);
  assert.match(logged[0], /No Daily chat is open/);
  assert.ok(JSON.parse(readFileSync(join(t.stateDir, `${DAY}.outbox.json`), 'utf8')).length > 0);
  t.paseo.list.push({ id: SELF, name: 'Daily', status: 'idle', cwd: '/w/daily', created: '2026-10-21T15:00:00Z', labels: { 'daily-chat': '1' } });
  await served(t, none, START + MIN);
  assert.equal(none.saved.agentId, SELF, 'the live Daily chat is found by its label and saved');
  const [sent] = batches(t);
  assert.ok(sent.some(event => event.event === 'stopped' && event.agent === 'agent-job'));
  assert.equal(existsSync(join(t.stateDir, `${DAY}.outbox.json`)), false);
});

test('pass add-ons post lines, pass events through, skip chats, and a failed one is one not-read', async () => {
  const t = day();
  const seen = [];
  let failed = false;
  const addons = async events => {
    seen.push(events.length);
    return failed ? { lines: [], events: [], skip: [], failed: [{ addon: 'a.mjs', error: 'boom' }] }
      : { lines: ['Two new orders'], events: [{ event: 'email-round', round: 1, addon: 'a.mjs' }], skip: ['agent-job'], failed: [] };
  };
  await t.once(START, { addons });
  const lines = t.lines.splice(0);
  assert.deepEqual(lines.slice(0, 2), [{ event: 'post', text: 'Two new orders' }, { event: 'email-round', round: 1, addon: 'a.mjs' }]);
  assert.ok(!lines.some(line => line.agent === 'agent-job'), 'a skipped chat is not watched');
  assert.equal((await hand({ ...t.at, day: DAY, agent: 'agent-job', env, now: new Date(START) })).reason, 'skip');
  failed = true;
  await t.once(START + MIN, { addons });
  await t.once(START + 2 * MIN, { addons });
  assert.deepEqual(t.lines.filter(line => line.event === 'not-read'), [{ event: 'not-read', source: 'add-on a.mjs', error: 'boom' }]);
  assert.ok(seen[1] > 0, 'a pass add-on gets the last pass events');
});

test('linkAllowed takes https on the app or a tunnel page, with no user or port', () => {
  const hosts = ['app.example.com'];
  assert.equal(linkAllowed('https://app.example.com/apps/inbox/', hosts), true);
  assert.equal(linkAllowed('https://quiet-fox.trycloudflare.com/x', hosts), true);
  for (const url of ['http://app.example.com/', 'https://u@app.example.com/', 'https://app.example.com:8443/', 'https://app.example.com.evil.test/', 'nope']) {
    assert.equal(linkAllowed(url, hosts), false, url);
  }
});

test('with no Paseo the watch says unsupported and stops; a chat outside Paseo can not watch', async () => {
  const t = day();
  const call = async () => { throw new PaseoError(EXIT.noPaseo, 'no paseo'); };
  assert.equal(await t.once(START, { call }), null);
  assert.deepEqual(t.taken(), [['unsupported', 'no paseo']]);
  assert.equal(await t.once(START, { env: {} }), null);
  assert.equal(t.taken()[0][0], 'unsupported');
});
