#!/usr/bin/env node
// /daily's fixed parts: who, which steps file, which workspaces opened today, the chief's watch and hands, reminders.
// The assistant judges which steps are due and what a stop needs; the script holds the limits a model could drift past.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { loadConfig, memoryOrigin, repoContext, signIn, signInHelp } from '../../memory/scripts/lib/store.mjs';
import { EXIT, PaseoError, findPaseo, paseo } from '../../schedule/scripts/lib/paseo.mjs';
import { closeInboxItem, openInboxItem } from '../../hand-over/scripts/reply-link.mjs';
import { companyFor } from '../../hand-over/scripts/lib/inbox.mjs';
import { chatTarget } from '../../hand-over/scripts/lib/wake.mjs';

const SKILL = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAUNCHER = join(SKILL, '..', 'schedule', 'scripts', 'workspace.mjs');
const MEMORY = join(SKILL, '..', 'memory', 'scripts', 'memory.mjs');
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const BUCKETS = ['keep-going', 'pick', 'person'];
// The chief's own actions in a row on one agent before the next stop goes to the person.
export const STREAK = 5;
const LAST_CHARS = 4000;
// How long the morning waits for plans after the first planning agent opened.
const PLAN_MS = 15 * 60e3;
// A done card stays until the next day's watch clears it.
const STATUS_HOURS = 36;
const USAGE = `usage: daily.mjs who
       daily.mjs opened [--day <YYYY-MM-DD>] [--email <address>]
       daily.mjs open --step <text> --title <name> --brief <file> [--plan-first] [--day <YYYY-MM-DD>] [--email <address>]
       daily.mjs watch [--seconds 60] [--hours 10] [--once]
       daily.mjs hand --agent <id|title|workspace>
       daily.mjs close --agent <id|title|workspace>
       daily.mjs reply --agent <id|title|workspace> --file <text file> --bucket keep-going|pick|person --label <line>
       daily.mjs answer --agent <id|title|workspace> --request <id> --file <text file> --bucket keep-going|pick|person --label <line>
       daily.mjs status
       daily.mjs inbox add --kind approval|question --agent <name> --title <line> --file <JSON {text, options?, multi?}> [--request <id>]
       daily.mjs inbox add --kind start --agent <name>
       daily.mjs start --agent <id|title|workspace> [--choice go|skip] [--file <note and answers>]
       daily.mjs done-agent --agent <id|title|workspace> --proof <text>
       daily.mjs inbox close --id <item id>
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
const writeText = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
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

// The brief's sixth part: the script names the plan's file and shape, so a plan is checked by code, not judged.
const planFirst = file => `\n\n## Plan first\n\nRead only for now: change, save, send or pay for nothing. Write your plan as JSON to ${file}:
{"willDo": ["…"], "needs": ["…"], "askFirst": ["…"], "questions": [{"text": "…", "options": ["…"], "several": true}]}
willDo is what you will do; needs, what you need from the person; askFirst, what you will ask before you act outside your
own work; questions, what you need answered now (options and several are optional). Each list holds up to 6 lines of up
to 300 characters. Then stop, and wait for Go.\n`;

/** Opens one step's workspace once per person, step and day: `opened`, `already`, `unsupported` or `failed`. With
 *  `plan`, the agent first writes its plan to `<day>.plans/<n>.json` and stops. */
export function open({ stateDir, day, email, step, title, brief, plan = false, env = process.env, launch = launchWorkspace, now = new Date() }) {
  const key = { email: email.toLowerCase(), step: sameStep(step) };
  const before = readDay(stateDir, day).find(entry => entry.email === key.email && entry.step === key.step && !entry.closed);
  if (before) return { status: 'already', ...before };
  // Only a chat inside Paseo can open a workspace the person sees; elsewhere the step runs in the chat.
  if (!env.PASEO_AGENT_ID) return { status: 'unsupported', ...key, reason: 'This chat is not in Paseo.' };
  const paths = plan ? plansAt(stateDir, day, readDay(stateDir, day).length + 1) : null;
  if (paths) {
    const text = readText(brief);
    if (typeof text !== 'string') return { status: 'failed', ...key, error: text.error };
    writeText(paths.brief, `${text}${planFirst(paths.plan)}`);
  }
  const result = launch({ title, brief: paths?.brief ?? brief, env });
  if (result.code === EXIT.noPaseo || result.code === EXIT.noDaemon) return { status: 'unsupported', ...key, reason: result.error };
  if (!result.ok) return { status: 'failed', ...key, error: result.error ?? 'The workspace did not open.' };
  const entry = { ...key, title, workspace: result.workspaceName ?? result.title ?? title, workspaceId: result.workspaceId ?? null, agentId: result.agentId ?? null, at: now.toISOString(),
    ...(result.cwd && { folder: basename(result.cwd) }), ...(paths && { phase: 'planning', plan: paths.plan }) };
  writeJson(dayFile(stateDir, day), [...readDay(stateDir, day), entry]);
  return { status: 'opened', ...entry };
}

const plansAt = (stateDir, day, n) => ({ brief: join(stateDir, `${day}.plans`, `${n}.md`), plan: join(stateDir, `${day}.plans`, `${n}.json`) });
const short = (value, max) => typeof value === 'string' && value.trim() !== '' && value.length <= max;
const only = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
const lines = value => Array.isArray(value) && value.length <= 6 && value.every(line => short(line, 300));
const question = ask => only(ask, ['text', 'options', 'several']) && short(ask.text, 2000) && (ask.options === undefined || lines(ask.options))
  && [undefined, true, false].includes(ask.several);

/** The plan an agent wrote, `{willDo, needs, askFirst, questions}` within the inbox's limits, or null. */
export function planOf(file) {
  const plan = file ? readJson(file, null) : null;
  const sound = only(plan, ['willDo', 'needs', 'askFirst', 'questions']) && ['willDo', 'needs', 'askFirst'].every(key => lines(plan[key]))
    && Array.isArray(plan.questions) && plan.questions.length <= 6 && plan.questions.every(question);
  return sound ? plan : null;
}

/** Writes `patch` onto one person's row of the day file. */
function setRow(stateDir, day, row, patch) {
  writeJson(dayFile(stateDir, day), readDay(stateDir, day).map(entry => (entry.email === row.email && entry.agentId === row.agentId ? { ...entry, ...patch } : entry)));
}

// The chief of staff. The day file is the watch list: every row with an agent, minus the ones gone.
const watchFile = (stateDir, day) => join(stateDir, `${day}.watch.json`);
const actionsFile = (stateDir, day) => join(stateDir, `${day}.actions.jsonl`);
const unsupported = { status: 'unsupported', reason: 'This chat is not in Paseo, so it cannot watch other chats.' };

function watched({ stateDir, day, email }, gone = []) {
  const seen = new Set(gone);
  return opened({ stateDir, day, email }).filter(row => row.agentId && !row.closed && !seen.has(row.agentId) && seen.add(row.agentId));
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

// The inbox: approvals and Needs-you questions wait in the live app for the person, and a tap wakes this chat.
const inboxFile = (stateDir, day) => join(stateDir, `${day}.inbox.json`);
const KINDS = ['approval', 'question', 'start'];
// `off`: no company sign-in, so no later pass can reach the inbox either.
const INBOX = { open: openInboxItem, close: closeInboxItem, off: async () => !(await companyFor()) };
// One item per day, agent and kind, so a second add or a status pass replaces it.
const itemIdOf = (day, agentId, kind) => createHash('sha256').update(`${day}:${agentId}:${kind}`).digest('hex').slice(0, 32);
// The agent's own folder, which the items it sends itself carry, so the inbox shows them on one card.
const folderOf = row => row.folder ?? row.workspace ?? undefined;
const headerOf = (title, agent) => `Inbox answer for ${title} (${agent}):`;

/** The words an item asks, `{text, options?, multi?}`, or null outside the inbox's limits. */
function detailOf(file) {
  const detail = readJson(file, null);
  const options = detail?.options;
  const sound = short(detail?.text, 2000) && (options === undefined || (Array.isArray(options) && options.length <= 6 && options.every(option => short(option, 300))));
  const keys = ['text', 'options', 'multi'];
  return sound && [undefined, true].includes(detail.multi) && Object.keys(detail).every(key => keys.includes(key)) ? detail : null;
}

// Each item this day's chief added, as `{id, agent, at, request?, title}`; an older file held bare ids.
const inboxItems = (stateDir, day) => readJson(inboxFile(stateDir, day), []).map(item => (typeof item === 'string' ? { id: item } : item));

/** A planning agent's start card: `ready` with its plan, else still `planning` or `no-plan`. */
function startOf(stateDir, day, row) {
  const plan = planOf(row.plan);
  if (plan) return { state: 'ready', plan };
  return { state: readJson(watchFile(stateDir, day), { agents: {} }).agents?.[row.agentId]?.plan === 'no-plan' ? 'no-plan' : 'planning' };
}

/** Puts an approval, a question or a planning agent's start card in the person's inbox, aimed at this chat, on the
 *  agent's card; `unavailable` where the inbox is off. */
export async function inboxAdd({ stateDir, day, email, env = process.env, kind, agent, title, file, request, cwd = process.cwd(), inbox = INBOX, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const row = watchedRow(watched({ stateDir, day, email }), agent);
  const starts = kind === 'start';
  if (starts && row?.phase !== 'planning') return { status: 'refused', reason: 'planning', error: `${agent} is not a watched agent waiting on its Go.` };
  if (starts && row.held) return { status: 'refused', reason: 'chosen', error: `${row.title} already has the person's answer; it goes at its next stop.` };
  const detail = starts ? startOf(stateDir, day, row) : detailOf(file);
  if (!detail) return { status: 'refused', reason: 'file', error: `${file} needs {"text": "…"} with up to 6 "options".` };
  const name = String(title ?? row.title).slice(0, 200);
  const header = headerOf(name, row?.agentId ?? agent);
  const actions = { approval: { approve: `${header} Approve`, decline: `${header} Decline` }, start: { go: `${header} Go`, skip: `${header} Not today` } }[kind] ?? {};
  const item = await inbox.open({ kind, title: name, body: JSON.stringify(detail), header, actions, hours: 10, target: chatTarget(env, cwd), cwd,
    ...(row && { workspace: folderOf(row) }), ...(starts && { id: itemIdOf(day, row.agentId, kind) }) }, { env });
  if (!item) return { status: 'unavailable', reason: 'The inbox did not answer: ask in this chat.' };
  const entry = { id: item.id, agent: row?.agentId ?? null, at: now.toISOString(), ...(request && { request }), title: name, ...(starts && { kind }) };
  writeJson(inboxFile(stateDir, day), [...inboxItems(stateDir, day).filter(kept => kept.id !== item.id), entry]);
  return { status: 'added', id: item.id, link: item.link };
}

