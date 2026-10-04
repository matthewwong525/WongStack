// Discover, claim, parse, and strip Claude Code and Codex transcripts. Code only: no model reads raw files.
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { readJson, statePath } from './store.mjs';

const IDLE_MS = 60 * 60 * 1000;
const PRUNE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const ERROR_CHARS = 300;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CLAUDE_NAME = new RegExp(`^(${UUID})\\.jsonl$`);
const CODEX_NAME = new RegExp(`^rollout-.*-(${UUID})\\.jsonl$`);

export class FormatError extends Error {}

const claudeHome = () => process.env.WONG_MEMORY_CLAUDE_HOME || join(homedir(), '.claude', 'projects');
const codexHome = () => process.env.WONG_MEMORY_CODEX_HOME || join(homedir(), '.codex', 'sessions');
export const escapeClaude = path => path.replace(/[^A-Za-z0-9]/g, '-');
export const inside = (path, dir) => path === dir || path.startsWith(dir.endsWith(sep) ? dir : dir + sep);
export const codexDayDir = (home, date) => join(home, String(date.getUTCFullYear()), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0'));
const stat = file => statSync(file, { throwIfNoEntry: false });
const parseLine = line => { try { return JSON.parse(line); } catch { return null; } };

// The session a background run was started from. It is never captured by that run.
const excluded = () => process.env.WONG_MEMORY_EXCLUDE || '';

// ---------- registry ----------

export function registerSession(ctx, entry) {
  appendFileSync(statePath(ctx, 'registry.jsonl'), `${JSON.stringify({ ...entry, ownerMachineId: ctx.machineId })}\n`);
}

export function readRegistry(ctx) {
  const file = join(ctx.stateDir, 'registry.jsonl');
  const entries = new Map();
  if (!existsSync(file)) return entries;
  for (const entry of readFileSync(file, 'utf8').split('\n').map(parseLine)) if (entry?.id && entry.ownerMachineId === ctx.machineId) entries.set(entry.id, { ...entries.get(entry.id), ...entry });
  return entries;
}

// Keep the registry small: drop entries whose transcript is gone, and captured ones older than 30 days.
export function pruneRegistry(ctx, now = Date.now()) {
  const seen = readJson(join(ctx.stateDir, 'seen.json'), {});
  const kept = [...readRegistry(ctx).values()].filter(entry => {
    const info = entry.transcript && stat(entry.transcript);
    if (!info) return false;
    return !(seen[entry.id]?.size === info.size && now - info.mtimeMs > PRUNE_AFTER_MS);
  });
  writeFileSync(statePath(ctx, 'registry.jsonl'), kept.map(entry => `${JSON.stringify({ ...entry, ownerMachineId: ctx.machineId })}\n`).join(''));
}

// ---------- parsing ----------

const cleanClaudeText = text => text
  .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
  .replace(/<(local-command-stdout|local-command-stderr|command-message)>[\s\S]*?<\/\1>/g, '')
  .replace(/<\/?(command-name|command-args)>/g, ' ')
  .trim();

const blockText = content => typeof content === 'string' ? content
  : Array.isArray(content) ? content.map(part => part?.text || '').join('\n') : '';

function claudeMessages(lines) {
  const out = [];
  for (const [line, record] of lines) {
    if (!record || record.isSidechain || record.isMeta || !['user', 'assistant'].includes(record.type)) continue;
    const content = record.message?.content;
    const parts = typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : [];
    for (const part of parts) {
      if (part?.type === 'text') {
        const text = record.type === 'user' ? cleanClaudeText(part.text || '') : (part.text || '').trim();
        if (text) out.push({ line, role: record.type, text });
      } else if (part?.type === 'tool_result' && part.is_error) {
        out.push({ line, role: 'error', text: blockText(part.content).slice(0, ERROR_CHARS) });
      }
    }
  }
  return out;
}

const CODEX_INJECTED = /^(<environment_context>|<user_instructions>|<permissions instructions>|# AGENTS\.md instructions)/;
const CODEX_FAILED = /(exit(?:ed with)? code:?\s*[1-9]|"exit_code":\s*[1-9])/i;

// A tool call failed when its structured exit code says so; plain-text output falls back to a pattern.
function codexFailed(output) {
  const exit = parseLine(output)?.metadata?.exit_code;
  return exit === undefined ? CODEX_FAILED.test(output) : exit !== 0;
}

function codexMessages(lines) {
  const out = [];
  for (const [line, record] of lines) {
    const item = record?.type === 'response_item' ? record.payload : null;
    if (!item) continue;
    if (item.type === 'message' && ['user', 'assistant'].includes(item.role)) {
      const text = blockText(item.content).trim();
      if (text && !(item.role === 'user' && CODEX_INJECTED.test(text))) out.push({ line, role: item.role, text });
    } else if ((item.type || '').endsWith('_call_output') && typeof item.output === 'string' && codexFailed(item.output)) {
      out.push({ line, role: 'error', text: item.output.slice(0, ERROR_CHARS) });
    }
  }
  return out;
}

function metaOf(records) {
  if (records[0]?.type === 'session_meta') {
    const meta = records[0].payload || {};
    return { agent: 'codex', id: `codex:${meta.id}`, cwd: meta.cwd || null, branch: meta.git?.branch || null, startedAt: meta.timestamp || records[0].timestamp || null };
  }
  const first = records.find(record => record.cwd) || records.find(record => record.sessionId);
  if (!first?.sessionId) return null;
  return { agent: 'claude', id: `claude:${first.sessionId}`, cwd: first.cwd || null, branch: first.gitBranch || null, startedAt: first.timestamp || null };
}

// Parse transcript text once: format, metadata, the readable messages, and the last record's line.
export function parseTranscriptText(text) {
  const lines = text.split('\n').map((line, index) => [index + 1, parseLine(line)]);
  const records = lines.map(([, record]) => record).filter(Boolean);
  const meta = metaOf(records);
  if (!meta) throw new FormatError('not recognized');
  const messages = meta.agent === 'codex' ? codexMessages(lines) : claudeMessages(lines);
  let lastLine = 0;
  for (let i = lines.length - 1; i >= 0 && !lastLine; i -= 1) if (lines[i][1]) lastLine = lines[i][0];
  return { meta, messages, lastLine };
}

export const strip = (messages, readThrough = 0) => messages
  .filter(message => message.line > readThrough).map(message => `[${message.role}] ${message.text}`).join('\n\n');

// ---------- discovery ----------

// Recent-chat reading is explicit; capture discovery below uses registered owners only.
function codexRollouts(days, now) {
  const found = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const dir = codexDayDir(codexHome(), new Date(now - offset * 86400000));
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const match = name.match(CODEX_NAME);
      if (match) found.push({ agent: 'codex', id: `codex:${match[1]}`, file: join(dir, name) });
    }
  }
  return found;
}

