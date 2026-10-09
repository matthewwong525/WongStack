// Pure guards plus a receipt-driven run. Callers supply actual completion/outward services.
import { randomUUID } from 'node:crypto';
import { credentialFree, requireValue, validateBinding } from './records.mjs';
import { validateCapabilities, validateReceipt } from './hosts.mjs';

export function readyToRun(item, progress, { nativeId, generation, publishedRevision, now = Date.now() }) {
  const binding = item.binding;
  validateBinding(binding, { kind: item.kind });
  requireValue(binding.lifecycle.published && publishedRevision === binding.revision, 'Published approved instructions are unavailable or changed.');
  requireValue(binding.execution.nativeId === nativeId && generation === binding.execution.generation, 'Native binding or execution generation is stale.');
  requireValue(!['registering', 'paused', 'cancelled', 'completed', 'superseded'].includes(binding.lifecycle.state), 'This schedule is disabled or still registering.');
  requireValue(!progress?.terminal, 'The authoritative continuation already closed this schedule.');
  if (progress) requireValue(progress.revision === binding.revision && progress.generation === generation, 'Continuation revision/generation differs from approved instructions.');
  const timing = binding.timing;
  requireValue(!timing.expiresAt || now <= Date.parse(timing.expiresAt), 'This schedule has expired.');
  if (timing.mode === 'once') requireValue(now >= Date.parse(timing.dueAt) && now <= Date.parse(timing.dueAt) + timing.allowedLatenessMs, 'One-time run is early or outside its allowed lateness.');
  return binding;
}
export function nextWake(binding, requested, now = Date.now()) {
  const next = Date.parse(requested), timing = binding.timing;
  requireValue(Number.isFinite(next) && next > now, 'Next wake-up must be an absolute future time.');
  for (const [field, comparison] of [['earliest', (n, limit) => n >= limit], ['latest', (n, limit) => n <= limit], ['expiresAt', (n, limit) => n <= limit]]) {
    if (timing[field]) requireValue(comparison(next, Date.parse(timing[field])), `Next wake-up exceeds ${field}.`);
  }
  if (timing.contactHours) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timing.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(next));
    const { start, end } = timing.contactHours;
    requireValue(start <= end ? parts >= start && parts <= end : parts >= start || parts <= end, 'Next wake-up is outside permitted contact hours.');
  }
  return new Date(next).toISOString();
}
export function authorize(binding, action) {
  const scope = binding.authority;
  requireValue(scope && scope.actions.includes(action.type), 'Action exceeds agreed schedule scope.');
  requireValue(!['call', 'payment', 'publish-code', 'refund'].includes(action.type), 'Calls, payments and code publication require a separate user action.');
  if (action.recipient) requireValue(scope.recipients.includes(action.recipient) && scope.channels.includes(action.channel), 'Recipient or channel exceeds agreed authority.');
  requireValue(typeof action.id === 'string' && action.id.length > 0, 'Outward actions need stable IDs.');
  return action;
}
export async function terminal(item, progress, store, host, reason, evidence) {
  requireValue(typeof evidence === 'string' && evidence.length > 0, 'Terminal stopping requires authoritative evidence.');
  const state = { ...progress, terminal: { reason, evidence }, pendingQuestion: null, cleanupPending: true };
  await store.write(state); // Guard outreach before attempting native stop.
  let receipt;
  try { receipt = validateReceipt(await host.cancel(item.binding.execution.nativeId), { host: host.name, nativeId: item.binding.execution.nativeId, action: 'cancel' }); }
  catch { receipt = { outcome: 'unknown' }; }
  const stopped = receipt.outcome === 'verified';
  state.cleanupPending = !stopped; state.stopReceipt = receipt; await store.write(state);
  return { state: stopped ? reason : 'cleanup-pending', evidence, stopVerified: stopped, archivePending: item.kind === 'goal', progress: state };
}
async function rearm(binding, progress, store, host, requested, now) {
  const nextAt = nextWake(binding, requested, now);
  requireValue(binding.execution.capabilities.update && binding.execution.capabilities.stop, 'Future self-management is unavailable.');
  progress.nextAt = nextAt; progress.reschedulePending = true; await store.write(progress);
  let receipt;
  try { receipt = validateReceipt(await host.update(binding.execution.nativeId, { timing: { ...binding.timing, mode: 'once', dueAt: nextAt, expiresAt: binding.timing.expiresAt ?? new Date(Date.parse(nextAt) + 60000).toISOString() } }), { host: host.name, nativeId: binding.execution.nativeId, action: 'update' }); }
  catch { receipt = { outcome: 'unknown' }; }
  progress.reschedulePending = receipt.outcome !== 'verified'; progress.clockReceipt = receipt; await store.write(progress);
  return { state: progress.reschedulePending ? 'cleanup-pending' : progress.pendingQuestion ? 'waiting' : 'scheduled', nextAt: receipt.outcome === 'verified' ? receipt.observation.nextRunAt : null };
}
export async function executeRun(item, services, context) {
  const { store, host, checkCompletion, chooseStep, performAction, inspectAction, deliverQuestion } = services;
  const runId = context.runId ?? randomUUID();
  requireValue(await store.claim(runId), 'Another run owns this step; no outward work.');
  try {
    let progress = await store.read();
    if (progress?.terminal) return { state: progress.cleanupPending ? 'cleanup-pending' : progress.terminal.reason, suppressed: true, archivePending: item.kind === 'goal' };
    const binding = readyToRun(item, progress, context);
    const outreach = binding.authority?.actions?.some(action => !['read', 'draft'].includes(action));
    validateCapabilities(binding.execution.capabilities, { adaptive: binding.adaptive === true, outreach, questions: Boolean(binding.questionSurface), once: binding.timing.mode === 'once' });
    progress ??= { revision: binding.revision, generation: binding.execution.generation, receipts: [], pendingQuestion: null };
    if (item.kind === 'goal') {
      requireValue(checkCompletion, 'The authoritative completion source cannot be checked.');
      const completion = await checkCompletion(binding.completionSource);
      if (completion?.complete === true) return await terminal(item, progress, store, host, 'completed', completion.evidence);
      requireValue(completion?.complete === false && completion.evidence, 'Missing or ambiguous completion evidence; no outreach.');
    }
    if (progress.pendingQuestion) {
      const check = await chooseStep?.({ item, progress, waiting: true });
      const wake = check?.nextAt ? await rearm(binding, progress, store, host, check.nextAt, context.now) : { state: 'waiting' };
      return { ...wake, questionId: progress.pendingQuestion.id, suppressed: true }; // Deferred actions/questions are ignored while waiting.
    }
    if (progress.uncertain) {
      requireValue(inspectAction, 'Prior outward result is uncertain; inspect the service before retry.');
      const observation = await inspectAction(progress.uncertain);
      requireValue(observation?.status === 'sent' || observation?.status === 'not-sent', 'Service receipt remains ambiguous; wait for help.');
      if (observation.status === 'sent') progress.receipts.push({ id: progress.uncertain.id, receipt: observation.reference });
      progress.uncertain = null; await store.write(progress);
    }
    const step = await chooseStep({ item, progress });
    if (step.question) {
      requireValue(binding.questionSurface && deliverQuestion, 'No verified user question surface; dependent work is blocked.');
      progress.pendingQuestion = { id: step.question.id ?? randomUUID(), owner: binding.owner, deferredAction: step.question.deferredAction, delivery: 'pending' };
      await store.write(progress); // Lost notification responses never re-offer automatically.
      const delivery = await deliverQuestion({ ...step.question, id: progress.pendingQuestion.id, owner: binding.owner });
      progress.pendingQuestion.delivery = delivery?.verified ? 'delivered' : 'unknown';
      await store.write(progress);
      const wake = step.nextAt ? await rearm(binding, progress, store, host, step.nextAt, context.now) : { state: 'waiting' };
      return { ...wake, questionId: progress.pendingQuestion.id, delivered: delivery?.verified === true };
    }
    if (step.action) {
      const action = authorize(binding, step.action);
      if (!progress.receipts.some(receipt => receipt.id === action.id)) {
        const now = context.now ?? Date.now();
        const last = progress.receipts.filter(receipt => receipt.sentAt).at(-1);
        requireValue(!last || now - Date.parse(last.sentAt) >= binding.authority.minIntervalMs, 'Outreach frequency exceeds the agreed limit.');
        if (binding.timing.contactHours) nextWake(binding, new Date(now + 1000).toISOString(), now);

        progress.uncertain = { id: action.id, service: action.service, startedAt: new Date().toISOString() };
        await store.write(progress); // A process crash is treated as an ambiguous outward result.
        const result = await performAction(action);
        requireValue(result?.verified === true && result.reference, 'Outward result is uncertain; do not blindly retry.');
        progress.receipts.push({ id: action.id, receipt: result.reference, sentAt: new Date(context.now ?? Date.now()).toISOString() }); progress.uncertain = null; await store.write(progress);
      }
    }
    if (binding.timing.mode === 'once') {
      requireValue(step.succeeded === true && step.evidence, 'A one-time agent exit alone does not complete its work.');
      return await terminal(item, progress, store, host, 'completed', step.evidence);
    }
    if (step.nextAt) return await rearm(binding, progress, store, host, step.nextAt, context.now);
    return { state: 'scheduled', progress }; // Ongoing successful routines remain configured.
  } finally { await store.release(runId); }
}
export async function answerQuestion(store, { questionId, owner, answer }) {
  const progress = await store.read(), question = progress?.pendingQuestion;
  requireValue(question && question.id === questionId && question.owner === owner, 'Answer does not match the pending question and identified owner.');
  requireValue(typeof answer === 'string' && answer.trim(), 'Silence or elapsed time is never consent.');
  progress.lastAnswer = credentialFree({ questionId, owner, answer, deferredAction: question.deferredAction });
  progress.pendingQuestion = null; await store.write(progress); return { state: 'paused', requiresResume: true };
}
export async function register(item, store, host, operationId = randomUUID()) {
  requireValue(item.published, 'Record publication is pending.');
  const progress = (await store.read()) ?? { revision: item.binding.revision, generation: item.binding.execution.generation, receipts: [] };
  progress.registration ??= { operationId }; await store.write(progress);
  if (progress.registration.nativeId) return { state: 'registering', nativeId: progress.registration.nativeId, receipt: await host.inspect(progress.registration.nativeId) };
  const receipt = validateReceipt(await host.create(item.binding, progress.registration.operationId), { host: host.name, action: 'create' });
  progress.registration.receipt = receipt;
  if (receipt.outcome === 'verified') progress.registration.nativeId = receipt.nativeId;
  await store.write(progress);
  return { state: 'registering', nativeId: receipt.nativeId, receipt, next: 'Publish the exact native binding checkpoint, then inspect before activation is reported.' };
}
export async function transitionRecord(from, to, { approved = false, host, store }) {
  requireValue(approved && from.kind !== to.kind && from.key === to.key, 'A record type transition needs explicit approval and the same stable identity.');
  requireValue(from.binding.execution.nativeId === to.binding.execution.nativeId, 'A transition must preserve one native identity.');
  requireValue(to.published && from.binding.execution.generation < to.binding.execution.generation, 'Publish a successor generation before handoff.');
  const paused = await host.pause(from.binding.execution.nativeId);
  requireValue(paused.outcome === 'verified', 'Original trigger pause is unverified; no successor activation.');
  const progress = await store.read();
  requireValue(!progress?.uncertain && !progress?.pendingQuestion, 'Resolve pending actions/questions before changing record type.');
  const receipt = await host.update(to.binding.execution.nativeId, { prompt: servicesPrompt(to.binding) });
  requireValue(receipt.outcome === 'verified', 'Successor prompt update is unverified; remain paused.');
  await store.write({ ...progress, revision: to.binding.revision, generation: to.binding.execution.generation, terminal: null });
  return { state: 'paused', predecessor: 'superseded', successor: to.reference, archivePredecessor: from.kind === 'goal', receipt };
}
function servicesPrompt(binding) { return `Read published ${binding.repository} record ${binding.record} revision ${binding.revision} generation ${binding.execution.generation}; follow .agents/skills/schedule/references/run.md.`; }
export async function migrate(oldHost, oldId, newHost, binding, store, { approved = false, operationId = randomUUID() } = {}) {
  requireValue(approved, 'Migration requires an explicit selected-job handoff.');
  const previous = await oldHost.inspect(oldId);
  requireValue(previous.id === oldId, 'Legacy identity mismatch.');
  const progress = (await store.read()) ?? {};
  progress.migration ??= { oldId, operationId, state: 'pausing' }; await store.write(progress);
  requireValue(progress.migration.oldId === oldId, 'Migration operation belongs to another job.');
  const pause = await oldHost.pause(oldId);
  requireValue(pause.outcome === 'verified', 'Original pause is not verified; replacement is blocked.');
  progress.migration.state = 'paused'; await store.write(progress);
  const created = validateReceipt(await newHost.create(binding, progress.migration.operationId), { host: newHost.name, action: 'create' });
  progress.migration = { ...progress.migration, state: created.outcome === 'verified' ? 'binding-pending' : 'unknown', receipt: created };
  await store.write(progress); return progress.migration;
}
export async function archiveGoal(item, store, archive) {
  requireValue(item.kind === 'goal', 'Ongoing definitions are retained, never OpenSpec archived.');
  const progress = await store.read();
  requireValue(progress?.terminal?.evidence && !progress.cleanupPending && item.binding.lifecycle.stopVerified === true, 'Goal archival requires evidence and verified native stop.');
  try { await archive(item.name, { store: item.store, skipSpecs: true }); return { state: progress.terminal.reason, archived: true }; }
  catch { return { state: progress.terminal.reason, archived: false, archivePending: true }; }
}

export async function adopt(item, host, store, nativeId, { approved = false } = {}) {
  requireValue(approved && nativeId, 'Adoption needs explicit selected-job approval.');
  const observed = await host.inspect(nativeId);
  requireValue(observed.id === nativeId, 'Adoption identity differs from the selected job.');
  const paused = await host.pause(nativeId);
  requireValue(paused.outcome === 'verified', 'Existing trigger pause is unverified; adoption stays pending.');
  const progress = (await store.read()) ?? { revision: item.binding.revision, generation: item.binding.execution.generation, receipts: [] };
  progress.registration = { operationId: `adopt-${nativeId}`, nativeId, receipt: { version: 1, host: host.name, action: 'create', nativeId, outcome: 'verified', observedAt: new Date().toISOString(), observation: observed } };
  await store.write(progress);
  return { state: 'registering', nativeId, requiredPromptRepair: !observed.prompt?.includes(item.reference), next: 'Publish the guarded binding for this same native identity, update/inspect its prompt explicitly, then resume/reconcile. No replacement trigger was created.' };
}
