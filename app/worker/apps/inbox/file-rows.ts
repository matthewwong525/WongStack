// The statements that remove sent files, apart from the routes, so `store.ts` can run them with its own clean-ups.
import { mine, type Scope } from "./rows.ts";

const SETTLED = `SELECT id FROM inbox_taps WHERE installation_id = ?1 AND email = ?2 AND state NOT IN ('waiting', 'delivering')`;

/** Deletes every file whose tap is done: sent, failed, changed, cancelled or expired. */
export const dropSettledFiles = (at: Scope) => [
  mine(at, `DELETE FROM inbox_file_parts WHERE installation_id = ?1 AND email = ?2 AND file_id IN (SELECT id FROM inbox_files
    WHERE installation_id = ?1 AND email = ?2 AND tap_id IN (${SETTLED}))`),
  mine(at, `DELETE FROM inbox_files WHERE installation_id = ?1 AND email = ?2 AND tap_id IN (${SETTLED})`),
];

/** Fails each waiting tap that carries a file sent before `before`, then deletes those files and any stray parts. The
 *  bytes go for every person, as the app's room counts all: anyone's call clears what one who never came back left. */
export const pruneFiles = (at: Scope, before: number) => [
  mine(at, `UPDATE inbox_taps SET state = 'failed', answered_at = ?4 WHERE installation_id = ?1 AND email = ?2 AND state = 'waiting'
    AND id IN (SELECT tap_id FROM inbox_files WHERE installation_id = ?1 AND email = ?2 AND created_at < ?3)`, before, at.now),
  mine(at, "DELETE FROM inbox_file_parts WHERE installation_id = ?1 AND created_at < ?3", before),
  mine(at, "DELETE FROM inbox_files WHERE installation_id = ?1 AND email = ?2 AND created_at < ?3", before),
];
