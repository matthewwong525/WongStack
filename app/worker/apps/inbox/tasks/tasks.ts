// The board's tasks: read a week, search every week, add, change and delete a task, and the week's goal.
import { parseTaskTitle, searchResultLimit, searchWords, taskBand, taskSlots, type Task, type TaskSearchResult, type TaskSlot,
  type TaskStatus, type WeekPlan } from "../../../../src/lib/board.ts";
import { BoardError, NOW } from "./board.ts";
import { groupFor, loadGroups } from "./groups.ts";
import { bandOrder, endOfBand, resolvePosition } from "./positions.ts";

type TaskRow = { id: string; title: string; status: TaskStatus; week: string | null; slot: TaskSlot; backlog_group_id: string | null;
  position: number; estimate_hours: number | null; import_key: string | null; link: string | null; chat: string | null; created_at: string;
  updated_at: string };

const COLUMNS = `id, title, status, week, slot, backlog_group_id, position, estimate_hours, import_key, link, chat, created_at, updated_at`;

const shown = (row: TaskRow): Task => ({ id: row.id, title: row.title, status: row.status, week: row.week, slot: row.slot,
  backlogGroupId: row.backlog_group_id, position: row.position, estimateHours: row.estimate_hours, importKey: row.import_key,
  link: row.link, chat: row.chat, createdAt: row.created_at, updatedAt: row.updated_at });

/** The live task `id`, as its row. */
async function taskRow(db: D1DatabaseSession, id: string) {
  const row = await db.prepare(`SELECT ${COLUMNS} FROM tasks WHERE deleted_at IS NULL AND id = ?`).bind(id).first<TaskRow>();
  if (!row) throw new BoardError("not_found");
  return row;
}
const loadTask = async (db: D1DatabaseSession, id: string) => shown(await taskRow(db, id));

/** One week's days, every slot even an empty one, and the whole backlog, which belongs to no week. */
export async function loadWeek(db: D1DatabaseSession, week: string): Promise<WeekPlan> {
  const { results } = await db.prepare(`SELECT ${COLUMNS} FROM tasks WHERE deleted_at IS NULL AND (week = ? OR slot = 'backlog')
    ORDER BY ${bandOrder()}, position ASC`).bind(week).all<TaskRow>();
  const goal = await db.prepare("SELECT goal FROM week_goals WHERE week = ?").bind(week).first<{ goal: string }>();
  const slots = Object.fromEntries(taskSlots.map(slot => [slot, [] as Task[]])) as WeekPlan["slots"];
  for (const row of results) slots[row.slot].push(shown(row));
  return { week, goal: goal?.goal ?? "", backlogGroups: await loadGroups(db), slots };
}

/** Every task whose title holds each word, any week or status: the live backlog first, then weeks newest first. */
export async function searchTasks(db: D1DatabaseSession, query: string): Promise<TaskSearchResult[]> {
  const words = searchWords(query);
  if (!words.length) throw new BoardError("validation_failed");
  const { results } = await db.prepare(`SELECT t.id, t.title, t.status, t.week, t.slot, t.backlog_group_id, g.name AS group_name, t.import_key
    FROM tasks t LEFT JOIN backlog_groups g ON g.id = t.backlog_group_id
    WHERE t.deleted_at IS NULL AND ${words.map(() => "t.title LIKE ? ESCAPE '\\'").join(" AND ")}
    ORDER BY (t.week IS NULL) DESC, t.week DESC, t.updated_at DESC LIMIT ${searchResultLimit}`)
    // Escaped, so `100%` finds only itself, and `a_b` never finds `axb`.
    .bind(...words.map(word => `%${word.replace(/[\\%_]/g, character => `\\${character}`)}%`))
    .all<Omit<TaskRow, "position" | "estimate_hours" | "link" | "chat" | "created_at" | "updated_at"> & { group_name: string | null }>();
  return results.map(row => ({ id: row.id, title: row.title, status: row.status, week: row.week, slot: row.slot,
    backlogGroupId: row.backlog_group_id, backlogGroupName: row.group_name, importKey: row.import_key }));
}

/** The week's goal. Clearing it removes the row, so "no goal" is one state. */
export async function setWeekGoal(db: D1DatabaseSession, week: string, goal: string) {
  const trimmed = goal.trim();
  await (trimmed ? db.prepare(`INSERT INTO week_goals (week, goal) VALUES (?, ?)
    ON CONFLICT (week) DO UPDATE SET goal = excluded.goal, updated_at = ${NOW}`).bind(week, trimmed)
    : db.prepare("DELETE FROM week_goals WHERE week = ?").bind(week)).run();
  return { week, goal: trimmed };
}

/** Where a new task lands: a backlog group with no week, or a day with its week, as each route's input insists. */
async function place(db: D1DatabaseSession, at: { week?: string; slot?: TaskSlot; backlogGroupId?: string }) {
  const slot = at.slot ?? "backlog";
  return slot === "backlog" ? { slot, week: null, backlogGroupId: await groupFor(db, at.backlogGroupId) }
    : { slot, week: at.week!, backlogGroupId: null };
}

