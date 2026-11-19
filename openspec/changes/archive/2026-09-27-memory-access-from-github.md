<!-- openspec-archive v1 2026-09-27-memory-access-from-github -->
<!-- file proposal.md utf8 10465 -->
# Memory access comes from GitHub

**Status:** ready-to-ship
**Branch:** explore-memory-token-setup
**Open questions:** none

## Why

When a teammate clones a WongStack repo, they get none of its memory. Today the person who set the repo up has to make a key, copy it, and send it privately. The teammate then pastes it into a hidden file. Until someone does that, the teammate's sessions start with no past facts, which feels broken. Keys are also one per person, so setting up a second laptop quietly stops the first one.

## What Changes

- **A teammate gets memory on their first session, with no key to send.** Their computer already has GitHub signed in. The first session sees there is no memory key, asks GitHub whether this person can reach the repo, and saves a key on this computer. Memory loads from the next session on.
  ```text
  teammate clones the repo
        │
        ▼
  first session: no memory key
        │
        ▼
  ask GitHub: can they reach it?
     │ yes              │ no
     ▼                  ▼
  key saved on     "ask the owner
  this computer     for access"
     │
     ▼
  next session: memory loads
  ```
- **Who gets in depends on the repo.** On a private repo, anyone who can see it. On a public repo, which anyone on GitHub can see, only people who can make changes to it. Strangers get nothing.
- **Each computer has its own key.** A second laptop no longer knocks out the first. The owner's list of who has access shows each computer.
- **Keys expire and renew on their own.** A key lasts 30 days and renews quietly while the person still has GitHub access. Someone who loses access to the repo loses memory within 30 days. The owner can still cut anyone off at once.
- **Teammates can add facts, but not change or delete them.** Memory already works by adding a newer fact that replaces an older one, and teammates keep that. Only the owner can edit or delete stored facts. This closes a gap where any teammate could wipe the store.
- **A fact always names who really wrote it.** A teammate can no longer save a fact under someone else's name: the memory service checks the name against the key.
- **The manual way still works.** The owner can still make a key by hand for someone without GitHub access. Keys made before this change keep working.

