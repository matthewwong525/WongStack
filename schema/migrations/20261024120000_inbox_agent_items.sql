-- The inbox lists agents: a `start` item holds a morning plan that takes Go or Not today, and an `agent` item holds
-- where an agent stands, taking no taps (app/worker/apps/inbox/item-put.ts). SQLite can't widen a CHECK in place, so the
-- table is rebuilt and every row copied; D1 applies this file as one transaction. Reads 20261023120000_inbox_link_items.sql.
CREATE TABLE inbox_items_next (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'approval', 'question', 'link', 'start', 'agent')),
  title TEXT NOT NULL,
  workspace TEXT NOT NULL,
  -- A plan's HTML, or JSON: an approval's or question's words, a link's {what, url}, a start's {state, plan?}, or an
  -- agent's {state, step?, action?, proof?}; emptied once the item closes.
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
