#!/usr/bin/env node
/**
 * Where a task's time goes, counted from this computer's session logs. Meta-only: it reads
 * private chat logs, so no install receives it, and it prints counts, never message text.
 *
 *     node scripts/measure-sessions.mjs [--repo <path>] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--json]
 *       [--cwd <folder>]... [--all-repos] [--codex <dir>]... [--claude <dir>]...
 *
 * It reads Codex rollouts (~/.codex/sessions and ~/.codex/archived_sessions) and Claude Code
 * transcripts (~/.claude/projects), keeps the sessions of one repo, and prints one row per
 * model and thinking level. Run it twice with --since and --until to compare two periods.
 *
 * What is counted:
 *   turn     one request and the work it started. Its verb is the `$ship` or `/ship` that opens
 *            it, `helper` in a helper's own session, else `none`.
 *   step     one tool call the model made.
 *   command  one shell command (a Codex step can run several), or one Claude file read.
 *   page read  a command that reads a skill page, a wiki page, or AGENTS.md; a repeat when the
 *            same chat already read every page it names.
 *   parent steps during a helper  steps the parent took while its helper's turn was open,
 *            waits counted apart.
 *   failed-check lookups  `gh run view ... --log` commands.
 *   local check runs  test or check commands run on this computer.
 * Seconds per step is the time of the turns that took a step, over their steps.
 *
 * A session belongs to the repo when its working folder is the repo, one of its worktrees, or a
 * --cwd folder, or when the log records the repo's origin address (Codex only). A Claude
 * transcript that records no thinking level is grouped under `unrecorded`; compare those by date.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { isMain, parseCli, usageError } from './lib-cli.mjs';

const USAGE = `usage: node scripts/measure-sessions.mjs [--repo <path>] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--json]
         [--cwd <folder>]... [--all-repos] [--codex <dir>]... [--claude <dir>]...

Count steps, seconds per step, repeated page reads, parent steps during a helper,
failed-check lookups, and local check runs, by model and thinking level.
--repo       the repo whose sessions count (default: this one)
--cwd        another working folder that belongs to it, such as a closed worktree's
--all-repos  count every session
--codex, --claude  log folders to read instead of the ones under your home folder`;

const VERB = /(?:^|[\s>])[$/](explore|plan|apply|save|ship|continue|close|verify|improve-code|improve|dream-memory|dream|routine|wong-sync)\b/;
// A skill's older name counts with its current one.
const RENAMED = { improve: 'improve-code', dream: 'dream-memory' };
const PAGE = /(?:^|[\s"'=(/])((?:\.claude|\.agents|\.codex)\/skills\/[\w./-]+?\.md|wiki\/[\w./-]+?\.md|AGENTS\.md|CLAUDE\.md)\b/g;
const READER = /(?:^|[\s;|&(])(?:cat|sed|head|tail|less|nl|rg|grep|awk|bat|read)\s/;
const LOOKUP = /\bgh\s+run\s+view\b[^|;&]*--log/;
const LOCAL = /\bnpm (?:run )?test\b|\bnode --test\b|\bvitest\b|checks\.mjs --worktree|payload-checks\.mjs/;
const EXEC = /exec_command\(\s*\{\s*"?cmd"?\s*:\s*("(?:[^"\\]|\\.)*")/g;
const WAITS = new Set(['wait_agent', 'wait', 'sleep']);

const walk = dir => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])) : []);
const records = file => readFileSync(file, 'utf8').split('\n').flatMap(line => { try { return line ? [JSON.parse(line)] : []; } catch { return []; } });
const verbOf = text => {
  const verb = /^\s*(<environment_context>|# AGENTS\.md)/.test(text) ? null : text.match(VERB)?.[1] ?? null;
  return RENAMED[verb] ?? verb;
};
const normalUrl = url => String(url ?? '').trim().replace(/^[a-z+]+:\/\//, '').replace(/^git@([^:]+):/, '$1/').replace(/\.git$/, '').replace(/\/$/, '').toLowerCase();

/** The pages a read-like command names, with the three skill folders counted as one. */
export function pagesRead(command) {
  if (!READER.test(command)) return [];
  return [...new Set([...command.matchAll(PAGE)].map(match => match[1].replace(/^\.(claude|codex)\//, '.agents/')))];
}

const newTurn = at => ({ start: at, end: at, seconds: null, model: 'unknown', effort: 'unrecorded', verb: null, steps: [] });
const closeTurn = turn => { turn.seconds ??= Math.max(0, (turn.end - turn.start) / 1000); };

function codexCommands(payload) {
  if (payload.type === 'custom_tool_call') return [...String(payload.input ?? '').matchAll(EXEC)].flatMap(match => { try { return [JSON.parse(match[1])]; } catch { return []; } });
  let args;
  try { args = JSON.parse(payload.arguments ?? '{}'); } catch { return []; }
  const command = args?.cmd ?? args?.command;
  return command ? [[command].flat().join(' ')] : [];
}

/** One Codex rollout file as a session of turns and steps. */
export function parseCodex(file) {
  const session = { provider: 'codex', id: file, parent: null, cwd: '', repoUrl: '', helper: false, turns: [], intervals: [] };
  let turn = null;
  for (const record of records(file)) {
    const payload = record.payload ?? {};
    const at = Date.parse(record.timestamp);
    if (turn && Number.isFinite(at)) turn.end = at;
    if (record.type === 'session_meta') {
      const parent = payload.source?.subagent?.thread_spawn?.parent_thread_id ?? payload.parent_thread_id ?? null;
      Object.assign(session, { id: payload.id ?? file, cwd: payload.cwd ?? '', repoUrl: payload.git?.repository_url ?? '', parent, helper: Boolean(parent) });
    } else if (record.type === 'event_msg' && payload.type === 'task_started') {
      if (turn) closeTurn(turn);
      turn = newTurn(at);
      session.turns.push(turn);
    } else if (!turn) {
      continue;
    } else if (record.type === 'turn_context') {
      Object.assign(turn, { model: payload.model ?? turn.model, effort: payload.effort ?? turn.effort });
    } else if (record.type === 'event_msg' && payload.type === 'task_complete') {
      if (Number.isFinite(payload.duration_ms)) turn.seconds = payload.duration_ms / 1000;
      closeTurn(turn);
      turn = null;
    } else if (record.type === 'response_item' && payload.type === 'message' && payload.role === 'user') {
      for (const part of payload.content ?? []) turn.verb ??= verbOf(String(part.text ?? ''));
    } else if (record.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(payload.type)) {
      turn.steps.push({ at, name: payload.name ?? '', commands: codexCommands(payload) });
    }
  }
  if (turn) closeTurn(turn);
  return session;
}

const isPrompt = record => record.type === 'user' && !record.isMeta
  && (typeof record.message?.content === 'string' || (Array.isArray(record.message?.content) && record.message.content.some(part => part.type === 'text') && !record.message.content.some(part => part.type === 'tool_result')));

/** One Claude Code transcript file, a helper's own file included, as a session of turns and steps. */
export function parseClaude(file) {
  const session = { provider: 'claude', id: file, parent: null, cwd: '', repoUrl: '', helper: file.includes('/subagents/'), turns: [], intervals: [] };
  const open = new Map();
  let turn = null;
  for (const record of records(file)) {
    const at = Date.parse(record.timestamp);
    if (!['user', 'assistant'].includes(record.type) || !Number.isFinite(at)) continue;
    session.cwd ||= record.cwd ?? '';
    if (record.isSidechain) session.helper = true;
    const content = record.message?.content;
    if (isPrompt(record)) {
      if (turn) closeTurn(turn);
      turn = newTurn(at);
      turn.verb = verbOf(typeof content === 'string' ? content : content.map(part => part.text ?? '').join('\n'));
      session.turns.push(turn);
      continue;
    }
    if (!turn || !Array.isArray(content)) continue;
    turn.end = at;
    if (record.type === 'assistant') {
      if (turn.model === 'unknown') Object.assign(turn, { model: record.message.model ?? 'unknown', effort: record.effort ?? 'unrecorded' });
      for (const part of content.filter(item => item.type === 'tool_use')) {
        const commands = part.name === 'Bash' ? [String(part.input?.command ?? '')] : part.name === 'Read' ? [`read ${part.input?.file_path ?? ''}`] : [];
        turn.steps.push({ at, name: part.name, commands });
        if (['Agent', 'Task'].includes(part.name)) open.set(part.id, at);
      }
    } else {
      // A helper's turn is open from the call that started it to the result it returned.
      for (const part of content.filter(item => item.type === 'tool_result' && open.has(item.tool_use_id))) {
        session.intervals.push([open.get(part.tool_use_id), at]);
        open.delete(part.tool_use_id);
      }
    }
  }
  if (turn) closeTurn(turn);
  return session;
}

/** Every session under the given log folders. */
export function loadSessions({ codex = [], claude = [] }) {
  const files = dirs => dirs.flatMap(walk).filter(file => file.endsWith('.jsonl')).sort();
  return [...files(codex).map(parseCodex), ...files(claude).map(parseClaude)];
}

/** Keep one repo's sessions and the turns that started inside the date range. */
export function selectSessions(sessions, { folders = [], repoUrl = '', all = false, since = null, until = null } = {}) {
  const from = since ? Date.parse(`${since}T00:00:00Z`) : -Infinity;
  const to = until ? Date.parse(`${until}T00:00:00Z`) + 86_400_000 : Infinity;
  const ours = session => all || folders.some(folder => session.cwd === folder || session.cwd.startsWith(`${folder}/`))
    || Boolean(repoUrl && normalUrl(session.repoUrl) === normalUrl(repoUrl));
  return sessions.filter(ours)
    .map(session => ({ ...session, turns: session.turns.filter(turn => turn.start >= from && turn.start < to) }))
    .filter(session => session.turns.length);
}

const median = values => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const round = (value, places = 1) => Number(value.toFixed(places));
const share = (part, whole) => (whole ? round(part / whole, 2) : 0);

/** Counts per provider, model, and thinking level. No message text reaches the result. */
export function measure(sessions) {
  // A Codex helper is its own file; its turns are the intervals its parent is measured against.
  const helperTurns = new Map();
  for (const session of sessions.filter(item => item.parent)) {
    helperTurns.set(session.parent, [...(helperTurns.get(session.parent) ?? []), ...session.turns.map(turn => [turn.start, turn.end])]);
  }
  const groups = new Map();
  for (const session of sessions) {
    const seen = new Set();
    const intervals = [...session.intervals, ...(helperTurns.get(session.id) ?? [])];
    session.turns.forEach((turn, index) => {
      const key = `${session.provider}\t${turn.model}\t${turn.effort}`;
      if (!groups.has(key)) groups.set(key, { provider: session.provider, model: turn.model, effort: turn.effort, sessions: 0, helperSessions: 0, turns: 0, steps: 0, busySeconds: 0, stepsPerTurn: [], commands: 0, pageReads: 0, repeatReads: 0, parentStepsDuringHelper: 0, helperWaits: 0, failedCheckLookups: 0, localCheckRuns: 0, verbs: {} });
      const group = groups.get(key);
      if (index === 0) group[session.helper ? 'helperSessions' : 'sessions'] += 1;
      const verb = session.helper ? 'helper' : turn.verb ?? 'none';
      group.verbs[verb] ??= { steps: [], seconds: [] };
      group.verbs[verb].steps.push(turn.steps.length);
      group.verbs[verb].seconds.push(turn.seconds);
      group.turns += 1;
      group.steps += turn.steps.length;
      group.stepsPerTurn.push(turn.steps.length);
      if (turn.steps.length) group.busySeconds += turn.seconds;
      for (const step of turn.steps) {
        if (intervals.some(([start, end]) => step.at > start && step.at < end)) group[WAITS.has(step.name) ? 'helperWaits' : 'parentStepsDuringHelper'] += 1;
        for (const command of step.commands) {
          group.commands += 1;
          if (LOOKUP.test(command)) group.failedCheckLookups += 1;
          if (LOCAL.test(command)) group.localCheckRuns += 1;
          const pages = pagesRead(command);
          if (!pages.length) continue;
          group.pageReads += 1;
          if (pages.every(page => seen.has(page))) group.repeatReads += 1;
          pages.forEach(page => seen.add(page));
        }
      }
    });
  }
  return [...groups.values()].sort((a, b) => `${a.provider}${a.model}${a.effort}`.localeCompare(`${b.provider}${b.model}${b.effort}`)).map(({ busySeconds, stepsPerTurn, verbs, ...group }) => ({
    ...group,
    medianStepsPerTurn: median(stepsPerTurn),
    secondsPerStep: group.steps ? round(busySeconds / group.steps) : 0,
    pageReadShare: share(group.pageReads, group.commands),
    repeatShare: share(group.repeatReads, group.pageReads),
    verbs: Object.fromEntries(Object.entries(verbs).sort(([a], [b]) => a.localeCompare(b)).map(([verb, counts]) => [verb, { turns: counts.steps.length, medianSteps: median(counts.steps), medianSeconds: round(median(counts.seconds)) }])),
  }));
}

export function formatReport(groups) {
  if (!groups.length) return 'No session matched.';
  return groups.map(group => [
    `${group.provider}  ${group.model}  thinking ${group.effort}: ${group.sessions} chats, ${group.helperSessions} helpers, ${group.turns} turns`,
    `  steps ${group.steps} (median ${group.medianStepsPerTurn} per turn), ${group.secondsPerStep} s per step`,
    `  page reads ${group.pageReads} of ${group.commands} commands (${Math.round(group.pageReadShare * 100)}%), ${Math.round(group.repeatShare * 100)}% of them repeats`,
    `  parent steps during a helper ${group.parentStepsDuringHelper}, waits ${group.helperWaits}`,
    `  failed-check lookups ${group.failedCheckLookups}, local check runs ${group.localCheckRuns}`,
    ...Object.entries(group.verbs).map(([verb, counts]) => `  ${verb}: ${counts.turns} turns, median ${counts.medianSteps} steps, median ${counts.medianSeconds} s`),
  ].join('\n')).join('\n\n');
}

/** The repo's folder, its live worktrees, and its origin address; a path with no repo is only itself. */
function repoIdentity(path) {
  const root = resolve(path);
  const git = (...args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
  const worktrees = git('worktree', 'list', '--porcelain').split('\n').filter(line => line.startsWith('worktree ')).map(line => line.slice(9));
  return { folders: [...new Set([git('rev-parse', '--show-toplevel') || root, ...worktrees])], repoUrl: git('remote', 'get-url', 'origin') };
}

if (isMain(import.meta.url)) {
  const many = { type: 'string', multiple: true };
  const { values } = parseCli({ usage: USAGE, options: {
    repo: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' }, json: { type: 'boolean' },
    cwd: many, 'all-repos': { type: 'boolean' }, codex: many, claude: many,
  } });
  for (const key of ['since', 'until']) {
    if (values[key] && !/^\d{4}-\d{2}-\d{2}$/.test(values[key])) usageError(USAGE, `--${key} is a date, YYYY-MM-DD`);
  }
  const identity = repoIdentity(values.repo ?? '.');
  const sessions = loadSessions({
    codex: values.codex ?? [join(homedir(), '.codex/sessions'), join(homedir(), '.codex/archived_sessions')],
    claude: values.claude ?? [join(homedir(), '.claude/projects')],
  });
  const groups = measure(selectSessions(sessions, {
    folders: [...identity.folders, ...(values.cwd ?? []).map(folder => resolve(folder))], repoUrl: identity.repoUrl,
    all: values['all-repos'], since: values.since, until: values.until,
  }));
  console.log(values.json ? JSON.stringify({ since: values.since ?? null, until: values.until ?? null, groups }, null, 2) : formatReport(groups));
}
