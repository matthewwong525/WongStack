#!/usr/bin/env node
// A chat's name starts with its step or typed command: wiki/development/the-change-loop.md#what-each-step-may-change.
// One file per chat keeps the step and task words; every host it can reach gets the whole name `<STEP>: <task>`.
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../skills/memory/scripts/lib/cli.mjs';
import { LOOP_STEPS, STEPS, skillStep, withoutStep } from '../skills/daily/scripts/chats.mjs';
import { paseoRecord } from '../skills/daily/scripts/chief.mjs';
import { findPaseo, runPaseo } from '../skills/daily/scripts/lib/paseo.mjs';
import { PLACEHOLDERS, renameArgs } from '../skills/daily/skills/schedule/scripts/workspace.mjs';

const USAGE = `usage: step-title.mjs set <STEP> [--task <words>]   a skill moves this chat to STEP
--task words, cut at a word to 60 characters, replace the earlier ones unless the person renamed the chat in Paseo.
       step-title.mjs hook --agent claude|codex [--event session-start]   a hook; reads the hook JSON on stdin
STEP is one of EXPLORE, PLAN, APPLY, SHIP, DONE. The hook gives a step only for a typed command: /explore EXPLORE,
/plan or /improve-code PLAN, another repo skill its name in capitals (/verify VERIFY, /schedule SCHEDULE); /apply, /ship none.
Always exits 0 and prints STEP_TITLE=<title> or STEP_TITLE=skipped <reason>.`;

export { STEPS, withoutStep };
const VERBS = new Set(Object.keys(LOOP_STEPS));
const SKILL = /^[/$]([a-z][a-z0-9:-]*)(?=\s|$)/;
const BRANCH = /^[a-z0-9]+(-[a-z0-9]+)+$/;
const RUN_FLAGS = ['WONG_DAILY_RUN', 'WONG_MEMORY_RUN', 'WONG_STOP_CHECK'];
const TASK_MAX = 60;
const SELF = fileURLToPath(import.meta.url);

/** What a message starts with: `{ loop: true }` for a loop verb, `{ other: true }` for another skill, else `{}`. */
export function verbOf(prompt) {
  const name = SKILL.exec(String(prompt ?? '').trim())?.[1];
  if (!name) return {};
  return VERBS.has(name) ? { loop: true } : { other: true };
}

/** A typed command's step: a loop verb's own, or another repo skill's name in capitals minus `wong-`; else null. */
export function commandStep(prompt, top) {
  const name = SKILL.exec(String(prompt ?? '').trim())?.[1];
  if (!name) return null;
  if (VERBS.has(name)) return LOOP_STEPS[name];
  return top && !name.includes(':') && existsSync(join(top, '.claude', 'skills', name, 'SKILL.md')) ? skillStep(name) : null;
}

const squash = text => String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** True when a host name is a copy of the start of the message, as Paseo names a chat from its first message. */
export function copiedName(name, prompt) {
  const start = squash(name).replace(/(?:…|\.\.\.)$/, '').trim();
  return Boolean(start) && squash(prompt).startsWith(start);
}

/** Words that name a task, or null for a branch-like name or a placeholder. */
export function goodTask(raw) {
  const words = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!words || BRANCH.test(words) || PLACEHOLDERS.has(words.toLowerCase().replace(/[-_\s]+/g, ' '))) return null;
  return words;
}

/** Task words cut at a word to TASK_MAX characters, with no trailing comma, colon, dash, or `and`. */
export function cutWords(text) {
  let words = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (words.length > TASK_MAX) words = words.slice(0, TASK_MAX + 1).replace(/\s+\S*$/, '').slice(0, TASK_MAX);
  return words.replace(/(?:[\s,:;–—-]|\sand)+$/i, '');
}

/** The first clause of a message, its step verb removed, cut by `cutWords`. */
export function clauseOf(prompt) {
  const text = String(prompt ?? '').trim().replace(SKILL, '').trim();
  const clause = cutWords(text.split(/\n|[.?!;](?:\s|$)/)[0]);
  return goodTask(clause && clause.charAt(0).toUpperCase() + clause.slice(1));
}

