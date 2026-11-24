-- A plain page and team links to inbox pages (openspec/changes/team-shared-pages). Additive: two columns, one table.
-- The Reviews index is rebuilt with the new column, so the list still never reads a kept page.
ALTER TABLE inbox_items ADD COLUMN plain INTEGER NOT NULL DEFAULT 0;
-- When the item's newest version came: each put sets it. A row from before has had one version, so it came when made.
ALTER TABLE inbox_items ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
UPDATE inbox_items SET updated_at = created_at;
DROP INDEX IF EXISTS inbox_items_reviews;
CREATE INDEX inbox_items_reviews ON inbox_items(installation_id, email, kind, created_at, closed_at, closes_at, hidden, id, title, workspace, plain);

-- A team link to one person's inbox page. A stopped link never opens again; the next share makes a new token.
CREATE TABLE inbox_shares (
  token TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  stopped_at INTEGER
);
-- At most one open link per page.
CREATE UNIQUE INDEX inbox_shares_open ON inbox_shares(installation_id, email, item_id) WHERE stopped_at IS NULL;
