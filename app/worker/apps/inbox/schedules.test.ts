import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../../access";
import { handleApp } from "../index";
import { body } from "../../../tests/body";
import { fakeEnv } from "../../../tests/env";
import { database } from "../../../tests/employee-access/connections";
import { scheduleVersion } from "./schedule-store";

const START = Date.UTC(2026, 9, 22, 9, 0);
const person = (email: string): AccessIdentity => ({ kind: "user", id: email, claims: { email, sub: `${email}-subject`,
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } });
const sam = person("sam@example.com");
const jo = person("jo@example.com");
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };
const DESK = "1".repeat(32);
const LAPTOP = "2".repeat(32);

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
    method, ...(sends && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }), fakeEnv({ DB: db.DB, LIVE_LINE, WONG_OWNER_EMAIL: "Sam@example.com" }), who);
  return { status: response.status, json: await body(response) };
}

const hourly = { mode: "recurring", every: "1h", timezone: "UTC", allowedLatenessMs: 600_000 };
const digest = { key: "sales-digest", computer: DESK, name: "Sales digest", summary: "Sum up yesterday's orders.", timing: hourly,
  instructions: "Sum up yesterday's orders and send me the total.", run: { cwd: "/home/sam/shop" } };
const VERSION = await scheduleVersion(digest);
/** The fields a schedule with no definition shows: a Paseo copy, or a row from before definitions lived here. */
const bare = { kind: "chat", instructions: "", run: {}, authority: {}, until: null, ended: null, version: "", approvedVersion: null, approvedAt: null,
  computerName: null, madeBy: null };
const putSchedule = (who: AccessIdentity, extra: Record<string, unknown> = {}) => call(who, "PUT", "schedule", { ...digest, ...extra });
const claim = async (computer = DESK, who = sam) => (await call(who, "POST", "claim", { computer })).json.runs;
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);
const code = (answer: Awaited<ReturnType<typeof call>>) => answer.json.error?.code;

it("lists only the signed-in person's schedules, and never lets another read, change or run one", async () => {
  const put = await putSchedule(sam);
  expect(put).toEqual({ status: 200, json: { schedule: { key: "sales-digest", host: "app", name: "Sales digest", summary: "Sum up yesterday's orders.",
    timing: hourly, state: "on", nextRunAt: START + 3_600_000, computer: DESK, lastRun: null, waiting: null, ...bare,
    instructions: digest.instructions, run: digest.run, version: VERSION } } });
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
  expect(run).toEqual({ id: expect.stringMatching(/^[0-9a-f]{32}$/), key: "sales-digest", revision: VERSION, dueAt: START + 3_600_000 });
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

it("keeps a started run's handoff chat: the worker reports the run started, then the chat it opened", async () => {
  await putSchedule(sam);
  later(3_600_000);
  const [run] = await claim();
  await call(sam, "POST", "run-result", { id: run.id, state: "started", chatTitle: "Sales digest" });
  const handed = await call(sam, "POST", "run-result", { id: run.id, state: "started", chatTitle: "Sales digest", agentId: "agent-2" });
  expect(handed.json.run).toMatchObject({ state: "started", chatTitle: "Sales digest", agentId: "agent-2" });
  // A second handoff report changes nothing: the run has its chat.
  await call(sam, "POST", "run-result", { id: run.id, state: "started", chatTitle: "Other", agentId: "agent-3" });
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).json.runs).toMatchObject([{ chatTitle: "Sales digest", agentId: "agent-2" }]);
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
  await putSchedule(sam, { authority: { minIntervalMs: 600_000 } });
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
  expect(listed[0]).toEqual({ ...copy, host: "paseo", computer: DESK, lastRun: null, waiting: null, ...bare });

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

it("runs a one-time schedule once, and ends it when that run starts; a goal waits for its proof", async () => {
  const once = { mode: "once", timezone: "UTC", dueAt: new Date(START + 60_000).toISOString(), allowedLatenessMs: 60_000 };
  expect((await putSchedule(sam, { timing: once })).json.schedule.nextRunAt).toBe(START + 60_000);
  await putSchedule(sam, { key: "launch-goal", timing: once, until: "Every launch item is done." });
  later(60_000);
  const runs = await claim();
  expect(runs).toHaveLength(2);
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).json.schedule).toMatchObject({ nextRunAt: null, ended: null });
  for (const each of runs) await call(sam, "POST", "run-result", { id: each.id, state: "started" });
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).json.schedule).toMatchObject({ state: "paused", nextRunAt: null,
    ended: { at: Date.now(), reason: "Its one run started." } });
  expect((await call(sam, "GET", "schedule", { key: "launch-goal" })).json.schedule).toMatchObject({ state: "on", ended: null });
  later(86_400_000);
  expect(await claim()).toEqual([]);
});

