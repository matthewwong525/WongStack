# Ask in chat before handing the browser over

**Status:** ready-to-ship
**Branch:** confirm-before-publish
**Open questions:** none

## Why

When the agent needs you partway through a browsing task, such as a yes before it publishes a website, it can send a link to its browser. That link dies after 10 minutes. If you're away when it arrives, it's dead by the time you look, and the task sits stuck. A question in the chat waits for you; a link doesn't.

## What Changes

- **A yes or no is a chat question.** Before the agent publishes, sends, books, pays for, or deletes something in the browser, it asks you in the chat: *Publish the site now?* It never hands you the browser just to click the button yourself.
- **The link comes after you answer.** When a step really needs you on the page (a login, a code, a card), the agent first asks in the chat whether you're ready, and sends the link only once you reply. The 10 minutes start when you're there, not while you're away.
  ```text
     BEFORE                 AFTER
  needs you              needs you
      │                      │
      ▼                      ▼
  link sent              "Ready to
      │                   log in?"
   10 min pass               │
   you're away          (waits for you)
      │                      │
      ▼                      ▼
  dead link              link sent
                             │
                             ▼
                         you're done
  ```
- **No extra question when you asked.** If you just said *let me take over*, you're there, so the link comes straight away.

Non-goals: no change to how long a link lives, how it's kept safe, or what the hand-over page shows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: an outward browser action is confirmed in chat, never through a hand-over; a hand-over link opens only after the person answers in chat, unless they just asked to take over.

## Impact

- `wiki/development/home.md` *Hand the browser over*: a new *Ask first* bullet, and *When* says a yes or no stays in the chat.
- `wiki/development/home.md` *Show what the browser is doing*: the picture before a sending, booking, paying, or deleting action goes with a chat question.
- `openspec/specs/browser-logins/spec.md` via a delta.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Assumed: "the link" is the hand-over link, because it is the only link a browsing task sends that expires (10 minutes).
- **2026-09-28** — Assumed: the rule covers every outward browser action (publish, send, book, pay, delete), not only publishing a website, because the same dead-link risk applies to each.
- **2026-09-28** — Assumed: every hand-over asks *ready?* in the chat first, logins included, unless the person just asked to take over, because a login link sent while the person is away dies the same way.
- **2026-09-28** — Assumed: prose only, with no change to `hand-over.mjs`, because the fix is when the agent opens the link, not how the link works.
- **2026-09-28** — Archive checkpoint: built and archived inside `/ship`, released as 26.29.0.
