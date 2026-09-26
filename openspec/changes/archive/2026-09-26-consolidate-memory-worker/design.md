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
