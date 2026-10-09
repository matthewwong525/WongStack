import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { assertCodeScope, assertRecordScope, goalSchema, operationalChange, publishedGoal, recordPath, scheduleRecord } from '../../.agents/skills/save/scripts/schedule-record.mjs';
import { GOAL_REFERENCE, ROUTINE_REFERENCE, goal, routine } from './fixtures/schedule-records.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'schedule-delivery-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value); };
  write(ROUTINE_REFERENCE, JSON.stringify(routine()));
  for (const [file, value] of Object.entries(goal())) write(`${GOAL_REFERENCE}/${file}`, value);
  return { root, write };
}
const clean = { branchPaths: [], dirtyPaths: [] };

test('routine delivery validates its format and publishes without a change or review page', async t => {
  const { root } = fixture(t);
  const record = await scheduleRecord({ root, reference: ROUTINE_REFERENCE, evidence: { ...clean, stagedPaths: [ROUTINE_REFERENCE] } });
  assert.equal(record.kind, 'routine');
  assert.deepEqual(record.files, [ROUTINE_REFERENCE]);
});

test('goal publication validates its schema and binding and preserves open business tasks', async t => {
  const { root } = fixture(t);
  let validated;
  const status = { schemaName: 'scheduled-work', changeRoot: join(root, GOAL_REFERENCE), artifactPaths: Object.fromEntries(['proposal', 'binding', 'tasks'].map(id => [id, { existingOutputPaths: [join(root, GOAL_REFERENCE, id === 'binding' ? 'binding.json' : `${id}.md`)] }])) };
  const { loadRecord } = await import('../../.agents/skills/schedule/scripts/lib/records.mjs');
  const record = await scheduleRecord({ root, reference: GOAL_REFERENCE, evidence: clean,
    load: (root, ref, opts) => loadRecord(root, ref, { ...opts, openspec: async () => status }), validate: async item => { validated = item.reference; } });
  assert.equal(validated, GOAL_REFERENCE);
  assert.equal(record.kind, 'goal');
  assert.equal(readFileSync(join(root, GOAL_REFERENCE, 'tasks.md'), 'utf8'), '- [ ] Payment verified\n');
  assert.ok(record.files.includes(`${GOAL_REFERENCE}/.openspec.yaml`));
});

test('record delivery rejects application edits, incomplete ordinary plans, renames and an unstaged binding', async t => {
  const { root } = fixture(t);
  const record = { root, kind: 'routine', files: [ROUTINE_REFERENCE] };
  for (const path of ['app/source.ts', 'openspec/changes/incomplete/tasks.md', 'schedules/unselected.json']) {
    assert.throws(() => assertRecordScope(record, { branchPaths: [path] }), /mixed source or code plans/);
    assert.throws(() => assertRecordScope(record, { dirtyPaths: [{ path: ROUTINE_REFERENCE, from: path }] }), /mixed source or code plans/);
  }
  await assert.rejects(scheduleRecord({ root, reference: ROUTINE_REFERENCE, evidence: { ...clean, dirtyPaths: [{ path: ROUTINE_REFERENCE, status: ' M' }] } }), /stage the complete/);
});

test('invalid definitions, non-exact goal handles, changed bindings and symlinks cannot select record mode', async t => {
  const { root, write } = fixture(t);
  write(ROUTINE_REFERENCE, JSON.stringify({ ...routine(), version: 99 }));
  await assert.rejects(scheduleRecord({ root, reference: ROUTINE_REFERENCE, evidence: clean }), /Unsupported routine/);
  write(ROUTINE_REFERENCE, JSON.stringify(routine()));
  await assert.rejects(scheduleRecord({ root, reference: 'check-payment', evidence: clean, load: async () => ({ root, kind: 'goal', reference: GOAL_REFERENCE, files: [] }) }), /exact schedule record/);
  const changed = routine(); changed.instructions = 'Different action'; write(ROUTINE_REFERENCE, JSON.stringify(changed));
  await assert.rejects(scheduleRecord({ root, reference: ROUTINE_REFERENCE, evidence: clean }), /revision changed/);
  write('real-definition.json', JSON.stringify(routine())); rmSync(join(root, ROUTINE_REFERENCE)); symlinkSync(join(root, 'real-definition.json'), join(root, ROUTINE_REFERENCE));
  await assert.rejects(scheduleRecord({ root, reference: ROUTINE_REFERENCE, evidence: clean }), /symlinks/);
});

