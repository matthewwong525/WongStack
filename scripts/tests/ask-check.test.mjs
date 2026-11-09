import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { endsWithChoices, LINKS_REASON, linksDecision, readTurn, REASON, REMINDER, stopDecision, turnLinks, waitForCall } from '../../.agents/skills/explore/scripts/ask-check.mjs';

const cli = new URL('../../.agents/skills/explore/scripts/ask-check.mjs', import.meta.url).pathname;

// Invented replies in the shapes the backtest found: typed choices, and endings that are not choices.
const REPORT = 'The preview is up and the sign-up page works.\n\n[👉 Tap here to see the preview](https://example.invalid/apps/demo/)';
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

test('Claude Code runs the check at each stop, the link check before each question, and the reminder after compaction; Codex runs none', () => {
  const read = file => JSON.parse(readFileSync(new URL(`../../.agents/${file}`, import.meta.url), 'utf8')).hooks;
  const commands = entries => entries.flatMap(entry => entry.hooks.map(hook => hook.command));
  const claude = read('settings.json');
  assert.ok(commands(claude.Stop).some(command => command.endsWith('/explore/scripts/ask-check.mjs" stop')));
  const compact = claude.SessionStart.filter(entry => entry.matcher === 'compact');
  assert.ok(commands(compact).some(command => command.endsWith('/explore/scripts/ask-check.mjs" reminder')));
  const asks = claude.PreToolUse.filter(entry => entry.matcher === 'AskUserQuestion');
  assert.ok(commands(asks).some(command => command.endsWith('/explore/scripts/ask-check.mjs" links')));
  assert.doesNotMatch(JSON.stringify(read('hooks.json')), /ask-check/);
});

// The link check: a question that leaves out a link the turn showed is sent back once.
const PLAN = 'https://admin.example.invalid/r/abc';
const FILE = '/home/me/repo/openspec/changes/demo/review.html';
const ask = (...questions) => ({ type: 'tool_use', id: 'toolu_2', name: 'AskUserQuestion', input: { questions: questions.map(question => ({ question, options: [] })) } });
const printed = (content, id = 'toolu_1') => ({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content }] } });
const asking = (file, ...questions) => ({ tool_name: 'AskUserQuestion', transcript_path: file, tool_input: { questions: questions.map(question => ({ question, options: [] })) } });

test('turnLinks reads chat addresses and Tap here lines from the turn, not before it', () => {
  const rows = [
    human('first'), said(text('Old: https://old.example.invalid/x')),
    human('plan it'),
    said(text(`[👉 Tap here to see the plan](${PLAN}).`), tool('Bash')),
    printed(`Built.\n[👉 Tap here to see the plan](<${FILE.replace('demo', 'my demo')}>)\n\nReview the plan.`),
    printed([{ type: 'text', text: '[👉 Tap here to see the preview](https://preview.example.invalid/settings)' }]),
    printed('Line 63: print *👉 Tap here to see the plan* and the link as [one chat line](#end-every-reply-with-the-next-step)'),
    said(text('See **https://pr.example.invalid/pull/9**, and (https://docs.example.invalid/a_b).')),
  ];
  assert.deepEqual(turnLinks(rows), {
    links: [PLAN, FILE.replace('demo', 'my demo'), 'https://preview.example.invalid/settings', 'https://pr.example.invalid/pull/9', 'https://docs.example.invalid/a_b'],
    sentBack: false,
  });
});

test('turnLinks skips an indented example line and reads a Markdown link whose text is its address', () => {
  const rows = [human('plan it'), printed('1. The link shows.\n\n   [👉 Tap here to see the plan](https://sample.example.invalid/r/x)'), said(text(`Opened [${PLAN}](${PLAN}).`))];
  assert.deepEqual(turnLinks(rows), { links: [PLAN], sentBack: false });
});