/** The next state: any step, back as well as forward; given task words replace any but a name the person gave. */
export function nextState(state, { step, task = null }) {
  const given = goodTask(cutWords(task));
  const keep = state?.task && !(given && state.taskFrom !== 'person');
  return {
    step, task: keep ? state.task : given, taskFrom: keep ? state.taskFrom : given && 'task',
    shown: state?.shown ?? null, seen: state?.seen ?? null,
  };
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

/** The task words from the host's name: Paseo's chat name, minus a step word. */
const hostTask = record => goodTask(cutWords(withoutStep(record?.title)));
const sameWords = title => squash(withoutStep(title));

/** A Paseo name that is none of the names this chat had or wrote: the person's, kept as the task from now on. */
export function adoptRename(state, record) {
  const title = record?.title;
  if (!state?.seen || !title || state.seen.some(each => sameWords(each) === sameWords(title))) return state;
  const task = hostTask(record);
  return task ? { ...state, task, taskFrom: 'person' } : state;
}

/** The state with titles added to `seen`; a state with none starts it from the host's name. */
const withSeen = (state, record, title) =>
  ({ ...state, seen: [...new Set([...(state.seen ?? [record?.title]), title].filter(Boolean))] });

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
export async function setStep({ step, task, env = process.env, cwd = process.cwd(), home = homedir() }) {
  const folder = folderOf(cwd);
  const record = paseoRecord(env.PASEO_AGENT_ID, home);
  const skip = skipReason({ env, folder, record });
  const id = chatId(env);
  if (skip || !id) return `STEP_TITLE=skipped ${skip ?? 'no chat id'}`;
  const before = adoptRename(readState(folder, id), record);
  const next = nextState(before, { step, task });
  // A state with no task means the hook refused the host's name, as a copy or a command.
  if (!before && !next.task && hostTask(record)) Object.assign(next, { task: hostTask(record), taskFrom: 'name' });
  const title = titleOf(next);
  writeState(folder, id, withSeen(next, record, title));
  if (!title) return 'STEP_TITLE=skipped no task words';
  const failed = await writeHosts({ env, title, top: folder.top, codexId: env.CODEX_THREAD_ID });
  const reached = Boolean(env.PASEO_AGENT_ID) + Boolean(env.CODEX_THREAD_ID);
  if (reached && failed.length === reached) return `STEP_TITLE=skipped ${failed.join('; ')}`;
  return [`STEP_TITLE=${title}`, ...failed.map(reason => `STEP_TITLE_WARNING=${reason}`)].join('\n');
}

/** The hook's state: only a typed repo command gives a step. With no task words yet, take the host's name unless it
 * copies the message or a command, else the first clause. /compact changes nothing. */
function stateFor(prompt, before, record, top) {
  const { loop, other } = verbOf(prompt);
  const step = commandStep(prompt, top);
  if ((other && !step) || (before && !loop && !other)) return before;
  const base = before ?? { step: null, task: null, taskFrom: null, shown: null, seen: null };
  const next = { ...base, step: step ?? base.step };
  if (base.task) return next.step === base.step ? before : next;
  const name = hostTask(record);
  const own = name && !copiedName(name, prompt) && !SKILL.test(name) ? name : null;
  const task = own ?? clauseOf(prompt);
  return { ...next, task, taskFrom: task && (own ? 'name' : 'prompt') };
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
  const adopted = adoptRename(before, record);
  let state = adopted;
  let write = null;
  if (!start) {
    state = stateFor(input?.prompt, adopted, record, folder.top);
    if (titleOf(state) !== titleOf(adopted)) write = titleOf(state);
    if (write) state = withSeen(state, record, write);
  }
  // The person renamed the chat: a start or a plain message shows no step title over their name.
  if (!write && adopted !== before) state = { ...state, shown: titleOf(state) };
  const title = titleOf(state);
  const show = agent === 'claude' && title && ((start && adopted === before) || title !== state.shown);
  if (state !== before || show) writeState(folder, id, { ...state, shown: show ? title : state.shown });
  const hookEventName = start ? 'SessionStart' : 'UserPromptSubmit';
  return { out: show ? { hookSpecificOutput: { hookEventName, sessionTitle: title } } : null, write, top: folder.top };
}

/** Starts the Paseo and Codex writes in their own process, so the hook returns at once. */
function writeLater({ title, top, codexId, env }) {
  const args = [SELF, 'write', '--top', top, '--title', title, ...(codexId ? ['--codex', codexId] : [])];
  spawn(process.execPath, args, { env, detached: true, stdio: 'ignore' }).unref();
}

async function main() {
  const { values, positionals } = parseCli({
    usage: USAGE, allowPositionals: true,
    options: { task: { type: 'string' }, agent: { type: 'string' }, event: { type: 'string' },
      title: { type: 'string' }, top: { type: 'string' }, codex: { type: 'string' } },
  });
  const [command, step] = positionals;
  if (command === 'set') {
    if (!STEPS.includes(step) || positionals.length !== 2) usageError(USAGE, `expected one step: ${STEPS.join(', ')}`);
    let line;
    try { line = await setStep({ step, task: values.task }); } catch (error) { line = `STEP_TITLE=skipped ${error.message}`; }
    console.log(line);
  } else if (command === 'hook') {
    if (!['claude', 'codex'].includes(values.agent) || positionals.length !== 1) usageError(USAGE, 'expected --agent claude or codex');
    try {
      const input = JSON.parse(readFileSync(0, 'utf8') || 'null');
      const turn = hookTurn({ input, agent: values.agent, event: values.event });
      if (turn.out) console.log(JSON.stringify(turn.out));
      const codexId = values.agent === 'codex' ? input?.session_id || process.env.CODEX_THREAD_ID : process.env.CODEX_THREAD_ID;
      const title = turn.write && (process.env.PASEO_AGENT_ID || codexId) ? turn.write : null;
      if (title) writeLater({ title, top: turn.top, codexId, env: process.env });
    } catch { /* fail open: the message goes on with the name it has */ }
  } else if (command === 'write') {
    if (values.title) await writeHosts({ env: process.env, title: values.title, top: values.top, codexId: values.codex }).catch(() => {});
  } else usageError(USAGE, 'expected set or hook');
}

if (isMain(import.meta.url)) await main();
