<!-- openspec-archive v1 2026-09-26-add-team-memory -->
<!-- file proposal.md utf8 10830 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 8739 -->
## Context

See proposal.md for why. Today `lib/store.mjs` sends every store call to the Cloudflare REST API: a D1 batch to `/accounts/<id>/d1/database/<id>/query`, and object PUT and GET to `/accounts/<id>/r2/buckets/<bucket>/objects/<key>`. The token is `CLOUDFLARE_MEMORY_TOKEN`, and `WONG_MEMORY_API` already replaces the base URL for tests. Transcripts upload to `sessions/<agent>/<session-id>.jsonl`. Setup mints the memory token with the user token, which provisioning has widened to include `Workers Scripts Write` and `D1 Write`.

Constraints found during exploration (proposal Decision log):
- **Tokens can't isolate memory.** D1 permissions cannot be scoped below the account. Bucket-scoped R2 tokens work only over the S3 API.
- **Worker limits:** 100 per account on free and 500 on paid. Each has 64 or 128 variables, secrets included.
- **D1 limits:** 10 databases per account on free.

## Goals / Non-Goals

**Goals:**
- A memory credential reaches only its own repo's memory database and bucket.
- One code path in the store client. A key only changes the base URL.
- One extra Worker and one extra D1 database per account, whatever the number of repos.

**Non-Goals:**
- No SQL allow-list in the Worker. Members are trusted, and `memory.mjs` sends free SQL today.
- No web login or OAuth for members.
- No fix for the CI deploy token's account-wide reach (see Risks).

## Decisions

### 1. The Worker copies the two REST endpoints the client already calls

`wong-memory` answers:
- `POST …/d1/database/<database id>/query`, by running the batch on that database's binding.
- `PUT` and `GET …/r2/buckets/<bucket>/objects/<key>`, on that bucket's binding.

**Routing:** the ids in the path pick the binding. Binding names come from the ids: `DB_<database id without hyphens>` and `R2_<bucket, hyphens to underscores>`. The response shapes match Cloudflare's: `{ success, result: [{ results }], errors }`, and the raw object body.

- **Why:** `store.mjs` keeps its requests, and the fake store in `scripts/tests/fixtures/memory/harness.mjs` keeps working, so there is no new API to design or version.
- **Rejected: a purpose-built API.** Every new memory feature would need a Worker change.
- **Rejected: memory routes in the app Worker.** CI and every preview would get the bindings, and `/wong-sync` cannot update `app/`.
- **Rejected: one Worker per repo.** It spends one of 100 or 500 Workers per repo.

### 2. Keys live in a Worker-only database

`wong-memory-keys` has one table:

```
keys(hash TEXT PRIMARY KEY, email TEXT, role TEXT CHECK (role IN ('admin','member')),
     database_id TEXT, bucket TEXT, created_at TEXT)
```

A key is `wongm_<base64url(email)>.<32 random bytes, base64url>`. The Worker hashes the bearer key with SHA-256 and looks up one row. The row's `database_id` and `bucket` must match the request path, or the answer is 403. A missing row gets 401.

- **The client knows its own email offline.** It reads the email from the key to build its upload prefix, so a git email that differs from the registered one cannot break uploads.
- **Unreachable by key holders:** no path routes to the keys binding, so no key's SQL can add or read keys. The admin manages rows through the REST API with `CLOUDFLARE_API_TOKEN`.
- **Rejected: one Worker secret per member.** The 64 or 128 variable limit is shared by every repo on the Worker.
- **Rejected: a key per person across repos.** Setup in a new repo cannot reuse a key it only has the hash of, so one key opens one repo.

### 3. Transcript keys start with the author's email

New uploads go to `sessions/<email>/<agent>/<session-id>.jsonl`. The email comes from the key. A `member` key's PUT or GET must start with `sessions/<its email>/`. Anything else gets a 403 with the error code `not_author`. An `admin` key reads and writes any object in its bucket. The client turns `not_author` into "only the author and the admin can read this transcript", not into the generic token error. Old keys stay in `raw_key`, so only admins read them.

### 4. The store client sends every call to the Worker

`store.mjs` builds its base URL:
1. `WONG_MEMORY_API` when set, for tests.
2. `components.memory.worker` when recorded.
3. Otherwise the Cloudflare API, for a store that isn't moved yet.

The request paths are the same in all three. `--home` reads home's config and home's `.env`, so it reaches home's Worker with home's key.

### 5. Commands deploy and manage through the REST API

All of them use `CLOUDFLARE_API_TOKEN`:

- **`worker deploy`:**
  1. Create `wong-memory-keys` if it is missing, and apply its migration.
  2. Read the Worker's current bindings with `GET …/workers/scripts/wong-memory/settings`, and add this repo's database and bucket.
  3. Upload the module from `.agents/skills/memory/worker/memory-worker.mjs` as multipart, with `main_module`, a fixed `compatibility_date`, and the merged bindings.
  4. Turn on the `workers.dev` route, and record `https://wong-memory.<account subdomain>.workers.dev` as `components.memory.worker`.

  **Why read and merge:** it keeps the bindings of repos set up by older WongStack versions. Check during apply whether `keep_bindings` can replace the read.
- **`member add <email> [--admin]`:** insert a row with the key's hash, and print the key once, with the line to paste into `.env`. The first `member` role sets `components.memory.team: true`.
- **`member remove`:** delete this repo's row for that email.
- **`member list`:** select this repo's emails and roles.
- **Missing permission:** a 403 from Cloudflare stops the command and names the permission, so the admin can widen the token by [the widen protocol](../../../.agents/skills/wong-setup/references/permission-groups.md).

This is code, not model steps: it runs in setup, in sync, and once per teammate, and it has to be exact.

### 6. Setup and sync call the same commands

- **Provisioning (step 4b of `.agents/skills/wong-setup/references/cloudflare.md`):**
  1. Create the database and bucket as today.
  2. Run `worker deploy`.
  3. Run `migrate`. With a Worker recorded, it goes straight to Cloudflare with `CLOUDFLARE_API_TOKEN`, because a D1 binding runs one statement at a time and a migration file holds many.
  4. Run `member add <git email> --admin --env`. It writes the key to `.env` and never prints it.
- **`/wong-sync` move:** run the same two commands. Check a digest query through the Worker, then write the key. Only after the check passes, delete the old `<repo>-memory` token, found by name. A failure leaves the old token and `.env` alone.

### 7. The personal-fact filter turns on with the first member

When `components.memory.team` is `true`:

- **Emails:** the person's emails are every email on the `wiki/people/` page that lists their git email, or their git email alone.
- **Digest and search:** both add `AND (f.type NOT IN ('user','feedback') OR lower(f.author) IN (…))`.
- **`--everyone`** removes the filter.
- **Unfiltered:** the write gate, consolidation, and `show <slug>` keep reading every author, so a duplicate a teammate already wrote is still caught.

## Risks / Trade-offs

- **A member can forge the author or delete rows** → accepted for trusted teammates. D1's 30-day restore recovers deleted rows. Recorded in `wiki/development/memory.md`.
- **The CI deploy token keeps account-wide `Workers Scripts Write` and `D1 Write`,** so a leaked CI token could replace the memory Worker or read a memory database. This is true today too. Recorded in `SECURITY.md`, not fixed here.
- **The Worker URL is public** → every request needs a key, and an unknown key gets 401 before any store binding is touched.
- **One Worker serves repos on different WongStack versions** → the endpoints copy Cloudflare's, so they stay stable. A deploy always carries the newest module, and it keeps every binding.
- **A binding-count limit per Worker is not documented** → check during apply. The fallback is one Worker per 100 repos, recorded per repo.
- **Free plan:** the keys database takes one of the 10 D1 databases, and the Worker shares the account's 100,000 requests a day with the app. A session makes a few dozen memory calls.
- **Cross-repo memory reads a store in another account,** for example home from a team repo → it uses that repo's own config and key, so it reaches the other account's Worker.

## Migration Plan

Nothing moves in R2 or D1.
- **A new install:** setup deploys or attaches the Worker.
- **An existing install:** `/wong-sync` moves it (decision 6). Until then, the new client still reaches the store directly with the old token.
- **Rollback:** restore a Cloudflare memory token in `.env`, and remove `components.memory.worker`. The client then goes direct again.

<!-- end design.md -->
<!-- file tasks.md utf8 3678 -->
## 1. Memory Worker

- [x] 1.1 Write `.agents/skills/memory/worker/memory-worker.mjs`: look up the key hash in `wong-memory-keys`, check that the path's database and bucket match the key's repo, and answer the D1 query and R2 object requests on the matching binding, per design decisions 1 and 2 and review.html#/member-access/worker
- [x] 1.2 Enforce transcript access: a `member` key only under `sessions/<its email>/`, and anything else gets 403 `not_author`; an `admin` key reads its whole bucket, per review.html#/member-access/transcripts
- [x] 1.3 Add the `wong-memory-keys` migration
- [x] 1.4 Test the fetch handler with fake bindings: an unknown key gets 401, another repo's store gets 403, a batch returns Cloudflare's shape, member own-prefix PUT and GET pass, another person's key and an old key get 403 for a member, and an admin reads them

## 2. Memory script