it("keeps two people's schedules with one key apart: each changes and runs only their own", async () => {
  await putSchedule(sam);
  await putSchedule(jo, { name: "Jo's digest" });
  await call(jo, "POST", "pause", { key: "sales-digest" });
  expect((await call(sam, "GET", "schedule", { key: "sales-digest" })).json.schedule).toMatchObject({ name: "Sales digest", state: "on" });
  later(3_600_000);
  expect(await claim(DESK, jo)).toEqual([]);
  expect(await claim()).toHaveLength(1);
});

const team = { people: ["jo@example.com", "Sam@example.com", "fay@example.com", "JO@example.com"], ...digest, computer: undefined };
const fay = person("fay@example.com");

it("gives each teammate their own copy of the owner's schedule, which runs only once they approve it on a computer", async () => {
  expect(code(await call(jo, "PUT", "team-schedule", team))).toBe("forbidden");
  expect(code(await call(sam, "PUT", "team-schedule", { ...team, timing: { ...hourly, timezone: "Mars/Base" } }))).toBe("bad_timing");
  // Fay's own schedule with this key stays hers.
  await putSchedule(fay, { name: "Fay's digest" });
  wakes = [];
  expect((await call(sam, "PUT", "team-schedule", team)).json).toEqual({ copied: 1, skipped: 1 });
  expect(wakes).toEqual([]);
  expect((await call(sam, "GET", "schedules")).json.schedules).toEqual([]);
  expect((await call(fay, "GET", "schedule", { key: "sales-digest" })).json.schedule).toMatchObject({ name: "Fay's digest", madeBy: null });
  const copy = (await call(jo, "GET", "schedule", { key: "sales-digest" })).json.schedule;
  expect(copy).toMatchObject({ computer: "", nextRunAt: null, state: "on", version: VERSION, madeBy: "sam@example.com", approvedVersion: null });
  later(3_600_000);
  expect(await claim(DESK, jo)).toEqual([]);
  expect(code(await call(jo, "POST", "run-now", { key: "sales-digest" }))).toBeUndefined();
  expect(wakes.at(-1)).toEqual({ line: ":jo@example.com", computer: null });
  expect(await claim(DESK, jo)).toEqual([]);

  const approve = (version = VERSION, computer = DESK, key = "sales-digest") =>
    call(jo, "POST", "schedule-approved", { key, computer, version, computerName: "Jo's desk" });
  expect(code(await approve("0".repeat(64)))).toBe("changed");
  expect(code(await approve(VERSION, DESK, "stock-check"))).toBe("not_found");
  const approved = await approve();
  expect(approved.json.schedule).toMatchObject({ computer: DESK, nextRunAt: Date.now() + 3_600_000, approvedVersion: VERSION, approvedAt: Date.now(), computerName: "Jo's desk" });
  expect(wakes.at(-1)).toEqual({ line: ":jo@example.com", computer: DESK });
  expect(code(await approve(VERSION, LAPTOP))).toBe("other_computer");
  expect((await approve()).json.schedule.nextRunAt).toBe(approved.json.schedule.nextRunAt);
  expect(await claim(DESK, jo)).toHaveLength(1);

  // A new copy keeps Jo's computer and the owner's name on it, and needs a new OK.
  await call(sam, "PUT", "team-schedule", { ...team, instructions: "Sum up last week's orders." });
  expect((await call(jo, "GET", "schedule", { key: "sales-digest" })).json.schedule).toMatchObject({ computer: DESK,
    instructions: "Sum up last week's orders.", approvedVersion: VERSION, madeBy: "sam@example.com", version: expect.not.stringMatching(VERSION) });
});

