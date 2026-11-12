---
name: hand-over
description: Private links: keys, the live view, saved details.
hidden: true
disable-model-invocation: true
---

# hand-over

`scripts/hand-over.mjs` opens a private link that closes itself. The guides own each mode:

- **A key** into `.env`: [key link](references/key-link.md).
- **A live view** for the person's turn (a sign-in, a card, a backup code, a robot check, or a stuck step): [live view](references/live-view.md).
- **Saved everyday answers**: [saved details](references/saved-details.md). `scripts/details.mjs` lists, saves, and forgets them; never read `~/.wong-stack/details.json`.