- [x] 2.1 In `lib/store.mjs`, pick the base URL (`WONG_MEMORY_API`, then `components.memory.worker`, then the Cloudflare API), and turn a `not_author` 403 into the author-only message
- [x] 2.2 In `memory.mjs`, upload new transcripts to `sessions/<email>/<agent>/<session-id>.jsonl`, with the email read from the key
- [x] 2.3 Add `worker deploy`: create the keys database when missing, merge this repo's bindings with the existing ones, upload the module, turn on `workers.dev`, and record the URL. Check whether `keep_bindings` can replace the merge, and whether bindings per Worker have a limit
- [x] 2.4 Add `member add|remove|list`, with `--admin`, the key printed once, `components.memory.team` set by the first member, and the missing permission named on a Cloudflare 403
- [x] 2.5 Add the personal-fact filter to the digest (`lib/digest.mjs`) and to search, with the person's emails read from their `wiki/people/` page, and add `search --everyone`
- [x] 2.6 Test Worker routing through the fake store, the author-keyed upload, the author-only message, the filter on and off, two emails from a people page, `--everyone`, and `worker deploy` and `member` against a fake Workers and D1 API, including a merge that keeps another repo's bindings

## 3. Setup and sync

- [x] 3.1 Update provisioning step 4b in `.agents/skills/wong-setup/references/cloudflare.md`: run `worker deploy`, run `migrate` with the user token, run `member add <git email> --admin --env`, and mint no memory token. Update the R2-later and re-run paths
- [x] 3.2 Update the teardown runbook in `wiki/stack/` to detach this repo, and to delete the Worker and keys database only when no other repo is attached
- [x] 3.3 Add the move step to `/wong-sync` (`.agents/skills/wong-sync/`): deploy or attach, add the admin key, check a digest query through the Worker, then replace `.env` and delete the old token. Tell the admin that teammates need member keys
- [x] 3.4 Add the Worker module and migration to the payload manifest (`payload-files.json` and `payload-manifest.md`) if the memory skill entry does not already cover them

## 4. Docs

- [x] 4.1 Update `wiki/development/memory.md`: memory keys, the shared Worker, who can read what, how to add and remove a teammate, and the accepted risks. Replace the line that says every token holder reads every transcript
- [x] 4.2 Update the memory skill (`.agents/skills/memory/SKILL.md`) with the `member` and `worker` commands and `--everyone`
- [x] 4.3 Update `SECURITY.md`: the memory key replaces the memory token, and the CI deploy token's reach is recorded

## 5. Release

- [x] 5.1 Bump `VERSION` to 21.0.0 and add the `CHANGELOG.md` entry, with the move steps for existing installs
- [x] 5.2 Run the payload link check and the script tests, then pass CI through `/save`

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 3962 -->
## MODIFIED Requirements

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, deploy the account's memory Worker or attach the repo to it, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-worker` requires. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the Worker URL under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Deploying the memory Worker and creating the key are covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL attach it to the memory Worker; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the memory Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, attaches it to the memory Worker, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, the Worker attachment, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing

### Requirement: Everything provisioned can be torn down

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, this repo's bindings and keys in the memory Worker, the deploy token, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch. It SHALL delete the memory Worker and the keys database only when no other repo is attached.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

#### Scenario: Another repo shares the memory Worker

- **WHEN** teardown runs for `billing` and the memory Worker also serves `home`
- **THEN** teardown removes only `billing`'s bindings and keys, and the Worker keeps serving `home`

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/memory-recall/spec.md utf8 2001 -->
## MODIFIED Requirements

### Requirement: A bounded digest loads at session start

The session-start hook SHALL add a digest of the memory store to the agent's context when a session starts or resumes, and SHALL NOT add it again after the context is cleared or compacted. Code SHALL build the digest with no model. The digest SHALL list the live `thread` facts of the change whose recorded branch is the current branch first, then other open threads, then the other live facts by type and recency. When `components.memory.team` is `true`, the digest SHALL include only the current person's `user` and `feedback` facts, matched as the memory script's search matches them, and `project` and `thread` facts from every author. A repo that is not a team SHALL NOT filter by person. It SHALL NOT exceed 40 lines or 6 KB. When facts are left out, its last line SHALL state how many and how to search them. Each line SHALL show the fact's type, body, slug, age in days, author, and id. When the store has no live facts and no run to report, the hook SHALL add nothing.

#### Scenario: A repo with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest holds at most 40 lines and 6 KB, and its last line states how many facts it left out and names the search command

#### Scenario: Work continues on a change branch

- **WHEN** a session starts on the branch that change `add-po-search` records, and that slug has two open threads
- **THEN** the digest lists those two threads before any other fact

#### Scenario: The context is cleared

