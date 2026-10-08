# See the changed screens before publishing

**Status:** ready-to-ship
**Branch:** visual-results-first
**Open questions:** none

## Why

A preview link alone makes you leave the chat to see what was built. Show a couple of pictures before asking what to do next, so you can see the result as you choose.

## What Changes

- **Pictures before the choice.** After a build, show two useful views of the changed screens in the chat, each with a short caption, before asking whether to publish, change more, or save.
  ```text
  build ─▶ preview ─▶ pictures ─▶ choice
                       │
                       ▼
               see what changed here
  ```
- If there is only one useful view, show one. If pictures cannot be taken, say why and keep the preview link and the choice.
- Asking to build and publish in one go still goes straight through, with no extra confirmation.

Non-goals: changing the app, adding a screenshot service, or making pictures a publishing check.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply`: show useful preview screenshots before the publish question, with an honest fallback when unavailable.

## Impact

The apply skill and the change-loop wiki; the existing verify screenshot route supplies browser capture and image display. Payload release with a minor changelog entry. No runtime code or dependencies.

## Decision log

- **2026-10-08** — Asked: show a couple of screenshots in the chat before the multiple-choice question during /apply → chose that behavior and requested /ship.
- **2026-10-08** — Assumed: two distinct changed screens, or useful states or sizes of one screen, because the pictures should show the result rather than duplicate it; one is enough when there is only one meaningful view.
- **2026-10-08** — Assumed: reuse the existing screenshot route and keep pictures optional when unavailable, because this needs instructions rather than a new browser service or publishing gate.
- **2026-10-08** — Assumed: checkpoint the completed archive on visual-results-first as release 38.3.0; local checks passed, with shellcheck retained for CI because it is unavailable here. No app screen changed, so the new screenshot handoff awaits a real UI build.
