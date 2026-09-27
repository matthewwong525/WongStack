# Tests that guard AI-written code

**Status:** ready-to-ship
**Branch:** explore-tests-playwright-alternatives
**Open questions:** none

## Why

Agents write almost all the code in this repo, so the tests are the main thing that catches a mistake. An audit found that most tests check real behavior. The gaps are in the checks that are supposed to say no: nothing tests them failing. Deleting the branch that reports a red CI run would still leave every test green. Two more things cost time for no benefit. Every new repo downloads a browser to test a WongStack file it never edits. And mutation testing took 15 minutes on a small new app (wongstack-cloud).

## What Changes

- **New repos stop downloading a browser.** The browser test for the plan review page moves out of the app that new repos copy, into WongStack's own checks. It still runs on every WongStack change, and new repos lose Playwright and about 19 seconds per CI run. agent-browser is not used: it downloads a browser of the same size and is built for an agent, not a pass/fail test.
  ```text
  before
  new repo's app
   ├ app tests
   └ review page test
      + Chromium download

  after
  new repo's app
   └ app tests
  WongStack's own checks
   └ review page test
  ```
- **Mutation testing should run several times faster.** It skips "static" mutants, which change code that runs once when a file loads. They were 17% of the mutants but 81% of the time in wongstack-cloud. The 100% bar stays for everything else.
- **The guard checks are tested failing, not only passing.** Each gets a test that proves it says no when it should:
  - the CI wait reports a failed, cancelled, or timed-out check
  - the merge refuses to run from the main branch
  - the cleanup refuses to delete a folder it did not make
  - a failed deploy stops before anything is published
  - the secrets push refuses to upload the private `.env` file
  - the setup check fails on a config it cannot read
- **The scripts get a quality bar, like the app has.** WongStack's own checks start to measure how much of the scripts the tests cover, lint the scripts, and check the shell scripts for common mistakes. The coverage bar starts where it is today, and it can only go up.
- **The test suite gets cleaner.**
  - The memory tests stop leaving thousands of folders in `/tmp`.
  - Tests that fail only now and then stop depending on the clock or the network.
  - Page checks fail in CI instead of silently skipping.
  - A test that runs real scripts can no longer reach a live service.
  - Tests that only checked wording are deleted.
- **Two bugs the audit found are fixed.**
  - The cleanup could delete any folder with `wong-verify-` in its path. It now deletes only the temp folders it made.
  - The memory store reported a fact as replaced even when nothing changed. It now counts only real replacements.
- **The app's login check is tested with a real signature.** Its test used a fake signature check, so a real key problem could pass. It now signs a real token with a key made during the test.

**Non-goals:** Letting a memory member key delete facts is a separate security question and is not changed here. No new browser tool. The app's 100% coverage and mutation bars stay as they are.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: the mutation gate ignores static mutants; the starting suite checks a real signature; the scaffold ships no browser test and no browser dependency.
- `ci-tests`: the shipped suite tests only the app's own code; the test workflow installs no browser; WongStack's toolkit scripts are covered by the payload checks.
- `payload-checks`: the payload checks run the review page's browser tests, measure script coverage with a floor that only rises, lint scripts, check shell scripts, fail rather than skip when a test dependency is missing, and test each guard script's refusal path.
- `staging-walkthrough`: cleanup removes only a run directory the walk made under the system temp directory.
- `memory-store`: a write reports only the facts it actually superseded.

## Impact

