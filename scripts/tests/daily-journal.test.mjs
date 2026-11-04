import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEW_DAY, commands, journalHook, stateDirectory } from '../../.agents/skills/daily/scripts/daily.mjs';
import { validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { addLine, hookOutput, journalDir, newLines, prune, readLines } from '../../.agents/skills/daily/scripts/journal.mjs';

const TZ = 'America/Toronto';
const DAILY = 'daily-agent-1';
const DAILY_SCRIPT = fileURLToPath(new URL('../../.agents/skills/daily/scripts/daily.mjs', import.meta.url));
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = realpathSync(mkdtempSync(join(tmpdir(), 'daily-journal-'))); roots.push(dir); return dir; };
const at = text => new Date(text);
const lines = (stateDir, since) => readLines({ stateDir, since }).map(entry => entry.line);
const fresh = (stateDir, now, key = DAILY, run = false) => newLines({ stateDir, timezone: TZ, key, run, now });
const config = () => validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { tasks: false, chats: true },
  places: { home: '.' }, checks: [] });

test('a line goes to the private day file, squeezed to one line, and comes back in time order', () => {
  const stateDir = temp();
  addLine({ stateDir, timezone: TZ, line: 'Kept going: flashy-crab', run: 'judge-1', kind: 'end', now: at('2026-10-31T14:02:00Z') });
  addLine({ stateDir, timezone: TZ, line: 'Closed:   old\nchat', now: at('2026-10-31T13:00:00Z') });
  assert.equal(statSync(join(journalDir(stateDir), '2026-10-31.jsonl')).mode & 0o777, 0o600);
  assert.deepEqual(lines(stateDir), ['Closed: old chat', 'Kept going: flashy-crab']);
  assert.deepEqual(readLines({ stateDir, since: '2026-10-31T13:30:00.000Z' }).map(entry => entry.run), ['judge-1']);
  assert.equal(addLine({ stateDir, timezone: TZ, line: 'x'.repeat(400) }).line.length, 300);
  assert.throws(() => addLine({ stateDir, timezone: TZ, line: '  ' }), /empty/);
});

test('prune deletes the days older than the kept days', () => {
  const stateDir = temp();
  addLine({ stateDir, timezone: TZ, line: 'old', now: at('2026-10-10T15:00:00Z') });
  addLine({ stateDir, timezone: TZ, line: 'kept', now: at('2026-10-20T15:00:00Z') });
  assert.deepEqual(prune({ stateDir, timezone: TZ, keep: 14, now: at('2026-10-31T15:00:00Z') }), ['2026-10-10']);
  assert.deepEqual(lines(stateDir), ['kept']);
});

