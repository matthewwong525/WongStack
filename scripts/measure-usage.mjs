#!/usr/bin/env node
// Billed cost per task from Claude Code transcripts (~/.claude/projects/<project>/<session>.jsonl,
// subagents under <session>/subagents/). measure-context.mjs counts source words; this reads the
// usage the API actually billed, split by billing type, skill, cache-miss cause, and context source.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { isMain, parseCli } from './lib-cli.mjs';

// $ per million tokens: input, output, cache write 5m, cache write 1h, cache read.
// Anthropic list prices, checked 2026-09-24. Unknown models are reported, never guessed.
export const PRICES = {
  'claude-fable-5-1': [10, 50, 12.5, 20, 0.25], 'claude-fable-5': [10, 50, 12.5, 20, 1],
  'claude-opus-5-5': [4, 20, 5, 8, 0.2], 'claude-opus-5': [5, 25, 6.25, 10, 0.5],
  'claude-opus-4-8': [5, 25, 6.25, 10, 0.5], 'claude-opus-4-7': [5, 25, 6.25, 10, 0.5],
  'claude-sonnet-5': [2, 10, 2.5, 4, 0.2], 'claude-sonnet-4-6': [3, 15, 3.75, 6, 0.3],
  'claude-haiku-4-5': [1, 5, 1.25, 2, 0.1],
};
// Median chars per token of tool results, measured from consecutive-request deltas in 114 transcripts.
export const CHARS_PER_TOKEN = 2.5;
// Images and PDFs bill by pixels or pages, not by base64 length; count each block at a typical size.
const MEDIA_TOKENS = 1600;
const TYPES = ['input', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead', 'output'];
// Transcript bookkeeping that is never sent to the model.
const UNSENT = new Set(['prompt_snapshot', 'deferred_tools_record', 'command_permissions', 'auto_mode', 'batching_reminder_sent', 'structured_output', 'hook_success', 'remote_session_change']);

const modelId = model => (model ?? '').replace(/-\d{8}$/, '');
const zero = () => Object.fromEntries([...TYPES, ...TYPES.map(key => `$${key}`), 'dollars'].map(key => [key, 0]));
const add = (sum, part) => { for (const key in part) sum[key] = (sum[key] ?? 0) + part[key]; return sum; };
const blockLength = block => block.type === 'text' ? block.text.length
  : ['image', 'document'].includes(block.type) ? MEDIA_TOKENS * CHARS_PER_TOKEN : JSON.stringify(block).length;
const textLength = content => typeof content === 'string' ? content.length
  : Array.isArray(content) ? content.reduce((n, block) => n + blockLength(block), 0) : 0;
const skillOf = text => /^Base directory for this skill: \S*\/skills\/([\w:-]+)/.exec(text)?.[1];

// Tokens and dollars per billing type; `dollars` is their sum.
export function requestCost(request) {
  const price = PRICES[modelId(request.model)];
  const cost = zero();
  for (const [i, key] of TYPES.entries()) {
    cost[key] = request[key];
    cost[`$${key}`] = price ? request[key] * price[[0, 2, 3, 4, 1][i]] / 1e6 : 0;
    cost.dollars += cost[`$${key}`];
  }
  if (!price) cost.unpriced = 1;
  return cost;
}

function toRequest(record) {
  const usage = record.message.usage ?? {};
  const written = usage.cache_creation_input_tokens ?? 0;
  const oneHour = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return {
    model: record.message.model, skill: record.attributionSkill ?? null, time: Date.parse(record.timestamp),
    input: usage.input_tokens ?? 0, cacheWrite5m: written - oneHour, cacheWrite1h: oneHour,
    cacheRead: usage.cache_read_input_tokens ?? 0, output: usage.output_tokens ?? 0,
  };
}

function userChunks(content, toolNames) {
  if (typeof content === 'string') return [[skillOf(content) ? `skill:${skillOf(content)}` : 'user', content.length]];
  return (content ?? []).map(block => block.type === 'tool_result' ? [`tool:${toolNames.get(block.tool_use_id) ?? '?'}`, textLength(block.content)]
    : block.type === 'text' ? [skillOf(block.text) ? `skill:${skillOf(block.text)}` : 'user', block.text.length]
    : [`user:${block.type}`, textLength([block])]);
}

function attachmentChunks(attachment) {
  if (UNSENT.has(attachment.type)) return [];
  if (attachment.type === 'instructions') return attachment.files.map(file => [`instructions:${basename(file.path)}`, file.content.length]);
  if (attachment.type === 'nested_memory') return [[`rule:${basename(attachment.path ?? '')}`, JSON.stringify(attachment.content?.content ?? '').length]];
  const { type, ...rest } = attachment;
  return [[`attachment:${type}`, JSON.stringify(rest).length]];
}

// One transcript → its billed requests and the context chunks it sent, each placed at the index
// of the first request that carried it.
export function parseTranscript(text) {
  const requests = [], chunks = [], seen = new Set(), toolNames = new Map();
  let cwd = null;
  const place = pairs => { for (const [source, chars] of pairs) chunks.push({ at: requests.length, source, chars }); };
  for (const line of text.split('\n')) {
    let record;
    try { record = JSON.parse(line); } catch { continue; }
    cwd ??= record.cwd ?? null;
    if (record.type === 'assistant') {
      const id = record.requestId ?? record.message.id;
      if (!seen.has(id)) { seen.add(id); requests.push(toRequest(record)); }
      for (const block of record.message.content ?? []) {
        if (block.type === 'tool_use') toolNames.set(block.id, block.name === 'Skill' ? `Skill(${block.input?.skill})` : block.name);
        if (block.type === 'tool_use' || block.type === 'text') place([['assistant', block.type === 'text' ? block.text.length : JSON.stringify(block.input).length]]);
      }
    } else if (record.type === 'user') place(userChunks(record.message.content, toolNames));
    else if (record.type === 'attachment') place(attachmentChunks(record.attachment));
  }
  return { cwd, requests, chunks };
}

// A request whose cache read covers less than half the previous context rewrote the prefix.
export function cacheMisses(requests) {
  const misses = [];
  for (let i = 1; i < requests.length; i++) {
    const before = requests[i - 1], now = requests[i];
    const context = before.input + before.cacheWrite5m + before.cacheWrite1h + before.cacheRead;
    const written = now.cacheWrite5m + now.cacheWrite1h;
    if (now.cacheRead >= context / 2 || written < 1024) continue;
    const idle = (now.time - before.time) / 60000;
    const cause = modelId(now.model) !== modelId(before.model) ? 'model switch' : idle > 60 ? 'idle > 1h' : idle > 5 ? 'idle 5-60m' : 'other';
    const cost = requestCost(now);
    misses.push({ cause, dollars: cost.$cacheWrite5m + cost.$cacheWrite1h });
  }
  return misses;
}

// A chunk is written once, then read by every later request; price it at the session's own rates.
export function sourceCosts(requests, chunks) {
  const total = requests.map(requestCost).reduce(add, zero());
  const priced = requests.find(request => PRICES[modelId(request.model)]);
  if (!priced) return {};
  const price = PRICES[modelId(priced.model)];
  const writes = total.cacheWrite5m + total.cacheWrite1h;
  const writeRate = writes ? 1e6 * (total.$cacheWrite5m + total.$cacheWrite1h) / writes : price[3];
  const out = {};
  for (const { at, source, chars } of chunks) {
    if (at >= requests.length) continue;
    const tokens = chars / CHARS_PER_TOKEN;
    out[source] = (out[source] ?? 0) + tokens * (writeRate + (requests.length - at - 1) * price[4]) / 1e6;
  }
  return out;
}

function transcriptFiles(dir) {
  const tasks = [];
  for (const project of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
    if (!project.isDirectory()) continue;
    for (const file of readdirSync(join(dir, project.name)).filter(name => name.endsWith('.jsonl'))) {
      const subDir = join(dir, project.name, file.slice(0, -6), 'subagents');
      const subagents = existsSync(subDir) ? readdirSync(subDir).filter(name => name.endsWith('.jsonl')).map(name => join(subDir, name)) : [];
      tasks.push({ main: join(dir, project.name, file), subagents });
    }
  }
  return tasks;
}

const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(p * values.length))] : 0;

