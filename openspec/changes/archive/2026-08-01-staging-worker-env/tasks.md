## 1. Pack scripts

- [x] 1.1 Add `scripts/cf-deploy.sh` — production branch → `wrangler deploy`; any other branch → `wrangler versions upload --env staging --preview-alias <branch>` then `wrangler deploy --env staging`. Anchor paths on `${BASH_SOURCE[0]}` and resolve the wrangler config with the same root-then-subdirectory rule `cf-build.sh` uses; read the branch from `WORKERS_CI_BRANCH` and the production branch from `CF_PRODUCTION_BRANCH` (default `main`); no-op outside CI. Header comment must call out that `--env staging` is required on *both* commands.
- [x] 1.2 Edit `scripts/cf-build.sh` — delete the swap leg and the `node swap-d1-id.js` call; change the non-production migrate from `--remote --preview` to `--remote --env staging`. Keep the CWD anchoring and local-build short circuit as they are.
- [x] 1.3 Edit `scripts/reset-staging-d1.mjs` — replace the `PREVIEW_FLAGS` `--preview` with `--env staging` and update the header comment (it currently explains staging as `preview_database_id`).
- [x] 1.4 Delete `scripts/swap-d1-id.js`. Confirm `--preview` and `preview_database_id` appear nowhere under `scripts/` afterwards.
- [x] 1.5 *(added during apply)* Extract the bash wrangler-config discovery into `scripts/lib-wrangler-config.sh`, sourced by both `cf-build.sh` and `cf-deploy.sh`, so a build and its deploy cannot resolve different apps.
- [x] 1.6 *(added during apply)* Teach both name readers about environments — `read_database_name [env]` in `cf-build.sh` and `readDatabaseName(configPath, env)` in `lib-wrangler-config.mjs` — since a twin staging database has its own `database_name`. Point `reset-staging-d1.mjs` at the `staging` environment through it.

## 2. wong-sync references

- [x] 2.1 Update `.claude/skills/wong-sync/references/payload-manifest.md` — the pack's drop-in list swaps `scripts/swap-d1-id.js` for `scripts/cf-deploy.sh`.
- [x] 2.2 Rewrite the `wrangler.jsonc` fragment in `.claude/skills/wong-sync/references/stack-pack-fragments.md` — a plain `d1_databases` binding plus an `env.staging` block (own `name`, twin D1, and the twin queue/bucket pattern). Drop `preview_database_id` and the swap/log-line gotcha; keep the `migrations_dir` relative-path warning.
- [x] 2.3 Update the `package.json` fragment in the same file — `db:migrate:staging` moves from `--preview` to `--env staging`.
- [x] 2.4 Add a short **Workers Builds deploy command** section to the fragments page: `bash scripts/cf-deploy.sh`, set by hand in the dashboard, explicitly not a mergeable fragment (per design.md — Config fragments requirement).

## 3. Wiki

- [x] 3.1 Rewrite `wiki/stack/d1-pipeline.md` as the staging-environment page: open with the version-vs-deployment diagnostic and its capability table, then two environments instead of two databases, the build+deploy flow diagram, and the two preview URLs with their differing capabilities. Carry over timestamp migrations, seeded staging, and both production-recovery runbooks unchanged.
- [x] 3.2 Add the twin-by-default rule and its table (D1, Queues, R2, KV, Durable Objects, cron, secrets, service bindings) to that page, including the rejection of an R2 key prefix and the two quiet failure modes (missing staging secret, service binding left on production).
- [x] 3.3 Add the "staging is shared / why not per-PR environments" section, folding in the existing shared-staging-database caveat so there is one statement of it rather than two.
- [x] 3.4 Update the script table on that page — four scripts, with `swap-d1-id.js` gone and `cf-deploy.sh` added.
- [x] 3.5 Add the adoption runbook (design.md — Migration Plan) as a section of the pipeline page, ordered so an interrupted upgrade leaves the repo behaving as before.
- [x] 3.6 Update `wiki/stack/cloudflare-access.md` — name the staging Worker's hostname in the wildcard section (the recommended `*.<subdomain>.workers.dev` wildcard already covers it; a per-hostname list does not).
- [x] 3.7 Update `wiki/stack/cloudflare-credentials.md` for per-environment secrets (`wrangler secret put --env staging`), and check `wiki/stack/README.md`'s description of the pipeline page still reads true.
- [x] 3.8 Sweep for stale references — `grep -rn "swap-d1-id\|preview_database_id\|--preview"` across `wiki/`, `.claude/`, and `AGENTS.md`; fix every live one (leave `CHANGELOG.md` history alone).

## 4. Release

- [x] 4.1 Bump `VERSION` to `8.0.0`.
- [x] 4.2 Add the newest-first `CHANGELOG.md` entry — the version-vs-deployment diagnosis, the `env.staging` model, `cf-deploy.sh` in, `swap-d1-id.js` out, twin-by-default, and a pointer to the adoption runbook for repos on the old model.

## 5. Verification *(added during apply)*

- [x] 5.1 Exercise the scripts against a synthetic `app/`-layout repo — production vs staging name reads, the missing-`env.staging` error path, and the branch→preview-alias sanitizer.
- [x] 5.2 Confirm `--preview-alias` and `--env` exist on the wrangler commands used (4.107.0).
- [x] 5.3 Full end-to-end rehearsal against real Cloudflare: scratch Worker + twin queues, both `cf-build.sh` legs, both `cf-deploy.sh` legs, a queue message enqueued on staging, and both databases inspected. Tear down every scratch resource afterwards.
- [x] 5.4 Fix what the rehearsal found — `wrangler versions upload` must run *after* `wrangler deploy --env staging`; propagate the corrected order to the wiki, both specs, the proposal, the design, and the changelog.

