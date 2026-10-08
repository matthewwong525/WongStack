# Start the build from the plan page

**Status:** ready-to-ship

**Branch:** build-from-plan-page

**Open questions:** none

## Why

The plan page can now send your notes to the chat, but the last step still happens in the chat: you go back and pick *Build it now* or *Build and publish*. When the plan is right as it stands, that is one more trip between two screens for a one-tap answer.

## What Changes

- **The plan page gets two buttons: *Build it* and *Build and publish*.** They sit at the foot of a plan opened through its live link. A tap tells the chat that made the plan to start, as if you had picked that choice there. Notes still never start a build; only these buttons do.
  ```text
    BEFORE                  AFTER
  read plan               read plan
     │                       │
  back to chat            +tap Build it
     │                       │
  pick Build it now          │
     ▼                       ▼
  chat builds             chat builds
  ```
- **The foot of the page, on a phone.** *Build it* builds and shows you the result before anything goes live. *Build and publish* asks once more on the page first, because publishing can't be undone.
  ```text
  ┌────────────────────────────┐
  │ Ready?                     │
  │ +[Build it]                │
  │ +[Build and publish]       │
  └────────────────────────────┘
    after tapping Build and publish:
  ┌────────────────────────────┐
  │ Build and publish?         │
  │ This goes live and can't   │
  │ be undone.                 │
  │ [Yes, publish]  [Cancel]   │
  └────────────────────────────┘
    after a yes:
  ┌────────────────────────────┐
  │ Asked the chat to build    │
  │ and publish.               │
  └────────────────────────────┘
  ```
- **The page stops a tap that could build the wrong thing.** With notes you have not sent, it says to send or delete them first. If the plan changed after you opened the page, it says to reload and read it. Each button works once per version of the plan, so a double tap does nothing.
  ```text
  tap ─▶ unsent notes? ─▶ plan changed? ─▶ chat
              │ yes            │ yes
              ▼                ▼
        "send them first"  "reload first"
  ```
- **No live link, no buttons.** A plan opened as a file, or through a closed link, shows no build buttons; you choose in the chat as today.
- **Whoever holds the link can now start a build and a publish.** Until now the link could only add notes. It is still printed only in your chat, carries its own secret, and closes after 8 hours.
- **Other pages can offer buttons the same way.** A page's maker names each button and the exact message it sends when it opens the link; the page itself can never change that message. A mail review page can use this for *Send all*.

Non-goals: no build progress on the page, no buttons on a file page, and no change to what notes do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reply-links`: a page can offer named actions whose messages are fixed when the link opens, refused when the page's file has changed since it was read, and accepted once per version.
- `ux-wireframes`: a plan opened through a reply link offers *Build it* and *Build and publish*; publish confirms on the page; unsent notes or a changed plan stop the tap.

## Impact

- `.agents/skills/hand-over/scripts/reply-link.mjs`: `--action name=message` on `open`, a keyed `POST /p/<id>/act`, and `actions` plus `version` in the `alive` answer.
- `.agents/skills/plan/scripts/build-review.mjs` (registers the two actions with `--link`) and `references/review-kit.html` (the foot section, live only).
- `wiki/development/reply-links.md` and `wiki/ux-principles.md`; no skill text is expected to change.
- Tests: `reply-link.test.mjs`, `review.test.mjs`, `review-browser.test.mjs`.
- Payload release: `CHANGELOG.md` entry, **minor**.

## Decision log

- **2026-10-08** — Matthew asked that the plan page 'should also be able to select build, and build & publish as well'; this reverses the earlier non-goal of building from the page, for these two buttons only.
- **2026-10-08** — Assumed: *Build and publish* confirms once on the page, because publishing can't be undone and a phone tap is easy to make by mistake.
- **2026-10-08** — Assumed: unsent notes block a build tap, because the chat would otherwise build a plan the notes were about to change.
- **2026-10-08** — Assumed: a tap is refused when the plan changed since the page loaded, because a tab left open would build a plan nobody has read.
- **2026-10-08** — Assumed: the page sends only a button's name and the link's maker fixes its message, because anyone holding the link could otherwise put any instruction into the chat.
- **2026-10-08** — Assumed: the buttons sit at the foot of the page, not in the notes bar, because the bar is one line on a phone and the choice comes after reading.
- **2026-10-08** — Assumed: one tap per plan version, because a sent message interrupts the chat and a second one would interrupt the build it started.
- **2026-10-08** — Build choices the design left open: the closed-link line shows as a toast and hides the section; a closed link found by a notes send hides the buttons too; an action on a page whose file is gone answers 410; *Yes, publish* is primary and focus lands on *Cancel*.
- **2026-10-08** — Found on the first walk: the one shared server was still running the earlier release's code, so the page showed no buttons. Added: an opener from newer code swaps the running server on the same port and keeps its tunnel, so every open link keeps its address. An older opener never swaps a newer server.
- **2026-10-08** — Walked from this host with a phone-sized browser on a throwaway plan: the buttons showed; an old tab after a rebuild said *The plan changed. Reload to read it first.* and sent nothing; *Build and publish* asked first; *Build it* reached the chat once with its fixed message; a second tap said *The chat was already asked.* Not tried on a real phone.
- **2026-10-08** — Archive checkpoint: release 38.0.0 landed during the build and touched the same files; resolved by taking it and re-applying this change on top. Every task ticked, local checks pass.
- **2026-10-08** — Renumbered 38.2.0 after release 38.1.0 took the number; it merged in with no conflict. A check on the main line had failed on an unrelated memory test that races two writers; its rerun passed.
