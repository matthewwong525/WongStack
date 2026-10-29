// The end-of-week gesture: a week's unfinished day work goes to the backlog or to next week, never lost.
import { defaultBacklogGroupId, positionStep, shiftWeek, taskBand, type SweepDestination, type TaskSlot, type TaskStatus }
  from "../../../../src/lib/board.ts";
import { NOW } from "./board.ts";
import { endOfBand, type Home } from "./positions.ts";
import { loadWeek } from "./tasks.ts";

type Moving = { id: string; slot: TaskSlot; status: TaskStatus; backlog_group_id: string | null };

/** Moves every unfinished day task of `week`, day by day in the order each day shows them, each to the end of its
 *  band at the destination, so tasks that arrive together keep their order. Returns the swept week. */
export async function sweep(db: D1DatabaseSession, week: string, to: SweepDestination) {
  const { results } = await db.prepare(`SELECT id, slot, status, backlog_group_id FROM tasks
    WHERE deleted_at IS NULL AND week = ? AND slot != 'backlog' AND status != 'done'
    ORDER BY CASE slot WHEN 'mon' THEN 1 WHEN 'tue' THEN 2 WHEN 'wed' THEN 3 WHEN 'thu' THEN 4 WHEN 'fri' THEN 5 WHEN 'sat' THEN 6 ELSE 7 END,
      position ASC`).bind(week).all<Moving>();
  const next = shiftWeek(week, 1);
  // To the backlog, the week goes with the day: swept work is unscheduled, and its group, its category, takes it.
  const homeOf = (task: Moving): Home => to === "next_week" ? { week: next, slot: task.slot, backlogGroupId: null }
    : { week: null, slot: "backlog", backlogGroupId: task.backlog_group_id ?? defaultBacklogGroupId };
  const ends = new Map<string, number>();
  const updates: D1PreparedStatement[] = [];
  for (const task of results) {
    const home = homeOf(task);
    const band = taskBand(task.status);
    const key = `${home.slot}:${home.backlogGroupId}:${band}`;
    const position = ends.get(key) ?? await endOfBand(db, home, band);
    ends.set(key, position + positionStep);
    updates.push(to === "next_week"
      ? db.prepare(`UPDATE tasks SET week = ?, position = ?, updated_at = ${NOW} WHERE id = ?`).bind(next, position, task.id)
      : db.prepare(`UPDATE tasks SET slot = 'backlog', week = NULL, backlog_group_id = ?, position = ?, updated_at = ${NOW} WHERE id = ?`)
        .bind(home.backlogGroupId, position, task.id));
  }
  if (updates.length) await db.batch(updates);
  return loadWeek(db, week);
}
