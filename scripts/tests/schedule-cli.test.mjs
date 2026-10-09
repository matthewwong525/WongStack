import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main, scheduleView } from '../../.agents/skills/schedule/scripts/schedule.mjs';
import { localProgress, progressRoute } from '../../.agents/skills/schedule/scripts/lib/progress.mjs';
import { binding, item, routine, store, host } from './fixtures/scheduled-work.mjs';
import { writeRoutine } from '../../.agents/skills/schedule/scripts/lib/records.mjs';
function workspace(t) { const root = mkdtempSync(path.join(tmpdir(), 'wong-schedule-cli-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
async function run(root, argv, extras = {}) { let text = ''; const code = await main(argv, { root, out: value => { text += value; }, ...extras }); return { code, text, data: text.startsWith('{') ? JSON.parse(text) : null }; }
test('one durable local store claims exclusively, writes atomically and does not steal claims', async t => {
  const root = workspace(t), file = path.join(root, 'outside-checkout/state.json'), first = localProgress(file), second = localProgress(file);
  assert.equal(existsSync(path.dirname(file)), false);
  assert.equal(await first.read(), null); assert.equal(existsSync(path.dirname(file)), false);
  await first.write({ revision: 'approved' }); assert.equal((await second.read()).revision, 'approved');
  assert.equal(await first.claim('one'), true); assert.equal(await second.claim('two'), false); await second.release('two'); assert.equal(await second.claim('two'), false);
  await first.release('one'); assert.equal(await second.claim('two'), true); await second.release('two');
  assert.equal(readFileSync(file, 'utf8').includes('approved'), true);
  assert.throws(() => localProgress('relative'), /absolute/);
  assert.throws(() => progressRoute(binding({ progress: { type: 'memory', reference: 'facts' } })), /unavailable/);
  assert.equal(progressRoute(binding(), { local: () => first }), first); assert.ok(progressRoute(binding()).read);
});
test('combined live view preserves unavailable truth, native results and partial-registration repair', async () => {
  const rows = await scheduleView([item()], () => host({ async inspect(id) { return { id, status: 'active', nextRunAt: '2026-10-10T10:00:00Z', runs: [{ result: 'synthetic' }] }; } }));
  assert.equal(rows[0].live, 'observed'); assert.equal(rows[0].lastResult.result, 'synthetic');
  const unavailable = await scheduleView([item()], () => host({ async inspect() { throw Error('offline'); } })); assert.equal(unavailable[0].live, 'unavailable'); assert.equal(unavailable[0].nextRunAt, null);
  const pending = item({ published: false, state: 'registering' }); assert.equal((await scheduleView([pending], () => host()))[0].repairNeeded, true);
  assert.equal((await scheduleView([item({ binding: binding({ execution: { ...binding().execution, nativeId: null } }) })], () => host()))[0].stale, true);
});
test('CLI writes routine, inspects, lists and reports parse/format errors without host mutation', async t => {
  const root = workspace(t), file = path.join(root, 'prepared.json'); writeFileSync(file, JSON.stringify(routine()));
  const cli = async () => ({ changes: [] });
  assert.equal((await run(root, ['--help'])).code, 0);
  assert.equal((await run(root, ['create-routine', '--file', file])).code, 0);
  assert.equal((await run(root, ['inspect', '--record', 'schedules/synthetic.json'], { host: host() })).data.record.kind, 'routine');
  assert.equal((await run(root, ['list'], { openspec: cli, host: host() })).data.records.length, 1);
  assert.equal((await run(root, ['inspect'])).code, 2); assert.equal((await run(root, ['--bad'])).code, 2);
  assert.equal((await run(root, ['unknown', '--record', 'schedules/synthetic.json'])).code, 2);
});
test('CLI management checkpoints verified pause/resume and blocks unanswered decisions/terminal runs', async t => {
  const root = workspace(t), row = routine(), s = store(), h = host();
  h.resume = async id => ({ version: 1, host: 'paseo', action: 'resume', nativeId: id, outcome: 'verified', observedAt: 'now', observation: { id, status: 'active' } });
  h.run = async id => ({ version: 1, host: 'paseo', action: 'run', nativeId: id, outcome: 'unknown' });
  writeRoutine(root, row); const extras = { host: h, routes: { local: () => s } };
  assert.equal((await run(root, ['pause', '--record', 'schedules/synthetic.json'], extras)).data.state, 'paused');
  assert.equal((await run(root, ['resume', '--record', 'schedules/synthetic.json'], extras)).data.state, 'scheduled');
  assert.equal((await run(root, ['run', '--record', 'schedules/synthetic.json'], extras)).data.receipt.outcome, 'unknown');
  await s.write({ pendingQuestion: { id: 'q', owner: row.owner } });
  assert.equal((await run(root, ['resume', '--record', 'schedules/synthetic.json'], extras)).code, 2);
  assert.equal((await run(root, ['answer', '--record', 'schedules/synthetic.json', '--question', 'q', '--owner', row.owner, '--answer', 'please draft'], extras)).code, 0);
  assert.equal((await run(root, ['cancel', '--record', 'schedules/synthetic.json', '--evidence', 'synthetic://request'], extras)).data.state, 'cancelled');
  assert.equal((await run(root, ['resume', '--record', 'schedules/synthetic.json'], extras)).code, 2);
  const saved = JSON.parse(readFileSync(path.join(root, 'schedules/synthetic.json'), 'utf8')); assert.equal(saved.binding.lifecycle.stopVerified, true);
});
test('CLI fresh startup validates actual native identity and claims the single selected route', async t => {
  const root = workspace(t), row = routine(), s = store(); writeRoutine(root, row);
  const activeHost = host({ async inspect(id) { return { id, runs: [{ agentId: 'synthetic-agent', endedAt: null }] }; } });
  const execution = { host: activeHost, env: { PASEO_AGENT_ID: 'synthetic-agent' }, routes: { local: () => s } };
  const args = ['start', '--record', 'schedules/synthetic.json', '--native-id', 'job-1', '--generation', '1', '--revision', row.binding.revision, '--run-id', 'trial'];
  // Routine fixture has no finite expiry, so wall-clock time is immaterial.
  assert.equal((await run(root, args, execution)).code, 0);
  assert.equal((await run(root, args, execution)).code, 2); await s.release('trial');
  const changed = [...args]; changed[changed.indexOf('--revision') + 1] = 'old'; assert.equal((await run(root, changed, execution)).code, 2);
});

test('registration binding remains pending until published checkpoint and native reconciliation', async t => {
  const root = workspace(t), row = routine(), s = store(), h = host(); writeRoutine(root, row);
  const extras = { host: h, routes: { local: () => s } };
  assert.equal((await run(root, ['register', '--record', 'schedules/synthetic.json'], extras)).data.state, 'registering');
  assert.equal((await run(root, ['bind', '--record', 'schedules/synthetic.json'], extras)).data.state, 'registering');
  assert.equal((await run(root, ['reconcile', '--record', 'schedules/synthetic.json'], extras)).code, 2);
  const pending = JSON.parse(readFileSync(path.join(root, 'schedules/synthetic.json'), 'utf8')); pending.binding.lifecycle.published = true; pending.binding.lifecycle.publication = 'synthetic:published-bound-checkpoint'; writeRoutine(root, pending);
  const { startupPrompt } = await import('../../.agents/skills/schedule/scripts/lib/hosts.mjs');
  h.inspect = async id => ({ id, status: 'active', prompt: startupPrompt(pending.binding), nextRunAt: '2026-10-10T10:00:00Z' });
  assert.equal((await run(root, ['reconcile', '--record', 'schedules/synthetic.json'], extras)).data.state, 'scheduled');
  const config = path.join(root, 'change.json'); writeFileSync(config, JSON.stringify({ prompt: 'unauthorized expanded instructions' }));
  assert.equal((await run(root, ['change', '--record', 'schedules/synthetic.json', '--file', config], extras)).code, 2);
  assert.equal((await run(root, ['release', '--record', 'schedules/synthetic.json', '--run-id', 'none'], extras)).code, 0);
});

test('listing merges actual run continuation so waiting and completed work cannot appear scheduled', async () => {
  const { executeRun } = await import('../../.agents/skills/schedule/scripts/lib/lifecycle.mjs');
  const { context } = await import('./fixtures/scheduled-work.mjs');
  const row = item(), s = store(), h = host();
  const services = { store: s, host: h, async checkCompletion() { return { complete: false, evidence: 'synthetic://open' }; }, async chooseStep() { return { question: { id: 'pending-1', deferredAction: 'read' } }; }, async deliverQuestion() { return { verified: true }; } };
  await executeRun(row, services, context);
  const waiting = (await scheduleView([row], () => h, { routes: { local: () => s } }))[0];
  assert.equal(waiting.state, 'waiting'); assert.equal(waiting.stateSource, 'progress'); assert.equal(waiting.questionId, 'pending-1');
  services.checkCompletion = async () => ({ complete: true, evidence: 'synthetic://done' }); await executeRun(row, services, context);
  const completed = (await scheduleView([row], () => h, { routes: { local: () => s } }))[0]; assert.equal(completed.state, 'completed'); assert.equal(completed.nextRunAt, null);
  assert.equal(completed.repairNeeded, true); // A still-active native observation conflicts with verified terminal progress.
  await s.write({ revision: row.binding.revision, generation: 1, nextAt: '2026-10-10T11:00:00Z', reschedulePending: true });
  const pending = (await scheduleView([row], () => h, { routes: { local: () => s } }))[0]; assert.equal(pending.state, 'cleanup-pending'); assert.equal(pending.requestedNextAt, '2026-10-10T11:00:00Z'); assert.equal(pending.nextRunAt, null);
  const denied = (await scheduleView([row], () => h, { routes: { local: () => ({ async read() { throw Error('denied'); } }) } }))[0]; assert.equal(denied.progress, 'unavailable'); assert.equal(denied.stateSource, 'checkpoint'); assert.equal(denied.stale, true);
});
