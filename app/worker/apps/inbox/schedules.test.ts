import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../../access";
import { handleApp } from "../index";
import { body } from "../../../tests/body";
import { fakeEnv } from "../../../tests/env";
import { database } from "../../../tests/employee-access/connections";

const START = Date.UTC(2026, 9, 22, 9, 0);
const person = (email: string): AccessIdentity => ({ kind: "user", id: email, claims: { email, sub: `${email}-subject`,
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } });
const sam = person("sam@example.com");
const jo = person("jo@example.com");
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };
const DESK = "1".repeat(32);
const LAPTOP = "2".repeat(32);
const REVISION = "f".repeat(64);

let db: ReturnType<typeof database>;
let wakes: { line: string; computer: unknown }[];
// The person's line, recording each wake: which line it reached and which computer it named.
const LIVE_LINE = { idFromName: (name: string) => name, get: (line: string) => ({ fetch: async (_url: string, init: RequestInit) => {
  wakes.push({ line, computer: JSON.parse(init.body as string).computer });
  return new Response(null, { status: 204 });
} }) };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  db = database();
  wakes = [];
});
afterEach(() => vi.useRealTimers());

async function call(who: AccessIdentity, method: string, route: string, input?: Record<string, unknown>) {
  const query = method === "GET" && input ? `?${new URLSearchParams(input as Record<string, string>)}` : "";
  const sends = method !== "GET" && input !== undefined;
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}${query}`, {
    method, ...(sends && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }), fakeEnv({ DB: db.DB, LIVE_LINE }), who);
  return { status: response.status, json: await body(response) };
}

const hourly = { mode: "recurring", every: "1h", timezone: "UTC", allowedLatenessMs: 600_000 };
const digest = { key: "sales-digest", computer: DESK, name: "Sales digest", summary: "Sum up yesterday's orders.", timing: hourly, revision: REVISION };
const putSchedule = (who: AccessIdentity, extra: Record<string, unknown> = {}) => call(who, "PUT", "schedule", { ...digest, ...extra });
const claim = async (computer = DESK, who = sam) => (await call(who, "POST", "claim", { computer })).json.runs;
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);
const code = (answer: Awaited<ReturnType<typeof call>>) => answer.json.error?.code;

it("lists only the signed-in person's schedules, and never lets another read, change or run one", async () => {
  const put = await putSchedule(sam);
  expect(put).toEqual({ status: 200, json: { schedule: { key: "sales-digest", host: "app", name: "Sales digest", summary: "Sum up yesterday's orders.",
    timing: hourly, state: "on", nextRunAt: START + 3_600_000, computer: DESK, lastRun: null, waiting: null } } });
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: DESK }]);
  expect((await call(sam, "GET", "schedules")).json).toEqual({ schedules: [put.json.schedule], computerOnline: false });

  expect((await call(jo, "GET", "schedules")).json).toEqual({ schedules: [], computerOnline: false });
  expect((await call(jo, "GET", "schedule", { key: "sales-digest" })).status).toBe(404);
  for (const route of ["pause", "resume", "delete", "run-now"]) expect(code(await call(jo, "POST", route, { key: "sales-digest" }))).toBe("not_found");
  later(3_600_000);
  expect(await claim(DESK, jo)).toEqual([]);
  expect((await call(machine, "GET", "schedules")).status).toBe(403);
  // Jo's claim with the same computer id left Sam's run waiting for Sam.
  expect(await claim()).toHaveLength(1);
});

it("refuses a timing it cannot work out", async () => {
  for (const timing of [{ ...hourly, every: undefined }, { ...hourly, timezone: "Mars/Base" }, { ...hourly, every: undefined, cron: "daily" }]) {
    expect(code(await putSchedule(sam, { timing }))).toBe("bad_timing");
  }
  expect((await putSchedule(sam, { timing: { ...hourly, every: "1 hour" } })).status).toBe(400);
  expect((await call(sam, "GET", "schedules")).json.schedules).toEqual([]);
});

it("hands a run that came due to its own computer once, and takes its result once", async () => {
  await putSchedule(sam);
  later(3_600_000);
  expect(await claim(LAPTOP)).toEqual([]);
  const [run] = await claim();
  expect(run).toEqual({ id: expect.stringMatching(/^[0-9a-f]{32}$/), key: "sales-digest", revision: REVISION, dueAt: START + 3_600_000 });
  expect(await claim()).toEqual([]);
  expect((await call(sam, "GET", "schedules")).json).toMatchObject({ schedules: [{ nextRunAt: START + 7_200_000, waiting: { id: run.id, state: "taken" } }],
    computerOnline: true });

  wakes = [];
  const started = await call(sam, "POST", "run-result", { id: run.id, state: "started", chatTitle: "Sales digest for Thursday", agentId: "agent-1" });
  expect(started.json.run).toEqual({ id: run.id, key: "sales-digest", dueAt: START + 3_600_000, source: "clock", state: "started", result: null,
    chatTitle: "Sales digest for Thursday", agentId: "agent-1" });
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: null }]);
  expect((await call(sam, "POST", "run-result", { id: run.id, state: "failed", reason: "changed" })).json.run.state).toBe("started");
  expect(code(await call(sam, "POST", "run-result", { id: "9".repeat(32), state: "started" }))).toBe("not_found");
  const detail = await call(sam, "GET", "schedule", { key: "sales-digest" });
  expect(detail.json.schedule).toMatchObject({ lastRun: { id: run.id, state: "started" }, waiting: null });
  expect(detail.json.runs).toEqual([started.json.run]);
});

it("misses a run past its lateness, and a newer due time misses the one still waiting", async () => {
  await putSchedule(sam);
  later(3_600_000);
  // The laptop's claim starts the desk's run, which waits for the desk.
  expect(await claim(LAPTOP)).toEqual([]);
  later(600_001);
  expect(await claim()).toEqual([]);
  const detail = async () => (await call(sam, "GET", "schedule", { key: "sales-digest" })).json.runs;
  expect(await detail()).toMatchObject([{ state: "missed", result: "late" }]);

  await putSchedule(sam, { timing: { ...hourly, allowedLatenessMs: 7_200_000 } });
  later(3_600_000);
  await claim(LAPTOP);
  later(3_600_000);
  await claim(LAPTOP);
  expect(await detail()).toMatchObject([{ state: "due", source: "clock" }, { state: "missed", result: "superseded" }, { state: "missed", result: "late" }]);
});

it("fails a run whose result never came, and never hands it out again", async () => {
  await putSchedule(sam);
  later(3_600_000);
  const [run] = await claim();
  later(120_000);
  const answer = await call(sam, "POST", "run-result", { id: run.id, state: "started" });
  expect(answer.json.run).toMatchObject({ state: "failed", result: "no_result" });
  expect(await claim()).toEqual([]);
});

it("pauses a schedule: its waiting run is cancelled and nothing runs until it is resumed, from then on", async () => {
  await putSchedule(sam);
  later(3_600_000);
  await claim(LAPTOP);
  wakes = [];
  const paused = await call(sam, "POST", "pause", { key: "sales-digest" });
  expect(paused.json.schedule).toMatchObject({ state: "paused", nextRunAt: null, waiting: null, lastRun: { state: "cancelled" } });
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: DESK }]);
  later(7_200_000);
  expect(await claim()).toEqual([]);
  expect(code(await call(sam, "POST", "run-now", { key: "sales-digest" }))).toBe("paused");
  // Putting it again keeps it paused.
  expect((await putSchedule(sam, { name: "Daily digest" })).json.schedule).toMatchObject({ name: "Daily digest", state: "paused", nextRunAt: null });

  const resumed = await call(sam, "POST", "resume", { key: "sales-digest" });
  expect(resumed.json.schedule).toMatchObject({ state: "on", nextRunAt: START + 4 * 3_600_000 });
  expect(await claim()).toEqual([]);
});

it("runs a schedule now: the run waits for an offline computer until it is cancelled, one at a time, and not too often", async () => {
  await putSchedule(sam, { minIntervalMs: 600_000 });
  wakes = [];
  const asked = await call(sam, "POST", "run-now", { key: "sales-digest" });
  expect(asked.json.run).toMatchObject({ key: "sales-digest", dueAt: START, source: "now", state: "due" });
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: DESK }]);
  expect(code(await call(sam, "POST", "run-now", { key: "sales-digest" }))).toBe("already_waiting");
  later(30 * 60_000);
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).json.schedule.waiting).toMatchObject({ id: asked.json.run.id, state: "due" });

  wakes = [];
  expect((await call(sam, "POST", "run-cancel", { id: asked.json.run.id })).json.run.state).toBe("cancelled");
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: null }]);
  expect(code(await call(sam, "POST", "run-cancel", { id: asked.json.run.id }))).toBe("not_waiting");
  expect(code(await call(sam, "POST", "run-cancel", { id: "9".repeat(32) }))).toBe("not_found");
  expect(code(await call(jo, "POST", "run-cancel", { id: asked.json.run.id }))).toBe("not_found");

  const again = await call(sam, "POST", "run-now", { key: "sales-digest" });
  const [run] = await claim();
  expect(run.id).toBe(again.json.run.id);
  await call(sam, "POST", "run-result", { id: run.id, state: "started" });
  expect(code(await call(sam, "POST", "run-now", { key: "sales-digest" }))).toBe("too_soon");
  later(600_000);
  expect((await call(sam, "POST", "run-now", { key: "sales-digest" })).status).toBe(200);
});

it("runs a schedule with no least gap again as soon as its last run is done", async () => {
  await putSchedule(sam);
  const first = await call(sam, "POST", "run-now", { key: "sales-digest" });
  await claim();
  await call(sam, "POST", "run-result", { id: first.json.run.id, state: "blocked", reason: "changed" });
  expect((await call(sam, "POST", "run-now", { key: "sales-digest" })).json.run.state).toBe("due");
});

it("deletes a schedule with its runs", async () => {
  await putSchedule(sam);
  await call(sam, "POST", "run-now", { key: "sales-digest" });
  expect((await call(sam, "POST", "delete", { key: "sales-digest" })).json).toEqual({ deleted: true });
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).status).toBe(404);
  expect(db.sql.prepare("SELECT COUNT(*) AS runs FROM schedule_runs").get()).toEqual({ runs: 0 });
});

const copy = { key: "newsletter-draft", name: "Newsletter draft", summary: "Draft Friday's newsletter.",
  timing: { mode: "recurring", cron: "0 14 * * 5", timezone: "America/Toronto", allowedLatenessMs: 0 }, nextRunAt: START + 60_000, state: "on" };

it("keeps a computer's Paseo schedules as read-only copies that take no action and never run here", async () => {
  await putSchedule(sam);
  wakes = [];
  const mirrored = await call(sam, "PUT", "mirror", { computer: DESK, schedules: [copy, { ...copy, key: "stock-check", name: "Stock check", state: "paused", nextRunAt: null },
    { ...copy, key: "sales-digest", name: "Paseo's digest" }] });
  expect(mirrored.json).toEqual({ mirrored: 2 });
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: null }]);
  const listed = (await call(sam, "GET", "schedules")).json.schedules;
  expect(listed.map(schedule => [schedule.key, schedule.host, schedule.name])).toEqual([["newsletter-draft", "paseo", "Newsletter draft"],
    ["sales-digest", "app", "Sales digest"], ["stock-check", "paseo", "Stock check"]]);
  expect(listed[0]).toEqual({ ...copy, host: "paseo", computer: DESK, lastRun: null, waiting: null });

  for (const route of ["pause", "resume", "delete", "run-now"]) expect(code(await call(sam, "POST", route, { key: "newsletter-draft" }))).toBe("not_app");
  // A copy's time passed with the clock's: only the schedule on the app's clock starts.
  later(3_600_000);
  expect((await claim()).map(run => run.key)).toEqual(["sales-digest"]);

  // The laptop's copies leave the desk's alone; the desk's next list replaces its own.
  await call(sam, "PUT", "mirror", { computer: LAPTOP, schedules: [{ ...copy, key: "laptop-only" }] });
  expect((await call(sam, "PUT", "mirror", { computer: DESK, schedules: [copy] })).json).toEqual({ mirrored: 1 });
  expect((await call(sam, "GET", "schedules")).json.schedules.map(schedule => schedule.key)).toEqual(["laptop-only", "newsletter-draft", "sales-digest"]);
  expect((await call(jo, "GET", "schedules")).json.schedules).toEqual([]);

  // Putting a copy on the app's clock moves it here, switched on.
  const moved = await putSchedule(sam, { key: "newsletter-draft", name: "Newsletter draft" });
  expect(moved.json.schedule).toMatchObject({ host: "app", state: "on" });
  expect((await call(sam, "PUT", "mirror", { computer: DESK, schedules: [copy] })).json).toEqual({ mirrored: 0 });
  expect((await call(sam, "GET", "schedule", { key: "newsletter-draft" })).json.schedule.host).toBe("app");
});

it("runs a one-time schedule once", async () => {
  const once = { mode: "once", timezone: "UTC", dueAt: new Date(START + 60_000).toISOString(), allowedLatenessMs: 60_000 };
  expect((await putSchedule(sam, { timing: once })).json.schedule.nextRunAt).toBe(START + 60_000);
  later(60_000);
  expect(await claim()).toHaveLength(1);
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).json.schedule.nextRunAt).toBeNull();
  later(86_400_000);
  expect(await claim()).toEqual([]);
});
