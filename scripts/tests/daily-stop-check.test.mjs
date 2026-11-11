import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { writeJson } from '../../.agents/skills/daily/scripts/chief.mjs';
import { offFile, stateOf } from '../../.agents/skills/daily/scripts/daily.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { askText, chatTitle, judgeLine, runJudge, stopCard, stopCheck, tailOf } from '../../.agents/skills/daily/scripts/stop-check.mjs';
import { appendNote, takeNotes } from '../../.agents/skills/daily/scripts/waiting-notes.mjs';
import { needsYouFile } from '../../.agents/skills/daily/scripts/worker.mjs';
import { ensureDaily } from '../../.agents/memory/session-start.mjs';

const SCRIPT = fileURLToPath(new URL('../../.agents/skills/daily/scripts/stop-check.mjs', import.meta.url));
const TZ = 'America/Toronto';
const NOW = Date.parse('2026-11-03T15:00:00Z');
const MIN = 60e3;
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'daily-stop-')); roots.push(dir); return dir; };
const config = validateConfig({ version: 1, person: 'alex', emails: ['alex@example.com'], timezone: TZ, sources: { tasks: false, chats: true },
  places: {}, checks: [] });
const iso = ms => new Date(ms).toISOString();
const NEXT = 'Tests pass. Next I update the wiki page.';

/** A Claude Code or Codex transcript: `rows` are `[role, text, ms]`, the person's first. `add` appends more. */
function chat(dir, agent, rows) {
  const file = join(dir, `${agent}-${Math.random().toString(36).slice(2)}.jsonl`);
  const line = ([role, text, ms, extra = {}]) => JSON.stringify(agent === 'codex'
    ? { timestamp: iso(ms), type: 'response_item', payload: { type: 'message', role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] } }
    : { type: role, sessionId: 's1', cwd: dir, timestamp: iso(ms), message: { role, content: role === 'user' ? text : [{ type: 'text', text }] }, ...extra });
  const head = agent === 'codex' ? [JSON.stringify({ timestamp: iso(NOW - 60 * MIN), type: 'session_meta', payload: { id: 'c1', cwd: dir } }),
    JSON.stringify({ timestamp: iso(NOW - 60 * MIN), type: 'response_item', payload: { type: 'message', role: 'user',
      content: [{ type: 'input_text', text: '<environment_context>cwd</environment_context>' }] } })] : [];
  writeFileSync(file, `${[...head, ...rows.map(line)].join('\n')}\n`);
  return { file, add: (...more) => appendFileSync(file, `${more.map(line).join('\n')}\n`) };
}

/** One world: a checkout's state root, a judge that answers `answer`, and `stop()` for one Stop hook call. */
function world({ agent = 'claude', rows = [['user', 'Build the export page.', NOW - 40 * MIN], ['assistant', NEXT, NOW - MIN]], answer } = {}) {
  const root = temp(), dir = temp(), home = temp();
  const transcript = chat(dir, agent, rows);
  const judged = [];
  const reply = answer ?? { stdout: `Read the chat.\n${JSON.stringify({ bucket: 'keep-going', reply: 'Keep going.', line: 'Kept going: export' })}\n` };
  const judge = async run => { judged.push(run); return typeof reply === 'function' ? reply(run) : reply; };
  const stop = async ({ now = NOW, env = {}, input = {} } = {}) => stopCheck({ agent, env, now, root, home, judge, resolve: () => ({ config }),
    input: { session_id: 's1', transcript_path: transcript.file, cwd: dir, stop_hook_active: true, ...input } });
  const stateDir = stateOf(config, undefined, root);
  return { stop, judged, transcript, stateDir, dir, root, home, journal: () => readLines({ stateDir }).map(entry => entry.line) };
}

test("the judge sees the person's newest choices from other chats, not this chat's own", async () => {
  const w = world();
  writeJson(join(w.stateDir, 'line-up.json'), { chats: { 'agent-b': { title: 'Report page', choices: [{ at: '2026-11-03T14:00:00Z', text: 'Dark theme for all report pages' }] },
    s1: { title: 'This chat', choices: [{ at: '2026-11-03T14:30:00Z', text: 'Light theme here' }] } } });
  await w.stop();
  const prompt = w.judged[0].args[1];
  assert.match(prompt, /<elsewhere>\n2026-11-03T14:00:00Z — Report page: Dark theme for all report pages\n<\/elsewhere>/);
  assert.doesNotMatch(prompt, /Light theme here/);
});

