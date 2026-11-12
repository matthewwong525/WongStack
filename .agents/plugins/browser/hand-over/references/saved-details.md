# Saved details

Saved details are everyday answers you gave in the chat and chose to keep, such as an email, a name, an address, or a phone, so the agent fills a later form with them after one yes. They are part of [browsing](../../browser/references/browsing.md), in [the browser module](../../browser/README.md).

A card is never saved: you type it in [a live view](live-view.md#pay-or-type-a-code) every time, and nothing you type in a live view is saved. The details sit in one plain file on the agent's computer, `~/.wong-stack/details.json`, never in your repo. Only your own user can read it. The agent reads and changes it only through [`details.mjs`](../scripts/details.mjs).

## Keep a set

After typing the answers you gave for a form, the agent asks once, showing them: *Keep these for next time? me@x.com, 1 Main St.* `Keep them / Not now`. On yes:

```bash
node .claude/skills/hand-over/scripts/details.mjs save --name home --field email=me@x.com --field street-address="1 Main St"
```

`--field` takes an autofill kind. A card, a password, or a code never saves: `save` refuses it. Saving a set like one already saved replaces it, never adds a copy.

## Use a saved set

1. **Find one.** The agent runs `details.mjs list`: each set's name, hint, kinds, and values.
2. **Ask first**, showing the answers: *Use me@x.com and 1 Main St?* `Use them / Use others / Not now`. *Use others* asks in the chat.
3. **Type them.** On yes, the agent types each value into the site's box with [`browse.mjs`](../../browser/scripts/browse.mjs), as it types any answer from the chat. A card on the same page still goes through [a live view](live-view.md#pay-or-type-a-code).

## Forget one

Say *forget my address* and the agent runs `details.mjs forget home`, or `forget --all` for everything, then confirms by name. Say *what have you saved?* and it names each set from `details.mjs list`. The next form after forgetting asks in the chat.

Back to [browsing](../../browser/references/browsing.md).
