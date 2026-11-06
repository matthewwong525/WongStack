---
name: browser
description: The person's own browser, for errands.
hidden: true
disable-model-invocation: true
---

# browser

`scripts/browse.mjs` installs, starts, and drives Camoufox, the browser the agent uses websites in as the person. [Browsing](../../../wiki/development/browsing.md) owns when and how to run it:

- `open`, `snapshot`, `click`, `type`, `press`, `select`, `get`, and `screenshot` work one page.
- `window [on|off]` turns the browser's window on a Mac or Windows computer on or off, from the next start: [live view](../../../wiki/development/live-view.md#on-a-mac-or-windows).
- A box in a frame from another site sits at the end of `snapshot`, under the first-line note: use its ref, not a selector.
- `save` and `close` keep the logins; `status`, `install`, and `stop` manage the browser.
- `addon` adds the person's [password manager](../../../wiki/development/password-manager.md). On `BROWSE_ADDON=none` in a chat with the person, ask once which one they use, *None* included, and run `addon asked`; a run with no person never asks and records nothing. Then `addon find <name>`, name the match's maker, website, and daily users, with any `BROWSE_ADDON_WARN`, and `addon add <slug>` on their yes, then tell them its `BROWSE_ADDON_TELL`; *None* runs `addon decline`. Offer it again only when they ask. Run `addon open` only before a sign-in turn. Never click, read, type into, or unlock the password manager yourself.

Preview checks stay on [agent-browser](../agent-browser/SKILL.md).
