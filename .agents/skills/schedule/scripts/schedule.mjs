#!/usr/bin/env node
// Schedule records, verified host management, and fresh-session startup. No git or provisioning.
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { loadRecord, listRecords, checkpoint, createGoal, writeRoutine, ScheduleError, requireValue } from './lib/records.mjs';
import { paseoAdapter, unsupportedAdapter, validateReceipt, startupPrompt, validateCapabilities } from './lib/hosts.mjs';
import { progressRoute } from './lib/progress.mjs';
import { readyToRun, answerQuestion, register, terminal, nextWake, adopt } from './lib/lifecycle.mjs';
import { legacyAdapter, legacyContext, teardownLegacy } from './lib/legacy.mjs';
export { validateBinding, validateRoutine, loadRecord, listRecords } from './lib/records.mjs';

const USAGE = 'usage: schedule.mjs list | inspect|resolve|start|register|adopt|bind|reconcile|release|pause|resume|run|cancel|answer|change --record <reference> [--store <id>] | create-routine|create-goal --file <json> | legacy list|inspect|pause|resume|cancel|teardown [native-id]';
function hostFor(binding, world) { return world.host ?? (binding.execution.host === 'paseo' ? paseoAdapter({ env: world.env }) : unsupportedAdapter(binding.execution.host)); }
export async function scheduleView(items, hostOf, { routes = {} } = {}) {
  const rows = [];
  for (const item of items) {
    const row = { kind: item.kind, key: item.key, name: item.name, owner: item.owner, state: item.state, reference: item.reference, host: item.binding.execution.host, nativeId: item.binding.execution.nativeId, nextRunAt: null, lastResult: null, live: 'unavailable', stale: true };
    if (row.nativeId) {
      try {
        const observed = await hostOf(item.binding).inspect(row.nativeId);
        requireValue(observed.id === row.nativeId, 'Live identity differs.');
        row.nextRunAt = observed.nextRunAt ?? null; row.lastResult = observed.runs?.at(-1) ?? observed.lastRun ?? null;
        row.nativeState = observed.status; row.live = 'observed'; row.stale = false;
        row.repairNeeded = (['paused', 'cancelled', 'completed'].includes(row.state) && observed.status === 'active') || (!item.published);
      } catch { /* retain unavailable host truth */ }
    }
    try {
      const progress = await progressRoute(item.binding, routes).read();
      row.progress = 'available'; row.stateSource = 'checkpoint';
      if (progress && (progress.revision !== item.binding.revision || progress.generation !== item.binding.execution.generation)) { row.progress = 'stale'; row.stale = true; }
      else if (progress) {
        row.stateSource = 'progress';
        if (progress.terminal) { row.state = progress.cleanupPending ? 'cleanup-pending' : progress.terminal.reason; row.nextRunAt = progress.cleanupPending ? row.nextRunAt : null; }
        else if (progress.pendingQuestion) { row.state = progress.reschedulePending ? 'cleanup-pending' : 'waiting'; row.questionId = progress.pendingQuestion.id; }
        else if (progress.reschedulePending) row.state = 'cleanup-pending';
        if (!progress.terminal && progress.nextAt) row.requestedNextAt = progress.nextAt;
      }
    } catch { row.progress = 'unavailable'; row.stateSource = 'checkpoint'; row.stale = true; }
    if (row.live === 'observed') row.repairNeeded = !item.published || (['paused', 'cancelled', 'completed', 'cleanup-pending'].includes(row.state) && row.nativeState === 'active');
    rows.push(row);
  }
  return rows;
}
export async function main(argv = process.argv.slice(2), world = {}) {
  world = { root: process.cwd(), env: process.env, out: text => process.stdout.write(text), ...world };
  try {
    const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
      record: { type: 'string' }, store: { type: 'string' }, root: { type: 'string' }, file: { type: 'string' }, 'native-id': { type: 'string' }, generation: { type: 'string' }, revision: { type: 'string' }, 'run-id': { type: 'string' }, owner: { type: 'string' }, question: { type: 'string' }, answer: { type: 'string' }, evidence: { type: 'string' }, resources: { type: 'string' }, help: { type: 'boolean' },
    } });
    const [command = 'list', action, nativeId] = positionals, root = values.root ?? world.root;
    const options = { store: values.store, openspec: world.openspec };
    let result;
    if (values.help) { world.out(`${USAGE}\n`); return 0; }
    requireValue(['legacy', 'list', 'ls', 'create-routine', 'create-goal', 'inspect', 'resolve', 'validate', 'start', 'register', 'adopt', 'bind', 'reconcile', 'release', 'pause', 'resume', 'run', 'cancel', 'answer', 'change'].includes(command), `Unknown schedule command ${command}.`);
    if (command === 'legacy') {
      const context = world.legacyContext ?? legacyContext(root, world.env);
      if (action === 'teardown') result = await teardownLegacy(context, values.resources?.split(','), world);
      else {
        const host = legacyAdapter(context, world);
        requireValue(['list', 'inspect', 'pause', 'resume', 'cancel'].includes(action), 'Legacy supports only list/inspect/pause/resume/cancel/explicit teardown.');
        result = action === 'list' ? await host.list() : await host[action](nativeId);
      }
    } else if (['list', 'ls'].includes(command)) {
      const found = await listRecords(root, options);
      result = { records: await scheduleView(found.records, binding => hostFor(binding, world), { routes: world.routes }), errors: found.errors };
    } else if (command === 'create-routine') {
      result = { reference: writeRoutine(root, JSON.parse(readFileSync(values.file, 'utf8'))), activation: 'pending' };
    } else if (command === 'create-goal') {
      const requested = JSON.parse(readFileSync(values.file, 'utf8'));
      result = await createGoal(root, requested.name, { ...requested, ...options });
    } else {
      requireValue(values.record, 'Select an exact schedule record.');
      const item = await loadRecord(root, values.record, options), binding = item.binding, host = hostFor(binding, world);
      if (['inspect', 'resolve', 'validate'].includes(command)) result = { record: item, live: (await scheduleView([item], () => host, { routes: world.routes }))[0] };
      else {
        const store = progressRoute(binding, world.routes);
        if (command === 'start') {
          const progress = await store.read();
          const context = { nativeId: values['native-id'], generation: Number(values.generation), publishedRevision: values.revision };
          readyToRun(item, progress, context);
          if (binding.execution.host === 'paseo') {
            const observed = await host.inspect(binding.execution.nativeId);
            requireValue(world.env.PASEO_AGENT_ID && observed.runs?.some(run => run.agentId === world.env.PASEO_AGENT_ID && !run.endedAt), 'The current Paseo agent is not an observed active run of this binding.');
          } else requireValue(world.executionProof?.verified === true && world.executionProof.nativeId === binding.execution.nativeId, 'The native host has supplied no verified current-run identity.');
          const runId = values['run-id'] ?? randomUUID();
          requireValue(await store.claim(runId), 'Another session owns this run.');
          result = { record: item, progress, runId, next: 'Follow references/run.md. Keep claim through all outward steps; use the same authoritative store, then release.' };
        } else if (command === 'register') result = await register(item, store, host);
        else if (command === 'adopt') { requireValue(values.evidence, 'Adoption needs explicit selected-job authorization evidence.'); result = await adopt(item, host, store, values['native-id'], { approved: true }); }
        else if (command === 'release') { requireValue(values['run-id'], 'Name the exact execution claim.'); await store.release(values['run-id']); result = { released: true }; }
        else if (command === 'bind') {
          const progress = await store.read();
          requireValue(progress?.registration?.nativeId && progress.registration.receipt?.outcome === 'verified', 'Registration has no verified native identity.');
          const observed = await host.inspect(progress.registration.nativeId);
          requireValue(observed.id === progress.registration.nativeId, 'Native registration identity mismatch.');
          result = checkpoint(item, { ...binding, execution: { ...binding.execution, nativeId: observed.id }, lifecycle: { ...binding.lifecycle, state: 'registering', published: false } });
        } else if (command === 'reconcile') {
          requireValue(item.published && binding.execution.nativeId, 'Publish the binding checkpoint before reconciliation.');
          validateCapabilities(binding.execution.capabilities, { adaptive: binding.adaptive === true, outreach: binding.authority.actions.some(action => !['read', 'draft'].includes(action)), questions: Boolean(binding.questionSurface), once: binding.timing.mode === 'once' });
          const observed = await host.inspect(binding.execution.nativeId);
          requireValue(observed.id === binding.execution.nativeId && observed.prompt === startupPrompt(binding), 'Native binding/prompt does not match the published record.');
          requireValue(observed.status === 'active' && observed.nextRunAt, 'Native registration is not active with a next wake-up.');
          result = checkpoint(item, { ...binding, lifecycle: { ...binding.lifecycle, state: 'scheduled', reconciledAt: new Date().toISOString() } });
        }
        else if (command === 'answer') result = await answerQuestion(store, { questionId: values.question, owner: values.owner, answer: values.answer });
        else if (command === 'cancel') {
          requireValue(values.evidence, 'Cancellation needs the identified user request evidence.');
          result = await terminal(item, (await store.read()) ?? { revision: binding.revision, generation: binding.execution.generation, receipts: [] }, store, host, 'cancelled', values.evidence);
          checkpoint(item, { ...binding, lifecycle: { ...binding.lifecycle, ...result, progress: undefined } });
        } else if (['pause', 'resume', 'run', 'change'].includes(command)) {
          requireValue(item.published && binding.execution.nativeId && (item.state !== 'registering' || ['resume', 'change', 'pause'].includes(command)), 'Registration/binding publication is not complete.');
          const progress = await store.read();
          requireValue(!progress?.terminal && !['cancelled', 'completed', 'superseded'].includes(item.state), 'Terminal schedules cannot be resumed.');
          if (command !== 'pause') validateCapabilities(binding.execution.capabilities, { adaptive: binding.adaptive === true, outreach: binding.authority.actions.some(action => !['read', 'draft'].includes(action)), questions: Boolean(binding.questionSurface), once: binding.timing.mode === 'once' });
          if (command !== 'pause') requireValue(!progress?.pendingQuestion, 'The identified owner must answer the pending question first.');
          if (command === 'resume' && item.state === 'registering') requireValue((await host.inspect(binding.execution.nativeId)).prompt === startupPrompt(binding), 'Inspect the approved guarded prompt before resuming registration.');
          let change;
          if (command === 'change') {
            change = JSON.parse(readFileSync(values.file, 'utf8'));
            requireValue(!change.prompt || change.prompt === startupPrompt(binding), 'Publish approved instruction changes before updating the guarded native prompt.');
            if (change.timing?.dueAt) nextWake(binding, change.timing.dueAt);
          }
          const receipt = validateReceipt(await (command === 'change' ? host.update(binding.execution.nativeId, change) : host[command](binding.execution.nativeId)), { host: host.name, nativeId: binding.execution.nativeId, action: command === 'change' ? 'update' : command });
          result = { receipt, state: receipt.outcome === 'verified' ? (command === 'pause' ? 'paused' : 'scheduled') : item.state };
          if (receipt.outcome === 'verified' && ['pause', 'resume'].includes(command)) checkpoint(item, { ...binding, lifecycle: { ...binding.lifecycle, state: result.state } });
        } else throw new ScheduleError(`Unknown schedule command ${command}.`);
      }
    }
    world.out(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`); return 0;
  } catch (error) {
    const code = error instanceof ScheduleError ? error.code : String(error.code).startsWith('ERR_PARSE_ARGS') ? 2 : 1;
    world.out(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra })}\n`); return code;
  }
}
if (isMain(import.meta.url)) process.exitCode = await main();
