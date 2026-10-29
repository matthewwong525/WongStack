// The daily's routes on the board: read a week, add a task one time by its key, place it, start or finish it, and a
// chat's to-do's link and removal. A skill calls each through `company-api.mjs call inbox.daily-…`.
import { z } from "zod";
import { taskSlots } from "../../../../src/lib/board.ts";
import { boardAction, mondayWeek } from "./board.ts";
import { removeKeyedTask, setTaskLink } from "./chat.ts";
import { addKeyedTask, loadWeek, updateTask } from "./tasks.ts";

const text = z.string().max(500);
const status = z.enum(["open", "in_progress", "done"]);
const taskId = z.string().min(1).max(500).describe("The existing task id from the board read.");
const confirm = { encoding: "json", effect: "write", agentAvailable: true, confirmWith: "inbox.daily-tasks" } as const;

const read = z.strictObject({
  week: z.string(), goal: z.string().max(2000), truncated: z.boolean(),
  backlogGroups: z.array(z.strictObject({ id: text, name: text })).max(100),
  tasks: z.array(z.strictObject({ id: text, title: text, status, week: z.string().nullable(), slot: z.string(), backlogGroupId: text.nullable(),
    estimateHours: z.number().nullable(), importKey: text.nullable(), chat: text.nullable() })).max(300),
});

/** A planning view of the board. Reading a week never sweeps or changes it. */
const dailyTasks = boardAction<{ week: string }>({
  operationId: "inbox.daily-tasks", summary: "Read the week's tasks and backlog",
  description: "Read the owner's weekly goal, day tasks and backlog for one Monday. Returns at most 300 tasks and 100 groups; truncated marks left-out rows.",
  input: z.strictObject({ week: mondayWeek }), output: read, encoding: "query", effect: "read", agentAvailable: true,
  examples: [{ input: { week: "2026-10-05" }, output: { week: "2026-10-05", goal: "", truncated: false, backlogGroups: [],
    tasks: [{ id: "sample-task", title: "Fix the Notes page", status: "in_progress", week: "2026-10-05", slot: "mon", backlogGroupId: null,
      estimateHours: 1, importKey: "chat:sample-agent", chat: "sample-horse" }] } }],
  run: async (db, { week }) => {
    const plan = await loadWeek(db, week);
    const tasks = Object.values(plan.slots).flat();
    return { week: plan.week, goal: plan.goal.slice(0, 2000),
      truncated: tasks.length > 300 || plan.backlogGroups.length > 100 || plan.goal.length > 2000 || tasks.some(task => task.title.length > 500),
      backlogGroups: plan.backlogGroups.slice(0, 100).map(group => ({ id: group.id, name: group.name.slice(0, 500) })),
      tasks: tasks.slice(0, 300).map(task => ({ id: task.id, title: task.title.slice(0, 500), status: task.status, week: task.week,
        slot: task.slot, backlogGroupId: task.backlogGroupId, estimateHours: task.estimateHours, importKey: task.importKey, chat: task.chat })) };
  },
});

// `daily:` for one task the daily typed or took from a note; `chat:` and an agent id for a chat's to-do.
const addInput = z.strictObject({
  importKey: z.string().regex(/^(?:daily:[A-Za-z0-9:-]{1,80}|chat:[A-Za-z0-9._-]{1,128})$/)
    .describe("`daily:` and the daily's own entry, or `chat:` and a chat's agent id. The same key never adds a second task."),
  title: z.string().trim().min(1).max(200).describe("The task's title, as the day page shows it."),
  estimateHours: z.number().positive().max(24).optional().describe("The estimate in hours, if known."),
  week: mondayWeek.optional().describe("The Monday of the day's week, with a day slot. Leave out for the backlog."),
  slot: z.enum(taskSlots).optional().describe("The day a new task lands on, at the end of its open work; backlog when left out."),
}).refine(body => (body.slot === undefined || body.slot === "backlog") === (body.week === undefined),
  { message: "A day slot needs its week; the backlog takes none." });

const dailyTaskAdd = boardAction<z.infer<typeof addInput>>({
  operationId: "inbox.daily-task-add", summary: "Add a daily or chat task to the board one time",
  description: "Add one task the daily typed (daily: key) or a chat's to-do (chat: key) to the owner's backlog, or to one day with week and slot. A live task with that key is returned, and nothing is created or moved. Place it with inbox.daily-task-place; read the week to confirm.",
  input: addInput, ...confirm,
  output: z.strictObject({ id: text, title: text, week: z.string().nullable(), slot: z.enum(taskSlots), status, estimateHours: z.number().nullable(),
    created: z.boolean() }),
  examples: [{ input: { importKey: "daily:2026-10-05-ads", title: "Take down camping ads" },
    output: { id: "sample-task", title: "Take down camping ads", week: null, slot: "backlog", status: "open", estimateHours: null, created: true } }],
  run: async (db, input) => {
    const { task, created } = await addKeyedTask(db, input);
    return { id: task.id, title: task.title, week: task.week, slot: task.slot, status: task.status, estimateHours: task.estimateHours, created };
  },
});

