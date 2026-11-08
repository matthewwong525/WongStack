import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { stateDirectory } from '../../.agents/skills/daily/scripts/daily.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { deliverNotes, elsewhere, lineUpData, lineUpDue, readMap, saveMap, tell } from '../../.agents/skills/daily/scripts/line-up.mjs';
import { handOver, takeNotes } from '../../.agents/skills/daily/scripts/waiting-notes.mjs';
import { needsYouFile } from '../../.agents/skills/daily/scripts/worker.mjs';

const CHECK = fileURLToPath(new URL('../../.agents/skills/daily/scripts/line-up-check.mjs', import.meta.url));
const ZONE = 'America/New_York';
const DAY = '2026-11-07';
const NOW = Date.parse('2026-11-07T15:00:00Z');
const MIN = 60e3;
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'line-up-')); roots.push(dir); return dir; };
const iso = ms => new Date(ms).toISOString();

/** A transcript writer for one chat: `say(role, text, ms)` appends one message in its tool's format. */
function transcript(file, tool, key, cwd) {
  mkdirSync(join(file, '..'), { recursive: true });
  const line = (role, text, ms) => JSON.stringify(tool === 'codex'
    ? { timestamp: iso(ms), type: 'response_item', payload: { type: 'message', role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] } }
    : { type: role, sessionId: key, cwd, timestamp: iso(ms), message: { role, content: role === 'user' ? text : [{ type: 'text', text }] } });
  writeFileSync(file, tool === 'codex' ? `${JSON.stringify({ timestamp: iso(NOW - 60 * MIN), type: 'session_meta', payload: { id: key, cwd } })}\n` : '');
  return (role, text, ms = NOW - 5 * MIN) => appendFileSync(file, `${line(role, text, ms)}\n`);
}

/** A chat's status card, as its own hooks write it. */
const card = (home, { key, tool, name, cwd, paseoId = null, transcript, state = 'idle', at = iso(NOW - MIN) }) =>
  writeJson(join(home, '.local', 'state', 'wongstack', 'chats', `${key}.json`), { key, tool, name, paseoId, cwd, transcript, state, at });

/** Four open chats: Claude in Paseo (a), Claude in a terminal (b), Codex in Paseo (c), Codex elsewhere (d). */
function world() {
  const home = temp(), stateDir = temp();
  const say = {}, file = {};
  const chat = (tool, key, name, cwd, paseoId = null) => {
    file[key] = join(home, tool, `${key}.jsonl`);
    card(home, { key, tool, name, cwd, paseoId, transcript: file[key] });
    say[key] = transcript(file[key], tool, key, cwd);
  };
  chat('claude', 'claude-a', 'Checkout', '/w/repo-a', 'pa');
  chat('claude', 'claude-b', 'Payments', '/w/repo-b');
  chat('codex', 'codex-c', 'Sign-in', '/w/repo-c', 'pc');
  chat('codex', 'codex-d', 'Reports', '/w/repo-d');
  const paseo = { list: [{ id: 'pa', name: 'Checkout', status: 'idle', cwd: '/w/repo-a' }, { id: 'pc', name: 'Sign-in', status: 'idle', cwd: '/w/repo-c' }],
    sent: [], calls: [], fail: false };
  writeJson(join(stateDir, `${DAY}.watch.json`), { startedAt: iso(NOW - 60 * MIN), gone: [],
    chats: paseo.list.map(each => ({ agentId: each.id, title: each.name, workspace: each.id, source: 'own' })), agents: {} });
  const call = async args => {
    paseo.calls.push(args);
    if (args[0] === 'ls') return structuredClone(paseo.list);
    if (args[0] === 'send' && paseo.fail) throw new Error('daemon not reachable');
    if (args[0] === 'send') { paseo.sent.push([args[1], readFileSync(args[3], 'utf8').trim(), args.slice(4)]); return { ok: true }; }
    throw new Error(`unexpected call ${args.join(' ')}`);
  };
  const at = { stateDir, day: DAY, started: () => ({}), timezone: ZONE, call, env: {}, project: '/w/repo', home, now: new Date(NOW),
    ownRepo: cwd => cwd.startsWith('/w/repo') };
  const deliver = (more = {}) => deliverNotes({ ...at, now: () => new Date(NOW), typedAt: () => null, ...more });
  const journal = () => readLines({ stateDir }).map(entry => entry.line);
  const due = (now = NOW) => lineUpDue({ stateDir, project: '/w/repo', home, now, ownRepo: at.ownRepo });
  return { home, stateDir, say, file, paseo, at, deliver, journal, due };
}

