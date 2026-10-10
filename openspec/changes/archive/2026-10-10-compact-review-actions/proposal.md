# A smaller review bar with loading feedback

**Status:** ready-to-ship

**Branch:** review-loading-compact-bar

**Open questions:** none

## Why

Review buttons can take a while to answer without showing that the tap worked. The bottom bar also takes up too much of the phone screen.

## What Changes

- **The bottom bar stays on one row.** The note count and Send notes stay visible; a three-dot button opens Build it and Build and publish above the bar. The publish question opens there too.
  ```text
  BEFORE (phone)
  ┌──────────────────────────────────┐
  │ Plan                             │
  ├──────────────────────────────────┤
  │ 0 notes             [Send notes] │
  │ [Build it] [Build and publish]   │
  └──────────────────────────────────┘

  AFTER (phone)
  ┌──────────────────────────────────┐
  │ Plan                             │
  ├──────────────────────────────────┤
  │ 0 notes      [Send notes] [+...] │
  └──────────────────────────────────┘

  MORE OPEN
  ┌──────────────────────────────────┐
  │                   [Build it]     │
  │                   [Build and     │
  │                    publish]      │
  ├──────────────────────────────────┤
  │ 0 notes      [Send notes] [ ...] │
  └──────────────────────────────────┘

  PUBLISH QUESTION
  ┌──────────────────────────────────┐
  │ Goes live, can't be undone.      │
  │ [Yes, publish] [Cancel]          │
  ├──────────────────────────────────┤
  │ 0 notes      [Send notes] [ ...] │
  └──────────────────────────────────┘
  ```
- **A tap shows that it is working right away.** Sending notes or asking for a build shows a spinner and Sending… until the chat answers. Those actions cannot be tapped again while a request is running. Connecting to the chat also shows progress, and each answer or problem appears above the bar.
  ```text
  CONNECTING
  0 notes       [Connecting...] [ ...]

  SENDING NOTES
  2 notes       [Sending...   ] [ ...]

  ASKING FOR A BUILD
  [spinner] Sending your request...
  0 notes       [Send notes  ] [ ...]

  ANSWER
  Asked the chat to build.
  0 notes       [Send notes  ]

  PROBLEM
  Wait a few seconds, then tap again.
  0 notes       [Send notes  ] [ ...]
  ```
- **The menu works with a keyboard and on small phones.** Escape or a tap outside closes it. The notes button stays the main visible action, and closed links still let you copy notes.

Non-goals: changing what the chat builds, the publish confirmation, or the connection service.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: compact review controls and visible progress for reply requests.

## Impact

- Review kit and browser tests; review guidance in the wiki.
- Payload release: a minor CHANGELOG entry; VERSION stays unchanged until publishing.

## Decision log

- **2026-10-10** — Assumed: put both build choices in a three-dot popover, because the user suggested that and asked for a single-row bar.
- **2026-10-10** — Assumed: show progress immediately and keep success tied to the chat's response, because a spinner addresses the silent wait without promising faster delivery.
- **2026-10-10** — Assumed: share one pending state across send and build actions, because overlapping requests use the same rate-limited connection.
- **2026-10-10** — Assumed: place messages and publish confirmation above the bar, because wrapping them into the bar would break the requested one-row layout.
- **2026-10-10** — Assumed: retain unconfirmed network requests until their response arrives, because a client timeout could invite a retry after the chat already received the message.
- **2026-10-10** — Asked whether to publish after the remaining checks pass → chose publish; publication waits for passing saved checks.
- **2026-10-10** — Archive checkpoint: all tasks complete, full local checks and the first saved checks passed. Version 40.1.1 landed before publication, so it was brought in and this 40.2.0 release will pass a fresh saved gate before merging.
