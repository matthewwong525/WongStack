import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { cacheMisses, measureUsage, parseTranscript, requestCost } from '../measure-usage.mjs';

const assistant = (requestId, model, usage, content = [], extra = {}) => ({
  type: 'assistant', requestId, timestamp: extra.timestamp ?? '2026-09-24T10:00:00Z', attributionSkill: extra.skill,
  message: { model, content, usage: { input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0, ...usage } },
});
const jsonl = records => records.map(record => JSON.stringify(record)).join('\n');

test('prices every billing type and flags unknown models instead of guessing', () => {
  const request = { model: 'claude-opus-5-20260101', input: 1e6, cacheWrite5m: 1e6, cacheWrite1h: 1e6, cacheRead: 1e6, output: 1e6 };
  const cost = requestCost(request);
  assert.deepEqual([cost.$input, cost.$cacheWrite5m, cost.$cacheWrite1h, cost.$cacheRead, cost.$output], [5, 6.25, 10, 0.5, 25]);
  assert.equal(cost.dollars, 46.75);
  assert.equal(requestCost({ ...request, model: 'claude-unknown' }).unpriced, 1);
});

test('counts a streamed request once and places context at the first request that carries it', () => {
  const transcript = parseTranscript(jsonl([
    { type: 'user', cwd: '/work/repo', message: { content: 'Base directory for this skill: /work/repo/.claude/skills/save\n\n# /save' } },
    { type: 'attachment', attachment: { type: 'instructions', files: [{ path: '/work/repo/CLAUDE.md', content: 'x'.repeat(50) }] } },
    { type: 'attachment', attachment: { type: 'prompt_snapshot', systemPrompt: ['never sent'] } },
    assistant('r1', 'claude-opus-5', { cache_creation_input_tokens: 100 }, [{ type: 'thinking', thinking: '' }], { skill: 'save' }),
    assistant('r1', 'claude-opus-5', { cache_creation_input_tokens: 100 }, [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } }], { skill: 'save' }),
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'a'.repeat(25) }, { type: 'image', source: { data: 'b'.repeat(99999) } }] } },
    assistant('r2', 'claude-opus-5', { cache_read_input_tokens: 100 }),
  ]));
  assert.equal(transcript.cwd, '/work/repo');
  assert.deepEqual(transcript.requests.map(request => [request.skill, request.cacheWrite5m]), [['save', 100], [null, 0]]);
  const at = Object.fromEntries(transcript.chunks.map(chunk => [chunk.source, [chunk.at, chunk.chars]]));
  assert.deepEqual(at['skill:save'][0], 0);
  assert.deepEqual(at['instructions:CLAUDE.md'], [0, 50]);
  assert.deepEqual(at['tool:Bash'], [1, 25]);
  assert.deepEqual(at['user:image'], [1, 4000]);
  assert.equal(at['attachment:prompt_snapshot'], undefined);
});

test('classifies a prefix rewrite by what preceded it', () => {
  const request = (model, time, cacheRead, cacheWrite1h) => ({ model, time: Date.parse(time), input: 0, cacheWrite5m: 0, cacheWrite1h, cacheRead, output: 0 });
  const misses = cacheMisses([
    request('claude-opus-5', '2026-09-24T10:00:00Z', 50000, 2000),
    request('claude-opus-5', '2026-09-24T10:01:00Z', 52000, 3000),
    request('claude-opus-5', '2026-09-24T12:00:00Z', 0, 55000),
    request('claude-fable-5-1', '2026-09-24T12:01:00Z', 0, 56000),
  ]);
  assert.deepEqual(misses.map(miss => miss.cause), ['idle > 1h', 'model switch']);
  assert.equal(misses[0].dollars, 0.55);
});

test('rolls subagents into their parent task and filters by working directory', t => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-usage-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'project', 's1', 'subagents'), { recursive: true });
  const record = cwd => ({ ...assistant('r', 'claude-sonnet-5', { output_tokens: 1e6 }), cwd });
  writeFileSync(join(dir, 'project', 's1.jsonl'), jsonl([record('/work/wanted')]));
  writeFileSync(join(dir, 'project', 's1', 'subagents', 'agent-a.jsonl'), jsonl([record('/work/wanted')]));
  writeFileSync(join(dir, 'project', 's2.jsonl'), jsonl([record('/work/other')]));
  const report = measureUsage({ dir, cwd: 'wanted' });
  assert.equal(report.perTask.count, 1);
  assert.equal(report.total.dollars, 20);
  assert.deepEqual([report.tree.main.dollars, report.tree.subagents.dollars], [10, 10]);
  assert.equal(measureUsage({ dir }).perTask.count, 2);
});
