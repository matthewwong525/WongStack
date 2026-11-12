#!/usr/bin/env node
// The Stop hook's check-in, Claude Code and Codex: while the person is away, one read-only AI run judges the stop,
// and a keep-going, safe pick or typed question to ask by tap goes back as a turn. wiki/development/daily.md#check-ins
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from './lib/cli.mjs';
import { headlessCommand } from './lib/headless.mjs';
import { readProfile, slot } from './lib/slot.mjs';
import { ASK_TOOLS, BUCKETS, HOLD_MS, STREAK, askText, paseoRecord, readJson, writeJson } from './chief.mjs';
import { writeCard } from './chat-list.mjs';
import { RUN_AGENTS, defaultSettings } from './config.mjs';
import { RUN_FLAGS, hookInput, offFile, personSettings, stateOf } from './daily.mjs';
import { addLine } from './journal.mjs';
import { elsewhere } from './line-up.mjs';
import { readChat } from './transcript.mjs';
import { handOver } from './waiting-notes.mjs';
import { fillText, needsYouChats, runEnv, stopGroup } from './worker.mjs';

const USAGE = 'usage: stop-check.mjs stop --agent claude|codex   the Stop hook; reads the hook\'s JSON on stdin';
const BRIEF = fileURLToPath(new URL('../references/briefs/stop-judge.md', import.meta.url));
export const JUDGE_MS = 240e3;
const TAIL_MESSAGES = 40, TAIL_CHARS = 60_000, TAIL_BYTES = 100_000, KEPT_REPLIES = 5;
const MOVES = ['keep-going', 'pick'];
const JUDGED = [...BUCKETS, 'ask'];
// The fixed send-back for an `ask` lives in chief.mjs, which `D reask` shares.
export { askText };

// Question-tool calls so far, from the raw file: a tap is a tool result, never the person's message.
const askCalls = (file, agent) => readFileSync(file, 'utf8').split(`"name":"${ASK_TOOLS[agent]}"`).length - 1;

/** The judge's data: the last 40 messages, cut to 60,000 characters and to what one command-line argument holds. */
export function tailOf(messages, last = '') {
  const rows = messages.slice(-TAIL_MESSAGES).map(message => `[${message.role}] ${message.text}`);
  const said = String(last ?? '').trim();
  if (said && !messages.at(-1)?.text?.includes(said.slice(0, 200))) rows.push(`[assistant] ${said}`);
  const text = rows.join('\n\n').slice(-TAIL_CHARS);
  const bytes = Buffer.from(text);
  return bytes.length > TAIL_BYTES ? bytes.subarray(-TAIL_BYTES).toString('utf8').replace(/^\uFFFD+/, '') : text;
}

/** The judge's answer from its last line that is not a code fence, or null. */
export function judgeLine(stdout) {
  const last = String(stdout ?? '').split('\n').map(each => each.trim()).filter(each => each && !each.startsWith('```')).at(-1);
  let answer;
  try { answer = JSON.parse(last); } catch { return null; }
  if (!JUDGED.includes(answer?.bucket) || typeof answer.line !== 'string') return null;
  if (MOVES.includes(answer.bucket) && !(typeof answer.reply === 'string' && answer.reply.trim())) return null;
  return answer;
}

