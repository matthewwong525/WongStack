import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { appendNote, handOver, notesDir, takeNotes } from '../../.agents/skills/daily/scripts/waiting-notes.mjs';

const DAILY = fileURLToPath(new URL('../../.agents/skills/daily/scripts/daily.mjs', import.meta.url));
const NOTES = fileURLToPath(new URL('../../.agents/skills/daily/scripts/waiting-notes.mjs', import.meta.url));
const ZONE = 'America/New_York';
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'waiting-notes-')); roots.push(dir); return dir; };
const note = (stateDir, text) => ({ text: `From the daily: ${text}`, title: 'Payments', stateDir, timezone: ZONE, at: '2026-11-08T15:00:00Z' });

test('notes wait in order and a take removes them; a chat with none takes nothing', () => {
  const home = temp(), stateDir = temp();
  appendNote({ home, key: 'codex-1', note: note(stateDir, 'Use Stripe.') });
  appendNote({ home, key: 'codex-1', note: note(stateDir, 'Sign-in is live.') });
  appendNote({ home, key: 'codex-2', note: note(stateDir, 'Other chat.') });
  assert.deepEqual(takeNotes({ home, key: 'codex-1' }).map(each => each.text), ['From the daily: Use Stripe.', 'From the daily: Sign-in is live.']);
  assert.deepEqual(takeNotes({ home, key: 'codex-1' }), []);
  assert.deepEqual(takeNotes({ home, key: 'nobody' }), []);
  assert.equal(takeNotes({ home, key: 'codex-2' }).length, 1);
});

test('a key that is not a chat key never reaches outside the notes folder', () => {
  const home = temp(), stateDir = temp();
  mkdirSync(notesDir(home), { recursive: true });
  const outside = join(home, 'outside.jsonl');
  writeFileSync(outside, `${JSON.stringify(note(stateDir, 'Keep me.'))}\n`);
  for (const key of ['../../../../outside', '..', '', undefined]) {
    appendNote({ home, key, note: note(stateDir, 'x') });
    assert.deepEqual(takeNotes({ home, key }), [], String(key));
  }
  assert.equal(readFileSync(outside, 'utf8'), `${JSON.stringify(note(stateDir, 'Keep me.'))}\n`);
  assert.equal(existsSync(join(home, '.local', 'state', 'wongstack', 'notes', '...jsonl')), false);
});

test('two takers at once never get one note twice, and no note is lost', async () => {
  const home = temp(), stateDir = temp();
  for (let n = 0; n < 40; n++) appendNote({ home, key: 'codex-1', note: note(stateDir, `note ${n}`) });
  const taker = () => new Promise(done => {
    const child = spawn(process.execPath, ['--input-type=module', '-e',
      `import { takeNotes } from ${JSON.stringify(NOTES)}; console.log(JSON.stringify(takeNotes({ home: ${JSON.stringify(home)}, key: 'codex-1' }).map(each => each.text)));`],
    { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('close', () => done(JSON.parse(out)));
  });
  const [a, b] = await Promise.all([taker(), taker()]);
  assert.equal(a.length + b.length, 40);
  assert.equal(new Set([...a, ...b]).size, 40);
});

test('a hand-over gives the notes as one text and writes one journal line each', () => {
  const home = temp(), stateDir = temp();
  appendNote({ home, key: 'codex-1', note: note(stateDir, 'Use Stripe, not PayPal (Checkout, 10:00).') });
  appendNote({ home, key: 'codex-1', note: note(stateDir, 'Sign-in is live.') });
  assert.equal(handOver({ home, key: 'codex-1' }), 'From the daily: Use Stripe, not PayPal (Checkout, 10:00).\n\nFrom the daily: Sign-in is live.');
  assert.deepEqual(readLines({ stateDir }).map(entry => [entry.kind, entry.line]),
    [['line-up', 'Told Payments: Use Stripe, not PayPal (Checkout, 10:00).'], ['line-up', 'Told Payments: Sign-in is live.']]);
  assert.equal(handOver({ home, key: 'codex-1' }), null);
});

for (const tool of ['claude', 'codex']) {
  test(`${tool}: the message hook prints the waiting notes as added context, once, and writes the chat's card`, () => {
    const home = temp(), stateDir = temp();
    appendNote({ home, key: 'chat-1', note: note(stateDir, 'Use Stripe.') });
    const hook = event => spawnSync(process.execPath, [DAILY, 'mark', '--agent', tool], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home },
      input: JSON.stringify({ hook_event_name: event, session_id: 'chat-1', cwd: home, prompt: 'Go on.' }) });
    const first = hook('UserPromptSubmit');
    assert.deepEqual([first.status, first.stdout], [0, 'From the daily: Use Stripe.\n']);
    assert.deepEqual([hook('UserPromptSubmit').stdout, hook('SessionStart').stdout], ['', '']);
    assert.equal(readLines({ stateDir }).length, 1);
    assert.equal(JSON.parse(readFileSync(join(home, '.local', 'state', 'wongstack', 'chats', 'chat-1.json'), 'utf8')).tool, tool);
  });
}
