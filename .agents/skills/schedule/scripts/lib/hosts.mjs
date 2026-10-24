// Normalized native receipts. Paseo uses only the public installed CLI; the app host uses the inbox's schedule routes.
import { findPaseo, paseo } from './paseo.mjs';
import { helperService, rememberApp } from '../../../hand-over/scripts/lib/computer.mjs';
import { companyFor } from '../../../hand-over/scripts/lib/inbox.mjs';
import { credentialFree, requireValue, ScheduleError } from './records.mjs';

export const CAPABILITIES = ['oneOff', 'recurrence', 'freshSession', 'inspect', 'update', 'stop', 'progressRead', 'progressWrite', 'nonOverlap', 'questionDelivery'];
export function validateCapabilities(evidence, { adaptive = false, outreach = false, questions = false, once = false } = {}) {
  requireValue(evidence?.futureVerified === true && typeof evidence.verifiedAt === 'string' && evidence.context, 'Future-session capabilities have not been verified.');
  for (const key of CAPABILITIES) requireValue(typeof evidence[key] === 'boolean', `Missing capability ${key}.`);
  const needed = ['freshSession', 'inspect', ...(once ? ['oneOff'] : ['recurrence'])];
  if (adaptive) needed.push('update', 'updateAfterRun', 'stop', 'progressRead', 'progressWrite');
  if (outreach) needed.push('progressRead', 'progressWrite', 'nonOverlap');
  if (questions) needed.push('questionDelivery', 'progressRead', 'progressWrite');
  for (const key of needed) requireValue(evidence[key] === true, `Future-session ${key} is unavailable.`);
  if (evidence.context.location === 'local') requireValue(evidence.context.uptime, 'Report which local app/computer must remain running.');
  return credentialFree(evidence);
}
export function selectExecutable({ predictable, judgment, explicitAssistant = false }) {
  if (predictable && !explicitAssistant) return { type: 'script', reason: 'The steps can be encoded reliably on an existing clock.' };
  requireValue(judgment === true || explicitAssistant === true, 'Assess predictable steps before choosing assistant scheduling.');
  return { type: 'assistant', reason: judgment ? 'Each run needs interpretation and judgment.' : 'The user explicitly chose assistant sessions.' };
}
export function selectHost({ preferred, enclosing, available = [], model: _model }) {
  // The app host wins whenever it answers: its runs survive this chat and show on the person's page.
  const selected = preferred ?? (available.some(host => host.name === 'app' && host.supported) ? 'app' : enclosing);
  if (selected) return available.find(host => host.name === selected) ?? { name: selected, supported: false, reason: 'The requested enclosing host has no verified scheduler.' };
  return available.find(host => host.supported) ?? { name: null, supported: false, reason: 'No available persistent host scheduler; an open-session loop is insufficient.' };
}
export function validateReceipt(receipt, { host, nativeId, action } = {}) {
  requireValue(receipt?.version === 1 && receipt.host === host && receipt.action === action, 'Native receipt contract mismatch.');
  requireValue(['verified', 'unknown', 'unsupported'].includes(receipt.outcome), 'Unknown native receipt outcome.');
  if (nativeId) requireValue(receipt.nativeId === nativeId, 'Mutation changed native schedule identity.');
  if (receipt.outcome === 'verified') requireValue(receipt.observedAt && receipt.observation, 'A verified receipt needs read-back evidence.');
  return credentialFree(receipt);
}
export function normalizedReceipt(host, action, observation, id) {
  return validateReceipt({ version: 1, host, action, nativeId: id ?? observation?.id ?? null, outcome: 'verified', observedAt: new Date().toISOString(), observation }, { host, nativeId: id, action });
}
export function startupPrompt(binding) {
  credentialFree(binding);
  return `Scheduled work startup. Repository: ${binding.repository}. Record: ${binding.record}. Approved revision: ${binding.revision}. Generation: ${binding.execution.generation}. Store: ${binding.store ?? 'nearest'}. Read .agents/skills/schedule/references/run.md and use schedule.mjs start --record ${binding.record}${binding.store ? ` --store ${binding.store}` : ''} --generation ${binding.execution.generation} --revision ${binding.revision} --native-id <the-actual-native-job-id>. Read the exact published record, identify this native job and the sole progress route ${binding.progress.type}:${binding.progress.reference}; refuse unpublished or mismatched bindings. Check completion before outreach. This starts a run, never recursively creates a schedule. No additional authority is granted.`;
}
export function paseoPreset(every) {
  const parsed = /^(\d+)([smhd])$/.exec(every ?? '');
  requireValue(parsed, 'Paseo needs a cron-compatible duration preset.');
  const minutes = Number(parsed[1]) * ({ s: 1 / 60, m: 1, h: 60, d: 1440 }[parsed[2]]);
  if (Number.isInteger(minutes) && minutes > 0 && minutes < 60 && 60 % minutes === 0) return `*/${minutes} * * * *`;
  if (minutes === 60) return '0 * * * *';
  const hours = minutes / 60;
  if (Number.isInteger(hours) && hours > 0 && hours < 24 && 24 % hours === 0) return `0 */${hours} * * *`;
  if (hours === 24) return '0 0 * * *';
  throw new ScheduleError('Duration cannot be represented faithfully by five-field cron.');
}
function onceCron(timing) {
  const due = new Date(timing.dueAt);
  return `${due.getUTCMinutes()} ${due.getUTCHours()} ${due.getUTCDate()} ${due.getUTCMonth() + 1} *`;
}
function cadenceMatches(row, timing, { creating = false } = {}) {
  const expression = timing.mode === 'once' ? onceCron(timing) : timing.cron ?? paseoPreset(timing.every);
  if (row.cadence?.type !== 'cron' || row.cadence.expression !== expression || (row.cadence.timezone ?? 'UTC') !== (timing.mode === 'once' || timing.every ? 'UTC' : timing.timezone)) return false;
  if (timing.mode === 'once' && (row.maxRuns !== (creating ? 1 : null) || Date.parse(row.nextRunAt) !== Date.parse(timing.dueAt))) return false;
  if (timing.expiresAt && (!Number.isFinite(Date.parse(row.expiresAt)) || Math.abs(Date.parse(row.expiresAt) - Date.parse(timing.expiresAt)) > 5000)) return false;
  return true;
}
function creationMatches(row, binding) {
  return row.prompt === startupPrompt(binding) && cadenceMatches(row, binding.timing, { creating: true })
    && (!binding.execution.context.mode || row.target?.config?.modeId === binding.execution.context.mode);
}
function cadenceArgs(timing, now) {
  if (timing.mode === 'once') {
    const due = new Date(timing.dueAt);
    requireValue(due.getTime() % 60000 === 0, 'Paseo cron has minute precision; choose an approved minute-aligned absolute due time.');
    requireValue(Date.parse(timing.expiresAt) >= due.getTime(), 'One-time expiry precedes its due time.');
    requireValue(due.getTime() > now, 'The one-time due time has already passed.');
    return ['--cron', onceCron(timing), '--timezone', 'UTC', '--max-runs', '1', '--expires-in', `${Math.ceil((Date.parse(timing.expiresAt) - now) / 1000)}s`];
  }
  if (timing.every) { paseoPreset(timing.every); requireValue(!timing.timezone || timing.timezone === 'UTC', 'Paseo duration presets use UTC; use cron for another timezone.'); }
  const args = timing.cron ? ['--cron', timing.cron, '--timezone', timing.timezone] : ['--every', timing.every];
  if (timing.expiresAt) { requireValue(Date.parse(timing.expiresAt) > now, 'Timing policy has expired.'); args.push('--expires-in', `${Math.ceil((Date.parse(timing.expiresAt) - now) / 1000)}s`); }
  return args;
}
export function paseoAdapter({ env = process.env, call, now = () => Date.now() } = {}) {
  const invoke = call ?? ((args) => paseo(findPaseo(env, 'WONG_PASEO_BIN'), args, { env }));
  const inspect = async id => {
    const row = await invoke(['schedule', 'inspect', id]);
    requireValue(row?.id === id, 'Paseo inspect returned a different job.');
    return row;
  };
  async function mutation(action, id, args, verify) {
    try { await invoke(['schedule', ...args]); } catch { /* an uncertain response is read back, never retried */ }
    try {
      const observation = await inspect(id);
      if (!verify(observation)) return { version: 1, host: 'paseo', action, nativeId: id, outcome: 'unknown' };
      return normalizedReceipt('paseo', action, observation, id);
    } catch {
      return { version: 1, host: 'paseo', action, nativeId: id, outcome: 'unknown' };
    }
  }
  return {
    name: 'paseo',
    // Create is not paused: publication and startup guards must precede creation.
    pausedCreate: false,
    inspect,
    list: () => invoke(['schedule', 'ls']),
    async create(binding, operationId) {
      requireValue(binding.lifecycle.published, 'Publish guarded instructions before Paseo create.');
      const name = `wong-${binding.key}-${operationId}`;
      const prior = await invoke(['schedule', 'ls']);
      const matches = prior.filter(row => row.name === name);
      requireValue(matches.length <= 1, 'Registration operation has conflicting native jobs.');
      if (matches[0]) { const observed = await inspect(matches[0].id); return creationMatches(observed, binding) ? normalizedReceipt('paseo', 'create', observed) : { version: 1, host: 'paseo', action: 'create', nativeId: observed.id, outcome: 'unknown', operationId }; }
      const args = ['create', startupPrompt(binding), '--name', name, '--cwd', binding.execution.context.cwd, ...cadenceArgs(binding.timing, now())];
      requireValue(binding.execution.context.cwd && !/[/\\]worktrees[/\\]/.test(binding.execution.context.cwd), 'Use a durable primary checkout, not a disposable worktree.');
      if (binding.execution.context.provider) args.push('--provider', binding.execution.context.provider);
      if (binding.execution.context.mode) args.push('--mode', binding.execution.context.mode);
      let row;
      try { row = await invoke(['schedule', ...args]); } catch { /* lost create response: look up this operation */ }
      const found = row?.id ? row : (await invoke(['schedule', 'ls'])).find(each => each.name === name);
      if (!found) return { version: 1, host: 'paseo', action: 'create', nativeId: null, outcome: 'unknown', operationId };
      const observed = await inspect(found.id);
      return creationMatches(observed, binding) ? normalizedReceipt('paseo', 'create', observed) : { version: 1, host: 'paseo', action: 'create', nativeId: observed.id, outcome: 'unknown', operationId };
    },
    pause: id => mutation('pause', id, ['pause', id], row => row.status === 'paused'),
    resume: id => mutation('resume', id, ['resume', id], row => row.status === 'active'),
    async cancel(id) {
      try { await invoke(['schedule', 'delete', id]); } catch { /* read back the exact ID */ }
      try {
        const rows = await invoke(['schedule', 'ls']);
        if (!Array.isArray(rows) || rows.some(row => row.id === id)) return { version: 1, host: 'paseo', action: 'cancel', nativeId: id, outcome: 'unknown' };
        return normalizedReceipt('paseo', 'cancel', { id, status: 'deleted' }, id);
      } catch { return { version: 1, host: 'paseo', action: 'cancel', nativeId: id, outcome: 'unknown' }; }
    },
    async update(id, { timing, prompt }) {
      const rearm = timing?.mode === 'once';
      const args = ['update', id, ...(timing ? cadenceArgs(timing, now()) : []), ...(prompt ? ['--prompt', prompt] : [])];
      if (rearm) {
        let current;
        try { current = await inspect(id); } catch { return { version: 1, host: 'paseo', action: 'update', nativeId: id, outcome: 'unknown' }; }
        // Some installed CLIs reject their own clear-limit flag. Unlimited jobs
        // need no clearing; capped jobs still require verified removal.
        args.splice(args.indexOf('--max-runs'), 2, ...(current.maxRuns === null ? [] : ['--no-max-runs']));
      }
      return mutation('update', id, args, row => (!prompt || row.prompt === prompt) && (!timing || cadenceMatches(row, timing)));
    },
    async run(id) {
      // Inspected run history distinguishes a request from an observed new run.
      const before = await inspect(id);
      return mutation('run', id, ['run-once', id], row => JSON.stringify(row.runs) !== JSON.stringify(before.runs));
    },
  };
}
const APP = '/apps/inbox/api/';
/** One call to the inbox's schedule routes: `{value, status}`; a refused sign-in or network error throws. */
export function appCall(client, route, method = 'GET', body) {
  return client.http(APP + route, body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method });
}
/** A record's timing in the app's shape; a goal's adaptive cadence runs as recurring until it re-arms itself. */
export function appTiming(timing) {
  const picked = { mode: timing.mode === 'once' ? 'once' : 'recurring' };
  for (const field of ['cron', 'every', 'timezone', 'dueAt', 'expiresAt', 'allowedLatenessMs']) if (timing[field] !== undefined) picked[field] = timing[field];
  return picked;
}
const firstLine = text => String(text ?? '').split('\n').map(part => part.trim()).find(Boolean) ?? '';
/** What the person's page shows for a record: its name, a short summary, and its timing. */
export function appFields(item, binding = item.binding) {
  const name = firstLine(item?.name ?? binding.key).slice(0, 200);
  const summary = firstLine(item?.record?.summary ?? item?.record?.instructions).slice(0, 300);
  return { name, summary, timing: appTiming(binding.timing) };
}
const sameTiming = (observed, sent) => Object.entries(sent).every(([field, value]) => observed?.[field] === value);
/** The app's schedule as a host observation, shaped like Paseo's inspect: runs oldest first. */
function appObservation({ schedule, runs = [] }, binding) {
  const current = binding && (schedule.revision ?? binding.revision) === binding.revision;
  return {
    id: schedule.key, status: schedule.state === 'on' ? 'active' : 'paused', computer: schedule.computer, timing: schedule.timing,
    nextRunAt: schedule.nextRunAt == null ? null : new Date(schedule.nextRunAt).toISOString(), waiting: schedule.waiting?.id ?? null,
    // The computer builds the prompt from the record at start, so the app holds none to compare.
    prompt: current ? startupPrompt(binding) : null,
    runs: runs.map(run => ({ id: run.id, state: run.state, result: run.result, agentId: run.agentId, startedAt: new Date(run.dueAt).toISOString(), endedAt: null })).reverse(),
  };
}
/** True when the helper runs as a service and the person's app answers its schedule routes. */
export async function appHost({ env = process.env, root = process.cwd(), service = helperService, client = () => companyFor(root) } = {}) {
  if (!service(env)) return { name: 'app', supported: false, reason: 'The background helper is not installed as a service.' };
  try {
    const company = await client();
    if (company && (await appCall(company, 'schedules')).status === 200) return { name: 'app', supported: true };
  } catch { /* reported below */ }
  return { name: 'app', supported: false, reason: 'The company app does not answer.' };
}
// The app host: the native id is the record's key. `client` and `computer` are values or functions, read on first use.
export function appAdapter({ client, computer, item, env = process.env, remember = rememberApp } = {}) {
  let company, known = item?.binding;
  const connect = async () => {
    company ??= await (typeof client === 'function' ? client() : client);
    if (!company) throw new ScheduleError('The company app does not answer from this checkout.', 3);
    return company;
  };
  const unknown = (action, key) => ({ version: 1, host: 'app', action, nativeId: key, outcome: 'unknown' });
  const read = async key => {
    const { value, status } = await appCall(await connect(), `schedule?key=${encodeURIComponent(key)}`);
    if (status === 404) return null;
    requireValue(status === 200 && value?.schedule?.key === key, 'The app returned a different schedule.');
    return value;
  };
  const body = (key, fields, binding) => ({ key, computer: fields.computer, name: fields.name, summary: fields.summary, timing: fields.timing, revision: binding.revision,
    ...(Number.isFinite(binding.authority?.minIntervalMs) ? { minIntervalMs: binding.authority.minIntervalMs } : {}) });
  async function mutation(action, key, send, verify) {
    try { await send(await connect()); } catch { /* an uncertain response is read back, never retried */ }
    try {
      const found = await read(key);
      if (!found || !verify(found.schedule)) return unknown(action, key);
      return normalizedReceipt('app', action, appObservation(found, known), key);
    } catch { return unknown(action, key); }
  }
  const post = (route, key) => target => appCall(target, route, 'POST', { key });
  return {
    name: 'app',
    pausedCreate: false,
    async inspect(key) {
      const found = await read(key);
      requireValue(found, 'The app has no schedule with this key.');
      return appObservation(found, known);
    },
    async create(binding) {
      requireValue(binding.lifecycle.published, 'Publish guarded instructions before app create.');
      const cwd = binding.execution.context.cwd;
      requireValue(cwd && !/[/\\]worktrees[/\\]/.test(cwd), 'Use a durable primary checkout, not a disposable worktree.');
      known = binding;
      const sent = body(binding.key, { computer: typeof computer === 'function' ? computer() : computer, ...appFields(item, binding) }, binding);
      remember(cwd, env);
      return mutation('create', binding.key, target => appCall(target, 'schedule', 'PUT', sent), row => row.host === 'app' && row.computer === sent.computer && sameTiming(row.timing, sent.timing));
    },
    pause: key => mutation('pause', key, post('pause', key), row => row.state === 'paused'),
    resume: key => mutation('resume', key, post('resume', key), row => row.state === 'on'),
    async update(key, { timing, prompt } = {}) {
      requireValue(known, 'Load the record before updating its app schedule.');
      requireValue(!prompt || prompt === startupPrompt(known), 'The app builds its prompt from the published record.');
      let current;
      try { current = (await read(key))?.schedule; } catch { return unknown('update', key); }
      if (!current) return unknown('update', key);
      const sent = body(key, { ...current, timing: timing ? appTiming(timing) : current.timing }, known);
      return mutation('update', key, target => appCall(target, 'schedule', 'PUT', sent), row => sameTiming(row.timing, sent.timing));
    },
    async run(key) {
      let before;
      try { before = (await read(key))?.schedule; } catch { return unknown('run', key); }
      return mutation('run', key, post('run-now', key), row => row.waiting?.source === 'now' && row.waiting.id !== before?.waiting?.id);
    },
    async cancel(key) {
      try { await post('delete', key)(await connect()); } catch { /* read back the exact key */ }
      try { return (await read(key)) ? unknown('cancel', key) : normalizedReceipt('app', 'cancel', { id: key, status: 'deleted' }, key); }
      catch { return unknown('cancel', key); }
    },
  };
}
export function unsupportedAdapter(host) {
  const unavailable = async () => { throw new ScheduleError(`No callable ${host} native tool is available.`, 3); };
  return { name: host, inspect: unavailable, create: unavailable, pause: unavailable, resume: unavailable, run: unavailable, update: unavailable, cancel: unavailable };
}
