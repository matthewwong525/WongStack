import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { actions, messageMark, writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { localDay } from '../../.agents/skills/daily/scripts/config.mjs';
import { stateDirectory } from '../../.agents/skills/daily/scripts/daily.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { deliverNotes, elsewhere, lineUpData, lineUpDue, readMap, saveMap, tell } from '../../.agents/skills/daily/scripts/line-up.mjs';

const CHECK = fileURLToPath(new URL('../../.agents/skills/daily/scripts/line-up-check.mjs', import.meta.url));
const ZONE = 'America/New_York';
const DAY = '2026-11-07';
const NOW = Date.parse('2026-11-07T15:00:00Z');
const MIN = 60e3;
const env = { PASEO_AGENT_ID: 'daily-worker' };
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'line-up-')); roots.push(dir); return dir; };

/** Three watched chats in one day's watch, a fake Paseo, and the shared arguments. */
function world({ stateDir = temp(), day = DAY } = {}) {
  const agent = (id, name, status = 'idle') => ({ id, name, status, cwd: `/w/${id}` });
  const paseo = { list: [agent('a', 'Checkout'), agent('b', 'Payments'), agent('c', 'Sign-in')], logs: {}, sent: [], calls: [] };
  writeJson(join(stateDir, `${day}.watch.json`), { startedAt: new Date(NOW - 60 * MIN).toISOString(), gone: [],
    chats: paseo.list.map(each => ({ agentId: each.id, title: each.name, workspace: each.id, source: 'own' })),
    agents: { a: { last: 'ma' }, b: { last: 'mb' }, c: {} } });
  const call = async args => {
    paseo.calls.push(args);
    const [name] = args;
    if (name === 'ls') return structuredClone(paseo.list);
    if (name === 'logs') return paseo.logs[args[1]] ?? '';
    if (name === 'send') { paseo.sent.push([args[1], readFileSync(args[3], 'utf8').trim(), args.slice(4)]); return { ok: true }; }
    throw new Error(`unexpected call ${args.join(' ')}`);
  };
  const at = { stateDir, day: DAY, started: () => ({}), timezone: ZONE, call, env };
  const deliver = (more = {}) => deliverNotes({ ...at, now: () => new Date(NOW), typedAt: () => null, ...more });
  const journal = () => readLines({ stateDir }).map(entry => entry.line);
  return { stateDir, paseo, at, deliver, journal, setStatus: (id, status) => { paseo.list.find(each => each.id === id).status = status; } };
}

test('tell queues a note for a watched chat, refuses an unwatched one and an empty note, and drop clears that chat\'s notes', async () => {
  const w = world();
  assert.equal((await tell({ ...w.at, agent: 'Payments', text: 'Use Stripe, not PayPal (Checkout, 10:00).' })).status, 'queued');
  assert.equal((await tell({ ...w.at, agent: 'b', text: 'Second note.', urgent: true })).now, true);
  assert.equal((await tell({ ...w.at, agent: 'stranger', text: 'x' })).reason, 'unwatched');
  assert.equal((await tell({ ...w.at, agent: 'b', text: '  ' })).reason, 'message');
  assert.equal((await tell({ ...w.at, agent: 'b', text: 'x', coveredBy: 'nobody' })).reason, 'unwatched');
  assert.equal(readMap(w.stateDir).notes.length, 2);
  const replaced = await tell({ ...w.at, drop: 'Payments', agent: 'b', text: 'Newest news.' });
  assert.deepEqual([replaced.status, replaced.dropped], ['queued', 2]);
  assert.deepEqual(readMap(w.stateDir).notes.map(note => note.text), ['Newest news.']);
  assert.deepEqual(await tell({ ...w.at, drop: 'b' }), { status: 'dropped', agent: 'b', dropped: 1 });
  assert.equal((await tell({ ...w.at, env: {}, agent: 'b', text: 'x' })).status, 'unsupported');
});

