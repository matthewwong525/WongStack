import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { endsWithChoices, endsWithQuestion, LINKS_REASON, linksDecision, readTurn, REASON, REMINDER, REVIEW_REASON, reviewBlocks, stopDecision, turnLinks, turnReview, waitForCall } from '../../.agents/loop/ask-check.mjs';

const cli = new URL('../../.agents/loop/ask-check.mjs', import.meta.url).pathname;

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

// A lone typed question, and endings that ask nothing.
const QUESTIONS = {
  'Close this chat?': `${REPORT}\n\n**Close this chat?**`,
  'a question mid-paragraph': `${REPORT}\n\nShould I keep the old page? I can also remove it.`,
  'a question above a tap-link line': 'The plan changed.\n\nOpen it and say if the new order works?\n[👉 Tap here to see the plan](https://example.invalid/plan)',
};
const PLAN_END = '[👉 Tap here to see the plan](https://example.invalid/plan)\n\nThe sign-up page checks the email first.\n\nReview the plan, then tap Build it or Build and publish on its page.';
const NO_QUESTION = {
  'a report with no question': REPORTS['a What changed report'],
  'a finished plan\'s ending': PLAN_END,
  'a question earlier in the reply': 'Why did it fail? The key was old.\n\nI replaced it, and the checks pass.',
  'a link with a query': 'It is live at https://example.invalid/page?tab=1',
};

