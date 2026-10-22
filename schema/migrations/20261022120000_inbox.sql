-- The inbox mini app (app/worker/apps/inbox/): what waits on each signed-in person, the taps they made on it, and
-- when their computer last checked in. Every row belongs to one person of one installation. Additive only.
-- Times are milliseconds since 1970. An installation whose owner never opened Access keys its rows on ''.
CREATE TABLE inbox_items (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'approval', 'question')),
  title TEXT NOT NULL,
  workspace TEXT NOT NULL,
  -- A plan's HTML, or an approval's or question's JSON; emptied once the item closes.
  body TEXT NOT NULL,
  actions TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  closes_at INTEGER NOT NULL,
  closed_at INTEGER,
  PRIMARY KEY (installation_id, email, id)
);
CREATE TABLE inbox_taps (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  text TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  -- `delivering` is a tap the computer collected: it can no longer be cancelled, and fails if no result comes.
  state TEXT NOT NULL CHECK (state IN ('waiting', 'delivering', 'sent', 'failed', 'changed', 'cancelled', 'expired')),
  claimed_at INTEGER,
  answered_at INTEGER,
  PRIMARY KEY (installation_id, email, id)
);
CREATE INDEX inbox_taps_item ON inbox_taps(installation_id, email, item_id);
CREATE TABLE inbox_seen (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  last_checkin_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, email)
);