test('a note from the daily is not the person\'s message: the check-in still judges the stop', async () => {
  const w = world({ rows: [['user', 'Build the export page.', NOW - 40 * MIN], ['assistant', 'On it.', NOW - 30 * MIN],
    ['user', 'From the daily: use Stripe, not PayPal (Checkout, 10:00).', NOW - 2 * MIN], ['assistant', NEXT, NOW - MIN]] });
  assert.equal((await w.stop()).why, 'keep-going');
});

for (const agent of ['claude', 'codex']) {
  test(`${agent}: a waiting note goes back before the judge runs, counts toward the streak, and writes one journal line`, async () => {
    const w = world({ agent });
    appendNote({ home: w.home, key: 's1', note: { text: 'From the daily: Use Stripe (Checkout, 10:00).', title: 'Payments', stateDir: w.stateDir,
      timezone: TZ, at: iso(NOW) } });
    assert.deepEqual(await w.stop(), { out: { decision: 'block', reason: 'From the daily: Use Stripe (Checkout, 10:00).' }, why: 'note' });
    assert.deepEqual([w.judged.length, w.journal()], [0, ['Told Payments: Use Stripe (Checkout, 10:00).']]);
    assert.equal(JSON.parse(readFileSync(join(w.stateDir, 'stops', 's1.json'), 'utf8')).count, 1);
    assert.equal((await w.stop({ now: NOW + MIN })).why, 'keep-going');
    writeFileSync(join(w.stateDir, 'stops', 's1.json'), JSON.stringify({ count: 5, since: iso(NOW - 40 * MIN), sent: [], told: true }));
    appendNote({ home: w.home, key: 's1', note: { text: 'From the daily: later', title: 'Payments', stateDir: w.stateDir, timezone: TZ, at: iso(NOW) } });
    assert.equal((await w.stop({ now: NOW + 2 * MIN })).why, 'streak');
    assert.equal(takeNotes({ home: w.home, key: 's1' }).length, 1, 'past the streak, the note waits for the person');
  });
}

