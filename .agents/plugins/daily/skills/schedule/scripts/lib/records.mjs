// The old repo schedule records, read only for the Paseo mirror, and the checks every schedule shares.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

export const STATES = ['registering', 'scheduled', 'paused', 'waiting', 'completed', 'cancelled', 'cleanup-pending', 'superseded'];
export class ScheduleError extends Error {
  constructor(message, code = 2, extra = {}) { super(message); this.code = code; this.extra = extra; }
}
export const requireValue = (condition, message) => { if (!condition) throw new ScheduleError(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function credentialFree(value) {
  const text = JSON.stringify(value);
  requireValue(!/"(?:token|password|secret|apiKey|credential)"\s*:/i.test(text), 'Credentials do not belong in schedule records.');
  requireValue(!/(?:https?:\/\/[^\s"/]+@|\bBearer\s|\b(?:sk_live_|sk-ant-|github_pat_|ghp_|wongm_))/i.test(text), 'Credential-bearing instructions or URLs are forbidden.');
  return value;
}
export function validateTiming(timing) {
  requireValue(timing && ['once', 'recurring'].includes(timing.mode), 'A timing runs once or recurs.');
  try { new Intl.DateTimeFormat('en', { timeZone: timing.timezone }).format(); } catch { throw new ScheduleError('Unknown timezone.'); }
  requireValue(nonempty(timing.timezone), 'A timezone is required.');
  for (const field of ['dueAt', 'earliest', 'latest', 'expiresAt']) {
    if (timing[field] !== undefined) requireValue(nonempty(timing[field]) && /(?:Z|[+-]\d\d:\d\d)$/.test(timing[field]) && Number.isFinite(Date.parse(timing[field])), `${field} must be an absolute timestamp.`);
  }
  requireValue(Number.isFinite(timing.allowedLatenessMs) && timing.allowedLatenessMs >= 0, 'An allowed lateness bound is required.');
  if (timing.mode === 'once') requireValue(timing.dueAt && (!timing.expiresAt || Date.parse(timing.expiresAt) >= Date.parse(timing.dueAt)), 'One-time work needs dueAt, never annual cron alone.');
  if (timing.mode !== 'once') requireValue(nonempty(timing.cron) || nonempty(timing.every), 'A cadence is required.');
  if (timing.every) requireValue(/^[1-9]\d*[smhd]$/.test(timing.every), 'Use a positive duration such as 5m or 1h.');
  if (timing.cron) {
    const fields = timing.cron.trim().split(/\s+/), bounds = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
    requireValue(fields.length === 5, 'Use a five-field numeric cron expression.');
    // `1#2` is the second Monday. The app's cron ORs a set day of month with a weekday, so `#` needs it `*`.
    if (timing.cron.includes('#')) requireValue(fields[2] === '*', 'Leave day-of-month * with an nth-weekday (#) day-of-week.');
    fields.forEach((field, index) => field.split(',').forEach(part => {
      if (part.includes('#')) {
        requireValue(index === 4 && /^[0-7]#[1-5]$/.test(part), 'Use nth-weekday d#n (weekday 0-7, n 1-5) in the day-of-week field only.');
        return;
      }
      const parsed = /^(\*|\d+|\d+-\d+)(?:\/(\d+))?$/.exec(part);
      requireValue(parsed, 'Invalid cron field.');
      const [minimum, maximum] = bounds[index], [first, second] = parsed[1].split('-').map(Number);
      if (parsed[1] !== '*') requireValue(first >= minimum && first <= maximum && (second === undefined || (second >= first && second <= maximum)), 'Cron value exceeds its field bounds.');
      if (parsed[2]) requireValue(Number(parsed[2]) > 0 && Number(parsed[2]) <= maximum + 1, 'Invalid cron step.');
    }));
  }
  if (timing.earliest && timing.latest) requireValue(Date.parse(timing.earliest) <= Date.parse(timing.latest), 'Timing bounds are reversed.');
  if (timing.contactHours) requireValue(/^\d\d:\d\d$/.test(timing.contactHours.start) && /^\d\d:\d\d$/.test(timing.contactHours.end), 'Contact hours need start/end HH:mm.');
  return timing;
}
export function validateBinding(binding) {
  requireValue(binding?.version === 1, 'Unsupported binding version.');
  requireValue(slug(binding.key) && nonempty(binding.owner), 'Binding needs a stable key and owner.');
  requireValue(nonempty(binding.repository) && nonempty(binding.record), 'Binding needs its repository and exact record reference.');
  requireValue(/^[a-f0-9]{64}$/.test(binding.revision), 'Binding needs an approved instruction SHA256 revision.');
  const execution = binding.execution;
  requireValue(execution && ['assistant', 'script'].includes(execution.type) && nonempty(execution.host), 'An execution destination is required.');
  requireValue(Number.isSafeInteger(execution.generation) && execution.generation > 0, 'A positive execution generation is required.');
  requireValue(execution.nativeId === null || nonempty(execution.nativeId), 'Invalid native identity.');
  requireValue(execution.capabilities && execution.context && typeof execution.context === 'object', 'Future execution capability/context evidence is required.');
  requireValue(binding.progress && ['local', 'host', 'memory'].includes(binding.progress.type) && nonempty(binding.progress.reference), 'Exactly one continuation route is required.');
  if (binding.progress.type === 'local') {
    requireValue(path.isAbsolute(binding.progress.reference), 'Local continuation must be an absolute durable path.');
    requireValue(!/[/\\](?:worktrees|\.paseo)[/\\]worktrees|[/\\]openspec[/\\]changes/.test(binding.progress.reference), 'Continuation cannot live in a disposable checkout.');
    requireValue(execution.context.location === 'local', 'Cloud runs cannot use local continuation.');
  }
  requireValue(STATES.includes(binding.lifecycle?.state) && typeof binding.lifecycle.published === 'boolean', 'A lifecycle checkpoint is required.');
  if (binding.lifecycle.published) requireValue(nonempty(binding.lifecycle.publication), 'Published instructions need an immutable publication reference.');
  if (['completed', 'cancelled', 'superseded'].includes(binding.lifecycle.state)) requireValue(nonempty(binding.lifecycle.evidence) && binding.lifecycle.stopVerified === true, 'Terminal records need evidence and verified stopping.');
  requireValue(binding.authority && Array.isArray(binding.authority.actions) && Array.isArray(binding.authority.recipients) && Array.isArray(binding.authority.channels), 'Binding needs explicit action authority.');
  if (binding.authority.actions.some(action => !['read', 'draft'].includes(action))) requireValue(Number.isFinite(binding.authority.minIntervalMs) && binding.authority.minIntervalMs >= 0, 'Outreach needs an explicit frequency bound.');
  validateTiming(binding.timing);
  return credentialFree(binding);
}
export function routineRevision(record) {
  return digest({ version: record.version, key: record.key, owner: record.owner, instructions: record.instructions, execution: record.execution, authority: record.authority, timing: record.timing });
}
export function validateRoutine(record) {
  requireValue(record?.version === 1 && record.kind === 'routine', 'Unsupported routine definition.');
  requireValue(slug(record.key) && nonempty(record.owner) && nonempty(record.name) && nonempty(record.instructions), 'Routine needs key, name, owner and instructions.');
  requireValue(record.execution && ['assistant', 'script'].includes(record.execution.type), 'Routine needs its executable reference.');
  if (record.execution.type === 'script') requireValue(nonempty(record.execution.reference), 'A script reference is required.');
  requireValue(record.authority && Array.isArray(record.authority.actions) && Array.isArray(record.authority.recipients) && Array.isArray(record.authority.channels), 'Routine needs explicit authority arrays.');
  validateBinding(record.binding);
  requireValue(record.key === record.binding.key && record.owner === record.binding.owner, 'Routine identity differs from its binding.');
  requireValue(record.binding.revision === routineRevision(record), 'Routine instruction revision changed without approval.');
  requireValue(JSON.stringify(record.authority) === JSON.stringify(record.binding.authority), 'Routine authority differs from its binding.');
  requireValue(JSON.stringify(record.timing) === JSON.stringify(record.binding.timing), 'Routine timing policy differs from its binding.');
  return credentialFree(record);
}
function inside(root, file) {
  const full = path.resolve(root, file);
  requireValue(full.startsWith(`${path.resolve(root)}${path.sep}`), 'Record path escapes its selected root.');
  if (existsSync(full)) requireValue(realpathSync(full).startsWith(`${realpathSync(root)}${path.sep}`), 'Record symlink escapes its selected root.');
  return full;
}
const parseFile = file => JSON.parse(readFileSync(file, 'utf8'));
function normalized(root, reference, kind, name, binding, record, files) {
  return { kind, name, key: binding.key, owner: binding.owner, state: binding.lifecycle.state, reference, root, published: binding.lifecycle.published, binding, record, files };
}
/** One `schedules/<key>.json` record, checked; a goal record or a change folder is refused. */
export function loadRecord(root, reference) {
  requireValue(/^schedules\/[a-z0-9][a-z0-9-]*\.json$/.test(reference), 'Name a schedules/<key>.json record.');
  const record = validateRoutine(parseFile(inside(root, reference)));
  requireValue(record.binding.record === reference, 'Routine binding points at a different definition.');
  return normalized(root, reference, 'routine', record.name, record.binding, record, [reference]);
}

/** Every record in `schedules/`, with each unreadable one as an error. */
export function listRecords(root) {
  const rows = [], errors = [], dir = path.join(root, 'schedules');
  for (const file of existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.json')) : []) {
    const reference = `schedules/${file}`;
    try { rows.push(loadRecord(root, reference)); } catch (error) { errors.push({ reference, error: error.message }); }
  }
  return { records: rows, errors };
}

/** Writes a record's new binding, as the Paseo move steps in it. */
export function checkpoint(item, binding) {
  const value = validateRoutine({ ...item.record, binding });
  writeFileSync(path.join(item.root, item.reference), `${JSON.stringify(value, null, 2)}\n`);
  return { ...item, binding, state: binding.lifecycle.state, published: binding.lifecycle.published, record: value };
}
