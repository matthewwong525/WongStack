-- A schedule's whole definition lives in the app: what it does, where, its leave, its end and its progress.
-- `revision` now holds the version: the sha256 of {key, kind, instructions, run, authority, until}. A computer runs only a
-- version approved on it; the app's approved_* columns only let the inbox say which computer waits for an OK.
-- A run's new result codes: `not_approved`, `changed`, `ended`, `no_folder`, `no_work`. Additive only.
-- `chat` opens a workspace; `background` is a worker run with no chat.
ALTER TABLE schedules ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat';
-- The first message of a chat run, or a background run's brief.
ALTER TABLE schedules ADD COLUMN instructions TEXT NOT NULL DEFAULT '';
-- {cwd, provider, thinking, mode, check, minutes, place}.
ALTER TABLE schedules ADD COLUMN run_json TEXT NOT NULL DEFAULT '{}';
-- {actions, recipients, channels, minIntervalMs}.
ALTER TABLE schedules ADD COLUMN authority_json TEXT NOT NULL DEFAULT '{}';
-- A goal's completion source, or null for a schedule with no end.
ALTER TABLE schedules ADD COLUMN until TEXT;
-- An ended schedule is paused with ended_at set: a finished one-time task or goal, or a cancelled schedule.
ALTER TABLE schedules ADD COLUMN ended_at INTEGER;
ALTER TABLE schedules ADD COLUMN end_reason TEXT;
-- A run's continuation, and the run that holds it now.
ALTER TABLE schedules ADD COLUMN progress_json TEXT;
ALTER TABLE schedules ADD COLUMN progress_claim TEXT;
ALTER TABLE schedules ADD COLUMN progress_claimed_at INTEGER;
-- What the bound computer says it approved, when, and its name, for display only.
ALTER TABLE schedules ADD COLUMN approved_version TEXT;
ALTER TABLE schedules ADD COLUMN approved_at INTEGER;
ALTER TABLE schedules ADD COLUMN approved_by_computer TEXT;
ALTER TABLE schedules ADD COLUMN computer_name TEXT;
-- The owner's email on a team schedule's copy, else null. A copy's computer_id is '' until its person approves it.
ALTER TABLE schedules ADD COLUMN made_by TEXT;
