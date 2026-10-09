// Versioned routine definitions and CLI-resolved finite goal records. No host mutations or git.
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
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
export function validateTiming(timing, { kind = 'goal' } = {}) {
  requireValue(timing && ['once', 'recurring', 'goal'].includes(timing.mode), 'A timing mode is required.');
  requireValue(kind !== 'routine' || timing.mode === 'recurring', 'An ongoing routine must use recurring timing.');
  try { new Intl.DateTimeFormat('en', { timeZone: timing.timezone }).format(); } catch { throw new ScheduleError('Unknown timezone.'); }
  requireValue(nonempty(timing.timezone), 'A timezone is required.');
  for (const field of ['dueAt', 'earliest', 'latest', 'expiresAt']) {
    if (timing[field] !== undefined) requireValue(nonempty(timing[field]) && /(?:Z|[+-]\d\d:\d\d)$/.test(timing[field]) && Number.isFinite(Date.parse(timing[field])), `${field} must be an absolute timestamp.`);
  }
  requireValue(Number.isFinite(timing.allowedLatenessMs) && timing.allowedLatenessMs >= 0, 'An allowed lateness bound is required.');
  if (timing.mode === 'once') requireValue(timing.dueAt && timing.expiresAt && Date.parse(timing.expiresAt) >= Date.parse(timing.dueAt), 'One-time work needs dueAt and expiry, never annual cron alone.');
  if (timing.mode !== 'once') requireValue(nonempty(timing.cron) || nonempty(timing.every), 'A cadence is required.');
  if (timing.every) requireValue(/^[1-9]\d*[smhd]$/.test(timing.every), 'Use a positive duration such as 5m or 1h.');
  if (timing.cron) {
    const fields = timing.cron.trim().split(/\s+/), bounds = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
    requireValue(fields.length === 5, 'Use a five-field numeric cron expression.');
    fields.forEach((field, index) => field.split(',').forEach(part => {
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
export function validateBinding(binding, { kind = 'goal' } = {}) {
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
  if (kind === 'goal') requireValue(nonempty(binding.completionSource), 'Finite goals need an authoritative completion source.');
  if (binding.authority.actions.some(action => !['read', 'draft'].includes(action))) requireValue(Number.isFinite(binding.authority.minIntervalMs) && binding.authority.minIntervalMs >= 0, 'Outreach needs an explicit frequency bound.');
  validateTiming(binding.timing, { kind });
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
  validateBinding(record.binding, { kind: 'routine' });
  requireValue(record.key === record.binding.key && record.owner === record.binding.owner, 'Routine identity differs from its binding.');
  requireValue(record.binding.revision === routineRevision(record), 'Routine instruction revision changed without approval.');
  requireValue(JSON.stringify(record.authority) === JSON.stringify(record.binding.authority), 'Routine authority differs from its binding.');
  requireValue(JSON.stringify(record.timing) === JSON.stringify(record.binding.timing), 'Routine timing policy differs from its binding.');
  return credentialFree(record);
}
export async function openspec(args, { cwd = process.cwd(), store } = {}) {
  const { stdout } = await promisify(execFile)('openspec', [...args, ...(store ? ['--store', store] : [])], { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(stdout);
}
function inside(root, file) {
  const full = path.resolve(root, file);
  requireValue(full.startsWith(`${path.resolve(root)}${path.sep}`), 'Record path escapes its selected root.');
  if (existsSync(full)) requireValue(realpathSync(full).startsWith(`${realpathSync(root)}${path.sep}`), 'Record symlink escapes its selected root.');
  return full;
}
const parseFile = file => JSON.parse(readFileSync(file, 'utf8'));
function normalized(root, reference, kind, name, binding, record, files, store) {
  return { kind, name, key: binding.key, owner: binding.owner, state: binding.lifecycle.state, reference, root, store: store ?? null, published: binding.lifecycle.published, binding, record, files };
}
export async function loadRecord(root, reference, options = {}) {
  if (/^schedules\/[a-z0-9][a-z0-9-]*\.json$/.test(reference)) {
    const file = inside(root, reference);
    const record = validateRoutine(parseFile(file));
    requireValue(record.binding.record === reference, 'Routine binding points at a different definition.');
    return normalized(root, reference, 'routine', record.name, record.binding, record, [reference], options.store);
  }
  const cli = options.openspec ?? openspec;
  if (/^[a-zA-Z0-9_./-]+\/archive\/[^/]+$/.test(reference)) {
    const directory = inside(root, reference);
    const metadata = readFileSync(path.join(directory, '.openspec.yaml'), 'utf8');
    requireValue(/^schema:\s*scheduled-work\s*$/m.test(metadata), 'Archived record is not scheduled-work.');
    const binding = validateBinding(parseFile(path.join(directory, 'binding.json')));
    requireValue(['completed', 'cancelled', 'superseded'].includes(binding.lifecycle.state) && binding.lifecycle.stopVerified && binding.lifecycle.evidence, 'Archived goal lacks terminal evidence.');
    const proposal = readFileSync(path.join(directory, 'proposal.md'), 'utf8');
    requireValue(binding.revision === digest(proposal), 'Archived goal revision changed.');
    const files = ['.openspec.yaml', 'proposal.md', 'tasks.md', 'binding.json', 'review.html'].filter(file => existsSync(path.join(directory, file))).map(file => `${reference}/${file}`);
    requireValue(!readdirSync(directory).some(file => !files.includes(`${reference}/${file}`)), 'Archived goal contains unrelated artifacts.');
    requireValue(path.dirname(binding.record) === path.dirname(path.dirname(reference)), 'Archive and original record differ from the selected planning root.');
    return { ...normalized(root, reference, 'goal', path.basename(reference), binding, { proposal, tasks: readFileSync(path.join(directory, 'tasks.md'), 'utf8'), binding, schema: 'scheduled-work' }, files, options.store), archived: true };
  }
  const name = path.basename(reference);
  requireValue(slug(name), 'Name an exact routine definition or scheduled goal.');
  const status = await cli(['status', '--change', name, '--json'], { cwd: root, store: options.store });
  requireValue(status.schemaName === 'scheduled-work', 'Selected record is an ordinary code change.');
  const directory = status.changeRoot ?? status.changeDir;
  requireValue(nonempty(directory), 'OpenSpec returned no change root.');
  const paths = status.artifactPaths;
  const artifact = id => {
    const spec = paths?.[id];
    const found = spec?.existingOutputPaths?.[0] ?? spec?.resolvedOutputPath;
    requireValue(nonempty(found), `OpenSpec returned no ${id} artifact path.`);
    return found;
  };
  const proposal = artifact('proposal'), bindingFile = artifact('binding'), tasks = artifact('tasks');
  const binding = validateBinding(parseFile(bindingFile));
  const exact = path.relative(root, directory).split(path.sep).join('/');
  requireValue(binding.record === exact && binding.revision === digest(readFileSync(proposal, 'utf8')), 'Goal reference or approved proposal revision changed.');
  const record = { proposal: readFileSync(proposal, 'utf8'), tasks: readFileSync(tasks, 'utf8'), binding, schema: 'scheduled-work' };
  for (const heading of ['Goal', 'Instructions', 'Completion source', 'Authority', 'Timing', 'Questions and cancellation']) requireValue(record.proposal.includes(`## ${heading}\n`), `Goal proposal lacks ${heading}.`);
  const files = [proposal, bindingFile, tasks].map(file => path.relative(root, file).split(path.sep).join('/'));
  if (existsSync(path.join(directory, 'review.html'))) files.push(`${exact}/review.html`);
  if (existsSync(path.join(directory, '.openspec.yaml'))) files.push(`${exact}/.openspec.yaml`);
  return normalized(root, exact, 'goal', name, binding, record, files, options.store);
}
export async function listRecords(root, options = {}) {
  const rows = [], errors = [];
  const dir = path.join(root, 'schedules');
  const references = existsSync(dir) ? readdirSync(dir).filter(file => file.endsWith('.json')).map(file => `schedules/${file}`) : [];
  const cli = options.openspec ?? openspec;
  const listed = await cli(['list', '--json'], { cwd: root, store: options.store });
  for (const change of listed.changes ?? []) {
    const status = await cli(['status', '--change', change.name, '--json'], { cwd: root, store: options.store });
    if (status.schemaName === 'scheduled-work') references.push(change.name);
  }
  for (const reference of references) {
    try { rows.push(await loadRecord(root, reference, options)); } catch (error) { errors.push({ reference, error: error.message }); }
  }
  return { records: rows, errors };
}
export async function createGoal(root, name, { proposal, binding, tasks, store, openspec: cli = openspec }) {
  requireValue(slug(name), 'Invalid goal name.');
  await cli(['new', 'change', name, '--schema', 'scheduled-work', '--json'], { cwd: root, store });
  const status = await cli(['status', '--change', name, '--json'], { cwd: root, store });
  const directory = status.changeRoot ?? status.changeDir;
  requireValue(directory, 'OpenSpec returned no change root.');
  const metadata = path.join(directory, '.openspec.yaml');
  const existingMetadata = readFileSync(metadata, 'utf8');
  if (!/^skip_specs:/m.test(existingMetadata)) writeFileSync(metadata, `${existingMetadata.trimEnd()}\nskip_specs: true\n`);
  binding = { ...binding, record: path.relative(root, directory).split(path.sep).join('/'), revision: digest(proposal) };
  validateBinding(binding);
  for (const [id, value] of Object.entries({ proposal, binding: `${JSON.stringify(binding, null, 2)}\n`, tasks })) {
    const instructions = await cli(['instructions', id, '--change', name, '--json'], { cwd: root, store });
    const file = instructions.resolvedOutputPath ?? instructions.outputPath;
    requireValue(file, `OpenSpec returned no ${id} output path.`);
    mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, value);
  }
  return loadRecord(root, name, { store, openspec: cli });
}
export function writeRoutine(root, record) {
  validateRoutine(record);
  const file = inside(root, record.binding.record);
  requireValue(/^schedules\/[a-z0-9][a-z0-9-]*\.json$/.test(record.binding.record), 'Invalid routine path.');
  mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return record.binding.record;
}
export function checkpoint(item, binding) {
  validateBinding(binding, { kind: item.kind });
  const file = item.kind === 'routine' ? path.join(item.root, item.reference) : path.join(item.root, item.files.find(file => file.endsWith('/binding.json')));
  const value = item.kind === 'routine' ? { ...item.record, binding } : binding;
  if (item.kind === 'routine') validateRoutine(value);
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return { ...item, binding, state: binding.lifecycle.state, published: binding.lifecycle.published, record: item.kind === 'routine' ? value : { ...item.record, binding } };
}
