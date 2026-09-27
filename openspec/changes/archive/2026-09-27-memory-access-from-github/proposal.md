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
