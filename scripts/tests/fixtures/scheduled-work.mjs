import { routineRevision, digest } from '../../../.agents/skills/schedule/scripts/lib/records.mjs';
export const NOW = Date.parse('2026-10-09T10:00:00Z');
export const proposal = '# Goal: synthetic\n\n' + ['Goal', 'Instructions', 'Completion source', 'Authority', 'Timing', 'Questions and cancellation'].map(name => `## ${name}\nSynthetic verification only.\n`).join('\n');
export function capabilities(overrides = {}) {
  return { futureVerified: true, verifiedAt: '2026-10-09T09:00:00Z', oneOff: true, recurrence: true, freshSession: true, inspect: true, update: true, stop: true, progressRead: true, progressWrite: true, nonOverlap: true, questionDelivery: true, context: { location: 'local', uptime: 'computer and daemon' }, ...overrides };
}
export function binding(overrides = {}) {
  return { version: 1, key: 'synthetic', owner: 'ada@example.test', repository: 'https://github.com/example/project.git', record: 'openspec/changes/synthetic', revision: digest(proposal), execution: { type: 'assistant', host: 'paseo', nativeId: 'job-1', generation: 1, capabilities: capabilities(), context: { cwd: '/durable/primary', location: 'local', uptime: 'computer and daemon', provider: 'codex' } }, progress: { type: 'local', reference: '/durable/state/synthetic.json' }, timing: { mode: 'goal', timezone: 'UTC', cron: '0 10 * * *', earliest: '2026-10-09T10:00:00Z', latest: '2026-11-01T10:00:00Z', expiresAt: '2026-11-01T11:00:00Z', allowedLatenessMs: 60000 }, authority: { minIntervalMs: 86400000, actions: ['email', 'read'], recipients: ['recipient@example.test'], channels: ['email'] }, completionSource: 'synthetic://paid', questionSurface: 'synthetic://inbox', adaptive: true, lifecycle: { state: 'scheduled', published: true, publication: 'commit:synthetic-revision' }, ...overrides };
}
export function routine(overrides = {}) {
  const row = { version: 1, kind: 'routine', key: 'synthetic', name: 'Weekly synthetic', owner: 'ada@example.test', instructions: 'Read synthetic data and leave a result.', execution: { type: 'assistant' }, timing: { mode: 'recurring', timezone: 'UTC', every: '1h', allowedLatenessMs: 60000 }, authority: { actions: ['read'], recipients: [], channels: [] }, ...overrides };
  row.binding ??= binding({ record: 'schedules/synthetic.json', timing: row.timing, authority: row.authority });
  row.binding.revision = routineRevision(row); return row;
}
export function item(overrides = {}) { return { kind: 'goal', name: 'synthetic', key: 'synthetic', reference: 'openspec/changes/synthetic', published: true, binding: binding(), ...overrides }; }
export function store(initial = null) {
  let value = structuredClone(initial), owner = null;
  const writes = [];
  return { writes, async read() { return structuredClone(value); }, async write(next) { value = structuredClone(next); writes.push(value); }, async claim(run) { if (owner) return false; owner = run; return true; }, async release(run) { if (owner === run) owner = null; } };
}
export const context = { nativeId: 'job-1', generation: 1, publishedRevision: digest(proposal), now: NOW, runId: 'run-1' };
export function host(overrides = {}) {
  const called = [];
  const receipt = (action, id) => ({ version: 1, host: 'paseo', action, nativeId: id, outcome: 'verified', observedAt: '2026-10-09T10:00:00Z', observation: { id, nextRunAt: '2026-10-10T10:00:00Z' } });
  return { name: 'paseo', called, async inspect(id) { called.push(['inspect', id]); return { id, status: 'active' }; }, async cancel(id) { called.push(['cancel', id]); return receipt('cancel', id); }, async pause(id) { called.push(['pause', id]); return receipt('pause', id); }, async update(id, value) { called.push(['update', id, value]); return receipt('update', id); }, async create(_binding, operation) { called.push(['create', operation]); return receipt('create', 'job-1'); }, ...overrides };
}
