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
