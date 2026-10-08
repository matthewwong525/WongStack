# Private links stay open for eight hours

## Why

Ten-minute links can expire before you have time to use them. Give every private link eight hours by default so you can come back when ready.

## What Changes

- Password links, private forms, and key links stay open for eight hours by default. Finishing or cancelling still closes them early, and a requested shorter time still works.
  ```text
  Open link ──────────────▶ 8 hours
       └─ Finish or cancel ──▶ Closed
  ```

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: eight-hour default for password links and private forms.
- `secrets-convention`: eight-hour default for key links.

## Impact

Private-link CLI defaults, expiry tests, and owning wiki pages. Reply links already default to eight hours and need no change.

Non-goals: changing replacement, completion, cancellation, or secret handling.

## Status

**Status:** Complete; archived for publication.

**Branch:** `links-active-eight-hours`

**Open questions:** none

## Decision log

- **2026-10-08** — Asked how long opened links should stay active → chose eight hours by default.
- **2026-10-08** — Assumed: apply the default to all private-link kinds, because the request covers opened links generally; keep explicit time overrides and early closure.

- **2026-10-08** — Assumed: archive checkpoint is ready after completed implementation and passing local checks; publication awaits the remote gate.
