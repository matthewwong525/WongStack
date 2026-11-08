# The browser window

The agent's browser has one window, with a tab for each chat. This page says where that window shows, how your turn happens in it, how you ask for it, and the two settings each computer keeps. It is part of [browsing](browsing.md).

## A tab for each chat

Each chat, and each scheduled run, gets its own tab in the one window, with the same sign-ins. The chats work at the same time, and none waits for another.

- **A new chat opens a tab, not a window.** A blank first tab stays at the left: the browser opens each chat's tab from it, so leave it open. If you close it, the next chat opens one new window, once.
- **Your turn keeps its tab in front.** While it is your turn in one tab, the other chats keep reading and typing in their own tabs behind it, and never show theirs. A click shows its tab, so a chat's click waits up to 20 seconds for your turn to end, then says *the person is using the browser*. A second chat's turn waits for yours too: its `open --view` stops with that reason.
- **A tab closes when its chat is done**, or after 5 minutes unused.

[`browser-server.mjs`](../../.agents/skills/browser/scripts/browser-server.mjs) owns the tabs.

## Where it shows

| Computer | The browser shows |
|---|---|
| A Mac | In a window on your screen |
| A Windows computer | In a window on your screen |
| A Linux computer with a screen | In a window on your screen |
| A Linux computer with the link setting on | On a virtual screen; your turn comes as a [live-view link](live-view.md) |
| A Linux server with no screen | On a virtual screen; your turn comes as a live-view link |

- **The window stays shown.** It never hides by itself. You can minimize it or move it like any window.
- **On a Mac, the window may be behind the app you are in.** Then click *Camoufox* in the Dock.
- **Turn the window off** on a computer you don't sit at: say *don't show the browser window*. The agent runs `browse.mjs window off`, which prints `BROWSE_WINDOW=off`. `window on` turns it back on, and `window` alone prints the setting.
- **On Linux, `window off` is the link setting.** The browser then hides on its virtual screen, and your turn comes as a link. On a Mac or Windows computer, `window off` means no window and no link: a step that needs you ends with [steps to finish in your own browser](finish-steps.md).
- **A Linux computer has a screen when the browser's start sees one** (`DISPLAY` or `WAYLAND_DISPLAY`). A browser started from a service with neither uses the link. `browse.mjs status` prints which one the running browser took: `BROWSE_SHOWN=window`, `link`, or `none`.
- **A setting takes effect the next time the browser starts.** The agent never restarts a running browser for it: other chats may use it.

## Your turn in the window

Where the browser shows in a window, your turn for [a sign-in, a payment, a robot check, or a stuck step](live-view.md#when-it-opens) happens there, with no link:

- **`open --view` takes the same line** as a live view. It brings your chat's tab to the front, and prints `HANDOVER_VIEW=window` and no `HANDOVER_LINK`.
- **The chat says the line, with *say done*:** *Sign in to Netflix in the browser window, then say done.* On a Mac it adds: *If it's behind, click Camoufox in the Dock.* A payment still asks [the pay question](live-view.md#pay-or-type-a-code) first.
- **It ends only on your *done*, never because the page changed.** On *done*, the agent runs `hand-over.mjs close`, which ends the turn as `handed-back`. Then it reads the page afresh. While the turn is open, it sends that tab nothing.
- **With the window off on a Mac or Windows computer**, `open --view` prints `HANDOVER_VIEW=unsupported`, and the step ends with steps for you.

## Ask for the browser

Say *send me the browser* or *show me the browser* at any time to see and use your chat's tab. On every computer, the agent runs the same command:

```bash
node .claude/skills/hand-over/scripts/hand-over.mjs open --view --note "Here is the browser. Tap Hand back when you're done."
```

It stays open through every page, as every turn does, for up to 8 hours. It holds your chat's tab as your turn, so no other chat's click takes the window away from you.

- **With a window,** it brings your chat's tab to the front and prints `HANDOVER_VIEW=window`, with no link. The agent tells you the tab is in front, and to say *done* when you are through. On *done*, it runs `hand-over.mjs close`.
- **With the link,** the agent sends a live view of your chat's tab. It ends when you tap *Hand back*.

The agent never runs `browse.mjs front` or `show` for this: neither holds a turn, so another chat's click could switch the window to its own tab.

To show you a page when its task is done, with no turn, the agent runs `browse.mjs show`, which brings your chat's tab to the front. It prints `BROWSE_SHOWN=window`, `link`, or `none`; with `link` or `none` there is no window to show, so the agent sends a picture or the view above. While your turn is open in another chat's tab, `open` stops with *the person is using the browser in another chat's tab*. The agent still sends a link by itself for a sign-in, a payment or a backup code, a robot check, or a stuck step.

## Settings stay on this computer

The window or link setting and [the proxy setting](browsing.md#the-proxy-setting) are in `~/.wong-stack/browser-settings.json`, which only you can read. No repo file holds them, so each computer keeps its own, and a teammate who pulls your repo gets none of yours. Each setting applies to every repo on the computer.

```text
{ "window": true, "proxy": false }
```

`browse.mjs status` prints `BROWSE_WINDOW=` and `BROWSE_PROXY=`, and says when the running browser started with other settings.

Back to [browsing](browsing.md).
