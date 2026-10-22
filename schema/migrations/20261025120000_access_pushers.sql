-- People who can push to the project on GitHub, read by the live app every 15 minutes
-- (app/worker/employee-access/pushers.ts). Each one's email joins the previews' sign-in list alone.
-- Keyed on GitHub's numeric id, so a renamed account is neither dropped nor added twice.
-- `email_source`: `owner` typed it and it wins; `profile` or `commit` the app found it; NULL none yet.
CREATE TABLE wong_access_pushers (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  github_id INTEGER NOT NULL CHECK (github_id > 0),
  login TEXT NOT NULL,
  email TEXT CHECK (email = lower(trim(email))),
  email_source TEXT CHECK (email_source IN ('owner', 'profile', 'commit')),
  checked_at TEXT,
  PRIMARY KEY (installation_id, github_id),
  CHECK ((email IS NULL) = (email_source IS NULL))
);
-- The last read's outcome: a failed one keeps the list as it was, and Access says so.
CREATE TABLE wong_access_pusher_reads (
  installation_id TEXT PRIMARY KEY REFERENCES wong_access_installation(installation_id),
  status TEXT NOT NULL CHECK (status IN ('listed', 'unavailable')),
  read_at TEXT NOT NULL
);
-- Which sign-ins a `sessions` job ends: `both` for a person removed in Access, `previews` when only a pusher left.
ALTER TABLE wong_access_work ADD COLUMN scope TEXT NOT NULL DEFAULT 'both' CHECK (scope IN ('both', 'previews'));
