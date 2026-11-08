-- The Inbox lists each person's open chats (openspec/changes/inbox-shows-chats), and the week board goes. A chat's
-- computer keeps its row; a review page names its chat. Times are milliseconds since 1970.
CREATE TABLE IF NOT EXISTS chats (
  installation_id TEXT NOT NULL,
  -- PASEO_AGENT_ID, else the agent's own session id.
  agent_id TEXT NOT NULL PRIMARY KEY,
  -- The person's sign-in email.
  owner TEXT NOT NULL,
  -- Memory's id for the chat's session ('claude:<uuid>'), for a later join; the app never reads it.
  session_id TEXT,
  computer TEXT NOT NULL,
  -- The chat's name after its step word, its step (PLAN, APPLY…), and its folder's name, as inbox_items.workspace.
  name TEXT NOT NULL,
  step TEXT,
  folder TEXT NOT NULL,
  -- 'schedule:<key>' for a chat a schedule's run opened.
  source TEXT,
  close_asked_at INTEGER,
  seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_owner ON chats(installation_id, owner, computer);

-- The chat (agent id) that made the item; NULL on older items, which join their chat by folder name.
ALTER TABLE inbox_items ADD COLUMN chat TEXT;
-- The chat list's waiting pages, read from the index alone: a kept page's body sits before these columns.
CREATE INDEX inbox_items_chats ON inbox_items(installation_id, email, kind, closed_at, closes_at, hidden, chat, created_at, id, title, workspace);

-- The week board is deleted. Its triggers go with backlog_groups. An install whose own code uses a table of one of
-- these names skips this part: its sync plan checks first.
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS week_goals;
DROP TABLE IF EXISTS backlog_groups;
