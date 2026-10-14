# Tasks

## 1. The fragment and setup script

- [x] 1.1 In `.agents/skills/wong-sync/references/stack-pack-fragments.md`, replace `"<today, YYYY-MM-DD>"` with the date in `app/wrangler.jsonc` (`2026-07-28`), and reword the rule *Set `compatibility_date` to the day you create the config* by design decision 4; verify `grep -n "today, YYYY" .agents` finds nothing.
- [x] 1.2 In `.agents/skills/wong-setup/scripts/provision.mjs`, drop `today` from `wranglerConfig()`'s parameters, its fill table and its call in `provision()`, keeping `today` for the Access setup call; verify `grep -n "today" provision.mjs` shows only the `provision()` default and the Access call.
- [x] 1.3 In `scripts/tests/provision.test.mjs`, drop `today` from the `wranglerConfig()` calls, replace `assert.equal(config.compatibility_date, TODAY)` with equality to the date parsed from `app/wrangler.jsonc`, and add one test that the fragment-built config and `app/wrangler.jsonc` share a `compatibility_date`, with a failure message naming both files; verify the new test fails when the fragment's date is edited by hand, then passes restored.
- [x] 1.4 In `scripts/check-target-app.mjs`, remove `today: '2026-01-01'` from `INSTALL`; adjust `scripts/tests/check-target-app.test.mjs` only if it names that field; verify by reading that the config it writes carries the fragment's date.

## 2. Spec, docs and release note

- [x] 2.1 Correct `wiki/maintaining/test-a-setup-change.md` line 22 by design decision 7; verify the page no longer says the install record names a branch.
- [x] 2.2 Add a `## Next (patch) — A new install's first save passes` entry at the top of `CHANGELOG.md`'s entries, with the **Updating.** note of design decision 6 in plain words; verify `VERSION` is untouched.

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/provision.test.mjs scripts/tests/check-target-app.test.mjs` and `node scripts/check-target-app.mjs`; verify all pass, the target check's `npm test` including the runtime suite.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, context baseline, retired names); verify it passes, trimming `stack-pack-fragments.md` if the context check reports growth.
- [x] 3.3 Run `openspec validate "new-install-date" --strict --no-interactive`; verify it passes.
