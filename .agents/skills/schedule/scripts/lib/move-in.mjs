// The move at the update: one person's routines, team routines, timed jobs and repo records become app schedules,
// each read back and approved here. Run twice, it moves nothing twice. openspec design, Decision 6.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { localDay, morningOf, placePath } from '../../../daily/scripts/config.mjs';
import { firstMessage } from '../../../daily/scripts/daily.mjs';
import { briefFolders, DEFAULT_SCHEDULES } from '../../../daily/scripts/worker.mjs';
import { appTiming, approveHere, approver, definition, readSchedule, saveDefinition, send } from './app.mjs';
import { approvedVersion } from './approvals.mjs';
import { validateReceipt } from './hosts.mjs';
import { localProgress } from './progress.mjs';
import { listRecords } from './records.mjs';
import { scheduleVersion } from './version.mjs';

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
const RUN_FLOOR_MS = 10 * MINUTE;
// A timed job's `at` time counted this long after it in the worker's old loop, so its schedule may be this late.
const AT_GRACE_MIN = 15;
const ENDED = ['cancelled', 'completed', 'superseded'];
const keyOf = id => id.slice(0, 64).replace(/-+$/, '');
const clock = text => String(text).split(':').map(Number);

/** The largest gap, in days, between two of a week's run days. */
function widestGap(days) {
  const sorted = [...days].sort((a, b) => a - b);
  return Math.max(...sorted.map((day, index) => ((sorted[(index + 1) % sorted.length] - day + 6) % 7) + 1));
}

/** A routine's cron and lateness: at the morning time, on its days; `skip` lasts to the day's end, `latest` to the
 *  next run. */
export function checkTiming(check, { morning, timezone }) {
  const [hour, minute] = clock(morning), kind = check.cadence.kind;
  const days = kind === 'weekly' ? [...check.cadence.weekdays].sort((a, b) => a - b).join(',') : '*';
  const cron = `${minute} ${hour} ${kind === 'monthly' ? '1' : '*'} * ${days}`;
  const next = kind === 'weekly' ? widestGap(check.cadence.weekdays) * DAY : kind === 'monthly' ? 28 * DAY : DAY;
  const allowedLatenessMs = check.missed === 'skip' ? DAY - (hour * HOUR + minute * MINUTE) : next;
  return { mode: 'recurring', cron, timezone, allowedLatenessMs };
}

/** A routine's first message, then the lines that say what it may touch. */
export function checkInstructions(check) {
  return [firstMessage(check), `Scope: ${check.scope}`, `Result: ${check.result}`, `May change: ${check.effects}`,
    ...(check.inputs ? [`Inputs: ${JSON.stringify(check.inputs)}`] : [])].join('\n');
}

/** The schedules one timed job becomes: one cron when its times share a minute, else one per time; or why it can't. */
export function sweepTimings(sweep, timezone) {
  const days = Array.isArray(sweep.days) ? [...sweep.days].sort((a, b) => a - b).join(',') : '*';
  const [from, to] = sweep.hours ? String(sweep.hours).split('-').map(Number) : [null, null];
  const hours = from === null ? '*' : `${from}-${to - 1}`;
  const every = Number(/^(\d+)m$/.exec(sweep.every ?? '')?.[1]);
  if (every) {
    const ms = every * MINUTE;
    const cron = every < 60 && 60 % every === 0 ? `*/${every} ${hours} * * ${days}`
      : every % 60 === 0 && 24 % (every / 60) === 0 ? `0 ${hours}/${every / 60} * * ${days}` : null;
    if (!cron) return { reason: `every ${sweep.every} has no cron` };
    return { timings: [{ suffix: '', timing: { mode: 'recurring', cron, timezone, allowedLatenessMs: ms }, gap: ms }] };
  }
  const times = (sweep.at ?? []).map(clock);
  if (!times.length) return { reason: 'no time' };
  const lateness = AT_GRACE_MIN * MINUTE;
  const once = (list, suffix) => ({ suffix, timing: { mode: 'recurring', cron: `${list[0][1]} ${list.map(([hour]) => hour).join(',')} * * ${days}`, timezone,
    allowedLatenessMs: lateness } });
  if (new Set(times.map(([, minute]) => minute)).size === 1) return { timings: [once(times, '')] };
  return { timings: times.map(time => once([time], `-${time.map(part => String(part).padStart(2, '0')).join('')}`)) };
}

