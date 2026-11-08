import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { closesFile, keepChats, openChats } from '../../.agents/skills/daily/scripts/todos.mjs';

const START = Date.parse('2026-10-21T14:00:00Z');
const MIN = 60e3;
const COMPUTER = 'a'.repeat(32);
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

/** A fake app: it keeps the last list sent, answers `asked` as each chat's close time, and throws while `down`. */
function fakeApp() {
  const box = { sent: [], asked: {}, down: false };
  box.sync = async body => {
    box.sent.push(body);
    if (box.down) throw new Error('502: app down');
    return { chats: body.chats.map(chat => ({ agentId: chat.agentId, closeAskedAt: box.asked[chat.agentId] ?? null })) };
  };
  return box;
}

// Two open chats, one working; `pass` runs keepChats at a time, with `more` on top.
function setup() {
  const stateDir = mkdtempSync(join(tmpdir(), 'chats-test-')); roots.push(stateDir);
  const list = [{ id: 'agent-mine', name: 'Fix the Notes page', status: 'idle', cwd: '/w/quick-elk' },
    { id: 'agent-busy', name: 'Team plan', status: 'running', cwd: '/w/team-yak/' }];
  const chats = openChats({ rows: [], list, known: { 'agent-mine': { parent: null }, 'agent-busy': { parent: null } } });
  const app = fakeApp();
  const sends = [], lines = [];
  const typed = {};
  const pass = (at, more = {}) => keepChats({ stateDir, chats, sync: app.sync, computer: COMPUTER, list, now: new Date(at),
    send: async agentId => { sends.push(agentId); }, typedAt: agentId => typed[agentId] ?? null, line: event => lines.push(event),
    read: file => readJson(file, {}), write: writeJson, ...more });
  return { stateDir, list, chats, app, sends, lines, typed, pass };
}

test('the list holds each watched and top-level chat with its name and folder, and no sub-agent, closed chat or this chat', () => {
  const list = [{ id: 'own', name: 'Fix  the\nNotes page', status: 'idle', cwd: '/w/quick-elk/' },
    { id: 'handed', status: 'running', cwd: '/elsewhere/team-yak' },
    { id: 'top', name: 'Old idea', status: 'idle', cwd: '/w/calm-cat' },
    { id: 'sub', name: 'A sub-agent', status: 'idle', cwd: '/w/calm-cat' },
    { id: 'shut', name: 'Done', status: 'closed', cwd: '/w/shut' },
    { id: 'needs', name: 'Needs you: Paseo', status: 'idle', cwd: '/w/needs-owl' },
    { id: 'needs-other', name: 'Needs you: elsewhere', status: 'idle', cwd: '/other/x' },
    { id: 'me', name: 'This chat', status: 'running', cwd: '/w/me' }];
  const rows = [{ agentId: 'own', source: 'own' }, { agentId: 'handed', title: 'Team plan', source: 'handed' }, { agentId: 'shut', source: 'own' },
    { agentId: 'me', source: 'own' }];
  const known = { top: { parent: null }, sub: { parent: 'top' } };
  assert.deepEqual(openChats({ rows, list, known, ignore: ['needs', 'needs-other'], self: 'me', ownRepo: cwd => cwd.startsWith('/w/') }), [
    { agentId: 'own', name: 'Fix the Notes page', step: null, folder: 'quick-elk', source: null },
    { agentId: 'handed', name: 'Team plan', step: null, folder: 'team-yak', source: null },
    { agentId: 'top', name: 'Old idea', step: null, folder: 'calm-cat', source: null },
    { agentId: 'needs', name: 'Needs you: Paseo', step: null, folder: 'needs-owl', source: null }]);
});

test('a step-named chat goes as its task and step, and a schedule\'s chat with its source', () => {
  const list = [{ id: 'a1', name: 'APPLY: Fix the invoice total', status: 'idle', cwd: '/w/a1' },
    { id: 'a2', name: 'Late invoices', status: 'idle', cwd: '/w/a2', labels: { 'wong-schedule': 'invoice-check' } }];
  assert.deepEqual(openChats({ rows: [], list, known: { a1: { parent: null }, a2: { parent: null } } }), [
    { agentId: 'a1', name: 'Fix the invoice total', step: 'APPLY', folder: 'a1', source: null },
    { agentId: 'a2', name: 'Late invoices', step: null, folder: 'a2', source: 'schedule:invoice-check' }]);
});

test('a schedule\'s chat shows only once it has stopped 2 minutes, its label read from Paseo\'s record', () => {
  const NOW = Date.parse('2026-11-08T12:00:00Z');
  const ago = minutes => new Date(NOW - minutes * 60e3).toISOString();
  const label = { 'wong-schedule': 'news' };
  const records = {
    running: { labels: label, lastActivityAt: ago(10) },
    just: { labels: label, lastActivityAt: ago(1) },
    settled: { labels: label, lastActivityAt: ago(3) },
    archived: { labels: label, lastActivityAt: ago(10) },
    timeless: { labels: label },
    mine: { lastActivityAt: ago(0) },
  };
  const list = [{ id: 'running', name: 'News', status: 'running', cwd: '/w/a' }, { id: 'just', name: 'News', status: 'idle', cwd: '/w/b' },
    { id: 'settled', name: 'News', status: 'idle', cwd: '/w/c' }, { id: 'archived', name: 'News', status: 'idle', cwd: '/w/d', archivedAt: ago(9) },
    { id: 'timeless', name: 'News', status: 'idle', cwd: '/w/e' }, { id: 'mine', name: 'My chat', status: 'idle', cwd: '/w/f' }];
  const known = Object.fromEntries(list.map(agent => [agent.id, { parent: null }]));
  const open = openChats({ rows: [], list, known, record: id => records[id], now: NOW });
  assert.deepEqual(open.map(chat => [chat.agentId, chat.source]), [
    ['settled', 'schedule:news'], ['timeless', 'schedule:news'], ['mine', null]]);
});

