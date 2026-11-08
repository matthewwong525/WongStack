import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';
import { RUN_ID, actions, agentEvents, allow, answer, chiefDay, chiefEnv, doneAgent, hand, mark, messageMark, noteEnd,
  reply, commonDir, sameRepo, status, streak, userAt, watch, watchStops, watched } from '../../.agents/skills/daily/scripts/chief.mjs';

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
    'task:job': { workspace: 'Task: Post the editor job', cwd: '/w/bold-otter', agentId: 'agent-job', at: new Date(START - HOUR).toISOString(), title: 'Post the editor job' },
    'email:2026-10-21': { workspace: 'calm-cat', cwd: join(homedir(), 'w/calm-cat'), at: new Date(START - HOUR).toISOString() },
    'task:old': { workspace: 'old-owl', cwd: '/w/old-owl', agentId: 'agent-old', at: new Date(START - 30 * HOUR).toISOString(), title: 'Old task' },
  };
  const agent = (id, name, cwd, status = 'idle') => ({ id, shortId: id.slice(0, 7), name, provider: 'claude', status, cwd, created: '2026-10-21T13:00:00Z' });
  const paseo = {
    list: [agent('agent-job', 'Task: Post the editor job', '/w/bold-otter'), agent('agent-email', 'Answer email', '~/w/calm-cat', 'running'),
      agent('agent-old', 'Task: Old task', '/w/old-owl'), agent('agent-team', 'Team plan', '/w/team-yak'), agent('agent-stranger', 'Other work', '/w/sly-fox'),
      agent(SELF, 'This chat', '/w/daily')],
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
  // The Inbox's chat list: it keeps each list sent, answers `asked` as each chat's close time, and throws while `down`.
  const app = { sent: [], asked: {}, down: false };
  const chats = { computer: 'c'.repeat(32), sync: async body => {
    app.sent.push(body);
    if (app.down) throw new Error('502: app down');
    return { chats: body.chats.map(chat => ({ agentId: chat.agentId, closeAskedAt: app.asked[chat.agentId] ?? null })) };
  } };
  const started = () => record;
  const at = { stateDir, started, timezone: ZONE, call };
  const lines = [];
  // When the person last typed in each chat, as Paseo's agent record keeps it.
  const typed = {};
  const once = (now, more = {}) => watch({ ...at, chats, env, once: true, now: () => now, print: line => lines.push(JSON.parse(line)),
    typedAt: id => typed[id] ?? null, ...more });
  const taken = () => lines.splice(0).map(({ event, agent, request, source, reason }) => [event, agent ?? source ?? reason, request?.id].filter(Boolean));
  // A chat of the person's own that worked `ago` before START.
  const own = (id, name, { status = 'idle', ago = 2 * HOUR, parent = null, cwd = `/w/${id}` } = {}) => {
    paseo.list.push(agent(id, name, cwd, status));
    paseo.inspect[id] = { ParentAgentId: parent, UpdatedAt: new Date(START - ago).toISOString() };
  };
  return { stateDir, record, paseo, call, at, app, down: value => { app.down = value; }, lines, once, taken, own, typed,
    dayAt: now => chiefDay({ ...at, now: new Date(now) }) };
}

