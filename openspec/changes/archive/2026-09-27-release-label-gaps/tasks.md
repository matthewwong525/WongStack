# Tasks

## 1. Script

- [x] 1.1 `scripts/tag-releases.mjs`: capture `gh release create` stderr; on `HTTP 403`, record the version as refused and continue; rethrow any other error; after the loop, print a `::warning::` line per refused version and append a Markdown list to `$GITHUB_STEP_SUMMARY` when it is set; keep exit 1 only for versions with no `VERSION` commit
- [x] 1.2 `scripts/tests/tag-releases.test.mjs`: the fake `gh` answers HTTP 403 for a chosen version; assert the run passes, creates the others, prints the warning, and writes the summary; a non-403 failure still fails the run

## 2. Meta-only rule

- [x] 2.1 `.agents/rules/payload.md`: one bullet — after `/ship` merges a release here, run `node scripts/tag-releases.mjs` from the `synced` checkout with the person's `gh` login, and name any Release it created in the report

## 3. Checks

- [x] 3.1 Run oxlint, the script tests with c8, `node .github/scripts/loosened-checks.mjs --worktree`, `node scripts/check-payload-links.mjs`, and `openspec validate --specs --strict --no-interactive`