/** Adds a task at the end of its home's open work. The estimate may close the line: `handbook cleanup (1)`. */
export async function createTask(db: D1DatabaseSession, input: { title: string; week: string; slot: TaskSlot; backlogGroupId?: string }) {
  const { title, estimateHours } = parseTaskTitle(input.title);
  if (!title) throw new BoardError("validation_failed");
  return insert(db, { title, estimateHours, importKey: null, ...await place(db, input) });
}

async function insert(db: D1DatabaseSession, row: { title: string; estimateHours: number | null; importKey: string | null; slot: TaskSlot;
  week: string | null; backlogGroupId: string | null }) {
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO tasks (id, title, week, slot, backlog_group_id, position, estimate_hours, import_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, row.title, row.week, row.slot, row.backlogGroupId,
    await endOfBand(db, row, taskBand("open")), row.estimateHours, row.importKey).run();
  return loadTask(db, id);
}

/** Adds a task by its key one time: a live task with the key comes back unchanged. The unique index stops a race's
 *  second copy, and the race's loser gets the winner's task. */
export async function addKeyedTask(db: D1DatabaseSession, input: { importKey: string; title: string; estimateHours?: number; week?: string;
  slot?: TaskSlot }): Promise<{ task: Task; created: boolean }> {
  const existing = () => db.prepare("SELECT id FROM tasks WHERE import_key = ? AND deleted_at IS NULL").bind(input.importKey).first<{ id: string }>();
  const found = await existing();
  if (found) return { task: await loadTask(db, found.id), created: false };
  const home = await place(db, input);
  try {
    return { task: await insert(db, { title: input.title, estimateHours: input.estimateHours ?? null, importKey: input.importKey, ...home }), created: true };
  } catch (error) {
    const raced = await existing();
    if (raced) return { task: await loadTask(db, raced.id), created: false };
    throw error;
  }
}

/** A partial change: a request that names one field never blanks the rest. A move or a status change puts the task
 *  in its band by the rule the screen applies first, so neither side sends the other a position. */
export async function updateTask(db: D1DatabaseSession, id: string, input: { title?: string; estimateHours?: number; status?: TaskStatus;
  week?: string; slot?: TaskSlot; backlogGroupId?: string; index?: number }) {
  const current = await taskRow(db, id);
  const { assignments, values } = fields(input);
  const slot = input.slot ?? current.slot;
  // A day names its week; the backlog takes none, so a moved task never keeps the week it left.
  const week = slot === "backlog" ? null : input.week ?? current.week;
  const backlogGroupId = input.backlogGroupId !== undefined ? await groupFor(db, input.backlogGroupId)
    : slot === "backlog" ? current.backlog_group_id ?? await groupFor(db) : current.backlog_group_id;
  const named = input.week !== undefined || input.slot !== undefined;
  if (named || input.backlogGroupId !== undefined) {
    assignments.push("week = ?", "slot = ?", "backlog_group_id = ?");
    values.push(week, slot, backlogGroupId);
  }
  // A day task's group is only its category: changing it moves nothing.
  const movesHome = named || (slot === "backlog" && backlogGroupId !== current.backlog_group_id);
  const status = input.status ?? current.status;
  if (movesHome || input.index !== undefined || status !== current.status) {
    // Stopping goes back to the top of the open run, the band it just left; all else joins the end of its band.
    const edge = current.status === "in_progress" && status === "open" ? "start" : "end";
    assignments.push("position = ?");
    values.push(await resolvePosition(db, { id, week, slot, backlogGroupId, band: taskBand(status), index: input.index, edge }));
  }
  await db.prepare(`UPDATE tasks SET ${[...assignments, `updated_at = ${NOW}`].join(", ")} WHERE id = ?`).bind(...values, id).run();
  return loadTask(db, id);
}

function fields(input: { title?: string; estimateHours?: number; status?: TaskStatus }) {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.title !== undefined) {
    const { title, estimateHours } = parseTaskTitle(input.title);
    if (!title) throw new BoardError("validation_failed");
    assignments.push("title = ?", "estimate_hours = ?");
    values.push(title, estimateHours);
  }
  for (const [column, value] of [["estimate_hours", input.estimateHours], ["status", input.status]] as const) {
    if (value === undefined) continue;
    assignments.push(`${column} = ?`);
    values.push(value);
  }
  return { assignments, values };
}

/** Deletes a task softly: its row stays as history, and its key may come back. */
export async function deleteTask(db: D1DatabaseSession, id: string) {
  const gone = await db.prepare(`UPDATE tasks SET deleted_at = ${NOW}, updated_at = ${NOW} WHERE id = ? AND deleted_at IS NULL RETURNING id`)
    .bind(id).first<{ id: string }>();
  if (!gone) throw new BoardError("not_found");
  return gone;
}
