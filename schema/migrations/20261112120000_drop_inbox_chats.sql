-- The Inbox opens on the review pages waiting for the person, not on a list of chats (openspec/changes/daily-module).
-- The chat list's table and the index that joined its pages go. inbox_items.chat stays, unused, so no table rebuild.
DROP INDEX IF EXISTS inbox_items_chats;
DROP TABLE IF EXISTS chats;