it("starts no clock when a paused or ended copy is approved", async () => {
  await call(sam, "PUT", "team-schedule", { ...team, people: ["jo@example.com", "fay@example.com"] });
  await call(jo, "POST", "pause", { key: "sales-digest" });
  await call(fay, "POST", "schedule-end", { key: "sales-digest", reason: "Not needed." });
  for (const who of [jo, fay]) {
    const approved = await call(who, "POST", "schedule-approved", { key: "sales-digest", computer: DESK, version: VERSION, computerName: "Desk" });
    expect(approved.json.schedule).toMatchObject({ computer: DESK, nextRunAt: null });
  }
});

it("deletes a team copy no computer runs yet, waking only the person's inbox", async () => {
  await call(sam, "PUT", "team-schedule", { ...team, people: ["jo@example.com"] });
  wakes = [];
  expect((await call(jo, "POST", "delete", { key: "sales-digest" })).json).toEqual({ deleted: true });
  expect(wakes).toEqual([{ line: ":jo@example.com", computer: null }]);
});

it("ends a schedule for good: it stays listed, its waiting run is cancelled, and it never runs again", async () => {
  await putSchedule(sam);
  await call(sam, "POST", "run-now", { key: "sales-digest" });
  wakes = [];
  const ended = await call(sam, "POST", "schedule-end", { key: "sales-digest", reason: "The goal is met: orders are summed." });
  expect(ended.json.schedule).toMatchObject({ state: "paused", nextRunAt: null, waiting: null, lastRun: { state: "cancelled" },
    ended: { at: START, reason: "The goal is met: orders are summed." } });
  expect(wakes).toEqual([{ line: ":sam@example.com", computer: DESK }]);
  later(60_000);
  expect((await call(sam, "POST", "schedule-end", { key: "sales-digest", reason: "Again." })).json.schedule.ended)
    .toEqual({ at: START, reason: "The goal is met: orders are summed." });
  for (const route of ["resume", "run-now"]) expect(code(await call(sam, "POST", route, { key: "sales-digest" }))).toBe("ended");
  expect((await call(sam, "POST", "pause", { key: "sales-digest" })).json.schedule.ended.at).toBe(START);
  expect((await putSchedule(sam, { name: "Daily digest" })).json.schedule).toMatchObject({ name: "Daily digest", nextRunAt: null, ended: { at: START } });
  later(7_200_000);
  expect(await claim()).toEqual([]);
  expect(code(await call(sam, "POST", "schedule-end", { key: "stock-check", reason: "Done." }))).toBe("not_found");
});