/** A cron's cadence kind, for the duplicate check. */
export function cadenceOf(timing) {
  const [, , date, , week] = String(timing.cron ?? '').split(/\s+/);
  if (timing.mode === 'once') return 'once';
  if (!timing.cron) return 'other';
  // `1#2` is the month's second Monday, `5L` its last Friday.
  if (date !== '*' || /[#L]/.test(week)) return 'monthly';
  return week === '*' ? 'daily' : 'weekly';
}

/** The weekdays a weekly cron runs on; every day for any other timing. */
export function weekdaysOf(timing) {
  const week = String(timing?.cron ?? '').split(/\s+/)[4] ?? '*';
  if (!/^[0-7]([,-][0-7])*$/.test(week)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const days = new Set();
  for (const part of week.split(',')) {
    const [from, to = from] = part.split('-').map(Number);
    for (let day = from; day <= to; day += 1) days.add(day % 7);
  }
  return days;
}

const STOP = new Set(['the', 'a', 'an', 'of', 'my', 'each', 'and', 'for', 'to', 'in', 'on', 'new', 'day', 'daily', 'week', 'weekly', 'month',
  'monthly', 'morning', 'review', 'make', 'plan', 'recap', 'check', 'find', 'run', 'send', 'write', 'read', 'update']);
/** A name's main words: no small words, no cadence words, no common verbs. */
export const mainWords = name => new Set(String(name).toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 1 && !STOP.has(word)));

/** Pairs that look like one job: the same key, or the same cadence kind on a shared weekday, and the same skill or a
 *  shared main word. */
export function duplicates(items) {
  const pairs = [];
  for (const [index, one] of items.entries()) for (const two of items.slice(index + 1)) {
    // One timed job split by its times is one job, not a pair.
    if (one.source === two.source && one.origin === two.origin) continue;
    const words = mainWords(two.def.name), twoDays = weekdaysOf(two.def.timing);
    const sameCadence = one.cadence === two.cadence && [...weekdaysOf(one.def.timing)].some(day => twoDays.has(day));
    const alike = one.def.key === two.def.key || (sameCadence && ((one.skill && one.skill === two.skill)
      || [...mainWords(one.def.name)].some(word => words.has(word))));
    if (alike) pairs.push([one.id, two.id]);
  }
  return pairs;
}

// A place resolves against the main checkout, as the timed jobs' folder does: a run never opens in a worktree.
function fromCheck(check, { config, primary, source, today }) {
  const def = { key: keyOf(check.id), name: check.title, summary: check.scope, instructions: checkInstructions(check),
    run: { cwd: placePath(config, check.place, primary), ...(check.thinking ? { thinking: check.thinking } : {}) }, timing: checkTiming(check, { morning: morningOf(config), timezone: config.timezone }) };
  const skill = check.procedure ? basename(dirname(check.procedure)) : null;
  // The app's clock has no start date, so a routine that starts later moves paused until then.
  const resumeOn = check.activeFrom > today ? check.activeFrom : null;
  return { id: `${source}:${check.id}`, source, origin: check.id, def, skill, cadence: check.cadence.kind, ...(resumeOn ? { resumeOn } : {}),
    paused: !check.enabled || check.start === 'offer' || check.cadence.kind === 'manual' || Boolean(resumeOn) };
}

/** The schedules one timed job becomes, each with its definition, or why it can not be one. */
export function fromSweep(sweep, { brief, primary, timezone }) {
  const found = sweepTimings(sweep, timezone);
  if (!found.timings) return [{ id: `sweep:${sweep.id}`, reason: found.reason }];
  if (brief === null) return [{ id: `sweep:${sweep.id}`, reason: `no brief ${sweep.brief}` }];
  const run = { cwd: primary, ...(sweep.check ? { check: sweep.check } : {}), ...(sweep.minutes ? { minutes: sweep.minutes } : {}),
    ...(sweep.place ? { place: sweep.place } : {}) };
  return found.timings.map(({ suffix, timing, gap }) => ({ id: `sweep:${sweep.id}${suffix}`, source: 'sweep', origin: sweep.id,
    def: { key: keyOf(sweep.id.slice(0, 64 - suffix.length) + suffix), name: sweep.title ?? sweep.id, summary: sweep.title ?? sweep.id, kind: 'background',
      instructions: brief, run, timing, ...(gap && gap <= RUN_FLOOR_MS ? { authority: { minIntervalMs: gap / 2 } } : {}) },
    skill: null, cadence: sweep.every ? 'other' : cadenceOf(timing), paused: false }));
}

function fromRecord(item) {
  const { record, binding } = item, context = binding.execution.context ?? {};
  if (record.execution.type !== 'assistant') return { id: `record:${item.key}`, reason: 'a script record' };
  const run = { cwd: context.cwd, ...(context.provider ? { provider: context.provider } : {}), ...(context.mode ? { mode: context.mode } : {}) };
  const { minIntervalMs, ...leave } = record.authority;
  const authority = { ...leave, ...(minIntervalMs > 0 ? { minIntervalMs } : {}) };
  const def = { key: item.key, name: record.name, summary: record.summary, instructions: record.instructions, run, authority, timing: appTiming(binding.timing) };
  return { id: `record:${item.key}`, source: 'record', origin: item.reference, def, skill: null, cadence: cadenceOf(def.timing),
    paused: binding.lifecycle.state === 'paused', item };
}

const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
export const readBrief = (root, name) => {
  const file = briefFolders(root).map(folder => join(folder, name)).find(path => existsSync(path));
  return file ? readFileSync(file, 'utf8').trim() : null;
};

/** Everything this person has to move, each as a schedule definition, and what can not move with its reason. */
export function gather({ root, primary, me, config, records = listRecords(root), now = new Date() }) {
  const found = [];
  const checks = config?.checks ?? [];
  const today = config ? localDay(now, config.timezone) : '';
  for (const check of checks) {
    try { found.push(fromCheck(check, { config, primary, source: check.team ? 'team' : 'check', today })); }
    catch (error) { found.push({ id: `${check.team ? 'team' : 'check'}:${check.id}`, reason: error.message }); }
  }
  if (config?.sweeps) {
    const defaults = new Set(readJson(DEFAULT_SCHEDULES).schedules.map(schedule => schedule.id));
    const own = (readJson(resolve(root, config.sweeps)).sweeps ?? []).filter(sweep => !defaults.has(sweep?.id) && sweep.off !== true
      && (sweep.every || sweep.at));
    for (const sweep of own) found.push(...fromSweep(sweep, { brief: readBrief(root, sweep.brief), primary, timezone: config.timezone }));
  }
  // A record is the person's when any email their settings file lists owns it.
  const emails = new Set([me.email, ...(config?.emails ?? [])].filter(Boolean).map(email => String(email).toLowerCase()));
  for (const item of records.records) {
    if (!emails.has(String(item.owner).toLowerCase()) || ENDED.includes(item.state)) continue;
    found.push(fromRecord(item));
  }
  // A record no one can read stays in the repo and in the report, so it is never lost without a word.
  const ready = [], refused = (records.errors ?? []).map(error => ({ id: `record:${error.reference}`, reason: error.error }));
  for (const entry of found) {
    if (entry.reason) { refused.push({ id: entry.id, reason: entry.reason }); continue; }
    try { entry.def = definition(entry.def, { primary }); ready.push(entry); } catch (error) { refused.push({ id: entry.id, reason: error.message }); }
  }
  return { ready, refused };
}

/** Splits flagged pairs by the person's `--keep` and `--drop`; an unnamed half goes the other way of its named one. */
export function settle(pairs, { keep = [], drop = [] }) {
  const kept = new Set(keep), dropped = new Set(drop), open = [];
  const named = id => kept.has(id) || dropped.has(id);
  for (const [one, two] of pairs) {
    if (!named(one) && !named(two)) open.push([one, two]);
    else if (!named(one)) (kept.has(two) ? dropped : kept).add(one);
    else if (!named(two)) (kept.has(one) ? dropped : kept).add(two);
  }
  return { open, held: new Set(open.flat()), dropped };
}

const verified = (receipt, action, id) => { try { return validateReceipt(receipt, { host: 'paseo', action, nativeId: id }).outcome === 'verified'; } catch { return false; } };
async function gone(paseo, id) { try { await paseo.inspect(id); return false; } catch { return true; } }

/** Puts one schedule in the app unless it is there already, approves it here, and stops its Paseo job after. */
async function moveOne(entry, { client, computer, env, email, paseo }) {
  const { def } = entry, version = scheduleVersion(def);
  const native = entry.item?.binding.execution.host === 'paseo' ? entry.item.binding.execution.nativeId : null;
  if (native && !verified(await paseo.pause(native), 'pause', native) && !(await gone(paseo, native))) return { state: 'skipped', reason: 'paseo_not_paused' };
  const held = (await readSchedule(client, def.key))?.schedule;
  const who = approver(client, { email });
  if (held?.host === 'app' && held.version === version && held.approvedVersion === version && approvedVersion({ ...who, key: def.key }, env) === version) {
    return { state: 'same', key: def.key, version, ...(native ? { paseo: verified(await paseo.cancel(native), 'cancel', native) ? 'deleted' : 'paused' } : {}) };
  }
  let schedule = held, state = 'same';
  if (!held || held.host !== 'app' || held.version !== version) {
    if (held?.host === 'app' && entry.source !== 'record') return { state: 'skipped', reason: 'exists' };
    schedule = (await saveDefinition(client, def, { computer })).schedule;
    state = 'moved';
  }
  // Before the OK, so a pause that failed on a first move is made on the next one, never approved switched on.
  if (entry.paused && schedule.state !== 'paused') schedule = (await send(client, 'pause', 'POST', { key: def.key })).schedule;
  const approval = await approveHere(client, schedule, version, { computer, env, email });
  const result = { state, key: def.key, version, reported: approval.reported };
  if (state === 'moved' && entry.item?.binding.progress?.type === 'local') result.progress = await copyProgress(client, entry.item);
  if (native) result.paseo = verified(await paseo.cancel(native), 'cancel', native) ? 'deleted' : 'paused';
  return result;
}

/** An old record's progress, sent to the app when its route takes a first copy; else kept in its file. */
async function copyProgress(client, item) {
  let progress;
  try { progress = await localProgress(item.binding.progress.reference).read(); } catch { return 'unreadable'; }
  if (progress === null) return 'none';
  try { await send(client, 'schedule-progress', 'PUT', { key: item.key, progress }); return 'copied'; } catch { return 'kept'; }
}

function rewrite(file, field, ids) {
  const data = readJson(file);
  const left = (data[field] ?? []).filter(entry => !ids.has(entry.id));
  if (left.length === (data[field] ?? []).length) return [];
  writeFileSync(file, `${JSON.stringify({ ...data, [field]: left }, null, 2)}\n`);
  return [...ids].filter(id => (data[field] ?? []).some(entry => entry.id === id));
}

/** Takes the moved entries out of the checkout: routines from the person's file, timed jobs from the job list, record
 *  files, and for the owner, team routines from the team file, so no teammate's computer tries the move each day. */
function removeMoved(done, { root, me, config, owner }) {
  const of = source => new Set(done.filter(entry => entry.source === source).map(entry => entry.origin));
  const removed = { checks: me.file ? rewrite(me.file, 'checks', of('check')) : [], sweeps: config?.sweeps ? rewrite(resolve(root, config.sweeps), 'sweeps', of('sweep')) : [],
    team: owner && config?.teamFile ? rewrite(config.teamFile, 'checks', of('team')) : [], records: [] };
  for (const reference of of('record')) { rmSync(join(root, reference), { force: true }); removed.records.push(reference); }
  return removed;
}

/** Whether one of the person's emails is the owner's, as the app's committed settings name it. */
function isOwner(root, emails) {
  try {
    const owner = /"WONG_OWNER_EMAIL"\s*:\s*"([^"]+)"/.exec(readFileSync(join(root, 'app', 'wrangler.jsonc'), 'utf8'))?.[1];
    return !!owner && emails.has(owner.trim().toLowerCase());
  } catch { return false; }
}