- **WHEN** the user runs `/clear` in a Claude Code session
- **THEN** the hook does not add the digest again

#### Scenario: An empty store

- **WHEN** the store has no live facts and no background run
- **THEN** the hook adds nothing to the context

#### Scenario: A team digest

- **WHEN** a session starts in a team repo, and a teammate wrote a `user` fact
- **THEN** the digest does not show that fact, and it shows the teammate's open threads

<!-- end specs/memory-recall/spec.md -->
<!-- file specs/memory-store/spec.md utf8 5008 -->
## MODIFIED Requirements

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the account's memory Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention, as `memory-worker` requires. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable and the page that owns it
- **AND** no value is printed

#### Scenario: A teammate joins

- **WHEN** a teammate needs memory access
- **THEN** the admin gives them a member key, not a Cloudflare token

### Requirement: R2 keeps each full raw transcript

When the store has a bucket, for each session with status `captured` or `skipped`, the store SHALL keep the full raw transcript file in R2 at `sessions/<author email>/<agent>/<session-id>.jsonl`, and SHALL keep it with no expiry. Before upload, every non-empty value in the repo's `.env` SHALL be replaced with a fixed placeholder. A session with status `private` SHALL have no R2 object. The memory script SHALL be able to print a stored transcript reduced to user and assistant text, so a reader can return to the full record behind a fact. A transcript uploaded before this key layout SHALL stay at `sessions/<agent>/<session-id>.jsonl`, and its session row SHALL keep pointing to it. When the store has no bucket, the session row SHALL still be written with no object key, and the script SHALL state that transcripts are not stored.

#### Scenario: A known secret in a transcript

- **WHEN** a transcript contains the value of a variable from `.env`
- **THEN** the uploaded object contains the placeholder in its place

#### Scenario: A longer session is uploaded again

- **WHEN** a session that was uploaded earlier has grown since
- **THEN** the object at the same key is replaced with the full current file

#### Scenario: A reader follows a fact to its source

- **WHEN** the agent asks for the source of a fact and the store has a bucket
- **THEN** it gets the source session's reduced text, not the raw file

#### Scenario: No bucket

- **WHEN** a session is captured in a store with no bucket
- **THEN** its session row and facts are written, no upload is tried, and asking for its source states that transcripts are not stored

#### Scenario: A new upload

- **WHEN** a session by `ana@example.com` is uploaded
- **THEN** its object key starts with `sessions/ana@example.com/`

### Requirement: The memory script searches facts with keywords and tags

The payload SHALL ship a dependency-free Node.js script that searches the store. It SHALL filter by full text, tag (including aliases), type, date range, author, branch, slug, and change state, and SHALL return live facts unless asked for superseded ones. When `components.memory.team` is `true`, search SHALL return only the current person's `user` and `feedback` facts, and `project` and `thread` facts from every author. The current person's emails SHALL be every git email on the `wiki/people/` page that lists their git email, or their git email alone when no page lists it. `--everyone` SHALL remove this filter. A repo that is not a team SHALL NOT filter by person. It SHALL print one line per fact: type, body, slug, age in days, author, and fact id. It SHALL print a slug's live facts newest first, with its open threads first. Change state SHALL be derived from the repo (`active` when `openspec/changes/<slug>/` exists, `shipped` when an archive for the slug exists, and `conversation` otherwise), and SHALL NOT be stored. Search SHALL NOT depend on embeddings or a vector index.

#### Scenario: Search by tag and date

- **WHEN** the agent searches for tag `ship` since `2026-09-01`
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: Read a topic

- **WHEN** the agent asks for slug `add-po-search`
- **THEN** it gets that slug's open threads, then its other live facts newest first

#### Scenario: A shipped change

- **WHEN** a slug has an archive folder and no active change folder
- **THEN** the output shows the state `shipped`

#### Scenario: A teammate's preference in a team

- **WHEN** the repo is a team and a teammate wrote a `feedback` fact about deploys
- **THEN** a search for `deploy` does not show it, and a search for `deploy --everyone` shows it

#### Scenario: One person with two git emails

- **WHEN** the repo is a team and the person's `people/` page lists two git emails
- **THEN** search shows the `user` and `feedback` facts written under both emails

<!-- end specs/memory-store/spec.md -->
<!-- file specs/memory-worker/spec.md utf8 6162 -->
## Purpose

Put every memory call behind one memory Worker per Cloudflare account, so that a memory key reaches only its own repo's memory store, never the app's data, and each person's transcripts stay private to them and the repo's admin.

## ADDED Requirements

### Requirement: One memory Worker serves every store in an account

