// One durable continuation store. Local claims are exclusive and never automatically stolen.
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { credentialFree, requireValue, ScheduleError } from './records.mjs';

export function localProgress(reference) {
  requireValue(path.isAbsolute(reference), 'Continuation needs an absolute durable path.');
  const directory = path.dirname(reference), lock = `${reference}.claim`;
  return {
    async read() {
      try { return JSON.parse(readFileSync(reference, 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async write(value) {
      credentialFree(value);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      const temp = `${reference}.${process.pid}.tmp`;
      writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); renameSync(temp, reference);
    },
    async claim(runId) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      try { const fd = openSync(lock, 'wx', 0o600); writeFileSync(fd, runId); closeSync(fd); return true; }
      catch (error) { if (error.code === 'EEXIST') return false; throw error; }
    },
    async release(runId) { if (existsSync(lock) && readFileSync(lock, 'utf8') === runId) rmSync(lock); },
  };
}
export function progressRoute(binding, routes = {}) {
  const route = routes[binding.progress.type];
  if (route) return route(binding.progress.reference);
  if (binding.progress.type === 'local' && binding.execution.context.location === 'local') return localProgress(binding.progress.reference);
  throw new ScheduleError(`Future ${binding.progress.type} continuation access is unavailable; no fallback store was selected.`, 3);
}
