// WongStack's default schedules: each one the person lacks goes to the app, approved here because it comes with this
// checkout's code; one this computer added and the person never changed follows updates. wiki/stack/host-schedules.md
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

/** What to do with one default: add it, update an untouched one, forget an ended one, or leave the person's own. */
function choice(held, kept, def) {
  if (!held) return 'add';
  if (held.ended) return 'ended';
  const untouched = kept && held.host === 'app' && held.state === 'on' && held.version === kept.version && same(held.timing, kept.timing);
  if (!untouched) return 'yours';
  return held.version === scheduleVersion(def) && same(held.timing, def.timing) ? 'same' : 'update';
}

/** `defaults`: adds or updates each default schedule and approves it here; `dryRun` only shows them. */
export async function addDefaults({ root, primary, config, stateDir, client, computer, env, email, dryRun = false, list }) {
  const items = defaultDefinitions({ root, primary, config, list });
  if (dryRun) return { dryRun: true, schedules: items.map(item => (item.def ? { ...item.def, version: scheduleVersion(item.def), paused: item.paused } : item)) };
  const added = { ...readJson(defaultsFile(stateDir), {}).added }, results = [];
  for (const item of items) {
    if (!item.def) { results.push({ ...item, state: 'refused' }); continue; }
    const { def, paused } = item;
    try {
      const state = choice((await readSchedule(client, def.key))?.schedule, added[def.key], def);
      if (state === 'ended') delete added[def.key];
      if (state === 'add' || state === 'update') {
        let { schedule, version } = await saveDefinition(client, def, { computer });
        if (state === 'add' && paused) schedule = (await send(client, 'pause', 'POST', { key: def.key })).schedule;
        await approveHere(client, schedule, version, { computer, env, email });
        added[def.key] = { version, timing: def.timing };
      }
      results.push({ key: def.key, state, ...(state === 'add' && paused ? { paused } : {}) });
    } catch (error) { results.push({ key: def.key, state: 'failed', reason: error.extra?.reason ?? error.message }); }
  }
  writeJson(defaultsFile(stateDir), { ...readJson(defaultsFile(stateDir), {}), added });
  return { results };
}
