// The build and review helpers' stop check: sent back once without a report; every other stop goes through.
// Transcript shapes follow live runs on Claude Code 2.1.287 and Codex 0.159.2.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { REASON, REVIEW_REASON, stopCheck } from '../../.agents/skills/apply/scripts/helper-stop-check.mjs';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/apply/scripts/helper-stop-check.mjs');
const BRIEF_PROMPT = 'hooks-for-repeat-mistakes\n\nRead `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/build-helper.md`, then build.';
const BLOCK = `${JSON.stringify({ decision: 'block', reason: REASON })}\n`;

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-helper-stop-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return (name, entries) => {
    const path = join(dir, name);
    writeFileSync(path, entries.map(entry => JSON.stringify(entry)).join('\n') + '\n');
    return path;
  };
}

// A Claude Code helper's own transcript: its prompt, a read, and its last words.
const claudeHelper = (prompt, last) => [
  { type: 'user', isSidechain: true, message: { role: 'user', content: prompt } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/.claude/skills/apply/references/build-helper.md' } }] } },
  { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'A short report: … `local checks: pass`' }] } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: last }] } },
];
const subagentStop = (path, last, extra = {}) => ({
  hook_event_name: 'SubagentStop', stop_hook_active: false, agent_type: 'general-purpose',
  transcript_path: '/home/main-chat.jsonl', agent_transcript_path: path, last_assistant_message: last, ...extra,
});

test('a build helper that stops with no report is sent back with the reason', t => {
  const write = scratch(t);
  const last = 'Started the checks; they run in the background.';
  assert.equal(stopCheck(subagentStop(write('a.jsonl', claudeHelper(BRIEF_PROMPT, last)), last)), BLOCK);
  assert.match(REASON, /wait for it to finish/);
  assert.match(REASON, /local checks:/);
});

test('a build helper that ends with its report stops', t => {
  const write = scratch(t);
  for (const last of [
    'Stop: complete.\nTasks 1.1–4.1 done.\nlocal checks: pass',
    'Stop: complete.\n- **local checks:** fail (wiki-links)',
    'Stop: complete.\n`local checks: not run (exit 7)`',
  ]) assert.equal(stopCheck(subagentStop(write('a.jsonl', claudeHelper(BRIEF_PROMPT, last)), last)), '', last);
});

test('a build helper that returns a question with its report stops', t => {
  const write = scratch(t);
  const last = 'Stop: question. Keep the old page or replace it?\n1. Replace it (best)\n2. Keep both\nlocal checks: not run (stopped before checks)';
  assert.equal(stopCheck(subagentStop(write('a.jsonl', claudeHelper(BRIEF_PROMPT, last)), last)), '');
});

test('a second stop always goes through', t => {
  const write = scratch(t);
  const path = write('a.jsonl', claudeHelper(BRIEF_PROMPT, 'Still waiting.'));
  assert.equal(stopCheck(subagentStop(path, 'Still waiting.', { stop_hook_active: true })), '');
});

test('the main chat and other helpers stop untouched', t => {
  const write = scratch(t);
  const main = write('main.jsonl', claudeHelper('Fix the footer', 'Done.'));
  assert.equal(stopCheck({ hook_event_name: 'Stop', stop_hook_active: false, transcript_path: main, last_assistant_message: 'Done.' }), '');
  const explore = write('explore.jsonl', [{ type: 'user', message: { role: 'user', content: 'Find where the footer is drawn.' } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'In app/src/Footer.tsx.' }] } }]);
  assert.equal(stopCheck(subagentStop(explore, 'In app/src/Footer.tsx.')), '');
});

test('with no last message from the host, the transcript\'s last assistant text is read', t => {
  const write = scratch(t);
  const waiting = write('a.jsonl', claudeHelper(BRIEF_PROMPT, 'Waiting on the checks.'));
  assert.equal(stopCheck(subagentStop(waiting, undefined)), BLOCK);
  const reported = write('b.jsonl', claudeHelper(BRIEF_PROMPT, 'Stop: complete.\nlocal checks: pass'));
  assert.equal(stopCheck(subagentStop(reported, undefined)), '');
});

// Codex sends a helper its task encrypted; the helper's own read of the brief names it. A forked helper's
// transcript opens with its parent's history, which must not count.
const codexMeta = (id, forked) => ({ type: 'session_meta', payload: { id, ...(forked && { forked_from_id: 'parent' }) } });
const codexRead = cmd => ({ type: 'response_item', payload: { type: 'custom_tool_call', input: `text(await tools.exec_command({cmd:"${cmd}"}));` } });
const codexSay = (role, text) => ({ type: 'response_item', payload: { type: 'message', role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] } });
const codexTask = { type: 'response_item', payload: { type: 'agent_message', content: [{ type: 'input_text', text: 'Message Type: NEW_TASK\n' }, { type: 'encrypted_content', encrypted_content: 'gAAAA' }] } };