Each Cloudflare account that holds a memory store SHALL have one memory Worker named `wong-memory`, separate from every application Worker. It SHALL have bindings to each attached repo's memory database and, when the store has one, its bucket, and to a keys database named `wong-memory-keys`. It SHALL have no binding to any other resource. Attaching a repo SHALL keep every other repo's bindings. No CI secret and no application deploy SHALL carry the memory Worker's bindings.

#### Scenario: A second repo in the same account

- **WHEN** setup runs for repo `billing` in an account whose memory Worker already serves repo `home`
- **THEN** the Worker gains bindings to `billing-memory`, and `home`'s bindings still work

#### Scenario: The app's database is out of reach

- **WHEN** the account also holds the app's production database
- **THEN** no request to the memory Worker can read or write it

### Requirement: Every memory call uses a memory key

The memory script SHALL send every store call to the Worker URL recorded under `components.memory.worker`, with the memory key from `CLOUDFLARE_MEMORY_TOKEN`. Only `migrate` and the admin commands SHALL instead use the admin's `CLOUDFLARE_API_TOKEN`, straight to Cloudflare. The Worker SHALL answer the same D1 query and R2 object requests, in the same shapes, that the memory script sends to the Cloudflare REST API. Each key SHALL open one repo's store, as `admin` or `member`. The Worker SHALL refuse a key it does not know with HTTP 401, and a request for another repo's store with HTTP 403. The keys database SHALL hold only a hash of each key. A store with no recorded Worker SHALL keep using the Cloudflare REST API with the same requests, until it is moved.

#### Scenario: A member searches facts

- **WHEN** a member runs `memory.mjs search deploy`
- **THEN** the result is the same as the admin's search on the same store, before the personal-fact filter

#### Scenario: A key for another repo

- **WHEN** a key that opens `billing`'s store sends a query for `home`'s memory database
- **THEN** the Worker answers 403 and runs nothing

#### Scenario: An unknown key

- **WHEN** a request carries a key that is not in the keys database
- **THEN** the Worker answers 401 and does nothing

### Requirement: The admin manages members with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, `member list`, and `worker deploy` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`. `member add` SHALL create a random key for the email on this repo's store, store only its hash, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace its earlier key. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke the email's key on this repo at once. `member list` SHALL print this repo's emails and roles, and no key or hash. `worker deploy` SHALL deploy or update the Worker, attach this repo, and keep every other repo's bindings. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`
- **THEN** the next call with Ana's key is refused with 401

#### Scenario: The token cannot deploy Workers

- **WHEN** `worker deploy` runs with a `CLOUDFLARE_API_TOKEN` that lacks `Workers Scripts Write`
- **THEN** the command stops, names that permission, and changes nothing

### Requirement: A member reads only their own transcripts

A `member` key SHALL write and read R2 objects only under `sessions/<member email>/`. Any other key SHALL be refused with HTTP 403. An `admin` key SHALL read every object in its repo's bucket, including keys with no email. When the memory script is refused a transcript, it SHALL state that only the author and the admin can read it.

#### Scenario: A member follows their own fact to its source

- **WHEN** a member asks for the source of a fact from their own session
- **THEN** they get the session's reduced text

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a fact from a teammate's session
- **THEN** no transcript is shown, and the script states that only the author and the admin can read it

#### Scenario: The admin reads an old transcript

- **WHEN** the admin asks for a transcript stored at `sessions/<agent>/<session-id>.jsonl`
- **THEN** they get its reduced text, and a member asking for the same key is refused

### Requirement: Existing installs move behind the memory Worker

`/wong-sync` SHALL move an install whose store has no recorded Worker: it SHALL deploy the Worker or attach the repo, create an admin key for the installer's git email, replace `CLOUDFLARE_MEMORY_TOKEN` in `.env` with that key, record the Worker URL, and delete the old `<repo>-memory` Cloudflare token only after a store call through the Worker succeeds. It SHALL tell the admin that teammates who held the old token need a member key.

#### Scenario: A solo install is moved

- **WHEN** `/wong-sync` moves a repo whose `.env` holds the old memory token
- **THEN** `.env` holds an admin key, the digest loads through the Worker, and the old token no longer exists

#### Scenario: The Worker call fails during the move

- **WHEN** the first store call through the Worker fails
- **THEN** the old token and `.env` value stay as they were, and the move reports the failure