/** Closes one item this day's chief added. */
export async function inboxClose({ stateDir, day, env = process.env, id, inbox = INBOX }) {
  const items = inboxItems(stateDir, day);
  if (!items.some(item => item.id === id)) return { status: 'refused', reason: 'unknown', error: `No inbox item ${id} today.` };
  await inbox.close(id, { env });
  writeJson(inboxFile(stateDir, day), items.filter(item => item.id !== id));
  return { status: 'closed', id };
}

/** Closes every item this day's chief added: the watch that relays their answers has ended. */
async function closeInbox({ stateDir, day, env, inbox }) {
  const items = inboxItems(stateDir, day);
  for (const { id } of items) await inbox.close(id, { env });
  if (items.length) writeJson(inboxFile(stateDir, day), []);
}

// An item answered in its own chat: the chief sent its agent nothing since, and its card left or its stop ended.
// A reply quicker than a round leaves the agent idle again, so a new last message counts as the stop ending.
async function answeredElsewhere(item, { list, pending, log, seen, call }) {
  if (item.kind === 'start' || !item.agent || log.some(action => action.agent === item.agent && action.at > item.at)) return false;
  if (item.request) return !pending.some(ask => ask.id === item.request);
  const status = list.find(agent => agent.id === item.agent)?.status;
  if (status === 'running') return true;
  const before = seen[item.agent]?.last;
  if (!status || typeof before !== 'string') return false;
  const last = await lastMessage(call, item.agent);
  return last !== null && last !== before;
}