test('the watch list is today\'s started rows, by id or by folder, and the hands; never yesterday\'s rows, this chat or a stranger', async () => {
  const { at, paseo } = day();
  const today = '2026-10-21';
  assert.deepEqual(watched({ ...at, day: today, list: paseo.list, self: SELF }).map(row => [row.agentId, row.source]),
    [['agent-job', 'started'], ['agent-email', 'started']]);
  assert.deepEqual(await hand({ ...at, day: today, agent: 'Team plan', env, now: new Date(START) }),
    { status: 'handed', agent: 'agent-team', title: 'Team plan', workspace: 'team-yak', source: 'handed' });
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

test('a handed or admitted chat shows its workspace name, and its folder name still finds it', async () => {
  const t = day();
  t.paseo.workspaces = [{ workspaceId: 'ws-team', cwd: '/w/team-yak', name: 'Plan the team week' },
    { workspaceId: 'ws-mine', cwd: '/w/agent-mine', name: 'Fix the login page' }];
  assert.deepEqual(await hand({ ...t.at, day: '2026-10-21', agent: 'Team plan', env, now: new Date(START) }),
    { status: 'handed', agent: 'agent-team', title: 'Team plan', workspace: 'Plan the team week', source: 'handed' });
  t.own('agent-mine', 'My own chat');
  await t.once(START);
  const rows = watched({ ...t.at, day: '2026-10-21', list: t.paseo.list, self: SELF });
  assert.deepEqual(rows.filter(row => ['agent-team', 'agent-mine'].includes(row.agentId)).map(row => [row.agentId, row.workspace, row.cwd]),
    [['agent-team', 'Plan the team week', '/w/team-yak'], ['agent-mine', 'Fix the login page', '/w/agent-mine']]);
  for (const folder of ['team-yak', 'agent-mine']) {
    assert.equal((await reply({ ...t.at, day: '2026-10-21', agent: folder, text: 'Keep going.', bucket: 'keep-going', label: 'Keep going', env,
      now: new Date(START + MIN) })).status, 'sent', folder);
  }
});

test('watch says asking, stopped once per idle spell, gone and not read one time each, and a second watch repeats none of it', async () => {
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
  // The started row shows the workspace's name; its folder name still finds it.
  assert.equal((await reply({ ...t.at, day: '2026-10-21', agent: 'bold-otter', text: 'Keep going.', bucket: 'keep-going', label: 'Keep going: job', env,
    now: new Date(START + 250e3) })).status, 'sent');
  await t.once(START + 300e3);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job']]);
  // The team chat closes; then Paseo can't be read twice: one line each.
  t.paseo.list = t.paseo.list.filter(agent => agent.id !== 'agent-team');
  await t.once(START + 360e3);
  assert.deepEqual(t.taken(), [['gone', 'agent-team']]);
  const failing = async args => { if (args[0] === 'ls') throw new Error('daemon down'); return t.call(args); };
  await t.once(START + 420e3, { call: failing });
  await t.once(START + 480e3, { call: failing });
  assert.deepEqual(t.taken(), [['not-read', 'workspaces']]);
  // A second watch the same day says none of it again.
  await t.once(START + 540e3);
  assert.deepEqual(t.taken(), []);
  // No Paseo agent id: the watch says it can't watch, and changes nothing.
  await watch({ ...t.at, env: {}, once: true, print: line => t.lines.push(JSON.parse(line)) });
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

test('a chat list the app does not take is said one time, and a chat closed in the Inbox gets /close once the app answers', async () => {
  const t = day();
  t.down(true);
  t.app.asked['agent-job'] = START;
  await t.once(START);
  await t.once(START + MIN);
  assert.deepEqual(t.taken(), [['stopped', 'agent-job'], ['not-read', 'chats']]);
  assert.deepEqual(t.paseo.sent, []);
  t.down(false);
  await t.once(START + 2 * MIN);
  await t.once(START + 3 * MIN);
  assert.deepEqual(t.taken(), [['close', 'agent-job']]);
  assert.deepEqual(t.paseo.sent, [['agent-job', '/close\n']]);
  // No chat list asked for: the pass sends none.
  await t.once(START + 4 * MIN, { chats: null });
  assert.equal(t.app.sent.length, 4);
});

test('the chat list holds the watched and top-level chats and the Needs-you chat, never a helper or this chat', async () => {
  const t = day();
  t.own('agent-helper', 'A helper', { parent: 'agent-job' });
  t.own('agent-needs', 'Needs you: Paseo');
  await t.once(START, { ignore: ['agent-needs'] });
  assert.equal(t.app.sent[0].computer, 'c'.repeat(32));
  assert.deepEqual(t.app.sent[0].chats.map(chat => chat.agentId),
    ['agent-job', 'agent-email', 'agent-old', 'agent-team', 'agent-stranger', 'agent-needs']);
  assert.deepEqual(t.app.sent[0].chats[0], { agentId: 'agent-job', name: 'Task: Post the editor job', step: null, folder: 'bold-otter',
    source: null });
});

test("the chat list leaves out a running schedule's chat, its label read from Paseo's agent record", async () => {
  const t = day();
  t.own('agent-news', 'News', { status: 'running' });
  const agentRecord = id => (id === 'agent-news' ? { labels: { 'wong-schedule': 'news' } } : {});
  await t.once(START, { agentRecord });
  const sent = t.app.sent[0].chats.map(chat => chat.agentId);
  assert.ok(sent.includes('agent-job'));
  assert.ok(!sent.includes('agent-news'));
});

test("the service watch says each repeat failure as again, and read once a source reads again; a chat's watch says neither", async () => {
  const t = day();
  const chatEvents = () => t.lines.splice(0).filter(line => line.source === 'chats')
    .map(({ event, again }) => [event, ...(again ? ['again'] : [])]);
  const service = now => t.once(now, { service: true, self: null });
  await service(START);
  assert.deepEqual(chatEvents(), [['read']]);
  t.down(true);
  await service(START + MIN);
  await service(START + 2 * MIN);
  assert.deepEqual(chatEvents(), [['not-read'], ['not-read', 'again']]);
  t.down(false);
  await service(START + 3 * MIN);
  await service(START + 4 * MIN);
  assert.deepEqual(chatEvents(), [['read']]);
  const chat = day();
  chat.down(true);
  await chat.once(START);
  await chat.once(START + MIN);
  chat.down(false);
  await chat.once(START + 2 * MIN);
  assert.deepEqual(chat.lines.filter(line => line.source === 'chats').map(line => line.event), ['not-read']);
});

test('the watch keeps its day after midnight, and ends when the next daily starts', async () => {
  const t = day();
  await t.once(START);
  t.taken();
  // 01:00 the next day: no daily has started yet, so the watch keeps yesterday's list and repeats nothing.
  const night = Date.parse('2026-10-22T05:00:00Z');
  assert.equal(t.dayAt(night), '2026-10-21');
  await t.once(night);
  assert.deepEqual(t.taken(), []);
  // More than 24 hours after the first watch, today holds nothing.
  assert.equal(t.dayAt(START + 25 * HOUR), '2026-10-22');
  // A running watch ends once the next day's daily starts a chat.
  const loop = watch({ ...t.at, env, now: () => night, print: line => t.lines.push(JSON.parse(line)),
    sleep: async () => { t.record['email:2026-10-22'] = { workspace: 'new-elk', cwd: '/w/new-elk', agentId: 'agent-new', at: new Date(night + HOUR).toISOString() }; } });
  await loop;
  assert.deepEqual(t.taken(), [['end', 'next-day']]);
  assert.equal(t.dayAt(night + 2 * HOUR), '2026-10-22');
});

test('a watched chat that is gone leaves the list, one time', async () => {
  const t = day();
  t.paseo.list = t.paseo.list.filter(agent => !['agent-job', 'agent-email'].includes(agent.id));
  await t.once(START);
  // The email row, recorded before agent ids, is found only by its folder: with its chat gone, it leaves the list.
  assert.deepEqual(t.taken(), [['gone', 'agent-job']]);
  await t.once(START + 60e3);
  assert.deepEqual(t.taken(), []);
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

test('the watch takes only chats in this repo or its worktrees; a started row stays from any folder, and a gone folder is skipped', async () => {
  const t = day();
  const git = (cwd, ...args) => assert.equal(spawnSync('git', args, { cwd, encoding: 'utf8' }).status, 0, args.join(' '));
  const base = tempHome(), mine = join(base, 'mine'), tree = join(base, 'tree'), other = join(base, 'other');
  for (const dir of [mine, other]) { mkdirSync(dir); git(dir, 'init', '-q'); }
  git(mine, '-c', 'user.email=a@b.co', '-c', 'user.name=A', 'commit', '-q', '--allow-empty', '-m', 'one');
  git(mine, 'worktree', 'add', '-q', tree);
  t.own('agent-tree', 'In a worktree', { cwd: tree });
  t.own('agent-sub', 'In a subfolder', { cwd: join(mine, '.git', '..') });
  t.own('agent-other', 'Another repo', { cwd: other });
  t.own('agent-gone', 'Folder gone', { cwd: join(base, 'gone') });
  const asked = [];
  const own = sameRepo(mine, cwd => { asked.push(cwd); return commonDir(cwd); });
  await t.once(START, { ownRepo: own });
  await t.once(START + MIN, { ownRepo: own });
  const rows = watched({ ...t.at, day: '2026-10-21', list: t.paseo.list, self: SELF }).map(row => row.agentId);
  assert.deepEqual(rows, ['agent-job', 'agent-email', 'agent-tree', 'agent-sub']);
  assert.equal(asked.filter(cwd => cwd === other).length, 1, 'each folder is asked once');
  assert.equal(sameRepo(join(base, 'gone'))(mine), false);
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

// The person types at 9:56 in their own chat; it stops at 10:01, runs, and stops at 10:05. `minutes` count from 10:00.
async function heldChat() {
  const t = day();
  t.own('agent-mine', 'My own chat');
  t.paseo.logs['agent-mine'] = '[User] Make the tiles blue.\nDone. Build it?';
  t.typed['agent-mine'] = new Date(START - 4 * MIN).toISOString();
  const status = value => { t.paseo.list.find(agent => agent.id === 'agent-mine').status = value; };
  const pass = minutes => t.once(START + minutes * MIN);
  await pass(1);
  status('running');
  await pass(3);
  status('idle');
  t.paseo.logs['agent-mine'] += '\nBuilt. Look at the preview?';
  await pass(5);
  const said = () => t.lines.splice(0).filter(line => line.agent === 'agent-mine').map(line => [line.event, line.last]);
  return { t, status, pass, said };
}

test('the wait holds through later runs: typed 9:56, stop 10:01, it runs, stop 10:05; no stopped line before 10:11, one after', async () => {
  const { pass, said } = await heldChat();
  for (const minutes of [8, 10]) await pass(minutes);
  assert.deepEqual(said(), []);
  await pass(11);
  assert.deepEqual(said(), [['stopped', 'Done. Build it? Built. Look at the preview?']]);
  await pass(12);
  assert.deepEqual(said(), []);
});

test('a new message at 10:08 inside the wait moves its end to 10:23', async () => {
  const { t, status, pass, said } = await heldChat();
  t.typed['agent-mine'] = new Date(START + 8 * MIN).toISOString();
  status('running');
  await pass(8);
  status('idle');
  t.paseo.logs['agent-mine'] += '\n[User] Smaller, please.\nMade them smaller. Build it?';
  for (const minutes of [9, 11, 15, 22]) await pass(minutes);
  assert.deepEqual(said(), []);
  await pass(23);
  assert.deepEqual(said(), [['stopped', 'Made them smaller. Build it?']]);
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

// ---------------------------------------------------------------------------
// The chief on the host

test('done-agent takes a watched chat\'s done with its proof and changes nothing; it refuses no proof and an unwatched chat', async () => {
  const t = day();
  const go = (agent, proof = 'PR #12 merged') => doneAgent({ ...t.at, day: DAY, agent, proof, env });
  assert.deepEqual(await go('agent-job'), { status: 'marked', agent: 'agent-job', title: 'Post the editor job', workspace: 'Task: Post the editor job',
    source: 'started', proof: 'PR #12 merged' });
  assert.equal((await go('agent-job', '  ')).reason, 'proof');
  assert.equal((await go('agent-stranger')).reason, 'unwatched');
  assert.equal((await doneAgent({ ...t.at, day: DAY, agent: 'agent-job', proof: 'x', env: {} })).status, 'unsupported');
  assert.deepEqual(t.paseo.sent, []);
});

test("a chief command keeps its chat's own id; a background run with none acts under the stand-in; a plain terminal has none", async () => {
  assert.equal(chiefEnv({ PASEO_AGENT_ID: 'agent-7', WONG_DAILY_RUN: '1' }).PASEO_AGENT_ID, 'agent-7');
  assert.equal(chiefEnv({ WONG_DAILY_RUN: '1' }).PASEO_AGENT_ID, RUN_ID);
  assert.equal(chiefEnv({}).PASEO_AGENT_ID, undefined);
  const t = day();
  await t.once(START);
  // The stand-in matches no chat: it watches every chat this chat would, and hands any of them.
  const run = await status({ ...t.at, day: DAY, env: chiefEnv({ WONG_DAILY_RUN: '1' }) });
  assert.deepEqual(run.agents.map(row => row.agent), ['agent-job', 'agent-email']);
  assert.equal((await hand({ ...t.at, day: DAY, agent: 'agent-team', env: chiefEnv({ WONG_DAILY_RUN: '1' }), now: new Date(START) })).status, 'handed');
  assert.equal((await status({ ...t.at, day: DAY, env: chiefEnv({}) })).status, 'unsupported');
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
  const enough = new Error('two minutes');
  const sleep = async ms => { if (!fired) { fired = true; notice(report); } clock += ms; if (clock - START >= 2 * MIN) throw enough; };
  const stops = listen => { notice = listen; return { close() { closed = true; } }; };
  await assert.rejects(watch({ ...t.at, call, env, print: () => {}, seconds: 60,
    now: () => clock, sleep, stops }), error => error === enough);
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

test("status shows the watched chats and the chief's last 5 actions and end lines", async () => {
  const t = day();
  await t.once(START);
  for (let n = 0; n < 5; n++) {
    await reply({ ...t.at, day: DAY, agent: 'agent-job', text: `Step ${n}.`, bucket: 'person', label: `Answered ${n}`, env, now: new Date(START + n * 1000) });
  }
  assert.deepEqual(noteEnd({ ...t.at, day: DAY, line: 'Judge: kept going on Post the editor job', now: new Date(START + 9000) }),
    { status: 'noted', line: 'Judge: kept going on Post the editor job' });
  for (const line of ['', 'a\nb', 'x'.repeat(301)]) assert.equal(noteEnd({ ...t.at, day: DAY, line }).status, 'refused');
  const read = await status({ ...t.at, day: DAY, env });
  assert.equal(read.outbox, undefined);
  assert.deepEqual(read.recent, ['Answered 1', 'Answered 2', 'Answered 3', 'Answered 4', 'Judge: kept going on Post the editor job']);
  assert.ok(!read.agents.some(row => row.agent === SELF));
});

test('status marks a finished chat with no open card, and asks nothing about a chat with one', async () => {
  const t = day();
  t.paseo.pending.push({ id: 'req-e', agentId: 'agent-email', name: 'AskUserQuestion', description: 'Send it?' });
  const asked = [];
  const read = await status({ ...t.at, day: '2026-10-21', env, finishedOf: async agent => { asked.push(agent.id); return true; } });
  assert.deepEqual(read.agents.map(row => [row.agent, row.asking, row.finished ?? false]), [['agent-job', 0, true], ['agent-email', 1, false]]);
  assert.deepEqual(asked, ['agent-job']);
  const none = await status({ ...t.at, day: '2026-10-21', env, finishedOf: async () => false });
  assert.ok(none.agents.every(row => !('finished' in row)));
});


test('status marks a stopped chat the line-up told another chat covers, by that chat\'s title; never a working one', async () => {
  const t = day();
  writeFileSync(join(t.stateDir, 'line-up.json'), JSON.stringify({ chats: { 'agent-job': { covered: 'agent-email' },
    'agent-email': { title: 'Answer email', covered: 'agent-job' } } }));
  const read = await status({ ...t.at, day: '2026-10-21', env, finishedOf: async () => false });
  assert.deepEqual(read.agents.map(row => [row.agent, row.covered ?? null]), [['agent-job', 'Answer email'], ['agent-email', null]]);
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

test('with no Paseo the watch says unsupported and stops; a chat outside Paseo can not watch', async () => {
  const t = day();
  const call = async () => { throw new PaseoError(EXIT.noPaseo, 'no paseo'); };
  assert.equal(await t.once(START, { call }), null);
  assert.deepEqual(t.taken(), [['unsupported', 'no paseo']]);
  assert.equal(await t.once(START, { env: {} }), null);
  assert.equal(t.taken()[0][0], 'unsupported');
});