// Every top-level chat on this computer changed in the last `days` days, from any folder, newest first.
// Subagents, the excluded session, and background runs in `registry` are left out.
export function recentTranscripts({ days = 30, now = Date.now(), registry = new Map() } = {}) {
  const home = claudeHome();
  const claude = (existsSync(home) ? readdirSync(home) : []).flatMap(folder => {
    const dir = join(home, folder);
    if (!stat(dir)?.isDirectory()) return [];
    return readdirSync(dir).flatMap(name => {
      const match = name.match(CLAUDE_NAME);
      return match ? [{ agent: 'claude', id: `claude:${match[1]}`, file: join(dir, name) }] : [];
    });
  });
  const since = now - days * 86400000;
  return [...claude, ...codexRollouts(days, now)]
    .filter(chat => !registry.get(chat.id)?.background && chat.id !== excluded() && !chat.file.split(sep).includes('subagents'))
    .map(chat => ({ ...chat, mtimeMs: stat(chat.file)?.mtimeMs ?? 0 }))
    .filter(chat => chat.mtimeMs >= since)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

// Capture selects only registered sessions stamped with this machine owner.
// Subagent transcripts live in subfolders, and background runs are marked, so neither is claimed.
function discover(ctx) {
  const registry = readRegistry(ctx);
  const found = new Map();
  const add = candidate => {
    if (found.has(candidate.id) || registry.get(candidate.id)?.background || candidate.id === excluded()) return;
    if (candidate.file.split(sep).includes('subagents')) return;
    const info = stat(candidate.file);
    if (info) found.set(candidate.id, { ...candidate, size: info.size, mtimeMs: info.mtimeMs });
  };
  for (const entry of registry.values()) if (entry.transcript) add({ agent: entry.agent, id: entry.id, file: entry.transcript });

  return [...found.values()];
}

// Idle sessions whose file changed since the last capture, newest first. Reads file metadata only.
export function pending(ctx, { now = Date.now(), exclude = [], idleMs = IDLE_MS } = {}) {
  const seen = readJson(join(ctx.stateDir, 'seen.json'), {});
  return discover(ctx)
    .filter(session => !exclude.includes(session.id))
    .filter(session => now - session.mtimeMs >= idleMs && seen[session.id]?.size !== session.size)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

// A transcript is available for capture only through its owned registry entry.
export function sessionFile(ctx, id) {
  if (id === excluded()) return null;
  const registered = readRegistry(ctx).get(id)?.transcript;
  if (registered && stat(registered)) return registered;
  return null;
}
