# Add team memory

**Status:** ready-to-ship
**Branch:** explore/bucket-scoped-r2
**Open questions:** none

## Why

Today `memory.mjs` reaches the store with a Cloudflare token, and every teammate gets that same token. It reads every teammate's raw transcripts. Its `D1 Write` permission also reaches every D1 database in the account, including the app's production database, because Cloudflare cannot limit D1 to one database. That is true even for a solo admin. Teammates should share facts, each person's transcripts should stay private, and no memory credential should reach the app's data.

## What Changes

- **All memory goes through one memory Worker per Cloudflare account.** The `wong-memory` Worker is not part of any app. It has bindings to each repo's memory database and bucket, and to nothing else. Every repo in the account uses it, home included, and so does everyone: admin and teammates. `CLOUDFLARE_MEMORY_TOKEN` now holds a memory key, not a Cloudflare token. The Worker copies the two Cloudflare endpoints that `memory.mjs` already calls, so the script keeps one code path. (review.html#/member-access/worker)
- **Keys, not tokens.** Each key opens one repo's store, as admin or member. Keys are stored as hashes in a small keys database that only the Worker can reach. Setup gives the installer an admin key. The admin runs `memory.mjs member add <email>`, which prints a member key once. `member remove` revokes a key at once, and `member list` shows who has access.
- **Transcripts are private to their author.** New uploads go to `sessions/<author email>/<agent>/<session-id>.jsonl`. A member can write and read only under their own email. The admin reads every transcript of the repo, including older keys with no email.
- **Your own personal facts by default, in a team.** Once a repo has a member other than the admin, the digest and search show only your own `user` and `feedback` facts. They match every git email on your `wiki/people/` page. `project` and `thread` facts still come from everyone, and `search --everyone` shows all. A solo repo does not filter.
- **BREAKING: existing installs move behind the Worker.** `/wong-sync` deploys the Worker or attaches the repo to it, gives the admin a key in `.env`, and deletes the old memory token. Teammates who held that token need a member key.

**Non-goals:** no memory code in the app's Worker. No per-person buckets or bucket-scoped tokens. No limit on which SQL a key sends: members are trusted teammates. No move of old transcripts.

## Capabilities

### New Capabilities

- `memory-worker`: the shared memory Worker, memory keys, the keys database, the `member` and `worker` commands, and the move of existing installs.

### Modified Capabilities

- `memory-store`: access goes through the memory Worker with a memory key; transcript keys include the author; search filters personal facts in a team and gains `--everyone`.
- `memory-recall`: in a team, the digest shows only the current person's `user` and `feedback` facts.
- `cloudflare-provisioning`: setup attaches the repo to the memory Worker and writes an admin key, instead of minting a memory token; teardown detaches the repo.

## Impact

- **Code:** a new Worker module in `.agents/skills/memory/worker/`. `lib/store.mjs` sends every call to the recorded Worker URL. `memory.mjs` gets the `member` and `worker` commands, author-keyed uploads, and `--everyone`, and `lib/digest.mjs` gets the personal-fact filter.
- **Cloudflare:** per account, one more Worker (`wong-memory`) and one more D1 database (`wong-memory-keys`). On the free plan, the keys database counts toward the limit of 10 databases.
- **Config:** `components.memory.worker` (the Worker URL) and `components.memory.team` in `.claude/.wong-stack.json`. They are not secrets.
- **Setup and sync:** the provisioning runbook (`.agents/skills/wong-setup/references/cloudflare.md`), the teardown runbook, and a `/wong-sync` move step.
- **Docs:** `wiki/development/memory.md`, the memory skill, and `SECURITY.md`.
- **Release:** 21.0.0, because existing installs change how they reach memory.

## Decision log