test('line-up reads Claude and Codex chats, in Paseo or not, with the messages after the byte the map read', async () => {
  const w = world();
  w.say['claude-a']('user', 'Build checkout');
  w.say['claude-a']('assistant', 'I built the PayPal form.');
  const read = statSync(w.file['claude-a']).size;
  w.say['claude-a']('user', 'Use Stripe, not PayPal');
  w.say['claude-a']('user', 'From the daily: Sign-in is live.');
  w.say['codex-c']('user', 'Add sign-in');
  w.say['codex-c']('assistant', 'Started.');
  writeJson(join(w.stateDir, 'line-up.json'), { keys: 'chat', chats: { 'claude-a': { title: 'Checkout', read } } });
  const shown = await lineUpData(w.at);
  assert.deepEqual(shown.chats.map(chat => [chat.agent, chat.title, chat.tool, chat.paseo, chat.messages]), [
    ['claude-a', 'Checkout', 'claude', 'pa', '[Person] Use Stripe, not PayPal\n\n[Note] From the daily: Sign-in is live.'],
    ['claude-b', 'Payments', 'claude', undefined, undefined],
    ['codex-c', 'Sign-in', 'codex', 'pc', '[Person] Add sign-in\n\n[Agent] Started.'],
    ['codex-d', 'Reports', 'codex', undefined, undefined]]);
  const map = readMap(w.stateDir);
  assert.deepEqual(Object.keys(map.shown.marks), ['claude-a', 'claude-b', 'codex-c', 'codex-d']);
  assert.equal(map.shown.marks['claude-a'], statSync(w.file['claude-a']).size);
  assert.deepEqual(map.shown.paseo, { 'claude-a': 'pa', 'codex-c': 'pc' });
  assert.deepEqual(map.shown.watching, ['claude-a', 'claude-b', 'codex-c', 'codex-d']);
});

test('an old map keyed by Paseo ids starts fresh, its pending notes dropped with one journal line', async () => {
  const w = world();
  writeJson(join(w.stateDir, 'line-up.json'), { chats: { pa: { title: 'Checkout', read: 'mark' } }, notes: [{ id: 'n1', agent: 'pa', text: 'x' }] });
  await lineUpData(w.at);
  await lineUpData(w.at);
  const map = readMap(w.stateDir);
  assert.deepEqual([map.keys, map.chats, map.notes], ['chat', {}, []]);
  assert.deepEqual(w.journal(), ['The line-up started a new map: it now knows chats by session. Dropped 1 waiting notes.']);
});

test('an old map stays unmarked through other writes, and the worker\'s delivery starts it fresh, not as gone chats', async () => {
  const w = world();
  const old = { chats: { pa: { title: 'Checkout', read: 'mark', covered: 'pc' } }, notes: [{ id: 'n1', agent: 'pa', title: 'Checkout', text: 'x' }] };
  writeJson(join(w.stateDir, 'line-up.json'), old);
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: {} });
  assert.equal(readMap(w.stateDir).keys, undefined);
  writeJson(join(w.stateDir, 'line-up.json'), old);
  await w.deliver();
  const map = readMap(w.stateDir);
  assert.deepEqual([map.keys, map.chats, map.notes, w.paseo.sent], ['chat', {}, [], []]);
  assert.deepEqual(w.journal(), ['The line-up started a new map: it now knows chats by session. Dropped 1 waiting notes.']);
});

