# Three guides catch up with what chats learned

**Status:** ready-to-ship

**Branch:** dream-record-and-page-gaps

**Open questions:** none

## Why

The first real dream listed gaps on pages WongStack ships, which a dream never edits itself, and the owner asked for those fixed. The same dream also found its own record was too long for one memory note; release 37.0.0 fixed that separately while this change waited, so only a test for it remains here.

## What Changes

- **The change loop says where a check goes when it can only happen after publishing**: a line in the plan's Decision log, not a task that can never be ticked.
- **Browsing says never to close every browser at once**, because that closes every chat's browser on the computer.
- **Cloudflare credentials says how a one-off permission is handled**: ask first, then a short-lived key for that permission alone.

**Non-goals:** Changing when setup installs the browser and tunnel tools. The owner said on 2026-10-04 that a tool should be downloaded only when a task needs it, and setup offers those two up front; that is a behaviour question for its own change, so the tools page is left as it is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No promise changes: a dream still counts as the last dream, and the three pages gain guidance only.

## Impact

- `scripts/tests/dream.test.mjs`: one test that a dream recorded across two facts counts the pages of both.
- `wiki/development/the-change-loop.md`, `wiki/development/browsing.md`, `wiki/stack/cloudflare-credentials.md`: one addition each.
- `CHANGELOG.md`: a `patch` entry.

## Decision log

- **2026-10-06** — Asked what to do after the first real dream → chose to fix the record flaw and the shipped-page gaps in one change.
- **2026-10-06** — Assumed: the record is split across notes and the script is left as it is, because the script already counts pages from every dream note and the first dream's two notes read back correctly.
- **2026-10-06** — Assumed: the tools page is not edited, because the fact behind that gap contradicts what setup does today, and a page should not say what the code does not do.
- **2026-10-06** — Assumed: the one-off permission line says to ask first, because the fact records that each use followed the owner's yes and the page's standing permission covers the normal widen only.
- **2026-10-06** — Assumed: this change's own edit to the dream skill is dropped, because release 37.0.0 renamed the skill to `/dream-memory` and its record step already splits a long page list; the test is kept, since it passes against the renamed script.
- **2026-10-06** — Asked how to clear a publish blocked by failed dependency-update runs on the published version → answered to try again once it was fixed; 37.0.0 made the publish step count only the project's own checks.
