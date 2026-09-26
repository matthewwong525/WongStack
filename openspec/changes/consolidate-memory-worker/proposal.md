# Consolidate memory into the app Worker

**Status:** implemented, awaiting CI
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