/** One judge run in its own process group: `{stdout}`, `{timeout: true}` after `ms`, or `{error}`. */
export function runJudge({ command, args, cwd, env, ms = JUDGE_MS, start = spawn }) {
  return new Promise(done => {
    let child, out = '';
    try { child = start(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { done({ error: `${command} did not start` }); return; }
    const timer = setTimeout(() => { stopGroup(child.pid); done({ timeout: true }); }, ms);
    child.stdout.on('data', chunk => { if (out.length < 1e6) out += chunk; });
    child.on('error', () => { clearTimeout(timer); done({ error: `${command} did not start` }); });
    child.on('close', code => { clearTimeout(timer); done(code === 0 ? { stdout: out } : { error: `${command} ended with ${code}` }); });
  });
}

const streakFile = (stateDir, input) => join(stateDir, 'stops',
  `${String(input.session_id ?? '').replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 100)
    || createHash('sha256').update(String(input.transcript_path)).digest('hex').slice(0, 32)}.json`);

/** The chat's name for the journal: its Paseo title where Paseo runs it, else its folder's name. */
export function chatTitle({ env, cwd, home = homedir() }) {
  const { title } = paseoRecord(env.PASEO_AGENT_ID, home);
  return (typeof title === 'string' && title.replace(/\s+/g, ' ').trim().slice(0, 80)) || basename(cwd || '') || 'a chat';
}

const judgeEnv = (env, agent) => {
  const { CLAUDECODE: _drop, ...rest } = runEnv(env, `checkin-${Date.now().toString(36)}`, { agent });
  return { ...rest, WONG_STOP_CHECK: '1' };
};

/** `{out, why}`: `out` is the block decision for the hook, or null to let the chat stop. `offered` is true when the
 *  turn ended in typed choices the repo's own check sends back. */
export async function stopCheck({ input, agent = RUN_AGENTS[0], env = process.env, now = Date.now(), resolve = () => personSettings(), root,
  home = homedir(), judge = runJudge, brief = () => readFileSync(BRIEF, 'utf8'), offered = false }) {
  const skip = why => ({ out: null, why });
  if (RUN_FLAGS.some(name => env[name])) return skip('run');
  if (!input?.transcript_path) return skip('no transcript');
  const { config } = resolve();
  if (!config) return skip('no person');
  const stateDir = stateOf(config, undefined, root);
  if (existsSync(offFile(stateDir))) return skip('off');
  // A *Needs you* chat waits for the person.
  if (env.PASEO_AGENT_ID && needsYouChats(stateDir).includes(env.PASEO_AGENT_ID)) return skip('needs you');
  const file = streakFile(stateDir, input);
  const saved = { count: 0, since: null, sent: [], ...readJson(file, {}) };
  const chat = readChat(input.transcript_path, saved.sent);
  if (offered) return skip('ask-check');
  const since = chat.person.at(-1)?.at ?? null;
  const streak = saved.since === since ? saved : { ...saved, count: 0, since, told: false, asked: false };
  const here = since && now - Date.parse(since) < HOLD_MS;
  // A waiting note from the line-up goes back before the judge runs, and counts toward the streak.
  const notes = here || streak.count < STREAK ? handOver({ home, key: input.session_id, now }) : null;
  if (notes) {
    writeJson(file, { ...streak, count: (here ? 0 : streak.count) + 1, sent: [...streak.sent, notes].slice(-KEPT_REPLIES) });
    return { out: { decision: 'block', reason: notes }, why: 'note' };
  }
  if (here) { writeJson(file, { ...streak, count: 0 }); return skip('person here'); }
  const title = chatTitle({ env, cwd: input.cwd, home });
  const journal = line => addLine({ stateDir, timezone: config.timezone, line, kind: 'checkin', title, now: new Date(now) });
  if (streak.count >= STREAK) {
    if (!streak.told) journal(`Waits in its chat: ${title} — ${STREAK} check-ins in a row with no word from you`);
    writeJson(file, { ...streak, told: true });
    return skip('streak');
  }
  const prompt = fillText(brief(), { title, tail: tailOf(chat.messages, input.last_assistant_message),
    elsewhere: elsewhere(stateDir, input.session_id) });
  const cwd = input.cwd || process.cwd();
  const [command, args] = headlessCommand({ agent, prompt, access: { readOnly: true, tools: ['Read', 'Grep', 'Glob'], dir: cwd } });
  const ran = await judge({ command, args, cwd, env: judgeEnv(env, agent) });
  const answer = ran.stdout === undefined ? null : judgeLine(ran.stdout);
  if (!answer) {
    journal(`No check-in: ${title} — ${ran.timeout ? 'the check ran past 4 minutes' : ran.error ?? 'the check gave no answer'}`);
    return skip('no answer');
  }
  // One send-back until the person writes or the chat uses the question tool: a chat that can not show it then waits.
  const calls = askCalls(input.transcript_path, agent);
  if (answer.bucket === 'ask' && Number.isInteger(streak.asked) && calls <= streak.asked) {
    journal(`Waits in its chat: ${title} — asked once with no question tool`);
    return skip('asked');
  }
  journal(answer.line.trim() || `${answer.bucket}: ${title}`);
  if (answer.bucket !== 'ask' && !MOVES.includes(answer.bucket)) return skip('person');
  const reply = answer.bucket === 'ask' ? askText(agent) : answer.reply.trim();
  writeJson(file, { ...streak, count: streak.count + 1, asked: answer.bucket === 'ask' ? calls : streak.asked,
    sent: [...streak.sent, reply].slice(-KEPT_REPLIES) });
  return { out: { decision: 'block', reason: reply }, why: answer.bucket };
}

/** The stop's card, written after the checks, as hooks of one event run side by side: a stop that this check or
 * the repo's own choices check sends back keeps the chat `working`, so the line-up waits for its real stop. */
export function stopCard({ input, agent, out, offered = false, env = process.env, home = homedir(), now = Date.now() }) {
  return writeCard({ tool: agent, input, env, home, now, state: out || offered ? 'working' : 'idle' });
}

const SAMPLE = '{"bucket":"keep-going","line":"Sample stop: keep going","reply":"Go on with the next step."}';

/** `D check`'s sample: one made-up stop, sorted by a stand-in judge in a scratch folder; the bucket, or null. */
export async function sampleStop({ judge = async () => ({ stdout: SAMPLE }) } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'daily-stop-'));
  try {
    const transcript = join(dir, 'chat.jsonl');
    const said = (role, text) => JSON.stringify({ type: role, sessionId: 'sample', cwd: dir, message: { role, content: [{ type: 'text', text }] } });
    writeFileSync(transcript, `${said('user', 'Build the report page.')}\n${said('assistant', 'Step one is done.')}\n`);
    const config = defaultSettings({ email: 'sample@example.com' });
    const { why } = await stopCheck({ input: { session_id: 'sample', transcript_path: transcript, cwd: dir }, env: {}, root: dir, home: dir,
      resolve: () => ({ config }), judge });
    return MOVES.includes(why) ? why : null;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, options: { agent: { type: 'string' } } });
  if (positionals.join(' ') !== 'stop' || !RUN_AGENTS.includes(values.agent)) usageError(USAGE);
  // A stop hook never fails the chat: any error lets it stop, with no output.
  const input = hookInput();
  await readProfile();
  const offered = Boolean(await slot('offeredChoices', [input, values.agent]));
  stopCheck({ input, agent: values.agent, offered }).then(({ out }) => out, () => null).then(out => {
    try { stopCard({ input, agent: values.agent, out, offered }); } catch { /* the card never fails the chat */ }
    if (out) console.log(JSON.stringify(out));
  });
}