// A planning agent's stop: `planned` once its plan is sound, else `stopped` for one nudge, then `no-plan`.
async function planningStop(row, seen, { status, call }) {
  if (seen.plan === 'planned') return null;
  if (planOf(row.plan)) { seen.plan = 'planned'; return { event: 'planned', ...describe(row), plan: row.plan }; }
  if (seen.plan) return null;
  seen.stops = (seen.stops ?? 0) + 1;
  if (seen.stops > 1) { seen.plan = 'no-plan'; return { event: 'no-plan', ...describe(row) }; }
  const last = await lastMessage(call, row.agentId);
  if (last !== null) seen.last = last;
  return { event: 'stopped', ...describe(row), status, last, phase: 'planning', plan: row.plan };
}

/** `plans-ready` once a day: every planning agent planned or has none, or `PLAN_MS` after the first one opened. */
function plansReady(state, rows, now) {
  const planning = rows.filter(row => row.phase === 'planning' && !row.held && !state.gone.includes(row.agentId));
  if (state.plansReady || !planning.length) return null;
  const first = Math.min(...planning.map(row => Date.parse(row.at)));
  if (!planning.every(row => state.agents[row.agentId]?.plan) && !(now - first >= PLAN_MS)) return null;
  state.plansReady = true;
  return { event: 'plans-ready', agents: planning.map(row => ({ ...describe(row), plan: state.agents[row.agentId]?.plan ?? 'planning' })) };
}

