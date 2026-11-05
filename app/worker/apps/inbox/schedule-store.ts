// What the schedule routes and the line's clock share: the row shapes, when a schedule runs next, and how a run
// settles: one waiting at a time, a late one missed, a taken one with no result failed. wiki/stack/host-schedules.md
import { Cron } from "croner";
import { z } from "zod";
import { mine, type Scope } from "./rows.ts";

/** A collected run whose result hasn't come this long after is failed, never handed out again, as a tap is. */
const DELIVER_MS = 120_000;
const EVERY = /^([1-9]\d*)([smhd])$/;
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export const scheduleKey = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64);
export const computerId = z.string().regex(/^[0-9a-f]{32}$/);
export const runId = z.string().regex(/^[0-9a-f]{32}$/);
const stamp = z.string().max(40).refine(text => Number.isFinite(Date.parse(text)));
/** A record's timing, as `binding.timing` holds it; fields the app does not use are dropped. */
export const timing = z.object({
  mode: z.enum(["once", "recurring"]), cron: z.string().max(100).optional(), every: z.string().regex(EVERY).optional(),
  timezone: z.string().min(1).max(64), dueAt: stamp.optional(), expiresAt: stamp.optional(), allowedLatenessMs: z.number().int().nonnegative(),
});
export type Timing = z.infer<typeof timing>;
const RUN_STATES = ["due", "taken", "started", "failed", "blocked", "missed", "cancelled"] as const;
export const run = z.strictObject({
  id: z.string(), key: z.string(), dueAt: z.number(), source: z.enum(["clock", "now"]), state: z.enum(RUN_STATES),
  result: z.string().nullable(), chatTitle: z.string().nullable(), agentId: z.string().nullable(),
});
const words = z.array(z.string().min(1).max(200)).max(50);
/** Where and how a run goes: its folder, tool and effort, and for a background run its check, time limit and place. */
const runSettings = z.strictObject({
  cwd: z.string().min(1).max(1000).optional(), provider: z.string().min(1).max(100).optional(), thinking: z.string().min(1).max(40).optional(),
  mode: z.string().min(1).max(100).optional(), check: z.string().min(1).max(1000).optional(), minutes: z.number().int().min(1).max(1440).optional(),
  place: z.enum(["checkout", "copy"]).optional(),
});
/** What a run may do: its actions, recipients and channels, and the least time between two runs. */
const authority = z.strictObject({
  actions: words.optional(), recipients: words.optional(), channels: words.optional(), minIntervalMs: z.number().int().positive().optional(),
});
const KINDS = ["chat", "background"] as const;
export const schedule = z.strictObject({
  key: z.string(), host: z.enum(["app", "paseo"]), name: z.string(), summary: z.string(), timing, state: z.enum(["on", "paused"]),
  nextRunAt: z.number().nullable(), computer: z.string(), lastRun: run.nullable(), waiting: run.nullable(),
  kind: z.enum(KINDS), instructions: z.string(), run: runSettings, authority, until: z.string().nullable(),
  ended: z.strictObject({ at: z.number(), reason: z.string() }).nullable(), version: z.string(), approvedVersion: z.string().nullable(),
  approvedAt: z.number().nullable(), computerName: z.string().nullable(), madeBy: z.string().nullable(),
});
/** What a put sends besides its key and timing: the fields its version is made from, its name and its end. */
export const definition = {
  name: z.string().min(1).max(200).describe("Its name."), summary: z.string().max(300).describe("What it does, in a line."),
  timing: timing.describe("When it runs."), kind: z.enum(KINDS).optional().describe("chat opens a workspace; background runs with no chat."),
  instructions: z.string().min(1).max(8000).describe("What a run does: the chat's first message or the background brief."),
  run: runSettings.describe("Where and how it runs."), authority: authority.optional().describe("What a run may do."),
  until: z.string().min(1).max(500).optional().describe("The completion source of a goal; none for a schedule with no end."),
};
export type Definition = { key: string; name: string; summary: string; timing: Timing; kind?: (typeof KINDS)[number]; instructions: string;
  run: z.infer<typeof runSettings>; authority?: z.infer<typeof authority>; until?: string };

/** `value` with each object's keys sorted and undefined fields dropped, so two equal schedules hash alike. */
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value === null || typeof value !== "object" ? value
  : Object.fromEntries(Object.keys(value).filter(key => (value as Record<string, unknown>)[key] !== undefined).sort()
    .map(key => [key, canonical((value as Record<string, unknown>)[key])]));

/** The version a computer approves: what it does, where, with what leave and until when, never its timing. Same as
 *  the computer's .agents/skills/schedule/scripts/lib/version.mjs. */
