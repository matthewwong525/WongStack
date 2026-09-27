# Design

## Context

See proposal.md — Why. The current state that shapes the approach:

- Keys: `memory_keys (hash, email, role, created_at)` (`migrations/0002_keys.sql`). `memory-worker.mjs` looks up the bearer's hash, then runs any D1 batch that doesn't match `KEYS_GUARD`. Only `lib/members.mjs` writes keys, with the admin's `CLOUDFLARE_API_TOKEN` straight to Cloudflare. `add` deletes every row for the email before it inserts, so a key is one per email.
- Key shape: `wongm_<base64url(email)>.<random>`. `store.mjs` `keyEmail()` routes on it, and transcripts are filed under that email.
- Team: `components.memory.team` in the committed `.claude/.wong-stack.json`, set by `member add` (`digest.mjs:22` reads it).
- The client's write statements (`memory.mjs:103-122`, `:381`, `:418`): session upsert (`INSERT … ON CONFLICT (id) DO UPDATE`), `UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE …`, `INSERT OR IGNORE INTO tags`/`fact_tags`, `INSERT INTO facts`, `INSERT INTO runs`, and `schema_migrations`, which only `migrate` sends, with the admin token. The client sends no `DELETE`.
- `session-start.mjs` has a 1.5 s store budget inside a 5 s hook timeout, and already spawns detached children (`run.mjs`).
- `gh` is a required, authenticated tool (`wiki/development/required-tools.md`). Its default scopes are `repo`, `read:org`, `gist`, and optionally `workflow`; `GET /user/emails` needs `user:email` or `user`.
- `scripts/cf-deploy.sh` runs `wrangler deploy` for production only on the production branch in CI.

## Goals / Non-Goals

**Goals:** the delta specs. Keep one client code path: `join` is the only new request shape, and it goes to the same Worker.

**Non-Goals:** a GitHub OAuth app; Cloudflare Access in front of `/_memory/`.

## Decisions

### GitHub is the identity provider, through the person's own `gh` token

`memory.mjs join` runs `gh auth token` and POSTs `{ token, machine, email }` to `<worker>/join`. The Worker calls:

1. `GET https://api.github.com/repos/<GITHUB_REPOSITORY>` with the token. A 404 or 403 means no access. Otherwise `private` and `permissions.{pull,push}` decide: a private repo needs `pull`, a public one `push`.
2. `GET /user/emails`. A 403/404 whose scopes lack `user:email` returns `needs_scope`. Choose the requested email if it is `verified`, else the `primary` verified one.

Then it deletes this machine's joined row for that email, inserts the new hash with `expires_at = now + 30 d`, and returns `{ key, email, role, expiresAt }`. The GitHub token lives only in the request scope. `GITHUB_API` in `env` overrides `https://api.github.com` for tests.

- *Cloudflare Access with GitHub login:* rejected. It needs `cloudflared` or a browser round-trip on every machine, plus Zero Trust setup per repo.
- *A GitHub OAuth app (device flow) with only `read:user user:email`:* narrower token, but every repo would need its own registered OAuth app and client ID. Revisit if sending a `repo`-scoped token proves unacceptable.
- *An admin-issued invite code:* keeps a manual step, which the user declined.

### The Worker's repository comes from CI

`cf-deploy.sh`'s production branch adds `--var GITHUB_REPOSITORY:$GITHUB_REPOSITORY`. A Worker without it answers `join` with 503 `no_repo`. The var is not a secret. Staging and previews already 404 on `/_memory/`, so they don't need it.

- *Write the slug into `wrangler.jsonc` at setup:* rejected. A fork or a rename would silently check the wrong repo.

### Schema 3: machine and expiry on each key

`0003_key_machines.sql` adds `machine TEXT` and `expires_at TEXT` (both nullable). Old rows keep `NULL`: no machine and no expiry. A joined row is keyed on `(email, machine)` for replacement. `member add` replaces only rows with `machine IS NULL`, and `member remove` deletes every row for the email. The grant lookup becomes:

```sql
SELECT email, role, expires_at,
       (SELECT count(DISTINCT email) FROM memory_keys) > 1 AS team
FROM memory_keys WHERE hash = ?
```

It stays one query per request. An expired `expires_at` answers 401 `key_expired`. The Worker writes this table only from its own join handler; `KEYS_GUARD` still refuses every client statement that names it.