// Each watched agent's card in the inbox: one `agent` item each, written only when its words change.
const statusFile = (stateDir, day) => join(stateDir, `${day}.status.json`);
const firstLine = text => text?.split('\n').map(part => part.trim()).find(Boolean)?.slice(0, 200);

async function statusOf(row, log, call) {
  const action = log.filter(entry => entry.agent === row.agentId).at(-1)?.label?.slice(0, 300);
  if (row.proof) return { state: 'done', proof: row.proof, ...(action && { action }) };
  if (row.phase === 'planning') return { state: 'planning' };
  const step = firstLine(await lastMessage(call, row.agentId));
  return { state: 'working', ...(step && { step }), ...(action && { action }) };
}

/** Writes each changed status; false when the inbox did not answer, leaving the rest for the next pass. */
async function reportStatus({ stateDir, day, env, rows, log, call, inbox, cwd }) {
  const file = statusFile(stateDir, day);
  const kept = readJson(file, {});
  for (const row of rows) {
    const body = JSON.stringify(await statusOf(row, log, call));
    if (kept[row.agentId]?.body === body) continue;
    const id = itemIdOf(day, row.agentId, 'agent');
    const title = String(row.title ?? row.agentId).slice(0, 200);
    const spec = { id, kind: 'agent', title, body, header: headerOf(title, row.agentId), actions: {}, hours: STATUS_HOURS, target: chatTarget(env, cwd), cwd, workspace: folderOf(row) };
    if (!(await inbox.open(spec, { env }).catch(() => null))) return false;
    kept[row.agentId] = { id, body, done: Boolean(row.proof) };
    writeJson(file, kept);
  }
  return true;
}

/** Closes the status items `which` picks from one day's file. */
async function closeStatus({ stateDir, day, env, inbox }, which) {
  const file = statusFile(stateDir, day);
  const kept = readJson(file, {});
  const ids = Object.keys(kept).filter(agentId => which(agentId, kept[agentId]));
  for (const agentId of ids) { await inbox.close(kept[agentId].id, { env }); delete kept[agentId]; }
  if (ids.length) writeJson(file, kept);
}