// One task = one main session plus every subagent it spawned.
export function measureUsage({ dir, cwd, since }) {
  const report = { total: zero(), byModel: {}, bySkill: {}, tree: { main: zero(), subagents: zero() }, misses: {}, sources: {}, unpriced: new Set(), tasks: [] };
  for (const files of transcriptFiles(dir)) {
    const main = parseTranscript(readFileSync(files.main, 'utf8'));
    if (!main.requests.length || (cwd && !main.cwd?.includes(cwd)) || (since && main.requests[0].time < Date.parse(since))) continue;
    const task = { file: files.main, cwd: main.cwd, requests: 0, dollars: 0 };
    for (const [role, transcript] of [['main', main], ...files.subagents.map(file => ['subagents', parseTranscript(readFileSync(file, 'utf8'))])]) {
      for (const request of transcript.requests) {
        const cost = requestCost(request);
        if (cost.unpriced && request.output + request.cacheRead + request.input) report.unpriced.add(request.model);
        for (const bucket of [report.total, report.tree[role], report.byModel[modelId(request.model)] ??= zero(), report.bySkill[request.skill ?? '(none)'] ??= zero()]) add(bucket, cost);
        task.requests++; task.dollars += cost.dollars;
      }
      for (const miss of cacheMisses(transcript.requests)) report.misses[miss.cause] = (report.misses[miss.cause] ?? 0) + miss.dollars;
      if (role === 'main') add(report.sources, sourceCosts(transcript.requests, transcript.chunks));
    }
    report.tasks.push(task);
  }
  const dollars = report.tasks.map(task => task.dollars), top = [...dollars].sort((a, b) => b - a).slice(0, Math.ceil(dollars.length / 10));
  report.perTask = {
    count: dollars.length, medianDollars: percentile(dollars, 0.5), meanDollars: report.total.dollars / Math.max(1, dollars.length),
    medianRequests: percentile(report.tasks.map(task => task.requests), 0.5), p90Requests: percentile(report.tasks.map(task => task.requests), 0.9),
    top10PercentShare: top.reduce((a, b) => a + b, 0) / Math.max(1e-9, report.total.dollars),
  };
  report.unpriced = [...report.unpriced];
  return report;
}

