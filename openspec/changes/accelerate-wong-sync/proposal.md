# Accelerate wong-sync

**Status:** ready-to-ship
**Branch:** optimize-wong-sync-perf
**Open questions:** none

## Why

`/wong-sync` refreshes the source and then starts a broad AI exploration even when the selected payload has not changed. A deterministic preflight can make current installations return quickly and can bound the AI work for real updates without weakening protection for local adaptations.

## What Changes

- Add a dependency-free payload preflight that compares the installed source revision, the latest clean source checkout, the selected manifest categories, recorded skill names, and the target files. It reports a bounded changed-path classification without writing the target. (review.html#/classifier/union)
- Change `/wong-sync` to return after a successful current result and to invoke `/explore` only for an available payload update, with the preflight report and relevant paths as its initial scope. Retrieval or classification uncertainty remains explicit and never becomes a false current result. (review.html#/sync-path/after/preflight)
- Add fixture-based correctness and performance coverage for no-op, one-file, manifest, mapped-skill, local-adaptation, removal, block, and failure cases. Ship the helper and instructions together with the required version and changelog update. (review.html#/coverage-surface/fixtures)

**Non-goals:** Cache model output; skip source refresh; overwrite local adaptations; implement an update during sync; change `/explore`, `/plan`, or delivery gates; add a runtime dependency; optimize setup or unrelated workflow verbs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wong-sync`: Add a deterministic payload preflight, a no-op fast path, bounded update context, and explicit failure behavior.
- `wong-sync-adapt`: Start update exploration from the classified upstream delta while retaining model judgment for relevant local adaptation.

## Impact

The change adds a script under `.claude/skills/wong-sync/scripts/`, updates the sync skill and its source and manifest guidance, and adds meta-repo fixtures under `scripts/tests/`. The helper uses Node.js and Git, which WongStack already requires, and writes no cache or target file. Payload checks, OpenSpec validation, `VERSION`, and `CHANGELOG.md` are part of implementation.

## Decision log

- **2026-09-22** — Asked how aggressive the deterministic fast path should be → chose to skip AI for a proven no-op and send only changed payload paths to `/explore` for an available update.
- **2026-09-22** — Assumed source refresh remains mandatory because a stale cache cannot prove that the installation is current.
- **2026-09-22** — Assumed the preflight is dependency-free deterministic code because classification repeats on every sync and does not need model judgment.
- **2026-09-22** — Assumed errors, unknown installed commits, unsupported manifest data, and incomplete reads fail closed into an explicit diagnostic, not a current result.
- **2026-09-22** — Assumed the performance contract measures the deterministic preflight on repeatable fixtures; end-to-end model latency varies by host and is not a stable CI assertion.
- **2026-09-22** — The bounded `/explore` exit round is complete. Remaining implementation details use supported assumptions in the design.
- **2026-09-22** — Implementation checkpoint: release 16.4.0 adds the source-run preflight, selected inventory-union comparison, mapped-path and marked-block handling, explicit current/update/error routes, and fixture coverage. The remaining tasks require CI evidence and its synthetic 1,200-unit timing; no local test result is used as the gate.
- **2026-09-22** — CI checkpoint `221d93c` passed on PR #95: all 43 meta tests passed with 0 failures, including payload links, OpenSpec config, review, migration, and preflight fixtures. The synthetic 1,200-unit no-op preflight took 54.84 ms in CI; this is deterministic classifier time only and excludes source refresh and model latency.
