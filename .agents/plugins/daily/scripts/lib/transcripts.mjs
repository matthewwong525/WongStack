// Daily's copy of memory's transcript parsing: Claude Code and Codex messages, read by code only.
import { join } from 'node:path';

const ERROR_CHARS = 300;

export class FormatError extends Error {}

export const codexDayDir = (home, date) => join(home, String(date.getUTCFullYear()), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0'));
const parseLine = line => { try { return JSON.parse(line); } catch { return null; } };

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
        if (text) out.push({ line, role: record.type, text, at: record.timestamp ?? null, ...(record.origin && { origin: record.origin.kind ?? 'other' }) });
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
      if (text && !(item.role === 'user' && CODEX_INJECTED.test(text))) out.push({ line, role: item.role, text, at: record.timestamp ?? null });
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

