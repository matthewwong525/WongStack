---
name: hand-over
description: Private links: keys, the live view, saved details.
hidden: true
disable-model-invocation: true
---

# hand-over

`node .claude/skills/browser/skills/hand-over/scripts/hand-over.mjs` opens a private link that closes itself. The guides own each mode:

- **A key** into `.env`: [key link](references/key-link.md).
- **A live view** for the person's turn (a sign-in, a card, a backup code, a robot check, or a stuck step), on a 🔔 tab until the browser's *Hand back*, the green check at the top right: [live view](references/live-view.md).
- **Saved everyday answers**: [saved details](references/saved-details.md). `node .claude/skills/browser/skills/hand-over/scripts/details.mjs` lists, saves, and forgets them; never read `~/.wong-stack/details.json`.