test('a chat in Paseo gets its note through Paseo, any other a waiting note, Claude Code or Codex; each writes one journal line', async () => {
  const w = world();
  const ways = [];
  for (const [agent, text] of [['Checkout', 'Use Stripe (Payments, 10:00).'], ['Sign-in', 'Use passkeys (Checkout, 10:00).'],
    ['claude-b', 'Checkout carries the export button: drop yours.'], ['codex-d', 'Reports moved to the new table.']]) {
    const queued = await tell({ ...w.at, agent, text, ...(agent === 'claude-b' && { coveredBy: 'Checkout' }) });
    ways.push([queued.status, queued.agent, queued.way]);
  }
  assert.deepEqual(ways, [['queued', 'claude-a', 'paseo'], ['queued', 'codex-c', 'paseo'], ['queued', 'claude-b', 'waiting'], ['queued', 'codex-d', 'waiting']]);
  await w.deliver();
  assert.deepEqual(w.paseo.sent, [['pa', 'From the daily: Use Stripe (Payments, 10:00).', ['--behavior', 'steer', '--no-wait']],
    ['pc', 'From the daily: Use passkeys (Checkout, 10:00).', ['--behavior', 'steer', '--no-wait']]]);
  assert.equal(readMap(w.stateDir).notes.length, 0);
  const { chats } = readMap(w.stateDir);
  assert.deepEqual([chats['codex-c'].told.map(each => each.text), chats['claude-b'].told.map(each => each.text), chats['claude-b'].covered],
    [['Use passkeys (Checkout, 10:00).'], ['Checkout carries the export button: drop yours.'], 'claude-a']);
  assert.equal(handOver({ home: w.home, key: 'claude-b', now: NOW }), 'From the daily: Checkout carries the export button: drop yours.');
  assert.equal(handOver({ home: w.home, key: 'codex-d', now: NOW }), 'From the daily: Reports moved to the new table.');
  assert.deepEqual(w.journal(), ['Told Checkout: Use Stripe (Payments, 10:00).', 'Told Sign-in: Use passkeys (Checkout, 10:00).',
    'Told Payments: Checkout carries the export button: drop yours.', 'Told Reports: Reports moved to the new table.']);
});

