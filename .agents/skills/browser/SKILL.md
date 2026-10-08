---
name: browser
description: The person's own browser, for errands.
hidden: true
disable-model-invocation: true
---

# browser

`scripts/browse.mjs` installs, starts, and drives camofox, the browser the agent uses websites in as the person. [Browsing](../../../wiki/development/browsing.md) owns when and how to run it:

- `open`, `snapshot`, `click`, `type`, `press`, `select`, `get`, and `screenshot` work one page.
- `logins`, `login`, and `forget` use saved logins, never showing a password.
- `save` and `close` keep the logins; `status`, `install`, and `stop` manage the browser.

Preview checks stay on [agent-browser](../agent-browser/SKILL.md).
