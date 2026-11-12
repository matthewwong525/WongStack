# Receive a key through a private link

The key link takes a key from the person straight to the project's ignored key file, through a private page that closes itself: the key never passes through the chat. It is part of the [hand-over skill](../SKILL.md).

When a task lacks a key, or the person asks for *the key link*, send a private link in the same reply, with no *Ready?* question: it waits 24 hours by default. Chats are stored; the link takes the key straight to the ignored file.

1. **Declare it first.** The project's profile names the key files ([the `keyFiles` slot](../../browser/README.md#slots)); with none, every key goes to the top `.env`, which must be git-ignored. In WongStack, the name must be declared, blank, in exactly one example file: `.env.example` for a tool credential, `app/.dev.vars.example` for a Worker secret. A commented-out `# NAME=` is not a declaration. A key with no guide shows a readable name made from it, such as *Maps API key*, and the first sentence of the comment above it as its hint, so say where to get the key there.
2. **Write the guide** to a file outside the repo, from the service's public help pages, read as plain pages. WongStack stores no guide.

   ```json
   { "STRIPE_SECRET_KEY": {
       "title": "Stripe key",
       "why": "So your assistant can read your charges.",
       "url": "https://dashboard.stripe.com/apikeys",
       "open": "Open Stripe's keys",
       "steps": ["Tap Create restricted key", "Tick Read charges", "Copy the key"],
       "check": { "url": "https://api.stripe.com/v1/balance", "auth": "bearer" } } }
   ```

   Every field is optional; [`keys.mjs`](../scripts/keys.mjs) owns their limits. `title` heads the page, and `why` is one plain sentence of what you will do with the key, never more than it allows. `url` and `steps` come from [the token-website steps](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/secrets.md#api-token-website-steps). `check` is a harmless `GET` only a working key answers, sent once on save with `auth` one of `bearer`, `basic`, `header:<Name>`, or `query:<name>`: a 401 or 403 holds the key back until *Save anyway*. Leave it out for a pair, like an id and a secret.
3. **Open it**, run `wait` in the background, and then [end your turn with the `HANDOVER_LINK` it prints](../../browser/references/browsing.md#how-private-links-work):

   ```bash
   node .claude/skills/hand-over/scripts/hand-over.mjs open --keys STRIPE_SECRET_KEY,MAPS_API_KEY --guide "$guide"
   node .claude/skills/hand-over/scripts/hand-over.mjs wait
   # HANDOVER_RESULT=done
   # HANDOVER_SAVED=STRIPE_SECRET_KEY,MAPS_API_KEY
   # HANDOVER_APP_KEYS=STRIPE_SECRET_KEY
   # HANDOVER_OPENED=yes
   ```

   `KEYS_UNDECLARED=` or `KEYS_AMBIGUOUS=` (exit 2) means step 1 isn't done, and `KEYS_GUIDE=` names the guide entry to fix. Exit 1 means a destination isn't git-ignored, so fix [the protection](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/secrets.md#the-two-files) first, or this chat has another link open. `HANDOVER_NEEDS=cloudflared` works as for [every private link](../../browser/references/browsing.md#how-private-links-work).
4. **After it closes**, handle its completion identity once, as [workspace return](../../browser/references/browsing.md#how-private-links-work) says, even when both `wait` and the workspace notification arrive. Both carry names, never values. Name the saved keys, never a value. A non-empty `HANDOVER_APP_KEYS` means the Worker reads those keys: run `npm run secrets:push` so the live app gets them. Previews read only `app/.dev.vars.staging`, so say they need their own test key. On `timeout`, or a `closed` nobody asked for, say what happened before offering a new link. `HANDOVER_OPENED=no`: nobody opened it, so ask whether it loaded. `yes`: ask where they got stuck.

Each chat has one link at a time. In one chat, a key link nobody has opened gives way to a newer one: its `wait` prints `closed` and `HANDOVER_REPLACED_BY=`, this chat's folder. Offer a new link if still needed. An opened one keeps its place.

A key over several lines is stored on one: JSON compacted, other text in double quotes with each line break as `\n`, which dotenv and wrangler read back and a shell's `source` does not. Each save writes the primary worktree's file and, in a linked worktree, its seeded branch copy, like any [add or rotation](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/secrets.md#worktrees-and-branch-copies). Private input ends on completion, cancellation, or after 24 hours by default, and has [every private link's safety](../../browser/references/browsing.md#how-private-links-work). No value reaches a command line, a log, the link's own files, or the chat.

**A key pasted into the chat is still saved**, under the name the person gave, by the same routing. Write a value that isn't plain letters, digits, and `_ - . : / + = @` in single quotes, or in double quotes when it holds a `'`: never escape inside the quotes, because dotenv and wrangler read `\"` back as two characters, and a shell sourcing `.env` expands a bare `~`. In the same reply, say the link is safer next time, never showing the key: *Saved MAPS_API_KEY. Next time I'll send a private link, so the key stays out of the chat.*

Part of [the hand-over skill](../SKILL.md), in [the browser module](../../browser/README.md).
