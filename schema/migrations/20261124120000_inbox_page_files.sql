-- Files a plain page carries for download (openspec/changes/page-file-download). Additive: two new tables.
-- A page names its files; the bytes sit in parts of 512 KB, by content, so a page put again keeps a file it still names.
CREATE TABLE inbox_page_files (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, email, item_id, name)
);
CREATE INDEX inbox_page_files_bytes ON inbox_page_files(installation_id, email, item_id, sha256);
-- An upload's parts, written before the page names them. created_at comes before data, so a clean-up reads no bytes.
CREATE TABLE inbox_page_file_parts (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  n INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (installation_id, email, item_id, sha256, n)
);
CREATE INDEX inbox_page_file_parts_age ON inbox_page_file_parts(installation_id, created_at);
