import { expect, it } from "vitest";
import { addKeyedTask } from "./tasks.ts";
import { board, NEXT, WEEK } from "../../../../tests/board.ts";

it("adds a task one time by its key, to the backlog or a day", async () => {
  const { call } = board();
  const first = (await call("POST", "daily-task-add", { importKey: "chat:quiet-horse", title: " Fix the page ", estimateHours: 1 })).json;
  expect(first).toMatchObject({ title: "Fix the page", week: null, slot: "backlog", status: "open", estimateHours: 1, created: true });
  const again = (await call("POST", "daily-task-add", { importKey: "chat:quiet-horse", title: "Other title", week: WEEK, slot: "mon" })).json;
  expect(again).toEqual({ ...first, created: false });
  expect((await call("POST", "daily-task-add", { importKey: "daily:2026-10-05-a", title: "Call Kim", week: WEEK, slot: "tue" })).json)
    .toMatchObject({ week: WEEK, slot: "tue", estimateHours: null, created: true });
  for (const bad of [{ importKey: "claymoo:abc", title: "x" }, { importKey: "daily:a", title: "x", slot: "mon" },
    { importKey: "daily:a", title: "x", week: WEEK }]) {
    expect((await call("POST", "daily-task-add", bad)).json).toMatchObject({ error: { code: "invalid_input" } });
  }
});

it("gives the race's loser the winner's task, and passes on any other failure", async () => {
  const { db } = board();
  const key = { importKey: "chat:raced", title: "Raced" };
  const winner = (await addKeyedTask(db.session as unknown as D1DatabaseSession, key)).task;
  let looks = 0;
  // The first look for the key misses, as it does when the winner writes in between.
  const late = { ...db.session, prepare: (query: string) => {
    const statement = db.session.prepare(query);
    return query.startsWith("SELECT id FROM tasks WHERE import_key") && looks++ === 0
      ? { bind: () => ({ first: async () => null }) } : statement;
  } } as unknown as D1DatabaseSession;
  expect(await addKeyedTask(late, key)).toEqual({ task: winner, created: false });
  db.sql.exec("CREATE TRIGGER refuse BEFORE INSERT ON tasks BEGIN SELECT RAISE(ABORT, 'refused'); END");
  looks = 0;
  await expect(addKeyedTask(late, { importKey: "chat:other", title: "Other" })).rejects.toThrow("refused");
});

it("places a task, with its estimate, and keeps it when left out", async () => {
  const { call } = board();
  const { id } = (await call("POST", "daily-task-add", { importKey: "daily:a", title: "Plan", estimateHours: 2 })).json;
  expect((await call("POST", "daily-task-place", { id, week: NEXT, slot: "fri", index: 0 })).json)
    .toEqual({ id, week: NEXT, slot: "fri", status: "open", backlogGroupId: "backlog_other" });
  await call("POST", "daily-task-place", { id, week: NEXT, slot: "backlog", index: 0, estimateHours: 3 });
  expect((await call("GET", "daily-tasks", { week: NEXT })).json.tasks[0]).toMatchObject({ slot: "backlog", estimateHours: 3,
    backlogGroupId: "backlog_other" });
  expect((await call("POST", "daily-task-place", { id: "nope", week: NEXT, slot: "fri", index: 0 })).status).toBe(404);
});

it("starts and finishes a task, never back to open", async () => {
  const { call } = board();
  const { id } = (await call("POST", "daily-task-add", { importKey: "daily:a", title: "Plan", week: WEEK, slot: "mon" })).json;
  expect((await call("POST", "daily-task-status", { id, status: "in_progress" })).json).toEqual({ id, week: WEEK, slot: "mon", status: "in_progress" });
  expect((await call("POST", "daily-task-status", { id, status: "done" })).json.status).toBe("done");
  expect((await call("POST", "daily-task-status", { id, status: "open" })).status).toBe(400);
});

it("removes a chat's to-do by its key alone", async () => {
  const { call } = board();
  await call("POST", "daily-task-add", { importKey: "chat:gone", title: "Gone" });
  expect((await call("POST", "daily-task-remove", { importKey: "chat:gone" })).json).toEqual({ importKey: "chat:gone", removed: true });
  expect((await call("POST", "daily-task-remove", { importKey: "chat:gone" })).json).toEqual({ importKey: "chat:gone", removed: false });
  expect((await call("POST", "daily-task-remove", { importKey: "daily:a" })).status).toBe(400);
});

it("sets and clears a task's plan link and chat, one field at a time", async () => {
  const { call } = board();
  const { id } = (await call("POST", "daily-task-add", { importKey: "chat:a", title: "Work" })).json;
  const link = "https://example.com/apps/inbox/?item=a";
  expect((await call("POST", "daily-task-link", { id, link, chat: "quiet-horse" })).json).toEqual({ id, link, chat: "quiet-horse" });
  expect((await call("POST", "daily-task-link", { id, chat: null })).json).toEqual({ id, link, chat: null });
  expect((await call("GET", "daily-tasks", { week: WEEK })).json.tasks[0]).toMatchObject({ chat: null, importKey: "chat:a" });
  expect((await call("POST", "daily-task-link", { id })).status).toBe(400);
  expect((await call("POST", "daily-task-link", { id, link: "http://example.com" })).status).toBe(400);
  expect((await call("POST", "daily-task-link", { id: "nope", chat: "x" })).status).toBe(404);
});

it("reads a week whole, and says when it leaves rows out", async () => {
  const { db, call } = board();
  const read = async () => (await call("GET", "daily-tasks", { week: WEEK })).json;
  expect(await read()).toEqual({ week: WEEK, goal: "", truncated: false, backlogGroups: [{ id: "backlog_other", name: "Other" }], tasks: [] });
  const insert = db.sql.prepare("INSERT INTO tasks (id, title, week, slot, position) VALUES (?, ?, ?, 'mon', ?)");
  insert.run("long", "x".repeat(501), WEEK, 1);
  expect(await read()).toMatchObject({ truncated: true, tasks: [{ title: "x".repeat(500) }] });
  db.sql.exec("DELETE FROM tasks");
  db.sql.prepare("INSERT INTO week_goals (week, goal) VALUES (?, ?)").run(WEEK, "g".repeat(2001));
  expect(await read()).toMatchObject({ truncated: true, goal: "g".repeat(2000) });
  db.sql.exec("DELETE FROM week_goals");
  for (let at = 0; at < 101; at++) db.sql.prepare("INSERT INTO backlog_groups (id, name, position) VALUES (?, ?, ?)").run(`g${at}`, `G ${at}`, 2000 + at);
  expect(await read()).toMatchObject({ truncated: true });
  db.sql.exec("DELETE FROM backlog_groups WHERE is_default = 0");
  for (let at = 0; at < 301; at++) insert.run(`t${at}`, "t", WEEK, at);
  const many = await read();
  expect([many.truncated, many.tasks.length]).toEqual([true, 300]);
});
