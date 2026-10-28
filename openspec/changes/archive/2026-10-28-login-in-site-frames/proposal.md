# Saved logins work in sign-in boxes from another site

**Status:** ready-to-ship
**Branch:** smelly-lynx
**Open questions:** none

## Why

Many sites put their sign-in box in a frame that comes from another of their own sites. The agent reads the page, misses the box at the very end of the page text, can't use the saved login, and opens a live view, which people don't want. A box in a frame also has no check for which site it comes from, and a code page after the password reads as a wrong password. WongOS fixed this on 2026-10-28 and checked it on a real sign-in; every WongStack install browses the same way, so the fix belongs here.

## What Changes

- **The page text says where a sign-in box from another site is.** When part of the page comes from a frame with boxes, the first line says so and names its site. Each frame's own header names its site too. The agent finds the box at once, not after the footer.
  ```text
  BROWSE_URL=https://shop.example.com/…
  - note: boxes in frames are at the end:
    auth-widget (login.example.com)
  - navigation "Main": …
  - main:
    - iframe
  …
  - iframe "auth-widget"
    (login.example.com):
    - textbox "Email" [e70]
    - button "Continue" [e72]
  ```
- **A saved login types into a box in a frame, but only on its own site.** Before it types, the login checks the site of the frame that holds each box, not only the page's address. A frame from another site, or one whose site can't be read, gets nothing, and the login says `wrong-site`.
  ```mermaid
  flowchart TD
    box["box in a frame"] --> site{"frame's site\nmatches the login?"}
    site -->|yes| type["type the login"]
    site -->|"no or unknown"| stop["wrong-site,\nnothing typed"]
  ```
- **A password typed into a frame stays hidden.** The login keeps a scrambled record of what it typed, so the box reads `[hidden]` even when the site shows the password as plain text.
  | Box in a frame | Today | After |
  |-|-|-|
  | Named *Password* | `[hidden]` | `[hidden]` |
  | Shown as text by the site | the password | `[hidden]` |
- **Enter goes to the box the login typed into**, so a sign-in in a frame submits without a separate button.
- **A code page after the password is a next step, not a wrong password.** When the page stays but its password box is gone, the login says `next-step`, and the agent asks for the code in the chat.
  ```mermaid
  flowchart TD
    pw["password typed"] --> left{"page moved?"}
    left -->|yes| ok["accepted"]
    left -->|no| box{"password box\nstill there?"}
    box -->|yes| rej["rejected"]
    box -->|no| next["next-step:\nask for the code"]
  ```
- **A command that can't reach a frame says why.** A selector reads only the main page; when it can't, the command says to use the box's ref instead of showing a code error.
- **The browsing guide tries the frame's boxes and the saved login, or the password form, before a live view.** A live view stays for a robot check or a stuck login. The guide's list of steps for you to finish moves to its own page, so the guide stays short.

Non-goals: no change to the browser itself; selectors don't reach into frames; WongOS's own network and language settings and its looser login try stay in WongOS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: frame boxes name their site; a login checks each box's frame site; a typed password stays hidden in any frame; a `next-step` result; a plain selector error.

## Impact

- `.agents/skills/browser/scripts/browse.mjs`: frame note and site headers in `snapshot`, per-frame site check, keyed `typed` record, Enter in the typed box, and `next-step` in `login`, plain selector error, `USAGE`.
- `scripts/tests/browse.test.mjs`: tests for each, run by the Payload checks workflow.
- `.agents/skills/browser/SKILL.md`, `wiki/development/browsing.md`, new `wiki/development/finish-steps.md`, `wiki/development/README.md`, `CHANGELOG.md`.
- Every install gets it on its next update; nothing to do by hand.
- Source: WongOS commit `1dedc6b` (PR 221), archive `2026-10-28-login-in-site-frames`.

## Decision log

- **2026-10-28** — Asked whether to send the WongOS frame-login fix upstream to WongStack by hand → chose yes (in the WongOS chat).
- **2026-10-28** — Asked whether the saved login or the password form comes before a live view on a sign-in → chose saved login or password form first (in the WongOS chat).
- **2026-10-28** — Assumed: port WongOS's design as it shipped, without a new question, because it was built and checked live on a real sign-in the same day.
- **2026-10-28** — Assumed: leave out WongOS's upstream proxy, language setting, `network off`, and `--main-domain`, because they are WongOS's own and WongStack does not have them.
- **2026-10-28** — Assumed: the tests go in `scripts/tests/browse.test.mjs`, the file this repo's checks already run for the browser script, not a new file beside the script.
- **2026-10-28** — Assumed: `VERSION` stays as it is, because `/ship` numbers the release from the changelog entry.
- **2026-10-28** — Assumed: the pull request's title, body and file list are shown to Matthew for a yes before it is pushed or opened, because publishing is outward.
- **2026-10-28** — Second look found that `frameOf` matched any line holding `[eN]`, so page text quoting a ref could make another site's frame box read as the main page. Fixed: it and `boxAtRef` match only a real ref mark. WongOS has the same code.
- **2026-10-28** — Asked whether to open and publish the pull request with the shown title, body and files → chose publish it.
- **2026-10-28** — Archive checkpoint: archived and saved on branch smelly-lynx by /ship.
