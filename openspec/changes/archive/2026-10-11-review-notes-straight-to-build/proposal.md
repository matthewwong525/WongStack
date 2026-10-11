# Three review buttons, with notes carried into the build

**Status:** ready-to-ship
**Branch:** review-notes-build
**Open questions:** none

## Why

The review page hides building behind a menu and makes you send notes, wait for the plan to change, then ask to build. You should be able to leave notes and choose what happens next in one step.

## What Changes

- **Three buttons stay visible at the bottom.** Send notes, Build it, and Build and publish are directly available on a connected review page, including on a small phone.
  ```text
  BEFORE
  Plan and your notes
  [Send notes] [···]
                └─ Build / Build and publish

  AFTER — phone
  Plan and your notes
  ┌──────────┬──────────┬──────────────┐
  │Send notes│ Build it │ Build and    │
  │          │          │ publish      │
  └──────────┴──────────┴──────────────┘
  Publishing: confirm above the buttons.
  Waiting: buttons pause, status shows.
  Closed: Copy notes stays available.
  ```
- **Build with your saved notes in one step.** Either build choice sends the notes with your choice. The assistant updates the plan and immediately builds; Build and publish also publishes after its checks. Send notes alone still updates the plan and waits.
  ```text
  BEFORE
  Save notes → Send → wait → Build

  AFTER
  Save notes → Build with notes
               ├─ update plan
               └─ build → preview
  Save notes → Build and publish
               └─ update → build → publish
  ```
- **Notes stay safe when a request fails.** Only an acknowledged request marks its included notes as sent. A changed plan asks you to reload; a closed link leaves your notes available to copy.
- **Desktop text is easier to read, with shorter buttons aligned to the plan.** The plan uses larger text on a computer, and the three bottom buttons expand to the same padded content edges.
  ```text
  DESKTOP BEFORE
  Small plan text
  [     Send notes     ][     Build     ]
  [            Build and publish       ]

  DESKTOP AFTER
  + Larger plan text
  [ Send notes ][ Build it ][ Publish ]
  + Button edges align with plan edges
  ```

**Non-goals:** Changing the notes editor, changing link expiry, or publishing without the chosen publish action.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: Visible build buttons and saved notes included in a build request, with current progress and failure behavior.
- `asking-the-user`: Review notes accompanied by an explicit build choice update the plan and continue to that authorized action.
- `reply-links`: Registered actions may include bounded reviewer notes in the same message without changing their fixed instruction or chat target.

## Impact

Review kit, review builder action messages, reply-link action endpoint, planning/building skill routing, browser and endpoint tests, owning wiki pages, and a minor payload release. No dependency or app data changes.

## Decision log

- **2026-10-11** — Assumed: The three buttons mean the existing Send notes, Build it, and Build and publish choices, because the request asks to expose those choices at the bottom.
- **2026-10-11** — Assumed: Carry saved unsent notes in one action request, because two separate sends can update the plan between the note send and the build request.
- **2026-10-11** — Assumed: Keep the existing publish confirmation above the bar, because the requested shortcut concerns notes and building and does not remove the publish confirmation.
- **2026-10-11** — Assumed: Only saved notes join the build; drafts retain their current behavior and are excluded.
- **2026-10-11** — Assumed: Replace a running older reply server when opening the updated page, keeping its tunnel and links, because the older action handler would silently omit attached notes.
- **2026-10-11** — Asked: Adjust desktop readability and oversized buttons → chose larger text and smaller buttons, as requested in chat.
- **2026-10-11** — Asked: Expand the desktop buttons to the page padding → chose a button row matching the plan content's left and right edges, keeping its shorter height.
- **2026-10-11** — Archived checkpoint: completed the review-note shortcut and desktop refinements; local checks and current desktop/phone alignment passed, ready for the publishing checks.
