#!/usr/bin/env node
// A chat's name starts with its change-loop step: wiki/development/the-change-loop.md#what-each-step-may-change.
// One file per chat keeps the step and task words; every host it can reach gets the whole name `<STEP>: <task>`.
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { paseoRecord } from '../../daily/scripts/chief.mjs';
import { findPaseo, runPaseo } from '../../schedule/scripts/lib/paseo.mjs';
import { PLACEHOLDERS, renameArgs } from '../../schedule/scripts/workspace.mjs';

const USAGE = `usage: step-title.mjs set <STEP> [--task <words>] [--typed]   a skill moves this chat to STEP
       step-title.mjs hook --agent claude|codex [--event session-start]   a hook; reads the hook JSON on stdin
STEP is one of EXPLORE, PLAN, APPLY, SHIP, DONE. Always exits 0 and prints STEP_TITLE=<title> or STEP_TITLE=skipped <reason>.`;

export const STEPS = ['EXPLORE', 'PLAN', 'APPLY', 'SHIP', 'DONE'];
const VERBS = { explore: 'EXPLORE', plan: 'PLAN', 'improve-code': 'PLAN', apply: 'APPLY', continue: 'APPLY', ship: 'SHIP' };
const SKILL = /^[/$]([a-z][a-z0-9:-]*)(?=\s|$)/;
const LEADING_STEP = new RegExp(`^(?:${STEPS.join('|')}):\\s*`);
const BRANCH = /^[a-z0-9]+(-[a-z0-9]+)+$/;
const RUN_FLAGS = ['WONG_DAILY_RUN', 'WONG_MEMORY_RUN', 'WONG_STOP_CHECK'];
const TASK_MAX = 50;
const SELF = fileURLToPath(import.meta.url);

/** The step a message asks for: `{ step }` for a loop verb, `{ other: true }` for another skill, else `{}`. */
export function verbOf(prompt) {
  const name = SKILL.exec(String(prompt ?? '').trim())?.[1];
  if (!name) return {};
  return VERBS[name] ? { step: VERBS[name] } : { other: true };
}

/** Words that name a task, or null for a branch-like name or a placeholder. */
export function goodTask(raw) {
  const words = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!words || BRANCH.test(words) || PLACEHOLDERS.has(words.toLowerCase().replace(/[-_\s]+/g, ' '))) return null;
  return words;
}

/** A host name minus a leading step word. */
export const withoutStep = name => String(name ?? '').replace(LEADING_STEP, '').trim();

/** The first clause of a message, its step verb removed, cut at a word to 50 characters. */
export function clauseOf(prompt) {
  const text = String(prompt ?? '').trim().replace(SKILL, '').trim();
  let clause = text.split(/\n|[.?!;](?:\s|$)/)[0].trim();
  if (clause.length > TASK_MAX) clause = clause.slice(0, TASK_MAX + 1).replace(/\s+\S*$/, '');
  clause = clause.replace(/[\s,:;-]+$/, '');
  return goodTask(clause && clause.charAt(0).toUpperCase() + clause.slice(1));
}

/** The next state, or `{ skipped }`. The rank only rises unless typed; a lower step still fills weak task words. */
export function nextState(state, { step, typed = false, task = null }) {
  const given = goodTask(task);
  const weak = !state?.task || state.taskFrom === 'prompt';
  if (state?.step && !typed && STEPS.indexOf(step) < STEPS.indexOf(state.step)) {
    if (!given || !weak) return { skipped: 'lower' };
    step = state.step;
  }
  const keep = state?.task && !(given && weak);
  return { step, task: keep ? state.task : given, taskFrom: keep ? state.taskFrom : given && 'task', shown: state?.shown ?? null };
}

export const titleOf = state => (state?.step && state.task ? `${state.step}: ${state.task}` : null);

/** The chat's folder facts: its git common dir and whether it is a linked worktree; null outside git. */
export function folderOf(cwd) {
  try {
    const [gitDir, common, top] = execFileSync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir',
      '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n');
    return { common, top, worktree: gitDir !== common };
  } catch { return null; }
}

const stateFile = (folder, id) => join(folder.common, 'wongstack', 'step-titles', `${String(id).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 100)}.json`);

export function readState(folder, id) {
  try { return JSON.parse(readFileSync(stateFile(folder, id), 'utf8')); } catch { return null; }
}

