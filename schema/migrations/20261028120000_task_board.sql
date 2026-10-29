-- The week board in the Inbox: tasks by week and day, a backlog in groups, and each week's goal.
-- openspec/changes/daily-task-board. Every statement acts only when its table or index is missing, so an app that
-- already has these tables, with more columns, sees no change.

CREATE TABLE IF NOT EXISTS backlog_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE CHECK (trim(name) != '' AND length(name) <= 80),
  position REAL NOT NULL,
  -- The one catch-all group, `Other`: it moves like any group, but is never renamed or deleted.
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_groups_name ON backlog_groups (name COLLATE NOCASE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_groups_one_default ON backlog_groups (is_default) WHERE is_default = 1;
CREATE INDEX IF NOT EXISTS idx_backlog_groups_position ON backlog_groups (is_default, position);

-- Added only when no default group is there: an app with its own `Other` keeps it.
INSERT INTO backlog_groups (id, name, position, is_default)
SELECT 'backlog_other', 'Other', 1000, 1 WHERE NOT EXISTS (SELECT 1 FROM backlog_groups WHERE is_default = 1);

CREATE TRIGGER IF NOT EXISTS protect_default_backlog_group_delete
BEFORE DELETE ON backlog_groups
WHEN OLD.is_default = 1
BEGIN
  SELECT RAISE(ABORT, 'default backlog group is protected');
END;

CREATE TRIGGER IF NOT EXISTS protect_default_backlog_group_update
BEFORE UPDATE OF name, is_default ON backlog_groups
WHEN OLD.is_default = 1 AND (NEW.name != OLD.name OR NEW.is_default != 1)
BEGIN
  SELECT RAISE(ABORT, 'default backlog group is protected');
END;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  -- The Monday of the task's week, as YYYY-MM-DD; NULL for the backlog, which belongs to no week.
  week TEXT,
  slot TEXT NOT NULL CHECK (slot IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'backlog')),
  -- A backlog task's group; a day task may keep one as its category.
  backlog_group_id TEXT REFERENCES backlog_groups(id),
  -- The order inside one status band. A task dropped between two others takes the midpoint: one row changes.
  position REAL NOT NULL,
  estimate_hours REAL,
  -- A JSON array of words; nothing reads it yet.
  tags TEXT,
  -- `daily:` and the daily's own entry, or `chat:` and a chat's agent id: the same key never adds a second task.
  import_key TEXT,
  -- A chat's plan link, and the name of the chat (workspace) that works on the task.
  link TEXT,
  chat TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  CHECK (
    (slot = 'backlog' AND week IS NULL AND backlog_group_id IS NOT NULL)
    OR
    (slot != 'backlog' AND week IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tasks_week_slot_position ON tasks (week, slot, position) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_backlog_group_position ON tasks (backlog_group_id, position)
  WHERE slot = 'backlog' AND deleted_at IS NULL;
-- Partial, so a deleted task never blocks its key from coming back.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_import_key ON tasks (import_key) WHERE import_key IS NOT NULL AND deleted_at IS NULL;

-- The week's goal, in the person's own words. A week with nothing written has no row.
CREATE TABLE IF NOT EXISTS week_goals (
  week TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
