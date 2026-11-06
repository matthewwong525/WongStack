---
name: hand-over
description: Private links: keys, the live view, reply links.
hidden: true
disable-model-invocation: true
---

# hand-over

`scripts/hand-over.mjs` opens a private link that closes itself. The guides own each mode:

- **A key** into `.env`: [secrets](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link).
- **A live view** for the person's turn (a sign-in, a card, a backup code, a robot check, or a stuck step): [live view](../../../wiki/development/live-view.md).
- **Saved everyday answers**: [saved details](../../../wiki/development/saved-details.md). `scripts/details.mjs` lists, saves, and forgets them; never read `~/.wong-stack/details.json`.

`scripts/reply-link.mjs` opens [a reply link](../../../wiki/development/reply-links.md): its one send reaches the chat, never a secret.