export async function scheduleVersion({ key, kind = "chat", instructions, run = {}, authority = {}, until }:
  Pick<Definition, "key" | "kind" | "instructions"> & { run?: Definition["run"]; authority?: Definition["authority"]; until?: string | null }) {
  // A row's `until: null` is no end, as a missing one is.
  const text = JSON.stringify(canonical({ key, kind, instructions, run, authority, until: until ?? undefined }));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Whether the app can work out the timing's due times: a known timezone, and a cron, an interval or a date. */
export function readable(value: Timing) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.timezone });
    if (value.mode === "once") return value.dueAt !== undefined;
    if (value.cron) new Cron(value.cron, { timezone: value.timezone, paused: true });
    return Boolean(value.cron || value.every);
  } catch { return false; }
}

/** The first due time after `after`, or null when none is left. `every` counts from midnight UTC, as Paseo's does. */
function following(value: Timing, after: number): number | null {
  if (value.mode === "once") return Date.parse(value.dueAt!) > after ? Date.parse(value.dueAt!) : null;
  if (value.cron) {
    return new Cron(value.cron, { timezone: value.timezone, stopAt: value.expiresAt, paused: true }).nextRun(new Date(after))?.getTime() ?? null;
  }
  const [, count, unit] = EVERY.exec(value.every!)!;
  const step = Number(count) * UNIT_MS[unit as keyof typeof UNIT_MS];
  return (Math.floor(after / step) + 1) * step;
}

/** The next due time after `after`, within the timing's expiry, or null when none is left. */
export function nextRun(value: Timing, after: number): number | null {
  const next = following(value, after);
  return next !== null && (!value.expiresAt || next <= Date.parse(value.expiresAt)) ? next : null;
}

/** When a schedule put on the clock or resumed now first runs: a one-time run still within its lateness counts. */
export const firstRun = (value: Timing, now: number) => nextRun(value, value.mode === "once" ? now - value.allowedLatenessMs - 1 : now);

export const newId = () => crypto.randomUUID().replaceAll("-", "");

type Who = Pick<Scope, "db" | "installation" | "email" | "now">;

/** Fails a collected run whose result never came, and misses a clock run past its lateness. A run asked for now waits
 *  until the computer takes it or the person cancels it. */
export const settleRuns = (at: Who) => at.db.batch([
  mine(at, `UPDATE schedule_runs SET state = 'failed', result = 'no_result', updated_at = ?3
    WHERE installation_id = ?1 AND email = ?2 AND state = 'taken' AND claimed_at <= ?4`, at.now, at.now - DELIVER_MS),
  mine(at, `UPDATE schedule_runs SET state = 'missed', result = 'late', updated_at = ?3
    WHERE installation_id = ?1 AND email = ?2 AND state = 'due' AND source = 'clock' AND due_at + COALESCE((SELECT
      json_extract(s.timing_json, '$.allowedLatenessMs') FROM schedules s WHERE s.installation_id = ?1 AND s.email = ?2
      AND s.key = schedule_runs.key), 0) < ?3`, at.now),
]);

/** A schedule the clock starts: on the app's clock, on, not ended, and bound to a computer. */
export const runnable = (s = "") => `${s}host = 'app' AND ${s}state = 'on' AND ${s}ended_at IS NULL AND ${s}computer_id <> ''`;

type DueRow = { key: string; computer_id: string; timing_json: string; next_run_at: number };

/** Starts each run whose time came, missing the one still waiting, while `next_run_at` is still the one read: two
 *  overlapping ticks start one run. Resolves to the computers that have a run waiting. */
export async function tick(at: Who): Promise<Set<string>> {
  const { results } = await mine(at, `SELECT key, computer_id, timing_json, next_run_at FROM schedules WHERE installation_id = ?1
    AND email = ?2 AND ${runnable()} AND next_run_at IS NOT NULL AND next_run_at <= ?3`, at.now).all<DueRow>();
  const still = `EXISTS (SELECT 1 FROM schedules WHERE installation_id = ?1 AND email = ?2 AND key = ?3 AND host = 'app'
    AND state = 'on' AND next_run_at = ?4)`;
  for (const row of results) {
    await at.db.batch([
      mine(at, `UPDATE schedule_runs SET state = 'missed', result = 'superseded', updated_at = ?5
        WHERE installation_id = ?1 AND email = ?2 AND key = ?3 AND state = 'due' AND ${still}`, row.key, row.next_run_at, at.now),
      mine(at, `INSERT INTO schedule_runs (installation_id, email, id, key, due_at, source, state, updated_at)
        SELECT ?1, ?2, ?6, ?3, ?4, 'clock', 'due', ?5 WHERE ${still}`, row.key, row.next_run_at, at.now, newId()),
      mine(at, `UPDATE schedules SET next_run_at = ?5, updated_at = ?6 WHERE installation_id = ?1 AND email = ?2 AND key = ?3
        AND host = 'app' AND state = 'on' AND next_run_at = ?4`, row.key, row.next_run_at, nextRun(JSON.parse(row.timing_json), at.now), at.now),
    ]);
  }
  await settleRuns(at);
  const { results: waiting } = await mine(at, `SELECT DISTINCT s.computer_id FROM schedule_runs r JOIN schedules s
    ON s.installation_id = r.installation_id AND s.email = r.email AND s.key = r.key
    WHERE r.installation_id = ?1 AND r.email = ?2 AND r.state = 'due' AND ${runnable("s.")}`)
    .all<{ computer_id: string }>();
  return new Set(waiting.map(row => row.computer_id));
}

