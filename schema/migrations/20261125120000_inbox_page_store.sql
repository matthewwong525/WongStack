-- An inbox page's HTML and its pictures and videos out of the item row (openspec/changes/inbox-pages-with-media).
-- Additive: a page put before this keeps its HTML in inbox_items.body, and every row already in inbox_page_files is a
-- page's file, kept in the database.
-- page_info: the review page's notes key, own-Back flag and button labels, read once when the page is put.
ALTER TABLE inbox_items ADD COLUMN page_info TEXT;
-- role: file (a download), media (a picture or video the page shows) or body (the page's HTML, with an empty name).
ALTER TABLE inbox_page_files ADD COLUMN role TEXT NOT NULL DEFAULT 'file';
-- stored: db (inbox_page_file_parts) or bucket (the INBOX_PAGES bucket).
ALTER TABLE inbox_page_files ADD COLUMN stored TEXT NOT NULL DEFAULT 'db';