### Member statements go through an allowlist

`memory.mjs` exports its write statements as named constants, each with the index of its author parameter: the session upsert (`author`, index 2), `INSERT OR IGNORE INTO tags` (`created_by`, 3), `INSERT INTO facts` (`author`, 6), `INSERT OR IGNORE INTO fact_tags`, `INSERT INTO runs`, and the supersede `UPDATE` (no author). The Worker imports the same table. For `role = 'member'`, each statement in a batch must either:

- equal one of those constants after whitespace is collapsed, with its author parameter equal to the grant's email; or
- be a read: start with `SELECT` or `WITH`, and contain no `INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|PRAGMA|ATTACH|VACUUM` word once string literals and comments are stripped.

Anything else fails the whole batch with 403 `member_write` before `db.batch` runs. Admin keys skip the check. Since the constants are shared, changing a write statement changes the allowlist with it.

The supersede `UPDATE` is built as `SUPERSEDE + ' WHERE …'`. Its exported form includes the full `WHERE`, so it matches exactly and always carries `superseded_by IS NULL`.

Through a memory key, `ctx.author` becomes `keyEmail(token)`. The personal-fact filter (`digest.mjs`) adds that email to the person's emails. Only a Cloudflare-token store (not yet moved) keeps `git config user.email`.

- *Pattern matching on SQL for writes:* rejected. Exact statements are stricter and need no SQL parsing.
- *A read-only D1 binding for members:* D1 has none.
- *Named operations (`/_memory/op/add-fact`) instead of raw SQL:* stronger, but it rewrites the client's store layer.

### Team comes from a response header

The Worker sets `Wong-Memory-Team: 1|0` on every authenticated response. `store.mjs` records the last value in `<stateDir>/team.json`, and `loadConfig` returns `team: memory.team === true || cachedTeam`. A header, not a body field, because the D1 and R2 response bodies mirror Cloudflare's REST shapes.

### Session start delegates to a detached `join`

`session-start.mjs`, before the digest:

- No token and a recorded `worker` → spawn `memory.mjs join --background` detached, then print one line.
- A joined key (`<stateDir>/key.json` holds `{ email, machine, expiresAt }`, written by `join`) expiring within 7 days, or a 401 `key_expired` from the digest fetch → the same, as "renewing".
- `<stateDir>/join-error.json` present (`gh` not signed in, `needs_scope`, `no_access`, `no_repo`) → print its message and fix, and spawn nothing. `join` run by hand clears it.
- `WONG_MEMORY_RUN=1` → skip, as the background run already does.

`--background` writes failures to `join-error.json` rather than stdout. Network failures are not recorded, so the next session retries.

### Machine name

`os.hostname()`, with a 6-character random suffix stored in `<stateDir>/key.json` on first join, so two machines with the same hostname don't replace each other. The suffix is per clone, which is right: each clone has its own primary `.env`.

## Risks / Trade-offs

- [A teammate's `repo`-scoped GitHub token reaches a Worker the repo's admin deploys] → the same admin's scripts already run locally with that token; the Worker never stores it, and it never takes the repository or the GitHub address from the request; documented on the memory page, with the OAuth-app alternative.
- [Someone who leaves keeps access for up to 30 days] → `member remove` cuts it at once; documented.
- [The read check is a word scan over SQL] → writes must match exact statements; reads are scanned outside literals and comments, and batches are refused atomically. Tests cover each forbidden verb with case and comment tricks.
- [An old `gh` login lacks `user:email`] → a one-time `gh auth refresh -h github.com -s user:email`, printed by `join` and the hook; `required-tools.md` asks for it up front.
- [A production deploy must land before anyone can join] → `join` says so (`no_repo`, or 404 on an undeployed route), and the manual `member add` still works.

## Migration Plan

1. Merge: CI deploys the route and sets `GITHUB_REPOSITORY`.
2. The admin runs `memory.mjs migrate` once (admin token), to add the columns. Until then, `join` answers 500 and old keys keep working, because the grant query falls back when `expires_at` is missing. `/wong-sync` in installed repos plans the same `migrate` step.
3. Rollback: revert the route; the extra columns are harmless to the old code.

## Open Questions

- Whether `join` should also let an org's outside collaborators in; today GitHub's `permissions` field decides, and that is accepted.
