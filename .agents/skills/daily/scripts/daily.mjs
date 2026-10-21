#!/usr/bin/env node
// /daily's fixed parts: who, which steps file, which workspaces opened today, the chief's watch and hands, reminders.
// The assistant judges which steps are due and what a stop needs; the script holds the limits a model could drift past.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { loadConfig, memoryOrigin, repoContext, signIn, signInHelp } from '../../memory/scripts/lib/store.mjs';
import { EXIT, PaseoError, findPaseo, paseo } from '../../schedule/scripts/lib/paseo.mjs';

const SKILL = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAUNCHER = join(SKILL, '..', 'schedule', 'scripts', 'workspace.mjs');
const MEMORY = join(SKILL, '..', 'memory', 'scripts', 'memory.mjs');
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const BUCKETS = ['keep-going', 'pick', 'person'];
// The chief's own actions in a row on one agent before the next stop goes to the person.
export const STREAK = 5;
const LAST_CHARS = 4000;
const USAGE = `usage: daily.mjs who
       daily.mjs opened [--day <YYYY-MM-DD>] [--email <address>]
       daily.mjs open --step <text> --title <name> --brief <file> [--day <YYYY-MM-DD>] [--email <address>]
       daily.mjs watch [--seconds 60] [--hours 10] [--once]
       daily.mjs hand --agent <id|title|workspace>
       daily.mjs reply --agent <id|title|workspace> --file <text file> --bucket keep-going|pick|person --label <line>
       daily.mjs answer --agent <id|title|workspace> --request <id> --file <text file> --bucket keep-going|pick|person --label <line>
       daily.mjs status
       daily.mjs remind --day <YYYY-MM-DD> --text <words>
       daily.mjs reminders [--day <YYYY-MM-DD>]
       daily.mjs done --id <fact id>
  (every command after open also takes --day and --email)`;

