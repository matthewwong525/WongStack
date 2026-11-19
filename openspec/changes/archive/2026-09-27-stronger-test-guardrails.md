<!-- openspec-archive v1 2026-09-27-stronger-test-guardrails -->
<!-- file proposal.md utf8 10695 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 10279 -->
# Design

## Context

See proposal.md — Why. The audit this change acts on read every file in `scripts/tests/`, the app's three test files, and CI, then was rechecked against `main` at 25.2.1 (`d9b348e`). Facts that shape the approach:

- `app/review/review.test.mjs` is the only user of `playwright`. It tests `.agents/skills/plan/references/review-kit.html` through `build-review.mjs`. It sits in `app/` because, when `improve-review-usability` added it, `app/` was the only place with dependencies and CI. The scaffold ships the whole `app/` (`payload-files.json` `scaffold.dirs`), so every target gets the test, the `playwright` dev dependency, and `test.yml`'s `npx playwright install --with-deps chromium` step (about 19 s).
- `payload.yml` runs `npm ci` in `app/` only because `scripts/tests/review.test.mjs` borrows `jsdom` from `app/node_modules`. Without it, that test's page checks `skip`, so CI could go green with them skipped.
- wongstack-cloud run 36278178299: 2,184 mutants in 15 minutes on 2 runner processes. Stryker warned that 375 static mutants (17%) take 81% of the time. No `Stryker disable` or coverage-ignore comment exists anywhere, so the 100% bars are honest.
- `scripts/` and `.agents/skills/*/scripts/` have no coverage, lint, or shellcheck. Their fake binaries (`gh`, `npx`, `openspec`) almost always succeed, so the refusal paths go untested. Examples: `wait-for-checks.sh:128-136` (FAILURE), `merge.sh:32` (default-branch refusal), `cf-secrets.mjs` `guardSourceFile`, and `check-openspec-config.mjs:45-56` (parse failure).
- `scripts/tests/fixtures/memory/harness.mjs` `makeRepo` creates temp directories it never removes (3,800+ left in `/tmp`). Its fake server is closed without `closeAllConnections`. `memory-capture` relies on `10.255.255.1` being unreachable and on wall-clock budgets under 5000 ms.
- `verify-staging.sh cleanup` accepts any `*/wong-verify-*` path. `memory.mjs` `putFacts` derives `superseded` from its input (line 159), not from the `UPDATE`'s change count.

## Goals / Non-Goals

**Goals:** the delta specs. At the design level: move a test, not rewrite it; add tests beside the scripts they guard; change no script's behavior except the two bug fixes and whatever shellcheck flags.

**Non-Goals:** mutation testing for `scripts/` (a later step once the coverage floor exists); a container smoke run of `server/setup.sh`; the member-key write permission in `memory-worker.mjs`.

## Decisions

### Move the browser test; keep Playwright's API, drop its browser download

`app/review/review.test.mjs` moves to `scripts/tests/review-browser.test.mjs` with `playwright` replaced by `playwright-core`, which bundles no browser. It launches `chromium.launch({ channel: 'chrome' })`, the Google Chrome that GitHub's `ubuntu-latest` image carries. `CHROME_PATH` overrides the executable for a local run. If the channel launch fails in CI during apply, the fallback is a `npx playwright-core install chromium` step in `payload.yml` only, which never ships.

- *agent-browser instead:* rejected. `npm i -g agent-browser` plus `agent-browser install` downloads Chrome for Testing (about 390 MB per version). Each step is a separate process against a stateful daemon, drags need hand-rolled loops, there is no auto-wait, and it is pre-1.0. The earlier reason to prefer it for `/verify` — no *repo* dependency in a target — does not apply to a meta-only test.
- *Port to jsdom:* rejected for now. Four of the nine tests need real layout or input (zoom and fit transforms, overflow at 320/390/1200 px, `#/3` scroll position, touch taps and drags). Splitting would leave two harnesses for one page.

### A meta-only test manifest at `scripts/tests/package.json`

It pins `playwright-core`, `jsdom`, `c8`, and `oxlint` exactly, with its own lockfile. `test.yml` discovery only looks at the repo root and immediate subdirectories, so it never finds `scripts/tests/`. `payload-files.json` lists nothing under `scripts/tests/`, so no target receives it. `payload.yml` switches `npm ci` from `app` to `scripts/tests`. `review.test.mjs` resolves `jsdom` from there and fails rather than skips when `CI` is set. Dependabot gets a `/scripts/tests` npm entry. `app/package.json` loses `playwright`, and its `test` script and `knip.jsonc` lose `review/*.test.mjs`.

- *Keep borrowing from `app/node_modules`:* rejected. It couples WongStack's checks to the scaffold's dependency list, which is how Playwright ended up shipping.

### `ignoreStatic: true` in `app/stryker.conf.json`

Stryker marks static mutants `Ignored`; the mutation score counts only tested mutants, so `thresholds.break: 100` keeps its meaning for everything else. The Stryker config is part of the cache key, so the first run after this change is a full run by design.

- *Stop mutating string literals or `.tsx` copy:* the user chose to keep the 100% bar with `ignoreStatic` only.