/** `move-in`: moves the person's schedules to the app, or with `dryRun` only shows them. Interactive, it holds a
 *  pair that looks the same until the person names one to keep; unattended, it leaves the pair and notes it. */
export async function moveIn({ root, primary, me, config, records, client, computer, env, email, paseo, note = () => {}, unattended = false,
  dryRun = false, keep = [], drop = [], only = null }) {
  const { ready: all, refused } = gather({ root, primary, me, config, records });
  const ready = only ? all.filter(entry => entry.id === only) : all;
  // A move the person names for one record skips the duplicate check.
  const { open, held, dropped } = only ? { open: [], held: new Set(), dropped: new Set() } : settle(duplicates(all), { keep, drop });
  const pairs = open.map(pair => pair.map(id => ({ id, name: all.find(entry => entry.id === id).def.name })));
  if (dryRun) return { dryRun: true, schedules: ready.map(entry => ({ id: entry.id, ...entry.def, version: scheduleVersion(entry.def), paused: entry.paused,
    ...(entry.resumeOn ? { resumeOn: entry.resumeOn } : {}) })), refused, duplicates: pairs };
  const results = [], done = [];
  for (const entry of ready) {
    if (held.has(entry.id)) { results.push({ id: entry.id, state: 'held', reason: 'duplicate' }); continue; }
    if (dropped.has(entry.id)) { results.push({ id: entry.id, state: 'dropped' }); if (!entry.item || entry.item.binding.execution.host !== 'paseo') done.push(entry); continue; }
    let result;
    try { result = await moveOne(entry, { client, computer, env, email, paseo }); } catch (error) { result = { state: 'failed', reason: error.extra?.reason ?? error.message }; }
    results.push({ id: entry.id, ...result, ...(entry.resumeOn ? { resumeOn: entry.resumeOn } : {}) });
    if (['moved', 'same'].includes(result.state) && result.paseo !== 'paused') done.push(entry);
    if (result.state === 'moved' && entry.resumeOn) note(`${entry.def.name} moved paused: resume it on ${entry.resumeOn}, when it starts.`);
  }
  if (open.length && unattended) note(`Waiting for your choice: these look like the same job and did not move: ${pairs.map(pair => pair.map(each => each.name).join(' / ')).join('; ')}.`);
  const emails = new Set([email, me.email, ...(config?.emails ?? [])].filter(Boolean).map(each => String(each).toLowerCase()));
  const owner = !unattended && done.some(entry => entry.source === 'team') && isOwner(primary ?? root, emails);
  const removed = unattended ? null : removeMoved(done, { root, me, config, owner });
  const team = !owner && done.some(entry => entry.source === 'team') ? config.teamFile ?? null : null;
  return { results, refused, duplicates: pairs, ...(removed ? { removed } : {}), ...(team ? { teamFileLeft: team } : {}),
    ...(open.length && !unattended ? { next: 'Show the person each pair, ask which to keep, then run move-in again with --keep <id> or --drop <id>.' } : {}) };
}
