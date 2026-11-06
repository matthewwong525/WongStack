-- Keys the owner or an Admin sent to the live app, each sealed with the publish's public key: the app can not open
-- one. The next publish opens each, puts it in the app's secrets and deletes the row: wiki/stack/connect-your-tools.md
CREATE TABLE sealed_keys (
  -- The secret's name, such as TOOL_SHOPIFY: a newer key for the same name replaces a waiting one.
  name TEXT PRIMARY KEY,
  -- The sealed value as JSON, {v, wrapped, iv, data}; no route reads it back.
  sealed TEXT NOT NULL,
  -- The key's last four characters, the only part a person sees again.
  ends TEXT NOT NULL,
  sent_by TEXT NOT NULL,
  -- When it was sent, in milliseconds: the publish deletes a row only while it still holds this time.
  sent_at INTEGER NOT NULL
);