/** Clears every earlier day's status items, a done card included. */
async function clearEarlier({ stateDir, day, env, inbox }) {
  const earlier = existsSync(stateDir) ? readdirSync(stateDir).map(name => name.match(/^(\d{4}-\d{2}-\d{2})\.status\.json$/)?.[1]).filter(other => other && other < day) : [];
  for (const other of earlier) {
    await closeStatus({ stateDir, day: other, env, inbox }, () => true);
    rmSync(statusFile(stateDir, other), { force: true });
  }
}

// Notices; closes only inbox items answered elsewhere. A stop prints once per idle spell, which ends when the agent
// runs or the chief acts on it; `<day>.watch.json` keeps that across `--once` calls.
export async function watch({ stateDir, day, email, call, env = process.env, print = console.log, seconds = 60, hours = 10, once = false, now = () => Date.now(), sleep = ms => new Promise(done => setTimeout(done, ms)), inbox = INBOX, cwd = process.cwd() }) {
  const line = event => print(JSON.stringify(event));
  const at = { stateDir, day, env, inbox };
  const end = async reason => {
    await closeInbox(at);
    await closeStatus(at, (agentId, entry) => !entry.done);
    line({ event: 'end', reason });
  };
  if (!env.PASEO_AGENT_ID) { line({ event: 'unsupported', reason: unsupported.reason }); return; }
  const file = watchFile(stateDir, day);
  const start = now();
  let reporting = true;
  await clearEarlier(at);
  for (;;) {
    const state = readJson(file, { agents: {}, gone: [], notRead: false });
    const rows = watched({ stateDir, day, email }, state.gone);
    if (!rows.length) { await end('empty'); return; }
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
          await closeStatus(at, (agentId, entry) => agentId === row.agentId && !entry.done);
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
          const fresh = !seen.idle || actedSince;
          // A choice the person made while it ran: its stop is the chief's cue to deliver it, never a planning stop.
          if (row.held) {
            if (fresh || !seen.held) {
              line({ event: 'held', ...describe(row), choice: row.held });
              Object.assign(seen, { idle: true, held: true, at: new Date(now()).toISOString() });
            }
          } else if (row.phase === 'planning' && fresh) {
            const event = await planningStop(row, seen, { status: agent.status, call });
            if (event) line(event);
            seen.idle = true;
            seen.at = new Date(now()).toISOString();
          } else if (fresh) {
            const last = await lastMessage(call, row.agentId);
            line({ event: 'stopped', ...describe(row), status: agent.status, last });
            seen.idle = true;
            seen.at = new Date(now()).toISOString();
            if (last !== null) seen.last = last;
          }
        }
        state.agents[row.agentId] = seen;
      }
      const ready = plansReady(state, rows, now());
      if (ready) line(ready);
      const live = rows.filter(row => !state.gone.includes(row.agentId));
      // A missed write is retried next pass; only an inbox with no sign-in stops the reports.
      if (reporting && !(await reportStatus({ ...at, rows: live, log, call, cwd }))) reporting = !(await inbox.off?.());
      for (const item of inboxItems(stateDir, day)) {
        if (!(await answeredElsewhere(item, { list, pending, log, seen: state.agents, call }))) continue;
        await inboxClose({ stateDir, day, env, id: item.id, inbox });
        line({ event: 'answered-elsewhere', title: item.title ?? null, agent: item.agent, item: item.id });
      }
    }
    writeJson(file, state);
    if (once) return;
    if (now() - start >= hours * 3600e3) { await end('time'); return; }
    if (!watched({ stateDir, day, email }, state.gone).length) { await end('empty'); return; }
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