### Coverage with `c8`, a floor that only rises

`c8 --check-coverage --lines <n> --branches <n> node --test scripts/tests/*.test.mjs` replaces the plain `node --test` line in `payload.yml`. `c8` sets `NODE_V8_COVERAGE`, which child `node` processes inherit, so scripts the tests spawn are measured. Node's built-in `--experimental-test-coverage` does not follow child processes. Include `scripts/**/*.mjs` and `.agents/skills/*/scripts/**/*.mjs`; exclude `scripts/tests/**`. The floor lives in `scripts/tests/.c8rc.json`, set to the measured figure rounded down after the new tests land. Raising it is a normal edit; lowering it needs a stated reason in the change's Decision log. Shell scripts get no coverage figure; they get shellcheck and the refusal tests.

### Lint and shellcheck

- `oxlint` from the test manifest over the same JavaScript paths, with the app's `.oxlintrc.json` rules where they apply (`no-explicit-any` is moot in `.mjs`).
- `shellcheck --severity=warning` over every `*.sh` in `scripts/`, `.github/scripts/`, and `.agents/skills/*/scripts/`, using the copy preinstalled on `ubuntu-latest`. Findings are fixed in the scripts, each fix a no-behavior-change edit; a finding that is intentional gets an inline `# shellcheck disable=SCnnnn` with a reason.

### Refusal tests reuse the existing fakes

Each fake gains a failure switch rather than a new harness:

- `wait-for-checks`: a `gh` fake that reports one failed check, one cancelled check, and checks that never finish (the script's timeout is lowered through its existing variable). A second fake without `--json` covers the plain-text fallback.
- `merge.sh`: run from the default branch; assert exit non-zero and no `gh pr merge` call in the fake log.
- `verify-staging.sh cleanup`: paths `$HOME/wong-verify-x`, `$TMPDIR/wong-verify-a/../..`, a symlink named `wong-verify-*` pointing outside, and a real `mktemp` directory (accepted).
- `cf-deploy.sh` (in `wrangler-config.test.mjs`, which absorbed the former `cf-deploy.test.mjs`): a fake `npx` that fails on `wrangler deploy`; assert non-zero exit and no `versions upload` call.
- `cf-secrets.mjs`: `.dev.vars` as a symlink to `.env`, and `--file .env`; assert refusal before any `npx` call. `check` gets one pass and one mismatch case.
- `check-openspec-config.mjs`: one test against the real `openspec` CLI with a broken `config.yaml` (CI installs 1.13.2). It skips outside CI when `openspec` is absent and fails in CI. The fake-based case for exit 0 with non-JSON output also fails the check.

### Hygiene

- `harness.mjs` `makeRepo` takes the test context and registers `t.after(() => rmSync(...))`, matching `fixtures/pack.mjs`. The fake server calls `closeAllConnections()` before `close()`.
- `memory-capture` replaces the `10.255.255.1` case with the fake server's offline switch and drops the `< 5000 ms` assertions. The `< 5000 ms` check in `wong-sync-preflight` goes too.
- `cli-conventions` runs each script with `cwd` in a temp copy and a `PATH` whose `npx`, `wrangler`, and `gh` are stubs that exit 97. A call that reaches one fails the test.
- Deleted: `change-candidates.test.mjs` (its unique plain-text case moves into `checkpoint-helpers`); `downstream-contract`'s removed-folder and runbook-phrase-order tests; `server-setup`'s `set -euo pipefail`, `for tool in`, and README-wording greps (shellcheck and `bash -n` cover the script).
- Bare `assert.throws(fn)` in `checkpoint-helpers` gains the expected message.

### The two fixes

- `verify-staging.sh cleanup`: resolve with `realpath -e`, require `dirname` to equal `realpath "${TMPDIR:-/tmp}"` and `basename` to match `wong-verify-*` or `wong-walk-*`, and require a directory. Otherwise, refuse.
- `memory.mjs` `putFacts`: read `meta.changes` from each supersede `UPDATE` in the batch result and sum them. A kept supersede whose update changed nothing counts as added.

### Access test with a real key

`access.test.ts` generates an RS256 key pair with `crypto.subtle.generateKey`, exports the public JWK into the stubbed certs response, and signs tokens with `crypto.subtle.sign`. The `importKey` and `verify` spies and the assertions on their arguments go away. Mutants they killed must be killed by real behavior: a wrong algorithm or a flipped check fails verification. A new case signs with a second key not in the set.

## Risks / Trade-offs

- [Chrome channel missing or changed on the runner image] → the design names the fallback install step, kept in the meta-only workflow.
- [Static mutants hide a real bug in a module-level constant] → coverage still requires the line to run, and the constant's effect is tested through the functions that read it; accepted, per the user's choice.
- [The `c8` floor is set from today's figure, which may be low] → it only rises, and this change's new tests raise it before it is recorded.
- [Shellcheck fixes touch shipped scripts] → quoting and similar no-behavior fixes only; the existing script tests run on every edit.
- [Removing `playwright` from `app/package.json` changes the lockfile] → a full Stryker run once, as the cache key intends.

## Migration Plan

Targets pick this up through `/wong-sync`. It removes `app/review/`, `playwright`, and the browser step, and adds `ignoreStatic`. A target that edited `app/package.json` gets the removal through the normal adapt review. Rollback is a revert of the release.

<!-- end design.md -->
<!-- file tasks.md utf8 6321 -->
# Tasks

## 1. WongStack's own test manifest

- [x] 1.1 Add meta-only `scripts/tests/package.json` and lockfile pinning `playwright-core`, `jsdom`, `c8`, and `oxlint` to exact versions; confirm `payload-files.json` lists nothing under `scripts/tests/` and `test.yml`'s discovery loop would not find it (root and immediate subdirectories only).
- [x] 1.2 Point `scripts/tests/review.test.mjs` at that manifest's `jsdom`, and make its page checks fail when `CI` is set and `jsdom` cannot load; add a test that asserts the CI-fail branch.
- [x] 1.3 `payload.yml`: replace `npm ci` in `app` with `npm ci` in `scripts/tests` (cache path to its lockfile). `.github/dependabot.yml`: add an npm entry for `/scripts/tests`. Update `.github/CONTRIBUTING.md`'s local commands and its note about skipped page tests.

## 2. The review page's browser test

- [x] 2.1 Move `app/review/review.test.mjs` to `scripts/tests/review-browser.test.mjs`; import `chromium` from `playwright-core`, launch with `channel: 'chrome'` (or `CHROME_PATH` when set), fix the relative imports, and fail when `CI` is set and no browser launches. All nine tests keep their assertions.
- [x] 2.2 Remove `app/review/`, `playwright` from `app/package.json` and its lockfile, `node --test review/*.test.mjs` from `app`'s `test` script, and the `review` entries from `app/knip.jsonc`.
- [x] 2.3 `test.yml`: delete the "Install browser for review tests" step. `payload.yml`: if the `chrome` channel does not launch on `ubuntu-latest`, add `npx playwright-core install --with-deps chromium` there only. Verified by the `payload` check passing with the browser tests reported as run, not skipped, via `/save`.

## 3. Mutation testing

- [x] 3.1 Set `"ignoreStatic": true` in `app/stryker.conf.json`; verified by the `test` check (via `/save`) passing with ignored static mutants reported and the score at 100.

## 4. App Access test with a real key

- [x] 4.1 Rewrite `app/worker/access.test.ts`'s accepted-token cases to sign with a key generated in the test and serve its public JWK from the stubbed certs fetch; remove the `importKey`/`verify` spies and the assertions on their arguments; add a case signed by a key outside the set. Verified by the `test` check keeping 100% coverage and a 100 mutation score.

## 5. Guard scripts tested refusing

- [x] 5.1 `wait-for-checks.test.mjs`: FAILURE for a failed check and for a cancelled check, TIMEOUT when checks never finish, and the plain-text `gh` fallback; confirm locally that deleting the FAILURE branch fails a test, then restore it.
- [x] 5.2 `ship-merge.test.mjs`: running on the default branch exits non-zero with no merge call in the fake log.
- [x] 5.3 `wrangler-config.test.mjs`: a failing `wrangler deploy` exits non-zero with no `versions upload` call and no published URL.
- [x] 5.4 `cf-secrets.test.mjs`: refuse a `.dev.vars` symlinked to `.env` and `--file .env` before any `npx` call; `check` with a matching and a mismatched set.
- [x] 5.5 `check-openspec-config.test.mjs`: a broken `config.yaml` against the real `openspec` CLI fails the check (skip outside CI when the CLI is absent, fail in CI); exit 0 with non-JSON output fails the check, with the script changed to match.

## 6. Two fixes

- [x] 6.1 `verify-staging.sh cleanup`: accept only an existing directory directly inside the resolved system temp directory whose name starts `wong-verify-` or `wong-walk-`; in `verify-scripts.test.mjs`, refuse `$HOME/wong-verify-x`, a `..` escape, and an outward symlink, and accept a real run directory.
- [x] 6.2 `memory.mjs` `putFacts`: count superseded facts from the `UPDATE` results; in `memory-store.test.mjs`, a supersede of a missing id and of an already-superseded id reports `superseded 0` and stores the new fact.

## 7. Test hygiene

- [x] 7.1 `fixtures/memory/harness.mjs`: remove every temp directory through `t.after`, and close the fake server's connections before closing it; verified by counting `wong-memory-*` directories in the temp dir before and after the memory tests locally.
- [x] 7.2 `memory-capture.test.mjs`: replace the `10.255.255.1` case with the fake's offline switch and remove wall-clock assertions; remove the `< 5000 ms` assertion in `wong-sync-preflight.test.mjs`.
- [x] 7.3 `cli-conventions.test.mjs`: run each script in a temp directory with `npx`, `wrangler`, and `gh` stubs on `PATH` that exit 97, and fail when one is called. `memory/scripts/run.mjs` and `session-start.mjs` stay off its list: neither has `--help`, and both do real work on any flag (see the Decision log).
- [x] 7.4 Delete `change-candidates.test.mjs` after moving its plain-text case into `checkpoint-helpers.test.mjs`; delete the removed-folder and runbook-phrase tests in `downstream-contract.test.mjs` and the wording greps in `server-setup.test.mjs`; give the bare `assert.throws` calls in `checkpoint-helpers.test.mjs` their expected message. `node --test scripts/tests/*.test.mjs` passes locally.

## 8. Quality bar for scripts

- [x] 8.1 `payload.yml`: run `oxlint` over `scripts/**/*.mjs` and `.agents/skills/*/scripts/**/*.mjs`, and fix what it reports.
- [x] 8.2 `payload.yml`: run `shellcheck --severity=warning` over every `*.sh` in `scripts/`, `.github/scripts/`, and `.agents/skills/*/scripts/`; fix findings without changing behavior, or disable one inline with a reason. Verified by the `payload` check via `/save`.
- [x] 8.3 Run the suite under `c8` in `payload.yml` with a `scripts/tests/.c8rc.json` floor for lines and branches, set to the figures measured after groups 5–7, rounded down; record the figures in the Decision log.
- [x] 8.4 Add the rule "the script coverage floor only rises; lowering it needs a stated reason" to `.github/CONTRIBUTING.md` beside the check commands.

## 9. Release

- [x] 9.1 `VERSION` 25.2.1 → 25.3.0 and a newest-first `CHANGELOG.md` entry that tells targets what `/wong-sync` removes (`app/review/`, `playwright`, the browser step) and adds (`ignoreStatic`); add `playwright` and `app/review` to `scripts/retired-names.json` if live files still name them.
- [x] 9.2 `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate stronger-test-guardrails --strict --no-interactive` pass locally; the `test` and `payload` checks pass via `/save`.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 6907 -->
## MODIFIED Requirements

### Requirement: The scaffold ships a test runner and a starting suite

The app scaffold SHALL declare a test runner in its own `package.json` with a `test` script, so a repo that takes the scaffold can run `npm test` immediately and the payload's test workflow discovers it without any repo-root file.

The scaffold SHALL ship a starting suite over the code it hands the adopter, rather than an empty example. Coverage SHALL be chosen by what a silent failure costs: the **Access identity module** first, because it ships inert, is the file an adopter is most likely to reimplement by hand, and the incorrect reimplementation fails silently for machine callers while appearing to work in a browser.

That suite SHALL cover at minimum the module's rejection paths that require no network and no cryptography — an unset configuration resolving to *deny* rather than *allow*, a missing or malformed assertion, and an unacceptable signing algorithm — plus the service-token identity, which carries no email and is the case the incorrect implementation breaks.

The suite's accepted-token cases SHALL verify a real signature: the test SHALL generate a signing key, serve its public half as the team's certificate set, and sign each accepted assertion with it. The platform's key import and signature verification SHALL NOT be replaced by stand-ins, so a wrong algorithm, a malformed key, or a signature-decoding fault fails the suite.

The scaffold's suite SHALL test only the scaffold's own code. It SHALL NOT carry tests of WongStack's toolkit files, and the scaffold SHALL declare no browser-automation dependency, so a repo that takes the scaffold downloads no browser to run its tests.

The runner SHALL be a development dependency only, changing no runtime output and adding nothing to the deployed bundle.

#### Scenario: A scaffolded repo can test immediately

- **WHEN** a repo takes the app scaffold and installs its dependencies
- **THEN** `npm test` runs the shipped suite from the app directory
- **AND** the test workflow finds and runs it with no repo-root manifest present

#### Scenario: Unconfigured identity denies rather than allows

- **WHEN** the Access identity module runs with no team domain or audience configured
- **THEN** the shipped suite asserts it resolves to no identity
- **AND** the test fails if that path is ever changed to allow the request

#### Scenario: The service-token identity is covered

- **WHEN** a verified assertion carries a service-token subject and no email claim
- **THEN** the shipped suite asserts a service identity is returned rather than a rejection
- **AND** the case is present because the header-trust reimplementation rejects it

#### Scenario: An accepted token is really verified

- **WHEN** the identity module is changed to import the key with the wrong algorithm
- **THEN** the suite's accepted-token cases fail

#### Scenario: A token signed by another key is refused

- **WHEN** an assertion is signed by a key that is not in the served certificate set
- **THEN** the suite asserts the module resolves to no identity

#### Scenario: The runner does not reach the bundle

- **WHEN** the scaffolded app is built for deployment
- **THEN** the test runner is absent from the built output

#### Scenario: The scaffold carries no browser

- **WHEN** a repo takes the app scaffold and runs `npm ci` and `npm test`
- **THEN** no browser-automation package is installed and no browser is downloaded
- **AND** no test in the scaffold exercises a WongStack skill file

### Requirement: The scaffold's test script is a quality-gate chain

The scaffold's `npm test` SHALL run, in one chain behind the single script `test.yml` already calls, deterministic quality gates alongside the unit suite — no new workflow, no local build prerequisite, and no gate that requires a model call:

- **Coverage**: the unit suite SHALL enforce 100% coverage over the scaffold's source via coverage thresholds, failing the run when any threshold is missed.
- **Lint limits**: cyclomatic complexity SHALL be capped below 22 per function, files SHALL be capped at 500 lines, and an explicit `any` SHALL be an error. `unknown` SHALL remain legal. A cognitive-complexity cap below 22 SHALL be enforced only if the scaffold's existing linter provides the rule; a second linter SHALL NOT be added for it.
- **Dead code**: unused files, exports, and dependencies SHALL fail the run.
- **Duplication**: duplicated code blocks SHALL fail the run.
- **Mutation**: the run SHALL fail while any tested mutant of the scaffold's source survives the unit suite. A **static mutant** — one whose code runs only when a module loads, so that testing it means rerunning every test — SHALL be reported as ignored and SHALL NOT be tested; every other mutant SHALL be tested. The run SHALL keep each mutant's result in a git-ignored file and reuse a result only when the mutant's code and the test that killed it did not change; it SHALL test every other mutant again. A run with no result file SHALL test every non-static mutant, and a forced run SHALL ignore the file.

The gates SHALL be absolute, not baselined: the scaffold as shipped SHALL pass every gate, so a repo that takes the scaffold starts compliant and CI holds it there.

#### Scenario: A violation fails CI through the existing contract

- **WHEN** a commit introduces an explicit `any`, an uncovered line, an unused export, or a surviving non-static mutant in the scaffold's source
- **THEN** `npm test` exits non-zero
- **AND** the existing `test.yml` check goes red with no workflow change

#### Scenario: The shipped scaffold passes

- **WHEN** `npm test` runs on the scaffold exactly as the payload ships it
- **THEN** every gate passes
- **AND** no gate is skipped, baselined, or marked allowed-to-fail

#### Scenario: The contract stays one script

- **WHEN** CI runs in a repo that took the scaffold
- **THEN** `npm test` remains the entire interface between the repo and `test.yml`
- **AND** no additional workflow or CI configuration is required for the gates to run

#### Scenario: A second run reuses results that are still valid

- **WHEN** `npm test` runs again after a change to one source file, with the result file from the last run present
- **THEN** mutants outside the changed code, whose killing test did not change, reuse their results
- **AND** every non-static mutant in the changed code is tested again, and one survivor still fails the run

#### Scenario: A run with no result file tests every mutant

- **WHEN** `npm test` runs with no result file, or Stryker runs with `--force`
- **THEN** every non-static mutant is tested

#### Scenario: Static mutants are not tested

- **WHEN** a mutant changes a module-level constant that runs only when the module loads
- **THEN** the run reports it as ignored
- **AND** it neither fails the run nor reruns the whole suite

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 2817 -->
## MODIFIED Requirements

### Requirement: The default suite ships with the app, not with the repo root

The payload SHALL NOT ship a repository-root `package.json`. A repo that has no npm toolchain SHALL receive no package manifest, no lockfile, and no test runner on WongStack's behalf. This follows the same rule that governs the walkthrough's browser: a dependency entry presumes a manifest, and presuming a manifest forces a language toolchain into repos that never chose one.

The default suite SHALL instead ship **with the app scaffold**, in the app's own `package.json` — the one category where a manifest is already expected and already shipped. A repo that takes the scaffold SHALL receive a test runner and a starting suite for the code it just inherited; a repo that declines the scaffold SHALL receive neither.

The test pipeline SHALL remain able to find that suite without any root manifest, through the subdirectory discovery the workflow already performs. A repo whose application lives in a subdirectory SHALL be covered with no configuration and no file at its root.

WongStack SHALL use the suite on **its own application** — the Worker code the scaffold ships, whose identity module is the file an adopter is most likely to reimplement incorrectly. WongStack's toolkit scripts and skill files SHALL be tested by the meta-only payload checks, never by the shipped suite, so a target neither runs nor pays for tests of files it does not edit. The core test workflow SHALL NOT install a browser.

#### Scenario: A repo with no npm toolchain receives no manifest

- **WHEN** WongStack is installed or synced into a repo that has no `package.json` and no JavaScript
- **THEN** no root `package.json`, lockfile, or test runner is written to it
- **AND** the test workflow reports that no test script exists and exits green

#### Scenario: A repo with its own manifest keeps it

- **WHEN** WongStack is synced into a repo that already has a root `package.json`
- **THEN** that file is not modified or replaced
- **AND** the workflow runs whatever `test` script it declares

#### Scenario: The suite is found in a subdirectory

- **WHEN** a repo's application and its `test` script live in a subdirectory, with no root manifest
- **THEN** the workflow's discovery finds that suite and runs it
- **AND** nothing is added at the repo root to make it discoverable

#### Scenario: WongStack tests its own application

- **WHEN** WongStack's own CI runs
- **THEN** the suite exercises the Worker code the scaffold ships, including the Access identity module's rejection paths
- **AND** a regression in it fails the check

#### Scenario: A target's test run installs no browser

- **WHEN** the core test workflow runs the app suite in any repo
- **THEN** no step installs a browser or its system packages

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/memory-store/spec.md utf8 1317 -->
## MODIFIED Requirements

### Requirement: A write gate decides add, supersede, or drop

Before the store accepts a fact, the memory script SHALL show the writer the live facts with the same slug and the closest keyword matches across all slugs. The writer SHALL then add the fact, supersede one named live fact, or drop the fact. The script SHALL record a supersede in the same batch as the new fact. The gate SHALL be the same for `/save`, the background capture, and consolidation.

The script's report of a write SHALL count as superseded only the facts the store actually marked superseded. A supersede that names a missing or already-superseded fact SHALL store the new fact and SHALL NOT count as a supersede.

#### Scenario: A paraphrase of a live fact

- **WHEN** a session produces a fact that says the same thing as a live fact in other words
- **THEN** the writer sees the live fact among the matches and drops the new fact

#### Scenario: A correction

- **WHEN** a new fact contradicts a live fact that the gate shows
- **THEN** the new fact is stored and supersedes the old one

#### Scenario: A supersede of a fact that is not live

- **WHEN** a write supersedes a fact id that does not exist or is already superseded
- **THEN** the report shows `superseded 0` for it
- **AND** the new fact is stored

<!-- end specs/memory-store/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 4833 -->
## ADDED Requirements

### Requirement: The payload checks own WongStack's test dependencies

The payload checks SHALL install their test dependencies from a meta-only manifest that the core test workflow does not discover and no target receives. They SHALL NOT install the app scaffold's dependencies to run WongStack's own tests.

A test that needs a dependency SHALL fail, not skip, when the dependency is missing and the run is in CI. Outside CI it MAY skip and SHALL say why.

#### Scenario: A missing page-test dependency in CI

- **WHEN** the payload checks run in CI and the DOM library cannot be loaded
- **THEN** the page tests fail and name the missing dependency
- **AND** the check is red, not green with skipped tests

#### Scenario: A target receives no WongStack test manifest

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** the meta-only test manifest and its lockfile are not among the files it receives

### Requirement: The review page is tested in a real browser by the payload checks

The payload checks SHALL drive the plan review page in a real browser engine: taps and drags, the note editor, copied notes, drafts across a reload, refused storage, notes whose text moved, drawing zoom and fit, touch input, and layout at phone and desktop widths. The browser SHALL be one already on the CI runner when available; a download SHALL happen only in the meta-only workflow.

#### Scenario: A review-page regression fails the payload checks

- **WHEN** a change to the review kit stops a saved note from appearing in the copied `/continue` block
- **THEN** the payload checks fail

#### Scenario: The review page test is not shipped

- **WHEN** a repo takes the app scaffold
- **THEN** it receives no review-page browser test

### Requirement: WongStack's scripts have a quality bar

The payload checks SHALL hold WongStack's own scripts to deterministic gates:

- **Coverage**: line and branch coverage of the JavaScript scripts under `scripts/` and `.agents/skills/*/scripts/`, including code run in child processes the tests spawn, SHALL be measured on every run, and the run SHALL fail when either falls below a committed floor. The floor SHALL only rise.
- **Lint**: the same JavaScript SHALL pass the linter the app scaffold uses.
- **Shell**: every shell script under `scripts/`, `.github/scripts/`, and `.agents/skills/*/scripts/` SHALL pass a static shell checker at warning severity.

#### Scenario: Coverage drops below the floor

- **WHEN** a change adds an untested branch that takes script coverage below the committed floor
- **THEN** the payload checks fail and name the measured and required figures

#### Scenario: A shell mistake is caught

- **WHEN** a shell script uses an unquoted variable in a command that removes files
- **THEN** the payload checks fail and name the script and line

### Requirement: Every guard script is tested refusing

Each script whose job is to stop unsafe or unfinished work SHALL have a test that drives its refusal path and asserts the refusal, not only its success path. This covers at least:

- the CI wait reporting `FAILURE` for a failed or cancelled check and `TIMEOUT` when checks never finish;
- the merge refusing to run on the default branch;
- the walkthrough cleanup refusing a path it did not create;
- the deploy stopping before any alias or URL is published when the deploy command fails;
- the secrets push refusing a `.dev.vars` that links to `.env` and a `--file` that names `.env`;
- the OpenSpec config check failing when the CLI cannot parse the config.

#### Scenario: Removing a refusal fails the suite

- **WHEN** the branch of the CI wait that reports `FAILURE` is deleted
- **THEN** at least one payload test fails

#### Scenario: A failed deploy publishes nothing

- **WHEN** the deploy command exits non-zero on a feature branch
- **THEN** the deploy script exits non-zero
- **AND** no alias upload and no preview URL are produced

### Requirement: WongStack's tests leave nothing behind and reach nothing live

Each payload test SHALL remove every temporary directory it creates, on success and on failure. No payload test SHALL reach a live service: a test that runs real scripts SHALL run them where the deploy and database tools resolve to stand-ins or to nothing. A payload test SHALL NOT depend on wall-clock budgets or on how the host routes an unreachable address.

#### Scenario: The memory tests clean up

- **WHEN** the memory test files run to completion
- **THEN** no directory they created remains in the system temp directory

#### Scenario: A broken argument parser reaches nothing live

- **WHEN** a script's argument parsing breaks so that `--help` falls through to its main path during the CLI convention test
- **THEN** no command reaches Cloudflare or any other live service

<!-- end specs/payload-checks/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 2884 -->
## MODIFIED Requirements

### Requirement: The walk is throwaway and saves nothing

The walk SHALL leave the repository working tree exactly as it found it. It SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, a dependency entry, or any other artifact inside the repo — including the tool it installs, which is installed at the machine level for this reason.

Journey definitions and captured evidence SHALL be written outside the repository working tree and deleted when the run ends.

The run SHALL capture evidence after each step, matched to the probe: a screenshot for a browser step, the request and response for a request-probe step, the command and its output for a state-probe step. Full-page and annotated capture SHALL be available where they make browser evidence clearer. **No video SHALL be required or claimed**: the evidence is the captures and the written record, and the report SHALL NOT reference a recording that does not exist.

The journey definitions SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

Cleanup SHALL remove only a run directory the walk could have created: an existing directory directly inside the system temp directory, whose name starts with the walk's run prefix, after resolving `..` segments and symbolic links. It SHALL refuse any other path, remove nothing, and exit non-zero.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no journey definition, screenshot, or dependency entry remains under the repository root

#### Scenario: Installing the tool leaves the repo untouched

- **WHEN** a walk installs the browser tool because the machine lacked it
- **THEN** the working tree is still unchanged
- **AND** the install is reported as a machine change, not a repo change

#### Scenario: Evidence is captured per step

- **WHEN** a browser journey of four steps is walked
- **THEN** four screenshots exist for that journey in the run's temporary directory
- **AND** no video file is expected or reported as missing

#### Scenario: Non-browser evidence is captured

- **WHEN** a request probe of three steps runs
- **THEN** the run's temporary directory holds the request and response for each step
- **AND** nothing is written inside the repository working tree

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

#### Scenario: Cleanup refuses a path it did not make

- **WHEN** cleanup is given `$HOME/wong-verify-x`, or a temp-directory path that climbs out with `..`
- **THEN** it removes nothing and exits non-zero

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 42796 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-27-stronger-test-guardrails</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-stronger-test-guardrails">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-stronger-test-guardrails</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Agents write almost all the code in this repo, so the tests are the main thing that catches a mistake. An audit found that most tests check real behavior. The gaps are in the checks that are supposed to say no: nothing tests them failing. Deleting the branch that reports a red CI run would still leave every test green. Two more things cost time for no benefit. Every new repo downloads a browser to test a WongStack file it never edits. And mutation testing took 15 minutes on a small new app (wongstack-cloud).</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>New repos stop downloading a browser.</b> The browser test for the plan review page moves out of the app that new repos copy, into WongStack's own checks. It still runs on every WongStack change, and new repos lose Playwright and about 19 seconds per CI run. agent-browser is not used: it downloads a browser of the same size and is built for an agent, not a pass/fail test.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">before</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">new repo's app</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> ├ app tests</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> └ review page test</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">    + Chromium download</span>

<span class="ln" data-note="item-1-line-7" tabindex="0">after</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">new repo's app</span>
<span class="ln" data-note="item-1-line-9" tabindex="0"> └ app tests</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">WongStack's own checks</span>
<span class="ln" data-note="item-1-line-11" tabindex="0"> └ review page test</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Mutation testing should run several times faster.</b> It skips &quot;static&quot; mutants, which change code that runs once when a file loads. They were 17% of the mutants but 81% of the time in wongstack-cloud. The 100% bar stays for everything else.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The guard checks are tested failing, not only passing.</b> Each gets a test that proves it says no when it should: - the CI wait reports a failed, cancelled, or timed-out check - the merge refuses to run from the main branch - the cleanup refuses to delete a folder it did not make - a failed deploy stops before anything is published - the secrets push refuses to upload the private <code>.env</code> file - the setup check fails on a config it cannot read</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The scripts get a quality bar, like the app has.</b> WongStack's own checks start to measure how much of the scripts the tests cover, lint the scripts, and check the shell scripts for common mistakes. The coverage bar starts where it is today, and it can only go up.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The test suite gets cleaner.</b> - The memory tests stop leaving thousands of folders in <code>/tmp</code>. - Tests that fail only now and then stop depending on the clock or the network. - Page checks fail in CI instead of silently skipping. - A test that runs real scripts can no longer reach a live service. - Tests that only checked wording are deleted.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Two bugs the audit found are fixed.</b> - The cleanup could delete any folder with <code>wong-verify-</code> in its path. It now deletes only the temp folders it made. - The memory store reported a fact as replaced even when nothing changed. It now counts only real replacements.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The app's login check is tested with a real signature.</b> Its test used a fake signature check, so a real key problem could pass. It now signs a real token with a key made during the test.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Letting a memory member key delete facts is a separate security question and is not changed here. No new browser tool. The app's 100% coverage and mutation bars stay as they are.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether the tests are a good guardrail and whether agent-browser should replace Playwright → audited every test file with three read-only agents; most tests exercise real behavior, the gaps are refusal paths, hygiene, and no quality bar for scripts.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked why Stryker is slow on wongstack-cloud → run 36278178299: 2,184 mutants in 15 minutes on 2 runner processes; Stryker warned that 375 static mutants (17%) take 81% of the time.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what to do with the review page's browser test → the user asked why it matters when it runs in GitHub Actions; it runs in every new repo's Actions too, testing a file they never edit, so it moves to WongStack's own checks.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how Stryker should get faster → chose <code>ignoreStatic</code> and keep the 100% bar.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how far to go on the script tests → chose guard refusal paths, test hygiene, and a coverage, lint, and shellcheck bar for scripts.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to fix the two bugs the audit found here → chose to fix them in this change.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: agent-browser does not replace Playwright, because it downloads Chrome for Testing (about 390 MB), drives a stateful daemon one process per step, and is pre-1.0; <code>/verify</code> keeps it.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the browser test uses <code>playwright-core</code> with the runner's installed Google Chrome, and falls back to installing Chromium in the meta-only workflow if that fails, because that avoids any download.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: WongStack's test dependencies live in a meta-only <code>scripts/tests/package.json</code>, because the test workflow does not discover it there and it lets the payload checks stop installing the whole app.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: script coverage is measured with <code>c8</code>, because most script tests spawn child processes and Node's built-in coverage does not follow them; shell scripts get shellcheck instead of coverage.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the coverage floor starts at today's measured numbers and only rises, because a 100% jump would make this change very large.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the app's Access test signs real tokens with a key generated in the test, because mocking both crypto calls lets a real key bug pass.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the member-key permission question stays out of scope, because it is a security design choice, not a test gap.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, 25.3.0, because new repos lose a dependency and a CI step, and no command's behavior breaks.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked to merge <code>main</code> first → fast-forwarded to <code>d9b348e</code> (25.2.1) and rechecked every audit finding against it; all still held. <code>cf-deploy.test.mjs</code> had folded into <code>wrangler-config.test.mjs</code>, and the browser test had grown to nine tests.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the scripts' lint uses oxlint's default rules with <code>--deny-warnings</code>, not the app's complexity and file-size caps, because those caps flag four long functions and one 561-line file in shipped scripts, and splitting them is its own change.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Measured script coverage after the new tests: 85.56% of lines and 81.19% of branches over 5,000 lines. The floor in <code>scripts/tests/.c8rc.json</code> is lines 85, branches 81. 281 script tests pass with none skipped.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Found while testing: <code>check-openspec-config.mjs</code> passed both broken configs under OpenSpec 1.13.2, which reports a YAML error in its JSON <code>status</code> and a mistyped rule as an &quot;ignoring&quot; warning. It now fails on either, and on any run without JSON.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the supersede count reads <code>RETURNING id</code> rows from the <code>UPDATE</code>, because the store's batch helper drops <code>meta.changes</code>. The new test fails on the old code (<code>added 0, superseded 1</code>).</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: cleanup uses plain <code>realpath</code> plus a directory check instead of <code>realpath -e</code>, which macOS lacks. The result is the same.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Real-key signing left four mutants in <code>access.ts</code> that change nothing observable. The base64 padding code is deleted, because <code>atob</code> decodes unpadded input in Node and workerd. The <code>extractable: false</code> argument and the explicit missing-key return each carry a <code>Stryker disable next-line</code> comment with its reason. <code>npm test</code> in <code>app/</code> passes: 34 tests, 100% coverage, 179 of 179 mutants killed.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>memory/scripts/run.mjs</code> and <code>session-start.mjs</code> stay out of the CLI-conventions test, because neither has <code>--help</code> and both do real work (a run lock and a headless <code>claude</code>, or a session registration) on any flag. Giving them a <code>--help</code> is a separate change.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Saved all tasks for CI. Checked locally: shellcheck 0.10.0 at warning severity, oxlint <code>--deny-warnings</code>, the c8 floor, the release checks, and <code>openspec validate --specs --strict</code>. The browser tests ran on a local Chromium through <code>CHROME_PATH</code>; the runner's <code>chrome</code> channel is proven only by the <code>payload</code> check.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled before the archive: the store held no facts for this change or its branch. The one repeatable rule, that WongStack's own tests and their dependencies stay out of <code>app/</code>, went into <code>.github/CONTRIBUTING.md</code> beside the check commands, its owner.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived and checkpointed for CI on branch <code>explore-tests-playwright-alternatives</code>; specs synced (<code>app-scaffold</code>, <code>ci-tests</code>, <code>memory-store</code>, <code>payload-checks</code>, <code>staging-walkthrough</code>), and <code>openspec validate --specs --strict</code> passes 48 of 48.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item' };
    return { at: '#/decisions/' + m[2], kind: 'decision' };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a /continue instruction ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from review.html (' + data.notes.length + '):'];
    data.notes.forEach(function (n, i) { lines.push((i + 1) + '. ' + where(n.id).at + ' · ' + n.label + ' — ' + n.text.replace(/\s*\n\s*/g, ' ')); });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
