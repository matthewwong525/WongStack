# The browser comes back only when you tap Hand back

**Status:** archived
**Branch:** browser-handback-on-click
**Open questions:** none

## Why

When the agent gives you its browser, it takes the browser back by itself as soon as the page looks finished: the signed-in page, the receipt, or the next step. You lose the browser in the middle of what you were doing, such as a second step, a setting to check, or a mistake to fix. You want to say when you are done.

## What Changes

- **Your turn ends only when you tap *Hand back*.** The agent no longer watches the page for a finish. The view stays open through every page until you tap *Hand back*, you say *done* in the chat, or the time limit passes. This applies to every live view: a sign-in, a payment, a backup code, a robot check, a stuck step, and a view you ask for.
  ```mermaid
  sequenceDiagram
    participant You
    participant View as Live view
    participant Agent
    Agent->>View: Opens your turn
    You->>View: Sign in
    Note over View: Signed-in page shows, the view stays open
    You->>View: Check a setting
    You->>View: Tap Hand back
    View->>Agent: Your turn ended
    Agent->>Agent: Reads the page again, carries on
  ```
- **The same in the browser window on your own computer.** Your turn there ends when you say *done* in the chat, not when the page changes.
- **The same when you connect your tools.** The sign-in turn on the watch link ends when you tap *Hand back*, or say *done* for the window. Its line changes from *I go on once you're in* to *then tap Hand back*.
- **After a payment, you tap *Hand back* too.** The page no longer says *Done. Go back to the chat.* at the receipt. The agent still checks the payment from the page after you hand back.
- **Nothing else changes.** The time limit, *say done*, the one-line help, and the agent's check of the page after your turn stay as they are. A key link (the page where you paste a key) still closes when you save.

**Non-goals:** a hint on the page when it looks finished; a change to the key link or a reply link.

## What the build needs

- **Nothing from you.** The build tests the view with the existing tests and a throwaway browser on this computer.

## Capabilities

### New Capabilities

### Modified Capabilities

- `browser-logins`: a live view and a window turn end on *Hand back*, *done*, a close, or the time limit, never on a finish.
- `private-links`: every live view stays open until the person ends it; the finish requirement goes.
- `own-browser-connect`: the connect sign-in turn ends on *Hand back* or *done*, not when the site lets the person in.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: `open --view` and `turn` take no finish; `--until`, `--until-gone`, `--until-text`, and `--keep-open` go; `wait` no longer gives `done` for a view or `signed-in` for a watch.
- `.agents/skills/hand-over/scripts/view-page.*`: no *Done* page for a met finish.
- `.agents/skills/connect/scripts/browser.mjs`: the sign-in turn opens without a finish and waits for `handed-back`.
- `.agents/skills/browser/SKILL.md`, `wiki/development/live-view.md`, `browser-window.md`, `watch-link.md`, `browsing.md`, and other pages that name a finish.
- `scripts/retired-names.json`: the removed flags.
- `scripts/tests/hand-over.test.mjs`, `connect-browser.test.mjs`, `private-links.test.mjs`, and other tests that pass a finish.
- `CHANGELOG.md`: a `## Next` entry.

## Decision log

- **2026-11-08** — Asked (in the request) that the browser not hand back by itself → chose that the person controls the hand-back with the *Hand back* button, and `/ship` it.
- **2026-11-08** — Assumed: every turn the agent gives the person changes, including the window turn and the connect sign-in turn, because the request names the browser's hand-back in general, and a finish in one place but not another would surprise the person.
- **2026-11-08** — Assumed: the finish flags are removed, not kept and ignored, because a flag that does nothing misleads the next agent; an old flag fails with a usage error (exit 2). `retired-names.json` lists them.
- **2026-11-08** — Assumed: no hint on the page when it looks finished, because the request asks only for control, and the line already says to tap *Hand back*.
- **2026-11-08** — Assumed: a key link still closes when the person saves, because it is a form, not the browser, and the request is about the browser.
- **2026-11-08** — Assumed: `browse.mjs` loses its page-read helpers (`shownCount`, `hasWords`, and their page-side code), because only the finish used them, and dead code misleads the next agent.
- **2026-11-08** — Assumed: in a browser window, the connect sign-in turn ends with `hand-over.mjs close` once the person says done, which closes the watch; the next sign-in opens a new one.
- **2026-11-08** — Assumed: archive checkpoint at /ship, with every task built and the three spec deltas reconciled into the main specs at archive; a real sign-in in a live view that stays open past the signed-in page is not yet tried.
