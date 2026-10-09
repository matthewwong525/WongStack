import { digest, routineRevision } from '../../../.agents/skills/schedule/scripts/lib/records.mjs';
export const GOAL_REFERENCE = 'openspec/changes/check-payment';
export const ROUTINE_REFERENCE = 'schedules/weekly-summary.json';
export function binding(reference, kind = 'routine') {
  return {
    version: 1, key: kind === 'routine' ? 'weekly-summary' : 'check-payment', owner: 'owner@example.test',
    repository: 'https://github.com/team/repo.git', record: reference, revision: 'a'.repeat(64),
    execution: { type: 'assistant', host: 'paseo', nativeId: null, generation: 1, capabilities: {}, context: { location: 'local' } },
    progress: { type: 'host', reference: 'continuation:test' },
    authority: { actions: ['draft'], recipients: [], channels: [] },
    ...(kind === 'goal' ? { completionSource: 'fixture:payment' } : {}),
    lifecycle: { state: 'registering', published: false },
    timing: { mode: kind === 'routine' ? 'recurring' : 'goal', every: '1d', timezone: 'UTC', allowedLatenessMs: 0 },
  };
}
export function routine() {
  const item = { version: 1, kind: 'routine', key: 'weekly-summary', name: 'Weekly summary', owner: 'owner@example.test',
    instructions: 'Read synthetic totals and draft the weekly summary.', execution: { type: 'assistant' },
    authority: { actions: ['draft'], recipients: [], channels: [] }, timing: binding(ROUTINE_REFERENCE).timing,
    binding: binding(ROUTINE_REFERENCE) };
  item.binding.revision = routineRevision(item);
  return item;
}
export function goal() {
  const proposal = '# Check payment\n\n## Goal\n\nStop when synthetic invoice is paid.\n\n## Instructions\n\nRead the synthetic payment state.\n\n## Completion source\n\nfixture:payment\n\n## Authority\n\nRead only.\n\n## Timing\n\nCheck daily, within UTC daytime.\n\n## Questions and cancellation\n\nAsk the owner; no automatic outreach.\n';
  const bound = binding(GOAL_REFERENCE, 'goal');
  bound.revision = digest(proposal);
  return { '.openspec.yaml': 'schema: scheduled-work\n', 'proposal.md': proposal, 'tasks.md': '- [ ] Payment verified\n', 'binding.json': JSON.stringify(bound) };
}
