---
name: browser
description: The person's own browser, for errands.
hidden: true
disable-model-invocation: true
---

# browser

`scripts/browse.mjs` installs, starts, and drives Camoufox, the browser the agent uses websites in as the person. [Browsing](../../../wiki/development/browsing.md) owns when and how to run it:

- `open`, `snapshot`, `click`, `type`, `press`, `select`, `get`, and `screenshot` work this task's own tab.
- `window [on|off]` and `proxy [on|off]` set this computer's browser from its next start: [where it shows](../../../wiki/development/browser-window.md#where-it-shows), [the proxy](../../../wiki/development/browsing.md#the-proxy-setting). With the proxy off, a refused site's steps first name *turn the browser proxy on*.
- *Send me the browser* or *show me the browser*, on every computer: `hand-over.mjs open --view --keep-open --note "Here is the browser. Tap Hand back when you're done."`. It holds the chat's tab as the person's turn. With `HANDOVER_VIEW=window`, say the tab is in the browser window (on a Mac, *Camoufox* in the Dock if it is behind), and to say *done*; on *done*, run `close`. Never `front` or `show` for this: neither holds a turn, so another chat's click can take the window away.
- `show` brings this task's tab to the front, with no turn, for a finished page only. On `BROWSE_SHOWN=link` or `none`, send a picture instead: [ask for the browser](../../../wiki/development/browser-window.md#ask-for-the-browser).
- A box in a frame from another site sits at the end of `snapshot`, under the first-line note: use its ref, not a selector.
- `save` and `close` keep the logins; `status`, `install`, and `stop` manage the browser.
- Never ask about a [password manager](../../../wiki/development/password-manager.md). Asked to add any add-on: `addon find <name>`, name the match's maker, website, and daily users, with any `BROWSE_ADDON_WARN`, `addon add <slug>` on their yes, then tell them its `BROWSE_ADDON_TELL`. Run `addon open` only before a sign-in turn. Never click, read, type into, or unlock any add-on yourself.

Preview checks stay on [agent-browser](../agent-browser/SKILL.md).