for (const agent of ['claude', 'codex']) {
  const wrapped = reply => (agent === 'codex' ? `<hook_prompt hook_run_id="r">${reply}</hook_prompt>` : `Stop hook feedback:\n${reply}`);
  test(`${agent}: away 40 minutes with a named next step, the chat carries on with the judge's reply and a journal line`, async () => {
    const w = world({ agent });
    const { out, why } = await w.stop();
    assert.deepEqual([out, why], [{ decision: 'block', reason: 'Keep going.' }, 'keep-going']);
    assert.deepEqual(w.journal(), ['Kept going: export']);
    const [run] = w.judged;
    assert.equal(run.command, agent);
    assert.equal(run.env.WONG_STOP_CHECK, '1');
    assert.equal(run.env.WONG_DAILY_RUN, '1');
    assert.equal(run.env.PASEO_AGENT_ID, undefined);
    assert.equal(run.cwd, w.dir);
    const prompt = agent === 'codex' ? run.args.at(-1) : run.args[1];
    assert.match(prompt, /\[user\] Build the export page\./);
    assert.match(prompt, /Tests pass\. Next I update the wiki page\./);
    assert.doesNotMatch(prompt, /\{\{|environment_context/);
    assert.ok(agent === 'codex' ? run.args.includes('read-only') : run.args.includes('dontAsk') && !run.args.includes('Bash'));
  });

  test(`${agent}: a message 5 minutes old lets the chat stop and resets the streak`, async () => {
    const w = world({ agent, rows: [['user', 'Build it.', NOW - 5 * MIN], ['assistant', NEXT, NOW - MIN]] });
    const file = join(w.stateDir, 'stops', 's1.json');
    mkdirSync(join(w.stateDir, 'stops'), { recursive: true });
    writeFileSync(file, JSON.stringify({ count: 3, since: iso(NOW - 5 * MIN), sent: [] }));
    assert.deepEqual(await w.stop(), { out: null, why: 'person here' });
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).count, 0);
    assert.deepEqual([w.judged, w.journal()], [[], []]);
  });

  test(`${agent}: the sixth stop in a row with no word from the person lets it stop, with one journal line`, async () => {
    const w = world({ agent });
    for (let n = 0; n < 5; n++) {
      assert.equal((await w.stop({ now: NOW + n * MIN })).out?.reason, 'Keep going.');
      // The chat records the reply as a message; it is not the person's.
      w.transcript.add(['user', wrapped('Keep going.'), NOW + n * MIN + 1000], ['assistant', NEXT, NOW + n * MIN + 2000]);
    }
    assert.deepEqual(await w.stop({ now: NOW + 6 * MIN }), { out: null, why: 'streak' });
    assert.deepEqual(await w.stop({ now: NOW + 7 * MIN }), { out: null, why: 'streak' });
    assert.equal(w.judged.length, 5);
    assert.deepEqual(w.journal().slice(5), ['Waits in its chat: ' + w.dir.split('/').at(-1) + ' — 5 check-ins in a row with no word from you']);
    // A word from the person starts a new streak, after the 15-minute wait.
    w.transcript.add(['user', 'Also add a CSV button.', NOW + 8 * MIN]);
    assert.equal((await w.stop({ now: NOW + 9 * MIN })).why, 'person here');
    assert.equal((await w.stop({ now: NOW + 30 * MIN })).out?.reason, 'Keep going.');
  });

  test(`${agent}: the person's own words that hold or equal a kept reply are theirs; the reply in the host's wrap is not`, async () => {
    const w = world({ agent });
    assert.equal((await w.stop()).out?.reason, 'Keep going.');
    w.transcript.add(['user', '<hook_prompt hook_run_id="r1">Keep going.</hook_prompt>', NOW + 1000], ['assistant', NEXT, NOW + 2000]);
    if (agent === 'claude') w.transcript.add(['user', 'Stop hook feedback:\nKeep going.', NOW + 3000]);
    assert.equal((await w.stop({ now: NOW + MIN })).out?.reason, 'Keep going.');
    w.transcript.add(['user', 'Looks good. Keep going.', NOW + 5 * MIN], ['assistant', NEXT, NOW + 9 * MIN]);
    assert.deepEqual(await w.stop({ now: NOW + 10 * MIN }), { out: null, why: 'person here' });
    assert.equal(JSON.parse(readFileSync(join(w.stateDir, 'stops', 's1.json'), 'utf8')).count, 0);
    assert.equal((await w.stop({ now: NOW + 30 * MIN })).out?.reason, 'Keep going.');
    w.transcript.add(['user', 'Keep going.', NOW + 31 * MIN], ['assistant', NEXT, NOW + 33 * MIN]);
    assert.deepEqual(await w.stop({ now: NOW + 34 * MIN }), { out: null, why: 'person here' });
  });
}

test('judgeLine takes an ask with an empty reply; keep-going and pick still need one', () => {
  assert.deepEqual(judgeLine('{"bucket":"ask","reply":"","line":"Asked to show choices: x"}'), { bucket: 'ask', reply: '', line: 'Asked to show choices: x' });
  assert.deepEqual(judgeLine('{"bucket":"ask","line":"x"}'), { bucket: 'ask', line: 'x' });
  assert.equal(judgeLine('{"bucket":"pick","reply":" ","line":"x"}'), null);
});