test('a running schedule\'s chat the person wrote in after its first minute is in the list; its run\'s own message is not', () => {
  const label = { 'wong-schedule': 'news' };
  const records = {
    taken: { labels: label, createdAt: '2026-11-08T11:00:00Z', lastUserMessageAt: '2026-11-08T11:20:00Z' },
    own: { labels: label, createdAt: '2026-11-08T11:00:00Z', lastUserMessageAt: '2026-11-08T11:00:03Z' },
  };
  const list = [{ id: 'taken', name: 'News', status: 'running', cwd: '/w/a' }, { id: 'own', name: 'News', status: 'running', cwd: '/w/b' }];
  const known = { taken: { parent: null }, own: { parent: null } };
  const open = openChats({ rows: [], list, known, record: id => records[id], now: Date.parse('2026-11-08T12:00:00Z') });
  assert.deepEqual(open.map(chat => [chat.agentId, chat.source]), [['taken', 'schedule:news']]);
});

test('a chat named by another repo skill goes as its task and step; a capital word no skill has stays in the name', () => {
  const list = [{ id: 'a1', name: 'VERIFY: Fix the invoice total', status: 'idle', cwd: '/w/a1' },
    { id: 'a2', name: 'SYNC: Take the new release', status: 'idle', cwd: '/w/a2' },
    { id: 'a3', name: 'TODO: Call the bank', status: 'idle', cwd: '/w/a3' }];
  const known = { a1: { parent: null }, a2: { parent: null }, a3: { parent: null } };
  assert.deepEqual(openChats({ rows: [], list, known }).map(chat => [chat.name, chat.step]), [
    ['Fix the invoice total', 'VERIFY'], ['Take the new release', 'SYNC'], ['TODO: Call the bank', null]]);
});

test('each pass sends the list once with the computer, and a chat nobody closed gets no message', async () => {
  const t = setup();
  await t.pass(START);
  await t.pass(START + MIN);
  assert.deepEqual(t.app.sent, [{ computer: COMPUTER, chats: t.chats }, { computer: COMPUTER, chats: t.chats }]);
  assert.deepEqual(t.chats.map(chat => chat.folder), ['quick-elk', 'team-yak']);
  assert.deepEqual([t.sends, t.lines], [[], []]);
});

test('an app that does not take the list throws, and sends no chat a message', async () => {
  const t = setup();
  t.app.down = true;
  t.app.asked['agent-mine'] = START;
  await assert.rejects(t.pass(START + 20 * MIN), /502: app down/);
  assert.deepEqual(t.sends, []);
  await assert.rejects(t.pass(START, { sync: async () => ({}) }), /no chat list/);
});

test('a chat the person closed gets /close once, after 15 quiet minutes there and once idle', async () => {
  const t = setup();
  t.app.asked = { 'agent-mine': START, 'agent-busy': START };
  t.typed['agent-mine'] = new Date(START - 5 * MIN).toISOString();
  await t.pass(START);
  assert.deepEqual(t.sends, [], 'the person wrote 5 minutes ago');
  await t.pass(START + 10 * MIN);
  assert.deepEqual(t.sends, ['agent-mine']);
  assert.deepEqual(t.lines, [{ event: 'close', agent: 'agent-mine', title: 'Fix the Notes page' }]);
  await t.pass(START + 20 * MIN);
  assert.deepEqual(t.sends, ['agent-mine'], 'one /close for one close ask; the working chat waits');
  t.list[1].status = 'idle';
  await t.pass(START + 21 * MIN);
  assert.deepEqual(t.sends, ['agent-mine', 'agent-busy']);
});

test('a new close ask sends /close again; an ask the app no longer gives is forgotten', async () => {
  const t = setup();
  t.app.asked['agent-mine'] = START;
  await t.pass(START);
  t.app.asked = {};
  await t.pass(START + MIN);
  assert.deepEqual(readJson(closesFile(t.stateDir), {}), {});
  t.app.asked['agent-mine'] = START + 2 * MIN;
  await t.pass(START + 3 * MIN);
  assert.deepEqual(t.sends, ['agent-mine', 'agent-mine']);
});

test('a close the chat does not take is tried 3 times, then one Not closed line', async () => {
  const t = setup();
  t.app.asked['agent-mine'] = START;
  const send = async () => { throw new Error('Paseo refused\nmore'); };
  for (let pass = 0; pass < 5; pass++) await t.pass(START + pass * MIN, { send });
  assert.deepEqual(t.lines, [{ event: 'not-closed', agent: 'agent-mine', title: 'Fix the Notes page', error: 'Paseo refused' }]);
  assert.equal(readJson(closesFile(t.stateDir), {})['agent-mine'].tries, 3);
});

test('a close time for a chat this computer did not send is left alone', async () => {
  const t = setup();
  await t.pass(START, { sync: async () => ({ chats: [{ agentId: 'other-computer', closeAskedAt: START }] }) });
  assert.deepEqual([t.sends, readJson(closesFile(t.stateDir), {})], [[], {}]);
});
