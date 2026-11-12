# Design

## Context

The loop's profile (`.agents/loop/profile.mjs`) runs Daily's and the browser's scripts by path under `.claude/skills/`. Release 57.0.0 moved `hand-over/` to `browser/skills/hand-over/` and `schedule/` to `daily/skills/schedule/`. The profile still joins `hand-over/scripts/hand-over.mjs`, `schedule/scripts/tidy.mjs` and `schedule/scripts/workspace.mjs`. No test ran these two parts, so CI passed.

## Goals / Non-Goals

**Goals:** the three calls reach real files; a test fails when a profile call names a missing file.

**Non-Goals:** no change to the scripts themselves, or to how the slots work.

## Decisions

- **Point at the new paths**, `browser/skills/hand-over/…` and `daily/skills/schedule/…`, not a lookup of both layouts: an install updates both modules and the loop in the same `/wong-sync`, so the old layout never meets the new profile.
- **The test runs the parts with a stand-in `node`** on `PATH` that records the script it gets. It then checks each recorded path exists in this checkout. The profile already calls `node` by name for this purpose. This covers `closeWorkspace`, `newWorkspace open` and `newWorkspace scratch`.

## Risks / Trade-offs

- [A future part adds a new script path] → the test covers only these parts; a new part needs its own line in the test.
