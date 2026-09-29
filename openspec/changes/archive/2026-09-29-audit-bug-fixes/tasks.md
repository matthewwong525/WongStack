## 1. Staging database guard

- [x] 1.1 Add `stagingDatabase(config)` and the `staging-database` CLI command to `scripts/lib-wrangler-config.mjs`, refusing a staging entry that matches production by `database_name` or `database_id`
- [x] 1.2 `scripts/cf-build.sh`: read the staging database through `wong_config staging-database` on non-production branches
- [x] 1.3 `scripts/cf-preview.sh`: replace the inline D1 blocks with the same call
- [x] 1.4 `scripts/cf-deploy.sh`: run the check on the staging path before `wrangler deploy`
- [x] 1.5 `scripts/reset-staging-d1.mjs`: build its refusal on `stagingDatabase`
- [x] 1.6 Tests in `scripts/tests/wrangler-config.test.mjs` and `scripts/tests/mini-apps.test.mjs`: a same-id, renamed entry stops build, deploy, preview, and reset before any wrangler call; a distinct entry still migrates

## 2. One test-file rule

- [x] 2.1 Add `mini-apps/is-test-file.mjs` (`TEST_FILE`, `isTestFile`, the folder CLI) and list it in `.agents/skills/wong-sync/references/payload-files.json` under `scaffold`
- [x] 2.2 `mini-apps/router.mjs` and `scripts/mini-dashboard.mjs` use it; the copy filter drops `test/` folders
- [x] 2.3 `.github/scripts/loosened-checks.mjs` imports `TEST_FILE`; `.github/workflows/test.yml` replaces its `find` with the CLI
- [x] 2.4 Tests: `foo_test.mjs` and `test/x.mjs` are neither copied nor served; a `test.skip` in `foo_test.mjs` is flagged; the CLI finds and misses tests as expected

## 3. Skill and setup fixes

- [x] 3.1 `.agents/skills/verify/SKILL.md` step 6 runs `node "$ROOT/scripts/reset-staging-d1.mjs"`; fix the reset script's `Usage:` header to match
- [x] 3.2 `.agents/skills/wong-setup/scripts/provision.mjs`: `durableEnv` uses `primaryRoot()` and stops with a `repo` error when it fails
- [x] 3.3 Test in `scripts/tests/provision.test.mjs`: provisioning from a linked worktree writes the key to the primary's `.env`

## 4. Release

- [x] 4.1 Add a `## Next (patch) — Four bug fixes from a repo audit` entry to `CHANGELOG.md`
