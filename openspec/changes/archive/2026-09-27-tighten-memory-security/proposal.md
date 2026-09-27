# Tighten memory security

**Status:** ready-to-ship
**Branch:** civil-walrus
**Open questions:** none

## Why

The last memory security pass left four gaps. The start-up notes show only the part of a writer's email before the @, so a stranger whose email starts `operations@` looks like you. Anyone whose GitHub account carries your email could join as admin. Your own key, and every key sent by hand, never stops working. And nothing limits how many keys one person holds or how big a saved chat can be.

## What Changes

- **Notes show who wrote them in full.** Each note in the start-up notes and in searches names its writer's full email, so `operations@example.com` and `operations@example.org` never look alike.
- **Admin is your GitHub account, not your email.** Setting up memory, or the one-time update after this ships, links the admin to their GitHub account. Joining through GitHub makes someone admin only when it is that same account; anyone else with the same email joins as a regular teammate.
  ```text
  Join through GitHub
        │
        ▼
  same GitHub account
  as the admin?
    ├─ yes ─▶ admin key
    └─ no  ─▶ teammate key
  ```
- **No more keys by hand; every key ends.** The admin can no longer make a key and send it to someone. Everyone gets in through GitHub. Every key lasts 30 days and renews itself at start-up, the admin's too. Keys that never ended stop at the update, and each computer rejoins through GitHub on its own. Someone without GitHub access to the repo loses memory.
- **At most 10 computers per person.** Joining from an 11th computer works right away. The key of the computer that joined longest ago stops; that computer rejoins on its own next time.
- **Saved chats cap at 50 MB each.** Today's largest is about 26 MB. For a bigger chat, its notes are still saved, but the full record is not kept. Asking for that record says why.

Non-goals: limits on the total size of one person's saved chats, stopping readers from adding tags and run records, and a way to join memory without GitHub.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: *Search finds facts by words, tags, and filters* prints a fact's author as the full email; *Transcripts are kept and traceable* caps one transcript at 50 MB; *A person with GitHub access joins memory* expires every key; new *A GitHub account, not an email, decides admin and key count* grants admin by linked account and keeps at most 10 keys per account; *The admin adds and removes teammates* is replaced by *The admin's key is tied to their GitHub account*, with no hand-made keys.

## Impact

- `.agents/skills/memory/migrations/0005_admin_accounts.sql` (new): `memory_admins`, `memory_keys.github_id`, and an end date for every key without one.
- `.agents/skills/memory/worker/memory-worker.mjs`: `join` reads the GitHub user id, grants admin from `memory_admins`, records `github_id`, drops the person's expired keys and all but their 9 newest; the keys guard also covers `memory_admins`; an R2 PUT over 50 MB is refused with 413.
- `.agents/skills/memory/scripts/lib/members.mjs`: `member add` is replaced by `member admin`; `member remove` also unlinks the email's GitHub account; `member list` shows each key's GitHub account.
- `.agents/skills/memory/scripts/memory.mjs`: `migrate` links the running admin's GitHub account after 0005; `strip` skips the upload over 50 MB; `source` names the cap.
- `.agents/skills/memory/scripts/lib/digest.mjs`: `formatFact` prints the full email.
- `.agents/skills/wong-setup/scripts/provision.mjs` and `references/cloudflare.md`: setup runs `member admin`.
- `.agents/skills/memory/SKILL.md`, `wiki/development/memory.md`.
- Tests: `scripts/tests/memory-worker.test.mjs`, `memory-store.test.mjs`, `memory-capture.test.mjs`, `provision.test.mjs`, `server-install.test.mjs`.
- `CHANGELOG.md` `## Next (minor)` entry, with the one-time `memory.mjs migrate` step.

## Decision log

- **2026-09-27** — Asked how long a key the admin sends by hand should last → chose no hand-sent keys at all: the admin should not be able to hand out memory keys; everyone gets in through GitHub.
- **2026-09-27** — Asked what happens when a person joins from an 11th computer → chose the oldest computer's key stops.
- **2026-09-27** — Asked what happens to a saved chat over the size limit → chose keep its notes and skip the full record.
- **2026-09-27** — Assumed: the scope is memory fact #339's four leftovers from harden-memory-access, because the request settled it.
- **2026-09-27** — Assumed: the full email shows in every repo, team or not, because it is one rule and costs a few bytes per line of a 6 KB digest.
- **2026-09-27** — Assumed: the admin's own key is still made without joining, by `member admin`, because setup makes it before production deploys and joining needs a deployed Worker; it writes only to this machine's `.env` and never prints a key.
- **2026-09-27** — Assumed: `member admin` replaces `member add`, because the only key left to make by hand is the admin's own.
- **2026-09-27** — Assumed: the admin's link lives in its own table, not on key rows, because expiry and the key cap delete key rows, and the link must outlive them.
- **2026-09-27** — Assumed: `migrate` links the admin's GitHub account when it applies this update and no admin is linked, because the person running it already holds the admin's Cloudflare token, and a forgotten second step would turn the admin into a teammate at the next renewal.
- **2026-09-27** — Assumed: keys with no end date stop at the update rather than 30 days later, because their machines rejoin through GitHub at the next start-up, and a later cutoff keeps hand-sent keys alive for a month.
- **2026-09-27** — Assumed: until the admin runs the update, joining makes nobody admin, because the Worker then has no link to check; old keys keep working until then.
- **2026-09-27** — Assumed: the key cap counts keys per GitHub account, because an account is one person and an email is not.
- **2026-09-27** — Assumed: the 50 MB cap holds for every key, the admin's too, and the Worker enforces it, because a client check alone can be skipped.
- **2026-09-27** — Assumed: a minor release, because nothing breaks for a teammate with GitHub access; hand-sent keys stopping is the intended change.
- **2026-09-27** — Built inside `/ship`: migration 0005, admin by linked GitHub account, `member admin` in place of `member add` (now a retired name), every key expiring, 10 keys per account, the 50 MB transcript cap, and full author emails. Joins on a store before 0005 keep the old per-email replace with no cap and make no admin; `migrate` links the admin only when it applies 0005 with a Worker recorded; `member admin` no longer sets the team flag, which now comes from the Worker. Local suites pass (471), with lint, link, retired-name, and config checks; examples use `example.com` because the private-names check blocks the company name. CI (task 5.1) is next.
- **2026-09-27** — CI passed on PR #169 (build, payload, test); every task is done.
- **2026-09-27** — Distilled: no repeatable fact; `wiki/development/memory.md` already carries the new rules from task 4.1.
- **2026-09-27** — Archived and checkpointed for merge by `/ship` as 26.11.0, after merging main's 26.10.0 and 26.10.1 (changelog, memory spec, `memory.mjs`, and the store tests resolved as a union).
