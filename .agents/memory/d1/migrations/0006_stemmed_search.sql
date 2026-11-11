-- WongStack memory store, schema 6: search matches word forms, so *previews* finds *preview*. The index is
-- rebuilt under FTS5's porter stemmer. The new table is built before the old one is dropped, so a failure
-- partway leaves the old index working, and a rerun starts the new one over. The name stays facts_fts.
DROP TABLE IF EXISTS facts_fts_new;
CREATE VIRTUAL TABLE facts_fts_new USING fts5 (body, content = 'facts', content_rowid = 'id', tokenize = 'porter unicode61');
INSERT INTO facts_fts_new (facts_fts_new) VALUES ('rebuild');
DROP TRIGGER IF EXISTS facts_fts_insert;
DROP TABLE facts_fts;
ALTER TABLE facts_fts_new RENAME TO facts_fts;
CREATE TRIGGER facts_fts_insert AFTER INSERT ON facts
BEGIN INSERT INTO facts_fts (rowid, body) VALUES (new.id, new.body); END;
