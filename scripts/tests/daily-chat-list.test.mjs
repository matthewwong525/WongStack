import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { cardsDir, chatList, findChat, writeCard } from '../../.agents/skills/daily/scripts/chat-list.mjs';

const NOW = Date.parse('2026-11-08T15:00:00Z');
const HOUR = 3600e3;
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'chat-list-')); roots.push(dir); return dir; };

// `/w/repo*` is this project, `/w/other` another.
const ownRepo = cwd => cwd.startsWith('/w/repo');
const list = (home, more = {}) => chatList({ project: '/w/repo', env: {}, home, now: NOW, ownRepo, ...more });
/** One hook call for a chat: `event` on `tool`, with a fresh transcript file. */
function hook(home, { tool = 'claude', key, cwd = '/w/repo', event = 'SessionStart', env = {}, now = NOW, more = {} }) {
  const transcript = join(home, `${key}.jsonl`);
  if (!existsSync(transcript)) writeFileSync(transcript, '');
  return writeCard({ tool, env, home, now, input: { hook_event_name: event, session_id: key, cwd, transcript_path: transcript, ...more } });
}

test('Claude Code and Codex hooks write a card each; a stop marks it idle; the list is this repo\'s chats but this one', () => {
  const home = temp();
  hook(home, { key: 'claude-a', event: 'UserPromptSubmit', env: { PASEO_AGENT_ID: 'agent-7' } });
  hook(home, { tool: 'codex', key: 'codex-b', cwd: '/w/repo-tree' });
  hook(home, { key: 'claude-c', cwd: '/w/other' });
  assert.deepEqual(list(home).map(chat => [chat.key, chat.tool, chat.name, chat.state, chat.paseoId]),
    [['claude-a', 'claude', 'repo', 'working', 'agent-7'], ['codex-b', 'codex', 'repo-tree', 'working', null]]);
  assert.deepEqual(list(home)[0], { key: 'claude-a', tool: 'claude', name: 'repo', paseoId: 'agent-7', cwd: '/w/repo', state: 'working',
    transcript: join(home, 'claude-a.jsonl') });
  hook(home, { tool: 'codex', key: 'codex-b', cwd: '/w/repo-tree', event: 'Stop' });
  assert.equal(list(home)[1].state, 'idle');
  assert.deepEqual(list(home, { env: { CLAUDE_CODE_SESSION_ID: 'claude-a' } }).map(chat => chat.key), ['codex-b']);
  assert.deepEqual(list(home, { env: { CODEX_THREAD_ID: 'codex-b' } }).map(chat => chat.key), ['claude-a']);
});

test("a chat in Paseo takes its Paseo title as its name", () => {
  const home = temp();
  writeJson(join(home, '.paseo', 'agents', 'w-repo', 'agent-7.json'), { id: 'agent-7', title: 'Checkout page' });
  hook(home, { key: 'claude-a', env: { PASEO_AGENT_ID: 'agent-7' } });
  assert.equal(list(home)[0].name, 'Checkout page');
});

test('a background run, a sub-agent, a notice, a bad key, a bad card or one from another tool writes or lists nothing', () => {
  const home = temp();
  assert.equal(hook(home, { key: 'claude-a', env: { WONG_DAILY_RUN: '1' } }).status, 'skipped');
  assert.equal(hook(home, { key: 'claude-b', more: { agent_id: 'sub' } }).status, 'skipped');
  assert.equal(hook(home, { tool: 'codex', key: 'codex-c', more: { parent_thread_id: 't' } }).status, 'skipped');
  assert.equal(hook(home, { key: 'claude-d', event: 'Notification' }).status, 'skipped');
  assert.equal(hook(home, { key: '../x' }).status, 'skipped');
  writeJson(join(cardsDir(home), 'gemini-e.json'), { key: 'gemini-e', tool: 'gemini', cwd: '/w/repo', at: new Date(NOW).toISOString() });
  writeFileSync(join(cardsDir(home), 'bad.json'), '{not json');
  assert.deepEqual(list(home), []);
});

test('a card 24 hours old over an unchanged transcript is closed, and goes after 7 days', () => {
  const home = temp();
  hook(home, { tool: 'codex', key: 'codex-1' });
  const transcript = join(home, 'codex-1.jsonl');
  utimesSync(transcript, new Date(NOW + 20 * HOUR), new Date(NOW + 20 * HOUR));
  assert.equal(list(home, { now: NOW + 25 * HOUR }).length, 1, 'the transcript changed within the day');
  utimesSync(transcript, new Date(NOW), new Date(NOW));
  assert.equal(list(home, { now: NOW + 25 * HOUR }).length, 0);
  assert.ok(existsSync(join(cardsDir(home), 'codex-1.json')));
  list(home, { now: NOW + 8 * 24 * HOUR });
  assert.equal(existsSync(join(cardsDir(home), 'codex-1.json')), false);
});

test('a chat is found by key, Paseo id, key prefix, name or folder', () => {
  const chats = [{ key: 'claude-aaaa', name: 'Checkout', paseoId: 'agent-7', cwd: '/w/repo' },
    { key: 'codex-bbbb', name: 'Payments', paseoId: null, cwd: '/w/repo-pay' }];
  assert.equal(findChat(chats, 'codex-bbbb').name, 'Payments');
  assert.equal(findChat(chats, 'agent-7').name, 'Checkout');
  assert.equal(findChat(chats, 'clau').name, 'Checkout');
  assert.equal(findChat(chats, 'payments').key, 'codex-bbbb');
  assert.equal(findChat(chats, 'repo-pay').key, 'codex-bbbb');
  assert.equal(findChat(chats, 'nobody'), null);
  assert.equal(findChat(chats, ''), null);
});
