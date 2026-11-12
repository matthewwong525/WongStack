// The background schedule runs the helper hands this worker: `schedule-run-<run id>.json` in the event folder. A run
// starts only when the schedule store's `check` passes it. wiki/stack/host-schedules.md
import { mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { primaryRoot } from './lib/primary-root.mjs';
import { agentEvents } from './chief.mjs';

const FILE = /^schedule-run-[0-9a-f]{32}\.json$/;
/** A hand-over older than this is past the app's own two minutes, so its run already shows as not started. */
const STALE_MS = 10 * 60e3;

const list = dir => { try { return readdirSync(dir).filter(name => FILE.test(name)); } catch { return []; } };
const real = dir => { try { return realpathSync(dir); } catch { return dir; } };
export const inProject = (dir, project) => { try { return real(primaryRoot(dir).primary) === real(project); } catch { return false; } };

/** The hand-over files waiting in the event folder. */
export const waitingRuns = env => list(agentEvents(env));

/** Takes the person's own hand-overs for `project`: each moves into the state folder first, so one worker runs it once.
 * Another person's file, or another checkout's, stays; a stale or broken one goes. */
export function takeRuns({ env = process.env, project, emails, stateDir, now = Date.now() }) {
  const folder = agentEvents(env), mine = new Set(emails.map(email => email.toLowerCase())), taken = [];
  const held = join(stateDir, 'schedule-runs');
  for (const name of list(folder)) {
    const file = join(folder, name);
    let event;
    try {
      ({ event } = JSON.parse(readFileSync(file, 'utf8')));
      if (now - statSync(file).mtimeMs > STALE_MS) throw new Error('stale');
    } catch { rmSync(file, { force: true }); continue; }
    if (!mine.has(String(event?.email).toLowerCase()) || !inProject(event.cwd, project)) continue;
    mkdirSync(held, { recursive: true, mode: 0o700 });
    try { renameSync(file, join(held, name)); } catch { continue; }
    rmSync(join(held, name), { force: true });
    taken.push(event);
  }
  return taken;
}

/** Reports each hand-over taken while check-ins are off as blocked, `checkins_off`: the store says why it never ran. */
export async function refuseRuns(events, app) {
  for (const event of events) await app.report(event.run, { state: 'blocked', reason: 'checkins_off' });
  return events.length;
}
