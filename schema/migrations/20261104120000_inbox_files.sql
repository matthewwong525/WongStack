-- Files a person sends from a review page in the inbox, kept until their computer takes them and 24 hours at most:
-- openspec/changes/review-forms-and-live-cards. A file's row is written only once all its parts are. Additive only.
CREATE TABLE inbox_files (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  -- The tap that carries it; NULL until the page sends it with one.
  tap_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, email, id)
);
CREATE INDEX inbox_files_item ON inbox_files(installation_id, email, item_id);
CREATE INDEX inbox_files_tap ON inbox_files(installation_id, email, tap_id);
CREATE TABLE inbox_file_parts (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  file_id TEXT NOT NULL,
  n INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, email, file_id, n)
);
