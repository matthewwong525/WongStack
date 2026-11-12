// WongStack's default schedules, approved here because they come with this checkout's code; one the person never
// changed follows updates and check-ins. wiki/stack/host-schedules.md
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readJson, writeJson } from '../../skills/daily/scripts/chief.mjs';
import { defaultsFile } from '../../skills/daily/scripts/daily.mjs';
import { addLine } from '../../skills/daily/scripts/journal.mjs';
import { briefFolders, DEFAULT_SCHEDULES } from '../../skills/daily/scripts/worker.mjs';
import { approveHere, definition, readSchedule, saveDefinition, send } from './app.mjs';
import { RUN_FLOOR_MS } from '../runs.mjs';
import { canonical, scheduleVersion } from '../../skills/daily/skills/schedule/scripts/lib/version.mjs';

const MINUTE = 60_000;
// A timed job's `at` time counted this long after it in the worker's old loop, so its schedule may be this late.
const AT_GRACE_MIN = 15;
const keyOf = id => id.slice(0, 64).replace(/-+$/, '');
const clock = text => String(text).split(':').map(Number);
const same = (one, two) => JSON.stringify(canonical(one)) === JSON.stringify(canonical(two));

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

/** The schedules one timed job becomes, each with its definition, or why it can not be one. */
function fromSweep(sweep, { brief, primary, timezone }) {
  const found = sweepTimings(sweep, timezone);
  if (!found.timings) return [{ id: `sweep:${sweep.id}`, reason: found.reason }];
  if (brief === null) return [{ id: `sweep:${sweep.id}`, reason: `no brief ${sweep.brief}` }];
  const run = { cwd: primary, ...(sweep.check ? { check: sweep.check } : {}), ...(sweep.minutes ? { minutes: sweep.minutes } : {}),
    ...(sweep.place ? { place: sweep.place } : {}) };
  return found.timings.map(({ suffix, timing, gap }) => ({ id: `sweep:${sweep.id}${suffix}`,
    def: { key: keyOf(sweep.id.slice(0, 64 - suffix.length) + suffix), name: sweep.title ?? sweep.id, summary: sweep.title ?? sweep.id, kind: 'background',
      instructions: brief, run, timing, ...(gap && gap <= RUN_FLOOR_MS ? { authority: { minIntervalMs: gap / 2 } } : {}) } }));
}

const readBrief = (root, name) => {
  const file = briefFolders(root).map(folder => join(folder, name)).find(path => existsSync(path));
  return file ? readFileSync(file, 'utf8').trim() : null;
};

/** Each default as a checked definition, or why it can not be one; an install's own entry with its id replaces it, and
 *  its `off` entry adds it paused. */
export function defaultDefinitions({ root, primary, config, list = DEFAULT_SCHEDULES }) {
  const own = config.sweeps ? readJson(resolve(root, config.sweeps), {}).sweeps ?? [] : [];
  return JSON.parse(readFileSync(list, 'utf8')).schedules.flatMap(shipped => {
    const mine = own.find(entry => entry?.id === shipped.id);
    const sweep = mine && mine.off !== true ? mine : shipped;
    return fromSweep(sweep, { brief: readBrief(root, sweep.brief), primary, timezone: config.timezone }).map(entry => {
      if (entry.reason) return { id: entry.id, reason: entry.reason };
      try { return { def: definition(entry.def, { primary }), paused: mine?.off === true }; } catch (error) { return { id: entry.id, reason: error.message }; }
    });
  });
}

/** What to do with one default: add it, update an untouched one, forget an ended one, or leave the person's own. One
 *  check-ins paused (`kept.checkins`) is still untouched. */
function choice(held, kept, def) {
  if (!held) return 'add';
  if (held.ended) return 'ended';
  const waiting = held.state === 'on' || (kept?.checkins && held.state === 'paused');
  const untouched = kept && held.host === 'app' && waiting && held.version === kept.version && same(held.timing, kept.timing);
  if (!untouched) return 'yours';
  return held.version === scheduleVersion(def) && same(held.timing, def.timing) ? 'same' : 'update';
}

