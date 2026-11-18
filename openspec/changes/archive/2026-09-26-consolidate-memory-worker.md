<!-- openspec-archive v1 2026-09-26-consolidate-memory-worker -->
<!-- file proposal.md utf8 9578 -->
# Consolidate memory into the app Worker

**Status:** ready-to-ship
**Branch:** consolidate-memory-worker
**Open questions:** none

## Why

In 21.0.0, memory needs its own Worker, `wong-memory`, beside each repo's app Worker. It has its own deploy command, its own keys database, and a binding list that grows with every repo in the account. That is one more thing to deploy and manage. Every install already has an app Worker, and CI already deploys it, so memory can live there.

## What Changes

- **Memory lives in the app's production Worker.** `app/worker/index.ts` sends every request under `/_memory/` to the memory module, which stays in `.agents/skills/memory/worker/` so `/wong-sync` keeps it current. The production Worker binds the memory database as `MEMORY_DB` and the bucket as `MEMORY_BUCKET`. The staging Worker and previews bind neither, so they answer `/_memory/` with 404. The endpoints and their shapes do not change. (review.html#/one-worker)
- **CI deploys memory with the app.** The bindings go in `app/wrangler.jsonc`, in production only, from the stack pack's `wrangler.jsonc` fragment. A merge to `main` deploys a memory change. No person runs a memory deploy.
- **Keys move into the memory database.** A `memory_keys` table replaces the `wong-memory-keys` database. The Worker refuses every statement that names it, so no key can read or change keys. Only `member add`, `member remove`, and `member list`, which use the admin's `CLOUDFLARE_API_TOKEN`, touch it. Each Worker serves one store, so a key from another repo is unknown there (HTTP 401).
- **BREAKING: `memory.mjs worker deploy` is removed, and the `wong-memory` Worker is gone.** Setup records `components.memory.worker` as `https://<worker>.<subdomain>.workers.dev/_memory`. It was never deployed, so nothing moves from it.
- **The token decides the route.** A memory key (`wongm_...`) goes to the recorded Worker URL. Any other token goes straight to the Cloudflare REST API, as before. So an older store keeps working on its old token until the admin has a key. Until production first deploys the memory route, a call through the Worker spools its facts rather than failing.
- **Older stores move straight to the app Worker.** `/wong-sync` plans the bindings, the route, the recorded URL, the keys migration, and R2 on the deploy token. After the sync merges and production deploys, the admin runs `member add --admin --env`, checks `digest`, and deletes the old `<repo>-memory` token. This repo moves the same way.
- **Two pipeline checks learn about the memory bindings.** `secrets:check` does not ask staging to twin a `MEMORY_*` binding, and the database-name reader skips `MEMORY_DB`, so CI never migrates the memory database as the app's.

