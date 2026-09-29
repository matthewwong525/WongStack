// The D1 query endpoint both fake Cloudflares share, on node:sqlite: one statement or a batch, in one
// transaction, answered the way Cloudflare answers.

/** Rows for a statement with params; a multi-statement script with none runs as one `exec`. */
export const run = (db, sql, params = []) => (params.length === 0 && /;\s*\S/.test(sql.trim().replace(/;\s*$/, '')) ? (db.exec(sql), []) : db.prepare(sql).all(...params));

/** `POST …/d1/database/<id>/query` with a parsed `body`: `[status, json]`; a failed statement rolls back and is code 7500. */
export function d1Query(db, body) {
  const statements = body.batch || [body];
  try {
    db.exec('BEGIN');
    const result = statements.map(({ sql, params }) => ({ success: true, results: run(db, sql, params || []).map((row) => ({ ...row })), meta: {} }));
    db.exec('COMMIT');
    return [200, { success: true, errors: [], result }];
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* none open */ }
    return [400, { success: false, errors: [{ code: 7500, message: error.message }] }];
  }
}
