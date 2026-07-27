## 1. The three zero-config scripts

- [x] 1.1 `scripts/cf-build.sh` — generalize from `~/ClaymooApp/scripts/cf-build.sh`: keep the branch→prod/staging migrate + swap logic; **delete** the duplicate-prefix guard (timestamp prefixes make it unnecessary); read the D1 database name from `wrangler.jsonc` (no hardcoded name); strip all Claymoo container / `D1_DATABASE_ID` swap specifics. Local (non-CI) runs skip migrate/swap and just build.
- [x] 1.2 `scripts/swap-d1-id.js` — generalize from source: **drop the `PROD_DB_ID` constant**; read `database_id` and `preview_database_id` from `wrangler.jsonc` and regex-swap them (comments preserved); keep the idempotency/error-on-no-match guards. No per-repo value in the file.
- [x] 1.3 `scripts/reset-staging-d1.mjs` — gut the prod-export / topo-sort / self-FK-strip / `INSERT OR IGNORE` machinery. New body: drop all staging objects → apply migrations to staging → apply `schema/seed.sql` to staging. **Never** reads or touches prod. Reads DB name from `wrangler.jsonc`.
- [x] 1.4 Confirm all three scripts are byte-identical-across-repos (no repo-specific literal) and resolve every repo value from `wrangler.jsonc` / `.env`.

## 2. Template files + config fragments

- [x] 2.1 `schema/seed.sql` — a commented, empty data-only INSERT template, with a header note: data-only, applied after migrations; a change that alters a seeded table updates this file in the same change.
- [x] 2.2 `schema/migrations/.gitkeep` — plus a one-line README note (in the pipeline doc) on the `YYYYMMDDHHMMSS_name.sql` naming.
- [x] 2.3 Author the guided config fragments as installer-applied reference content (not manifest pull-files): `package.json` scripts (`build` → `cf-build.sh`, `db:migrate:staging`, `db:migrate:prod`, `db:reset:staging`); `wrangler.jsonc` `d1_databases` block (`database_id`, `preview_database_id`, `migrations_dir`); `.env.example` (`CLOUDFLARE_USER_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`); `.gitignore` (`.dev.vars`). Each carries the WONG-STACK-block-style "show + apply with confirmation, never blind-write" instruction.

## 3. Stack pipeline docs (`wiki/stack/`)

- [x] 3.1 `wiki/stack/core-stack.md` — React 19 + Vite 8 (stable, no `overrides`) + Cloudflare Workers + D1, `@cloudflare/vite-plugin`, Tailwind 4; why the combo suits AI-driven dev (merge = deploy, one runtime, cheap previews). Principle-led; pin versions where the scaffold needs them.
- [x] 3.2 `wiki/stack/d1-pipeline.md` (or a small sub-hub) — the two-database model (one binding, `database_id` + `preview_database_id`), auto-migrate-on-deploy (main→prod, else→staging + swap), timestamp migrations + the additive/order-independent rule, and the seeded-staging model + `db:reset:staging`. Generalize from `~/ClaymooApp/docs/development/{staging-database,ci-and-deploy,architecture}.md`.
- [x] 3.3 Prod-recovery runbooks (in the pipeline doc): `wrangler d1 time-travel`; **never hand-apply schema to prod**; **reconcile `d1_migrations` when prod drifts**. Generalize the two source runbooks nearly verbatim in spirit.
- [x] 3.4 Link all new pages from the existing `wiki/stack/README.md` hub; keep every page stand-alone with up/down/sideways links per `wiki/wiki-style.md` + `wiki/voice.md`.

## 4. Install/sync wiring (opt-in, gated, refreshable)

- [x] 4.1 `payload-manifest.md` — add the opt-in `stack-pack` category: the drop-in files (3 scripts, `schema/seed.sql`, `schema/migrations/.gitkeep`, the new `wiki/stack/` pipeline docs) are in-manifest **only** when `components.stackPack: true`; state the config fragments are guided-edit reference content, not pull-files.
- [x] 4.2 `wong-sync` SKILL.md — teach the pull leg to include the gated pack files in its file list only when `components.stackPack` is true, refreshed by the existing three-way diff; note the config fragments follow the CLAUDE.md-block guided-edit path. Add `components.stackPack` to the manifest schema shown in Step 6.
- [x] 4.3 `wong-setup` SKILL.md — add the single opt-in prompt (decline = default, never a gate); on yes, write `components.stackPack: true` into the seed manifest (Step 7 schema) and apply the config fragments as guided edits; on no, leave it false. Update the seed-manifest schema block.
- [x] 4.4 `wiki/development/required-tools.md` — state the core-vs-pack split: core stays exactly `git`/`gh`/`openspec`; the opt-in pack may add `node`/`npm`/`wrangler` + a Cloudflare account, only in a repo that took it, only in that repo's build/CI, never in a skill.

## 5. Release + verify

- [x] 5.1 `CHANGELOG.md` entry + `VERSION` bump (minor — additive, opt-in).
- [x] 5.2 Verify: a repo that declines the pack gets zero pack files and no new required tool; the three scripts carry no per-repo literal; timestamp-migration + additive rule and both recovery runbooks are present; every new `wiki/stack/` link resolves; `openspec validate cloudflare-stack-pack` passes.