for (const [name, value] of Object.entries(QUESTIONS)) {
  test(`flags ${name} as a question`, () => assert.equal(endsWithQuestion(value), true));
}
for (const [name, value] of Object.entries(NO_QUESTION)) {
  test(`spares ${name} as a question`, () => assert.equal(endsWithQuestion(value), false));
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

test('stop sends a lone typed question back once with the reason', t => {
  const file = transcript(t, [human('build it'), said(text(QUESTIONS['Close this chat?']))]);
  assert.deepEqual(JSON.parse(stop({ transcript_path: file })), { decision: 'block', reason: REASON });
  assert.equal(stop({ transcript_path: file, stop_hook_active: true }), '');
  const asked = transcript(t, [human('go'), said(tool('AskUserQuestion')), result, said(text(QUESTIONS['Close this chat?']))]);
  assert.equal(stop({ transcript_path: asked }), '');
});

test('stop lets a finished plan end', t => {
  assert.equal(stop({ transcript_path: transcript(t, [human('plan it'), said(text(PLAN_END))]) }), '');
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
  assert.ok(commands(claude.Stop).some(command => command.endsWith('/.claude/loop/ask-check.mjs" stop')));
  const compact = claude.SessionStart.filter(entry => entry.matcher === 'compact');
  assert.ok(commands(compact).some(command => command.endsWith('/.claude/loop/ask-check.mjs" reminder')));
  const asks = claude.PreToolUse.filter(entry => entry.matcher === 'AskUserQuestion');
  assert.ok(commands(asks).some(command => command.endsWith('/.claude/loop/ask-check.mjs" links')));
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

test('the reminder names the link rule and the review rule', () => {
  assert.match(REMINDER, /full link in its text/);
  assert.match(REMINDER, /what the person must read to answer/);
});

test('the stop reason asks for the review in the question, not a bare question', () => {
  assert.match(REASON, /Put in the question what they must read to answer\./);
  assert.doesNotMatch(REASON, /Don't repeat the report/);
});

// The review check: a question holding none of the turn's drafts, tables or quotes is sent back once; a list goes out.
const DRAFT = 'Here is the reply:\n\n```text\nHi Dana,\nYour kit ships tomorrow from Markham, tracked by email.\nThanks, Carol\n```';
const TABLE = 'Counts:\n\n| Kit | Count |\n|---|---|\n| Snowman Cocoa | 12 |\n| Under the Sea | 4 |';
const card = (question, options = []) => ({ question, options });
const asks = (file, ...items) => ({ tool_name: 'AskUserQuestion', transcript_path: file, tool_input: { questions: items } });

test('reviewBlocks keeps fences, tables and quotes, and drops lists, pictures, tap lines and plain sentences', () => {
  assert.deepEqual(reviewBlocks(DRAFT), ['Your kit ships tomorrow from Markham, tracked by email.']);
  assert.deepEqual(reviewBlocks(TABLE), ['Snowman Cocoa | 12']);
  assert.deepEqual(reviewBlocks('> Hi Dana,\n> Your kit ships **tomorrow**.'), ['Your kit ships tomorrow.']);
  assert.deepEqual(reviewBlocks('Changes:\n- The form checks the email\n- A wrong code shows a red line\n- The button waits'), []);
  assert.deepEqual(reviewBlocks('```text\nPlan ──► kit demand ──► shift hours\n```'), []);
  assert.deepEqual(reviewBlocks('```mermaid\nflowchart TD\n  A["Something to review"] --> B\n```'), []);
  assert.deepEqual(reviewBlocks(`The preview is up and works.\n\n[👉 Tap here to see the preview](${PLAN})`), []);
  assert.deepEqual(reviewBlocks('> one quote line'), []);
  assert.deepEqual(reviewBlocks(`\`\`\`\n${'word '.repeat(20)}\n\`\`\``), ['word '.repeat(12)]);
});

test('turnReview reads assistant text since the person last answered, not tool results', () => {
  const answered = printed('Your questions have been answered: "Send it?"="Send it"', 'toolu_2');
  assert.deepEqual(turnReview([human('go'), said(text(TABLE), ask('Send it?')), answered, said(text(DRAFT))]), {
    blocks: ['Your kit ships tomorrow from Markham, tracked by email.'],
    sentBack: false,
  });
  assert.deepEqual(turnReview([human('go'), said(tool('Bash')), printed(TABLE)]), { blocks: [], sentBack: false });
  assert.equal(turnReview([human('go'), said(text(DRAFT), ask('Send it?')), printed(`${REVIEW_REASON}\nHi`, 'toolu_2')]).sentBack, true);
});

test('review sends back a bare card under a draft once, naming how the draft begins', t => {
  const file = transcript(t, [human('answer Dana'), said(text(DRAFT), ask('Send this reply to Dana?'))]);
  assert.deepEqual(JSON.parse(links(asks(file, card('Send this reply to Dana?')))), {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `${REVIEW_REASON}\nYour kit ships tomorrow from Markham, tracked by email.`,
    },
  });
  const again = transcript(t, [human('answer Dana'), said(text(DRAFT), ask('Send this reply to Dana?')), printed(`${REVIEW_REASON}\nYour kit`, 'toolu_2'), said(ask('Send it?'))]);
  assert.equal(linksDecision(asks(again, card('Send this reply to Dana?')), {}), null);
});

test('the link check runs first and shares the one send-back', t => {
  const file = transcript(t, [human('plan it'), said(text(`${TABLE}\n\n[👉 Tap here to see the plan](${PLAN})`))]);
  assert.match(linksDecision(asks(file, card('Build it?')), {}).hookSpecificOutput.permissionDecisionReason, /^This question leaves out a link/);
  const after = transcript(t, [human('plan it'), said(text(TABLE), ask('Build it?')), printed(`${LINKS_REASON}\n${PLAN}`, 'toolu_2')]);
  assert.equal(linksDecision(asks(after, card('Build it?')), {}), null);
});

test('review lets the question go out', async t => {
  const draft = [human('answer Dana'), said(text(DRAFT))];
  const cases = {
    'the same draft in the question': [transcript(t, draft), card('Send this reply to Dana?\n\nHi Dana,\nYour kit ships tomorrow from Markham, tracked by email.\nThanks, Carol')],
    'the draft in an option preview': [transcript(t, draft), card('Send it?', [{ label: 'Send it', preview: 'Your kit ships tomorrow from Markham, tracked by email.' }])],
    'a table row reformatted in the question': [transcript(t, [human('count'), said(text(TABLE))]), card('Order more? Snowman Cocoa: 12; Under the Sea: 4.')],
    'a table row with an underscore name, word for word': [transcript(t, [human('count'), said(text('Counts:\n\n| Field | Value |\n|---|---|\n| order_count_total | 12 |'))]), card('Order more? order_count_total | 12')],
    'a page link in the question': [transcript(t, draft), card('The draft is long: https://admin.example.invalid/inbox/p/7. Send it?')],
    'a file path in the question': [transcript(t, draft), card('Read /home/me/repo/.scratch/draft.md, then: send it?')],
    'only plain sentences above': [transcript(t, [human('go'), said(text('Done. The preview is up.\n\nThe form now checks the email first.'))]), card('Publish it?')],
    'a list of changes above': [transcript(t, [human('go'), said(text('Done.\n\n- The form checks the email\n- A wrong code shows a red line\n- The button waits'))]), card('Publish it?')],
    'a question that offers to close the chat': [transcript(t, [human('count'), said(text(TABLE))]), card('The counts are saved. Close this chat?')],
    'a mermaid fence above': [transcript(t, [human('go'), said(text('```mermaid\nflowchart TD\n  A["Something to review"] --> B["Card"]\n```'))]), card('Plan it?')],
    'a draft only a tool printed': [transcript(t, [human('go'), said(tool('Bash')), printed(DRAFT)]), card('Send it?')],
    'a draft before the person answered': [transcript(t, [...draft, said(ask('Send it?')), printed('Your questions have been answered: "Send it?"="Send it"', 'toolu_2'), said(text('Sent.'))]), card('Publish it?')],
  };
  for (const [name, [file, item]] of Object.entries(cases)) {
    await t.test(name, () => assert.equal(linksDecision(asks(file, item), {}), null));
  }
});
