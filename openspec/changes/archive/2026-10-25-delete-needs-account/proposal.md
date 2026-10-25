# The test line's delete can look like it failed

**Status:** ready-to-build
**Branch:** delete-needs-account
**Open questions:** none

## Why

The 44.14.0 update asks each install to delete its old test line. On WongStack's own account, the delete worked but then printed an error asking for a sign-in permission, and a second try said the Worker no longer exists. An owner who sees that error may think the delete failed and try to fix a permission they don't need.

## What Changes

- **The update says what that error means.** If the delete prints an error about reading memberships, the delete already worked: the owner checks the account's Workers list and moves on. The live line's wiki page gets the same step, so it lives in one place and the update links to it.
  ```mermaid
  flowchart TD
    del["delete the<br/>old test line"] --> err{"error about<br/>memberships?"}
    err -- yes --> check["check the<br/>Workers list"]
    err -- no --> done["done"]
    check --> done
  ```

Non-goals: deleting the test line by script; changing what the update does.

## Capabilities

### New Capabilities

### Modified Capabilities

None: wording only.

## Impact

`wiki/stack/live-line.md` (a step for retiring the old test line), `CHANGELOG.md` (a `## Next (patch)` entry). No code.

## Decision log

- **2026-10-25** — Asked what to do next after publishing 44.14.0 → chose to note the delete's error.
- **2026-10-25** — Assumed: the wiki's live-line page owns the delete step and the patch's **Updating.** note links to it, because one topic has one page and the 44.14.0 note is already published.
- **2026-10-25** — Assumed: setting `CLOUDFLARE_ACCOUNT_ID` is not the fix, because it was already set from `.env` when the error appeared.
