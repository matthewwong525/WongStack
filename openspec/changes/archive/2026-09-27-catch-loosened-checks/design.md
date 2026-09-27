# Design

## Context

The main app's `npm test` chain (`app/package.json`) holds every limit: oxlint, Vitest at 100% coverage, knip, jscpd at 0, and Stryker with `thresholds.break: 100`. Each has an escape hatch in code or config, and nothing reads the diff for them. `app/worker/access.ts` already carries two justified `Stryker disable` comments, which shows the hatches get used. `.github/scripts/app-untouched.sh` already computes the base a branch is compared with, for `test.yml`, `deploy.yml`, and `/apply` (`--worktree`).

## Goals / Non-Goals

**Goals:**
- A deterministic step, no model, that fails CI on an unexplained loosening in any WongStack repo.
- One place for the reason, visible on the review page and kept in the archive.
- `/apply` and `/ship` show the loosenings in plain words.

**Non-Goals:**
- Judging whether a reason is good. A person reads it.
- Telling stricter from looser settings.
- Mini-app test settings, a second reviewer, secret or dependency scanning.

## Decisions

**A plain Node script in `.github/scripts/`.** `loosened-checks.mjs`, no dependencies, runs on the runner's preinstalled Node (no `setup-node` needed, so it runs on docs-only branches too). The step runs after the suite with `if: !cancelled()`, so a red suite and a loosened check show in the same run. Node over bash because it reads `package.json` scripts and walks proposal Markdown. It ships as core payload next to `app-untouched.sh`.

**Interface.**
- CI: `node .github/scripts/loosened-checks.mjs --base "$BASE"` diffs `$BASE..HEAD`.
- `/apply`: `node … --worktree` runs `app-untouched.sh --worktree` itself for the base, then diffs the working tree and reads untracked files as wholly added. It never touches the index.
- Output: a Markdown list on stdout (the step appends it to `$GITHUB_STEP_SUMMARY`), one line per flagged file, with `explained` or `needs a reason`. Exit 1 when any is unexplained, exit 0 otherwise, exit 2 on usage error. An empty `--base` prints "could not compare; nothing checked" and exits 0.

**`app-untouched.sh` prints `base=<sha>` as a fourth line**, empty when it fell back to `unknown`. Its test asserts the four keys. `test.yml` passes `steps.scope.outputs.base`.

**What is flagged** (per file; one hit is enough):
1. *Skip markers* on added lines of any changed file outside `wiki/`, `openspec/`, and `*.md`, case-sensitive: `Stryker disable`, `v8 ignore`, `c8 ignore`, `istanbul ignore`, `oxlint-disable`, `eslint-disable`, `biome-ignore`, `jscpd:ignore`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `(it|test|describe).(skip|only|todo)`, and `xit(`, `xdescribe(`, `fit(`, `fdescribe(`.
2. *Deleted tests:* a deleted path matching `*.test.*`, `*.spec.*`, or `test_*`, found with rename detection (`-M`), where a rename to another test-file name is not flagged.
3. *Check settings:* any added, changed, or deleted file whose basename matches `vitest.config.*`, `jest.config.*`, `stryker.conf*`, `stryker.config.*`, `.oxlintrc*`, `.eslintrc*`, `eslint.config.*`, `biome.json*`, `.jscpd.json`, `knip.json*`, `knip.config.*`, `tsconfig*.json`, plus `.github/workflows/test.yml` and `.github/scripts/*`. A `package.json` is flagged only when its `scripts.test`, or a script that `scripts.test` runs through `npm run <name>`, differs from the base.

The script skips its own path for markers only; a change to it is still a settings change. Its meta test builds marker strings at run time (`'Stryker' + ' disable'`) so the test file flags nothing either.

**Where the reason lives.** Proposals the branch adds or changes: `openspec/changes/*/proposal.md` and `openspec/changes/archive/*/proposal.md` in the diff. In each `## Decision log`, a bullet whose text after `**date** —` starts with `Check:` explains every backticked path it names. Matching is on exact repo-relative path. Reading only changed proposals stops an old archive from excusing a new loosening.

**The rule is stated once.** [The gate](../../../wiki/development/the-change-loop.md#the-gate) gets a short paragraph that owns it. `.claude/rules/code.md` gets one line that links it, so an agent editing code knows before CI tells it. `/apply`'s finish step and `/ship`'s report link the gate and add only their own step.

**Review page.** `build-review.mjs` labels `^Check:` as `check`. `review-kit.html` gives `.tag.check` a distinct border (dotted) so it reads apart from `asked` and `assumed` in both color schemes.

## Risks / Trade-offs

- [Any settings edit needs a reason, stricter ones included] → one line per file, and CI's message says what to write. Accepted over a per-key direction table that misses new keys.
- [A `/wong-sync` that updates `test.yml` or a scaffold config fails until it records a reason] → the `/save` auto-fix path adds the `Check:` bullet; the CHANGELOG's Updating note says so.
- [An agent writes a hollow reason] → the reason is shown to the person before publishing; judging it is out of scope.
- [A marker in a string literal, e.g. a lint config test] → flagged; the agent records a reason. Rare, and a false alarm costs one line.
- [No base on a push to `main` with an all-zero before SHA] → passes with a note; its pull request already ran the step.
