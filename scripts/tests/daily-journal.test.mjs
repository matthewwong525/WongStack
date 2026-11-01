import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commands, journalHook, stateDirectory } from '../../.agents/skills/daily/scripts/daily.mjs';
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
const fresh = (stateDir, now, agentId = DAILY, run = false) => newLines({ stateDir, timezone: TZ, agentId, dailyId: DAILY, run, now });
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

test('another chat, a chat with no id, and a background run get nothing, and the cursor stays', () => {
  const stateDir = temp();
  addLine({ stateDir, timezone: TZ, line: 'Kept going: a', now: at('2026-10-31T13:00:00Z') });
  const now = at('2026-10-31T15:00:00Z');
  assert.equal(fresh(stateDir, now, 'other'), null);
  assert.equal(fresh(stateDir, now, null), null);
  assert.equal(fresh(stateDir, now, DAILY, true), null);
  assert.match(fresh(stateDir, now), /Kept going: a/);
});

test('the journal command adds a run end, reads every line, and gives new lines only to the Daily chat', async () => {
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
  assert.deepEqual((await run({ new: true }, { PASEO_AGENT_ID: 'other' })).printed, []);
  assert.match((await run({ new: true }, { PASEO_AGENT_ID: DAILY })).printed[0], /^Journal: /);
});

test('the prompt hook finds the Daily chat by its id across the people of this checkout', () => {
  const repo = temp(), root = temp();
  assert.equal(spawnSync('git', ['init', '-q', repo]).status, 0);
  mkdirSync(join(repo, '.agents/daily'), { recursive: true });
  writeFileSync(join(repo, '.agents/daily/alex.json'), JSON.stringify(config()));
  const stateDir = stateDirectory(repo, 'alex', root);
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(stateDirectory(repo, 'sam', root), { recursive: true });
  writeFileSync(join(stateDir, 'daily-workspace.json'), JSON.stringify({ workspaceId: 'w1', agentId: DAILY }));
  addLine({ stateDir, timezone: TZ, line: 'Kept going: a' });
  const hook = env => journalHook({ env, repo, root });
  assert.equal(hook({ PASEO_AGENT_ID: 'other' }), '');
  assert.equal(hook({ PASEO_AGENT_ID: DAILY, WONG_DAILY_RUN: '1' }), '');
  assert.match(JSON.parse(hook({ PASEO_AGENT_ID: DAILY })).hookSpecificOutput.additionalContext, /Kept going: a/);
  assert.equal(hook({ PASEO_AGENT_ID: DAILY }), '');
});

test('the hook command prints nothing and exits 0 when it can not read its state', () => {
  const home = temp();
  writeFileSync(join(home, '.local'), 'a file where a folder should be');
  const out = spawnSync(process.execPath, [DAILY_SCRIPT, 'journal', '--hook'], { input: '{}', encoding: 'utf8',
    env: { ...process.env, PASEO_AGENT_ID: DAILY, WONG_DAILY_RUN: '', HOME: home } });
  assert.deepEqual([out.status, out.stdout, out.stderr], [0, '', '']);
});
