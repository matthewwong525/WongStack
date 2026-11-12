// A schedule's progress: in the app for every run, one run holding it at a time.
import { credentialFree } from '../../skills/daily/skills/schedule/scripts/lib/records.mjs';
import { send } from './app.mjs';

/** One schedule's progress in the app: read it, claim it for a run, write it while claimed, give it back. */
export function appProgress(client, key) {
  const claim = async (run, release) => (await send(client, 'schedule-progress-claim', 'POST', { key, run, ...(release ? { release } : {}) })).claimed;
  return {
    read: () => send(client, `schedule-progress?key=${encodeURIComponent(key)}`),
    write: (run, progress) => send(client, 'schedule-progress', 'PUT', { key, run, progress: credentialFree(progress) }),
    claim: run => claim(run, false),
    release: run => claim(run, true),
  };
}
