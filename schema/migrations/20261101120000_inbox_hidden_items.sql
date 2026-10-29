-- A hidden inbox item takes taps but shows no Inbox card, such as a chat's watch that a tap wakes:
-- openspec/changes/inbox-hidden-items. Additive only.
ALTER TABLE inbox_items ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
