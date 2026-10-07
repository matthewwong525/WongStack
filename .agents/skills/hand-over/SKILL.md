---
name: hand-over
description: Private links: forms, keys, passwords.
hidden: true
disable-model-invocation: true
---

# hand-over

`scripts/hand-over.mjs` opens a private link that closes itself, in one of three modes. The guides own when and how to run each:

- **A private form** for a card or backup code: [browsing](../../../wiki/development/browsing.md#the-private-form).
- **Save your passwords** to the vault: [browsing](../../../wiki/development/passwords.md).
- **Receive a key** into `.env`: [secrets](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link).

`scripts/reply-link.mjs` opens [a reply link](../../../wiki/development/reply-links.md): a page whose one send reaches the chat, never a secret.