**Non-goals:** no memory on the staging Worker or previews. No move of existing data or transcripts. No change to what a member or the admin can read. No change to the digest, capture, or search.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-worker`: the app's production Worker serves memory, not a shared account Worker; keys live in the memory database; the token type picks the route; `worker deploy` is removed; older stores move to the app Worker.
- `memory-store`: the memory database is bound to the app's production Worker, and reached through it with a memory key.
- `cloudflare-provisioning`: setup binds the memory store in the app's config and records the Worker URL, instead of deploying `wong-memory`; teardown has no shared Worker to spare.
- `cf-secret-parity`: a `MEMORY_*` binding is production-only by design, and the twin check does not require it in staging.

## Impact

- **Code:** `.agents/skills/memory/worker/memory-worker.mjs` becomes a handler the app imports, with a type declaration beside it; `keys.sql` becomes migration `0002`. `lib/members.mjs` loses the deploy code and manages keys in the memory database. `lib/store.mjs` picks the route by token type. `app/worker/index.ts` gains the `/_memory/` route. `scripts/cf-secrets.mjs` and `scripts/lib-wrangler-config.mjs` handle the memory bindings.
- **Config:** the stack pack's `wrangler.jsonc` fragment and this repo's `app/wrangler.jsonc` gain `MEMORY_DB` and `MEMORY_BUCKET` in production.
- **Cloudflare:** per account, one Worker and one D1 database fewer. The CI deploy token needs `Workers R2 Storage Write` when the store has a bucket.
- **Risks accepted:** a failed production deploy also stops memory, and app code can reach `MEMORY_DB` and `MEMORY_BUCKET`, so an app bug could expose transcripts.
- **Setup and sync:** the provisioning runbook, the teardown steps, and `/wong-sync`'s move step.
- **Docs:** `wiki/development/memory.md`, the memory skill, the payload manifest, the stack pack fragments, the Access page, `SECURITY.md`, and the credential pages.
- **Release:** 23.0.0, because a command and the shared Worker are removed.

## Decision log

- **2026-09-26** — Found: 21.0.0 put memory in a shared `wong-memory` Worker, and its Decision log rejected memory routes in the app Worker because CI and previews would get the bindings, an app bug could leak memory, and `/wong-sync` cannot update `app/`.
- **2026-09-26** — Asked which one Worker to consolidate into → chose **memory inside each repo's app Worker**, over keeping `wong-memory` or one Worker for every app in the account.
- **2026-09-26** — Asked what drives it → chose **fewer things to deploy and manage**.
- **2026-09-26** — Asked where memory lives for a repo with no app Worker → chose **setup always deploys the app Worker**. Every install already takes the app scaffold, so this is true today.
- **2026-09-26** — Asked who deploys memory → chose **CI deploys it with the app**: production only; staging and previews get no memory bindings. Accepted: a broken app deploy can stop memory.
- **2026-09-26** — Asked how installs on `wong-memory` move → the user said **`wong-memory` is not deployed anywhere yet**. Checked: account `040f88e2…` has no `wong-memory` Worker. Nothing moves from it.
- **2026-09-26** — Assumed: the key hashes go in a `memory_keys` table in the memory database, and the Worker refuses any statement that names it or `writable_schema`. Reason: a separate keys database per repo costs one of the free plan's 10 D1 databases, and a key never needs the table.
- **2026-09-26** — Assumed: the Worker ignores the database id and bucket name in the path, because each Worker binds one store. A key for another repo is not in this store's table, so it gets 401, not 403.
- **2026-09-26** — Assumed: the route prefix is `/_memory/`, and the handler module stays in the memory skill, imported by a relative path from `app/worker/index.ts`. Reason: `/wong-sync` updates the skill, and the scaffold's one import line changes rarely.
- **2026-09-26** — Assumed: a memory key goes to the Worker and any other token to the REST API. Reason: an older store's move can land in one PR while its old token keeps working, until production deploys the route.
- **2026-09-26** — Assumed: a 404 from the Worker URL spools facts. Reason: a new install has no memory route until its first production deploy.
- **2026-09-26** — Assumed: an app behind Access keeps `workers.dev` on, or bypasses `/_memory/*`. Reason: Access cannot gate `workers.dev`, so the recorded URL is not walled; a custom-domain-only app needs the bypass.
- **2026-09-26** — Found: this repo's CI deploys with a token that has `Workers R2 Storage Write` (the main deploy at 18:30 UTC matches its last use), so binding `wongstack-memory` in production will not fail the deploy.
- **2026-09-26** — Assumed: release 22.0.0.
- **2026-09-26** — Rehearsed on real infrastructure in account `040f88e2…`: a scratch Worker bundling the real route, with a scratch D1 and R2 bucket. `migrate`, `member add` (admin and member), a fact written with the admin key, `search` and `digest` with keys, transcript PUT/GET (a member got 403 on the admin's transcript; the admin read the member's), three key-table probes (403 `keys_table`), a real D1 batch in Cloudflare's shape, and `member remove` (the next call got 401) all behaved as specified. A missing `workers.dev` hostname answered 404, and the fact spooled. Every scratch resource was deleted.
- **2026-09-26** — `main` shipped its own 22.0.0 (#123: a lighter loop, mini apps) during this work. Merged `origin/main` into the branch: the setup names table keeps both the mini-app Workers and the production-only memory line, and this change becomes **23.0.0**. The delta specs are synced into `openspec/specs/`. The review page keeps its old format, refreshed from the proposal only, as #123 allows for an active change.
- **2026-09-26** — CI passed on PR #125: the app suite (26 tests, 100% coverage, Stryker), the script tests, the payload checks, and a staging deploy. The live staging Worker answers `/_memory/` with 404 `no_store` and `/api/` with 200. Wrangler warns at build that `MEMORY_DB` is not on `env.staging`; the fragment rule now says that warning is expected.
- **2026-09-26** — Distilled facts at ship: `wiki/development/memory.md` now says a memory key carries its email and any other shape goes to the Cloudflare API. The other facts stay in the store: this repo's move is an open thread, and the rest is in this change.
- **2026-09-26** — Archive checkpoint: every task checked, the change archived with `--skip-specs` (the deltas were synced into `openspec/specs/` at the earlier save), and `main`'s 22.0.1 (#124) merged in before the gate.

<!-- end proposal.md -->
<!-- file design.md utf8 6344 -->
## Context

See proposal.md — Why. Today `memory-worker.mjs` is a whole Worker: `memory.mjs worker deploy` uploads it as `wong-memory`, with bindings named `DB_<id>` and `R2_<name>` per repo and a `KEYS` binding to `wong-memory-keys`. `store.mjs` sends a key's calls to `components.memory.worker`, and `members.mjs` holds the deploy and the key commands. The app Worker (`app/worker/index.ts`) is TypeScript, built by `@cloudflare/vite-plugin`, typechecked by `tsc -b` with `module: nodenext`, and deployed by `deploy.yml` → `cf-build.sh` → `cf-deploy.sh`: production from `main`, the staging Worker from every other branch. `cf-build.sh` regenerates `worker-configuration.d.ts` with `wrangler types`.

## Goals / Non-Goals

**Goals:** one route in the app Worker; no memory deploy of its own; a module `/wong-sync` still owns; the same client requests.

**Non-Goals:** a memory endpoint on staging; a typed `Env` for memory in the scaffold; a check that the app code does not read `MEMORY_DB`.

## Decisions

### The handler stays in the memory skill; the app imports it

`memory-worker.mjs` exports `MEMORY_PREFIX = '/_memory/'` and `handleMemory(request, env)`, and keeps `hashKey` and `mayTouch`. `app/worker/index.ts` adds one branch: `if (url.pathname.startsWith(MEMORY_PREFIX)) return handleMemory(request, env);`, importing `../../.agents/skills/memory/worker/memory-worker.mjs`. A `memory-worker.d.mts` beside it declares `handleMemory(request: Request, env: object): Promise<Response>` and `MEMORY_PREFIX: string`, so `tsc` accepts the import under `nodenext` without `allowJs`, and the scaffold does not depend on the generated `Env` holding memory bindings.

- *Rejected: copy the handler into `app/worker/memory.ts`.* `/wong-sync` does not own `app/`, so every fix would be a guided edit in every target.
- *Rejected: import through `.claude/`.* It is a symlink to `.agents/` in every target; the real path is steadier for a bundler.

### Keys in a guarded table, not a second database

Migration `0002_keys.sql` creates `memory_keys (hash PRIMARY KEY, email, role CHECK admin|member, created_at)`. No `database_id` or `bucket` column: each Worker serves one store. The handler refuses a batch with 403 `keys_table` when any statement matches `/memory_keys|writable_schema/i`, before it runs any statement. SQLite has no dynamic SQL and no identifier escapes, so a statement cannot reach the table without its name. Triggers and views must name it too. D1 already refuses `ATTACH`. The admin commands reach the table through `openStore(ctx, { admin: true })`, the REST path `migrate` uses.

- *Rejected: `<repo>-memory-keys` per repo.* It costs one of the free plan's 10 D1 databases; a repo already uses three.
- *Rejected: Workers KV.* A delete takes up to 60 s to reach every location, so `member remove` would not revoke at once.
- *Rejected: hashes in Worker secrets.* The API cannot read a secret back, so `member list` would need a second copy.

### The handler ignores ids in the path

The client keeps sending `/accounts/<id>/d1/database/<id>/query` and `/accounts/<id>/r2/buckets/<name>/objects/<key>`. The handler matches the suffix after `/_memory` and uses `MEMORY_DB` and `MEMORY_BUCKET`. When `MEMORY_DB` is absent (staging, previews), it answers 404 `no_store` before it reads a key. When the store has no bucket, an object request answers 404 `no_bucket`.

### The token type picks the route

In `openStore`, the API base is `WONG_MEMORY_API` when set; otherwise `config.worker` for a memory key and the Cloudflare REST API for any other token. A memory key with no recorded Worker still stops with the existing message. `migrate` keeps using the admin token when a Worker is recorded. A 404 from a key's call raises `StoreError` kind `unconfigured`, which the spool already accepts.

### The two pipeline readers skip `MEMORY_*`

`checkBindings` in `cf-secrets.mjs` filters production binding names that start with `MEMORY_` before the twin comparison. In `lib-wrangler-config.mjs`, `databaseName` and `hasD1` read the first `d1_databases` entry whose `binding` is not `MEMORY_DB`, so `cf-build.sh` never runs the app's migrations against the memory database, whatever the order of entries.

### Recording the URL is a runbook step

Setup already reads `GET /workers/subdomain` in 4f. Step 4b records `https://<worker>.<subdomain>.workers.dev/_memory` next to the ids. No command derives it, because the Worker name lives in a config file the memory skill does not own.

## Risks / Trade-offs

- [An app bug reads `MEMORY_DB` or `MEMORY_BUCKET`] → accepted by the user. The Access page and the memory page state it; the scaffold's only reader is the memory route.
- [A failed production deploy stops memory] → accepted. Facts spool on a network or 404 error and send on the next run.
- [The regex guard misses a spelling] → tests cover case, quotes, brackets, backticks, a trigger body, and `writable_schema`. A miss lets a member raise their own role, the same risk class the 21.0.0 log recorded for members who send any SQL.
- [A custom-domain app turns off `workers.dev`] → the recorded URL stops answering. The Access page says to keep `workers.dev` on or bypass `/_memory/*`.
- [Bundling a file outside `app/`] → Vite builds it; `vite dev` may refuse it under `server.fs.allow`. CI's build is the gate. If dev refuses it, add `server.fs.allow: ['..']` to the scaffold's `vite.config.ts`.

## Migration Plan

1. Merge this change. CI deploys `wongstack` with `MEMORY_DB` → `wongstack-memory` and `MEMORY_BUCKET` → `wongstack-memory`.
2. Run `memory.mjs migrate` (creates `memory_keys`; with the Worker recorded, it runs with the admin token).
3. Run `memory.mjs member add <git email> --admin --env`, then `memory.mjs digest`.
4. When the digest loads, delete the `wongstack-memory` Cloudflare token. When it fails, restore the old `.env` line.

Rollback: revert the merge. A memory key then fails against the REST API. Restore the old token in `.env` from before step 3, keep the `memory_keys` table, and continue.

Before merge, rehearse on real infrastructure: deploy a scratch Worker that bundles `handleMemory`, with a scratch D1 and R2 bucket, run `migrate`, `member add`, `search`, a fact write, and `source` against it through the memory script, then delete the scratch resources.

<!-- end design.md -->
<!-- file tasks.md utf8 3325 -->
## 1. Memory skill

- [x] 1.1 Turn `memory-worker.mjs` into the app's handler: export `MEMORY_PREFIX` and `handleMemory(request, env)` on `MEMORY_DB`/`MEMORY_BUCKET`, answer 404 `no_store` without `MEMORY_DB`, read keys from `memory_keys`, refuse any batch naming `memory_keys` or `writable_schema` with 403, drop `bindingFor` and the default export (review.html#/one-worker)
- [x] 1.2 Add `memory-worker.d.mts` beside it; move `worker/keys.sql` to `migrations/0002_keys.sql` as `memory_keys` with no `database_id` or `bucket` column
- [x] 1.3 Cut `members.mjs` to `member add|remove|list` on the memory database through the admin REST path; remove `worker deploy`, `WORKER_NAME`, `KEYS_DATABASE`, and the deploy code; name `D1 Write` on a 401/403
- [x] 1.4 In `store.mjs`, route a memory key to `components.memory.worker` and any other token to the REST API; raise `unconfigured` on a key's 404; update `memory.mjs` usage and comments
- [x] 1.5 Rewrite `scripts/tests/memory-worker.test.mjs` for the handler: member add/remove/list against the harness store, 401 for an unknown or other repo's key, 403 for every key-table spelling (case, quotes, brackets, backticks, trigger body, `writable_schema`), 404 without `MEMORY_DB`, transcript privacy, the token-type route, a 404 that spools, and `worker deploy` gone

## 2. App scaffold and pipeline scripts

- [x] 2.1 Route `/_memory/` in `app/worker/index.ts` to `handleMemory`, and cover it in `index.test.ts` (404 `no_store` with no bindings) (review.html#/one-worker)
- [x] 2.2 Bind `MEMORY_DB` → `wongstack-memory` and `MEMORY_BUCKET` → `wongstack-memory` at the top level of this repo's `app/wrangler.jsonc`, not in `env.staging`, and record `components.memory.worker` in `.claude/.wong-stack.json` (review.html#/one-worker/deploy)
- [x] 2.3 Skip `MEMORY_*` bindings in `cf-secrets.mjs`'s twin check, and skip `MEMORY_DB` in `lib-wrangler-config.mjs`'s `databaseName` and `hasD1`; add cases to `cf-secrets.test.mjs` and `wrangler-config.test.mjs`

## 3. Setup, sync, and docs

- [x] 3.1 Rewrite setup's provisioning runbook: the names table, 4b (bindings, recorded URL, migrate, admin key; no `worker deploy`), re-runs, "Moving an older store" to the app Worker, 4c's config, and a digest check in 4g
- [x] 3.2 Add the memory bindings and a production-only rule to the `wrangler.jsonc` fragment in `stack-pack-fragments.md`; update the payload manifest's memory section and `/wong-sync`'s provisioning line
- [x] 3.3 Rewrite `wiki/development/memory.md`'s memory-token section for the app Worker; update the memory skill, `SECURITY.md`, `required-tools.md`, `cloudflare-credentials.md`, the teardown steps in `getting-started.md`, and the Access page's bypass note for `/_memory/*`
- [x] 3.4 Update the `memory-worker` main spec's Purpose line for the app Worker
- [x] 3.5 Bump `VERSION` to 23.0.0 with a `CHANGELOG.md` entry, and run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`

## 4. Proof

- [x] 4.1 Rehearse on real infrastructure: a scratch Worker bundling `handleMemory` with a scratch D1 and R2 bucket; run `migrate`, `member add`, a fact write, `search`, `source`, a key-table probe, and `member remove` through the memory script; then delete every scratch resource
- [x] 4.2 Get CI green on the branch through `/save`

<!-- end tasks.md -->
<!-- file specs/cf-secret-parity/spec.md utf8 3164 -->
## MODIFIED Requirements

### Requirement: A parity gate compares the two Workers to each other, and staging's bindings to production's

The pack SHALL provide a `secrets:check` operation that fails when the two Workers have drifted. Because `.dev.vars` is git-ignored and therefore absent in CI, the authoritative comparison SHALL be **Worker against Worker** — the secret names held by production against those held by staging — which requires no local file, no secret value, and no state beyond the two environments themselves.

The check SHALL additionally assert that every stateful binding declared at the top level of `wrangler.jsonc` reappears inside `env.staging`, catching the drift class the twin rule describes: an environment inherits no binding it does not redeclare, so a binding added to production alone is simply absent in staging. This half SHALL be a pure config read requiring no credential, so it runs even on an unprovisioned repo. Durable Objects SHALL be excluded, their storage being per-Worker and so already isolated. A binding whose name starts with `MEMORY_` SHALL be excluded, because the memory store is production-only by design and has no staging twin. Queue producers SHALL be compared by binding name. Queue consumers SHALL be compared by count, because the twin rule requires a staging consumer to read a different queue from its production twin; a staging consumer that reads a queue that production also consumes SHALL produce a warning, not a failure.

Failure output SHALL name the missing keys or bindings so the fix is mechanical.

#### Scenario: A secret added to only one Worker fails the check

- **WHEN** a secret exists in the production Worker but is missing from staging
- **THEN** `secrets:check` exits non-zero and names the missing key

#### Scenario: The check runs in CI without a local secrets file

- **WHEN** the gate runs in CI, where `.dev.vars` does not exist
- **THEN** it still compares the two environments' secret names
- **AND** it does not fail merely because no local secrets file is present

#### Scenario: A binding added to production alone fails the check

- **WHEN** a stateful binding is declared at the top level of `wrangler.jsonc` with no counterpart in `env.staging`
- **THEN** `secrets:check` exits non-zero and names the binding

#### Scenario: The memory bindings are production-only

- **WHEN** the top level binds `MEMORY_DB` and `MEMORY_BUCKET` and `env.staging` binds neither
- **THEN** `secrets:check` reports no binding failure for them

#### Scenario: A correctly twinned queue consumer passes

- **WHEN** production consumes `app-jobs` and `env.staging` consumes `app-jobs-staging`
- **THEN** `secrets:check` reports no queue-consumer failure

#### Scenario: A consumer missing from staging fails the check

- **WHEN** production declares more queue consumers than `env.staging`
- **THEN** `secrets:check` exits non-zero and names both counts

#### Scenario: A consumer copied but not repointed warns

- **WHEN** a staging queue consumer reads a queue that production also consumes
- **THEN** `secrets:check` prints a warning that names the queue and does not fail on it

<!-- end specs/cf-secret-parity/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 4875 -->
## MODIFIED Requirements

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, bind them in the production part of the app's wrangler config as `MEMORY_DB` and `MEMORY_BUCKET`, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-worker` requires. It SHALL NOT bind them in `env.staging`. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the production Worker's memory URL under `components.memory` in `.claude/.wong-stack.json`. It SHALL NOT deploy a separate memory Worker. It SHALL check the digest through the Worker once production has deployed, as part of the smoke test. A run that finds the store already provisioned SHALL change nothing. Creating the key is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket, bind it in the production config, and give the `<repo>-deploy` token `Workers R2 Storage Write`; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the app's production Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: The memory store is bound in production only

- **WHEN** provisioning writes the app's wrangler config
- **THEN** the top level binds `MEMORY_DB`, and `MEMORY_BUCKET` when R2 is enabled
- **AND** `env.staging` binds neither, and no `wong-memory` Worker is created

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, binds it in the production config, gives the deploy token R2 access, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, its bindings, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing

## ADDED Requirements

### Requirement: Teardown removes what provisioning created

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, the deploy token, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch. The memory keys SHALL go with the memory store, because they live in its database. Teardown SHALL NOT touch another repo's memory store.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

#### Scenario: Another repo's memory is untouched

- **WHEN** teardown runs for `billing` in an account that also holds `home`'s memory store
- **THEN** teardown removes nothing of `home`'s, and `home`'s production Worker keeps serving its memory

## REMOVED Requirements

### Requirement: Everything provisioned can be torn down

**Reason**: It named a shared memory Worker and a keys database that no longer exist.

**Migration**: "Teardown removes what provisioning created" keeps every other rule; the memory keys go with the memory store.

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/memory-store/spec.md utf8 2734 -->
## MODIFIED Requirements

### Requirement: Every repo has one memory store on Cloudflare

Every WongStack repo SHALL have one memory store: one D1 database named `<repo>-memory` in the repo's Cloudflare account, plus one private R2 bucket of the same name when the account has R2 enabled. The bucket SHALL be optional. Without it, the store SHALL keep no raw transcripts, and every other memory behavior SHALL work the same. The store SHALL be separate from any application database, and it SHALL have no staging twin. Only the app's production Worker SHALL bind it, for the memory route alone. The account id, database id, and bucket name (or its absence) SHALL be recorded under `components.memory` in `.claude/.wong-stack.json`. They are not secrets.

#### Scenario: A repo is provisioned

- **WHEN** provisioning completes in a repo named `billing`
- **THEN** a D1 database named `billing-memory` exists, and a private R2 bucket of the same name exists when the account has R2 enabled
- **AND** `.claude/.wong-stack.json` records the account id, database id, and bucket name or its absence under `components.memory`

#### Scenario: An account without R2

- **WHEN** the store has no bucket
- **THEN** facts, the write gate, search, the digest, capture, and consolidation all work
- **AND** no raw transcript is stored

#### Scenario: The app database is separate

- **WHEN** the repo also has the stack pack's production and staging databases
- **THEN** the memory database is a third database, bound only to the production Worker as `MEMORY_DB`
- **AND** the staging Worker has no binding to it, and CI never applies the app's migrations to it

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the app's production Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention, as `memory-worker` requires. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory, except an older store's token until its move finishes.

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

<!-- end specs/memory-store/spec.md -->
<!-- file specs/memory-worker/spec.md utf8 7990 -->
## ADDED Requirements

### Requirement: The app's production Worker serves the memory store

Each repo's memory store SHALL be served by the repo's own production app Worker, under the path prefix `/_memory/`. The production Worker SHALL bind the memory database as `MEMORY_DB` and, when the store has one, the bucket as `MEMORY_BUCKET`. The staging Worker and every preview SHALL bind neither, and SHALL answer every `/_memory/` request with HTTP 404. The bindings SHALL be declared in the app's wrangler config and deployed by CI with the app; no separate memory Worker and no person's deploy command SHALL exist. The memory request handling SHALL ship with the memory skill, so that `/wong-sync` updates it, and the app's Worker SHALL reach it through one route. The Worker URL recorded under `components.memory.worker` SHALL be the production Worker's `workers.dev` address followed by `/_memory`.

#### Scenario: Production serves memory

- **WHEN** a member runs `memory.mjs search deploy` in a repo whose production Worker has deployed the memory route
- **THEN** the request goes to `https://<worker>.<subdomain>.workers.dev/_memory/...` and returns the facts

#### Scenario: A preview has no memory

- **WHEN** any request reaches `/_memory/` on the staging Worker or a preview alias
- **THEN** the Worker answers 404 and reads no memory database

#### Scenario: A merge deploys a memory change

- **WHEN** a change to the memory request handling merges to `main`
- **THEN** CI's production deploy carries it, and nobody runs a separate memory deploy

### Requirement: The admin manages memory keys with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, and `member list` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`, straight to the memory database. `member add` SHALL create a random key for the email on this repo's store, store only its hash, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace its earlier key. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke the email's key on this repo at once. `member list` SHALL print this repo's emails and roles, and no key or hash. The script SHALL have no command that deploys a Worker. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`
- **THEN** the next call with Ana's key is refused with 401

#### Scenario: The token cannot write D1

- **WHEN** `member add` runs with a `CLOUDFLARE_API_TOKEN` that lacks `D1 Write`
- **THEN** the command stops, names that permission, and changes nothing

#### Scenario: No deploy command

- **WHEN** someone runs `memory.mjs worker deploy`
- **THEN** the script stops with its usage, and nothing is deployed

## MODIFIED Requirements

### Requirement: Every memory call uses a memory key

The memory script SHALL send every store call made with a memory key to the Worker URL recorded under `components.memory.worker`, with the memory key from `CLOUDFLARE_MEMORY_TOKEN`. Only `migrate` and the admin commands SHALL instead use the admin's `CLOUDFLARE_API_TOKEN`, straight to Cloudflare. The Worker SHALL answer the same D1 query and R2 object requests, in the same shapes, that the memory script sends to the Cloudflare REST API. Each key SHALL open one repo's store, as `admin` or `member`. The Worker SHALL refuse a key it does not know with HTTP 401. The key hashes SHALL be kept in a table in the memory database, and the Worker SHALL refuse, with HTTP 403 and without running it, any statement that names that table or changes the schema's write protection, so that no key can read or change a key. A `CLOUDFLARE_MEMORY_TOKEN` that is not a memory key SHALL keep using the Cloudflare REST API with the same requests, until the store is moved. When the Worker URL answers 404, the script SHALL treat the store as not yet reachable, so that facts wait in the spool.

#### Scenario: A member searches facts

- **WHEN** a member runs `memory.mjs search deploy`
- **THEN** the result is the same as the admin's search on the same store, before the personal-fact filter

#### Scenario: A key for another repo

- **WHEN** a key made for `billing`'s store is sent to `home`'s production Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: An unknown key

- **WHEN** a request carries a key that is not in the store's key table
- **THEN** the Worker answers 401 and does nothing

#### Scenario: A key tries to read the keys

- **WHEN** an admin or member key sends a statement that names the key table, in any letter case or quoting
- **THEN** the Worker answers 403, and no statement in the batch runs

#### Scenario: An older store's token

- **WHEN** `CLOUDFLARE_MEMORY_TOKEN` holds a Cloudflare token, not a memory key, and a Worker URL is recorded
- **THEN** the script calls the Cloudflare REST API with that token, as before the move

#### Scenario: Production has not deployed the route yet

- **WHEN** a fact is written with a memory key and the Worker URL answers 404
- **THEN** the fact waits in the local spool, and the next run sends it

### Requirement: Existing installs move behind the memory Worker

`/wong-sync` SHALL move an install whose `CLOUDFLARE_MEMORY_TOKEN` is still a Cloudflare token to the app's production Worker. Its planned change SHALL add the memory bindings and the memory route to the app, record the Worker URL, apply the memory migrations, and, when the store has a bucket, give the `<repo>-deploy` token `Workers R2 Storage Write`. After that change merges and production deploys, the admin SHALL create an admin key for their git email with `member add --admin --env`, and SHALL delete the old `<repo>-memory` Cloudflare token only after a store call through the Worker succeeds. Until then the old token SHALL keep working. The move SHALL tell the admin that teammates who held the old token need a member key.

#### Scenario: A solo install is moved

- **WHEN** the sync change has merged, production has deployed, and the admin finishes the move
- **THEN** `.env` holds an admin key, the digest loads through the app's production Worker, and the old token no longer exists

#### Scenario: Before production deploys

- **WHEN** the sync change is on a branch and not yet deployed to production
- **THEN** memory calls still use the old token through the Cloudflare REST API and succeed

#### Scenario: The Worker call fails during the move

- **WHEN** the first store call through the Worker fails
- **THEN** the old token and `.env` value stay as they were, and the move reports the failure

## REMOVED Requirements

### Requirement: One memory Worker serves every store in an account

**Reason**: Memory moves into each repo's own production app Worker, so there is one thing to deploy per repo, and no shared Worker whose bindings grow with every repo in the account.

**Migration**: The shared `wong-memory` Worker was never deployed, so no store moves from it. An older store on a `<repo>-memory` Cloudflare token moves straight to the app's production Worker, as "Existing installs move behind the memory Worker" requires.

### Requirement: The admin manages members with the memory script

**Reason**: Its `worker deploy` command and the scenario for a token that cannot deploy Workers belong to the removed shared Worker.

**Migration**: "The admin manages memory keys with the memory script" keeps `member add`, `member remove`, and `member list` unchanged for the user.

<!-- end specs/memory-worker/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 7749 fence=~~~ -->
~~~html
<section class="visual flow" id="one-worker" data-kind="flow" data-states="after today deploy">
  <p class="caption">Where a memory call goes, today (21.0.0) and after this change, and how memory ships.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-client"><h3><code>memory.mjs</code> sends a memory call</h3><p>A member or the admin, with a memory key (<code>wongm_...</code>).</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: send the D1 query or R2 request to the recorded URL, <code>https://&lt;worker&gt;.&lt;subdomain&gt;.workers.dev/_memory</code>. Result: the request reaches the repo's own app Worker.</p></details></div>
      <p class="flow-connector">↓ Which Worker answers?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-production"><h3>Production Worker <code>&lt;repo&gt;</code> <span class="tag">Changed</span> <i class="callout">1</i></h3><p><code>/_memory/*</code> goes to the memory module. All other paths go to the app.</p><details><summary>Details</summary><p>Actor: the app Worker. Action: check the key hash, then run the call on its bindings. Bindings: <code>DB</code> (the app), <code>MEMORY_DB</code>, and <code>MEMORY_BUCKET</code>. Result: the same endpoints and shapes as 21.0.0.</p></details></div>
        <div class="flow-branch" data-target-id="after-staging"><h3>Staging Worker and previews <span class="tag">Changed</span> <i class="callout">2</i></h3><p>No memory bindings. <code>/_memory/*</code> answers 404.</p><details><summary>Details</summary><p>Actor: the staging Worker or a preview. Action: none for memory. Result: HTTP 404. A branch cannot read or write memory.</p></details></div>
      </div>
      <p class="flow-connector">↓ Production only</p>
      <div class="step flow-card" data-target-id="after-store"><h3>The repo's memory store <span class="tag">Changed</span> <i class="callout">3</i></h3><p>The memory database, with a <code>memory_keys</code> table inside it, and the bucket.</p><details><summary>Details</summary><p>Actor: the memory module. Action: refuse every statement that names <code>memory_keys</code> or <code>writable_schema</code>. Result: no key can read or change keys. A key from another repo is not in this table, so it gets HTTP 401.</p></details></div>
    </div><p><a href="#/one-worker/deploy">See how memory ships</a></p></div>
    <div class="state state-today"><h2>Today (21.0.0)</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-client"><h3><code>memory.mjs</code> sends a memory call</h3><p>With a memory key, to the account's shared Worker.</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: send the call to the <code>wong-memory</code> URL. Result: the call does not touch the repo's app Worker.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-shared"><h3>Shared Worker <code>wong-memory</code>, one per account</h3><p>Binds every repo's memory database and bucket, and <code>KEYS</code>.</p><details><summary>Details</summary><p>Actor: the shared Worker. Action: find the binding for the database id or bucket name in the path. Result: the binding list grows with each repo, and a person deploys it with <code>memory.mjs worker deploy</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="today-stores"><h3>Each repo's memory store</h3><p>A memory database and a bucket for each repo.</p><details><summary>Details</summary><p>Actor: the shared Worker. Action: run the call on the matched binding. Result: one Worker serves many stores.</p></details></div>
        <div class="flow-branch" data-target-id="today-keys"><h3><code>wong-memory-keys</code> database</h3><p>The key hashes for all repos. One more D1 database.</p><details><summary>Details</summary><p>Actor: the shared Worker. Action: check the key hash. Result: no request path reaches this database.</p></details></div>
      </div>
      <p class="flow-connector">↓ Separate from memory</p>
      <div class="step flow-card" data-target-id="today-app"><h3>App Worker <code>&lt;repo&gt;</code></h3><p>Serves the app only. CI deploys it.</p><details><summary>Details</summary><p>Actor: CI. Action: deploy the app on each push. Result: the app and memory are two things to deploy and manage.</p></details></div>
    </div></div>
    <div class="state state-deploy"><h2>How memory ships</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="deploy-push"><h3>A push to GitHub</h3><p>A memory change is app code now.</p><details><summary>Details</summary><p>Actor: a person or <code>/save</code>. Action: push a commit. Result: <code>deploy.yml</code> runs <code>cf-build.sh</code> and <code>cf-deploy.sh</code>.</p></details></div>
      <p class="flow-connector">↓ Which branch?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="deploy-main"><h3>Merge to <code>main</code> <span class="tag">Changed</span> <i class="callout">4</i></h3><p>CI deploys the production Worker with <code>MEMORY_DB</code> and <code>MEMORY_BUCKET</code>.</p><details><summary>Details</summary><p>Actor: CI, with the deploy token. Action: <code>wrangler deploy</code> from <code>app/wrangler.jsonc</code>. Result: the memory route goes live. The token needs <code>Workers R2 Storage Write</code> when the store has a bucket.</p></details></div>
        <div class="flow-branch" data-target-id="deploy-branch"><h3>Any other branch</h3><p>CI deploys the staging Worker and a preview, with no memory bindings.</p><details><summary>Details</summary><p>Actor: CI. Action: <code>wrangler deploy --env staging</code>, then a preview upload. Result: <code>/_memory/*</code> answers 404 there. CI never migrates the memory database as the app's.</p></details></div>
      </div>
      <p class="flow-connector">↓ Not through the Worker</p>
      <div class="step flow-card" data-target-id="deploy-admin"><h3>Admin commands go straight to Cloudflare <span class="tag">Changed</span> <i class="callout">5</i></h3><p><code>member add</code>, <code>member remove</code>, <code>member list</code>.</p><details><summary>Details</summary><p>Actor: the admin. Action: run the command with <code>CLOUDFLARE_API_TOKEN</code>. Result: it writes <code>memory_keys</code> through the Cloudflare D1 REST API. No person runs a memory deploy; <code>memory.mjs worker deploy</code> is removed.</p></details></div>
    </div></div>
  </div>
  <div class="notes"><ol>
    <li>Memory moves into the app Worker that every install already has. Per account, one Worker and one D1 database are fewer. The risk: a failed production deploy also stops memory, and app code can reach the memory bindings.</li>
    <li>Only production gets the bindings, so a branch or preview cannot read transcripts. The 404 also makes a new install spool its facts until the first production deploy.</li>
    <li>The keys table sits in the memory database because a separate keys database per repo costs one of the free plan's 10 D1 databases. The Worker ignores the database id and bucket name in the path, because it serves one store.</li>
    <li>The bindings come from the stack pack's <code>wrangler.jsonc</code> fragment, in production only. <code>secrets:check</code> does not ask staging for a <code>MEMORY_*</code> twin.</li>
    <li>Key management never passes through the Worker, so no memory key, not even the admin's, can change keys.</li>
  </ol></div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 54066 fence=~~~ -->
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
<title>Review — consolidate-memory-worker</title>
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
  <b>Review · consolidate-memory-worker</b>
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

In 21.0.0, memory needs its own Worker, `wong-memory`, beside each repo's app Worker. It has its own deploy command, its own keys database, and a binding list that grows with every repo in the account. That is one more thing to deploy and manage. Every install already has an app Worker, and CI already deploys it, so memory can live there.

## What Changes

- **Memory lives in the app's production Worker.** `app/worker/index.ts` sends every request under `/_memory/` to the memory module, which stays in `.agents/skills/memory/worker/` so `/wong-sync` keeps it current. The production Worker binds the memory database as `MEMORY_DB` and the bucket as `MEMORY_BUCKET`. The staging Worker and previews bind neither, so they answer `/_memory/` with 404. The endpoints and their shapes do not change. (review.html#/one-worker)
- **CI deploys memory with the app.** The bindings go in `app/wrangler.jsonc`, in production only, from the stack pack's `wrangler.jsonc` fragment. A merge to `main` deploys a memory change. No person runs a memory deploy.
- **Keys move into the memory database.** A `memory_keys` table replaces the `wong-memory-keys` database. The Worker refuses every statement that names it, so no key can read or change keys. Only `member add`, `member remove`, and `member list`, which use the admin's `CLOUDFLARE_API_TOKEN`, touch it. Each Worker serves one store, so a key from another repo is unknown there (HTTP 401).
- **BREAKING: `memory.mjs worker deploy` is removed, and the `wong-memory` Worker is gone.** Setup records `components.memory.worker` as `https://<worker>.<subdomain>.workers.dev/_memory`. It was never deployed, so nothing moves from it.
- **The token decides the route.** A memory key (`wongm_...`) goes to the recorded Worker URL. Any other token goes straight to the Cloudflare REST API, as before. So an older store keeps working on its old token until the admin has a key. Until production first deploys the memory route, a call through the Worker spools its facts rather than failing.
- **Older stores move straight to the app Worker.** `/wong-sync` plans the bindings, the route, the recorded URL, the keys migration, and R2 on the deploy token. After the sync merges and production deploys, the admin runs `member add --admin --env`, checks `digest`, and deletes the old `<repo>-memory` token. This repo moves the same way.
- **Two pipeline checks learn about the memory bindings.** `secrets:check` does not ask staging to twin a `MEMORY_*` binding, and the database-name reader skips `MEMORY_DB`, so CI never migrates the memory database as the app's.

**Non-goals:** no memory on the staging Worker or previews. No move of existing data or transcripts. No change to what a member or the admin can read. No change to the digest, capture, or search.
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

<section class="visual flow" id="one-worker" data-kind="flow" data-states="after today deploy">
  <p class="caption">Where a memory call goes, today (21.0.0) and after this change, and how memory ships.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-client"><h3><code>memory.mjs</code> sends a memory call</h3><p>A member or the admin, with a memory key (<code>wongm_...</code>).</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: send the D1 query or R2 request to the recorded URL, <code>https://&lt;worker&gt;.&lt;subdomain&gt;.workers.dev/_memory</code>. Result: the request reaches the repo's own app Worker.</p></details></div>
      <p class="flow-connector">↓ Which Worker answers?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-production"><h3>Production Worker <code>&lt;repo&gt;</code> <span class="tag">Changed</span> <i class="callout">1</i></h3><p><code>/_memory/*</code> goes to the memory module. All other paths go to the app.</p><details><summary>Details</summary><p>Actor: the app Worker. Action: check the key hash, then run the call on its bindings. Bindings: <code>DB</code> (the app), <code>MEMORY_DB</code>, and <code>MEMORY_BUCKET</code>. Result: the same endpoints and shapes as 21.0.0.</p></details></div>
        <div class="flow-branch" data-target-id="after-staging"><h3>Staging Worker and previews <span class="tag">Changed</span> <i class="callout">2</i></h3><p>No memory bindings. <code>/_memory/*</code> answers 404.</p><details><summary>Details</summary><p>Actor: the staging Worker or a preview. Action: none for memory. Result: HTTP 404. A branch cannot read or write memory.</p></details></div>
      </div>
      <p class="flow-connector">↓ Production only</p>
      <div class="step flow-card" data-target-id="after-store"><h3>The repo's memory store <span class="tag">Changed</span> <i class="callout">3</i></h3><p>The memory database, with a <code>memory_keys</code> table inside it, and the bucket.</p><details><summary>Details</summary><p>Actor: the memory module. Action: refuse every statement that names <code>memory_keys</code> or <code>writable_schema</code>. Result: no key can read or change keys. A key from another repo is not in this table, so it gets HTTP 401.</p></details></div>
    </div><p><a href="#/one-worker/deploy">See how memory ships</a></p></div>
    <div class="state state-today"><h2>Today (21.0.0)</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-client"><h3><code>memory.mjs</code> sends a memory call</h3><p>With a memory key, to the account's shared Worker.</p><details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: send the call to the <code>wong-memory</code> URL. Result: the call does not touch the repo's app Worker.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-shared"><h3>Shared Worker <code>wong-memory</code>, one per account</h3><p>Binds every repo's memory database and bucket, and <code>KEYS</code>.</p><details><summary>Details</summary><p>Actor: the shared Worker. Action: find the binding for the database id or bucket name in the path. Result: the binding list grows with each repo, and a person deploys it with <code>memory.mjs worker deploy</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="today-stores"><h3>Each repo's memory store</h3><p>A memory database and a bucket for each repo.</p><details><summary>Details</summary><p>Actor: the shared Worker. Action: run the call on the matched binding. Result: one Worker serves many stores.</p></details></div>
        <div class="flow-branch" data-target-id="today-keys"><h3><code>wong-memory-keys</code> database</h3><p>The key hashes for all repos. One more D1 database.</p><details><summary>Details</summary><p>Actor: the shared Worker. Action: check the key hash. Result: no request path reaches this database.</p></details></div>
      </div>
      <p class="flow-connector">↓ Separate from memory</p>
      <div class="step flow-card" data-target-id="today-app"><h3>App Worker <code>&lt;repo&gt;</code></h3><p>Serves the app only. CI deploys it.</p><details><summary>Details</summary><p>Actor: CI. Action: deploy the app on each push. Result: the app and memory are two things to deploy and manage.</p></details></div>
    </div></div>
    <div class="state state-deploy"><h2>How memory ships</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="deploy-push"><h3>A push to GitHub</h3><p>A memory change is app code now.</p><details><summary>Details</summary><p>Actor: a person or <code>/save</code>. Action: push a commit. Result: <code>deploy.yml</code> runs <code>cf-build.sh</code> and <code>cf-deploy.sh</code>.</p></details></div>
      <p class="flow-connector">↓ Which branch?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="deploy-main"><h3>Merge to <code>main</code> <span class="tag">Changed</span> <i class="callout">4</i></h3><p>CI deploys the production Worker with <code>MEMORY_DB</code> and <code>MEMORY_BUCKET</code>.</p><details><summary>Details</summary><p>Actor: CI, with the deploy token. Action: <code>wrangler deploy</code> from <code>app/wrangler.jsonc</code>. Result: the memory route goes live. The token needs <code>Workers R2 Storage Write</code> when the store has a bucket.</p></details></div>
        <div class="flow-branch" data-target-id="deploy-branch"><h3>Any other branch</h3><p>CI deploys the staging Worker and a preview, with no memory bindings.</p><details><summary>Details</summary><p>Actor: CI. Action: <code>wrangler deploy --env staging</code>, then a preview upload. Result: <code>/_memory/*</code> answers 404 there. CI never migrates the memory database as the app's.</p></details></div>
      </div>
      <p class="flow-connector">↓ Not through the Worker</p>
      <div class="step flow-card" data-target-id="deploy-admin"><h3>Admin commands go straight to Cloudflare <span class="tag">Changed</span> <i class="callout">5</i></h3><p><code>member add</code>, <code>member remove</code>, <code>member list</code>.</p><details><summary>Details</summary><p>Actor: the admin. Action: run the command with <code>CLOUDFLARE_API_TOKEN</code>. Result: it writes <code>memory_keys</code> through the Cloudflare D1 REST API. No person runs a memory deploy; <code>memory.mjs worker deploy</code> is removed.</p></details></div>
    </div></div>
  </div>
  <div class="notes"><ol>
    <li>Memory moves into the app Worker that every install already has. Per account, one Worker and one D1 database are fewer. The risk: a failed production deploy also stops memory, and app code can reach the memory bindings.</li>
    <li>Only production gets the bindings, so a branch or preview cannot read transcripts. The 404 also makes a new install spool its facts until the first production deploy.</li>
    <li>The keys table sits in the memory database because a separate keys database per repo costs one of the free plan's 10 D1 databases. The Worker ignores the database id and bucket name in the path, because it serves one store.</li>
    <li>The bindings come from the stack pack's <code>wrangler.jsonc</code> fragment, in production only. <code>secrets:check</code> does not ask staging for a <code>MEMORY_*</code> twin.</li>
    <li>Key management never passes through the Worker, so no memory key, not even the admin's, can change keys.</li>
  </ol></div>
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