test('turnLinks starts again after an answered question, not after a send-back', () => {
  const answered = printed('Your questions have been answered: "Merge it?"="Merge"', 'toolu_2');
  const denied = printed(`${LINKS_REASON}\n${PLAN}`, 'toolu_2');
  assert.deepEqual(turnLinks([human('go'), said(text(PLAN), ask('Merge it?')), answered, said(text('Merged.'))]), { links: [], sentBack: false });
  assert.deepEqual(turnLinks([human('go'), said(text(PLAN), ask('Merge it?')), denied]), { links: [PLAN], sentBack: true });
});

function links(input, env = {}) {
  const run = spawnSync(process.execPath, [cli, 'links'], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', env: { ...process.env, WONG_MEMORY_RUN: '', ...env } });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

test('links sends back a question that leaves out a turn link, naming it', t => {
  const file = transcript(t, [human('plan it'), said(text(`The plan is ready.\n\n[👉 Tap here to see the plan](${PLAN})`), ask('Build it now?'))]);
  assert.deepEqual(JSON.parse(links(asking(file, 'Build it now?'))), {
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${LINKS_REASON}\n${PLAN}` },
  });
});

test('links counts a Tap here line a tool printed', t => {
  const file = transcript(t, [human('plan it'), said(tool('Bash')), printed(`[👉 Tap here to see the plan](${FILE})\n\nReview the plan.`), said(ask('Build it?'))]);
  const decision = linksDecision(asking(file, 'Build it?'), {});
  assert.equal(decision.hookSpecificOutput.permissionDecisionReason, `${LINKS_REASON}\n${FILE}`);
  assert.equal(linksDecision(asking(file, `Look over the plan, then choose:\n${FILE}`), {}), null);
});

test('links lets the question go out', async t => {
  const shown = [human('plan it'), said(text(`[👉 Tap here to see the plan](${PLAN})\nAnd https://pr.example.invalid/pull/9`))];
  const cases = {
    'a question holding every link': [asking(transcript(t, shown), `Look over the plan: ${PLAN}`, 'Publish https://pr.example.invalid/pull/9?')],
    'a turn with no link': [asking(transcript(t, [human('go'), said(text('Done.'))]), 'Publish it?')],
    'a turn already sent back': [asking(transcript(t, [...shown, said(ask('Build it?')), printed([{ type: 'text', text: `${LINKS_REASON}\n${PLAN}` }], 'toolu_2')]), 'Build it?')],
    'a link from before the person spoke': [asking(transcript(t, [...shown, human('build it'), said(text('Built.'))]), 'Publish it?')],
    'a background memory run': [asking(transcript(t, shown), 'Build it?'), { WONG_MEMORY_RUN: '1' }],
    'another tool': [{ ...asking(transcript(t, shown), 'Build it?'), tool_name: 'Bash' }],
    'no questions': [{ ...asking(transcript(t, shown)), tool_input: {} }],
    'an unreadable transcript': [asking(path.join(tmpdir(), 'wong-test-ask-check-missing.jsonl'), 'Build it?')],
    'no transcript path': [{ tool_input: { questions: [{ question: 'Build it?' }] } }],
    'no input': ['not json'],
  };
  for (const [name, [input, env]] of Object.entries(cases)) {
    await t.test(name, () => assert.equal(links(input, env), ''));
  }
});

test('waitForCall waits for the call\'s own row, which Claude Code writes after the hook starts', t => {
  const file = transcript(t, [human('go'), said(text('Done.'))]);
  assert.equal(waitForCall(file, 'toolu_9', 100), false);
  writeFileSync(file, `${readFileSync(file, 'utf8')}${JSON.stringify(said({ ...ask('Go?'), id: 'toolu_9' }))}\n`);
  assert.equal(waitForCall(file, 'toolu_9', 100), true);
  assert.equal(waitForCall(path.join(tmpdir(), 'wong-test-ask-check-missing.jsonl'), 'toolu_9', 100), false);
});

test('the reminder names the link rule', () => assert.match(REMINDER, /full link in its text/));
