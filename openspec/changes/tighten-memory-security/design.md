# Design

## Context

See proposal.md for why. The pieces this change touches:

- `lib/digest.mjs` `formatFact` prints `author.split('@')[0]`, for the digest, search, show, and the home part.
- The Worker's `join` (`worker/memory-worker.mjs`) makes an admin key when `memory_keys` already holds an admin row for the joiner's verified email. It calls GitHub twice (`/repos/<repo>`, `/user/emails`) and never learns the account id.
- `member add <email> [--admin] [--env]` (`lib/members.mjs`) makes a key with no machine and no expiry: printed for a teammate, or written to `.env` for the admin. Setup (`wong-setup/scripts/provision.mjs`) runs `member add <email> --admin --env`. Rows from before schema 3 have no expiry either.
- `join` replaces the key for `(email, machine)`. A clone that loses `key.json` gets a new random machine suffix, so rows pile up without limit.
- `memory.mjs strip` uploads the redacted transcript with `putObject`, and the Worker's R2 PUT stores any size. Today's largest local transcript is about 26 MB; a Worker request body can reach 100 MB.
- The session-start hook runs `join --background` when there is no key, when `key.json`'s `expiresAt` is within 7 days, or when the store answers `key_expired`.

## Goals / Non-Goals

**Goals:** a fact names its author's whole email; admin comes from a linked GitHub account id; every key expires and none is made for another person; at most 10 live keys per GitHub account; at most 50 MB per stored transcript, enforced by the Worker.

**Non-Goals:** a per-person total storage cap; closing the reader's tag and run writes; any join path besides GitHub.

## Decisions

**1. Full emails.** `formatFact` prints `fact.author || 'unknown'` whole, in every repo. The digest's 40-line and 6 KB caps already bound it; a longer author only means one fact fewer in a full digest.

**2. Migration `0005_admin_accounts.sql`.**

```sql
CREATE TABLE IF NOT EXISTS memory_admins (github_id TEXT PRIMARY KEY, login TEXT, email TEXT NOT NULL, created_at TEXT NOT NULL);
ALTER TABLE memory_keys ADD COLUMN github_id TEXT;
UPDATE memory_keys SET expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE expires_at IS NULL;
```

The link lives in its own table because expiry and the cap delete key rows, and the link must outlive them. The `UPDATE` stops every key that never ended; its machine gets `key_expired`, so the hook rejoins through GitHub at the next start. `KEYS_GUARD` becomes `/memory_keys|memory_admins|writable_schema/i`, so no key reads or writes the link.

*Alternative:* give old keys 30 more days. Rejected: it keeps hand-sent keys working for a month after the user said no key is handed out.

**3. Join grants admin by account id.** `join` adds a third GitHub call, `GET /user`, for `id` and `login`. Role is admin when `memory_admins` holds that `id`; the email no longer decides. Every joined row stores `github_id`. On a store without `memory_admins` (the Worker deployed, the admin not yet migrated), the lookup fails with `no such table`, and the join goes on as member or reader: nobody becomes admin through join until the admin migrates, and the old keys keep working until then.

**4. The key cap.** The join's batch, in order: delete this machine's key (`machine = ? AND (email = ? OR github_id = ?)`); delete the account's expired keys; delete the account's keys on other machines beyond its 9 newest by `created_at`; insert the new key. A renewal rewrites `created_at`, so *oldest* means the machine that joined longest ago. `KEY_LIMIT = 10` sits beside `KEY_DAYS`.

**5. `member admin` replaces `member add`.** `member admin` runs with `CLOUDFLARE_API_TOKEN` like the other member commands. It reads the GitHub account from `gh api user` and the email from `git config user.email`, and stops, changing nothing, when either is missing. In one batch it upserts `memory_admins`, replaces this machine's key, and inserts an admin key with this machine's name (join's `machineName`), `github_id`, and a 30-day `expires_at`. It writes the key to the primary `.env` by `writeEnvKey`, and `key.json` with `{ email, role: 'admin', machine, expiresAt }`, so the hook renews it through join, which now finds the linked account. It never prints a key. `member add` answers with a usage error that says teammates join through GitHub and the admin's own key comes from `member admin`. `member remove <email>` also deletes that email's `memory_admins` rows. `member list` adds each key's GitHub id and a line per linked admin (login and email).

*Alternative:* keep `member add --admin --env` and drop only the printed path. Rejected: a flag pair that must always be given is a second name for one command.

**6. `migrate` links the admin once.** After applying `0005`, `migrate` checks `memory_admins`; when it is empty and `gh api user` answers, it links that account with the git email and says so. Without `gh`, it says to run `member admin`. It writes no key: the admin's old key stopped with the migration, and the next session's join gives an admin key. Setup runs `migrate`, then `member admin` when `.env` has no key, as it ran `member add` before; the link is an upsert, so running both is harmless.

**7. The 50 MB cap.** `MAX_TRANSCRIPT_BYTES = 50 * 1024 * 1024` is exported by `memory-worker.mjs`. The R2 PUT answers 413 `too_large` when `Content-Length` says more, and again when the body read is larger (a request without the header). `strip` measures the redacted body first. Over the cap, it uploads nothing and records `raw_key` null with the real `raw_bytes`, and its output tells the capture model the record was not kept. The capture still writes the session's facts. `source` reads `raw_bytes` and says the transcript was N MB, over the 50 MB limit, so it was not kept.

## Risks / Trade-offs

- **Everyone rejoins at once.** The migration stops every key without an end date; each machine loses fresh memory for one session (the cached digest still shows) while the hook joins. → The CHANGELOG *Updating* note says so.
- **A hand-keyed teammate without GitHub access loses memory.** → Intended; the note says to give them repo access on GitHub.
- **An admin who migrates without `gh` signed in joins as a member next session.** → `migrate` prints the `member admin` fix, and `join`'s report names the role.
- **Unlinking by accident.** `member remove <admin email>` also removes the admin link. → `member list` shows the link; `member admin` restores it.
- **A third GitHub call per join.** One more request, once per 23 days per machine. → None needed.
- **A big session's text is lost.** A 60 MB session keeps its facts but not its full record. → `source` says why.

## Migration Plan

1. Ship; CI deploys the Worker. Until migration, joins make no admin, and old keys keep working.
2. The admin runs `memory.mjs migrate` once, with `gh` signed in. It applies `0005`, links their GitHub account, and stops the keys that never ended.
3. Each machine rejoins at its next session start; the admin's comes back as admin.

Rollback: redeploying the previous Worker brings back email-based admin; the new columns and table are ignored by old code.
