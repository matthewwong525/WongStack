-- Tools the owner or an Admin added from a chat, used directly like a key in the code, live only:
-- wiki/stack/connect-your-tools.md. The key itself is the Worker secret TOOL_<ID>, never a column. Additive only.
CREATE TABLE tools (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  docs TEXT NOT NULL,
  -- How the app reaches the tool: address, header and the requests that only read, as keys.ts's `forward`.
  forward_json TEXT NOT NULL,
  -- The levels Access offers for it: ["read"] or ["read","write"].
  levels_json TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at TEXT NOT NULL
);