test('a note Paseo fails to send becomes a waiting note, with one journal line, and is handed over once', async () => {
  const w = world();
  await tell({ ...w.at, agent: 'Sign-in', text: 'Sign-in is live.' });
  w.paseo.fail = true;
  await w.deliver();
  assert.deepEqual([w.paseo.sent, readMap(w.stateDir).notes], [[], []]);
  assert.equal(w.journal().length, 1);
  assert.match(w.journal()[0], /^Not sent through Paseo to Sign-in: .+ It waits for the chat's next stop or message\.$/);
  assert.equal(handOver({ home: w.home, key: 'codex-c', now: NOW }), 'From the daily: Sign-in is live.');
  assert.equal(handOver({ home: w.home, key: 'codex-c', now: NOW }), null);
  assert.deepEqual(w.journal().slice(1), ['Told Sign-in: Sign-in is live.']);
});

test('tell refuses an unknown chat, an empty note, an unknown cover, check-ins off and a Needs you chat; drop clears waiting notes', async () => {
  const w = world();
  assert.equal((await tell({ ...w.at, agent: 'stranger', text: 'x' })).reason, 'unwatched');
  assert.equal((await tell({ ...w.at, agent: 'codex-d', text: '  ' })).reason, 'message');
  assert.equal((await tell({ ...w.at, agent: 'codex-d', text: 'x', coveredBy: 'nobody' })).reason, 'unwatched');
  writeJson(needsYouFile(w.stateDir), { chats: ['pc'] });
  assert.equal((await tell({ ...w.at, agent: 'Sign-in', text: 'x' })).reason, 'needs you');
  await tell({ ...w.at, agent: 'codex-d', text: 'old news' });
  const replaced = await tell({ ...w.at, drop: 'Reports', agent: 'codex-d', text: 'Newest news.' });
  assert.deepEqual([replaced.status, replaced.dropped], ['queued', 1]);
  assert.deepEqual(takeNotes({ home: w.home, key: 'codex-d' }).map(note => note.text), ['From the daily: Newest news.']);
  writeFileSync(join(w.stateDir, 'off'), 'x');
  assert.equal((await tell({ ...w.at, agent: 'codex-d', text: 'x' })).reason, 'off');
  const outside = join(w.home, 'outside.jsonl');
  writeFileSync(outside, 'keep');
  assert.equal((await tell({ ...w.at, drop: '../../../../outside' })).status, 'refused');
  assert.equal(readFileSync(outside, 'utf8'), 'keep');
});

test('a Paseo chat with a card but in no watch list still gets its note; the streak, Needs you and check-ins off still hold', async () => {
  const w = world();
  writeJson(join(w.stateDir, `${DAY}.watch.json`), { startedAt: iso(NOW - 60 * MIN), gone: [], chats: [], agents: {} });
  for (let round = 0; round < 6; round++) {
    await tell({ ...w.at, agent: 'Sign-in', text: `News ${round}.` });
    await w.deliver();
  }
  assert.deepEqual(w.paseo.sent.map(([id, text]) => [id, text]), [0, 1, 2, 3, 4].map(round => ['pc', `From the daily: News ${round}.`]));
  assert.deepEqual(readMap(w.stateDir).notes.map(note => note.text), ['News 5.'], 'the sixth waits: 5 in a row with no word from the person');
  await tell({ ...w.at, agent: 'Checkout', text: 'Use Stripe.' });
  writeJson(needsYouFile(w.stateDir), { chats: ['pa'] });
  await w.deliver();
  assert.ok(!w.paseo.sent.some(([id]) => id === 'pa'));
  assert.equal(w.journal().at(-1), 'Not told Checkout: it waits for you');
  writeJson(needsYouFile(w.stateDir), { chats: [] });
  await tell({ ...w.at, agent: 'Checkout', text: 'Use Stripe.' });
  writeFileSync(join(w.stateDir, 'off'), 'x');
  await w.deliver();
  assert.deepEqual([w.paseo.sent.length, w.journal().at(-1)], [5, 'Not told Checkout: check-ins are off']);
});

test('a working Paseo chat keeps a plain note for its next stop and gets a now note steered in; a gone chat\'s note goes with one line', async () => {
  const w = world();
  w.paseo.list[1].status = 'running';
  await tell({ ...w.at, agent: 'codex-c', text: 'Sign-in is live now.' });
  await w.deliver();
  assert.deepEqual(w.paseo.sent, []);
  await tell({ ...w.at, agent: 'codex-c', text: 'Stop the PayPal form: use Stripe.', urgent: true });
  await w.deliver();
  assert.deepEqual(w.paseo.sent.map(([id, text]) => [id, text]), [['pc', 'From the daily: Stop the PayPal form: use Stripe.']]);
  assert.ok(!w.paseo.calls.flat().includes('interrupt'));
  w.paseo.list[1].status = 'idle';
  const printed = [];
  await w.deliver({ dryRun: true, print: item => printed.push(item) });
  assert.deepEqual(printed, [{ wouldTell: 'Sign-in', steer: false, text: 'Sign-in is live now.' }]);
  w.paseo.list = [];
  await w.deliver();
  assert.deepEqual(w.journal(), ['Steered Sign-in: Stop the PayPal form: use Stripe.', 'Not told Sign-in: the chat is gone']);
});

test('the map keeps read marks, told, Paseo ids and covered from the script, closes a chat that left, and drops one closed over 7 days', async () => {
  const w = world();
  w.say['claude-b']('user', 'Add payments');
  await lineUpData(w.at);
  const old = readMap(w.stateDir);
  writeJson(join(w.stateDir, 'line-up.json'), { ...old, chats: { gone: { title: 'Old', closedAt: iso(NOW - 8 * 24 * 60 * MIN) },
    'claude-b': { title: 'Payments', told: [{ at: 'x', text: 'earlier' }], covered: 'claude-a' } } });
  assert.equal(saveMap({ stateDir: w.stateDir, chats: [] }).reason, 'map');
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: { 'claude-b': { title: 'Payments', goal: 'Payments', read: 1, told: [] },
    'claude-a': { title: 'Checkout' }, left: { title: 'Left chat' } } });
  const map = readMap(w.stateDir);
  assert.deepEqual(Object.keys(map.chats).sort(), ['claude-a', 'claude-b', 'codex-c', 'codex-d', 'left']);
  assert.deepEqual([map.chats['claude-b'].read, map.chats['claude-b'].told.length, map.chats['claude-b'].covered], [old.shown.marks['claude-b'], 1, 'claude-a']);
  assert.equal(map.chats['claude-a'].paseoId, 'pa');
  assert.equal(map.chats.left.closedAt, iso(NOW));
});

