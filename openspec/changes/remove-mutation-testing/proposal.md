# Remove mutation testing

**Status:** in-progress
**Branch:** stryker-merge-performance
**Open questions:** none.

## Why

Mutation testing (Stryker) cost more than it caught. In wongstack-cloud, with 20+ merges a day, it made each push wait 7 to 25 minutes. Its saved results went stale, so one pull request passed with a weak test, turned the main branch red after merging, and then failed other pull requests that never touched that code. You decided the benefit isn't worth the headache.

## What Changes

- **Pushes get checked in about a minute or two again.** The test check stops running mutation testing, so a push no longer waits 7 to 25 minutes.
  ```text
  before:
  push ─▶ lint ─▶ tests ─▶ dead code
       ─▶ copies ─▶ mutation (7–25 min)

  after:
  push ─▶ lint ─▶ tests ─▶ dead code
       ─▶ copies ─▶ done
  ```
- **One pull request can't turn others red.** No leftover mutation result can fail a pull request that never touched the code behind it.
- **No more nightly full run.** The daily re-test goes away, and so does the rule that a red nightly run stops publishing.
- **Every other check stays.** Lint, 100% test coverage, dead-code and copied-code checks, and the check that a loosened test needs a written reason all still run on every push.
- **Your repos drop it on their next update.** The next WongStack update removes mutation testing from each repo, and wongstack-cloud stops failing on the leftover weak test. Nothing to do by hand.

Non-goals: replacing mutation testing with another tool, updating Vitest to 5 (Stryker was the only thing holding it back; the next dependency update can take it), and editing wongstack-cloud directly (it gets this through `/wong-sync`).

## Decision log

- **2026-09-28** — Asked how to stop Stryker causing problems at 20+ merges a day (options offered: scope it to changed files and keep a nightly full run) → chose remove it entirely, as before it was added, because the benefit isn't worth the headache.
- **2026-09-28** — Assumed: the evidence stands as measured in wongstack-cloud: pushes took 7–25 minutes (runs 36358318949, 36359004715, 36368467645); PR #19's branch run 36358940312 reused a stale result and passed in 31 s, then main runs 36359223236 and 36360114543 failed on a surviving mutant at `src/apps.tsx:56`, and branch runs 36368467645 and 36370236928 failed on the same one.
- **2026-09-28** — Assumed: `loosened-checks.mjs` keeps its `Stryker disable` and `stryker.conf` patterns, because the script covers any stack's tools (Jest, ESLint, Biome too), and a repo that adds Stryker back still gets the check. So `stryker` is not a retired name.
- **2026-09-28** — Assumed: the scaffold's two `// Stryker disable` comments in `app/worker/access.ts` go, because they skip a tool the scaffold no longer runs.
- **2026-09-28** — Assumed: the Vitest 4 hold stays out of scope, because a dependency update is its own change through `/update-dependencies`; the CHANGELOG says the hold's reason is gone.
- **2026-09-28** — Assumed: the release is minor, not major, because nothing a user does changes and the removed gate only ever failed pushes.
- **2026-09-28** — Assumed: the update needs no hand step, because `/wong-sync` removes `app/stryker.conf.json`, the Stryker packages, and the workflow steps, and saved Stryker files in GitHub's cache expire on their own after 7 unused days.
- **2026-09-28** — Check: `app/package.json` drops `stryker run` from the `test` script and both `@stryker-mutator` packages, because mutation testing is removed; the other gates are unchanged.
- **2026-09-28** — Check: `app/stryker.conf.json` is deleted, because mutation testing is removed.
- **2026-09-28** — Check: `.github/workflows/test.yml` drops the Stryker restore and save steps, the nightly `schedule` run, and the 60-minute nightly limit, because mutation testing is removed.
- **2026-09-28** — Check: `app/worker/access.ts` drops two `// Stryker disable` comments, because the tool they skip no longer runs.
- **2026-09-28** — Assumed: `test.yml`'s "Locate the test suite" also drops its `rel` output, because only the Stryker cache steps read it.
- **2026-09-28** — Assumed: `app/.gitignore` keeps `reports`, because it stops an old local `reports/stryker-incremental.json` from being committed.
- **2026-09-28** — implemented tasks 1.1–4.2: Stryker leaves `npm test`, the packages, and the scaffold; `test.yml` loses the nightly run, the cache steps, and the 60-minute limit; `/ship` drops the red-nightly sentence; a `## Next (minor)` CHANGELOG entry. Payload links, OpenSpec config, retired names, and loosened checks pass locally. Task 5.1 waits for `/save`'s CI run.
- **2026-09-28** — saved for task 5.1's CI evidence; the `ci-tests` and `app-scaffold` deltas are synced to `openspec/specs/`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ci-tests`: remove "Mutation results carry between runs" and "A nightly run re-tests every mutant".
- `app-scaffold`: "npm test runs absolute quality gates" no longer includes a surviving mutant.

## Impact

- `app/package.json`, `app/package-lock.json`: `test` script loses `&& stryker run`; `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` leave `devDependencies` and the lockfile.
- `app/stryker.conf.json`: deleted. `app/.gitignore`: drop `.stryker-tmp`.
- `app/worker/access.ts`: two `// Stryker disable next-line` comments removed.
- `.github/workflows/test.yml`: drop the `schedule` trigger, its clause in the job `if`, the timeout expression (back to 30), the `stryker`/`stryker-key` outputs, the restore and save steps, and the header's "Why Stryker's result file is cached" section.
- `.claude/skills/ship/SKILL.md`: drop the red-nightly sentence from Step 1's preflight.
- `CHANGELOG.md`: a `## Next (minor) — …` entry; `VERSION` stays.
- Downstream: the next `/wong-sync` removes the config, the packages, and the workflow steps; the sync plan needs `Check:` bullets for `test.yml`, `app/package.json`, and `app/stryker.conf.json`, which CI names. A repo's own `// Stryker disable` comments become harmless leftovers.
