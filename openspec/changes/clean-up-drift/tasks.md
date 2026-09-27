# Tasks

## 1. Wiki pages and rules

- [x] 1.1 Fix `wiki/stack/core-stack.md` (Tailwind, the preview sentence, "No `npm install`") and `wiki/stack/getting-started.md` (lines 16, 18, 67) per design.md, Page wording. Verify `grep -in "tailwind\|fetches\|left completely alone" wiki/stack/core-stack.md wiki/stack/getting-started.md` finds nothing.
- [x] 1.2 Fix `wiki/contributing.md:20`, `wiki/development/required-tools.md:96`, and the `wiki/ux-principles.md` headings, anchor, and "Part 1 brief". Verify `grep -rn "resets it\|Step 0\|Part 1\|Part 2\|#part-" wiki .agents` finds nothing live.
- [x] 1.3 Add the `cf-preview.sh` and `mini-dashboard.mjs` rows to the script table in `wiki/stack/d1-pipeline.md`. Verify every `scripts/*.sh` and `scripts/*.mjs` a deploy or preview runs has a row.
- [x] 1.4 Point `.claude/rules/openspec.md:7` at the repeatable-knowledge rule and `.claude/rules/secrets.md:17` at `save/references/named-secrets.md`. Verify both links resolve.
- [x] 1.5 Give the pull request its plain name, *the change on GitHub*: `wiki/README.md` glossary (Pull request and Save entries), `.agents/skills/explore/references/asking-the-user.md:28` (that phrase only), `.agents/skills/continue/SKILL.md:73`. Verify `grep -rn "review page on GitHub" wiki .agents AGENTS.md README.md` finds nothing.

## 2. Skill text

- [x] 2.1 Replace `npm run db:query:staging` in `.agents/skills/verify/references/walkthrough.md` with the `wrangler d1 execute … --env staging` command from design.md. Verify `grep -rn "db:query" .agents wiki` finds nothing.
- [x] 2.2 In `.agents/skills/update-dependencies/SKILL.md`, add `scripts/tests/` to the survey and name the four OpenSpec pin files and the test that checks them. Verify the section names each of the four paths once.

## 3. Specs and `docsPath`

- [x] 3.1 Remove `docsPath` from `.agents/skills/wong-sync/scripts/preflight.mjs`, its two tests in `scripts/tests/wong-sync-preflight.test.mjs`, `payload-manifest.md` (line 26 paragraph, line 69 phrase), and `wong-sync/SKILL.md:32`; add `docsPath` to `scripts/retired-names.json`. Keep or drop `path-collision` per design.md. Verify `node --test scripts/tests/wong-sync-preflight.test.mjs` passes and `node scripts/check-retired-names.mjs` passes.
- [x] 3.2 Verify the eight spec deltas still match the main specs they modify (`openspec validate clean-up-drift --strict --no-interactive`); `/save` reconciles them into `openspec/specs/`.

## 4. Checks

- [x] 4.1 Make `.github/scripts/loosened-checks.mjs` treat every `.github/workflows/*.yml` or `*.yaml` as settings; add tests in `scripts/tests/loosened-checks.test.mjs` that an unexplained `payload.yml` edit and an unexplained `deploy.yml` edit each fail, naming the file. Verify `node --test scripts/tests/loosened-checks.test.mjs` passes.
- [x] 4.2 Widen the lint paths in `.github/workflows/payload.yml` and the coverage `src`/`include` in `scripts/tests/.c8rc.json` per design.md. Verify `scripts/tests/node_modules/.bin/oxlint --deny-warnings` on the new paths reports nothing, fixing any finding it makes.
- [x] 4.3 Make `envKey` in `scripts/tests/memory-worker.test.mjs` tolerate a missing match, and the renewal wait treat a missing key as "not yet". Verify `node --test scripts/tests/memory-worker.test.mjs` passes.
- [x] 4.4 Make `scripts/tests/server-setup.test.mjs` check all four OpenSpec pins, naming a file with a missing or different pin. Verify it passes, and fails when one pin is edited by hand (then revert).

## 5. Release

- [x] 5.1 Bump `VERSION` to 26.2.0 (or the next minor after `main`) and add a newest-first `CHANGELOG.md` entry in plain words, with an Updating note: workflow files now need a `Check:` line, and `components.docsPath` is ignored. Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; verify all pass.
- [ ] 5.2 Save with `/save` and verify CI passes, the coverage floor included; if coverage falls below the floor, add tests for the newly measured files and save again.
