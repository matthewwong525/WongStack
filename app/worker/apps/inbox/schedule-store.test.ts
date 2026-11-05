import { expect, it } from "vitest";
import { database } from "../../../tests/employee-access/connections";
import { firstRun, nextRun, readable, scheduleVersion, tick, timing, type Timing } from "./schedule-store";

const at = (text: string) => Date.parse(text);
const recurring = (extra: Partial<Timing>): Timing => ({ mode: "recurring", timezone: "UTC", allowedLatenessMs: 0, ...extra });

it("reads a timing only with a known timezone and a cron, an interval or a date it can work out", () => {
  expect(readable(recurring({ cron: "0 9 * * 1-5", timezone: "America/Toronto" }))).toBe(true);
  expect(readable(recurring({ every: "15m" }))).toBe(true);
  expect(readable({ mode: "once", timezone: "UTC", dueAt: "2026-10-22T09:00:00Z", allowedLatenessMs: 0 })).toBe(true);
  expect(readable({ mode: "once", timezone: "UTC", allowedLatenessMs: 0 })).toBe(false);
  expect(readable(recurring({}))).toBe(false);
  expect(readable(recurring({ cron: "every morning" }))).toBe(false);
  expect(readable(recurring({ every: "1h", timezone: "Mars/Base" }))).toBe(false);
  expect(timing.safeParse(recurring({ every: "0m" })).success).toBe(false);
  expect(timing.safeParse({ mode: "once", timezone: "UTC", dueAt: "soon", allowedLatenessMs: 0 }).success).toBe(false);
});

it("works out a cron in its timezone, and stops at its expiry", () => {
  const weekdays = recurring({ cron: "0 9 * * 1-5", timezone: "America/Toronto" });
  expect(nextRun(weekdays, at("2026-10-22T13:00:00Z"))).toBe(at("2026-10-23T13:00:00Z"));
  // Friday's run is the last one before the weekend; Toronto's clocks go back on November 1.
  expect(nextRun(weekdays, at("2026-10-30T13:00:00Z"))).toBe(at("2026-11-02T14:00:00Z"));
  expect(nextRun({ ...weekdays, expiresAt: "2026-10-23T00:00:00Z" }, at("2026-10-22T13:00:00Z"))).toBeNull();
});

it("counts an interval from midnight UTC, as Paseo does, within its expiry", () => {
  expect(nextRun(recurring({ every: "15m" }), at("2026-10-22T09:07:00Z"))).toBe(at("2026-10-22T09:15:00Z"));
  expect(nextRun(recurring({ every: "1d" }), at("2026-10-22T09:00:00Z"))).toBe(at("2026-10-23T00:00:00Z"));
  expect(nextRun(recurring({ every: "1h", expiresAt: "2026-10-22T10:00:00Z" }), at("2026-10-22T09:00:00Z"))).toBe(at("2026-10-22T10:00:00Z"));
  expect(nextRun(recurring({ every: "30s", expiresAt: "2026-10-22T09:00:10Z" }), at("2026-10-22T09:00:00Z"))).toBeNull();
});

it("runs a one-time schedule at its date once, counting a date passed within its lateness when it is first put on", () => {
  const once: Timing = { mode: "once", timezone: "UTC", dueAt: "2026-10-22T09:00:00Z", allowedLatenessMs: 600_000 };
  expect(firstRun(once, at("2026-10-22T08:00:00Z"))).toBe(at(once.dueAt!));
  expect(firstRun(once, at("2026-10-22T09:10:00Z"))).toBe(at(once.dueAt!));
  expect(firstRun(once, at("2026-10-22T09:10:01Z"))).toBeNull();
  // Once it has come due there is no next time.
  expect(nextRun(once, at(once.dueAt!))).toBeNull();
  expect(firstRun(recurring({ every: "1h" }), at("2026-10-22T09:00:00Z"))).toBe(at("2026-10-22T10:00:00Z"));
});

it("starts one run per due time when two ticks overlap, the later one writing after the earlier read", async () => {
  const { sql, session } = database();
  const due = at("2026-10-22T09:00:00Z");
  sql.prepare(`INSERT INTO schedules (installation_id, email, key, host, computer_id, name, summary, timing_json, revision, state,
    next_run_at, updated_at) VALUES ('', 'sam@example.com', 'digest', 'app', ?, 'Digest', '', ?, '', 'on', ?, 0)`)
    .run("1".repeat(32), JSON.stringify(recurring({ every: "1h", allowedLatenessMs: 600_000 })), due);
  // The slow tick reads the due schedule, then waits while the other tick does all its work.
  let release = () => {};
  const gate = new Promise<void>(done => { release = done; });
  type Statement = ReturnType<typeof session.prepare>;
  const held = (statement: Statement): Statement => ({ ...statement, bind: (...values) => held(statement.bind(...values)),
    all: async () => { const answer = await statement.all(); await gate; return answer; } });
  const slow = { ...session, prepare: (query: string) => held(session.prepare(query)) };
  const who = (db: unknown) => ({ db: db as D1DatabaseSession, installation: "", email: "sam@example.com", now: due + 1000 });
  const late = tick(who(slow));
  await tick(who(session));
  release();
  await late;
  expect(sql.prepare("SELECT state, due_at FROM schedule_runs").all()).toEqual([{ state: "due", due_at: due }]);
  expect(sql.prepare("SELECT next_run_at FROM schedules").get()).toEqual({ next_run_at: at("2026-10-22T10:00:00Z") });
});

it("versions what a schedule does, where, with what leave and until when, never its timing", async () => {
  const plan = { key: "weekly-plan", kind: "chat" as const, instructions: "Plan the week.", run: { cwd: "/home/jo/repo", thinking: "high" },
    authority: { minIntervalMs: 600_000 } };
  // The schedule skill's version.mjs hashes this same text.
  const VECTOR = "69794bedd405d57972bf86cdcbdecced8f9b0064acaafc22f4ada926f8ed4996";
  expect(await scheduleVersion(plan)).toBe(VECTOR);
  const timed = { ...plan, run: { thinking: "high", cwd: "/home/jo/repo", mode: undefined }, timing: recurring({ every: "1h" }) };
  expect(await scheduleVersion(timed)).toBe(VECTOR);
  expect(await scheduleVersion({ ...plan, kind: undefined, authority: undefined })).toBe(await scheduleVersion({ ...plan, authority: {} }));
  for (const changed of [{ instructions: "Plan the month." }, { authority: { minIntervalMs: 60_000 } }, { run: { cwd: "/home/jo" } },
    { kind: "background" as const }, { until: "The plan is done." }]) expect(await scheduleVersion({ ...plan, ...changed })).not.toBe(VECTOR);
  expect(await scheduleVersion({ ...plan, until: "The plan is done." })).toBe("c9f38c023909c9f00590c8a0c3f41b5c3181a01ae252df3553720c231f05b0f1");
  const leave = { ...plan, authority: { actions: ["read", "draft"], recipients: [] } };
  expect(await scheduleVersion(leave)).toBe(await scheduleVersion({ ...plan, authority: { recipients: [], actions: ["read", "draft"] } }));
  expect(await scheduleVersion(leave)).not.toBe(await scheduleVersion({ ...plan, authority: { actions: ["draft", "read"], recipients: [] } }));
});
