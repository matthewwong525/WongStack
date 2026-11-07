// WongStack's default schedules, approved here because they come with this checkout's code; one the person never
// changed follows updates and check-ins. wiki/stack/host-schedules.md
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readJson, writeJson } from '../../../daily/scripts/chief.mjs';
import { defaultsFile } from '../../../daily/scripts/daily.mjs';
import { DEFAULT_SCHEDULES } from '../../../daily/scripts/worker.mjs';
import { approveHere, definition, readSchedule, saveDefinition, send } from './app.mjs';
import { fromSweep, readBrief } from './move-in.mjs';
import { canonical, scheduleVersion } from './version.mjs';

const same = (one, two) => JSON.stringify(canonical(one)) === JSON.stringify(canonical(two));

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

/** `defaults`: adds or updates each default schedule and approves it here, paused while check-ins are `off`; `dryRun`
 *  only shows them. */
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
  // A failed default keeps the old off state, so the next pass flips it again.
  const applied = results.some(each => each.state === 'failed') ? Boolean(kept.off) : off;
  writeJson(defaultsFile(stateDir), { ...readJson(defaultsFile(stateDir), {}), added, off: applied });
  return { results };
}