test('an idle chat gets its note as its next turn, it lands in told and the journal, and the chat is marked covered', async () => {
  const w = world();
  await tell({ ...w.at, agent: 'b', text: 'Checkout carries the export button: drop yours.', coveredBy: 'a' });
  await tell({ ...w.at, agent: 'b', text: 'A second note waits for the next pass.' });
  await w.deliver();
  assert.deepEqual(w.paseo.sent, [['b', 'From the daily: Checkout carries the export button: drop yours.', ['--behavior', 'steer', '--no-wait']]]);
  const map = readMap(w.stateDir);
  assert.deepEqual(map.chats.b.told.map(each => each.text), ['Checkout carries the export button: drop yours.']);
  assert.deepEqual([map.chats.b.covered, map.chats.b.coveredAt], ['a', new Date(NOW).toISOString()]);
  assert.equal(map.notes.length, 1);
  assert.deepEqual(w.journal(), ['Told Payments: Checkout carries the export button: drop yours.']);
  assert.deepEqual(actions({ stateDir: w.stateDir, day: DAY }).map(entry => [entry.agent, entry.bucket, entry.kind]), [['b', 'line-up', 'reply']]);
});

test('a working chat keeps a plain note for its next stop and gets a now note steered in, never interrupted', async () => {
  const w = world();
  w.setStatus('b', 'running');
  await tell({ ...w.at, agent: 'b', text: 'Sign-in is live now.' });
  await w.deliver();
  assert.deepEqual(w.paseo.sent, []);
  await tell({ ...w.at, agent: 'b', text: 'Stop the PayPal form: use Stripe.', urgent: true });
  await w.deliver();
  assert.deepEqual(w.paseo.sent.map(([id, text, flags]) => [id, text, flags[1]]), [['b', 'From the daily: Stop the PayPal form: use Stripe.', 'steer']]);
  assert.ok(!w.paseo.calls.flat().includes('interrupt'));
  assert.deepEqual(w.journal(), ['Steered Payments: Stop the PayPal form: use Stripe.']);
  w.setStatus('b', 'idle');
  await w.deliver();
  assert.equal(w.paseo.sent.at(-1)[1], 'From the daily: Sign-in is live now.');
  assert.equal(readMap(w.stateDir).notes.length, 0);
});

test('after 5 actions in a row the note stays queued, and a gone chat\'s note goes with one line', async () => {
  const w = world();
  const log = Array.from({ length: 5 }, (_, n) => JSON.stringify({ at: new Date(NOW - (10 - n) * MIN).toISOString(), agent: 'b', bucket: 'keep-going' }));
  writeFileSync(join(w.stateDir, `${DAY}.actions.jsonl`), `${log.join('\n')}\n`);
  await tell({ ...w.at, agent: 'b', text: 'News.' });
  await tell({ ...w.at, agent: 'c', text: 'Other news.' });
  w.paseo.list = w.paseo.list.filter(each => each.id !== 'c');
  await w.deliver();
  assert.deepEqual(w.paseo.sent, []);
  assert.deepEqual(readMap(w.stateDir).notes.map(note => note.agent), ['b']);
  assert.deepEqual(w.journal(), ['Not told Sign-in: the chat is gone']);
  const printed = [];
  await w.deliver({ dryRun: true, print: item => printed.push(item) });
  assert.deepEqual(printed, [{ wouldTell: 'Payments', steer: false, text: 'News.' }]);
});

