import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { endsWithChoices, readTurn, REASON, REMINDER, stopDecision } from '../../.agents/skills/explore/scripts/ask-check.mjs';

const cli = new URL('../../.agents/skills/explore/scripts/ask-check.mjs', import.meta.url).pathname;

// Invented replies in the shapes the backtest found: typed choices, and endings that are not choices.
const REPORT = 'The preview is up and the sign-up page works.\n\nClick here to see the preview: https://example.invalid/apps/demo/';
const SLIPS = {
  'a list after What next?': `${REPORT}\n\n**What next?**\n\n1. Publish it (Recommended)\n2. Change it more\n3. Save for later`,
  'a list after Next step:': `${REPORT}\n\n## Next step\n\n- Publish it *(Recommended)*: it goes live\n- Close this workspace`,
  'a plain Which do you want? list': `Two ways to fix it:\n\nWhich do you want?\n- Keep the old button and add a link\n- Replace the button`,
};
const REPORTS = {
  'a What changed report': `${REPORT}\n\n**What changed**\n- The form checks the email first\n- A wrong code shows a red line\n- The button waits while it sends`,
  'a plain bullet report': 'Done.\n\n- Three pages updated\n- Checks pass\n- The preview is live',
  'a question over five items': 'Which pages changed?\n- Home\n- Settings\n- Access\n- Keys\n- Help',
  'a list and nothing above it': '- Publish it (Recommended)\n- Save for later',
  'one item': 'What next?\n- Publish it',
  'no text': '',
};

for (const [name, text] of Object.entries(SLIPS)) {
  test(`flags ${name}`, () => assert.equal(endsWithChoices(text), true));
}
for (const [name, text] of Object.entries(REPORTS)) {
  test(`spares ${name}`, () => assert.equal(endsWithChoices(text), false));
}

const human = text => ({ type: 'user', message: { role: 'user', content: text } });
const said = (...content) => ({ type: 'assistant', message: { role: 'assistant', content } });
const text = value => ({ type: 'text', text: value });
const tool = name => ({ type: 'tool_use', id: 'toolu_1', name, input: {} });
const result = { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] } };
const slip = SLIPS['a list after What next?'];

test('the turn starts after the last person message, past compaction and meta rows', () => {
  const rows = [
    human('first ask'), said(tool('AskUserQuestion')), result,
    human('build it'), said(text('Working.'), tool('Bash')), result,
    { type: 'user', isCompactSummary: true, message: { role: 'user', content: 'Summary of the chat so far' } },
    { type: 'user', isMeta: true, message: { role: 'user', content: [text('caveat')] } },
    said({ type: 'thinking', thinking: 'done' }, text(slip)),
  ];
  assert.deepEqual(readTurn(rows), { asked: false, text: slip });
});

test('a turn that ends on a tool call has no closing text', () => {
  assert.deepEqual(readTurn([human('go'), said(text(slip), tool('Bash'))]), { asked: false, text: null });
});

function transcript(t, rows) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-ask-check-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'session.jsonl');
  writeFileSync(file, `${rows.map(row => JSON.stringify(row)).join('\n')}\nnot json\n`);
  return file;
}

function stop(input, env = {}) {
  const run = spawnSync(process.execPath, [cli, 'stop'], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', env: { ...process.env, WONG_MEMORY_RUN: '', ...env } });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

test('stop sends a typed list back once with the reason', t => {
  const file = transcript(t, [human('build it'), said(text(slip))]);
  assert.deepEqual(JSON.parse(stop({ transcript_path: file, stop_hook_active: false })), { decision: 'block', reason: REASON });
});

test('stop prefers the host\'s last message over the transcript', t => {
  const file = transcript(t, [human('build it'), said(text('Working.'), tool('Bash'))]);
  assert.match(stop({ transcript_path: file, last_assistant_message: slip }), /"block"/);
  const later = transcript(t, [human('build it'), said(text(slip))]);
  assert.equal(stop({ transcript_path: later, last_assistant_message: REPORTS['a plain bullet report'] }), '');
});

test('stop lets the turn end', async t => {
  const typed = transcript(t, [human('build it'), said(text(slip))]);
  const cases = {
    'a turn that called AskUserQuestion': [{ transcript_path: transcript(t, [human('go'), said(tool('AskUserQuestion')), result, said(text(slip))]) }],
    'a report': [{ transcript_path: transcript(t, [human('go'), said(text(REPORTS['a What changed report']))]) }],
    'a second stop in a row': [{ transcript_path: typed, stop_hook_active: true }],
    'a background memory run': [{ transcript_path: typed }, { WONG_MEMORY_RUN: '1' }],
    'an unreadable transcript': [{ transcript_path: path.join(tmpdir(), 'wong-test-ask-check-missing.jsonl') }],
    'no transcript path': [{}],
    'no input': ['not json'],
  };
  for (const [name, [input, env]] of Object.entries(cases)) {
    await t.test(name, () => assert.equal(stop(input, env), ''));
  }
});

test('stopDecision reads the environment it is given', () => {
  assert.equal(stopDecision({ transcript_path: '/nonexistent' }, {}), null);
  assert.equal(stopDecision(null, {}), null);
});

test('reminder prints the one ask line, naming the tool and the rule\'s page', () => {
  const run = spawnSync(process.execPath, [cli, 'reminder'], { input: '{}', encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, `${REMINDER}\n`);
  assert.match(REMINDER, /AskUserQuestion/);
  assert.match(REMINDER, /asking-the-user\.md#which-tool-carries-it$/);
});

test('a missing or unknown mode is a usage error', () => {
  for (const args of [[], ['ask'], ['stop', 'reminder']]) {
    const run = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(run.status, 2, `${args}: ${run.stderr}`);
    assert.match(run.stderr, /usage/);
  }
});

test('Claude Code runs the check at each stop and the reminder after compaction; Codex runs neither', () => {
  const read = file => JSON.parse(readFileSync(new URL(`../../.agents/${file}`, import.meta.url), 'utf8')).hooks;
  const commands = entries => entries.flatMap(entry => entry.hooks.map(hook => hook.command));
  const claude = read('settings.json');
  assert.ok(commands(claude.Stop).some(command => command.endsWith('/explore/scripts/ask-check.mjs" stop')));
  const compact = claude.SessionStart.filter(entry => entry.matcher === 'compact');
  assert.ok(commands(compact).some(command => command.endsWith('/explore/scripts/ask-check.mjs" reminder')));
  assert.doesNotMatch(JSON.stringify(read('hooks.json')), /ask-check/);
});
