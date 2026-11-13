# A bell on each tab that waits on you, and one Hand back in the browser

**Status:** ready-to-ship
**Branch:** afraid-liger
**Open questions:** none

## Why

When several chats work in the agent's browser at once, every tab shows only the site's own name. In the live view and in the window on your Mac, you can't tell which tab needs you. On the Mac, only one chat can wait on you at a time, and you say *done* in each chat. In the live view, *Hand back* tells only one chat at a time.

## What Changes

- **A tab that waits on you shows a bell before the site's name.** You see it in the browser's own tab row, in the live view and in the window on your Mac. The bell stays while the site changes pages. Tabs that don't need you stay as they are.
  ```screen
  <div class="card col gap">
    <div class="row gap"><span class="tag-outline">Shopify Admin</span><span class="tag">🔔 Netflix</span><span class="tag-outline">Gmail</span><span class="tag">🔔 City of Markham</span><span class="grow"></span><button class="btn-primary">✋ Hand back 2</button></div>
    <div class="bar">The site in the tab you picked</div>
    <div class="muted">🔔 Netflix: Sign in to Netflix.</div>
    <div class="muted">🔔 City of Markham: Type your card and press Pay $45.00.</div>
    <div class="row gap"><div class="field grow">Tap a box…</div></div>
  </div>
  ```
  No real picture: the button and the bell need the new browser add-on, which isn't built yet.
- **One Hand back button sits in the browser's toolbar, beside the address bar.** It shows how many tabs wait on you. Click it once when you're through: every bell goes away, and every chat with a bell is told and goes on. Each chat reads its page again and asks you if its step isn't finished. Sites can't see the button.
- **Several chats can wait on you at once, on the Mac too.** Each one puts a bell on its tab. You click the bell tabs in any order. A new bell never takes the screen from you.
- **The live view gets simpler.** The row of chat names above the browser goes: the bells are the label. The bar under the browser keeps the type box and lists what each bell tab needs. Its own Hand back goes: the toolbar button replaces it. The watch link for connecting your tools keeps its own buttons.
- **The chat says where to go:** *Sign in to Netflix on the 🔔 tab, then click Hand back at the top of the browser.* You don't need to say *done*. Saying it in a chat still ends that chat's turn alone.

**Non-goals:** a bell on the chat's own name; a sound or a pop-up message; the watch link.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the window turn gains the bell, several turns at once, and the toolbar Hand back; the live view's tab row and one-chat Hand back give way to bells and one Hand back that ends every waiting turn.
- `private-links`: a turn ends on the toolbar Hand back, which ends every waiting turn, or on *done* in its chat.

## Impact

- New: a small WongStack add-on in `.agents/plugins/browser/addon/` (a toolbar button with a count), loaded at every browser start and pinned to the toolbar.
- `.agents/plugins/browser/scripts/browser-server.mjs`: turns become a set; shared turns, the title bell, the Hand back route for the add-on, and its narrow key.
- `.agents/plugins/browser/scripts/browse.mjs`, `addons.mjs`, `launch-config.py`: load and pin the WongStack add-on; `front` forwards the shared flag.
- `.agents/plugins/browser/skills/hand-over/scripts/hand-over.mjs`, `view.mjs`, `view-page.mjs`, `view-page.html`: shared turns in both modes; no tab row; the bar lists each waiting chat's line; no bar Hand back on a turn view; Hand back from the browser ends every turn and tells each chat.
- Docs: `live-view.md`, `browser-window.md`, `browsing.md`, `hand-over/SKILL.md`.
- Tests: `browser-server.test.mjs`, `browse.test.mjs`, `addons.test.mjs`, `hand-over.test.mjs`, `view.test.mjs`, `view-page.test.mjs`, `private-links.test.mjs`; the manual `browser-tabs-real.mjs`.
- `CHANGELOG.md`: a `minor` entry; the browser module's `VERSION` rises. The add-on loads at the browser's next start.
- Overlap: the 1Password workspace (decent-eel) edits `browser-server.mjs`, `browse.mjs`, `addons.mjs`, and the browser module's `VERSION`. Merge whichever ships second.

## Decision log

- **2026-11-13** — Asked where the label shows → chose the browser's own tabs, first in the window on the Mac; after the live view was explained, chose the live view and the Mac window both.
- **2026-11-13** — Asked what the label says → chose just a bell, then the site's normal name.
- **2026-11-13** — Asked whether several chats can wait at once in the window → chose to let several wait, each tab with its bell.
- **2026-11-13** — Asked, on the first draft, about saying *done* → chose no *done*: one Hand back, and every chat with a bell is told.
- **2026-11-13** — Asked where Hand back sits → chose a Hand back button in the browser itself, which replaces the one in the live view's bar.
- **2026-11-13** — Asked what happens to the live view's row of chat names → chose to remove it; the bells are the label.
- **2026-11-13** — Assumed: the button is in the browser's toolbar, from a small add-on of WongStack's own, because sites can't see or cover it there, and the browser loads add-ons already.
- **2026-11-13** — Assumed: the button shows how many tabs wait, and does nothing with none, so you can see when every chat has its answer.
- **2026-11-13** — Assumed: a new bell tab doesn't come to the front while another bell is up, because you may be typing a password or a card there.
- **2026-11-13** — Assumed: *done* in a chat still ends that chat's turn alone, because a chat may be the closer place to say it.
- **2026-11-13** — Assumed: the watch link keeps its own Take over and Hand back, because the agent drives it and its Hand back means something else.
- **2026-11-13** — Assumed: a chat's mouse-only click still waits until no bell is up, because it would bring its tab over yours.
- **2026-11-13** — Assumed: the bell goes in the page's title, because the browser lets the agent change nothing else on a tab; a site that reads its title sees it, which does no harm.
- **2026-11-13** — Assumed: plan here despite the 1Password workspace, because its goal differs; only files overlap.
- **2026-11-13** — Assumed: the add-on's copy and its `config.json` sit in `~/.wong-stack/browser/hand-back`, made again at each start, because the key changes each start and the repo must hold no key.
- **2026-11-13** — Assumed: the button shows the bell icon alone, with *Hand back* as its tooltip and a count badge, because the browser's toolbar shows add-on buttons as icons.
- **2026-11-13** — Assumed: no `GET /turns?tabId=`; each turn's renewal alone carries `handedBack`, because every watcher already renews each few seconds.
- **2026-11-13** — Assumed: only a renewal hears a Hand back; a new turn's first hold on the same tab starts afresh, so a late mark never ends a new turn.
- **2026-11-13** — Assumed: a fitted page behind keeps its size until the last turn ends, because a resize of a page behind would bring it to the front.
- **2026-11-13** — Assumed: a chat link's `#chat` brings its tab to the front through the fit's resize, once, on first load.
- **2026-11-13** — Assumed: the live view's bar lists each turn's note with its bell, not the site's title, because the note says what to do.
- **2026-11-13** — Assumed: live-view lines say *tap Hand back at the top of the browser*, not *click*, because the view's pages say *tap* and many people open it on a phone; the window's lines say *click*.
- **2026-11-13** — Assumed: the browser module's version goes to 3.2.0, not 3.1.0, because the main line already holds 3.1.0.
- **2026-11-13** — Assumed: archive checkpoint: built, reviewed (one fix: the last turn ends before pages behind get their size back), two-chat live view passed in a throwaway browser with one toolbar Hand back; merged with 61.1.0 (1Password) and 61.2.0, browser module 3.2.0.