const ASK = { stdout: `{"bucket": "ask", "reply": "", "line": "Asked to show choices: export"}` };
const QUESTION = 'Should I keep the old page or remove it?';
for (const [agent, tool] of [['claude', 'AskUserQuestion'], ['codex', 'request_user_input']]) {
  const wrapped = reply => (agent === 'codex' ? `<hook_prompt hook_run_id="r">${reply}</hook_prompt>` : `Stop hook feedback:\n${reply}`);
  test(`${agent}: a typed question goes back once to ask with ${tool}; a second one before the person writes waits, with one journal line`, async () => {
    const w = world({ agent, answer: ASK, rows: [['user', 'Build the export page.', NOW - 40 * MIN], ['assistant', QUESTION, NOW - MIN]] });
    const text = askText(agent);
    assert.match(text, new RegExp(`with ${tool}: 2 to 4 short options, your recommended one first, marked \\(Recommended\\)`));
    assert.deepEqual(await w.stop(), { out: { decision: 'block', reason: text }, why: 'ask' });
    assert.deepEqual(w.journal(), ['Asked to show choices: export']);
    const file = join(w.stateDir, 'stops', 's1.json');
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).count, 1);
    // The chat could not show the question tool and typed the question again: the send-back is not the person's word.
    w.transcript.add(['user', wrapped(text), NOW + 1000], ['assistant', QUESTION, NOW + 2000]);
    assert.deepEqual(await w.stop({ now: NOW + MIN }), { out: null, why: 'asked' });
    assert.deepEqual(w.journal().slice(1), [`Waits in its chat: ${w.dir.split('/').at(-1)} — asked once with no question tool`]);
    // A word from the person resets the flag, after the 15-minute wait.
    w.transcript.add(['user', 'Keep it for now, and go on.', NOW + 2 * MIN], ['assistant', QUESTION, NOW + 3 * MIN]);
    assert.equal((await w.stop({ now: NOW + 30 * MIN })).why, 'ask');
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).asked, 0);
    // The chat asked with the tool and the person tapped: a tap is no typed message, yet the next question goes back.
    appendFileSync(w.transcript.file, `${JSON.stringify(agent === 'codex'
      ? { timestamp: iso(NOW + 31 * MIN), type: 'response_item', payload: { type: 'function_call', name: tool, arguments: '{}' } }
      : { type: 'assistant', timestamp: iso(NOW + 31 * MIN), message: { role: 'assistant', content: [{ type: 'tool_use', name: tool, input: {} }] } })}\n`);
    w.transcript.add(['assistant', QUESTION, NOW + 32 * MIN]);
    assert.equal((await w.stop({ now: NOW + 33 * MIN })).why, 'ask');
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).asked, 1);
  });
}

test('an ask counts toward the five in a row', async () => {
  const answers = [ASK, ...Array(4).fill({ stdout: '{"bucket": "keep-going", "reply": "Keep going.", "line": "Kept going: export"}' })];
  const w = world({ answer: () => answers.shift() ?? assert.fail('judged a sixth time') });
  for (let n = 0; n < 5; n++) {
    const { out } = await w.stop({ now: NOW + n * MIN });
    assert.ok(out);
    w.transcript.add(['user', `Stop hook feedback:\n${out.reason}`, NOW + n * MIN + 1000], ['assistant', NEXT, NOW + n * MIN + 2000]);
  }
  assert.deepEqual(await w.stop({ now: NOW + 6 * MIN }), { out: null, why: 'streak' });
});

test("a journal line names the chat by its Paseo title, else its folder; a bad or missing record falls back", async () => {
  const home = temp();
  const records = join(home, '.paseo', 'agents', 'root-project');
  mkdirSync(records, { recursive: true });
  writeFileSync(join(records, 'agent-1.json'), JSON.stringify({ id: 'agent-1', title: '  Export   page\nbuild ' }));
  writeFileSync(join(records, 'agent-2.json'), '{not json');
  assert.equal(chatTitle({ env: { PASEO_AGENT_ID: 'agent-1' }, cwd: '/w/shop', home }), 'Export page build');
  assert.equal(chatTitle({ env: { PASEO_AGENT_ID: 'agent-2' }, cwd: '/w/shop', home }), 'shop');
  assert.equal(chatTitle({ env: { PASEO_AGENT_ID: '../x' }, cwd: '/w/shop', home }), 'shop');
  assert.equal(chatTitle({ env: {}, cwd: '', home: join(home, 'none') }), 'a chat');
  const w = world();
  const prompts = [];
  await stopCheck({ input: { session_id: 's1', transcript_path: w.transcript.file, cwd: w.dir }, env: { PASEO_AGENT_ID: 'agent-1' }, now: NOW,
    root: w.root, home, resolve: () => ({ config }), judge: async run => { prompts.push(run.args.join(' ')); return { stdout: '{"bucket": "person", "line": ""}' }; } });
  assert.match(prompts[0], /The chat \*\*Export page build\*\* stopped/);
  assert.deepEqual(w.journal(), ['person: Export page build']);
});