<!-- end specs/memory-worker/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 7080 fence=~~~ -->
~~~html
<section class="visual flow" id="member-access" data-kind="flow" data-states="after transcripts">
  <p class="caption">How each person reaches the memory store after this change. The admin and every teammate use the same path.</p>
  <div class="frame">
    <div class="state state-after"><h2>Everyone goes through the Worker</h2>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="ma-admin"><h3>Admin <span class="tag">Changed</span></h3><p>Has an admin key for the repo.</p><details><summary>Details</summary><p>Actor: the admin. Action: runs <code>memory.mjs</code>. Result: the call goes to the Worker. The admin has no Cloudflare memory token now.</p></details></div>
        <div class="flow-branch" data-target-id="ma-member"><h3>Teammate <span class="tag">New</span></h3><p>Has a member key for the repo.</p><details><summary>Details</summary><p>Actor: a teammate. Action: runs <code>memory.mjs</code>. Result: the call goes to the Worker. The admin made the key with <code>member add</code>.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both run the same script</p>
      <div class="step flow-card" data-target-id="ma-start"><h3>A session calls the store <span class="tag">Changed</span> <i class="callout">1</i></h3><p><code>CLOUDFLARE_MEMORY_TOKEN</code> holds a memory key.</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: sends the D1 query and R2 object calls with the key to the Worker URL in <code>components.memory.worker</code>. Result: one code path for all people.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="ma-worker" data-mark="worker"><h3>The <code>wong-memory</code> Worker <span class="tag">New</span> <i class="callout">2</i></h3><p>One per Cloudflare account. Not part of any app.</p><details><summary>Details</summary><p>Actor: the shared memory Worker. Action: gets the calls of every repo in the account, home included. Result: it copies the two Cloudflare endpoints that <code>memory.mjs</code> already calls.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="ma-check" data-mark="worker"><h3>The Worker checks the key <span class="tag">New</span> <i class="callout">3</i></h3><p>It finds the key hash in the <code>wong-memory-keys</code> D1.</p><details><summary>Details</summary><p>Actor: the Worker. Action: hashes the key and looks it up. Result: the repo and the role, admin or member, and the email. Unknown key: 401. <code>member remove</code> deletes the row, so the key stops at once. Only the Worker binds this database.</p></details></div>
      <p class="flow-connector">↓ The key opens one repo's store</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="ma-repo-a"><h3>Repo A: memory D1 and bucket <span class="tag">Open</span></h3><p>The store that this key opens.</p><details><summary>Details</summary><p>Actor: the Worker. Action: runs the SQL and object calls through the repo A bindings. Result: facts for all; transcripts as the transcripts state shows.</p></details></div>
        <div class="flow-branch" data-target-id="ma-repo-b"><h3>Repo B (home): memory D1 and bucket <span class="tag">403</span> <i class="callout">4</i></h3><p>Bound to the Worker, but this key does not open it.</p><details><summary>Details</summary><p>Actor: a repo A key. Action: asks for the repo B store. Result: 403. Only a repo B key opens it.</p></details></div>
        <div class="flow-branch" data-target-id="ma-app"><h3>App production D1 and app Workers <span class="tag">Out of reach</span> <i class="callout">5</i></h3><p>The Worker has no binding to them.</p><details><summary>Details</summary><p>Actor: any key. Action: none is possible. Result: no memory key reaches the app's data or code.</p></details></div>
      </div>
      <p><a href="#/member-access/transcripts">See transcript access</a></p>
    </div>
    <div class="state state-transcripts"><h2>Transcript access</h2>
      <div class="step flow-card" data-target-id="tr-upload"><h3>A session uploads its transcript <span class="tag">Changed</span> <i class="callout">6</i></h3><p>New key: <code>sessions/&lt;author email&gt;/&lt;agent&gt;/&lt;session-id&gt;.jsonl</code>.</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: puts the email of the author in the key. Result: each transcript has an owner. Old keys, <code>sessions/&lt;agent&gt;/&lt;id&gt;.jsonl</code>, do not move.</p></details></div>
      <p class="flow-connector">↓ Who asks for the object?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="tr-own"><h3>Member, own email <span class="tag">New</span></h3><p>PUT and GET under <code>sessions/&lt;their email&gt;/</code>.</p><details><summary>Details</summary><p>Actor: the Worker. Action: compares the key prefix with the email of the member key. Result: allowed.</p></details></div>
        <div class="flow-branch" data-target-id="tr-other"><h3>Member, other key <span class="tag">New</span> <i class="callout">7</i></h3><p>Another person's key, or an old key with no email: 403.</p><details><summary>Details</summary><p>Actor: the Worker. Action: the prefix does not match. Result: 403. The object is not read or written.</p></details></div>
        <div class="flow-branch" data-target-id="tr-admin"><h3>Admin key <span class="tag">Changed</span></h3><p>Reads every key of its repo, old keys too.</p><details><summary>Details</summary><p>Actor: the Worker, for an admin key. Action: skips the prefix check in that repo's bucket. Result: all transcripts of the repo, including every <code>sessions/&lt;agent&gt;/&lt;id&gt;.jsonl</code> key.</p></details></div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The <code>.env</code> name stays <code>CLOUDFLARE_MEMORY_TOKEN</code>, but it holds a memory key, not a Cloudflare token. Only the base URL changes, so the script keeps one code path.</li>
      <li>One shared Worker per account, not one per repo and not in the app. One per repo could mean hundreds of Workers. In the app, CI and every preview would get the memory bindings, and <code>/wong-sync</code> cannot update <code>app/</code>.</li>
      <li>Keys are stored as hashes in their own D1 database. No key's SQL can reach it, because only the Worker binds it. Worker secrets would cap the number of keys.</li>
      <li>One key opens one repo's store. Setup cannot read a key from another repo, because only hashes are stored.</li>
      <li>This is why the Worker exists: a Cloudflare token with <code>D1 Write</code> reaches every D1 database in the account. The Worker binds only memory databases and buckets.</li>
      <li>The email in the key is the only thing the Worker checks for transcripts. All transcripts of a repo stay in one bucket.</li>
      <li>Old transcripts have no email in their key, so they become the admin's. Members cannot read them.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 53008 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-26-add-team-memory</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-26-add-team-memory</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

