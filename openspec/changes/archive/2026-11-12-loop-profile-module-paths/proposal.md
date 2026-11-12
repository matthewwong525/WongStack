# Proposal

**Status:** ready-to-ship
**Branch:** daily-browser-old-paths
**Open questions:** none

## Why

Release 57.0.0 moved the browser's and Daily's helpers into their own folders. The build loop still calls three of them at their old places. So closing a chat fails, opening a new workspace fails, and closing a chat leaves its live-view link open.

## What Changes

- **Closing a chat works again.** It closes the chat's live-view link, then its workspace, as it did before 57.0.0.
- **Opening a new workspace works again**, and so does making its scratch folder.
- **A test catches a moved helper.** It fails when the loop calls a helper at a place where no file is.

Non-goals: no change to what closing or opening does; no other module moves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None: this restores the behavior the specs already promise.

## Impact

- `.agents/loop/profile.mjs`: `closeWorkspace` and `newWorkspace` paths.
- A new test in `scripts/tests/`.
- `CHANGELOG.md`: a patch entry.

## Decision log

- **2026-11-12** — Asked: closing this chat failed after 57.0.0 → chose fix it now and publish it.
- **2026-11-12** — Assumed: a patch release with no spec delta, because the specs already promise that closing and opening work; only the paths were wrong.
- **2026-11-12** — Assumed: the test runs the profile's parts with a stand-in `node` and checks each script it gets exists, because that tests the real calls, not a copy of their paths.
- **2026-11-12** — Assumed: the build ran in this chat, not a helper, because it is three paths and one test, already found while closing.
- **2026-11-12** — Assumed: archive checkpoint for release 57.1.1; the local pre-check did not run because another chat held the check slot, so CI is the only check before merge.
