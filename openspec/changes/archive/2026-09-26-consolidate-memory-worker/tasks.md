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
