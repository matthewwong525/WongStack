import { expect, it } from "vitest";
import { taskBand, taskStatuses } from "../../../../src/lib/board.ts";
import { bandOrder } from "./positions.ts";
import { board, checker, NEXT, OWNER, person, WEEK } from "../../../../tests/board.ts";

it("lets the owner alone at the board, and the checker on staging", async () => {
  const { call } = board();
  expect((await call("GET", "week", { week: WEEK }, person("sam@example.com"))).json).toMatchObject({ error: { code: "forbidden" } });
  expect((await call("GET", "week", { week: WEEK }, null)).status).toBe(403);
  expect((await call("GET", "week", { week: WEEK }, checker)).status).toBe(403);
  const staging = board({ WONG_OWNER_EMAIL: OWNER, WONG_ENVIRONMENT: "staging" });
  expect((await staging.call("GET", "week", { week: WEEK }, checker)).status).toBe(200);
  // With no owner set, nobody's board is there.
  expect((await board({}).call("GET", "week", { week: WEEK })).status).toBe(403);
});

it("reads an empty week with every slot, Other, and no goal", async () => {
  const { call } = board();
  const { json } = await call("GET", "week", { week: WEEK });
  expect(json.plan).toMatchObject({ week: WEEK, goal: "", backlogGroups: [{ id: "backlog_other", name: "Other", isDefault: true }] });
  expect(Object.keys(json.plan.slots)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun", "backlog"]);
  expect((await call("GET", "week", { week: "2026-10-06" })).json).toMatchObject({ error: { code: "invalid_input" } });
});

it("sets and clears the week's goal", async () => {
  const { call } = board();
  expect((await call("PUT", "week-goal", { week: WEEK, goal: "  Ship the board " })).json).toEqual({ week: WEEK, goal: "Ship the board" });
  await call("PUT", "week-goal", { week: WEEK, goal: "Ship it" });
  expect((await call("GET", "week", { week: WEEK })).json.plan.goal).toBe("Ship it");
  await call("PUT", "week-goal", { week: WEEK, goal: " " });
  expect((await call("GET", "week", { week: WEEK })).json.plan.goal).toBe("");
});

it("adds tasks to a day or a backlog group, with an estimate from the title", async () => {
  const { call, add } = board();
  expect(await add("Write the plan (2)")).toMatchObject({ title: "Write the plan", estimateHours: 2, week: WEEK, slot: "mon", backlogGroupId: null });
  expect(await add("Someday", "backlog")).toMatchObject({ week: null, slot: "backlog", backlogGroupId: "backlog_other" });
  const group = (await call("POST", "group", { name: "Home" })).json.group;
  expect(await add("Fix the tap", "backlog", { backlogGroupId: group.id })).toMatchObject({ backlogGroupId: group.id });
  expect((await call("POST", "task", { title: "x", week: WEEK, slot: "backlog", backlogGroupId: "nope" })).json)
    .toMatchObject({ error: { code: "validation_failed" } });
  expect((await call("POST", "task", { title: " ", week: WEEK, slot: "mon" })).status).toBe(400);
  expect((await call("POST", "task", { title: "x", week: WEEK, slot: "mon", backlogGroupId: group.id })).json)
    .toMatchObject({ error: { code: "invalid_input" } });
});

it("keeps started work above open work and done work below it", async () => {
  const { call, add, titles } = board();
  const [a, b, c] = [await add("a"), await add("b"), await add("c")];
  await call("PATCH", "task", { id: c.id, status: "in_progress" });
  await call("PATCH", "task", { id: a.id, status: "done" });
  expect(await titles("mon")).toEqual(["c", "b", "a"]);
  // Stopping goes back to the top of the open work.
  await call("PATCH", "task", { id: c.id, status: "open" });
  expect(await titles("mon")).toEqual(["c", "b", "a"]);
  // A drop past the band's end stays in the band.
  await call("PATCH", "task", { id: b.id, index: 0 });
  await call("PATCH", "task", { id: c.id, index: 9 });
  expect(await titles("mon")).toEqual(["b", "c", "a"]);
  expect((await call("PATCH", "task", { id: b.id, title: "B (3)" })).json.task).toMatchObject({ title: "B", estimateHours: 3 });
  expect((await call("PATCH", "task", { id: b.id, title: "(3)" })).status).toBe(400);
});

it("moves tasks between days, weeks and the backlog", async () => {
  const { call, add, titles } = board();
  const group = (await call("POST", "group", { name: "Work" })).json.group;
  const day = await add("day");
  const later = await add("later", "backlog", { backlogGroupId: group.id });
  expect((await call("PATCH", "task", { id: day.id, slot: "tue", week: NEXT, index: 0 })).json.task).toMatchObject({ week: NEXT, slot: "tue" });
  expect(await titles("tue", NEXT)).toEqual(["day"]);
  // To the backlog: no week, and Other when the task had no category.
  expect((await call("PATCH", "task", { id: day.id, slot: "backlog" })).json.task).toMatchObject({ week: null, backlogGroupId: "backlog_other" });
  // A backlog task keeps its group on its way to a day, as its category; changing a day task's category moves nothing.
  expect((await call("PATCH", "task", { id: later.id, slot: "wed", week: WEEK })).json.task).toMatchObject({ backlogGroupId: group.id });
  const position = (await call("PATCH", "task", { id: later.id, backlogGroupId: "backlog_other" })).json.task.position;
  expect(position).toBe(1000);
  expect((await call("PATCH", "task", { id: later.id, slot: "backlog" })).json.task).toMatchObject({ backlogGroupId: "backlog_other" });
  expect((await call("PATCH", "task", { id: later.id, backlogGroupId: group.id })).json.task).toMatchObject({ slot: "backlog", backlogGroupId: group.id });
  expect((await call("PATCH", "task", { id: later.id, status: "done" })).json.task).toMatchObject({ slot: "backlog", status: "done" });
  expect((await call("PATCH", "task", { id: later.id, slot: "mon" })).json).toMatchObject({ error: { code: "invalid_input" } });
  expect((await call("PATCH", "task", { id: later.id })).json).toMatchObject({ error: { code: "invalid_input" } });
  expect((await call("PATCH", "task", { id: "nope", status: "done" })).json).toMatchObject({ error: { code: "not_found" } });
});

it("spaces a day evenly when a drop finds no room between two tasks", async () => {
  const { db, call, add, titles } = board();
  const [a, b, c] = [await add("a"), await add("b"), await add("c")];
  db.sql.prepare("UPDATE tasks SET position = 5 WHERE id IN (?, ?)").run(String(a.id), String(b.id));
  await call("PATCH", "task", { id: c.id, index: 1 });
  const rows = db.sql.prepare("SELECT title, position FROM tasks ORDER BY position").all();
  expect(new Set(rows.map(row => row.position)).size).toBe(3);
  expect((await titles("mon"))[1]).toBe("c");
});

it("deletes a task softly, once", async () => {
  const { call, add, titles } = board();
  const task = await add("gone");
  expect((await call("DELETE", "task", { id: task.id })).json).toEqual({ id: task.id });
  expect(await titles("mon")).toEqual([]);
  expect((await call("DELETE", "task", { id: task.id })).status).toBe(404);
});

it("searches every week by each word, the backlog first", async () => {
  const { call, add } = board();
  await add("Pay the 100% bill");
  await add("Pay the gas bill", "backlog");
  await add("Pay xx");
  const { json } = await call("GET", "task-search", { q: "pay bill" });
  expect(json.tasks.map(task => task.title)).toEqual(["Pay the gas bill", "Pay the 100% bill"]);
  expect(json.tasks[0]).toMatchObject({ backlogGroupName: "Other" });
  expect((await call("GET", "task-search", { q: "0%" })).json.tasks).toHaveLength(1);
  expect((await call("GET", "task-search", { q: "  " })).json).toMatchObject({ error: { code: "validation_failed" } });
});

it("adds, renames, orders and deletes backlog groups, and never loses Other", async () => {
  const { call, add } = board();
  const home = (await call("POST", "group", { name: " Home " })).json.group;
  expect(home).toMatchObject({ name: "Home", position: 2000, isDefault: false });
  expect((await call("POST", "group", { name: "home" })).json).toMatchObject({ error: { code: "validation_failed" } });
  expect((await call("PATCH", "group", { id: home.id, name: "House" })).json.group).toMatchObject({ name: "House" });
  expect((await call("PATCH", "group", { id: "backlog_other", name: "Misc" })).status).toBe(400);
  expect((await call("PATCH", "group", { id: "nope", name: "Misc" })).status).toBe(404);
  expect((await call("POST", "group-move", { id: home.id, index: 0 })).json.groups.map(group => group.name))
    .toEqual(["House", "Other"]);
  await add("other open", "backlog");
  await add("started", "backlog", { backlogGroupId: home.id }).then(task => call("PATCH", "task", { id: task.id, status: "in_progress" }));
  await add("open", "backlog", { backlogGroupId: home.id });
  await add("gone", "backlog", { backlogGroupId: home.id }).then(task => call("DELETE", "task", { id: task.id }));
  const category = await add("day work");
  await call("PATCH", "task", { id: category.id, backlogGroupId: home.id });
  const { json } = await call("DELETE", "group", { id: home.id, week: WEEK });
  expect(json.plan.backlogGroups).toHaveLength(1);
  expect(json.plan.slots.backlog.map(task => task.title)).toEqual(["started", "other open", "open"]);
  expect(json.plan.slots.mon[0]).toMatchObject({ backlogGroupId: "backlog_other" });
  expect((await call("DELETE", "group", { id: "backlog_other", week: WEEK })).status).toBe(400);
});

it("sweeps a week's unfinished day work to the backlog or to next week, in order", async () => {
  const { call, add, titles } = board();
  const group = (await call("POST", "group", { name: "Work" })).json.group;
  await add("mon 1");
  await add("mon 2");
  await add("tue", "tue").then(task => call("PATCH", "task", { id: task.id, backlogGroupId: group.id }));
  await add("done").then(task => call("PATCH", "task", { id: task.id, status: "done" }));
  const swept = (await call("POST", "sweep", { week: WEEK, to: "backlog" })).json.plan;
  expect(swept.slots.mon.map(task => task.title)).toEqual(["done"]);
  const titlesIn = (id: unknown) => swept.slots.backlog.filter(task => task.backlogGroupId === id).map(task => task.title);
  expect([titlesIn("backlog_other"), titlesIn(group.id)]).toEqual([["mon 1", "mon 2"], ["tue"]]);
  await add("again 1", "wed");
  await add("again 2", "wed");
  await call("POST", "sweep", { week: WEEK, to: "next_week" });
  expect(await titles("wed", NEXT)).toEqual(["again 1", "again 2"]);
  expect((await call("POST", "sweep", { week: WEEK, to: "next_week" })).status).toBe(200);
});

it("orders the bands in SQL as the screen does", async () => {
  const { db } = board();
  for (const status of taskStatuses) {
    expect(db.sql.prepare(`SELECT ${bandOrder("?")} AS band`).get(status)).toEqual({ band: taskBand(status) });
  }
});

it("answers a broken board as an internal error", async () => {
  const { db, call } = board();
  db.sql.exec("DROP TABLE week_goals");
  expect((await call("GET", "week", { week: WEEK })).status).toBe(500);
});

it("is a migration that changes nothing on a board that is already there", async () => {
  const { db } = board();
  const migration = await import("node:fs").then(fs => fs.readFileSync(new URL("../../../../../schema/migrations/20261028120000_task_board.sql",
    import.meta.url), "utf8"));
  db.sql.exec("ALTER TABLE tasks ADD COLUMN note_id TEXT");
  db.sql.exec("UPDATE backlog_groups SET id = 'theirs' WHERE is_default = 1");
  db.sql.exec(migration);
  expect(db.sql.prepare("SELECT id FROM backlog_groups").all()).toEqual([{ id: "theirs" }]);
  expect(db.sql.prepare("SELECT name FROM pragma_table_info('tasks') WHERE name = 'note_id'").all()).toHaveLength(1);
});