test('the map keeps read marks, told and covered from the script, closes a chat that left, and drops one closed over 7 days', async () => {
  const w = world();
  await lineUpData({ ...w.at, now: new Date(NOW) });
  const old = readMap(w.stateDir);
  writeJson(join(w.stateDir, 'line-up.json'), { ...old, chats: { gone: { title: 'Old', closedAt: new Date(NOW - 8 * 24 * 60 * MIN).toISOString() },
    week: { title: 'Week', closedAt: new Date(NOW - 2 * 24 * 60 * MIN).toISOString(), choices: [{ at: '2026-11-05T10:00:00Z', text: 'Dark theme' }] },
    b: { title: 'Payments', told: [{ at: 'x', text: 'earlier' }], covered: 'a' } } });
  assert.equal(saveMap({ stateDir: w.stateDir, chats: [] }).reason, 'map');
  const saved = saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: {
    b: { title: 'Payments', goal: 'Checkout payments', read: 'forged', told: [], choices: [{ at: '2026-11-07T14:00:00Z', text: 'Use Stripe' }] },
    left: { title: 'Left chat', goal: 'x' } } });
  assert.equal(saved.status, 'saved');
  const map = readMap(w.stateDir);
  assert.deepEqual(Object.keys(map.chats).sort(), ['a', 'b', 'left', 'week']);
  assert.deepEqual([map.chats.b.read, map.chats.b.told.length, map.chats.b.covered, map.chats.b.goal], ['mb', 1, 'a', 'Checkout payments']);
  assert.equal(map.chats.a.read, 'ma');
  assert.equal(map.chats.left.closedAt, new Date(NOW).toISOString());
  assert.equal(map.chats.b.closedAt, null);
});

test('a chat that left the watch stays closed for 7 days though the run left it out, so its choices still reach other chats', () => {
  const w = world();
  const iso = minutes => new Date(NOW - minutes * MIN).toISOString();
  writeJson(join(w.stateDir, 'line-up.json'), { shown: { at: iso(1), marks: { a: 'ma', b: 'mb' }, watching: ['a', 'b'] },
    chats: { c: { title: 'Sign-in', choices: [{ at: '2026-11-07T14:30:00Z', text: 'Use passkeys' }] } } });
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: { a: { title: 'Checkout' }, b: { title: 'Payments' } } });
  assert.equal(readMap(w.stateDir).chats.c.closedAt, new Date(NOW).toISOString());
  assert.equal(elsewhere(w.stateDir, 'a'), '2026-11-07T14:30:00Z — Sign-in: Use passkeys');
  saveMap({ stateDir: w.stateDir, now: new Date(NOW + 8 * 24 * 60 * MIN), chats: { a: { title: 'Checkout' } } });
  assert.equal(readMap(w.stateDir).chats.c, undefined);
});

test('a covered chat stops being covered when the person writes in it after the note, or when the run clears it', async () => {
  const w = world();
  const iso = minutes => new Date(NOW - minutes * MIN).toISOString();
  const file = join(w.stateDir, `${DAY}.watch.json`);
  const watch = JSON.parse(readFileSync(file, 'utf8'));
  writeJson(file, { ...watch, agents: { a: { last: 'ma' }, b: { last: 'mb', userAt: iso(10) }, c: { userAt: iso(40) } } });
  await lineUpData({ ...w.at, now: new Date(NOW) });
  assert.deepEqual(readMap(w.stateDir).shown.typed, { b: iso(10), c: iso(40) });
  const cover = { covered: 'a', coveredAt: iso(30) };
  writeJson(join(w.stateDir, 'line-up.json'), { ...readMap(w.stateDir),
    chats: { a: { title: 'Checkout', ...cover }, b: { title: 'Payments', ...cover }, c: { title: 'Sign-in', ...cover } } });
  saveMap({ stateDir: w.stateDir, now: new Date(NOW), chats: { a: { title: 'Checkout', covered: null }, b: { title: 'Payments' },
    c: { title: 'Sign-in' } } });
  const { chats } = readMap(w.stateDir);
  assert.deepEqual([chats.a.covered, chats.b.covered, chats.c.covered], [null, null, 'a']);
  assert.equal(chats.c.coveredAt, iso(30));
});

