// A schedule's version: the sha256 of what it does, where, with what leave and until when, never its timing.
// `scheduleVersion` in app/worker/apps/inbox/schedule-store.ts computes the same text. wiki/stack/host-schedules.md
import { createHash } from 'node:crypto';

/** `value` with every object's keys sorted and undefined fields dropped, so two equal schedules hash alike. */
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => [key, canonical(value[key])]));
}

/** The version a computer approves: changed instructions, folder, leave or end need a new OK. */
export function scheduleVersion({ key, kind = 'chat', instructions, run = {}, authority = {}, until }) {
  // A row's `until: null` is no end, as a missing one is.
  const text = JSON.stringify(canonical({ key, kind, instructions, run, authority, until: until ?? undefined }));
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
