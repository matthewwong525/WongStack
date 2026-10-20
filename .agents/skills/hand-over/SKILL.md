---
name: hand-over
description: Private links: forms, keys, passwords.
hidden: true
disable-model-invocation: true
---

# hand-over

`scripts/hand-over.mjs` opens a private link that closes itself. The guides own each mode:

- **A private form** for a card or backup code, and saved everyday answers: [the private form](../../../wiki/development/private-form.md). `scripts/details.mjs` lists, saves, and forgets them; never read `~/.wong-stack/details.json`.
- **Passwords** for the agent: [passwords](../../../wiki/development/passwords.md).
- **A key** into `.env`: [secrets](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link).
- **A live view** for a robot check or a stuck login: [live view](../../../wiki/development/live-view.md).

`scripts/reply-link.mjs` opens [a reply link](../../../wiki/development/reply-links.md): its one send reaches the chat, never a secret.