test('a Codex helper is known by its own read of the brief', t => {
  const write = scratch(t);
  const path = write('codex.jsonl', [codexMeta('child'), codexTask, codexRead('cat .claude/skills/apply/references/build-helper.md'), codexSay('assistant', 'STARTED')]);
  assert.equal(stopCheck(subagentStop(path, 'STARTED', { agent_type: 'default' })), BLOCK);
  assert.equal(stopCheck(subagentStop(path, 'Report.\nlocal checks: not run (probe)', { agent_type: 'default' })), '');
});

test('a forked Codex helper skips the parent history it starts with', t => {
  const write = scratch(t);
  const parent = [codexMeta('parent'), codexSay('user', BRIEF_PROMPT), codexRead('cat .claude/skills/apply/references/build-helper.md')];
  const own = { type: 'event_msg', payload: { type: 'thread_settings_applied', thread_id: 'child' } };
  const explorer = write('fork.jsonl', [codexMeta('child', true), ...parent, own, codexTask, codexRead('rg Footer app/src'), codexSay('assistant', 'In Footer.tsx.')]);
  assert.equal(stopCheck(subagentStop(explorer, 'In Footer.tsx.')), '');
  const builder = write('fork-build.jsonl', [codexMeta('child', true), ...parent, own, codexTask, codexRead('cat .claude/skills/apply/references/build-helper.md'), codexSay('assistant', 'STARTED')]);
  assert.equal(stopCheck(subagentStop(builder, 'STARTED')), BLOCK);
});

test('bad JSON or a missing transcript lets the stop through with no output', t => {
  const run = input => spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
  for (const input of ['{not json', '', JSON.stringify(subagentStop(join(tmpdir(), 'wong-test-no-such-transcript.jsonl'), 'Waiting.'))]) {
    const result = run(input);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '', input);
  }
  const write = scratch(t);
  const result = run(JSON.stringify(subagentStop(write('a.jsonl', claudeHelper(BRIEF_PROMPT, 'Waiting.')), 'Waiting.')));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, BLOCK);
});

test('a helper that opens the brief late, or a forked chat whose history names it, is not a builder', t => {
  const write = scratch(t);
  const read = file => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Read', input: { file_path: file } }] } });
  const reviewer = write('review.jsonl', [{ type: 'user', message: { role: 'user', content: 'Review the apply skill.' } },
    read('/repo/.claude/skills/apply/SKILL.md'), read('/repo/wiki/development/the-change-loop.md'), read('/repo/.claude/skills/plan/SKILL.md'),
    read('/repo/.claude/skills/apply/references/build-helper.md'),
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Looks fine.' }] } }]);
  assert.equal(stopCheck(subagentStop(reviewer, 'Looks fine.')), '');
  const fork = write('fork.jsonl', [{ type: 'user', message: { role: 'user', content: 'What can we learn from this repo?' } },
    { type: 'user', message: { role: 'user', content: BRIEF_PROMPT } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Summary.' }] } }]);
  assert.equal(stopCheck(subagentStop(fork, 'Summary.')), '');
});

const REVIEW_PROMPT = 'second-look-before-preview\n\nRead `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/review-helper.md`, then review.';
const REVIEW_BLOCK = `${JSON.stringify({ decision: 'block', reason: REVIEW_REASON })}\n`;

test('a reviewer that stops without its review line is sent back once with its own reason', t => {
  const write = scratch(t);
  const last = 'Read the diff; looking at the tests next.';
  const path = write('review.jsonl', claudeHelper(REVIEW_PROMPT, last));
  assert.equal(stopCheck(subagentStop(path, last)), REVIEW_BLOCK);
  assert.match(REVIEW_REASON, /review-helper\.md/);
  assert.match(REVIEW_REASON, /`review:`/);
  assert.equal(stopCheck(subagentStop(path, last, { stop_hook_active: true })), '');
});

test('a reviewer that ends with its review line stops', t => {
  const write = scratch(t);
  for (const last of [
    'No findings.\nreview: none',
    '1. app/src/x.ts:12 — the test passes either way (fix)\n**review:** 1',
    '`review: 2`',
  ]) assert.equal(stopCheck(subagentStop(write('review.jsonl', claudeHelper(REVIEW_PROMPT, last)), last)), '', last);
  const builderLine = 'Looked it over.\nlocal checks: pass';
  assert.equal(stopCheck(subagentStop(write('review.jsonl', claudeHelper(REVIEW_PROMPT, builderLine)), builderLine)), REVIEW_BLOCK);
});

test('a builder still needs its local checks line, not a review line', t => {
  const write = scratch(t);
  const last = 'Fixed the two findings.\nreview: none';
  assert.equal(stopCheck(subagentStop(write('build.jsonl', claudeHelper(BRIEF_PROMPT, last)), last)), BLOCK);
});

test('the earliest brief wins: a reviewer that reads the build brief early still needs its review line', t => {
  const write = scratch(t);
  const last = 'Checked the build brief too.\nlocal checks: pass';
  const path = write('review.jsonl', [{ type: 'user', message: { role: 'user', content: REVIEW_PROMPT } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: { command: 'cat .claude/skills/apply/references/build-helper.md' } }] } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: last }] } }]);
  assert.equal(stopCheck(subagentStop(path, last)), REVIEW_BLOCK);
});
