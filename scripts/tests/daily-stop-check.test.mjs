import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { offFile, stateOf } from '../../.agents/skills/daily/scripts/daily.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { chatTitle, judgeLine, runJudge, stopCheck, tailOf } from '../../.agents/skills/daily/scripts/stop-check.mjs';
import { needsYouFile } from '../../.agents/skills/daily/scripts/worker.mjs';
import { ensureDaily } from '../../.agents/skills/memory/scripts/session-start.mjs';

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
  const root = temp(), dir = temp();
  const transcript = chat(dir, agent, rows);
  const judged = [];
  const reply = answer ?? { stdout: `Read the chat.\n${JSON.stringify({ bucket: 'keep-going', reply: 'Keep going.', line: 'Kept going: export' })}\n` };
  const judge = async run => { judged.push(run); return typeof reply === 'function' ? reply(run) : reply; };
  const stop = async ({ now = NOW, env = {}, input = {} } = {}) => stopCheck({ agent, env, now, root, judge, resolve: () => ({ config }),
    input: { session_id: 's1', transcript_path: transcript.file, cwd: dir, stop_hook_active: true, ...input } });
  const stateDir = stateOf(config, undefined, root);
  return { stop, judged, transcript, stateDir, dir, root, journal: () => readLines({ stateDir }).map(entry => entry.line) };
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

test('the hook command prints nothing and exits 0 on input it can not use; a wrong command line is a usage error', () => {
  for (const input of ['', '{}', 'not json', JSON.stringify({ transcript_path: '/no/such/file', session_id: 'x' })]) {
    const run = spawnSync(process.execPath, [SCRIPT, 'stop', '--agent', 'claude'], { input, encoding: 'utf8', env: { ...process.env, WONG_DAILY_RUN: '' } });
    assert.deepEqual([run.status, run.stdout], [0, ''], input);
  }
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'stop', '--agent', 'gpt'], { input: '{}' }).status, 2);
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
