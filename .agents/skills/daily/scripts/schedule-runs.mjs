// The background schedule runs the helper hands this worker: `schedule-run-<run id>.json` in the event folder. A run
// starts only when this computer approved the very version the app holds. wiki/stack/host-schedules.md
import { mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { companyFor } from '../../hand-over/scripts/lib/inbox.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { appCall, heldDefinition, readSchedule, runnableFolder } from '../../schedule/scripts/lib/app.mjs';
import { approvedVersion, signedInAs } from '../../schedule/scripts/lib/approvals.mjs';
import { scheduleVersion } from '../../schedule/scripts/lib/version.mjs';
import { agentEvents } from './chief.mjs';

const FILE = /^schedule-run-[0-9a-f]{32}\.json$/;
/** A hand-over older than this is past the app's own two minutes, so its run already shows as not started. */
const STALE_MS = 10 * 60e3;

const list = dir => { try { return readdirSync(dir).filter(name => FILE.test(name)); } catch { return []; } };
const real = dir => { try { return realpathSync(dir); } catch { return dir; } };
const inProject = (dir, project) => { try { return real(primaryRoot(dir).primary) === real(project); } catch { return false; } };

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

/** The app as this worker reads it: its origin, the signed-in email, one schedule, and a run's result. */
export function scheduleApp(project, connect = () => companyFor(project)) {
  let client;
  const company = async () => (client ??= await connect());
  return {
    origin: async () => (await company())?.target() ?? null,
    email: origin => signedInAs(origin),
    schedule: async key => {
      const found = await company();
      if (!found) throw new Error('no app');
      return (await readSchedule(found, key))?.schedule ?? null;
    },
    report: async (id, result) => {
      // On failure the app's two minutes mark it.
      try { await appCall(await company(), 'run-result', 'POST', { id, ...result }); } catch { /* see above */ }
    },
  };
}

/** Reports each hand-over taken while check-ins are off as blocked, `checkins_off`: the Inbox says why it never ran. */
export async function refuseRuns(events, app) {
  for (const event of events) await app.report(event.run, { state: 'blocked', reason: 'checkins_off' });
  return events.length;
}

/** `{schedule}` when the run may start, else `{reason}`: the signed-in person's OK on this version, the app's same
 * version, not ended, and a folder in `project`. */
export async function checkRun(event, { app, project, env = process.env }) {
  let origin, held;
  try { origin = await app.origin(); held = origin && await app.schedule(event.key); } catch { return { reason: 'no_app' }; }
  if (!origin) return { reason: 'no_app' };
  const email = String(event.email).toLowerCase();
  if (app.email(origin) !== email || approvedVersion({ origin, email, key: event.key }, env) !== event.version) return { reason: 'not_approved' };
  if (!held || held.kind !== 'background' || held.version !== event.version || scheduleVersion(heldDefinition(held)) !== event.version) {
    return { reason: 'changed' };
  }
  if (held.ended) return { reason: 'ended' };
  if (!runnableFolder(held.run?.cwd) || !inProject(held.run.cwd, project)) return { reason: 'no_folder' };
  return { schedule: held };
}
