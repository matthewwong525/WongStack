-- The inbox's Schedules view (app/worker/apps/inbox/): each person's schedules and their runs. A schedule on the app's
-- clock (`app`) is started on the computer it is bound to; a `paseo` row is a read-only copy of one kept in Paseo.
-- Every row belongs to one person of one installation. Additive only. Times are milliseconds since 1970.
CREATE TABLE schedules (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  key TEXT NOT NULL,
  host TEXT NOT NULL CHECK (host IN ('app', 'paseo')),
  computer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  -- The record's timing: {mode, cron?, every?, timezone, dueAt?, expiresAt?, allowedLatenessMs}.
  timing_json TEXT NOT NULL,
  -- The approved instructions' sha256; the computer starts nothing whose record no longer matches it.
  revision TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('on', 'paused')),
  next_run_at INTEGER,
  min_interval_ms INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, email, key)
);
CREATE TABLE schedule_runs (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  id TEXT NOT NULL,
  key TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  -- `clock` came due; `now` was asked for from the inbox, and waits for the computer until cancelled.
  source TEXT NOT NULL CHECK (source IN ('clock', 'now')),
  -- `taken` is a run the computer collected: it is never handed out again, and fails if no result comes.
  state TEXT NOT NULL CHECK (state IN ('due', 'taken', 'started', 'failed', 'blocked', 'missed', 'cancelled')),
  claimed_at INTEGER,
  -- Why a run did not start, as a short code: `late`, `superseded`, `no_result`, `changed`, `unknown_key`, `repeat`, `too_soon`.
  result TEXT,
  chat_title TEXT,
  agent_id TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, email, id)
);
CREATE INDEX schedule_runs_key ON schedule_runs(installation_id, email, key, state);
