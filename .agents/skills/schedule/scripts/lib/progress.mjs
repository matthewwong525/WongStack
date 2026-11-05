// A schedule's progress: in the app for every run, one run holding it at a time. An old record's local file is only
// read, for the move to the app.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { credentialFree, requireValue } from './records.mjs';
import { send } from './app.mjs';

/** An old record's progress file, read only. */
export function localProgress(reference) {
  requireValue(path.isAbsolute(reference), 'Continuation needs an absolute durable path.');
  return {
    async read() {
      try { return JSON.parse(readFileSync(reference, 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
  };
}

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