function print(report) {
  const $ = n => `$${n.toFixed(2)}`, pct = (n, d) => `${(100 * n / Math.max(1e-9, d)).toFixed(1)}%`;
  const t = report.total, sent = t.input + t.cacheWrite5m + t.cacheWrite1h + t.cacheRead;
  console.log(`Tasks ${report.perTask.count}; billed ${$(t.dollars)}; cache hit ${pct(t.cacheRead, sent)} of input tokens`);
  console.log(`By billing type: ${TYPES.map(key => `${key} ${pct(t[`$${key}`], t.dollars)}`).join(', ')}`);
  console.log(`Per task: median ${$(report.perTask.medianDollars)}, mean ${$(report.perTask.meanDollars)}, requests median ${report.perTask.medianRequests} p90 ${report.perTask.p90Requests}; top 10% of tasks = ${pct(report.perTask.top10PercentShare, 1)} of cost`);
  const rows = (title, entries, total, limit = 12) => {
    console.log(`\n${title}`);
    for (const [name, value] of Object.entries(entries).sort((a, b) => (b[1].dollars ?? b[1]) - (a[1].dollars ?? a[1])).slice(0, limit)) {
      console.log(`  ${name.padEnd(32)} ${$(value.dollars ?? value).padStart(10)} ${pct(value.dollars ?? value, total).padStart(6)}`);
    }
  };
  rows('By model', report.byModel, t.dollars);
  rows('Main thread vs subagents', report.tree, t.dollars);
  rows('By active skill (turns while the skill ran, subagents included)', report.bySkill, t.dollars);
  rows('Cache-miss rewrites by cause (share of all billed cost)', report.misses, t.dollars);
  rows('Context sources, main threads (estimate: written once, read by each later request)', report.sources, t.dollars, 20);
  if (report.unpriced.length) console.log(`\nUnpriced models (excluded from $): ${report.unpriced.join(', ')}`);
}

if (isMain(import.meta.url)) {
  const { values: options } = parseCli({
    usage: 'usage: measure-usage.mjs [--dir DIR] [--cwd SUBSTRING] [--since YYYY-MM-DD] [--json]',
    options: { dir: { type: 'string', default: join(homedir(), '.claude', 'projects') }, cwd: { type: 'string' }, since: { type: 'string' }, json: { type: 'boolean' } },
  });
  try {
    const report = measureUsage(options);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else print(report);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
