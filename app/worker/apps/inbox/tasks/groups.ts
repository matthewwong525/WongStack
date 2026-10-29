// The backlog's groups: named homes for unscheduled work, and `Other`, the one group that is always there.
import { defaultBacklogGroupId, positionStep, taskBand, type BacklogGroup, type TaskBand, type TaskStatus } from "../../../../src/lib/board.ts";
import { BoardError, NOW } from "./board.ts";
import { bandOrder, endOfBand } from "./positions.ts";

type GroupRow = { id: string; name: string; position: number; is_default: number };
const shown = (row: GroupRow): BacklogGroup => ({ id: row.id, name: row.name, position: row.position, isDefault: row.is_default === 1 });

export async function loadGroups(db: D1DatabaseSession): Promise<BacklogGroup[]> {
  const { results } = await db.prepare("SELECT id, name, position, is_default FROM backlog_groups ORDER BY position ASC, id ASC").all<GroupRow>();
  return results.map(shown);
}

async function loadGroup(db: D1DatabaseSession, id: string) {
  const row = await db.prepare("SELECT id, name, position, is_default FROM backlog_groups WHERE id = ?").bind(id).first<GroupRow>();
  if (!row) throw new BoardError("not_found");
  return shown(row);
}

/** The group a backlog task goes to: the one asked for, which must exist, or `Other`. */
export async function groupFor(db: D1DatabaseSession, requested = defaultBacklogGroupId) {
  return (await loadGroup(db, requested).catch(() => { throw new BoardError("validation_failed"); })).id;
}

/** Two groups never share a name, in any case. */
async function nameIsFree(db: D1DatabaseSession, name: string, except = "") {
  const taken = await db.prepare("SELECT id FROM backlog_groups WHERE name = ? COLLATE NOCASE AND id != ?").bind(name, except).first();
  if (taken) throw new BoardError("validation_failed");
}

/** A new group goes at the end of the board, `Other` included: where its name was typed. */
export async function createGroup(db: D1DatabaseSession, name: string): Promise<BacklogGroup> {
  await nameIsFree(db, name);
  // `Other` is always there, so the board has a last position.
  const last = (await db.prepare("SELECT max(position) AS position FROM backlog_groups").first<{ position: number }>())!;
  const created = { id: crypto.randomUUID(), name, position: last.position + positionStep, isDefault: false };
  await db.prepare("INSERT INTO backlog_groups (id, name, position) VALUES (?, ?, ?)").bind(created.id, name, created.position).run();
  return created;
}

export async function renameGroup(db: D1DatabaseSession, id: string, name: string): Promise<BacklogGroup> {
  const current = await loadGroup(db, id);
  if (current.isDefault) throw new BoardError("validation_failed");
  await nameIsFree(db, name, id);
  await db.prepare(`UPDATE backlog_groups SET name = ?, updated_at = ${NOW} WHERE id = ?`).bind(name, id).run();
  return { ...current, name };
}

/** Moves one group, `Other` included, to an index. The list is short, so all get even gaps: no two positions tie. */
export async function moveGroup(db: D1DatabaseSession, id: string, index: number): Promise<BacklogGroup[]> {
  const moving = await loadGroup(db, id);
  const rest = (await loadGroups(db)).filter(each => each.id !== id);
  rest.splice(Math.min(index, rest.length), 0, moving);
  const ordered = rest.map((each, at) => ({ ...each, position: (at + 1) * positionStep }));
  await db.batch(ordered.map(each => db.prepare(`UPDATE backlog_groups SET position = ?, updated_at = ${NOW} WHERE id = ?`)
    .bind(each.position, each.id)));
  return ordered;
}

/** Deletes a group. Its tasks go to `Other`, each at the end of its own band there, so started work stays above open
 *  work; a day task that kept the group as its category takes `Other` too. */
export async function deleteGroup(db: D1DatabaseSession, id: string) {
  if ((await loadGroup(db, id)).isDefault) throw new BoardError("validation_failed");
  const { results } = await db.prepare(`SELECT id, status FROM tasks WHERE backlog_group_id = ? AND slot = 'backlog'
    ORDER BY deleted_at IS NOT NULL, ${bandOrder()}, position ASC`).bind(id).all<{ id: string; status: TaskStatus }>();
  const home = { week: null, slot: "backlog" as const, backlogGroupId: defaultBacklogGroupId };
  const ends = new Map<TaskBand, number>();
  const moves: D1PreparedStatement[] = [];
  for (const row of results) {
    const band = taskBand(row.status);
    const position = ends.get(band) ?? await endOfBand(db, home, band);
    ends.set(band, position + positionStep);
    moves.push(db.prepare(`UPDATE tasks SET backlog_group_id = ?, position = ?, updated_at = ${NOW} WHERE id = ?`)
      .bind(defaultBacklogGroupId, position, row.id));
  }
  await db.batch([...moves,
    db.prepare(`UPDATE tasks SET backlog_group_id = ?, updated_at = ${NOW} WHERE backlog_group_id = ? AND slot != 'backlog'`)
      .bind(defaultBacklogGroupId, id),
    db.prepare("DELETE FROM backlog_groups WHERE id = ?").bind(id)]);
}