**Non-goals:** Signing in through anything other than GitHub. Changing who can read which chat transcripts: each person still reads only their own, and the owner reads all.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-store`: a teammate joins through GitHub with a per-machine, expiring member key; the Worker checks repo access with the person's GitHub token and a verified email; member keys may add and supersede but not otherwise update or delete; the team mode comes from the store's keys; `member add`/`remove`/`list` handle per-machine keys and expiry.
- `memory-recall`: the session-start hook starts a join when no key is set, and a renewal when the key is near expiry, without waiting for either.

## Impact

- `.agents/skills/memory/worker/memory-worker.mjs`: new `POST /_memory/join` route (GitHub checks, key minting), expiry check on every key, member statement allowlist, team header.
- `.agents/skills/memory/migrations/0003_key_machines.sql`: `machine` and `expires_at` columns on `memory_keys`.
- `.agents/skills/memory/scripts/memory.mjs`, `lib/store.mjs`, `lib/members.mjs`: `join` command, team from the Worker's header, per-machine `member` commands, author from the key.
- `.agents/skills/memory/scripts/session-start.mjs`: detached join or renewal.
- `scripts/cf-deploy.sh`: production deploy passes `GITHUB_REPOSITORY` to the Worker as a var.
- `wiki/development/memory.md`, `wiki/development/required-tools.md` (`gh` `user:email` scope), `.env.example` comment, `.agents/skills/wong-setup/references/cloudflare.md`.
- Tests: `scripts/tests/memory-worker.test.mjs`, `memory-store.test.mjs`, `memory-capture.test.mjs`, a deploy test for the var.
- Installed repos get the route through `/wong-sync`; the admin runs `memory.mjs migrate` once for the new columns.
- `VERSION` 25.4.0 → 25.5.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked whether the memory key should live in the repo or be made at setup → explored; committing a key was ruled out because a repo can be public, git history keeps it forever, and one shared key would end per-person transcript privacy.
- **2026-09-27** — Asked how a teammate should get memory access → chose automatic, through GitHub.
- **2026-09-27** — Asked who should get in automatically → chose anyone who can read the repo.
- **2026-09-27** — Asked what happens on a public repo, where anyone can read it → chose to require push access on a public repo; read access is enough on a private one.
- **2026-09-27** — Asked how fast memory access should stop when someone loses GitHub access → chose keys that expire and renew quietly.
- **2026-09-27** — Asked what a teammate's key may do with shared facts → chose add and supersede, but not edit or delete.
- **2026-09-27** — Assumed: a joined key lasts 30 days and renews when 7 or fewer days are left, because a month bounds a leaver's access without making anyone sign in again.
- **2026-09-27** — Assumed: the admin's key from setup never expires, and keys made before this change keep no expiry, because nothing about them changes and existing teammates should not lose access.
- **2026-09-27** — Assumed: identity is an email GitHub has verified, preferring the one in `git config user.email`, because transcripts are filed by email and a `git config` email can be typed by anyone.
- **2026-09-27** — Assumed: the person's `gh` login needs the `user:email` scope, and without it the join names the one `gh auth refresh` command, because `gh`'s default scopes cannot read verified emails.
- **2026-09-27** — Assumed: the join sends the person's `gh` token to the repo's own production Worker, which uses it for two GitHub calls and never stores it, because the repo's scripts already run on that machine with the same token, and GitHub offers no narrower proof without an OAuth app per repo.
- **2026-09-27** — Assumed: the Worker learns its repo from a `GITHUB_REPOSITORY` var that CI's production deploy sets, because the client's own claim cannot be trusted and CI already knows the slug.
- **2026-09-27** — Assumed: the session-start hook starts the join in the background and memory loads next session, because the hook must end within its time budget and a join makes network calls to GitHub.
- **2026-09-27** — Assumed: a join by an email that already holds an admin key gets an admin key, because the owner's second laptop should work the same as the first.
- **2026-09-27** — Assumed: the team mode comes from the store (more than one email holds a key), sent as a response header, because an automatic join cannot save the committed `components.memory.team` flag. The flag still counts when set.
- **2026-09-27** — Assumed: member writes are limited by an allowlist of statement shapes the memory script sends, because D1 has no per-statement permissions.
- **2026-09-27** — Assumed: a minor release, because existing keys and commands keep working and the new columns come from an additive migration.
- **2026-09-27** — Asked whether someone can spoof a GitHub email, or claim to be a teammate from a copy of the repo → explained that the Worker trusts only GitHub's verified emails for the token's own user, and only its own deployed repository; offered to add a check that a fact's author is the key's owner and tests that a request cannot change the repository or the GitHub address.
- **2026-09-27** — Assumed: `/ship this is good` accepts the recommended option — add the author check and those tests — because it was the recommended answer on the last three asks.
- **2026-09-27** — Assumed: through a memory key, the script writes the key's email as a fact's author, and the current person's emails include it, because a joined key can carry a verified email that differs from `git config user.email`.
- **2026-09-27** — Assumed: member writes must match the script's exact write statements, not a pattern, and the Worker checks the author parameter of each, because that is stricter and simpler than parsing SQL.
- **2026-09-27** — Main moved to 25.4.0 (#140) before the ship; fast-forwarded to `4176864`, and this release is 25.5.0.
- **2026-09-27** — Found while building: triggers from schema 1 already refuse every edit and delete of a fact's content, for every key. The member gap was a key dropping those triggers, hiding facts through `superseded_by`, or deleting sessions, tags, and runs. The allowlist closes all three, and its test covers each.
- **2026-09-27** — Assumed: the new tests live in `scripts/tests/memory-worker.test.mjs`, beside the route's fakes, not in `memory-store`/`memory-capture` as the tasks first said, because every scenario needs the real route over a fake GitHub.
- **2026-09-27** — Assumed: `cf-deploy.sh` falls back to the `origin` remote for the repository, because Workers Builds sets no `GITHUB_REPOSITORY`.
- **2026-09-27** — Assumed: a background join keeps only failures the person must fix (`gh` signed out, missing scope, no access, no verified email); an undeployed or unmigrated store is retried each session, because it clears on its own.
- **2026-09-27** — Assumed: one join runs at a time per clone (a lock in the state folder), because two sessions starting together would each replace the other's key.
- **2026-09-27** — Built and checked locally: oxlint, 291 script tests with the c8 floor (9 browser tests skipped with no Chrome), payload links, retired names, and the OpenSpec config. shellcheck is not installed here; CI runs it.
- **2026-09-27** — Distilled before the archive: the store held no facts for this change or its branch; the repeatable knowledge (joining through GitHub, member limits, the `user:email` scope) is already in `wiki/development/memory.md` and `required-tools.md` in this change. No other repeatable fact.
- **2026-09-27** — Archived and checkpointed for CI on branch `explore-memory-token-setup`; specs synced (`memory-store`, `memory-recall`), and `openspec validate --specs --strict` passes 48 of 48. Main moved to 25.4.1 (#141) during the build and is merged in; this release stays 25.5.0.

<!-- end proposal.md -->
<!-- file design.md utf8 8828 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5155 -->
# Tasks

## 1. Key schema and the Worker's checks

- [x] 1.1 Add `.agents/skills/memory/migrations/0003_key_machines.sql` (nullable `machine`, `expires_at` on `memory_keys`). In `memory-worker.mjs`, change the grant lookup to return `expires_at` and `team` in one query, falling back to the old query when the columns are missing; answer 401 `key_expired` past expiry; set `Wong-Memory-Team` on every authenticated response. Tests in `scripts/tests/memory-worker.test.mjs`: an expired key runs nothing, a `NULL`-expiry key works, the header flips when a second email gets a key, and a pre-migration table still serves old keys.
- [x] 1.2 Move the memory script's write statements into a shared module with their author indexes, used by `memory.mjs` and `memory-worker.mjs`. Add the member check: exact writes with the author equal to the key's email, and scanned reads. Tests: every shared statement passes as a member with its own email; a fact, tag, or session under another author answers 403; `DELETE`, `UPDATE facts SET body`, `INSERT OR REPLACE`, `DROP`, `PRAGMA`, `ATTACH`, mixed case, comments, and a bad statement hidden in a batch each answer 403 `member_write` with nothing run; an admin key still runs a `DELETE`.
- [x] 1.3 Through a memory key, write the key's email as the author (`store.mjs` / `memory.mjs`), and add it to the person's emails in `digest.mjs`. Tests in `memory-worker.test.mjs`: a fact written with a key for `ana@example.com` while `git config` says `dev@example.com` is stored under Ana's email, and her supersede and search work in a team.

## 2. Joining through GitHub

- [x] 2.1 Add `POST /_memory/join` to `memory-worker.mjs`: `GITHUB_REPOSITORY` from `env` (503 `no_repo` without it), `GITHUB_API` override, the repo check (private → `pull`, public → `push`), the verified-email choice, `needs_scope`, admin carry-over, the replace keyed on `(email, machine)`, 30-day expiry, and no logging of the token. Tests against a fake GitHub API: every scenario in the "joins memory" requirement, a join request naming another repository or GitHub address is ignored (the fake GitHub sees only the Worker's own repository), and a spy on `console` proving the token never appears.
- [x] 2.2 Add `memory.mjs join [--background]` in a new `lib/join.mjs`: `gh auth token`, machine name plus stored suffix, POST, write `.env` through `members.mjs`'s `writeEnvKey`, `<stateDir>/key.json`, and `join-error.json` in background mode. Give it a `--help`. Make the missing-token message name `join`. Record `team.json` from the header in `store.mjs`, and read it in `loadConfig`. Tests in `memory-worker.test.mjs` with a fake `gh` and the real route over a fake GitHub: success writes `.env` and prints no key, each refusal changes no file and prints its fix, renewal replaces the key, and the team header turns on the personal-fact filter.
- [x] 2.3 `scripts/cf-deploy.sh`: production `wrangler deploy` passes `--var GITHUB_REPOSITORY:$GITHUB_REPOSITORY`; staging does not. Test with the fake wrangler in the existing deploy test.

## 3. Admin commands per machine

- [x] 3.1 `lib/members.mjs`: `add` replaces only `machine IS NULL` rows; `remove` deletes every row for the email; `list` prints email, role, machine, and expiry. Tests in `memory-worker.test.mjs`, including the "list shows each machine" and "removed with joined keys" scenarios.

## 4. Session start

- [x] 4.1 `session-start.mjs`: spawn a detached `join --background` when there is no token, when `key.json` expires within 7 days, or on a `key_expired` digest error; print one line; print `join-error.json`'s reason and fix instead of spawning; skip under `WONG_MEMORY_RUN=1`. Tests in `memory-worker.test.mjs`: each scenario in the "joins and renews in the background" requirement, and the hook still ends within its timeout when the fake Worker hangs.

## 5. Docs and release

- [x] 5.1 `wiki/development/memory.md` "The memory key" and "Add or remove a teammate": joining through GitHub, who gets in, per-machine keys, expiry, what members may write, the `repo`-scoped token trade-off, and `migrate` after upgrading. `wiki/development/required-tools.md`: `gh` needs `user:email`, beside the `workflow` section. `.env.example`: the memory key comment names `join`. `.agents/skills/wong-setup/references/cloudflare.md`: teammates join on their own; `member add` is the fallback. `.agents/skills/memory/SKILL.md`: add `join`. Verified by `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs`.
- [x] 5.2 `.agents/skills/wong-sync/references/payload-manifest.md` memory section: installed repos run `memory.mjs migrate` once after syncing this release. Bump `VERSION` to 25.5.0 and add the `CHANGELOG.md` entry; `node scripts/check-openspec-config.mjs` passes.

## 6. Integration

- [x] 6.1 The payload checks pass locally (oxlint, 291 script tests with the c8 floor, links, retired names, OpenSpec config); `/ship`'s one `/save` checkpoint confirms `payload` and `test` in CI, with shellcheck, before the merge. The live join, after merge, production deploy, and `memory.mjs migrate`, is a memory thread: it cannot run before the merge.

<!-- end tasks.md -->
<!-- file specs/memory-recall/spec.md utf8 1462 -->
## ADDED Requirements

### Requirement: Session start joins and renews in the background

When a session starts in a repo that records a memory Worker, and the machine has no `CLOUDFLARE_MEMORY_TOKEN`, the session-start hook SHALL start `memory.mjs join` as a detached process and SHALL NOT wait for it. It SHALL do the same when the machine's joined key expires within 7 days, or has expired. It SHALL print one line saying that memory is being set up, or renewed, through GitHub and loads next session. When the last join on this machine failed for a reason the person must fix, the hook SHALL print that reason and its fix once per session and SHALL NOT start another join until the person runs `join` themselves. A background run started by the hook SHALL NOT start a join.

#### Scenario: A teammate's first session

- **WHEN** a teammate starts their first session in a fresh clone, with `gh` signed in
- **THEN** the hook prints that memory is being set up through GitHub, ends within its timeout, and the next session prints the digest

#### Scenario: A key near expiry

- **WHEN** a session starts and the machine's joined key expires in 5 days
- **THEN** the digest prints as usual, and a renewal starts in the background

#### Scenario: gh is not signed in

- **WHEN** the last join failed because `gh` is not signed in
- **THEN** each session prints that reason and the `gh auth login` fix, and starts no join until the person runs `memory.mjs join`

<!-- end specs/memory-recall/spec.md -->
<!-- file specs/memory-store/spec.md utf8 10195 -->
## MODIFIED Requirements

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the app's production Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention. The requirements below define how the production Worker serves it. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory, except an older store's token until its move finishes. No memory key SHALL be committed to the repository.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable, the page that owns it, and `memory.mjs join`
- **AND** no value is printed

#### Scenario: A teammate joins

- **WHEN** a teammate with access to the repo on GitHub needs memory access
- **THEN** they get a member key through `memory.mjs join`, not a Cloudflare token, and nobody sends them a key

### Requirement: The admin manages memory keys with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, and `member list` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`, straight to the memory database. `member add` SHALL create a random key for the email on this repo's store, store only its hash, with no expiry, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace the key `member add` made for it earlier, and SHALL leave the keys that email's machines got through `join`. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke every key of the email on this repo at once, joined keys included. `member list` SHALL print one line per key: its email, role, machine name, and expiry, and no key or hash. The script SHALL have no command that deploys a Worker. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`, and Ana has a key from `member add` and keys from two joined machines
- **THEN** the next call with any of Ana's keys is refused with 401

#### Scenario: The list shows each machine

- **WHEN** Ana joined from two machines and the admin runs `member list`
- **THEN** the list shows two lines for Ana, each with its machine name and expiry date, and no key or hash

#### Scenario: The token cannot write D1

- **WHEN** `member add` runs with a `CLOUDFLARE_API_TOKEN` that lacks `D1 Write`
- **THEN** the command stops, names that permission, and changes nothing

#### Scenario: No deploy command

- **WHEN** someone runs `memory.mjs worker deploy`
- **THEN** the script stops with its usage, and nothing is deployed

## ADDED Requirements

### Requirement: A person with GitHub access to the repo joins memory

The memory script SHALL have a `join` command that gets a member key for this machine without the admin. It SHALL read the person's GitHub token from the authenticated `gh` CLI and send it to the production Worker's join route, together with the machine's name and the person's `git config user.email`. The Worker SHALL learn its own repository from the `GITHUB_REPOSITORY` value set by CI's production deploy, and SHALL NOT take the repository, or the address it asks GitHub at, from the request. The Worker SHALL grant a key only when GitHub reports that the token's user can read the repository and the repository is private, or can push to it and the repository is public. The key's email SHALL be one of the user's GitHub-verified emails: the `git config` email when it is verified, and otherwise the primary verified email. The Worker SHALL NOT store or log the GitHub token. The key SHALL have the `member` role, unless the email already holds an `admin` key, and SHALL expire 30 days after it is made. `join` SHALL write the key to the primary checkout's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, SHALL NOT print it, and SHALL replace this machine's earlier joined key for the same email. When `gh` is not signed in, lacks the scope to read emails, or GitHub denies access, `join` SHALL change no file and SHALL print what the person can do next.

#### Scenario: A teammate on a private repo

- **WHEN** a person who can read a private repo runs `memory.mjs join`
- **THEN** `.env` holds a member key for their verified email, and `memory.mjs search deploy` returns facts

#### Scenario: A reader of a public repo

- **WHEN** a person who can read but not push to a public repo runs `memory.mjs join`
- **THEN** the Worker refuses with 403, no key is made, and `join` says to ask the repo's owner

#### Scenario: A stranger

- **WHEN** a person GitHub does not let see the repo runs `memory.mjs join`
- **THEN** the Worker refuses with 403, and no key is made

#### Scenario: An email GitHub has not verified

- **WHEN** `git config user.email` is `ana@example.com`, which is not among the person's verified GitHub emails, and their primary verified email is `ana@work.com`
- **THEN** the key is made for `ana@work.com`, and `join` names that email

#### Scenario: gh cannot read emails

- **WHEN** the person's `gh` token lacks the scope to read their emails
- **THEN** no key is made, and `join` prints the one `gh auth refresh` command that adds it

#### Scenario: A second machine

- **WHEN** Ana joins on a second machine
- **THEN** both machines' keys work

#### Scenario: The owner on a new laptop

- **WHEN** the person whose email holds the admin key joins on a new machine
- **THEN** the new key has the `admin` role and expires in 30 days

#### Scenario: A copy of the repo names another repository

- **WHEN** someone who owns a fork, but cannot read the original private repo, sends a join request that names their fork or another GitHub address
- **THEN** the Worker checks only its own repository at GitHub's own address, refuses with 403, and makes no key

#### Scenario: A Worker deployed without its repository

- **WHEN** the production Worker has no `GITHUB_REPOSITORY` value and someone runs `join`
- **THEN** the Worker refuses, and `join` says that production must be deployed by CI first

### Requirement: Joined keys expire and renew

The Worker SHALL refuse an expired key with HTTP 401 and a code that says it expired. A key with no expiry SHALL never expire; this covers the admin key made at setup, keys from `member add`, and every key made before expiry existed. Running `join` again SHALL renew a key: it SHALL check GitHub access again, and SHALL replace this machine's key with a new one that expires 30 days later.

#### Scenario: A key runs out

- **WHEN** a joined key is 31 days old and has not been renewed
- **THEN** the Worker answers 401 with the expired code, and runs nothing

#### Scenario: A leaver tries to renew

- **WHEN** a person removed from the GitHub repo runs `join` on a machine whose key has not expired
- **THEN** the Worker refuses, and the machine's key keeps working only until it expires

#### Scenario: An old key

- **WHEN** a key made before this change is used
- **THEN** it works, and has no expiry

### Requirement: A member key adds facts under its own name but does not edit or delete them

The Worker SHALL let a `member` key run only reads and the exact write statements the memory script sends: inserts of facts, fact tags, tags, and runs, the upsert of a session row, and the update that marks a live fact as superseded. In a member's insert of a fact, a tag, or a session row, the author SHALL be the key's email. The Worker SHALL refuse any other statement from a `member` key with HTTP 403, and SHALL run no statement in that batch. When the memory script writes through a memory key, it SHALL write the key's email as the author, and SHALL count the key's email among the current person's emails. An `admin` key SHALL keep running any statement that does not name the key table.

#### Scenario: A member supersedes a fact

- **WHEN** a member's `/save` writes a fact that supersedes a live fact
- **THEN** the new fact is stored and the old one is marked superseded

#### Scenario: A member deletes a fact

- **WHEN** a member key sends `DELETE FROM facts WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member rewrites a fact

