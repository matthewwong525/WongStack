# Tasks

## 1. Replay script

- [x] 1.1 In `.agents/skills/verify/scripts/verify-journeys.mjs`, add the optional `site` field to the format and its validation (design decision 1), `--site-url <name>=<url>` and the commit-status lookup to `replay` (decision 2), the early `not-run` (decision 3), the credential-free runner call and per-site `stop` (decision 4), `keep --site <name>` (decision 6), and the `site` and address on each `replay.json` result. Update the usage text and the header comment. Verify `node .agents/skills/verify/scripts/verify-journeys.mjs check` still reads every kept file as before.
- [x] 1.2 Author tests in `scripts/tests/verify-journeys.test.mjs` beside the existing ones, using the practice site as the second site through `--site-url`: a named check with no address is `not-run` with the reason and starts no runner; with an address it replays `same` against that address while an unnamed check uses `--url`; the runner environment for a named check holds no Access credential; a named site's login wall does not stop the main preview's checks; a malformed `site` is unreadable; `keep --site` writes the field and no address; a failing lookup reads `not-run`. Stub `gh` on `PATH` for the lookup cases; make no network call.

## 2. Kept files and docs

- [x] 2.1 Add `"site": "landing-preview"` to both files under `.agents/verification/journeys/landing-site/`, changing nothing else. Verify `check` reports them `ok`.
- [x] 2.2 Update `wiki/development/kept-checks.md` (the *It holds no address* bullet and the `not-run` row), add the `--site` clause to § g of `.agents/skills/verify/references/walkthrough.md`, and add one sentence to the Preview step of `wiki/maintaining/landing-page.md`, by the wiki rules and voice. Verify `node scripts/measure-context.mjs --check` passes, cutting skill text if it does not.

## 3. Release

- [x] 3.1 Add a `## Next (minor) — Kept checks replay on their own site` entry at the top of `CHANGELOG.md`'s entries with a plain **Updating.** note: nothing to do; checks you already keep replay as before. Leave `VERSION` alone.

## 4. Final verification

- [x] 4.1 After all source, tests, and docs are written, run `node .github/scripts/checks.mjs --worktree` and repair failures this change caused: script tests, payload links, wiki checks, context budget, and `openspec validate "kept-checks-on-their-own-site" --strict --no-interactive`. Report local evidence without claiming remote checks passed.