test('a covered chat stops being covered when the person writes in it after the note, or when the run clears it', async () => {
  const w = world();
  w.say['claude-b']('user', 'Keep the old form.', NOW - 10 * MIN);
  await lineUpData(w.at);
  const cover = { covered: 'claude-a', coveredAt: iso(NOW - 30 * MIN) };
  writeJson(join(w.stateDir, 'line-up.json'), { ...readMap(w.stateDir),
    chats: { 'claude-a': { title: 'Checkout', ...cover }, 'claude-b': { title: 'Payments', ...cover }, 'codex-c': { title: 'Sign-in', ...cover } } });
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: { 'claude-a': { title: 'Checkout', covered: null }, 'claude-b': { title: 'Payments' },
    'codex-c': { title: 'Sign-in' } } });
  const { chats } = readMap(w.stateDir);
  assert.deepEqual([chats['claude-a'].covered, chats['claude-b'].covered, chats['codex-c'].covered], [null, null, 'claude-a']);
});

test('the check runs when an idle chat ended a turn the map has not read, never mid-turn, or when a chat another waits for closes', async () => {
  const w = world();
  assert.deepEqual(w.due(), { chats: 'codex-c,codex-d' }, 'a chat seen first');
  await lineUpData(w.at);
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: {} });
  assert.equal(w.due(NOW + 20 * MIN), null);
  w.say['claude-a']('user', 'Build checkout');
  w.say['codex-d']('user', 'Build reports');
  assert.deepEqual(w.due(), { chats: 'claude-a,codex-d' });
  await lineUpData(w.at);
  assert.equal(w.due(), null, 'shown in the last 15 minutes');
  assert.deepEqual(w.due(NOW + 20 * MIN), { chats: 'claude-a,codex-d' });
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: { 'claude-a': {}, 'claude-b': { waitsFor: [{ on: 'codex-d', what: 'reports' }] }, 'codex-c': {}, 'codex-d': {} } });
  assert.equal(w.due(NOW + 20 * MIN), null);
  card(w.home, { key: 'claude-a', tool: 'claude', name: 'Checkout', cwd: '/w/repo-a', paseoId: 'pa', transcript: w.file['claude-a'], state: 'working' });
  w.say['claude-a']('assistant', 'Working…');
  assert.equal(w.due(NOW + 20 * MIN), null, 'a working chat waits for its turn to end');
  rmSync(join(w.home, '.local', 'state', 'wongstack', 'chats', 'codex-d.json'));
  assert.deepEqual(w.due(NOW + 20 * MIN), { chats: 'claude-b' });
});

test('the check script reads the context on stdin and prints one run line', () => {
  const home = temp(), repo = realpathSync(temp());
  execFileSync('git', ['init', '-q', repo]);
  const file = join(home, 'claude-a.jsonl');
  card(home, { key: 'claude-a', tool: 'claude', name: 'Checkout', cwd: repo, transcript: file });
  transcript(file, 'claude', 'claude-a', repo)('user', 'Build checkout');
  mkdirSync(stateDirectory(repo, 'alex', join(home, '.local', 'state', 'wongstack', 'daily')), { recursive: true });
  const { CLAUDE_CODE_SESSION_ID: _self, ...env } = process.env;
  const check = () => spawnSync(process.execPath, [CHECK], { input: JSON.stringify({ repo, person: 'alex', timezone: ZONE }),
    encoding: 'utf8', env: { ...env, HOME: home } });
  assert.deepEqual([check().status, check().stdout], [0, '{"run":{"chats":"claude-a"}}\n']);
});

test('the stop judge sees up to 20 newest choices from other chats, never its own', () => {
  const stateDir = temp();
  const choices = n => Array.from({ length: n }, (_, i) => ({ at: `2026-11-07T${String(i).padStart(2, '0')}:00:00Z`, text: `choice ${i}` }));
  writeJson(join(stateDir, 'line-up.json'), { chats: { a: { title: 'Checkout', choices: choices(22) }, b: { title: 'Payments', choices: [{ at: 'z', text: 'mine' }] } } });
  const lines = elsewhere(stateDir, 'b').split('\n');
  assert.equal(lines.length, 20);
  assert.equal(lines[0], '2026-11-07T21:00:00Z — Checkout: choice 21');
  assert.ok(!lines.some(line => line.includes('mine')));
  assert.equal(elsewhere(temp(), 'b'), '');
});
