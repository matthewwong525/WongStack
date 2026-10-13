# The first message builds your first app

**Status:** ready-to-ship
**Branch:** first-app-builder
**Open questions:** none

## Why

A new install's home page offers one message to copy into your chat. Today it only renames the page and removes the welcome box, so a new owner ends their first chat with a tidier page and nothing they can use. The first chat should end with an app built around their own work.

## What Changes

- **The copied message asks for your first app.** Paste it and the assistant questions you about your work and where your time goes, one question at a time, starting from what it already knows about you. It then suggests a few apps you would use, builds the one you pick, removes the welcome box, explains each step, and shows a preview before publishing.
  ```text
    BEFORE                 AFTER
  paste message          paste message
       │                      │
       ▼                      ▼
  "what should I call    +questions about
   this page?"            your work, one
       │                  at a time
       ▼                      │
  new heading,                ▼
  no welcome box         +a few app ideas,
                          you pick one
                              │
                              ▼
                         +your first app,
                          no welcome box
  ```
- **The box says what the message is for.** Its title, *Make it yours*, and its *Copy your first request* button stay. The line under the title now says to start with an app built for how you work.
  ```text
  ┌──────────────────────────────┐
  │ Make it yours                │
  │ +Start with an app built for │
  │ +how you work. Just ask in   │
  │  your chat. ...              │
  │ +"Help me build my first     │
  │ + app. Grill me first: ..."  │
  │ [Copy your first request]    │
  └──────────────────────────────┘
  ```
- **The message no longer renames the page.** Ask in your chat any time to change the heading.
- **Installs you already have keep their page.** An update swaps the message only where the welcome box is still showing; a removed box stays removed.

**Non-goals:** Reading past chats again from this message (setup already does that while it installs), a new screen or wizard for picking an app, a list of ready-made app ideas, or changing the box's title.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: The starter page's first request asks the agent to question the person about a first app and build it; the requirement that the request change only the page is replaced.

## Impact

The starter app's `Tutorial.tsx` message and supporting line, its test, the kept check that quotes the message, the getting-started, mini-apps, and learning-from-chats wiki pages, the sync manifest's one line about the welcome, and a minor payload release. No app data, database, dependency, or skill-procedure changes.

## Decision log

- **2026-10-13** — Assumed: The message drops the page rename, because the request asks for it to be "more so about building their first app" and one message with two jobs reads long; the heading stays changeable by asking.
- **2026-10-13** — Assumed: The message still removes the welcome box, because nothing else on the page removes it and a finished guide left showing invites a second paste.
- **2026-10-13** — Assumed: The questions start from what the assistant already knows, because setup learns about the person from past chats while it installs and asking it all again wastes their first chat.
- **2026-10-13** — Assumed: The message asks for one question at a time and a few suggestions to pick from, because "grilling them on what they might find useful" means the assistant draws the idea out; a person new to this rarely arrives with an app in mind.
- **2026-10-13** — Assumed: The box keeps its *Make it yours* title and button label, because the request names the prompt, and the title is what other pages and checks point at.
- **2026-10-13** — Assumed: This reverses the 2026-10-11 choice that the message "is just for changing the UI", because the newer request is explicit; reading past chats stays with setup.
- **2026-10-13** — Archived checkpoint: replaced the first message and its supporting line, updated the three wiki pages, the sync manifest line and the kept check; local checks passed, ready for the publishing checks.
- **2026-10-13** — Archived checkpoint: the preview showed the new message at computer and phone width; kept the home-page check again with the new message. The two landing-page kept checks were not run, because the replay opens them on the app preview.
