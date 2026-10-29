// Where a task sits in its home: the board's band and position rules (src/lib/board.ts) read against the rows.
import { positionForBandEdge, positionForIndex, rebalancedPositions, type TaskBand, type TaskSlot, type TaskStatus }
  from "../../../../src/lib/board.ts";

/** The display order in SQL: the bands, then positions inside each. It restates `taskBand`; a test holds them equal. */
export const bandOrder = (column = "status") => `CASE ${column} WHEN 'in_progress' THEN 0 WHEN 'done' THEN 2 ELSE 1 END`;

/** A home: a day of a week, or one backlog group. */
export type Home = { week: string | null; slot: TaskSlot | "backlog"; backlogGroupId: string | null };
type Row = { id: string; status: TaskStatus; position: number };

/** The home's live tasks but `except`. Backlog tasks belong to no week; a day's are that day of the week asked for. */
async function siblings(db: D1DatabaseSession, home: Home, except = "") {
  const backlog = home.slot === "backlog";
  const { results } = await db.prepare(`SELECT id, status, position FROM tasks WHERE deleted_at IS NULL AND slot = ? AND id != ?
    AND ${backlog ? "backlog_group_id" : "week"} = ? ORDER BY ${bandOrder()}, position ASC`)
    .bind(home.slot, except, backlog ? home.backlogGroupId : home.week).all<Row>();
  return results;
}

/** The next position at the end of one band of a home, where an arriving task of that band lands. */
export const endOfBand = async (db: D1DatabaseSession, home: Home, band: TaskBand) =>
  positionForBandEdge(await siblings(db, home), band, "end");

/** A move's position. No index puts the task at an end of its own band. Only when a gap has collapsed past float
 *  precision does the home get even spacing first. */
export async function resolvePosition(db: D1DatabaseSession, move: Home & { id: string; band: TaskBand; index?: number; edge: "start" | "end" }) {
  const rows = await siblings(db, move, move.id);
  if (move.index === undefined) return positionForBandEdge(rows, move.band, move.edge);
  const position = positionForIndex(rows, move.index, move.band);
  if (position !== null) return position;
  const spaced = rebalancedPositions(rows.length);
  await db.batch(rows.map((row, index) => db.prepare("UPDATE tasks SET position = ? WHERE id = ?").bind(spaced[index], row.id)));
  // Even gaps of a whole step always split.
  return positionForIndex(await siblings(db, move, move.id), move.index, move.band)!;
}
