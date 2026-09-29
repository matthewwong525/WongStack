# Refresh the app and test dependencies

**Status:** ready-to-ship
**Branch:** check-repo-updates
**Open questions:** none.

## Why

The app's development tools have newer fixes available, including a security update to their HTTP client. The two separate test-runner updates currently fail because the runner and its coverage tool require matching versions.

## What Changes

- Update the app's development tools and the repository's test linter together, including matching versions of the test runner and coverage tool.
  ```text
  Separate updates       One matched update
  runner 5 + coverage 4   runner 5 + coverage 5
           │                      │
           ▼                      ▼
     install conflict       full checks
  ```
- Keep the existing quality checks and review the major upgrade's migration notes before saving the update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This dependency refresh preserves the app-scaffold and dependency-workflow promises; `skip_specs: true` applies.

## Impact

`app/package.json`, `app/package-lock.json`, and the test-tool manifests under `scripts/tests/`. The starter-app payload changes require a patch release entry. No application behavior or public API change is intended.

**Non-goals:** Changing the app's screens or closing existing dependency pull requests by hand.

## Decision log

- **2026-09-29** — Asked whether to use the dependency workflow → the user invoked `/update-dependencies`, authorizing the survey, update, and save.
- **2026-09-29** — Assumed: keep this one dependency refresh in the current branch, because the user requested the complete update workflow and the existing overlapping pull requests are automated updates.
- **2026-09-29** — Assumed: move Vitest and coverage together to 5.0.2, because their peer dependencies require matching versions. Reviewed the upstream Vitest 5 migration guide against the app's tests and config: Node/Vite prerequisites are met, mocks are created per test, coverage globs are project-relative, and no removed entrypoints or benchmarking/browser APIs are used. CI will verify the complete suite and existing coverage floor.
- **2026-09-29** — Assumed: keep OpenSpec 1.13.2 and agent-browser 0.38.1, because they are current. The updater skipped the OpenSpec contract test because its version did not move.
- **2026-09-29** — Assumed: leave host Node 22.22.1 and GitHub CLI 2.46.0 pending consent, because the updater reports a manual host step and the configured apt sources offer no newer versions. Upstream versions are Node 22.23.3 and GitHub CLI 2.101.0.
- **2026-09-29** — Assumed: rerun the updater before checkpointing because installation resolved a newer Wrangler than the initial registry survey. The rerun moved its manifest range to 4.144.0 and skipped the current stages. Session facts could not be saved: the memory script reports no registered session in this checkout.
- **2026-09-29** — Assumed: mark the repository update ready to publish after the saved change passed Test, Deploy, and Payload checks. Vitest 5.0.2 passed all 43 tests with all four coverage measures at 100%; lint, unused-code, and duplicate-code checks passed. `npm audit --json --omit=optional` reported zero vulnerabilities. No migration edits or held packages were needed. The preview was discovered from the commit's deployment metadata. Publishing and the separate host-tool installation are still pending the user's choice.
- **2026-09-29** — Asked whether to publish the checked update and upgrade the host tools → the user chose both. Archived this completed change and numbered its patch release 27.6.1 from 27.6.0 for the publication checkpoint.
- **2026-09-29** — Assumed: install Node's official 22.23.3 distribution under `/opt/node-v22.23.3-linux-x64`, with default command links in `/usr/local/bin`, because the simulated NodeSource package replacement would remove unrelated distro development packages. Verified the archive against Node's published SHA256 checksum and preserved the existing `/usr/local` npm global prefix. Node, npm 10.9.9, OpenSpec, and agent-browser commands work. Installed GitHub CLI 2.101.0 through its signed apt repository with no package removals. The temporary NodeSource repository was removed; OS-managed Node remains alongside the new default runtime.
