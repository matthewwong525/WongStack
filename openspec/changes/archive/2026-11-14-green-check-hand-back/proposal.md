# A green check you click when you're done, and a tidier browser toolbar

**Status:** ready-to-ship
**Branch:** clearer-browser-handback-button
**Open questions:** none

## Why

When a chat gives you the browser, it says *tap Hand back at the top of the browser*. The button you must find is a small grey bell, and it sits beside uBlock's red shield and 1Password's key. Nothing says it is the button that means *I'm done*, so it is easy to miss.

## What Changes

- **The Hand back button becomes a green check mark.** It sits at the right end of the toolbar, beside the address bar, and still shows how many tabs wait on you. When nothing waits, it is grey and does nothing. Point at it and it says *Done: give the browser back to the chat*. The bell stays on each tab that waits on you, so the bell means *this tab needs you* and the green check means *I'm done*.
  ```screen
  <div class="card col gap">
    <div class="muted">Before</div>
    <div class="row gap"><span class="tag">🔔 Netflix</span><span class="grow"></span></div>
    <div class="row gap"><div class="field grow">netflix.com/login</div><span class="tag-outline">🧩</span><span class="tag-outline">🛡️ uBlock</span><span class="tag-outline">🔑 1Password</span><span class="tag-outline">🔔 1</span></div>
    <div class="sep"></div>
    <div class="muted">After</div>
    <div class="row gap"><span class="tag">🔔 Netflix</span><span class="grow"></span></div>
    <div class="row gap"><div class="field grow">netflix.com/login</div><span class="tag-outline">🧩</span><span class="tag-outline">🔑 1Password</span><button class="btn-primary">✅ 1</button></div>
  </div>
  ```
  No real picture: the browser's own toolbar is not a page the app can draw.
- **Every message that gives you the browser names the green check, in as few words as possible.** The line in the live view, and the chat's message for the browser window, end the same way:
  ```text
  Before:
  Sign in to Netflix, then tap Hand back
  at the top of the browser.

  After:
  Sign in to Netflix, then tap ✅ at
  the top right.
  ```
  In the window on your own screen, it says *click* in place of *tap*.
- **uBlock leaves the toolbar.** It still blocks ads on every page. Its button moves into the puzzle-piece menu at the right of the toolbar, where you can still open it. This happens once, at the browser's next start. If you pin it back yourself, it stays where you put it. Add-ons you asked for, such as 1Password, stay on the toolbar.

**Non-goals:** a new name for *Hand back* in the guides; a change to the watch link's own buttons; removing uBlock.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the toolbar's Hand back shows as a green check mark, and every line that gives the person the browser tells them to tap or click it when they are done.
- `password-manager-add-on`: an add-on built into the browser, such as uBlock Origin, moves off the toolbar into the add-ons menu once; add-ons the person asked for stay pinned.

## Impact

- `.agents/plugins/browser/addon/`: a new green check icon replaces `bell.svg`; `background.js` gives the button its new hover words; `manifest.json` names the new icon.
- `.agents/plugins/browser/scripts/addons.mjs`: unpins each built-in add-on's button once, with a marker so a person's own pin stays.
- `skills/hand-over/scripts/hand-over.mjs`: the new chat reminder for the window.
- Docs: `live-view.md`, `browser-window.md`, `browsing.md`, `hand-over/SKILL.md`, `password-manager.md`, and `SKILL.md` where they quote the line.
- Tests: `addons.test.mjs`, `connect-browser.test.mjs`, `hand-over.test.mjs`.
- `CHANGELOG.md`: a `minor` entry; the browser module's `VERSION` rises. The new button and the tidier toolbar show at the browser's next start.

## Decision log

- **2026-11-14** — Assumed: the button's icon is a green check mark in a green circle, with the count badge kept, because the person asked for a green check and the count shows when every chat has its answer.
- **2026-11-14** — Assumed: the tab's bell stays, because it marks which tab needs you; only the toolbar button changes, so the bell no longer means two things.
- **2026-11-14** — Asked, on the first draft, to make the line as short as possible → chose *<what to do>, then tap ✅ at the top right.*: the ✅ is green itself, and *top right* is enough to find it.
- **2026-11-14** — Assumed: guides keep the name *Hand back* for the button and say once that it is the green check, because the name is in many pages and specs and a rename adds no clarity for the person.
- **2026-11-14** — Assumed: uBlock moves to the puzzle-piece menu, not out of the browser, because the request was to stop it cluttering the toolbar, and it still blocks ads.
- **2026-11-14** — Assumed: the move applies to every add-on built into the browser, which today is only uBlock, and happens once per browser, so a button the person pins back stays.
- **2026-11-14** — Assumed, at build: the watch link's sign-in line keeps *Sign in to Notion, then tap Hand back.*, because only the watch page's own *Hand back* ends that turn; the toolbar's check stays grey there and never ends a watch link.
- **2026-11-14** — Assumed: the person said *Chrome*, but the agent's browser is Camoufox, a Firefox build; the change is to that browser's toolbar.
- **2026-11-14** — Archive checkpoint: built and archived inside /ship. The live check restarted the agent's browser from this build: uBlock moved into the puzzle-piece menu, and the toolbar ends with 1Password, then the green check, faded while nothing waits.