/** When the person's clock next has work: the earliest next run of a schedule that is on, or null. */
export async function nextWake(at: Who) {
  return (await mine(at, `SELECT MIN(next_run_at) AS at FROM schedules WHERE installation_id = ?1 AND email = ?2
    AND ${runnable()}`).first<{ at: number | null }>())!.at;
}

const RUN_JSON = `json_object('id', r.id, 'key', r.key, 'dueAt', r.due_at, 'source', r.source, 'state', r.state, 'result', r.result,
  'chatTitle', r.chat_title, 'agentId', r.agent_id)`;
const runOf = (state: string) => `(SELECT ${RUN_JSON} FROM schedule_runs r WHERE r.installation_id = s.installation_id
  AND r.email = s.email AND r.key = s.key AND r.state ${state} ORDER BY r.due_at DESC, r.rowid DESC LIMIT 1)`;
/** A schedule's columns as the inbox shows them, with its last finished run and the one waiting, if any. */
export const SCHEDULE_COLUMNS = `s.key, s.host, s.name, s.summary, s.timing_json, s.state, s.next_run_at, s.computer_id,
  s.min_interval_ms, s.kind, s.instructions, s.run_json, s.authority_json, s.until, s.ended_at, s.end_reason, s.revision, s.approved_version,
  s.approved_at, s.computer_name, s.made_by, ${runOf("NOT IN ('due', 'taken')")} AS last_run, ${runOf("IN ('due', 'taken')")} AS waiting`;
export type ScheduleRow = { key: string; host: "app" | "paseo"; name: string; summary: string; timing_json: string; state: "on" | "paused";
  next_run_at: number | null; computer_id: string; min_interval_ms: number | null; kind: (typeof KINDS)[number]; instructions: string;
  run_json: string; authority_json: string; until: string | null; ended_at: number | null; end_reason: string | null; revision: string;
  approved_version: string | null; approved_at: number | null; computer_name: string | null; made_by: string | null; last_run: string | null; waiting: string | null };

export const shown = (row: ScheduleRow): z.infer<typeof schedule> => ({ key: row.key, host: row.host, name: row.name, summary: row.summary,
  timing: JSON.parse(row.timing_json), state: row.state, nextRunAt: row.next_run_at, computer: row.computer_id,
  lastRun: row.last_run === null ? null : JSON.parse(row.last_run), waiting: row.waiting === null ? null : JSON.parse(row.waiting),
  kind: row.kind, instructions: row.instructions, run: JSON.parse(row.run_json), authority: JSON.parse(row.authority_json), until: row.until,
  ended: row.ended_at === null ? null : { at: row.ended_at, reason: row.end_reason! }, version: row.revision,
  approvedVersion: row.approved_version, approvedAt: row.approved_at, computerName: row.computer_name, madeBy: row.made_by });

/** The caller's schedule `key`, or null. */
export const findSchedule = (at: Who, key: string) =>
  mine(at, `SELECT ${SCHEDULE_COLUMNS} FROM schedules s WHERE installation_id = ?1 AND email = ?2 AND key = ?3`, key).first<ScheduleRow>();

export type RunRow = { id: string; key: string; due_at: number; source: "clock" | "now"; state: (typeof RUN_STATES)[number];
  result: string | null; chat_title: string | null; agent_id: string | null };
export const RUN_COLUMNS = "id, key, due_at, source, state, result, chat_title, agent_id";
export const runShown = (row: RunRow): z.infer<typeof run> => ({ id: row.id, key: row.key, dueAt: row.due_at, source: row.source,
  state: row.state, result: row.result, chatTitle: row.chat_title, agentId: row.agent_id });

/** The caller's run `id`, or null. */
export const findRun = (at: Who, id: string) =>
  mine(at, `SELECT ${RUN_COLUMNS} FROM schedule_runs WHERE installation_id = ?1 AND email = ?2 AND id = ?3`, id).first<RunRow>();