Today `memory.mjs` reaches the store with a Cloudflare token, and every teammate gets that same token. It reads every teammate's raw transcripts. Its `D1 Write` permission also reaches every D1 database in the account, including the app's production database, because Cloudflare cannot limit D1 to one database. That is true even for a solo admin. Teammates should share facts, each person's transcripts should stay private, and no memory credential should reach the app's data.

## What Changes

- **All memory goes through one memory Worker per Cloudflare account.** The `wong-memory` Worker is not part of any app. It has bindings to each repo's memory database and bucket, and to nothing else. Every repo in the account uses it, home included, and so does everyone: admin and teammates. `CLOUDFLARE_MEMORY_TOKEN` now holds a memory key, not a Cloudflare token. The Worker copies the two Cloudflare endpoints that `memory.mjs` already calls, so the script keeps one code path. (review.html#/member-access/worker)
- **Keys, not tokens.** Each key opens one repo's store, as admin or member. Keys are stored as hashes in a small keys database that only the Worker can reach. Setup gives the installer an admin key. The admin runs `memory.mjs member add <email>`, which prints a member key once. `member remove` revokes a key at once, and `member list` shows who has access.
- **Transcripts are private to their author.** New uploads go to `sessions/<author email>/<agent>/<session-id>.jsonl`. A member can write and read only under their own email. The admin reads every transcript of the repo, including older keys with no email.
- **Your own personal facts by default, in a team.** Once a repo has a member other than the admin, the digest and search show only your own `user` and `feedback` facts. They match every git email on your `wiki/people/` page. `project` and `thread` facts still come from everyone, and `search --everyone` shows all. A solo repo does not filter.
- **BREAKING: existing installs move behind the Worker.** `/wong-sync` deploys the Worker or attaches the repo to it, gives the admin a key in `.env`, and deletes the old memory token. Teammates who held that token need a member key.

