// The week screen's routes: read a week, its goal and its sweep, search, and change tasks and backlog groups.
import { z } from "zod";
import { sweepDestinations, taskStatuses } from "../../../../src/lib/board.ts";
import { boardAction, group, mondayWeek, plan, slot, task } from "./board.ts";
import { createGroup, deleteGroup, moveGroup, renameGroup } from "./groups.ts";
import { sweep } from "./sweep.ts";
import { createTask, deleteTask, loadWeek, searchTasks, setWeekGoal, updateTask } from "./tasks.ts";

const id = z.string().min(1).max(500).describe("The task's or group's id.");
const groupId = z.string().min(1).max(500);
const groupName = z.string().trim().min(1).max(80).describe("The group's name, unique in any case.");
const index = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).describe("The zero-based place to move to.");
const title = z.string().max(500).describe("The title; a last `(2)` sets the estimate in hours.");
// A day names its week; the backlog takes none.
const namesItsWeek = (body: { slot?: string; week?: string }) => body.slot === undefined || body.slot === "backlog" || body.week !== undefined;

const week = boardAction<{ week: string }>({
  operationId: "inbox.week", summary: "Read a week", description: "The week's days, its goal and the whole backlog.",
  input: z.strictObject({ week: mondayWeek }), output: z.strictObject({ plan }), encoding: "query", effect: "read",
  run: async (db, input) => ({ plan: await loadWeek(db, input.week) }),
});

const weekGoal = boardAction<{ week: string; goal: string }>({
  operationId: "inbox.week-goal", summary: "Set the week's goal", description: "Set or clear the goal shown over the week.",
  input: z.strictObject({ week: mondayWeek, goal: z.string().max(2000).describe("The goal; empty clears it.") }),
  output: z.strictObject({ week: z.string(), goal: z.string() }), encoding: "json", effect: "write",
  run: (db, input) => setWeekGoal(db, input.week, input.goal),
});

const sweepWeek = boardAction<{ week: string; to: (typeof sweepDestinations)[number] }>({
  operationId: "inbox.sweep", summary: "Sweep the week's unfinished work",
  description: "Move every unfinished day task of the week to the backlog or to next week.",
  input: z.strictObject({ week: mondayWeek, to: z.enum(sweepDestinations).describe("backlog or next_week.") }),
  output: z.strictObject({ plan }), encoding: "json", effect: "write",
  run: async (db, input) => ({ plan: await sweep(db, input.week, input.to) }),
});

const taskSearch = boardAction<{ q: string }>({
  operationId: "inbox.task-search", summary: "Search every task", description: "Find tasks whose titles hold every word, in any week.",
  input: z.strictObject({ q: z.string().max(200).describe("The words to find.") }),
  output: z.strictObject({ tasks: z.array(z.strictObject({ id: z.string(), title: z.string(), status: z.enum(taskStatuses),
    week: z.string().nullable(), slot, backlogGroupId: z.string().nullable(), backlogGroupName: z.string().nullable(),
    importKey: z.string().nullable() })) }),
  encoding: "query", effect: "read",
  run: async (db, input) => ({ tasks: await searchTasks(db, input.q) }),
});

const addInput = z.strictObject({
  title, week: mondayWeek, slot: slot.describe("The day, or backlog."),
  backlogGroupId: groupId.optional().describe("The backlog group; Other when left out. Only with the backlog."),
}).refine(body => body.slot === "backlog" || body.backlogGroupId === undefined, { message: "Only a backlog task takes a group." });

const taskAdd = boardAction<z.infer<typeof addInput>>({
  operationId: "inbox.task-add", summary: "Add a task", description: "Add a task at the end of its day's or group's open work.",
  input: addInput, output: z.strictObject({ task }), encoding: "json", effect: "write",
  run: async (db, input) => ({ task: await createTask(db, input) }),
});

const changeInput = z.strictObject({
  id, title: title.optional(), status: z.enum(taskStatuses).optional().describe("The new status."),
  week: mondayWeek.optional(), slot: slot.optional().describe("The new day, or backlog."),
  backlogGroupId: groupId.optional().describe("The new group: a backlog task's home, or a day task's category."), index: index.optional(),
}).refine(namesItsWeek, { message: "A day slot needs its week." })
  .refine(body => Object.keys(body).length > 1, { message: "Send a change." });

const taskChange = boardAction<z.infer<typeof changeInput>>({
  operationId: "inbox.task-change", summary: "Change a task", description: "Change a task's title, status, day, group or place.",
  input: changeInput, output: z.strictObject({ task }), encoding: "json", effect: "write",
  run: async (db, { id: taskId, ...change }) => ({ task: await updateTask(db, taskId, change) }),
});

const taskDelete = boardAction<{ id: string }>({
  operationId: "inbox.task-delete", summary: "Delete a task", description: "Delete a task from the board.",
  input: z.strictObject({ id }), output: z.strictObject({ id: z.string() }), encoding: "query", effect: "write",
  run: (db, input) => deleteTask(db, input.id),
});

const groupAdd = boardAction<{ name: string }>({
  operationId: "inbox.group-add", summary: "Add a backlog group", description: "Add a backlog group at the end of the board.",
  input: z.strictObject({ name: groupName }), output: z.strictObject({ group }), encoding: "json", effect: "write",
  run: async (db, input) => ({ group: await createGroup(db, input.name) }),
});

const groupRename = boardAction<{ id: string; name: string }>({
  operationId: "inbox.group-rename", summary: "Rename a backlog group", description: "Rename a backlog group; Other keeps its name.",
  input: z.strictObject({ id, name: groupName }), output: z.strictObject({ group }), encoding: "json", effect: "write",
  run: async (db, input) => ({ group: await renameGroup(db, input.id, input.name) }),
});

const groupMove = boardAction<{ id: string; index: number }>({
  operationId: "inbox.group-move", summary: "Move a backlog group", description: "Move a backlog group to a new place in the list.",
  input: z.strictObject({ id, index }), output: z.strictObject({ groups: z.array(group) }), encoding: "json", effect: "write",
  run: async (db, input) => ({ groups: await moveGroup(db, input.id, input.index) }),
});

const groupDelete = boardAction<{ id: string; week: string }>({
  operationId: "inbox.group-delete", summary: "Delete a backlog group",
  description: "Delete a backlog group; its tasks go to Other. Returns the week asked for.",
  input: z.strictObject({ id, week: mondayWeek }), output: z.strictObject({ plan }), encoding: "query", effect: "write",
  run: async (db, input) => {
    await deleteGroup(db, input.id);
    return { plan: await loadWeek(db, input.week) };
  },
});

export const weekRoutes = [
  ["GET week", week], ["PUT week-goal", weekGoal], ["POST sweep", sweepWeek], ["GET task-search", taskSearch], ["POST task", taskAdd],
  ["PATCH task", taskChange], ["DELETE task", taskDelete], ["POST group", groupAdd], ["PATCH group", groupRename],
  ["POST group-move", groupMove], ["DELETE group", groupDelete],
] as const;
