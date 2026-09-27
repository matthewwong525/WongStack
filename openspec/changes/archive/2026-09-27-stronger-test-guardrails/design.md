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