const placeInput = z.strictObject({
  id: taskId, week: mondayWeek,
  slot: z.enum(taskSlots).describe("The exact destination day, with separate sat and sun slots, or backlog."),
  index: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
    .describe("The zero-based destination index after removing this task. Existing status bands limit its position."),
  estimateHours: z.number().positive().max(24).optional().describe("A new estimate in hours, written with the move. Leave out to keep the estimate."),
});

const dailyTaskPlace = boardAction<z.infer<typeof placeInput>>({
  operationId: "inbox.daily-task-place", summary: "Place an existing task on the board",
  description: "Move or order one owner task in an exact week and day, or return it to its backlog group, and optionally set its estimate. Keeps the title and status. Read the destination week to confirm its order.",
  input: placeInput, ...confirm,
  output: z.strictObject({ id: text, week: z.string().nullable(), slot: z.enum(taskSlots), status, backlogGroupId: text.nullable() }),
  examples: [{ input: { id: "sample-task", week: "2026-10-05", slot: "mon", index: 0 },
    output: { id: "sample-task", week: "2026-10-05", slot: "mon", status: "open", backlogGroupId: null } }],
  run: async (db, { id, ...move }) => {
    const task = await updateTask(db, id, move);
    return { id: task.id, week: task.week, slot: task.slot, status: task.status, backlogGroupId: task.backlogGroupId };
  },
});

// `open` is refused: a started task goes forward only, and stopping work stays on the board.
const statusInput = z.strictObject({
  id: taskId, status: z.enum(["in_progress", "done"]).describe("in_progress when its work starts, done when it is finished and approved."),
});

const dailyTaskStatus = boardAction<z.infer<typeof statusInput>>({
  operationId: "inbox.daily-task-status", summary: "Set a task in progress or done",
  description: "Mark one owner task in progress or done. Keeps its title, week and day; it moves into its status band in that day's order. Read the week to confirm.",
  input: statusInput, ...confirm,
  output: z.strictObject({ id: text, week: z.string().nullable(), slot: z.enum(taskSlots), status: z.enum(["in_progress", "done"]) }),
  examples: [{ input: { id: "sample-task", status: "done" }, output: { id: "sample-task", week: "2026-10-05", slot: "mon", status: "done" } }],
  run: async (db, { id, status }) => {
    const task = await updateTask(db, id, { status });
    return { id: task.id, week: task.week, slot: task.slot, status };
  },
});

const removeInput = z.strictObject({
  importKey: z.string().regex(/^chat:[A-Za-z0-9._-]{1,128}$/).describe("`chat:` and the chat's agent id, as inbox.daily-task-add got it."),
});

/** Only a `chat:` key, so no other task can leave this way. */
const dailyTaskRemove = boardAction<z.infer<typeof removeInput>>({
  operationId: "inbox.daily-task-remove", summary: "Remove a chat's to-do from the board",
  description: "Delete the live owner task with this chat: key, when its chat closed before its work was finished. removed is false when no live task has the key. Only chat: keys are taken. Read the week to confirm.",
  input: removeInput, ...confirm, output: z.strictObject({ importKey: z.string().max(200), removed: z.boolean() }),
  examples: [{ input: { importKey: "chat:sample-agent" }, output: { importKey: "chat:sample-agent", removed: true } }],
  run: (db, { importKey }) => removeKeyedTask(db, importKey),
});

const linkInput = z.strictObject({
  id: taskId,
  link: z.url({ protocol: /^https$/ }).max(500).nullable().optional().describe("The chat's plan link, shown as Plan; null clears it."),
  chat: z.string().trim().min(1).max(100).nullable().optional().describe("The name of the chat that works on the task; null clears it."),
}).refine(body => body.link !== undefined || body.chat !== undefined, { message: "Send a link, a chat, or both." });

const dailyTaskLink = boardAction<z.infer<typeof linkInput>>({
  operationId: "inbox.daily-task-link", summary: "Set a task's plan link or chat",
  description: "Set one owner task's plan link (https only), the name of the chat that works on it, or both. A field left out keeps its value. Read the week to confirm.",
  input: linkInput, ...confirm,
  output: z.strictObject({ id: text, link: z.string().max(500).nullable(), chat: z.string().max(100).nullable() }),
  examples: [{ input: { id: "sample-task", link: "https://example.com/apps/inbox/?item=sample", chat: "sample-horse" },
    output: { id: "sample-task", link: "https://example.com/apps/inbox/?item=sample", chat: "sample-horse" } }],
  run: (db, { id, ...change }) => setTaskLink(db, id, change),
});

export const dailyRoutes = [
  ["GET daily-tasks", dailyTasks], ["POST daily-task-add", dailyTaskAdd], ["POST daily-task-place", dailyTaskPlace],
  ["POST daily-task-status", dailyTaskStatus], ["POST daily-task-remove", dailyTaskRemove], ["POST daily-task-link", dailyTaskLink],
] as const;
