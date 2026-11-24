// A stand-in company app for the schedule routes, answering copies as HTTP would, and an old repo record to move.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { routineRevision } from '../../../.agents/skills/schedule/scripts/lib/records.mjs';
import { scheduleVersion } from '../../../.agents/skills/schedule/scripts/lib/version.mjs';

export const NOW = Date.parse('2026-10-09T10:00:00Z');
export const COMPUTER = 'c'.repeat(32);
export const ORIGIN = 'https://app.example.test';
export const runId = n => String(n).padStart(32, '0');

/** A temporary folder, removed after the test. */
export function folder(t, prefix = 'wong-schedule-') {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** The app's routes for one signed-in person. `broken[route]` is 'throw' (network error) or 'ignore' (500). */
export function fakeApp({ origin = ORIGIN, broken = {}, claimable = [] } = {}) {
  const schedules = new Map(), runs = [], results = [], calls = [], team = [], held = new Map();
  const reply = (value, status = 200) => ({ value: structuredClone(value), status });
  const refuse = (code, status) => reply({ error: { code } }, status);
  async function http(address, init = {}) {
    const [route, query] = address.replace('/apps/inbox/api/', '').split('?');
    const method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : {};
    calls.push([method, route, body]);
    if (broken[route] === 'throw') throw new Error('network');
    if (broken[route] === 'ignore') return reply({ error: { code: 'server' } }, 500);
    const key = query ? new URLSearchParams(query).get('key') : body.key, found = schedules.get(key);
    if (route === 'schedule' && method === 'GET') return found ? reply({ schedule: found, runs: runs.filter(run => run.key === key) }) : refuse('not_found', 404);
    if (route === 'schedule') {
      const row = { key, host: 'app', name: body.name, summary: body.summary, timing: body.timing, state: found?.state ?? 'on', nextRunAt: NOW + 3600e3,
        computer: body.computer, lastRun: null, waiting: null, kind: body.kind ?? 'chat', instructions: body.instructions, run: body.run,
        authority: body.authority ?? {}, until: body.until ?? null, ended: null, version: scheduleVersion(body),
        approvedVersion: found?.approvedVersion ?? null, computerName: found?.computerName ?? null, madeBy: null };
      schedules.set(key, row);
      return reply({ schedule: row });
    }
    if (route === 'items') return reply({ items: [], computerOnline: true });
    if (route === 'team-schedule') { team.push(body); return reply({ copied: body.people.length, skipped: 0 }); }
    if (route === 'schedules') return reply({ schedules: [...schedules.values()], computerOnline: true });
    if (route === 'claim') return reply({ runs: claimable.splice(0) });
    if (route === 'run-result') { results.push(body); return reply({ run: body }); }
    if (route === 'mirror') return reply({ mirrored: body.schedules.length });
    if (route === 'run-cancel') return reply({ run: { id: body.id, state: 'cancelled' } });
    if (!found) return refuse('not_found', 404);
    if (route === 'schedule-approved') {
      if (body.version !== found.version) return refuse('changed', 409);
      if (found.computer && found.computer !== body.computer) return refuse('other_computer', 409);
      Object.assign(found, { approvedVersion: body.version, computerName: body.computerName, computer: body.computer });
      return reply({ schedule: found });
    }
    if (found.host !== 'app' && ['pause', 'resume', 'run-now'].includes(route)) return refuse('not_app', 409);
    if (route === 'pause' || route === 'schedule-end') {
      Object.assign(found, { state: 'paused', nextRunAt: null, waiting: null }, route === 'schedule-end' ? { ended: { at: NOW, reason: body.reason } } : {});
      return reply({ schedule: found });
    }
    if (route === 'resume') { Object.assign(found, { state: 'on', nextRunAt: NOW + 3600e3 }); return reply({ schedule: found }); }
    if (route === 'run-now') {
      const run = { id: runId(runs.length + 1), key, dueAt: NOW, source: 'now', state: 'due', result: null, chatTitle: null, agentId: null };
      runs.unshift(run); found.waiting = run; return reply({ schedule: found });
    }
    const progress = held.get(key) ?? { progress: null, claim: null };
    if (route === 'schedule-progress' && method === 'GET') return reply(progress);
    if (route === 'schedule-progress') {
      if (body.run === undefined ? progress.claim || progress.progress !== null : progress.claim?.run !== body.run) return refuse('not_claimed', 409);
      held.set(key, { ...progress, progress: body.progress }); return reply(held.get(key));
    }
    if (route === 'schedule-progress-claim') {
      if (body.release) { if (progress.claim?.run === body.run) held.set(key, { ...progress, claim: null }); return reply({ claimed: false }); }
      if (progress.claim && progress.claim.run !== body.run) return reply({ claimed: false });
      held.set(key, { ...progress, claim: { run: body.run, at: NOW } }); return reply({ claimed: true });
    }
    return refuse('not_found', 404);
  }
  return { target: () => origin, http, schedules, runs, results, calls, team };
}

/** A schedule as a chat writes it. */
export const plan = (overrides = {}) => ({ key: 'weekly-plan', name: 'Weekly plan', instructions: 'Plan the week.',
  timing: { mode: 'recurring', cron: '0 9 * * 1', timezone: 'UTC', allowedLatenessMs: 3600e3 }, ...overrides });

/** An old `schedules/<key>.json` record, written into `root`. */
export function writeRecord(root, overrides = {}, binding = {}) {
  const record = { version: 1, kind: 'routine', key: 'synthetic', name: 'Weekly synthetic', owner: 'jo@example.test', instructions: 'Read synthetic data and leave a result.',
    execution: { type: 'assistant' }, timing: { mode: 'recurring', timezone: 'UTC', cron: '0 10 * * 1', allowedLatenessMs: 60000 },
    authority: { actions: ['read'], recipients: [], channels: [] }, ...overrides };
  record.binding = { version: 1, key: record.key, owner: record.owner, repository: 'https://github.com/example/project.git', record: `schedules/${record.key}.json`,
    revision: '0'.repeat(64), execution: { type: 'assistant', host: 'paseo', nativeId: 'job-1', generation: 1, capabilities: {}, context: { cwd: root, location: 'local' } },
    progress: { type: 'host', reference: 'continuation:test' }, timing: record.timing, authority: record.authority,
    lifecycle: { state: 'scheduled', published: true, publication: 'commit:synthetic' }, ...binding };
  record.binding.revision = routineRevision(record);
  mkdirSync(path.join(root, 'schedules'), { recursive: true });
  writeFileSync(path.join(root, record.binding.record), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