/** The state check-ins want for a new or untouched default, or null: paused when added while off or at the off flip,
 *  kept paused while off, on once on. Held on while off, a marked one was resumed by the person; an `owed` one not. */
function checkins(state, held, mark, { off, applied, paused }) {
  if (state === 'add') return off && !paused ? 'paused' : null;
  if (state !== 'same' && state !== 'update') return null;
  if (!off) return mark && held.state === 'paused' ? 'on' : null;
  if (mark) return held.state === 'paused' || mark === 'owed' ? 'paused' : null;
  return !applied && held.state === 'on' ? 'paused' : null;
}

/** The defaults WongStack retired: `[{id, reason}]` from the shipped list. */
export const retiredDefaults = (list = DEFAULT_SCHEDULES) => JSON.parse(readFileSync(list, 'utf8')).retired ?? [];

/** Ends each retired default the person still has, changed or not, with one journal line, and forgets it here; one
 *  already ended or never added is only forgotten. */
async function endRetired({ list, client, added, stateDir, timezone }) {
  const results = [];
  for (const { id, reason } of retiredDefaults(list)) {
    try {
      const held = (await readSchedule(client, id))?.schedule;
      delete added[id];
      if (!held || held.ended) continue;
      await send(client, 'schedule-end', 'POST', { key: id, reason: `WongStack retired this default: ${reason}`.slice(0, 300) });
      addLine({ stateDir, timezone, line: `Default schedule ended: ${held.name}. ${reason}`, kind: 'defaults' });
      results.push({ key: id, state: 'retired' });
    } catch (error) { results.push({ key: id, state: 'failed', reason: error.extra?.reason ?? error.message }); }
  }
  return results;
}

/** `defaults`: adds or updates each default schedule and approves it here, paused while check-ins are `off`, and ends
 *  each retired one; `dryRun` only shows them. */
export async function addDefaults({ root, primary, config, stateDir, client, computer, env, email, dryRun = false, list, off = false }) {
  const items = defaultDefinitions({ root, primary, config, list });
  if (dryRun) return { dryRun: true, schedules: items.map(item => (item.def ? { ...item.def, version: scheduleVersion(item.def), paused: item.paused } : item)) };
  const kept = readJson(defaultsFile(stateDir), {}), added = { ...kept.added }, results = [];
  for (const item of items) {
    if (!item.def) { results.push({ ...item, state: 'refused' }); continue; }
    const { def, paused } = item, key = def.key;
    try {
      const held = (await readSchedule(client, key))?.schedule, state = choice(held, added[key], def);
      const wants = checkins(state, held, added[key]?.checkins, { off, applied: Boolean(kept.off), paused });
      if (state === 'ended') delete added[key];
      let schedule = held, version, moved = false;
      if (state === 'add' || state === 'update') ({ schedule, version } = await saveDefinition(client, def, { computer }));
      if (version) {
        await approveHere(client, schedule, version, { computer, env, email });
        added[key] = { version, timing: def.timing };
      }
      const target = state === 'add' && paused ? 'paused' : wants;
      if (target && schedule.state !== target) {
        // Recorded first, so a pause that fails is tried again at the next pass.
        if (wants === 'paused') added[key] = { ...added[key], checkins: 'owed' };
        schedule = (await send(client, target === 'on' ? 'resume' : 'pause', 'POST', { key })).schedule;
        moved = true;
      }
      if (added[key]) {
        const { checkins: _was, ...entry } = added[key];
        added[key] = wants === 'paused' ? { ...entry, checkins: true } : entry;
      }
      results.push({ key, state, ...(state === 'add' && paused ? { paused } : {}), ...(moved && wants ? { checkins: wants } : {}) });
    } catch (error) { results.push({ key, state: 'failed', reason: error.extra?.reason ?? error.message }); }
  }
  results.push(...await endRetired({ list, client, added, stateDir, timezone: config.timezone }));
  // A failed default keeps the old off state, so the next pass flips it again.
  const applied = results.some(each => each.state === 'failed') ? Boolean(kept.off) : off;
  writeJson(defaultsFile(stateDir), { ...readJson(defaultsFile(stateDir), {}), added, off: applied });
  return { results };
}
