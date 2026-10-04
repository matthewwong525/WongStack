// Deterministic driver fixture, not an agent run. Historical prose controls its
// old save decisions; the repaired path calls the actual read-only helper.
import assert from 'node:assert/strict';
import { githubFixture, HEAD } from '../saved-revision.mjs';
import { savedRevision } from '../../../.agents/skills/save/scripts/saved-revision.mjs';

export async function observeRevisionChain({ beforeHelper, beforeVerify }) {
  assert.match(beforeHelper, /once its check passes/);
  assert.match(beforeVerify, /\*\*Save, prepare independently\.\*\* `\/save`/);
  const trace = [], counts = { checkpoint: 0, push: 0, wait: 0, test: 0, walkthrough: 0 };
  const checkpoint = phase => {
    trace.push({ phase, action: 'checkpoint', headSha: HEAD });
    counts.checkpoint++; counts.push++; counts.wait++; counts.test++;
  };
  const parts = ['implementation-one', 'test-authoring-one', 'implementation-two', 'test-authoring-two'];
  const before = { trace: [], counts: { checkpoint: parts.length + 2, push: parts.length + 2, wait: parts.length + 2, test: parts.length + 2, walkthrough: 1 } };
  for (const part of parts) before.trace.push({ phase: part, action: 'author', headSha: HEAD }, { phase: part, action: 'checkpoint', headSha: HEAD });
  before.trace.push({ phase: 'final', action: 'checkpoint', headSha: HEAD }, { phase: 'walk', action: 'checkpoint', headSha: HEAD });
  for (const part of parts) trace.push({ phase: part, action: 'author', headSha: HEAD });
  checkpoint('final');
  const initial = await savedRevision(githubFixture());
  const receipt = { ...initial, gateResult: 'SUCCESS' };
  const reused = await savedRevision({ ...githubFixture(), checkpoint: receipt });
  assert.equal(reused.gateResult, 'SUCCESS');
  assert.equal(reused.reused, true);
  trace.push({ phase: 'walk', action: 'identity-read', headSha: reused.headSha });
  counts.walkthrough++;
  // A second standalone invocation gathers new evidence, never another save.
  const standalone = await savedRevision(githubFixture());
  assert.equal(standalone.state, 'SAVED');
  assert.equal(standalone.reused, false);
  const passing = subject => subject.counts.checkpoint === 1 && subject.trace.slice(0, parts.length).every(event => event.action === 'author');
  assert.equal(passing(before), false);
  assert.equal(passing({ trace, counts }), true);
  return { before, after: { trace, counts }, sourceHead: HEAD, reused, standalone,
    limits: 'Mock side-effect counts and historical instruction interpretation, not proof of actual agent obedience or live deployment' };
}
