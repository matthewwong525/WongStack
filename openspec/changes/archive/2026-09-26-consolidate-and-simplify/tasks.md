## 1. Skills and rules

- [x] 1.1 Record the before counts: run `node scripts/measure-context.mjs` and note instruction and owner words in the Decision log
- [x] 1.2 Trim `ship/SKILL.md`: link the change loop for the pull-in and gate (`:9-11`, `:32-44`), link `openspec-cli.md` for validate/archive (`:58`), shorten the report to `merge.sh`'s lines plus checkpoint, walk, and secrets (`:114-127`)
- [x] 1.3 Trim `continue/SKILL.md` (`:9-17`, `:31`/`:78` status list, `:100-105`) and move pasted-review handling (`:96`) to `plan/SKILL.md`
- [x] 1.4 Trim `apply/SKILL.md` Boundaries (`:68-76`) to about 90 words, and delete the loop line from `apply`, `explore`, and `continue`
- [x] 1.5 Trim `explore/SKILL.md`: remove the ask-shape copy (`:19`, `:44-48`), the "should it be code" section (`:72-74`, owned by `plan`), and the restated CLI contract (`:76-78`). Cut `plan/SKILL.md:15` to one sentence and a link
- [x] 1.6 Replace the git-boundary copies with a link, per the design's owner table (`rules/openspec.md`, `continue`, `apply`, `save`, `verify`, `update-dependencies`, `openspec-cli.md`)
- [x] 1.7 `save` references:
  - Cut the credential-exclusion copies in `named-secrets.md`, `prose-save.md`, `mini-app-save.md`, and `git-gate.md` to a link to `save/SKILL.md`.
  - Trim `git-gate.md:78-88`.
  - Keep the default-branch rule in `git-gate.md#the-default-branch`, its existing owner, and link it.
  - Fold `archived-save.md` into `save/SKILL.md`, and `spec-sync.md` into `plan/references/openspec-cli.md`, then delete both files.
- [x] 1.8 Delete the stale "browser checks, critique, and revision" phrase in `save/references/new-plan.md:9`
- [x] 1.9 `memory`: link the owner for the private-life rule and for store-unreachable handling (`explore`, `continue`, `ship`)
- [x] 1.10 `verify/SKILL.md:83-102`: keep the verdict meanings and link `git-gate.md` for `UNKNOWN` vs `NONE`
- [x] 1.11 `wong-setup/references/cloudflare.md`: delete the Hard rules (`:240-255`) and the widen restatements (`:28`, `:92`, `permission-groups.md:17`) in favor of a link to the credentials page
- [x] 1.12 `wong-sync/references/payload-manifest.md:20-36`: keep the classification rules and link the routing in `wong-sync/SKILL.md`. Update `payload-files.json` and the manifest for every added or deleted reference

## 2. Wiki

- [x] 2.1 `development/the-change-loop.md`: replace `:51-71`, the mini-app passages (`:84-86`, `:145-155`), and `:167` with short links to their owners
- [x] 2.2 `development/staging-walkthrough.md`: keep only the reasons (SPA fallback, "What it is not", "Why this engine"), and link `verify/references/walkthrough.md`, `required-tools.md`, and `stack/cloudflare-access.md` for the rest
- [x] 2.3 `stack/cloudflare-access.md` owns the Access service token: cut `stack/cloudflare-credentials.md:104-135` to a link
- [x] 2.4 Move `stack/d1-pipeline.md:190-243` (`.dev.vars` and secret parity) into `development/secrets.md`, and cut `cloudflare-credentials.md:136-150` to a link
- [x] 2.5 `stack/cloudflare-credentials.md`:
  - Cut the widen section `:74-102` to the standing authorization and the trade-off, plus a link to `permission-groups.md`.
  - Fix `:82`: memory uses a key, not a minted token.
- [x] 2.6 Fix stale wording:
  - Rename the `development/memory.md:36` heading "The memory token" to "The memory key".
  - Change `.claude/` links in `the-change-loop.md:179` and `adding-a-skill.md:3,7` to `.agents/`, per `repo-layout.md`.
- [x] 2.7 `README.md:95-106`: a short list and a link to `wiki/development/required-tools.md`

## 3. Specs

- [x] 3.1 Set `retire_capabilities: true` in `.openspec.yaml`, so `openspec archive` syncs the deltas and deletes the emptied `memory-worker` and `session-notes` specs itself
- [x] 3.2 Grep live specs, skills, and wiki for the `memory-worker` and `session-notes` capability names, and point each hit at `memory-store` or `memory-capture`
- [x] 3.3 Check that no skill or wiki page still offers `/opsx:*` or an `openspec-*` skill, per the `payload-single-source` delta

## 4. Code

- [x] 4.1 Delete `scripts/tests/fixtures/openspec-apply-change/`
- [x] 4.2 Add `scripts/tests/fixtures/pack.mjs`, move the throwaway-repo setup of `wrangler-config.test.mjs`, `mini-apps.test.mjs`, and `cf-secrets.test.mjs` onto it, and fold `cf-deploy.test.mjs` into `wrangler-config.test.mjs`. Every existing assertion is kept
- [x] 4.3 Move the shared blocks of `cf-deploy.sh` and `cf-preview.sh` into `scripts/lib-wrangler-config.sh`: the preview alias rule, preview URL extraction, and staging-is-not-production check. Share `cf-build.sh`'s branch setup where it matches. Exit codes and messages stay the same
- [x] 4.4 Add `scripts/check-retired-names.mjs` and `scripts/retired-names.json` with the seed list from the design, and a test covering a hit, an allowed path, the history exemptions, and `--help`. Run it in `payload.yml`'s release checks, list it in `.github/CONTRIBUTING.md`, and add the "retire the old name" bullet to `.agents/rules/payload.md`. Keep both files out of `payload-files.json`
- [x] 4.5 Run `node --test scripts/tests/*.test.mjs` for the pack and fixture tests. CI runs the full suite and deploys a preview through the changed scripts on `/save`

## 5. Release

- [x] 5.1 `CHANGELOG.md`: replace entries 18.1.0…1.0.0 with one line naming `git show <sha>:CHANGELOG.md`, and add the 24.0.3 entry
- [x] 5.2 Bump `VERSION` to 24.0.3
- [x] 5.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict`, and `node scripts/measure-context.mjs`, and record the after counts in the Decision log
- [x] 5.4 `openspec validate consolidate-and-simplify --strict --no-interactive`, then `/save` for CI and the preview
