-- The inbox also lists private links: a `link` item holds JSON {what, url} and takes no taps
-- (app/worker/apps/inbox/item-put.ts). SQLite can't widen a CHECK in place, so the table is rebuilt and every row
-- copied; D1 applies this file as one transaction. Reads inbox_items, made by 20261022120000_inbox.sql.
CREATE TABLE inbox_items_next (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'approval', 'question', 'link')),
  title TEXT NOT NULL,
  workspace TEXT NOT NULL,
  -- A plan's HTML, an approval's or question's JSON, or a link's {what, url}; emptied once the item closes.
  body TEXT NOT NULL,
  actions TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  closes_at INTEGER NOT NULL,
  closed_at INTEGER,
  PRIMARY KEY (installation_id, email, id)
);
INSERT INTO inbox_items_next (installation_id, email, id, kind, title, workspace, body, actions, version, created_at, closes_at, closed_at)
SELECT installation_id, email, id, kind, title, workspace, body, actions, version, created_at, closes_at, closed_at FROM inbox_items;
DROP TABLE inbox_items;
ALTER TABLE inbox_items_next RENAME TO inbox_items;
