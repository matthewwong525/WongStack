# Release labels GitHub refuses are filled in, not failed

**Status:** ready-to-ship
**Branch:** release-label-gaps
**Open questions:** none

## Why

GitHub won't let the release job's own login label a version that changes workflow files. About a third of versions do, so the job failed on its first run and turned `main` red. `/ship` refuses to start while `main` is red, so one refused label blocks every later change. The missing labels are filled in already, but the next such version will fail the same way.

## What Changes

- **The job labels what it can and reports the rest.** A version GitHub refuses no longer fails the job, so `main` stays green. The job summary lists each refused version, with a warning you can see in GitHub's Actions view.
- **Shipping here fills the gaps.** After `/ship` merges a WongStack release, it runs the same labelling with your GitHub login, which is allowed to create them. Any refused version gets its label within the same ship.
  ```text
  merge lands on main
        │
        ├──▶ release job
        │    labels what GitHub allows
        │    warns about the rest
        │
        └──▶ /ship, with your login
             labels the rest
  ```

**Non-goals:** a stored token for the job, and any change to installed repos. This only touches WongStack's own release machinery.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `open-source-release`: "Each release is tagged" allows a refused Release to be reported instead of failing, and names `/ship` in this repo as the step that fills the gap.

## Impact

- `scripts/tag-releases.mjs`, `scripts/tests/tag-releases.test.mjs`: refused creates are collected, reported, and do not fail the run.
- `.github/workflows/release.yml`: the report goes to the job summary.
- `.agents/rules/payload.md` (meta-only): after `/ship` merges a release here, run `node scripts/tag-releases.mjs` from the synced `main` checkout.
- No payload file changes, so no `VERSION` bump or `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked how to make release labels GitHub's built-in login can't create → chose "your login fills gaps": label the missing versions now with the user's login, let the job label what it can and report the rest without failing `main`, and have `/ship` fill gaps after each merge.
- **2026-09-27** — Before this plan, the 22 missing Releases (20.1.0 through 25.7.0) were created from `/root/WongStack` with the user's `gh` login (scopes include `workflow`). Failed run 36295651789 was re-run and passed, so `main` is green. All 28 Releases, 19.0.0 through 25.7.0, exist, and 25.7.0 is Latest.
- **2026-09-27** — Assumed: the cause is GitHub refusing a `GITHUB_TOKEN` tag on a commit that changes `.github/workflows/`. The run's first four versions had no workflow changes and were created. 20.1.0 (`7c7c0a6`) was the first with one, and it got HTTP 403 "Resource not accessible by integration".
- **2026-09-27** — Assumed: only an HTTP 403 from `gh release create` counts as refused. Any other error still fails the run, because a network or auth failure is not a known gap and should stay loud.
- **2026-09-27** — Assumed: the `/ship` step lives in the meta-only rule `.agents/rules/payload.md`, not in `ship/SKILL.md`. Every WongStack release edits `VERSION` and `CHANGELOG.md`, which load that rule. A line in the payload skill would cost every installed repo context for a script it never has.
- **2026-09-27** — Assumed: a meta-only change with no payload edit, so no release bump, because only `scripts/`, `.github/`, and a meta-only rule change.
- **2026-09-27** — Built on a fresh branch, `release-label-gaps`, cut from `main` (`440dc3d`), because `explore/repo-improvements` had merged as PR #143. Local checks: 324 script tests pass and 9 skip (333, 0 fail); c8 reports 86.25% lines and 81.55% branches. oxlint, the loosened-checks script ("No check was loosened"), the payload link check, and strict spec validation all pass.
- **2026-09-27** — Distilled facts before the archive: no repeatable fact; the store had none for this change or branch, and the 403 rule now lives in `.agents/rules/payload.md`.
- **2026-09-27** — Archived by `/ship` and saved as one checkpoint on `release-label-gaps`; the specs synced `open-source-release` (1 modified).
