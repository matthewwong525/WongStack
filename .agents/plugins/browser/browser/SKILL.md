---
name: browser
description: The person's own browser, for errands.
hidden: true
disable-model-invocation: true
---

# browser

`scripts/browse.mjs` drives Camoufox, the browser the agent uses websites in as the person. [Browsing](references/browsing.md) owns when and how to run it:

- `open`, `snapshot`, `click`, `type`, `press`, `select`, `get`, and `screenshot` work this task's own tab.
- On `BROWSE_CLICK=queued`, run `wait-click` in the background with the host's longest wait; take no other step on that page until it ends.
- `window [on|off]` and `proxy [on|off]` set this computer's browser from its next start: [where it shows](references/browser-window.md#where-it-shows), [the proxy](references/browsing.md#the-proxy-setting). With the proxy off, a refused site's steps first name *turn the browser proxy on*.
- *Send me the browser* or *show me the browser*, on every computer: `hand-over.mjs open --view --note "Here is the browser. Tap Hand back when you're done."`. It holds the chat's tab as the person's turn. With `HANDOVER_VIEW=window`, say the tab is in the browser window (on a Mac, *Camoufox* in the Dock if it is behind), and to say *done*; on *done*, run `close`. Never `front` or `show` for this: neither holds a turn.
- `show` brings this task's tab to the front, with no turn, for a finished page only. On `BROWSE_SHOWN=link` or `none`, send a picture instead: [ask for the browser](references/browser-window.md#ask-for-the-browser).
- A box in another site's frame sits at the end of `snapshot`: use its ref, not a selector.
- `save` and `close` keep the logins; `status`, `install`, and `stop` manage the browser. `status` names [the route](references/browser-proxy.md#check-the-live-route) in `BROWSE_NETWORK=`.
- Never ask about a [password manager](references/password-manager.md). Asked to add any add-on: `addon find <name>`; for a `BROWSE_ADDON_BUILT_IN` match, say it is built into the browser and add nothing; for one already in `addon status`, say so. One clear match, featured or 10,000+ daily users: name its maker, website, and daily users, and `addon add <slug>` at once. Else name the matches' facts, with any `BROWSE_ADDON_WARN`, and add on their yes. Never send them to the add-on site. After an add, tell them its `BROWSE_ADDON_TELL`; for a password manager (its tell is the vault advice), run `addon open`, then send the browser as above, its note saying to sign in to it. Also run `addon open` before a sign-in turn. Never click, read, type into, or unlock any add-on yourself.

Preview checks stay on [agent-browser](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/agent-browser/SKILL.md).