- **WHEN** a member key sends `UPDATE facts SET body = 'x' WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member writes under another name

- **WHEN** Ana's member key sends an insert of a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403, and no fact is stored

#### Scenario: A member hides one bad statement in a batch

- **WHEN** a member key sends a batch with an insert of a fact followed by a `DELETE`
- **THEN** the Worker answers 403, and neither statement runs

### Requirement: The store says when it is a team

The Worker SHALL tell the memory script, on every answered request, whether more than one email holds a key for the store. The memory script SHALL treat the repo as a team when `components.memory.team` is `true` or the Worker's last answer said so, and SHALL remember the Worker's answer on this machine for the next session.

#### Scenario: The owner's digest after a teammate joins

- **WHEN** a teammate has joined through GitHub, and `components.memory.team` is not set
- **THEN** from the owner's next session on, their digest and search show only their own `user` and `feedback` facts

<!-- end specs/memory-store/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 43648 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-27-memory-access-from-github</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-memory-access-from-github">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-memory-access-from-github</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When a teammate clones a WongStack repo, they get none of its memory. Today the person who set the repo up has to make a key, copy it, and send it privately. The teammate then pastes it into a hidden file. Until someone does that, the teammate's sessions start with no past facts, which feels broken. Keys are also one per person, so setting up a second laptop quietly stops the first one.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A teammate gets memory on their first session, with no key to send.</b> Their computer already has GitHub signed in. The first session sees there is no memory key, asks GitHub whether this person can reach the repo, and saves a key on this computer. Memory loads from the next session on.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">teammate clones the repo</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">first session: no memory key</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">ask GitHub: can they reach it?</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">   │ yes              │ no</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">   ▼                  ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">key saved on     &quot;ask the owner</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">this computer     for access&quot;</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">   │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">   ▼</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">next session: memory loads</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Who gets in depends on the repo.</b> On a private repo, anyone who can see it. On a public repo, which anyone on GitHub can see, only people who can make changes to it. Strangers get nothing.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Each computer has its own key.</b> A second laptop no longer knocks out the first. The owner's list of who has access shows each computer.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Keys expire and renew on their own.</b> A key lasts 30 days and renews quietly while the person still has GitHub access. Someone who loses access to the repo loses memory within 30 days. The owner can still cut anyone off at once.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Teammates can add facts, but not change or delete them.</b> Memory already works by adding a newer fact that replaces an older one, and teammates keep that. Only the owner can edit or delete stored facts. This closes a gap where any teammate could wipe the store.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A fact always names who really wrote it.</b> A teammate can no longer save a fact under someone else's name: the memory service checks the name against the key.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The manual way still works.</b> The owner can still make a key by hand for someone without GitHub access. Keys made before this change keep working.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Signing in through anything other than GitHub. Changing who can read which chat transcripts: each person still reads only their own, and the owner reads all.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether the memory key should live in the repo or be made at setup → explored; committing a key was ruled out because a repo can be public, git history keeps it forever, and one shared key would end per-person transcript privacy.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how a teammate should get memory access → chose automatic, through GitHub.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked who should get in automatically → chose anyone who can read the repo.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what happens on a public repo, where anyone can read it → chose to require push access on a public repo; read access is enough on a private one.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how fast memory access should stop when someone loses GitHub access → chose keys that expire and renew quietly.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what a teammate's key may do with shared facts → chose add and supersede, but not edit or delete.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a joined key lasts 30 days and renews when 7 or fewer days are left, because a month bounds a leaver's access without making anyone sign in again.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the admin's key from setup never expires, and keys made before this change keep no expiry, because nothing about them changes and existing teammates should not lose access.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: identity is an email GitHub has verified, preferring the one in <code>git config user.email</code>, because transcripts are filed by email and a <code>git config</code> email can be typed by anyone.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the person's <code>gh</code> login needs the <code>user:email</code> scope, and without it the join names the one <code>gh auth refresh</code> command, because <code>gh</code>'s default scopes cannot read verified emails.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the join sends the person's <code>gh</code> token to the repo's own production Worker, which uses it for two GitHub calls and never stores it, because the repo's scripts already run on that machine with the same token, and GitHub offers no narrower proof without an OAuth app per repo.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the Worker learns its repo from a <code>GITHUB_REPOSITORY</code> var that CI's production deploy sets, because the client's own claim cannot be trusted and CI already knows the slug.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the session-start hook starts the join in the background and memory loads next session, because the hook must end within its time budget and a join makes network calls to GitHub.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a join by an email that already holds an admin key gets an admin key, because the owner's second laptop should work the same as the first.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the team mode comes from the store (more than one email holds a key), sent as a response header, because an automatic join cannot save the committed <code>components.memory.team</code> flag. The flag still counts when set.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: member writes are limited by an allowlist of statement shapes the memory script sends, because D1 has no per-statement permissions.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, because existing keys and commands keep working and the new columns come from an additive migration.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether someone can spoof a GitHub email, or claim to be a teammate from a copy of the repo → explained that the Worker trusts only GitHub's verified emails for the token's own user, and only its own deployed repository; offered to add a check that a fact's author is the key's owner and tests that a request cannot change the repository or the GitHub address.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>/ship this is good</code> accepts the recommended option — add the author check and those tests — because it was the recommended answer on the last three asks.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: through a memory key, the script writes the key's email as a fact's author, and the current person's emails include it, because a joined key can carry a verified email that differs from <code>git config user.email</code>.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: member writes must match the script's exact write statements, not a pattern, and the Worker checks the author parameter of each, because that is stricter and simpler than parsing SQL.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Main moved to 25.4.0 (#140) before the ship; fast-forwarded to <code>4176864</code>, and this release is 25.5.0.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Found while building: triggers from schema 1 already refuse every edit and delete of a fact's content, for every key. The member gap was a key dropping those triggers, hiding facts through <code>superseded_by</code>, or deleting sessions, tags, and runs. The allowlist closes all three, and its test covers each.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the new tests live in <code>scripts/tests/memory-worker.test.mjs</code>, beside the route's fakes, not in <code>memory-store</code>/<code>memory-capture</code> as the tasks first said, because every scenario needs the real route over a fake GitHub.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>cf-deploy.sh</code> falls back to the <code>origin</code> remote for the repository, because Workers Builds sets no <code>GITHUB_REPOSITORY</code>.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a background join keeps only failures the person must fix (<code>gh</code> signed out, missing scope, no access, no verified email); an undeployed or unmigrated store is retried each session, because it clears on its own.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: one join runs at a time per clone (a lock in the state folder), because two sessions starting together would each replace the other's key.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built and checked locally: oxlint, 291 script tests with the c8 floor (9 browser tests skipped with no Chrome), payload links, retired names, and the OpenSpec config. shellcheck is not installed here; CI runs it.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled before the archive: the store held no facts for this change or its branch; the repeatable knowledge (joining through GitHub, member limits, the <code>user:email</code> scope) is already in <code>wiki/development/memory.md</code> and <code>required-tools.md</code> in this change. No other repeatable fact.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived and checkpointed for CI on branch <code>explore-memory-token-setup</code>; specs synced (<code>memory-store</code>, <code>memory-recall</code>), and <code>openspec validate --specs --strict</code> passes 48 of 48. Main moved to 25.4.1 (#141) during the build and is merged in; this release stays 25.5.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
