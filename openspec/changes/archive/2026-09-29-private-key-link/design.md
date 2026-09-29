# Design

## Context

`hand-over.mjs` already runs two kinds of private link: the browser hand-over and, since 27.2.0, `open --passwords`. Both share a loopback server, a random 32-byte key in the URL fragment, a Cloudflare quick tunnel (or `--local`), a detached watcher, one link at a time through `~/.wong-stack/hand-over/`, and a 10-minute deadline. `passwords.mjs` shows the shape of a mode's routes: a keyed `POST /save`, a `POST /done`, body limits, one save at a time, and nothing logged.

API keys live in two ignored live files, each declared by a committed example: `.env` / `.env.example` for tool credentials, `app/.dev.vars` / `app/.dev.vars.example` for the Worker's runtime secrets, which `npm run secrets:push` (`scripts/cf-secrets.mjs`) loads into both Workers. [The secrets convention](../../../wiki/development/secrets.md) routes an add or a rotation to the primary checkout's file and the branch copy at once; `worktree-secrets.mjs` holds the file and ignore logic.

## Goals / Non-Goals

**Goals:**
- A key travels once, from the person's device to the ignored file. It never lands in argv, env, a log, `state.json`, `result.json`, or the agent's output.
- One link lifecycle for all three modes: same key, tunnel, lock, deadline, and ready question.
- The key goes where the code reads it, decided by the committed declaration, not by the agent's guess.

**Non-Goals:**
- Multi-line values such as a PEM private key.
- A free-form name field on the page.
- Pushing to Cloudflare from the script.
- First-time setup's Cloudflare token.

## Decisions

### A `--keys` mode on `hand-over.mjs`, with the new parts in their own files

`hand-over.mjs open --keys NAME[,NAME] [--local] [--minutes N]` reuses `open`, `watch`, `wait`, and `close` whole, as `--passwords` does: no browser page, no live feed. It serves `keys-page.html` and `keys-page.mjs` and mounts the routes from `keys.mjs`. `--keys` with `--passwords`, `--until`, or `--until-gone` is a usage error.

- **Alternative:** a separate CLI. It would need the tunnel and lock helpers exported, and a second lock. Rejected for the same reason `--passwords` rejected it.

### The declaration picks the file

At `open`, `keys.mjs` resolves each name against the active checkout's example files:

| Declared in | Written to |
|---|---|
| `.env.example` | `.env` |
| `app/.dev.vars.example` | `app/.dev.vars` |
| neither | exit 2: `KEYS_UNDECLARED=NAME` — declare it first |
| both | exit 2: `KEYS_AMBIGUOUS=NAME` |

A name must match `^[A-Z_][A-Z0-9_]*$`; at most 20 names. Then, before the link opens, it proves each destination is ignored (`git check-ignore -q`) in the primary worktree, and in this worktree when it is a linked one. A failed proof exits 1 before any secret is accepted, per *Real values persist in the primary worktree*.

The page's hint is the comment block directly above the declaration: its first sentence, stripped of `#`, capped at 200 characters. None → no hint. The page also learns, per name, only whether a value is set now (a boolean), so it can say *replaces the one saved now*; it reads the list from a keyed `GET /keys`.

### Writing a key

`POST /save` takes `{keys: {NAME: value}}`, with a 16 KB body cap. Each value is trimmed; empty, over 4,096 characters, or holding a newline is refused for that name. For each accepted name, one save at a time:

1. The primary worktree's file: replace the name's line in place, or append it; create the file with mode `0600` if missing. Write to a temp file in the same folder and rename, so a crash never leaves half a file.
2. In a linked worktree with a seeded branch copy (the baseline `seed` wrote exists), the same write to the branch copy. No baseline → the primary only, since an unseeded copy is not a branch copy.

A value made only of `A–Z a–z 0–9 _ - . : / + = @` is written bare. Any other goes in single quotes, or in double quotes when it holds a `'` but no `"`, `\`, `$`, or backtick; a value that fits neither is refused. Neither dotenv (so wrangler) nor the memory parser unescapes a quoted value, and a shell expands `~`, so picking a quote mark the value lacks is what reads back unchanged everywhere. The reply is `{saved: [NAME], failed: [NAME]}`, names only.

- **Alternative:** call `worktree-secrets.mjs` to route the write. It has no set-a-key command today, and adding one widens a script `/ship` depends on. A small shared `setKey(file, name, value)` helper in `keys.mjs` stays local; `worktree-secrets.mjs`'s entry regex is reused so both read lines the same way.

### What the agent hears

The watcher records saved names in `result.json`. `wait` prints `HANDOVER_RESULT=…`, then `HANDOVER_SAVED=NAME,NAME`, then `HANDOVER_APP_KEYS=NAME` listing those that went to `app/.dev.vars`. On a non-empty `HANDOVER_APP_KEYS` the agent runs `npm run secrets:push`, which already refuses `.env` and loads both Workers. The link ends on `POST /done`, on the save that leaves no asked-for key unsaved, on `close`, or on the deadline.

### Where the agent learns to use it

- The `WONG-STACK` credentials line in `AGENTS.md`/`CLAUDE.md` gains: a missing key → declare it, then send the key link, linking the new secrets-page section. That line is what every session reads.
- `wiki/development/secrets.md` owns the how: a new *Receive a key through a private link* section with the ask, the commands, the output, the push, and the pasted-key fallback line.
- `wiki/stack/api-keys.md` owns the person's view and links the section for details.

## UX

**Brief.** The business owner, often on a phone, gives the assistant a key it asked for. Done is: the key saved, the chat naming it, the link closed. Common case: one key, pasted from the service's page in another tab. Edge: two or three keys at once; a rotation; a paste with a trailing space or newline. Assumed rare: more than five keys at once. Mirrors the password link's add-one form (`passwords-page.html`).

**Flow.** Chat question → *Ready, send the link* → tap the link → paste into the box → *Save* → ticks shown → link closes itself (or *Done*).

**Hierarchy.** One primary action: *Save*. *Done* is secondary.

**Components.** Title *Keys for your assistant*; per key: the name, the hint line, *replaces the one saved now* when set, a `type=password` field with `autocomplete="off"`, and a show toggle; a status line; *Save* and *Done*. After a save each saved row shows *Saved ✓* and its field is cleared and disabled; a failed row stays editable with *Couldn't save this one; check it and try again.* A closed or expired link says *This link has closed. Ask your assistant for a new one.*

### Review

[review.html](review.html) shows the screen under *One box per key* and the flow under *A private link for keys*.

## Risks / Trade-offs

- **The key sits in the page's memory until saved** → the page sends it once and clears the field; the tunnel is TLS, and the secret key in the fragment never reaches a server log.
- **The agent can read `.env` afterwards** → true today for a pasted key too; the gain is that the chat and its stored transcript never hold it.
- **An agent names the wrong variable** → the example comment on the page shows what it is for, so the person notices before pasting.
- **Textual overlap in `hand-over.mjs`** with any in-flight hand-over edit → whichever lands second rebases.