test('line-up shows each changed chat\'s messages after the turn the map read, and the whole tail for a new chat', async () => {
  const w = world();
  const said = 'I built the PayPal form.';
  w.paseo.logs.a = `[User] Build checkout\n${said}\n[User] Use Stripe, not PayPal\nSwitched to Stripe.`;
  w.paseo.logs.b = '[User] Add payments\nStarted.';
  writeJson(join(w.stateDir, 'line-up.json'), { chats: { a: { title: 'Checkout', read: messageMark(said) } } });
  const read = await lineUpData({ ...w.at, now: new Date(NOW) });
  assert.deepEqual(read.chats.map(chat => [chat.agent, chat.messages]), [['a', '[User] Use Stripe, not PayPal\nSwitched to Stripe.'],
    ['b', '[User] Add payments\nStarted.'], ['c', undefined]]);
  assert.deepEqual(readMap(w.stateDir).shown.marks, { a: 'ma', b: 'mb' });
});

test('the check runs only on a new turn, a new chat, or a chat another waits for leaving the watch', async () => {
  const w = world();
  const due = (now = NOW) => lineUpDue({ stateDir: w.stateDir, timezone: ZONE, now });
  assert.deepEqual(due(), { chats: 'a,b' });
  writeJson(join(w.stateDir, 'line-up.json'), { chats: { a: { read: 'ma' }, b: { read: 'mb', waitsFor: [{ on: 'c', what: 'sign-in live' }] }, c: {} } });
  assert.equal(due(), null);
  const file = join(w.stateDir, `${DAY}.watch.json`);
  const watch = JSON.parse(readFileSync(file, 'utf8'));
  writeJson(file, { ...watch, agents: { ...watch.agents, a: { last: 'ma2' } } });
  assert.deepEqual(due(), { chats: 'a' });
  // A run that showed that turn in the last 15 minutes is still reading it; after that it runs again.
  const map = readMap(w.stateDir);
  writeJson(join(w.stateDir, 'line-up.json'), { ...map, shown: { at: new Date(NOW - 5 * MIN).toISOString(), marks: { a: 'ma2' }, watching: ['a', 'b', 'c'] } });
  assert.equal(due(), null);
  assert.deepEqual(due(NOW + 20 * MIN), { chats: 'a' });
  writeJson(join(w.stateDir, 'line-up.json'), { ...map, chats: { ...map.chats, a: { read: 'ma2' } } });
  writeJson(file, { ...watch, gone: ['c'], agents: { a: { last: 'ma' }, b: { last: 'mb' } } });
  assert.deepEqual(due(), { chats: 'a,b' });
  writeJson(join(w.stateDir, 'line-up.json'), { ...readMap(w.stateDir), chats: { a: { read: 'ma' }, b: { read: 'mb', waitsFor: [{ on: 'c' }] },
    c: { closedAt: new Date(NOW).toISOString() } } });
  assert.equal(due(), null);
});

test('the check script reads the context on stdin and prints one run line', () => {
  const home = temp();
  world({ stateDir: stateDirectory('/w/repo', 'alex', join(home, '.local', 'state', 'wongstack', 'daily')), day: localDay(new Date(), ZONE) });
  const check = () => spawnSync(process.execPath, [CHECK], { input: JSON.stringify({ repo: '/w/repo', person: 'alex', timezone: ZONE }),
    encoding: 'utf8', env: { ...process.env, HOME: home } });
  assert.deepEqual([check().status, check().stdout], [0, '{"run":{"chats":"a,b"}}\n']);
});

test('the stop judge sees up to 20 newest choices from other chats, never its own', () => {
  const w = world();
  const choices = n => Array.from({ length: n }, (_, i) => ({ at: `2026-11-07T${String(i).padStart(2, '0')}:00:00Z`, text: `choice ${i}` }));
  writeJson(join(w.stateDir, 'line-up.json'), { chats: { a: { title: 'Checkout', choices: choices(22) }, b: { title: 'Payments', choices: [{ at: 'z', text: 'mine' }] } } });
  const lines = elsewhere(w.stateDir, 'b').split('\n');
  assert.equal(lines.length, 20);
  assert.equal(lines[0], '2026-11-07T21:00:00Z — Checkout: choice 21');
  assert.ok(!lines.some(line => line.includes('mine')));
  assert.equal(elsewhere(temp(), 'b'), '');
});