test('a pick goes back as the option; needs-you, a timeout, a bad end line and an error let the chat stop, each with a journal line', async () => {
  const pick = world({ answer: { stdout: '{"bucket": "pick", "reply": "Use the short text", "line": "Picked \\"Use the short text\\": export"}' } });
  assert.deepEqual((await pick.stop()).out, { decision: 'block', reason: 'Use the short text' });
  const cases = [
    [{ stdout: '```json\n{"bucket": "person", "reply": "", "line": "Waits in its chat: export — merge"}\n```' }, 'person', 'Waits in its chat: export — merge'],
    [{ timeout: true }, 'no answer', /past 4 minutes/],
    [{ stdout: 'I think it should keep going.' }, 'no answer', /gave no answer/],
    [{ stdout: '{"bucket": "keep-going", "reply": "", "line": "x"}' }, 'no answer', /gave no answer/],
    [{ error: 'claude ended with 1' }, 'no answer', /claude ended with 1/],
  ];
  for (const [answer, why, line] of cases) {
    const w = world({ answer });
    assert.deepEqual(await w.stop(), { out: null, why });
    assert.equal(w.journal().length, 1);
    assert.match(w.journal()[0], line instanceof RegExp ? line : new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('no check-in while off, in a background run, with no person, or when ask-check sends the reply back; an old Daily chat gets one', async () => {
  const off = world();
  mkdirSync(off.stateDir, { recursive: true });
  writeFileSync(offFile(off.stateDir), 'x');
  assert.equal((await off.stop()).why, 'off');
  // A chat that began with /daily before the update is judged like any other.
  const daily = world({ rows: [['user', '<command-message>daily</command-message>\n<command-name>/daily</command-name>', NOW - 60 * MIN],
    ['assistant', NEXT, NOW - MIN]] });
  await daily.stop();
  assert.equal(daily.judged.length, 1);
  const runs = world();
  for (const name of ['WONG_DAILY_RUN', 'WONG_MEMORY_RUN', 'WONG_STOP_CHECK']) assert.equal((await runs.stop({ env: { [name]: '1' } })).why, 'run');
  const nobody = await stopCheck({ input: { transcript_path: '/x' }, env: {}, resolve: () => ({ config: null }), judge: () => assert.fail('judged') });
  assert.equal(nobody.why, 'no person');
  assert.equal((await stopCheck({ input: {}, env: {}, resolve: () => assert.fail('resolved') })).why, 'no transcript');
  const typed = 'Which one next?\n- Build the page (Recommended)\n- Write the docs';
  const asked = world();
  assert.equal((await asked.stop({ input: { stop_hook_active: false, last_assistant_message: typed } })).why, 'ask-check');
  for (const w of [off, runs, asked]) assert.deepEqual([w.judged, w.journal()], [[], []]);
});

test("a Needs you chat gets no check-in, and another chat still does", async () => {
  const w = world();
  mkdirSync(w.stateDir, { recursive: true });
  writeFileSync(needsYouFile(w.stateDir), JSON.stringify({ counts: {}, opened: {}, chats: ['needs-1'] }));
  assert.deepEqual(await w.stop({ env: { PASEO_AGENT_ID: 'needs-1' } }), { out: null, why: 'needs you' });
  assert.deepEqual([w.judged.length, w.journal()], [0, []]);
  assert.equal((await w.stop({ env: { PASEO_AGENT_ID: 'other-1' } })).why, 'keep-going');
});

test('the tail is the last 40 messages, cut to 60,000 characters and 100,000 bytes, with the last reply when the file lacks it', () => {
  const messages = Array.from({ length: 50 }, (_, n) => ({ role: n % 2 ? 'assistant' : 'user', text: `m${n}` }));
  const tail = tailOf(messages, 'The very last words.');
  assert.match(tail, /^\[user\] m10\n/);
  assert.match(tail, /\[assistant\] The very last words\.$/);
  assert.doesNotMatch(tailOf(messages, 'm49'), /\[assistant\] m49\n\n\[assistant\] m49/);
  assert.ok(tailOf([{ role: 'user', text: 'x'.repeat(90_000) }]).length <= 60_000);
  assert.ok(Buffer.byteLength(tailOf([{ role: 'user', text: '字'.repeat(50_000) }])) <= 100_000);
  assert.deepEqual(judgeLine('words\n{"bucket":"keep-going","reply":"Keep going.","line":"Kept going: x"}\n```'),
    { bucket: 'keep-going', reply: 'Keep going.', line: 'Kept going: x' });
  assert.equal(judgeLine('{"bucket":"maybe","reply":"x","line":"x"}'), null);
});

test('the judge run gives its output, and is stopped with its group after the time limit', async () => {
  const node = process.execPath;
  assert.deepEqual(await runJudge({ command: node, args: ['-e', 'console.log("hi")'], cwd: tmpdir(), env: process.env }), { stdout: 'hi\n' });
  const started = Date.now();
  assert.deepEqual(await runJudge({ command: node, args: ['-e', 'setTimeout(() => {}, 20000)'], cwd: tmpdir(), env: process.env, ms: 300 }), { timeout: true });
  assert.ok(Date.now() - started < 5000);
  assert.match((await runJudge({ command: node, args: ['-e', 'process.exit(3)'], cwd: tmpdir(), env: process.env })).error, /ended with 3/);
  assert.match((await runJudge({ command: join(tmpdir(), 'no-such-judge'), args: [], cwd: tmpdir(), env: process.env })).error, /did not start/);
});

test('the stop\'s card stays working when the check or the ask check sends the stop back, else it is idle', () => {
  const home = temp(), dir = temp();
  const card = () => JSON.parse(readFileSync(join(home, '.local', 'state', 'wongstack', 'chats', 's1.json'), 'utf8')).state;
  const typed = 'Which one next?\n- Build the page (Recommended)\n- Write the docs';
  for (const agent of ['claude', 'codex']) {
    const { file } = chat(dir, agent, [['user', 'Build the export page.', NOW - 40 * MIN], ['assistant', NEXT, NOW - MIN]]);
    const input = { hook_event_name: 'Stop', session_id: 's1', transcript_path: file, cwd: dir };
    const stop = (out, more = {}) => { stopCard({ input: { ...input, ...more }, agent, out, env: {}, home, now: NOW }); return card(); };
    assert.equal(stop({ decision: 'block', reason: 'Keep going.' }), 'working', agent);
    assert.equal(stop(null), 'idle', agent);
    assert.equal(stop(null, { last_assistant_message: typed }), agent === 'claude' ? 'working' : 'idle', agent);
    assert.equal(stop(null, { last_assistant_message: typed, stop_hook_active: true }), 'idle', agent);
  }
});

test('the hook command prints nothing and exits 0 on input it can not use; a wrong command line is a usage error', () => {
  for (const input of ['', '{}', 'not json', JSON.stringify({ transcript_path: '/no/such/file', session_id: 'x' })]) {
    const run = spawnSync(process.execPath, [SCRIPT, 'stop', '--agent', 'claude'], { input, encoding: 'utf8', env: { ...process.env, WONG_DAILY_RUN: '' } });
    assert.deepEqual([run.status, run.stdout], [0, ''], input);
  }
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'stop', '--agent', 'gpt'], { input: '{}' }).status, 2);
  const home = temp();
  const run = spawnSync(process.execPath, [SCRIPT, 'stop', '--agent', 'codex'], { encoding: 'utf8',
    input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'chat-9', cwd: home }),
    env: { ...process.env, HOME: home, WONG_DAILY_RUN: '', WONG_MEMORY_RUN: '', WONG_STOP_CHECK: '' } });
  assert.deepEqual([run.status, run.stdout], [0, '']);
  assert.equal(JSON.parse(readFileSync(join(home, '.local', 'state', 'wongstack', 'chats', 'chat-9.json'), 'utf8')).state, 'idle');
});

test('chat start starts the daily worker check, except in a background run', () => {
  const started = [];
  const start = (command, args, options) => { started.push([args.slice(1), options.cwd]); return { on() {}, unref() {} }; };
  for (const name of ['WONG_DAILY_RUN', 'WONG_MEMORY_RUN', 'WONG_STOP_CHECK']) assert.equal(ensureDaily({ root: '/r' }, 'codex', { env: { [name]: '1' }, start }), false);
  assert.equal(ensureDaily({ root: '/r' }, 'codex', { env: { WONG_DAILY_WORKER: '0' }, start }), false);
  assert.equal(ensureDaily({ root: '/r' }, 'codex', { env: {}, start }), true);
  assert.deepEqual(started, [[['ensure', '--agent', 'codex'], '/r']]);
  assert.equal(ensureDaily({ root: '/r' }, 'claude', { env: {}, start: () => { throw new Error('no'); } }), false);
});
