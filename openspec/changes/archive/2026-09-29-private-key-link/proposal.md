# Give API keys through a private link

**Status:** ready-to-ship
**Branch:** private-api-key-link
**Open questions:** none

## Why

Today you give the assistant an API key by pasting it into the chat. Chats are stored, so the key sits in the chat's history until the assistant saves it and the memory store hides it. A private link lets you hand over a key without it ever passing through the chat.

## What Changes

- **A private link for keys.** When a task needs a key the assistant doesn't have, it asks first: *I'll send a private link for your Stripe key.* `Ready, send the link / Not now`. You can also ask for one: *send me the key link*. The link works like the password link: a new private address each time, closing when you tap *Done* or after 10 minutes.
  ```text
  task needs STRIPE_SECRET_KEY
           │
     already saved? ──yes──▶ use it
           │ no
           ▼
  "Ready, send the link / Not now"
           │ ready
           ▼
  private link ──▶ you paste the key
           │
           ▼
  saved to the private file
  (and your live site, if it uses it)
           │
           ▼
  chat: "Saved STRIPE_SECRET_KEY."
  ```
- **One box per key.** The page lists the keys the assistant asked for, each with its name and a line on where to get it. You paste each one and tap *Save*. A key that already has a value says so, so a new one replaces it. The link closes by itself once every key is saved.
  ```text
  ┌──────────────────────────────┐
  │ Keys for your assistant      │
  │                              │
  │ STRIPE_SECRET_KEY            │
  │ Stripe dashboard → Developers│
  │ → API keys → Secret key.     │
  │ [ ••••••••••••             ] │
  │                              │
  │ MAPS_API_KEY  (replaces the  │
  │ one saved now)               │
  │ Google Cloud → Credentials.  │
  │ [                          ] │
  │                              │
  │ [ Save ]           [ Done ]  │
  └──────────────────────────────┘
  ```
- **Saved, and only named in the chat.** The page shows a tick by each key it saved. In the chat, the assistant names the saved keys, never the keys themselves. A key your live site uses goes to the live site and its test copy too, as a pasted key does today.
- **Pasting still works.** A key pasted into the chat is still saved, so it isn't lost. The assistant then says the link is the safer way next time.
- **The guides say so.** The plain [API keys](../../../wiki/stack/api-keys.md) guide tells you to use the link and keeps pasting as the fallback. The developer secrets page says how the assistant sends the link.

Non-goals: the Cloudflare key during first-time setup still gets pasted. Keys spread over several lines, such as a private-key file, aren't taken. No typing new key names on the page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: adds the private key link: the agent offers it when a task needs a key the live file lacks; it writes only names the example files declare, to the right ignored file, by the add-or-rotate routing, and reports names only. A pasted key is still saved, with a pointer to the link.
- `cloudflare-provisioning`: the plain API-key page now leads with the private link and keeps pasting as the fallback.

## Impact

- `.agents/skills/verify/scripts/keys.mjs` (new): the key link's routes, a keyed `POST /save` that writes declared names to the primary live file and a seeded branch copy, and `POST /done`.
- `.agents/skills/verify/scripts/keys-page.html` and `keys-page.mjs` (new): the page.
- `.agents/skills/verify/scripts/hand-over.mjs`: `open --keys NAME[,NAME]` on the same private link, lock, and 10-minute close; `wait` prints `HANDOVER_SAVED=` names and `HANDOVER_APP_KEYS=` for names that went to `app/.dev.vars`.
- `scripts/tests/keys.test.mjs` (new).
- `wiki/development/secrets.md`: a new *Receive a key through a private link* section. `wiki/stack/api-keys.md`: rewritten around the link. `wiki/stack/getting-started.md`: its one line on giving a key.
- `AGENTS.md` / `CLAUDE.md` `WONG-STACK` block: the credentials line points to the key link.
- `openspec/specs/secrets-convention/spec.md` and `openspec/specs/cloudflare-provisioning/spec.md` via deltas.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-29** — Asked when the assistant should send the key link → chose whenever a task needs a key it lacks, after a *Ready, send the link / Not now* question; the person can also ask for it.
- **2026-09-29** — Asked what happens when someone still pastes a key → chose save it as today, and say the link is the safer way next time.
- **2026-09-29** — Assumed: the key link is a third mode of the hand-over script, like the password link, because it then shares the private address, secret key, one-link lock, and 10-minute close.
- **2026-09-29** — Assumed: the page takes only the key names the assistant asked for, and each must already be declared in `.env.example` or `app/.dev.vars.example`, because the declaration decides which file the key goes in and keeps the template honest.
- **2026-09-29** — Assumed: each box's hint is the first sentence of the comment above the name in its example file, because that comment already says where to get the key.
- **2026-09-29** — Assumed: a key is written to the primary checkout's file and, in a linked worktree, to its seeded branch copy too, because a new key or a rotation goes to both by the secrets routing table.
- **2026-09-29** — Assumed: the script writes files only and the assistant runs `secrets:push` when a key went to `app/.dev.vars`, because the script then makes no network call and the push stays the one way keys reach the live site.
- **2026-09-29** — Assumed: first-time setup's Cloudflare key stays a paste, because setup is its own flow, and changing it is a separate job.
- **2026-09-29** — Assumed: a minor release, because it adds a feature and breaks nothing.
- **2026-09-29** — Assumed while building: a value is quoted with a mark it lacks, not escaped, and `~` is never bare, because dotenv and the memory parser don't unescape `\"` or `\\`, and a shell expands `~`; the rare value holding both quote marks plus `\`, `$`, or a backtick is refused.
- **2026-09-29** — Assumed: tasks 3.1 and 3.2 are done at ship time, because `/ship`'s one checkpoint must pass CI before it merges, and a real phone link needs the person, so it is kept as a memory thread.
- **2026-09-29** — Archive checkpoint: archived with its tasks complete, released as 27.5.0.
