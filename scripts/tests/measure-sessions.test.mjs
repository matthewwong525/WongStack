import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { formatReport, loadSessions, measure, pagesRead, selectSessions } from '../measure-sessions.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../measure-sessions.mjs');
const fixtures = join(here, 'fixtures/measure-sessions');
const logs = { codex: [join(fixtures, 'codex')], claude: [join(fixtures, 'claude')] };
const repo = { folders: ['/work/repo'], repoUrl: 'https://github.com/team/repo' };

// The fixtures are made-up logs in the two tools' shapes. Every message in them carries this
// marker, so a test can tell that no message text reaches the report.
const MARKER = 'SECRET-PROMPT-TEXT';

const zero = { parentStepsDuringHelper: 0, helperWaits: 0, failedCheckLookups: 0, localCheckRuns: 0, pageReads: 0, pageReadShare: 0, repeatReads: 0, repeatShare: 0 };
const CLAUDE_HIGH = {
  ...zero, provider: 'claude', model: 'claude-x', effort: 'high', sessions: 1, helperSessions: 0, turns: 2, steps: 4, medianStepsPerTurn: 2, secondsPerStep: 25,
  commands: 3, pageReads: 2, pageReadShare: 0.67, repeatReads: 1, repeatShare: 0.5, parentStepsDuringHelper: 1, localCheckRuns: 1,
  verbs: { apply: { turns: 1, medianSteps: 4, medianSeconds: 100 }, none: { turns: 1, medianSteps: 0, medianSeconds: 5 } },
};
const CLAUDE_HELPER = {
  ...zero, provider: 'claude', model: 'claude-x', effort: 'unrecorded', sessions: 0, helperSessions: 1, turns: 1, steps: 1, medianStepsPerTurn: 1, secondsPerStep: 58,
  commands: 1, localCheckRuns: 1, verbs: { helper: { turns: 1, medianSteps: 1, medianSeconds: 58 } },
};
const CODEX_HIGH = {
  ...zero, provider: 'codex', model: 'model-a', effort: 'high', sessions: 1, helperSessions: 1, turns: 2, steps: 11, medianStepsPerTurn: 5.5, secondsPerStep: 15,
  commands: 9, pageReads: 5, pageReadShare: 0.56, repeatReads: 1, repeatShare: 0.2, parentStepsDuringHelper: 2, helperWaits: 1, failedCheckLookups: 1, localCheckRuns: 2,
  verbs: { helper: { turns: 1, medianSteps: 2, medianSeconds: 45 }, ship: { turns: 1, medianSteps: 9, medianSeconds: 120 } },
};
const CODEX_MEDIUM = {
  ...zero, provider: 'codex', model: 'model-a', effort: 'medium', sessions: 1, helperSessions: 0, turns: 2, steps: 5, medianStepsPerTurn: 2.5, secondsPerStep: 13.2,
  commands: 4, pageReads: 1, pageReadShare: 0.25, verbs: { none: { turns: 1, medianSteps: 2, medianSeconds: 6 }, save: { turns: 1, medianSteps: 3, medianSeconds: 60 } },
};

const count = options => measure(selectSessions(loadSessions(logs), options));

test('the fixtures yield known counts per model and thinking level', () => {
  assert.deepEqual(count(repo), [CLAUDE_HIGH, CLAUDE_HELPER, CODEX_HIGH, CODEX_MEDIUM]);
});

test('a session belongs to the repo by its working folder or its recorded origin address', () => {
  const sessions = loadSessions(logs);
  const ids = options => selectSessions(sessions, options).map(session => session.id.split('/').at(-1)).sort();
  assert.deepEqual(ids({ folders: ['/work/repo'] }), ['agent-a.jsonl', 'c1.jsonl', 'helper-1', 'parent-1']);
  assert.deepEqual(ids({ repoUrl: 'git@github.com:team/repo.git' }), ['helper-1', 'parent-1', 'parent-2']);
  assert.deepEqual(ids({ folders: ['/work'] }), ['agent-a.jsonl', 'c1.jsonl', 'helper-1', 'other-1', 'parent-1']);
  assert.deepEqual(ids({}), []);
  const everything = count({ all: true }).find(group => group.provider === 'codex' && group.effort === 'high');
  assert.deepEqual([everything.sessions, everything.turns, everything.steps, everything.secondsPerStep], [2, 3, 12, 14.6]);
});

test('--since and --until keep the turns that started inside the range', () => {
  assert.deepEqual(count({ ...repo, since: '2026-10-02' }), [CLAUDE_HIGH, CLAUDE_HELPER, CODEX_MEDIUM]);
  assert.deepEqual(count({ ...repo, until: '2026-10-01' }), [CODEX_HIGH]);
  assert.deepEqual(count({ ...repo, since: '2026-10-02', until: '2026-10-02' }), [CLAUDE_HIGH, CLAUDE_HELPER]);
  assert.deepEqual(count({ ...repo, since: '2027-01-01' }), []);
});

test('a page read needs a reading command and a page; the three skill folders are one', () => {
  assert.deepEqual(pagesRead('cat .claude/skills/save/SKILL.md .codex/skills/save/SKILL.md wiki/voice.md'), ['.agents/skills/save/SKILL.md', 'wiki/voice.md']);
  assert.deepEqual(pagesRead('cd app && sed -n 1,20p ../AGENTS.md'), ['AGENTS.md']);
  assert.deepEqual(pagesRead('git add wiki/voice.md'), [], 'staging a page is not reading it');
  assert.deepEqual(pagesRead('cat app/src/readme.md'), [], 'not a skill or wiki page');
});

test('the report carries counts only, never message or command text', () => {
  const args = ['--repo', '/work/repo', '--cwd', '/elsewhere/worktree', '--codex', logs.codex[0], '--claude', logs.claude[0]];
  const json = spawnSync(process.execPath, [script, ...args, '--json'], { encoding: 'utf8' });
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(JSON.parse(json.stdout), { since: null, until: null, groups: [CLAUDE_HIGH, CLAUDE_HELPER, CODEX_HIGH, CODEX_MEDIUM] });
  const text = spawnSync(process.execPath, [script, ...args, '--since', '2026-10-01', '--until', '2026-10-01'], { encoding: 'utf8' });
  assert.equal(text.status, 0, text.stderr);
  assert.equal(text.stdout, `${[
    'codex  model-a  thinking high: 1 chats, 1 helpers, 2 turns',
    '  steps 11 (median 5.5 per turn), 15 s per step',
    '  page reads 5 of 9 commands (56%), 20% of them repeats',
    '  parent steps during a helper 2, waits 1',
    '  failed-check lookups 1, local check runs 2',
    '  helper: 1 turns, median 2 steps, median 45 s',
    '  ship: 1 turns, median 9 steps, median 120 s',
  ].join('\n')}\n`);
  for (const output of [json.stdout, text.stdout]) assert.doesNotMatch(output, new RegExp(`${MARKER}|gh run view|the-change-loop|git commit`));
  assert.equal(formatReport([]), 'No session matched.');
  assert.equal(formatReport(count(repo)).split('\n\n').length, 4);
});

test('a bad date is a usage error, and a folder with no logs matches nothing', () => {
  assert.equal(spawnSync(process.execPath, [script, '--since', 'tomorrow'], { encoding: 'utf8' }).status, 2);
  const empty = spawnSync(process.execPath, [script, '--all-repos', '--codex', join(fixtures, 'absent'), '--claude', join(fixtures, 'absent')], { encoding: 'utf8' });
  assert.equal(empty.status, 0, empty.stderr);
  assert.equal(empty.stdout, 'No session matched.\n');
});
