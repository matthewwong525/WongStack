import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

// The file that adds the inbox's schedules and their runs, run on a database the files before it built.
const SCHEDULES = "20261026120000_schedules.sql";
const folder = new URL("../../../../schema/migrations/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, folder), "utf8");

it("adds schedules and runs keyed on each person, taking only the hosts, states and sources it knows", () => {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync(folder).filter(file => file.endsWith(".sql") && file <= SCHEDULES).sort()) sql.exec(read(file));
  const schedule = sql.prepare(`INSERT INTO schedules (installation_id, email, key, host, computer_id, name, summary, timing_json, revision,
    state, next_run_at, min_interval_ms, updated_at) VALUES ('', ?, 'digest', ?, '', 'Digest', '', '{}', '', ?, NULL, NULL, 1)`);
  schedule.run("sam@example.com", "app", "on");
  schedule.run("jo@example.com", "paseo", "paused");
  expect(() => schedule.run("sam@example.com", "app", "on")).toThrow(/UNIQUE/);
  expect(() => schedule.run("kim@example.com", "cron", "on")).toThrow(/CHECK/);
  expect(() => schedule.run("kim@example.com", "app", "off")).toThrow(/CHECK/);

  const run = sql.prepare(`INSERT INTO schedule_runs (installation_id, email, id, key, due_at, source, state, updated_at)
    VALUES ('', 'sam@example.com', ?, 'digest', 1, ?, ?, 1)`);
  for (const state of ["due", "taken", "started", "failed", "blocked", "missed", "cancelled"]) run.run(`run-${state}`, "clock", state);
  run.run("asked", "now", "due");
  expect(() => run.run("asked", "now", "due")).toThrow(/UNIQUE/);
  expect(() => run.run("other", "later", "due")).toThrow(/CHECK/);
  expect(() => run.run("other", "clock", "running")).toThrow(/CHECK/);
  expect(sql.prepare("SELECT COUNT(*) AS runs FROM schedule_runs").get()).toEqual({ runs: 8 });
});