it("lets one run at a time hold a schedule's progress, and a later run take it from one that died", async () => {
  await putSchedule(sam, { run: { cwd: "/home/sam/shop", minutes: 20 } });
  const progress = (who = sam, key = "sales-digest") => call(who, "GET", "schedule-progress", { key });
  const hold = (run: string, release?: boolean) => call(sam, "POST", "schedule-progress-claim", { key: "sales-digest", run, release });
  const write = (run: string, value: unknown, key = "sales-digest") => call(sam, "PUT", "schedule-progress", { key, run, progress: value });
  expect((await progress()).json).toEqual({ progress: null, claim: null });
  expect(code(await progress(jo))).toBe("not_found");

  const first = String((await call(sam, "POST", "run-now", { key: "sales-digest" })).json.run.id);
  expect(code(await hold(first))).toBe("not_found");
  await claim();
  expect((await hold(first)).json).toEqual({ claimed: true });
  expect((await hold(first)).json).toEqual({ claimed: true });
  expect((await write(first, { done: ["monday"] })).json).toEqual({ progress: { done: ["monday"] }, claim: { run: first, at: START } });
  expect(code(await write(first, "x".repeat(65_536)))).toBe("too_large");
  expect(code(await write(first, null, "stock-check"))).toBe("not_found");
  await call(sam, "POST", "run-result", { id: first, state: "started" });

  later(60_000);
  const second = String((await call(sam, "POST", "run-now", { key: "sales-digest" })).json.run.id);
  await claim();
  await call(sam, "POST", "run-result", { id: second, state: "started" });
  expect((await hold(second)).json).toEqual({ claimed: false });
  expect(code(await write(second, {}))).toBe("not_claimed");
  // The first run's claim is older than its 20 minutes and 10 more: it died.
  later(30 * 60_000);
  expect((await hold(second)).json).toEqual({ claimed: true });
  later(31 * 60_000);
  // An earlier run never takes a later run's claim, and only the holder gives it back.
  expect((await hold(first)).json).toEqual({ claimed: false });
  expect((await hold(first, true)).json).toEqual({ claimed: false });
  expect((await progress()).json).toEqual({ progress: { done: ["monday"] }, claim: { run: second, at: START + 31 * 60_000 } });
  expect((await hold(second, true)).json).toEqual({ claimed: false });
  expect((await progress()).json.claim).toBeNull();
});

it("takes the move's first copy of progress with no run only while none is written and no run holds it", async () => {
  await putSchedule(sam);
  const copy = (progress: unknown, who = sam) => call(who, "PUT", "schedule-progress", { key: "sales-digest", progress });
  expect(code(await copy({ done: [] }, jo))).toBe("not_found");
  expect((await copy({ done: ["monday"] })).json).toEqual({ progress: { done: ["monday"] }, claim: null });
  expect(code(await copy({ done: [] }))).toBe("not_claimed");
  expect((await call(sam, "GET", "schedule-progress", { key: "sales-digest" })).json.progress).toEqual({ done: ["monday"] });
});

it("takes a stale claim after an hour and ten minutes when the run sets no time limit", async () => {
  // Once a day, so no clock run comes due meanwhile.
  await putSchedule(sam, { timing: { ...hourly, every: "1d" } });
  const hold = (run: string) => call(sam, "POST", "schedule-progress-claim", { key: "sales-digest", run });
  const start = async () => {
    const id = String((await call(sam, "POST", "run-now", { key: "sales-digest" })).json.run.id);
    await claim();
    await call(sam, "POST", "run-result", { id, state: "started" });
    return id;
  };
  expect((await hold(await start())).json.claimed).toBe(true);
  later(69 * 60_000);
  const second = await start();
  expect((await hold(second)).json.claimed).toBe(false);
  later(60_000);
  expect((await hold(second)).json.claimed).toBe(true);
});

it("takes a computer's word that a run could not start", async () => {
  await putSchedule(sam);
  for (const reason of ["not_approved", "changed", "ended", "no_folder", "no_work", "checkins_off"]) {
    const id = (await call(sam, "POST", "run-now", { key: "sales-digest" })).json.run.id;
    await claim();
    expect((await call(sam, "POST", "run-result", { id, state: "blocked", reason })).json.run).toMatchObject({ state: "blocked", result: reason });
  }
});

it("leaves runs that found nothing to do out of the runs and the last run, and counts those since the oldest shown", async () => {
  await putSchedule(sam);
  const report = async (state: string, reason?: string) => {
    later(1000);
    const id = (await call(sam, "POST", "run-now", { key: "sales-digest" })).json.run.id;
    await claim();
    return (await call(sam, "POST", "run-result", { id, state, ...(reason && { reason }) })).json.run;
  };
  const detail = async () => (await call(sam, "GET", "schedule", { key: "sales-digest" })).json;
  await report("blocked", "no_work");
  const started = await report("started");
  await report("blocked", "no_work");
  expect(await detail()).toMatchObject({ runs: [started], quiet: 2, schedule: { lastRun: { id: started.id } } });

  for (let count = 0; count < 9; count += 1) await report("started");
  expect(await detail()).toMatchObject({ quiet: 1 });
});