- **2026-09-26** — Found: today there is one store per repo, and the author is only a column. Setup mints one memory token with account-wide `D1 Write` and `Workers R2 Storage Write`, so anyone who holds it reads every transcript. Nothing mints a narrower token for a teammate.
- **2026-09-26** — Asked about a Worker in front of the store → the user first chose **no Worker**, because of speed and the cost of keeping an API: facts are shared and your own show by default, and each person's transcripts go in their own bucket.
- **2026-09-26** — Probed Cloudflare's bucket-scoped tokens against the live API, then deleted every probe resource. A token limited to one bucket gets 403 from the REST objects endpoint that `memory.mjs` uses, even on its own bucket. Through the S3 API it reads and writes its own bucket and gets 403 on others. `Bucket Item Write` also reads; there is no write-only group. D1 permissions are account-wide only.
- **2026-09-26** — Asked which facts show only your own by default → chose **personal types only**: `user` and `feedback` are yours; `project` and `thread` come from everyone.
- **2026-09-26** — Asked how to handle a teammate token's account-wide `D1 Write`, which reaches the app's production database → the user chose **a Worker in front of the store**. That also makes per-person buckets and an S3 signer unnecessary, so transcripts stay in one bucket and the Worker enforces the author prefix. This replaces the memory-store rule "No Worker SHALL stand in front of the store".
- **2026-09-26** — Asked what happens to transcripts already in the shared bucket → chose **it becomes the admin's**: old keys have no author, so only the admin reads them. No move.
- **2026-09-26** — Assumed: the Worker copies the D1 query and R2 object endpoints that `store.mjs` already calls, so there is no new API to design. Reason: the user's concern was keeping an API.
- **2026-09-26** — Assumed: member keys are stored as hashes in Worker secrets, one secret per member, not in D1. Reason: a member can send any SQL, so a key table in D1 would let a member add a key for someone else.
- **2026-09-26** — Assumed: a member can write facts under another author and delete rows. Reason: members are trusted teammates, and D1's 30-day restore recovers deleted rows. Recorded as an accepted risk.
- **2026-09-26** — Assumed: the personal-fact filter applies only when the repo has members, and it matches every email on the person's `people/` page. Reason: a solo person often uses two git emails (this repo's facts have two authors), and a filter would hide half their facts.
- **2026-09-26** — Assumed: `member add` needs `Workers Scripts Write` on the admin's `CLOUDFLARE_API_TOKEN`, which provisioning already grants. The memory token does not get it.
- **2026-09-26** — Assumed: release 20.1.0, because solo repos and home do not change.
- **2026-09-26** — Asked whether everyone, the admin included, should use the Worker → the user chose **everyone behind the Worker**. Reason: one standard way to reach facts and transcripts. It also removes the admin's own token, which reaches the app's database. This replaces the earlier assumption that the admin stays direct, and makes the release 21.0.0.
- **2026-09-26** — Asked whether the memory Worker is part of the app → recommended **a separate Worker**: CI and every preview would otherwise get the memory bindings, an app bug could leak memory, and `/wong-sync` cannot update `app/`.
- **2026-09-26** — Found: Cloudflare allows 100 Workers per account on the free plan and 500 on paid, 10 D1 databases on free, and 64 or 128 variables (secrets included) per Worker. Each repo already uses two Workers and three D1 databases.
- **2026-09-26** — Asked where the memory endpoints run, given one Worker per repo could mean hundreds of Workers → chose **one shared memory Worker per Cloudflare account**, not one per repo and not inside the app. This replaces the per-repo Worker in the first draft.
- **2026-09-26** — Assumed: keys live in a `wong-memory-keys` D1 database that only the Worker binds, not in Worker secrets. Reason: the variable limit would cap a shared Worker's keys, and no key's SQL can reach that database. This replaces the per-member secret in the first draft.
- **2026-09-26** — Assumed: one key opens one repo's store. Reason: setup cannot read a key it made in another repo, because only hashes are stored.
- **2026-09-26** — Assumed: the personal-fact filter turns on when the first member other than the admin is added, which sets `components.memory.team`. Reason: a solo repo must not filter, and the client cannot read the keys database.
- **2026-09-26** — Assumed: a store with no recorded Worker still uses the Cloudflare API with the same requests, until `/wong-sync` moves it. Reason: the requests are the same, so only the base URL differs, and a repo mid-sync keeps working.
- **2026-09-26** — Implemented with two changes to the design: `migrate` runs with the admin's `CLOUDFLARE_API_TOKEN` straight to Cloudflare, because a Worker's D1 binding cannot run a multi-statement migration file; and `member add --env` writes the admin's own key to `.env` without printing it, so setup and sync keep it out of the transcript.
- **2026-09-26** — Verified live, then deleted every probe resource: the real `worker deploy`, `migrate`, and `member` commands deployed a probe Worker. Through it, an admin and a member searched facts, a member read and wrote only their own transcripts (`not_author` otherwise), a key for another store got 403, and no key got 401. Attaching a second repo kept the first repo's bindings, and its key still worked. A member search took 0.64 s end to end. The limit on bindings per Worker was not tested.
- **2026-09-26** — Saved the implementation (19 of 19 tasks) with the deltas reconciled into `openspec/specs/` (a new `memory-worker` spec, and edits to `memory-store`, `memory-recall`, and `cloudflare-provisioning`). Also added during apply: `worker deploy` drops bindings whose database or bucket no longer exists, so a torn-down repo cannot break the next deploy. Script tests: 188 pass, 5 skipped.
- **2026-09-26** — `/ship` paused while `main` was red with a Dependabot `qs` failure; the user chose to fix it first, as its own change (PR #121, 20.1.1), then merged `main` here. Distilled facts before the archive: added the process-environment rule for `CLOUDFLARE_MEMORY_TOKEN` to `wiki/development/memory.md`; the other facts are open threads or already in the wiki.
- **2026-09-26** — Archived; this checkpoint commits the archive move, the merge of `main` at 20.1.1, and the distilled wiki line.