export function writeState(folder, id, state) {
  const file = stateFile(folder, id);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify({ ...state, at: new Date().toISOString() })}\n`);
  renameSync(`${file}.tmp`, file);
}

/** Why this chat keeps its name, or null: an unattended run, the Daily chat, a Paseo helper, or Paseo's main folder. */
export function skipReason({ env, folder, record }) {
  if (RUN_FLAGS.some(name => env[name])) return 'run';
  if (!folder) return 'no git folder';
  if (record?.labels?.['daily-chat'] === '1') return 'daily chat';
  if (record?.internal === true) return 'helper chat';
  if (env.PASEO_AGENT_ID && !folder.worktree) return 'main folder';
  return null;
}

/** The task words from the host's name at the first write: Paseo's chat name, minus a step word. */
const hostTask = record => goodTask(withoutStep(record?.title));

/** Paseo: the chat's name, and its workspace's when the workspace is this worktree alone. */
export async function writePaseo({ env, title, top }) {
  const bin = findPaseo(env, 'STEP_TITLE_PASEO_BIN');
  await runPaseo(bin, ['agent', 'update', env.PASEO_AGENT_ID, '--name', title], { env });
  const { data } = await runPaseo(bin, ['workspace', 'ls'], { env });
  const real = dir => { try { return realpathSync(dir); } catch { return dir; } };
  const own = (Array.isArray(data) ? data : []).find(each => each.isolation === 'worktree' && real(each.cwd ?? '') === real(top));
  if (own) await runPaseo(bin, renameArgs(own.workspaceId, title), { env });
}

/** Codex's own rename, `thread/name/set` through `codex app-server`: it updates the list `codex resume` reads. */
export function codexRename({ env, id, title, ms = 5000 }) {
  return new Promise((done, fail) => {
    const child = spawn(env.STEP_TITLE_CODEX_BIN || 'codex', ['app-server'], { env, stdio: ['pipe', 'pipe', 'ignore'] });
    const end = error => { clearTimeout(timer); child.kill(); if (error) fail(error); else done(); };
    const timer = setTimeout(() => end(new Error('codex app-server did not answer')), ms);
    const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
    let out = '';
    child.on('error', end);
    child.stdin.on('error', () => {});
    child.stdout.on('data', chunk => {
      out += chunk;
      for (let at = out.indexOf('\n'); at >= 0; at = out.indexOf('\n')) {
        let reply;
        try { reply = JSON.parse(out.slice(0, at)); } catch { reply = null; }
        out = out.slice(at + 1);
        if (reply?.id === 1) {
          send({ method: 'initialized' });
          send({ id: 2, method: 'thread/name/set', params: { threadId: id, name: title } });
        } else if (reply?.id === 2) end(reply.error ? new Error(reply.error.message ?? 'rename refused') : null);
      }
    });
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'wongstack-step-title', version: '1' } } });
  });
}

/** Codex: its own rename, else, for a Codex without it, one whole line appended to its chat-name list. */
export async function writeCodex({ env, id, title, home = homedir() }) {
  try { await codexRename({ env, id, title }); return; } catch { /* the list file below */ }
  const file = join(env.CODEX_HOME || join(home, '.codex'), 'session_index.jsonl');
  appendFileSync(file, `${JSON.stringify({ id, thread_name: title, updated_at: new Date().toISOString() })}\n`);
}

/** Every host this process can reach; returns the failures' reasons. */
export async function writeHosts({ env, title, top, codexId }) {
  const failed = [];
  if (env.PASEO_AGENT_ID) await writePaseo({ env, title, top }).catch(error => failed.push(`paseo: ${error.message.split('\n')[0]}`));
  if (codexId) await writeCodex({ env, id: codexId, title }).catch(error => failed.push(`codex: ${error.code ?? error.message}`));
  return failed;
}

const chatId = env => env.PASEO_AGENT_ID || env.CLAUDE_CODE_SESSION_ID || env.CODEX_THREAD_ID || null;

/** `set`: a skill moves the chat. Returns the line to print. */
export async function setStep({ step, task, typed, env = process.env, cwd = process.cwd(), home = homedir() }) {
  const folder = folderOf(cwd);
  const record = paseoRecord(env.PASEO_AGENT_ID, home);
  const skip = skipReason({ env, folder, record });
  const id = chatId(env);
  if (skip || !id) return `STEP_TITLE=skipped ${skip ?? 'no chat id'}`;
  const before = readState(folder, id);
  const next = nextState(before, { step, typed, task });
  if (next.skipped) return `STEP_TITLE=skipped ${next.skipped}`;
  if (!next.task && hostTask(record)) Object.assign(next, { task: hostTask(record), taskFrom: 'name' });
  writeState(folder, id, next);
  const title = titleOf(next);
  if (!title) return 'STEP_TITLE=skipped no task words';
  const failed = await writeHosts({ env, title, top: folder.top, codexId: env.CODEX_THREAD_ID });
  const reached = Boolean(env.PASEO_AGENT_ID) + Boolean(env.CODEX_THREAD_ID);
  if (reached && failed.length === reached) return `STEP_TITLE=skipped ${failed.join('; ')}`;
  return [`STEP_TITLE=${title}`, ...failed.map(reason => `STEP_TITLE_WARNING=${reason}`)].join('\n');
}

/** The hook's move for a message: a typed verb, PLAN for a first message with no verb, else null. */
function moveFor(prompt, before) {
  const { step, other } = verbOf(prompt);
  if (step) return { step, typed: true };
  if (before || other) return null;
  return { step: 'PLAN', typed: true };
}

/** `hook`: `{ out, write }`, the hook's stdout and the title to write to Paseo and Codex, either null. */
export function hookTurn({ input, agent, event, env = process.env, home = homedir() }) {
  const none = { out: null, write: null };
  const cwd = input?.cwd || process.cwd();
  const folder = folderOf(cwd);
  const record = paseoRecord(env.PASEO_AGENT_ID, home);
  const id = env.PASEO_AGENT_ID || input?.session_id;
  const start = event === 'session-start' || input?.hook_event_name === 'SessionStart';
  if (skipReason({ env, folder, record }) || !id || (!start && typeof input?.prompt !== 'string')) return none;
  const before = readState(folder, id);
  let state = before;
  let write = null;
  if (!start) {
    const move = moveFor(input?.prompt, before);
    if (!move && !before) {
      writeState(folder, id, { step: null, task: null, taskFrom: null, shown: null });
      return none;
    }
    if (move) {
      state = nextState(before, move);
      if (!state.task) {
        const task = hostTask(record) ?? clauseOf(input?.prompt);
        if (task) Object.assign(state, { task, taskFrom: hostTask(record) ? 'name' : 'prompt' });
      }
      if (titleOf(state) !== titleOf(before)) write = titleOf(state);
    }
  }
  const title = titleOf(state);
  const show = agent === 'claude' && title && (start || title !== state.shown);
  if (state !== before || show) writeState(folder, id, { ...state, shown: show ? title : state.shown });
  const hookEventName = start ? 'SessionStart' : 'UserPromptSubmit';
  return { out: show ? { hookSpecificOutput: { hookEventName, sessionTitle: title } } : null, write, top: folder.top };
}

/** Starts the Paseo and Codex writes in their own process, so the hook returns at once. */
function writeLater({ title, top, codexId, env }) {
  const args = [SELF, 'write', '--title', title, '--top', top, ...(codexId ? ['--codex', codexId] : [])];
  spawn(process.execPath, args, { env, detached: true, stdio: 'ignore' }).unref();
}

async function main() {
  const { values, positionals } = parseCli({
    usage: USAGE, allowPositionals: true,
    options: { task: { type: 'string' }, typed: { type: 'boolean' }, agent: { type: 'string' }, event: { type: 'string' },
      title: { type: 'string' }, top: { type: 'string' }, codex: { type: 'string' } },
  });
  const [command, step] = positionals;
  if (command === 'set') {
    if (!STEPS.includes(step) || positionals.length !== 2) usageError(USAGE, `expected one step: ${STEPS.join(', ')}`);
    let line;
    try { line = await setStep({ step, task: values.task, typed: values.typed }); } catch (error) { line = `STEP_TITLE=skipped ${error.message}`; }
    console.log(line);
  } else if (command === 'hook') {
    if (!['claude', 'codex'].includes(values.agent) || positionals.length !== 1) usageError(USAGE, 'expected --agent claude or codex');
    try {
      const input = JSON.parse(readFileSync(0, 'utf8') || 'null');
      const turn = hookTurn({ input, agent: values.agent, event: values.event });
      if (turn.out) console.log(JSON.stringify(turn.out));
      const codexId = values.agent === 'codex' ? input?.session_id || process.env.CODEX_THREAD_ID : process.env.CODEX_THREAD_ID;
      if (turn.write && (process.env.PASEO_AGENT_ID || codexId)) writeLater({ title: turn.write, top: turn.top, codexId, env: process.env });
    } catch { /* fail open: the message goes on with the name it has */ }
  } else if (command === 'write') {
    await writeHosts({ env: process.env, title: values.title, top: values.top, codexId: values.codex }).catch(() => {});
  } else usageError(USAGE, 'expected set or hook');
}

if (isMain(import.meta.url)) await main();