- `app/`: `package.json` (drop `playwright`, drop `review/*.test.mjs` from `test`), `knip.jsonc`, `stryker.conf.json` (`ignoreStatic`), `worker/access.test.ts`; `app/review/` removed.
- `.github/workflows/test.yml` (payload): drop the browser install step. `.github/workflows/payload.yml` (meta): install `scripts/tests/` dependencies instead of `app/`'s, add coverage, oxlint, shellcheck. `.github/dependabot.yml`: add `/scripts/tests`.
- New meta-only `scripts/tests/package.json` and lockfile: `playwright-core`, `jsdom`, `c8`, `oxlint`. New `scripts/tests/review-browser.test.mjs`.
- `scripts/tests/`: new refusal-path tests; the memory harness cleans up; `change-candidates.test.mjs` removed; wording checks removed from `server-setup` and `downstream-contract`.
- `.agents/skills/verify/scripts/verify-staging.sh` (cleanup), `.agents/skills/memory/scripts/memory.mjs` (supersede count), and any shell script `shellcheck` flags.
- `VERSION` 25.2.1 → 25.3.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-26** — Asked whether the tests are a good guardrail and whether agent-browser should replace Playwright → audited every test file with three read-only agents; most tests exercise real behavior, the gaps are refusal paths, hygiene, and no quality bar for scripts.
- **2026-09-26** — Asked why Stryker is slow on wongstack-cloud → run 36278178299: 2,184 mutants in 15 minutes on 2 runner processes; Stryker warned that 375 static mutants (17%) take 81% of the time.
- **2026-09-27** — Asked what to do with the review page's browser test → the user asked why it matters when it runs in GitHub Actions; it runs in every new repo's Actions too, testing a file they never edit, so it moves to WongStack's own checks.
- **2026-09-27** — Asked how Stryker should get faster → chose `ignoreStatic` and keep the 100% bar.
- **2026-09-27** — Asked how far to go on the script tests → chose guard refusal paths, test hygiene, and a coverage, lint, and shellcheck bar for scripts.
- **2026-09-27** — Asked whether to fix the two bugs the audit found here → chose to fix them in this change.
- **2026-09-27** — Assumed: agent-browser does not replace Playwright, because it downloads Chrome for Testing (about 390 MB), drives a stateful daemon one process per step, and is pre-1.0; `/verify` keeps it.
- **2026-09-27** — Assumed: the browser test uses `playwright-core` with the runner's installed Google Chrome, and falls back to installing Chromium in the meta-only workflow if that fails, because that avoids any download.
- **2026-09-27** — Assumed: WongStack's test dependencies live in a meta-only `scripts/tests/package.json`, because the test workflow does not discover it there and it lets the payload checks stop installing the whole app.
- **2026-09-27** — Assumed: script coverage is measured with `c8`, because most script tests spawn child processes and Node's built-in coverage does not follow them; shell scripts get shellcheck instead of coverage.
- **2026-09-27** — Assumed: the coverage floor starts at today's measured numbers and only rises, because a 100% jump would make this change very large.
- **2026-09-27** — Assumed: the app's Access test signs real tokens with a key generated in the test, because mocking both crypto calls lets a real key bug pass.
- **2026-09-27** — Assumed: the member-key permission question stays out of scope, because it is a security design choice, not a test gap.
- **2026-09-27** — Assumed: a minor release, 25.3.0, because new repos lose a dependency and a CI step, and no command's behavior breaks.
- **2026-09-27** — Asked to merge `main` first → fast-forwarded to `d9b348e` (25.2.1) and rechecked every audit finding against it; all still held. `cf-deploy.test.mjs` had folded into `wrangler-config.test.mjs`, and the browser test had grown to nine tests.
- **2026-09-27** — Assumed: the scripts' lint uses oxlint's default rules with `--deny-warnings`, not the app's complexity and file-size caps, because those caps flag four long functions and one 561-line file in shipped scripts, and splitting them is its own change.
- **2026-09-27** — Measured script coverage after the new tests: 85.56% of lines and 81.19% of branches over 5,000 lines. The floor in `scripts/tests/.c8rc.json` is lines 85, branches 81. 281 script tests pass with none skipped.
- **2026-09-27** — Found while testing: `check-openspec-config.mjs` passed both broken configs under OpenSpec 1.13.2, which reports a YAML error in its JSON `status` and a mistyped rule as an "ignoring" warning. It now fails on either, and on any run without JSON.
- **2026-09-27** — Assumed: the supersede count reads `RETURNING id` rows from the `UPDATE`, because the store's batch helper drops `meta.changes`. The new test fails on the old code (`added 0, superseded 1`).
- **2026-09-27** — Assumed: cleanup uses plain `realpath` plus a directory check instead of `realpath -e`, which macOS lacks. The result is the same.
- **2026-09-27** — Real-key signing left four mutants in `access.ts` that change nothing observable. The base64 padding code is deleted, because `atob` decodes unpadded input in Node and workerd. The `extractable: false` argument and the explicit missing-key return each carry a `Stryker disable next-line` comment with its reason. `npm test` in `app/` passes: 34 tests, 100% coverage, 179 of 179 mutants killed.
- **2026-09-27** — Assumed: `memory/scripts/run.mjs` and `session-start.mjs` stay out of the CLI-conventions test, because neither has `--help` and both do real work (a run lock and a headless `claude`, or a session registration) on any flag. Giving them a `--help` is a separate change.
- **2026-09-27** — Saved all tasks for CI. Checked locally: shellcheck 0.10.0 at warning severity, oxlint `--deny-warnings`, the c8 floor, the release checks, and `openspec validate --specs --strict`. The browser tests ran on a local Chromium through `CHROME_PATH`; the runner's `chrome` channel is proven only by the `payload` check.
- **2026-09-27** — Distilled before the archive: the store held no facts for this change or its branch. The one repeatable rule, that WongStack's own tests and their dependencies stay out of `app/`, went into `.github/CONTRIBUTING.md` beside the check commands, its owner.
- **2026-09-27** — Archived and checkpointed for CI on branch `explore-tests-playwright-alternatives`; specs synced (`app-scaffold`, `ci-tests`, `memory-store`, `payload-checks`, `staging-walkthrough`), and `openspec validate --specs --strict` passes 48 of 48.