/** Archives a workspace this `/daily` opened, or its agent when it has none, and drops it from the watch for good. */
export async function close({ stateDir, day, email, agent: name, call, env = process.env, inbox = INBOX, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const row = watchedRow(watched({ stateDir, day, email }), name);
  if (!row) return { status: 'unknown', error: `${name} is not a chat /daily started or was handed, so the chief leaves it alone.` };
  // A handed-in chat is the person's own: the chief watches it but never archives it.
  if (row.source === 'handed') return { status: 'refused', ...describe(row), error: `${row.title ?? name} is a chat you handed over; close it yourself.` };
  try {
    await call(row.workspaceId ? ['workspace', 'archive', row.workspaceId] : ['archive', row.agentId, '--force']);
  } catch (error) {
    return notPaseo(error) ? unsupported : { status: 'failed', ...describe(row), error: error.message };
  }
  writeJson(dayFile(stateDir, day), readDay(stateDir, day).map(entry => (entry.agentId === row.agentId && !entry.closed ? { ...entry, closed: now.toISOString() } : entry)));
  // The watch never sees it leave, so its card and anything it asked leave the inbox here.
  await closeStatus({ stateDir, day, env, inbox }, agentId => agentId === row.agentId);
  for (const item of inboxItems(stateDir, day).filter(item => item.agent === row.agentId)) await inboxClose({ stateDir, day, env, id: item.id, inbox });
  return { status: 'closed', ...describe(row) };
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

const nextDay = day => new Date(Date.parse(`${day}T12:00:00Z`) + 86400e3).toISOString().slice(0, 10);

/** Relays Go (note and answers; now working) or Not today (workspace closed; a task comes back tomorrow) to a planning
 *  agent. A running one holds it on its row until the watch prints `held`; then `start` with no choice sends it. */
export async function start({ stateDir, day, email, agent: name, choice, file, call, env = process.env, inbox = INBOX, memory = runMemory, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const row = watchedRow(watched({ stateDir, day, email }), name);
  if (row?.phase !== 'planning') return { status: 'refused', reason: 'planning', error: `${name} is not a watched agent waiting on its Go.` };
  const pick = choice ?? row.held;
  if (!pick) return { status: 'refused', reason: 'choice', error: `${row.title} holds no choice: give --choice go or skip.` };
  const go = pick === 'go';
  const message = join(stateDir, `${day}.plans`, `${row.agentId}.${pick}.md`);
  if (choice) {
    const words = file ? readText(file) : '';
    if (typeof words !== 'string') return { status: 'refused', reason: 'message', error: words.error };
    writeText(message, go ? ['Go. Work from your plan.', words].filter(Boolean).join('\n\n') : 'Not today; stop here.');
  }
  const sent = await reply({ stateDir, day, email, env, call, agent: row.agentId, file: message, bucket: 'person', label: `${go ? 'Started' : 'Not today'}: ${row.title}`, now });
  if (sent.status !== 'sent' && sent.reason !== 'running') return sent;
  for (const item of inboxItems(stateDir, day).filter(item => item.kind === 'start' && item.agent === row.agentId)) await inboxClose({ stateDir, day, env, id: item.id, inbox });
  if (sent.status !== 'sent') { setRow(stateDir, day, row, { held: pick }); return { status: 'held', ...describe(row), choice: pick }; }
  if (go) { setRow(stateDir, day, row, { phase: 'working', held: undefined }); return { status: 'started', ...describe(row) }; }
  await call(row.workspaceId ? ['workspace', 'archive', row.workspaceId] : ['archive', row.agentId]);
  setRow(stateDir, day, row, { phase: 'skipped', held: undefined });
  const task = row.step.match(/^task:\s*(.+)$/)?.[1];
  return { status: 'skipped', ...describe(row), ...(task && { reminder: remind({ day: nextDay(day), text: task, memory }) }) };
}

/** Marks a watched agent done with the proof the chief checked; the next watch pass moves its card to Done. */
export function doneAgent({ stateDir, day, email, env = process.env, agent: name, proof }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const row = watchedRow(watched({ stateDir, day, email }), name);
  if (!row) return { status: 'refused', reason: 'unwatched', error: `${name} is not a chat /daily started or was handed.` };
  const words = String(proof).trim().slice(0, 2000);
  setRow(stateDir, day, row, { phase: 'done', proof: words });
  return { status: 'marked', ...describe(row), proof: words };
}

/** Each watched agent with its live status, pending requests and the chief's last action on it. */
export async function status({ stateDir, day, email, call, env = process.env }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const rows = watched({ stateDir, day, email });
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
const OK = new Set(['opened', 'already', 'unsupported', 'handed', 'sent', 'answered', 'read', 'not-read', 'saved', 'spooled', 'added', 'closed', 'unavailable',
  'started', 'skipped', 'marked', 'held']);
const OPTIONS = {
  who: {},
  opened: {},
  open: { step: { type: 'string' }, title: { type: 'string' }, brief: { type: 'string' }, 'plan-first': { type: 'boolean' } },
  watch: { seconds: { type: 'string' }, hours: { type: 'string' }, once: { type: 'boolean' } },
  hand: { agent: { type: 'string' } },
  close: { agent: { type: 'string' } },
  reply: { agent: { type: 'string' }, file: { type: 'string' }, bucket: { type: 'string' }, label: { type: 'string' } },
  answer: { agent: { type: 'string' }, request: { type: 'string' }, file: { type: 'string' }, bucket: { type: 'string' }, label: { type: 'string' } },
  status: {},
  start: { agent: { type: 'string' }, choice: { type: 'string' }, file: { type: 'string' } },
  'done-agent': { agent: { type: 'string' }, proof: { type: 'string' } },
  inbox: { kind: { type: 'string' }, agent: { type: 'string' }, title: { type: 'string' }, file: { type: 'string' }, request: { type: 'string' }, id: { type: 'string' } },
  remind: { text: { type: 'string' } },
  reminders: {},
  done: { id: { type: 'string' } },
};

/** The command line. Resolves to the exit code; `deps` stand in for the sign-in, launcher, Paseo and memory. */
export async function main(argv = process.argv.slice(2), { env = process.env, signedIn, launch, call, memory, inbox, print = console.log } = {}) {
  const [command, ...args] = argv;
  if (command === '--help') { print(USAGE); return 0; }
  const options = OPTIONS[command];
  if (!options) usageError(USAGE, command ? `unknown command ${command}` : 'name a command');
  const sub = command === 'inbox' ? args.shift() : null;
  if (command === 'inbox' && sub !== 'add' && sub !== 'close') usageError(USAGE, 'inbox takes add or close');
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
  if (command === 'hand' || command === 'close') need(['agent']);
  if (sub === 'add') need(['kind', 'agent', ...(values.kind === 'start' ? [] : ['title', 'file'])]);
  if (sub === 'add' && !KINDS.includes(values.kind)) usageError(USAGE, `--kind takes ${KINDS.join(', ')}`);
  if (command === 'start') need(['agent']);
  if (command === 'start' && values.choice !== undefined && !['go', 'skip'].includes(values.choice)) usageError(USAGE, '--choice takes go or skip');
  if (command === 'done-agent') need(['agent', 'proof']);
  if (sub === 'close') need(['id']);
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
      case 'open': return out(open({ ...at, step: values.step, title: values.title, brief: values.brief, plan: Boolean(values['plan-first']), launch }));
      case 'watch': await watch({ ...at, call: paseoCall, print, seconds: Number(values.seconds ?? 60), hours: Number(values.hours ?? 10), once: Boolean(values.once), ...(inbox && { inbox }) }); return 0;
      case 'inbox': return out(await (sub === 'add' ? inboxAdd({ ...at, kind: values.kind, agent: values.agent, title: values.title, file: values.file, request: values.request, ...(inbox && { inbox }) })
        : inboxClose({ ...at, id: values.id, ...(inbox && { inbox }) })));
      case 'hand': return out(await hand({ ...at, agent: values.agent, call: paseoCall }));
      case 'close': return out(await close({ ...at, agent: values.agent, call: paseoCall }));
      case 'reply': return out(await reply({ ...at, call: paseoCall, agent: values.agent, file: values.file, bucket: values.bucket, label: values.label }));
      case 'answer': return out(await answer({ ...at, call: paseoCall, agent: values.agent, request: values.request, file: values.file, bucket: values.bucket, label: values.label }));
      case 'status': return out(await status({ ...at, call: paseoCall }));
      case 'start': return out(await start({ ...at, call: paseoCall, agent: values.agent, choice: values.choice, file: values.file, memory, ...(inbox && { inbox }) }));
      case 'done-agent': return out(doneAgent({ ...at, agent: values.agent, proof: values.proof }));
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