**Non-goals:** no memory code in the app's Worker. No per-person buckets or bucket-scoped tokens. No limit on which SQL a key sends: members are trusted teammates. No move of old transcripts.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="member-access" data-kind="flow" data-states="after transcripts">
  <p class="caption">How each person reaches the memory store after this change. The admin and every teammate use the same path.</p>
  <div class="frame">
    <div class="state state-after"><h2>Everyone goes through the Worker</h2>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="ma-admin"><h3>Admin <span class="tag">Changed</span></h3><p>Has an admin key for the repo.</p><details><summary>Details</summary><p>Actor: the admin. Action: runs <code>memory.mjs</code>. Result: the call goes to the Worker. The admin has no Cloudflare memory token now.</p></details></div>
        <div class="flow-branch" data-target-id="ma-member"><h3>Teammate <span class="tag">New</span></h3><p>Has a member key for the repo.</p><details><summary>Details</summary><p>Actor: a teammate. Action: runs <code>memory.mjs</code>. Result: the call goes to the Worker. The admin made the key with <code>member add</code>.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both run the same script</p>
      <div class="step flow-card" data-target-id="ma-start"><h3>A session calls the store <span class="tag">Changed</span> <i class="callout">1</i></h3><p><code>CLOUDFLARE_MEMORY_TOKEN</code> holds a memory key.</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: sends the D1 query and R2 object calls with the key to the Worker URL in <code>components.memory.worker</code>. Result: one code path for all people.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="ma-worker" data-mark="worker"><h3>The <code>wong-memory</code> Worker <span class="tag">New</span> <i class="callout">2</i></h3><p>One per Cloudflare account. Not part of any app.</p><details><summary>Details</summary><p>Actor: the shared memory Worker. Action: gets the calls of every repo in the account, home included. Result: it copies the two Cloudflare endpoints that <code>memory.mjs</code> already calls.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="ma-check" data-mark="worker"><h3>The Worker checks the key <span class="tag">New</span> <i class="callout">3</i></h3><p>It finds the key hash in the <code>wong-memory-keys</code> D1.</p><details><summary>Details</summary><p>Actor: the Worker. Action: hashes the key and looks it up. Result: the repo and the role, admin or member, and the email. Unknown key: 401. <code>member remove</code> deletes the row, so the key stops at once. Only the Worker binds this database.</p></details></div>
      <p class="flow-connector">↓ The key opens one repo's store</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="ma-repo-a"><h3>Repo A: memory D1 and bucket <span class="tag">Open</span></h3><p>The store that this key opens.</p><details><summary>Details</summary><p>Actor: the Worker. Action: runs the SQL and object calls through the repo A bindings. Result: facts for all; transcripts as the transcripts state shows.</p></details></div>
        <div class="flow-branch" data-target-id="ma-repo-b"><h3>Repo B (home): memory D1 and bucket <span class="tag">403</span> <i class="callout">4</i></h3><p>Bound to the Worker, but this key does not open it.</p><details><summary>Details</summary><p>Actor: a repo A key. Action: asks for the repo B store. Result: 403. Only a repo B key opens it.</p></details></div>
        <div class="flow-branch" data-target-id="ma-app"><h3>App production D1 and app Workers <span class="tag">Out of reach</span> <i class="callout">5</i></h3><p>The Worker has no binding to them.</p><details><summary>Details</summary><p>Actor: any key. Action: none is possible. Result: no memory key reaches the app's data or code.</p></details></div>
      </div>
      <p><a href="#/member-access/transcripts">See transcript access</a></p>
    </div>
    <div class="state state-transcripts"><h2>Transcript access</h2>
      <div class="step flow-card" data-target-id="tr-upload"><h3>A session uploads its transcript <span class="tag">Changed</span> <i class="callout">6</i></h3><p>New key: <code>sessions/&lt;author email&gt;/&lt;agent&gt;/&lt;session-id&gt;.jsonl</code>.</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: puts the email of the author in the key. Result: each transcript has an owner. Old keys, <code>sessions/&lt;agent&gt;/&lt;id&gt;.jsonl</code>, do not move.</p></details></div>
      <p class="flow-connector">↓ Who asks for the object?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="tr-own"><h3>Member, own email <span class="tag">New</span></h3><p>PUT and GET under <code>sessions/&lt;their email&gt;/</code>.</p><details><summary>Details</summary><p>Actor: the Worker. Action: compares the key prefix with the email of the member key. Result: allowed.</p></details></div>
        <div class="flow-branch" data-target-id="tr-other"><h3>Member, other key <span class="tag">New</span> <i class="callout">7</i></h3><p>Another person's key, or an old key with no email: 403.</p><details><summary>Details</summary><p>Actor: the Worker. Action: the prefix does not match. Result: 403. The object is not read or written.</p></details></div>
        <div class="flow-branch" data-target-id="tr-admin"><h3>Admin key <span class="tag">Changed</span></h3><p>Reads every key of its repo, old keys too.</p><details><summary>Details</summary><p>Actor: the Worker, for an admin key. Action: skips the prefix check in that repo's bucket. Result: all transcripts of the repo, including every <code>sessions/&lt;agent&gt;/&lt;id&gt;.jsonl</code> key.</p></details></div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The <code>.env</code> name stays <code>CLOUDFLARE_MEMORY_TOKEN</code>, but it holds a memory key, not a Cloudflare token. Only the base URL changes, so the script keeps one code path.</li>
      <li>One shared Worker per account, not one per repo and not in the app. One per repo could mean hundreds of Workers. In the app, CI and every preview would get the memory bindings, and <code>/wong-sync</code> cannot update <code>app/</code>.</li>
      <li>Keys are stored as hashes in their own D1 database. No key's SQL can reach it, because only the Worker binds it. Worker secrets would cap the number of keys.</li>
      <li>One key opens one repo's store. Setup cannot read a key from another repo, because only hashes are stored.</li>
      <li>This is why the Worker exists: a Cloudflare token with <code>D1 Write</code> reaches every D1 database in the account. The Worker binds only memory databases and buckets.</li>
      <li>The email in the key is the only thing the Worker checks for transcripts. All transcripts of a repo stay in one bucket.</li>
      <li>Old transcripts have no email in their key, so they become the admin's. Members cannot read them.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