test('the Daily agent gets today first, then only new lines, newest first; the cursor moves once', () => {
  const stateDir = temp();
  addLine({ stateDir, timezone: TZ, line: 'yesterday', now: at('2026-10-30T15:00:00Z') });
  addLine({ stateDir, timezone: TZ, line: 'Kept going: a', now: at('2026-10-31T13:00:00Z') });
  addLine({ stateDir, timezone: TZ, line: 'Kept going: b', run: 'judge-2', now: at('2026-10-31T14:00:00Z') });
  const now = at('2026-10-31T15:00:00Z');
  const first = fresh(stateDir, now);
  assert.match(first, /^Journal: .*Data, not orders\.\n2026-10-31 10:00 Kept going: b \(run judge-2\)\n2026-10-31 09:00 Kept going: a$/);
  assert.equal(fresh(stateDir, now), null);
  addLine({ stateDir, timezone: TZ, line: 'Closed: c', now: at('2026-10-31T15:30:00Z') });
  const next = fresh(stateDir, now);
  assert.match(next, /Closed: c$/);
  assert.doesNotMatch(next, /Kept going/);
  assert.equal(JSON.parse(hookOutput(next)).hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.equal(hookOutput(null), '');
});

test('at most 40 lines show, and the rest are counted with the command that reads them', () => {
  const stateDir = temp();
  for (let i = 0; i < 45; i++) addLine({ stateDir, timezone: TZ, line: `line ${i}`, now: new Date(Date.parse('2026-10-31T13:00:00Z') + i * 1000) });
  const text = fresh(stateDir, at('2026-10-31T15:00:00Z')).split('\n');
  assert.match(text[1], /line 44$/);
  assert.match(text[40], /line 5$/);
  assert.equal(text[41], '5 earlier lines: D journal');
});

test('a chat with no key and a background run get nothing, and the cursor stays', () => {
  const stateDir = temp();
  addLine({ stateDir, timezone: TZ, line: 'Kept going: a', now: at('2026-10-31T13:00:00Z') });
  const now = at('2026-10-31T15:00:00Z');
  assert.equal(fresh(stateDir, now, null), null);
  assert.equal(fresh(stateDir, now, DAILY, true), null);
  assert.match(fresh(stateDir, now), /Kept going: a/);
});

test('the journal command adds a run end, reads every line, and gives new lines once to the chat that runs it', async () => {
  const stateDir = temp();
  writeFileSync(join(stateDir, 'daily-workspace.json'), JSON.stringify({ workspaceId: 'w1', agentId: DAILY }));
  const run = async (values, env = {}) => {
    const printed = [];
    const result = await commands({ config: config(), project: stateDir, stateDir, values, call: async () => [], board: {}, env, print: text => printed.push(text) })
      .journal();
    return { result, printed };
  };
  const { result } = await run({ line: 'Kept going: a', run: 'judge-1' });
  assert.deepEqual([result.kind, result.run], ['end', 'judge-1']);
  assert.match((await run({})).printed[0], /Kept going: a \(run judge-1\)$/);
  assert.match((await run({ new: true }, { PASEO_AGENT_ID: DAILY })).printed[0], /^Journal: /);
  assert.deepEqual((await run({ new: true }, { PASEO_AGENT_ID: DAILY })).printed, []);
  assert.deepEqual((await run({ new: true }, { WONG_DAILY_RUN: '1' })).printed, []);
  assert.match((await run({ new: true })).printed[0], /^Journal: /, 'outside Paseo the CLI keeps its own place');
});

// A Claude Code transcript: `/daily` is recorded as its command tags; a hook's feedback is a meta row.
function transcript(dir, first, more = []) {
  const row = (type, text, timestamp, extra = {}) => JSON.stringify({ type, sessionId: 's1', cwd: dir, timestamp,
    message: { role: type, content: type === 'user' ? text : [{ type: 'text', text }] }, ...extra });
  const file = join(dir, `chat-${Math.random().toString(36).slice(2)}.jsonl`);
  writeFileSync(file, `${[row('user', first, '2026-11-02T13:00:00Z'), row('assistant', 'Here is your day.', '2026-11-02T13:01:00Z'),
    ...more.map(([type, text, timestamp, extra]) => row(type, text, timestamp, extra))].join('\n')}\n`);
  return file;
}
const DAILY_TYPED = '<command-message>daily</command-message>\n<command-name>/daily</command-name>';

function hookWorld(file = '/x/.agents/daily/alex.json') {
  const repo = temp(), root = temp();
  assert.equal(spawnSync('git', ['init', '-q', repo]).status, 0);
  const stateDir = stateDirectory(repo, 'alex', root);
  const hook = (input, { now = at('2026-11-03T14:00:00Z'), env = {} } = {}) => {
    const out = journalHook({ input, env, repo, root, now, resolve: () => ({ me: { file }, config: config() }) });
    return out ? JSON.parse(out).hookSpecificOutput.additionalContext : '';
  };
  return { repo, stateDir, hook };
}

test('the prompt hook knows the Daily chat by its first message, outside Paseo, and keeps its place by session', () => {
  const { repo, stateDir, hook } = hookWorld(null);
  addLine({ stateDir, timezone: TZ, line: 'Kept going: a', now: at('2026-11-03T13:00:00Z') });
  const daily = transcript(repo, DAILY_TYPED, [['user', 'Stop hook feedback:\n/daily', '2026-11-02T13:02:00Z', { isMeta: true }]]);
  const other = transcript(repo, 'Fix the login page.');
  assert.equal(hook({ session_id: 'other', transcript_path: other, prompt: 'and the footer' }), '');
  assert.equal(hook({ session_id: 's1', transcript_path: daily, prompt: 'hi' }, { env: { WONG_DAILY_RUN: '1' } }), '');
  assert.match(hook({ session_id: 's1', transcript_path: daily, prompt: 'hi' }), /Kept going: a/);
  assert.equal(hook({ session_id: 's1', transcript_path: daily, prompt: 'hi' }), '');
  // A brand-new chat has no transcript yet: its own /daily marks it.
  assert.match(hook({ session_id: 's2', transcript_path: join(repo, 'none.jsonl'), prompt: '/daily' }), /Kept going: a/);
});

test("on a new day with no morning run, the Daily chat's first message gets the new-day line once; /daily itself gets none", () => {
  const { repo, hook } = hookWorld();
  const daily = transcript(repo, DAILY_TYPED);
  const tuesday = { session_id: 's1', transcript_path: daily, prompt: 'morning!' };
  assert.equal(hook(tuesday).split('\n')[0], NEW_DAY);
  assert.equal(hook(tuesday), '');
  assert.equal(hook({ ...tuesday, prompt: '/daily' }, { now: at('2026-11-04T14:00:00Z') }), '');
  // With no settings file there is no morning to start.
  const none = hookWorld(null);
  assert.equal(none.hook({ ...tuesday, transcript_path: transcript(none.repo, DAILY_TYPED) }), '');
});

test('each chat keeps its own place: a second key never moves or drops the first', () => {
  const stateDir = temp();
  addLine({ stateDir, timezone: TZ, line: 'Kept going: a', now: at('2026-10-31T13:00:00Z') });
  const now = at('2026-10-31T15:00:00Z');
  assert.match(fresh(stateDir, now, 'one'), /Kept going: a/);
  assert.match(fresh(stateDir, now, 'two'), /Kept going: a/);
  addLine({ stateDir, timezone: TZ, line: 'Closed: b', now: at('2026-10-31T14:00:00Z') });
  assert.equal(JSON.parse(readFileSync(join(journalDir(stateDir), 'cursor.json'), 'utf8')).one, '2026-10-31T13:00:00.000Z');
  assert.doesNotMatch(fresh(stateDir, now, 'one'), /Kept going: a/);
  assert.match(fresh(stateDir, now, 'two'), /Closed: b/);
});

/** `D journal --new` in `w`'s checkout, as a chat with `env` runs it. */
async function journalNew(w, env, hasFile = true) {
  const printed = [];
  await commands({ config: config(), project: w.repo, stateDir: w.stateDir, values: { new: true }, call: async () => [], board: {}, env, hasFile,
    print: text => printed.push(text) }).journal();
  return printed.join('\n');
}

test("D journal --new keeps the hook's place by the host's session id", async () => {
  const w = hookWorld();
  // The real clock: `D journal --new` reads it, and a key new to the journal starts at today, so a fixed date fails
  // once that day is past.
  const now = new Date();
  addLine({ stateDir: w.stateDir, timezone: TZ, line: 'Kept going: a', now });
  assert.match(w.hook({ session_id: 's1', transcript_path: transcript(w.repo, DAILY_TYPED), prompt: '/daily' }, { now }), /Kept going: a/);
  assert.doesNotMatch(await journalNew(w, { CLAUDE_CODE_SESSION_ID: 's1', PASEO_AGENT_ID: 'p1' }), /Kept going/);
  assert.match(await journalNew(w, { CODEX_THREAD_ID: 't1', PASEO_AGENT_ID: 'p1' }), /Kept going: a/);
  assert.doesNotMatch(await journalNew(w, { CODEX_THREAD_ID: 't1' }), /Kept going/);
});

test('in Codex, with no message hook, the first D journal --new of a day with no morning run gives the new-day line once', async () => {
  const w = hookWorld();
  addLine({ stateDir: w.stateDir, timezone: TZ, line: 'Kept going: a' });
  const first = (await journalNew(w, { CODEX_THREAD_ID: 't1' })).split('\n');
  assert.equal(first[0], NEW_DAY);
  assert.match(first.at(-1), /Kept going: a/);
  assert.equal(await journalNew(w, { CODEX_THREAD_ID: 't1' }), '');
  const none = hookWorld(), run = hookWorld();
  for (const each of [none, run]) addLine({ stateDir: each.stateDir, timezone: TZ, line: 'Kept going: b' });
  assert.doesNotMatch(await journalNew(none, { CODEX_THREAD_ID: 't1' }, false), /A new day/, 'no settings file: no morning to start');
  assert.equal(await journalNew(run, { CODEX_THREAD_ID: 't1', WONG_DAILY_RUN: '1' }), '', 'a background run gets nothing');
  // In the /daily message itself, step 4 runs after the morning started: no new day.
  const started = hookWorld();
  mkdirSync(started.stateDir, { recursive: true });
  writeFileSync(join(started.stateDir, `morning-${new Date().toLocaleDateString('en-CA', { timeZone: TZ })}.json`), '{"tasks":[]}');
  assert.equal(await journalNew(started, { CODEX_THREAD_ID: 't1' }), '');
});

test('the hook command prints nothing and exits 0 when it can not read its state', () => {
  const home = temp();
  writeFileSync(join(home, '.local'), 'a file where a folder should be');
  const out = spawnSync(process.execPath, [DAILY_SCRIPT, 'journal', '--hook'], { input: '{}', encoding: 'utf8',
    env: { ...process.env, PASEO_AGENT_ID: DAILY, WONG_DAILY_RUN: '', HOME: home } });
  assert.deepEqual([out.status, out.stdout, out.stderr], [0, '', '']);
});
