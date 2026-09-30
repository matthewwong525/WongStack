---
name: browser
description: Cloud browser for blocked sites.
hidden: true
disable-model-invocation: true
---

# browser

`scripts/cloud-browser.mjs` drives Cloudflare's cloud browser with the same `agent-browser` commands, so a site that blocks the agent's own browser still loads. [Browsing](../../../wiki/development/browsing.md#when-a-site-blocks-the-agents-browser) owns when and how to run it:

- `open` and `close` start and end a cloud session.
- `check` says whether a page is a bot check or a block.
- `carry-in` and `carry-back` move one site's login between the browsers.
- `first` reads or sets which browser a task tries first.

The [agent-browser](../agent-browser/SKILL.md) pointer stays as its maker ships it.