test('ordinary code can ship beside unchanged operational records but never carry their edits', t => {
  const { root, write } = fixture(t);
  assert.equal(operationalChange(root, GOAL_REFERENCE), true);
  const bound = JSON.parse(goal()['binding.json']); bound.lifecycle = { state: 'scheduled', published: true, publication: 'commit:fixture' };
  write(`${GOAL_REFERENCE}/binding.json`, JSON.stringify(bound));
  assert.equal(publishedGoal(root, GOAL_REFERENCE), true);
  assert.doesNotThrow(() => assertCodeScope({ branchPaths: ['app/source.ts'] }, [GOAL_REFERENCE]));
  for (const path of [ROUTINE_REFERENCE, `${GOAL_REFERENCE}/tasks.md`]) assert.throws(() => assertCodeScope({ branchPaths: [path] }, [GOAL_REFERENCE]), /leaves schedule records alone/);
  assert.throws(() => recordPath(root, '../outside.json'), /inside the repository/);
  assert.equal(goalSchema('schema: spec-driven\n'), false);
});

test('archival waits for terminal evidence and stopping, while a pending archive is allowed', async () => {
  const { assertTerminalGoal } = await import('../../.agents/skills/save/scripts/schedule-record.mjs');
  const make = lifecycle => ({ kind: 'goal', binding: { lifecycle } });
  for (const state of ['scheduled', 'waiting', 'paused', 'cleanup-pending']) assert.throws(() => assertTerminalGoal(make({ state, evidence: 'fixture:evidence', stopVerified: true })), /terminal goal/);
  assert.throws(() => assertTerminalGoal(make({ state: 'completed', evidence: 'fixture:evidence', stopVerified: false })), /verified stopping/);
  assert.doesNotThrow(() => assertTerminalGoal(make({ state: 'cancelled', evidence: 'fixture:request', stopVerified: true, archivePending: true })));
});

test('a fresh clone resolves a selected-store goal by its published path and passes store through validation', async t => {
  const { root, write } = fixture(t);
  const reference = 'planning/openspec/changes/check-payment';
  const files = goal(); const bound = JSON.parse(files['binding.json']); bound.record = reference; files['binding.json'] = JSON.stringify(bound);
  for (const [file, value] of Object.entries(files)) write(`${reference}/${file}`, value);
  const { loadRecord } = await import('../../.agents/skills/schedule/scripts/lib/records.mjs');
  const record = await scheduleRecord({ root, reference, store: 'team-plans', evidence: clean,
    load: (cwd, selected, options) => loadRecord(cwd, selected, { ...options, openspec: async (_args, opts) => {
      assert.equal(opts.store, 'team-plans');
      return { schemaName: 'scheduled-work', changeRoot: join(root, reference), artifactPaths: Object.fromEntries(['proposal', 'binding', 'tasks'].map(id => [id, { existingOutputPaths: [join(root, reference, id === 'binding' ? 'binding.json' : `${id}.md`)] }])) };
    } }), validate: async item => assert.equal(item.store, 'team-plans') });
  assert.equal(record.reference, reference);
  assert.equal(record.store, 'team-plans');
  assert.doesNotMatch(record.record.proposal, /Branch:/);
});

test('delivery verbs dispatch explicit operational records before code workflow instructions', () => {
  for (const name of ['continue', 'apply', 'plan']) {
    const text = readFileSync(new URL(`../../.agents/skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    assert.ok(text.indexOf('route its record') < text.indexOf(name === 'continue' ? '### 2. Resolve' : name === 'apply' ? '## Resolve the plan' : '## Draft with the CLI'));
  }
  const routing = readFileSync(new URL('../../.agents/skills/save/references/schedule-records.md', import.meta.url), 'utf8');
  assert.match(routing, /pending questions block dependent actions/i);
  assert.match(routing, /--store <id>/);
});

test('a scheduled goal produces an escaped stable review without code-plan headings', t => {
  const { root, write } = fixture(t);
  // Require no pre-existing page; goal records always receive their own review.
  const path = join(root, GOAL_REFERENCE);
  const proposal = readFileSync(join(path, 'proposal.md'), 'utf8');
  write(`${GOAL_REFERENCE}/proposal.md`, proposal.replace('Read the synthetic', 'Read <script>danger</script> the synthetic'));
  return import('../../.agents/skills/plan/scripts/build-review.mjs').then(({ buildReview }) => {
    const result = buildReview(path);
    assert.equal(result.kind, 'current');
    const review = readFileSync(join(path, 'review.html'), 'utf8');
    assert.match(review, /Execution destination: paseo/);
    assert.match(review, /Published goal checklist/);
    assert.match(review, /\[ \] Payment verified/);
    assert.match(review, /&lt;script&gt;danger&lt;\/script&gt;/);
    assert.doesNotMatch(review, /<script>danger/);
    assert.equal(readFileSync(join(path, 'tasks.md'), 'utf8'), '- [ ] Payment verified\n');
  });
});
