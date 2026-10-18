-- Remote MCPs anyone signed in adds, and each person's own sign-in to them: wiki/stack/mcp-connections.md.
-- Every sign-in, code verifier and client registration is sealed with WONG_MCP_SEAL before it is stored here,
-- so a route reading this shared database without that secret gets nothing it can use. Additive.
CREATE TABLE wong_mcp_servers (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  id TEXT NOT NULL CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*' AND length(id) <= 40),
  name TEXT NOT NULL CHECK (name = trim(name) AND name != '' AND length(name) <= 60),
  url TEXT NOT NULL,
  resource TEXT NOT NULL,
  authorize_endpoint TEXT NOT NULL,
  token_endpoint TEXT NOT NULL,
  registration_endpoint TEXT NOT NULL,
  -- `none` when the service takes a client with no secret, else `client_secret_post`.
  auth_method TEXT NOT NULL CHECK (auth_method IN ('none', 'client_secret_post')),
  -- Sealed JSON keyed by the app's address: each copy (live, staging, a preview) registers its own return address.
  registration TEXT,
  scopes TEXT NOT NULL DEFAULT '',
  -- One saved tool list per MCP, the same for everyone: search reads it and never calls the MCP.
  tools_json TEXT,
  tools_at TEXT,
  instructions TEXT,
  added_by TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (installation_id, id),
  UNIQUE (installation_id, url)
);

-- Each person's own sign-in to an MCP. `share` lets the team use it: `read` for look-ups only, `all` for every tool.
CREATE TABLE wong_mcp_connections (
  installation_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Sealed JSON: the access and refresh tokens and when the access one ends. Null once the service ended it.
  tokens TEXT,
  account_label TEXT,
  connected_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'connected' CHECK (state IN ('connected', 'reconnect')),
  -- One renewal at a time: a call takes this lease before it asks for a new sign-in.
  refresh_lease_until TEXT,
  share TEXT NOT NULL DEFAULT 'none' CHECK (share IN ('none', 'read', 'all')),
  PRIMARY KEY (installation_id, server_id, email),
  FOREIGN KEY (installation_id, server_id) REFERENCES wong_mcp_servers(installation_id, id) ON DELETE CASCADE
);
-- One shared sign-in per MCP, so whose account a teammate's call uses is never in doubt.
CREATE UNIQUE INDEX wong_mcp_one_share ON wong_mcp_connections (installation_id, server_id) WHERE share <> 'none';

-- A Connect in progress: good once, for the person who pressed it, for ten minutes.
CREATE TABLE wong_mcp_sign_ins (
  state TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  origin TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (installation_id, server_id) REFERENCES wong_mcp_servers(installation_id, id) ON DELETE CASCADE
);