/** Today on this computer's clock, as YYYY-MM-DD. */
export function localDay(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const unquote = value => value.trim().replace(/^(['"])(.*)\1$/, '$2').trim().toLowerCase();

/** The `emails:` of a people file's frontmatter, lowercased: `[a, b]` or one `- a` line each. */
export function emailsOf(text) {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  const lines = front?.split(/\r?\n/) ?? [];
  const at = lines.findIndex(line => line.startsWith('emails:'));
  if (at < 0) return [];
  const inline = lines[at].replace(/^emails:/, '').trim();
  if (inline) return inline.replace(/^\[|\]$/g, '').split(',').map(unquote).filter(Boolean);
  const list = [];
  for (const line of lines.slice(at + 1)) {
    const item = line.match(/^\s*-\s*(.+)$/);
    if (!item) break;
    list.push(unquote(item[1]));
  }
  return list.filter(Boolean);
}

/** The people file whose `emails` holds this one, in any case, or null. */
export function personFile(dir, email) {
  if (!email || !existsSync(dir)) return null;
  const want = email.toLowerCase();
  const names = readdirSync(dir).filter(name => name.endsWith('.md')).sort();
  const name = names.find(file => emailsOf(readFileSync(join(dir, file), 'utf8')).includes(want));
  return name ? join(dir, name) : null;
}

function appOrigin(ctx) {
  try { return memoryOrigin(loadConfig(ctx)); } catch { return null; }
}

/** The person: the company sign-in when the install has the app, else the git email with `source: "git"`. */
export function who({ ctx, origin = appOrigin(ctx), signedIn = signIn, skillDir = SKILL } = {}) {
  let me;
  if (origin) {
    const found = signedIn(origin);
    const ok = found.state === 'valid' || found.state === 'near';
    me = { source: 'sign-in', state: found.state, email: found.email ?? null, origin, days: found.days ?? null, login: ok ? null : signInHelp(origin) };
  } else {
    const email = ctx.author || null;
    me = { source: 'git', state: email ? 'valid' : 'missing', email, origin: null, days: null, login: null };
  }
  const team = join(skillDir, 'team.md');
  return { ...me, team: existsSync(team) ? team : null, file: personFile(join(skillDir, 'people'), me.email) };
}

const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; } };
const writeJson = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const dayFile = (stateDir, day) => join(stateDir, `${day}.json`);
const readDay = (stateDir, day) => readJson(dayFile(stateDir, day), []);
const sameStep = step => step.trim().replace(/\s+/g, ' ');

/** The workspaces this person opened or handed over on `day`. */
export function opened({ stateDir, day, email }) {
  return readDay(stateDir, day).filter(entry => entry.email === email.toLowerCase());
}

/** Runs the workspace launcher and reads its JSON report. */
export function launchWorkspace({ title, brief, env }) {
  const run = spawnSync(process.execPath, [LAUNCHER, 'open', '--title', title, '--brief', brief], { env, encoding: 'utf8' });
  let report;
  try { report = JSON.parse(run.stdout); } catch { report = { ok: false, error: (run.stderr || run.stdout || '').trim() }; }
  return { ...report, code: run.status };
}

/** Opens one step's workspace once per person, step and day: `opened`, `already`, `unsupported` or `failed`. */
export function open({ stateDir, day, email, step, title, brief, env = process.env, launch = launchWorkspace, now = new Date() }) {
  const key = { email: email.toLowerCase(), step: sameStep(step) };
  const before = readDay(stateDir, day).find(entry => entry.email === key.email && entry.step === key.step);
  if (before) return { status: 'already', ...before };
  // Only a chat inside Paseo can open a workspace the person sees; elsewhere the step runs in the chat.
  if (!env.PASEO_AGENT_ID) return { status: 'unsupported', ...key, reason: 'This chat is not in Paseo.' };
  const result = launch({ title, brief, env });
  if (result.code === EXIT.noPaseo || result.code === EXIT.noDaemon) return { status: 'unsupported', ...key, reason: result.error };
  if (!result.ok) return { status: 'failed', ...key, error: result.error ?? 'The workspace did not open.' };
  const entry = { ...key, title, workspace: result.workspaceName ?? result.title ?? title, workspaceId: result.workspaceId ?? null, agentId: result.agentId ?? null, at: now.toISOString() };
  writeJson(dayFile(stateDir, day), [...readDay(stateDir, day), entry]);
  return { status: 'opened', ...entry };
}

// The chief of staff. The day file is the watch list: every row with an agent, minus the ones gone.
const watchFile = (stateDir, day) => join(stateDir, `${day}.watch.json`);
const actionsFile = (stateDir, day) => join(stateDir, `${day}.actions.jsonl`);
const unsupported = { status: 'unsupported', reason: 'This chat is not in Paseo, so it cannot watch other chats.' };

function watched({ stateDir, day, email }, gone = []) {
  const seen = new Set(gone);
  return opened({ stateDir, day, email }).filter(row => row.agentId && !seen.has(row.agentId) && seen.add(row.agentId));
}

/** The chief's logged actions on `day`, oldest first. */
export function actions({ stateDir, day }) {
  const file = actionsFile(stateDir, day);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}

/** The chief's own actions on one agent since the person's last word on it. */
export function streak(log, agentId) {
  let count = 0;
  for (const entry of [...log].reverse()) {
    if (entry.agent !== agentId) continue;
    if (entry.bucket === 'person') break;
    count++;
  }
  return count;
}

const describe = row => ({ agent: row.agentId, workspace: row.workspace ?? null, title: row.title ?? null });
const lowered = value => String(value ?? '').toLowerCase();

/** The watched row an id, id prefix, title or workspace name names, or null. */
function watchedRow(rows, name) {
  const want = lowered(name);
  return rows.find(row => row.agentId === name) ?? rows.find(row => row.agentId.startsWith(name))
    ?? rows.find(row => lowered(row.title) === want || lowered(row.workspace) === want) ?? null;
}

/** The listed agents a name means: its id, an id prefix, its title, or its workspace folder, in that order. */
export function findAgents(list, name) {
  const want = lowered(name);
  for (const match of [
    agent => agent.id === name,
    agent => name.length >= 4 && agent.id.startsWith(name),
    agent => lowered(agent.name) === want,
    agent => lowered(basename(String(agent.cwd ?? ''))) === want,
  ]) {
    const found = list.filter(match);
    if (found.length) return found;
  }
  return [];
}

// The agent's last message, or null: a stop counts even when its words can't be read.
async function lastMessage(call, agentId) {
  try { return String(await call(['logs', agentId, '--tail', '1', '--filter', 'text'])).slice(-LAST_CHARS); } catch { return null; }
}

// A failed Paseo call: `unsupported` when there is no Paseo at all, else a read that failed.
const notPaseo = error => error instanceof PaseoError && error.code === EXIT.noPaseo;

// Notices, never acts: a JSON line per asking, stopped, gone, not-read, end. A stop prints once per idle spell, which
// ends when the agent runs or the chief acts on it; `<day>.watch.json` keeps that across `--once` calls.
export async function watch({ stateDir, day, email, call, env = process.env, print = console.log, seconds = 60, hours = 10, once = false, now = () => Date.now(), sleep = ms => new Promise(done => setTimeout(done, ms)) }) {
  const line = event => print(JSON.stringify(event));
  if (!env.PASEO_AGENT_ID) { line({ event: 'unsupported', reason: unsupported.reason }); return; }
  const file = watchFile(stateDir, day);
  const start = now();
  for (;;) {
    const state = readJson(file, { agents: {}, gone: [], notRead: false });
    const rows = watched({ stateDir, day, email }, state.gone);
    if (!rows.length) { line({ event: 'end', reason: 'empty' }); return; }
    let list, pending;
    try {
      list = await call(['ls', '--global']);
      pending = await call(['permit', 'ls']);
      if (!Array.isArray(list) || !Array.isArray(pending)) throw new Error('Paseo did not return a list.');
      state.notRead = false;
    } catch (error) {
      if (notPaseo(error)) { line({ event: 'unsupported', reason: error.message }); return; }
      if (!state.notRead) line({ event: 'not-read', error: error.message });
      state.notRead = true;
    }
    if (list) {
      const log = actions({ stateDir, day });
      for (const row of rows) {
        const agent = list.find(entry => entry.id === row.agentId);
        if (!agent || agent.status === 'closed') {
          line({ event: 'gone', ...describe(row) });
          state.gone.push(row.agentId);
          delete state.agents[row.agentId];
          continue;
        }
        const seen = state.agents[row.agentId] ?? { idle: false, at: null, requests: [] };
        const asks = pending.filter(request => request.agentId === row.agentId);
        for (const request of asks.filter(ask => !seen.requests.includes(ask.id))) {
          line({ event: 'asking', ...describe(row), request: { id: request.id, name: request.name, description: request.description ?? null } });
        }
        seen.requests = asks.map(ask => ask.id);
        if (agent.status !== 'idle' && agent.status !== 'error') seen.idle = false;
        else if (!asks.length) {
          const actedSince = log.some(entry => entry.agent === row.agentId && seen.at && entry.at > seen.at);
          if (!seen.idle || actedSince) {
            const last = await lastMessage(call, row.agentId);
            line({ event: 'stopped', ...describe(row), status: agent.status, last });
            seen.idle = true;
            seen.at = new Date(now()).toISOString();
          }
        }
        state.agents[row.agentId] = seen;
      }
    }
    writeJson(file, state);
    if (once) return;
    if (now() - start >= hours * 3600e3) { line({ event: 'end', reason: 'time' }); return; }
    if (!watched({ stateDir, day, email }, state.gone).length) { line({ event: 'end', reason: 'empty' }); return; }
    await sleep(seconds * 1000);
  }
}

/** Adds a chat the person names to the watch list, once `paseo ls` finds it. */
export async function hand({ stateDir, day, email, agent: name, call, env = process.env, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const found = findAgents(await call(['ls', '--global']), name);
  if (!found.length) return { status: 'unknown', error: `No chat named ${name}: check its name in the app, or give its id.` };
  if (found.length > 1) return { status: 'ambiguous', error: `${name} names ${found.length} chats: give one id.`, agents: found.map(agent => ({ agent: agent.id, title: agent.name })) };
  const [agent] = found;
  if (agent.id === env.PASEO_AGENT_ID) return { status: 'refused', error: 'That is this chat.' };
  const before = watched({ stateDir, day, email }).find(row => row.agentId === agent.id);
  if (before) return { status: 'already', ...before };
  const entry = { email: email.toLowerCase(), step: `hand: ${agent.id}`, title: agent.name ?? name, workspace: basename(String(agent.cwd ?? '')) || null, workspaceId: null, agentId: agent.id, source: 'handed', at: now.toISOString() };
  writeJson(dayFile(stateDir, day), [...readDay(stateDir, day), entry]);
  return { status: 'handed', ...entry };
}

function readText(file) {
  try { return readFileSync(file, 'utf8').trim(); } catch (error) { return { error: `Cannot read ${file}: ${error.code ?? error.message}.` }; }
}

// What reply and answer share: a watched agent, a readable message, and room left in the streak.
async function handFor({ stateDir, day, email, agent: name, file, bucket, label, env, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return { refused: unsupported };
  const row = watchedRow(watched({ stateDir, day, email }), name);
  if (!row) return { refused: { status: 'refused', reason: 'unwatched', error: `${name} is not a chat /daily started or was handed, so the chief leaves it alone.` } };
  const text = readText(file);
  if (typeof text !== 'string' || !text) return { refused: { status: 'refused', reason: 'message', error: text?.error ?? `${file} is empty.` } };
  if (bucket !== 'person' && streak(actions({ stateDir, day }), row.agentId) >= STREAK) {
    return { refused: { status: 'refused', reason: 'streak', ...describe(row), error: `${STREAK} actions in a row on ${row.title} with no word from the person: tell the person instead.` } };
  }
  const log = entry => {
    const action = { at: now.toISOString(), email: email.toLowerCase(), ...describe(row), bucket, label, ...entry };
    mkdirSync(stateDir, { recursive: true });
    appendFileSync(actionsFile(stateDir, day), `${JSON.stringify(action)}\n`);
    return action;
  };
  return { row, text, log };
}

/** Sends a watched, stopped agent one message, and logs it. */
export async function reply({ call, env = process.env, ...args }) {
  const { refused, row, log } = await handFor({ ...args, env });
  if (refused) return refused;
  const agent = (await call(['ls', '--global'])).find(entry => entry.id === row.agentId);
  if (!agent) return { status: 'refused', reason: 'gone', ...describe(row), error: `${row.title} is gone.` };
  if (agent.status === 'running') return { status: 'refused', reason: 'running', ...describe(row), error: `${row.title} is working; wait for it to stop.` };
  await call(['send', row.agentId, '--prompt-file', args.file, '--no-wait']);
  return { status: 'sent', ...log({ kind: 'reply' }) };
}

// Answers a watched agent's pending card and logs it. The CLI hides the question `permit allow --input` keys by, so the
// answer rides on a denial's message, which the agent goes on with (design decision 13); a card keeps it `running`.
export async function answer({ call, env = process.env, request, ...args }) {
  const { refused, row, text, log } = await handFor({ ...args, env });
  if (refused) return refused;
  const asks = (await call(['permit', 'ls'])).filter(ask => ask.agentId === row.agentId);
  const ask = asks.find(entry => entry.id === request) ?? asks.find(entry => entry.id.startsWith(request));
  if (!ask) return { status: 'refused', reason: 'request', ...describe(row), error: `${row.title} has no pending request ${request}.` };
  await call(['permit', 'deny', row.agentId, ask.id, '--message', `Answer: ${text}`]);
  return { status: 'answered', ...log({ kind: 'answer', request: ask.id }) };
}

/** Each watched agent with its live status, pending requests and the chief's last action on it. */
export async function status({ stateDir, day, email, call, env = process.env }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const rows = opened({ stateDir, day, email }).filter(row => row.agentId);
  let list, pending;
  try {
    list = await call(['ls', '--global']);
    pending = await call(['permit', 'ls']);
  } catch (error) {
    return notPaseo(error) ? unsupported : { state: 'not-read', error: error.message };
  }
  const log = actions({ stateDir, day });
  return {
    state: 'read',
    agents: rows.map(row => ({
      ...describe(row),
      source: row.source ?? 'step',
      status: list.find(entry => entry.id === row.agentId && entry.status !== 'closed')?.status ?? 'gone',
      asking: pending.filter(ask => ask.agentId === row.agentId).length,
      last: log.filter(entry => entry.agent === row.agentId).at(-1) ?? null,
    })),
  };
}

// Reminders: private memory facts (`user`, tag `reminder`), so a teammate never sees one and upkeep never closes one.
const REMINDER = /^Reminder for (\d{4}-\d{2}-\d{2}):\s*([\s\S]*)$/;
const SLUG = 'daily-routine';
// Sent with every write: the store keeps a tag it already has, and makes it on first use.
const NEW_TAGS = [{ name: 'reminder', definition: "A dated reminder a person asked /daily to keep; private to them, listed each /daily from its date until done." }];

/** Runs memory.mjs with `input` on stdin. */
export function runMemory(args, input) {
  const run = spawnSync(process.execPath, [MEMORY, ...args], { input, encoding: 'utf8' });
  return { code: run.status, stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
}

function searchFacts(memory, args) {
  const run = memory(['search', ...args, '--json']);
  if (run.code !== 0) throw new Error((run.stderr || run.stdout).trim() || `memory search exited ${run.code}`);
  const text = run.stdout.trim();
  const json = JSON.parse(text.startsWith('{') ? text : text.split('\n').filter(line => line.startsWith('{')).at(-1));
  return json.facts ?? [];
}

const mine = (fact, authors) => !fact.author || authors.includes(lowered(fact.author));
const ownReminders = (memory, authors) => searchFacts(memory, ['--tag', 'reminder', '--type', 'user', '--limit', '200'])
  .map(fact => ({ fact, parts: fact.body.match(REMINDER) })).filter(({ fact, parts }) => parts && mine(fact, authors))
  .map(({ fact, parts }) => ({ id: fact.id, day: parts[1], text: parts[2].trim() }));

function putFacts(memory, facts) {
  const run = memory(['put-facts', '--file', '-'], JSON.stringify({ slug: SLUG, newTags: NEW_TAGS, facts }));
  if (run.code !== 0) return { state: 'failed', error: (run.stderr || run.stdout).trim() || `memory put-facts exited ${run.code}` };
  if (/^spooled:/m.test(run.stdout)) return { state: 'spooled', note: 'The store did not answer; it is kept here and sent at the next chat start.' };
  return { state: 'saved' };
}

/** Saves one private reminder for `day`. */
export function remind({ day, text, memory = runMemory }) {
  const words = String(text ?? '').trim();
  if (!DAY.test(day ?? '')) return { state: 'refused', error: 'The reminder needs its day as YYYY-MM-DD.' };
  if (!words) return { state: 'refused', error: 'The reminder needs its words.' };
  return { ...putFacts(memory, [{ type: 'user', body: `Reminder for ${day}: ${words}`, tags: ['reminder'] }]), day, text: words };
}

/** The person's reminders due on or before `day`, oldest first, and their newest 5 open threads. */
export function reminders({ day, authors, memory = runMemory }) {
  try {
    const due = ownReminders(memory, authors).filter(reminder => reminder.day <= day)
      .sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id)
      .map(reminder => ({ ...reminder, overdue: reminder.day < day }));
    const open = searchFacts(memory, ['--type', 'thread', '--author', authors[0], '--limit', '5'])
      .filter(fact => mine(fact, authors)).slice(0, 5).map(fact => ({ id: fact.id, slug: fact.slug, body: fact.body, at: fact.created_at }));
    return { state: 'read', day, due, open };
  } catch (error) {
    return { state: 'not-read', error: error.message };
  }
}

/** Marks one of the person's reminders done, superseding it. */
export function done({ id, day, authors, memory = runMemory }) {
  let found;
  try { found = ownReminders(memory, authors).find(reminder => reminder.id === Number(id)); } catch (error) { return { state: 'not-read', error: error.message }; }
  if (!found) return { state: 'refused', error: `No open reminder of yours has id ${id}.` };
  return { ...putFacts(memory, [{ type: 'user', action: 'supersede', supersedes: [found.id], body: `Done ${day}: ${found.text}`, tags: ['reminder'] }]), id: found.id, text: found.text };
}

/** The Paseo CLI, one `--json` call at a time. */
export function paseoCalls(env) {
  let bin;
  return args => { bin ??= findPaseo(env, 'DAILY_PASEO_BIN'); return paseo(bin, args, { env }); };
}

// A store or Paseo that did not answer is news for the reply, not a failed command.
const OK = new Set(['opened', 'already', 'unsupported', 'handed', 'sent', 'answered', 'read', 'not-read', 'saved', 'spooled']);
const OPTIONS = {
  who: {},
  opened: {},
  open: { step: { type: 'string' }, title: { type: 'string' }, brief: { type: 'string' } },
  watch: { seconds: { type: 'string' }, hours: { type: 'string' }, once: { type: 'boolean' } },
  hand: { agent: { type: 'string' } },
  reply: { agent: { type: 'string' }, file: { type: 'string' }, bucket: { type: 'string' }, label: { type: 'string' } },
  answer: { agent: { type: 'string' }, request: { type: 'string' }, file: { type: 'string' }, bucket: { type: 'string' }, label: { type: 'string' } },
  status: {},
  remind: { text: { type: 'string' } },
  reminders: {},
  done: { id: { type: 'string' } },
};

/** The command line. Resolves to the exit code; `deps` stand in for the sign-in, launcher, Paseo and memory. */
export async function main(argv = process.argv.slice(2), { env = process.env, signedIn, launch, call, memory, print = console.log } = {}) {
  const [command, ...args] = argv;
  if (command === '--help') { print(USAGE); return 0; }
  const options = OPTIONS[command];
  if (!options) usageError(USAGE, command ? `unknown command ${command}` : 'name a command');
  const { values } = parseCli({ usage: USAGE, options: command === 'who' ? {} : { ...options, day: { type: 'string' }, email: { type: 'string' } }, args });
  const ctx = repoContext();
  const out = value => { print(JSON.stringify(value, null, 2)); return OK.has(value.status ?? value.state) ? 0 : 1; };
  if (command === 'who') { print(JSON.stringify(who({ ctx, signedIn }), null, 2)); return 0; }
  const day = values.day ?? localDay();
  if (!DAY.test(day)) usageError(USAGE, '--day takes YYYY-MM-DD');
  const need = flags => { for (const flag of flags) if (!values[flag]?.trim()) usageError(USAGE, `${command} needs --${flag}`); };
  if (command === 'remind') need(['day', 'text']);
  if (command === 'done') need(['id']);
  if (command === 'open') need(['step', 'title', 'brief']);
  if (command === 'hand') need(['agent']);
  if (command === 'reply' || command === 'answer') {
    need(['agent', 'file', 'bucket', 'label', ...(command === 'answer' ? ['request'] : [])]);
    if (!BUCKETS.includes(values.bucket)) usageError(USAGE, `--bucket takes ${BUCKETS.join(', ')}`);
  }
  for (const flag of ['seconds', 'hours']) if (values[flag] !== undefined && !(Number(values[flag]) > 0)) usageError(USAGE, `--${flag} takes a positive number`);
  let email = values.email;
  if (!email) {
    const me = who({ ctx, signedIn });
    if (!me.email || !['valid', 'near'].includes(me.state)) return out({ ok: false, status: 'signed-out', error: `Not signed in: ${me.login ?? 'set an email with git config user.email'}.` });
    email = me.email;
  }
  const stateDir = join(ctx.commonDir, 'wong-daily');
  const at = { stateDir, day, email, env };
  const paseoCall = call ?? paseoCalls(env);
  // The store signs a fact with the git email first, so a search by author tries that one first.
  const authors = [...new Set([ctx.author, email].filter(Boolean).map(lowered))];
  try {
    switch (command) {
      case 'opened': print(JSON.stringify(opened(at), null, 2)); return 0;
      case 'open': return out(open({ ...at, step: values.step, title: values.title, brief: values.brief, launch }));
      case 'watch': await watch({ ...at, call: paseoCall, print, seconds: Number(values.seconds ?? 60), hours: Number(values.hours ?? 10), once: Boolean(values.once) }); return 0;
      case 'hand': return out(await hand({ ...at, agent: values.agent, call: paseoCall }));
      case 'reply': return out(await reply({ ...at, call: paseoCall, agent: values.agent, file: values.file, bucket: values.bucket, label: values.label }));
      case 'answer': return out(await answer({ ...at, call: paseoCall, agent: values.agent, request: values.request, file: values.file, bucket: values.bucket, label: values.label }));
      case 'status': return out(await status({ ...at, call: paseoCall }));
      case 'remind': return out(remind({ day, text: values.text, memory }));
      case 'reminders': return out(reminders({ day, authors, memory }));
      default: return out(done({ id: values.id, day, authors, memory }));
    }
  } catch (error) {
    if (!(error instanceof PaseoError)) throw error;
    return out(notPaseo(error) ? unsupported : { status: 'failed', error: error.message });
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
