# Switch the license to Apache 2.0

**Status:** ready-to-ship
**Branch:** update-apache-license
**Open questions:** none

## Why

WongStack is shared under the MIT license today. You want it under Apache 2.0, which still lets anyone use, change, and share it, and adds an explicit patent grant and a rule that changed files say they were changed. No one uses it yet, so the switch needs no one's permission.

## What Changes

- **The license becomes Apache 2.0.** The license file holds the standard Apache 2.0 text, word for word, so GitHub shows *Apache-2.0* on the repo page. A short notice file keeps the copyright line the MIT file carried.
  ```text
       BEFORE                 AFTER
  ┌──────────────┐     ┌──────────────────┐
  │ LICENSE: MIT │ ──▶ │ LICENSE: Apache  │
  │ © 2026       │     │   2.0 (standard) │
  │ Matthew Wong │     │ NOTICE: © 2026   │
  └──────────────┘     │   Matthew Wong   │
                       └──────────────────┘
  ```
- **The README says Apache 2.0.** The badge, the file table, and the *License* section name Apache 2.0 instead of MIT.
- **The record says Apache 2.0.** The open-source promise now requires the Apache 2.0 license and its notice file, so a later change can't quietly bring MIT back.

Non-goals: no license header in every file; no change to the licenses of outside tools a skill adapts, which keep their own.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `open-source-release`: the repository carries an Apache 2.0 `LICENSE` and a `NOTICE`, not an MIT `LICENSE`.

## Impact

- `LICENSE`: replaced with the verbatim Apache License 2.0 text.
- `NOTICE`: new, with the project name and copyright line.
- `README.md`: badge label, file-table row, and *License* section.
- `openspec/specs/open-source-release/spec.md` via a delta.
- No payload file changes (`LICENSE`, `NOTICE`, and `README.md` are not in the payload manifest), so no `CHANGELOG.md` entry or release.

## Decision log

- **2026-09-29** — Assumed: relicense straight away with no contributor sign-off, because the owner said no one has used it yet and every commit is theirs.
- **2026-09-29** — Assumed: keep the Apache text word for word, with the appendix placeholders unfilled, and put the copyright line in a `NOTICE` file, because GitHub's license detection matches the standard text and Apache's own guidance puts attribution in `NOTICE`.
- **2026-09-29** — Assumed: no per-file license headers, because Apache 2.0 recommends but does not require them, and they would touch every file for no gain.
- **2026-09-29** — Assumed: no changelog entry or release, because none of the changed files ship to installs.
- **2026-09-29** — Assumed: past plans in the archive keep saying MIT, because the archive is an immutable record of what shipped then.
- **2026-09-29** — Assumed: archived and checkpointed by `/ship` for merge, because the owner typed `/ship` and every task was done.
- **2026-09-29** — Assumed: archive checkpoint saved for `/ship` to merge, because the tasks were done and the change archived cleanly.
