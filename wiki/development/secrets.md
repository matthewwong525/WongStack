# Secrets and environment variables

Real secrets never go in git; a committed **`.env.example`** does. That one file lists every environment variable the project reads, each documented and none filled in, so a new contributor sets up locally without leaking a credential into history. Not a developer? [API keys](../stack/api-keys.md) is the plain version: paste the key into the private link the assistant sends.

This is a **convention with worktree-aware consumers**, not a required dotenv implementation. WongStack ships the pattern and an example file; its credential-aware skills follow the locations below, but the toolkit does not require a particular platform or make the application read `.env`. Adopt the names as-is, or use what your stack expects (a framework's dotenv file, a platform's `.dev.vars`) with the same discipline. A stack can have several live files, one per role: the Cloudflare pack keeps tool credentials in the root `.env` and the Worker's runtime secrets in `app/.dev.vars` — [which file holds what](../stack/staging-bindings.md#env-and-devvars-are-not-interchangeable), and [how both Workers get the same secrets](../stack/staging-bindings.md#one-declared-list-of-secrets-two-workers). Every rule on this page applies to each live file at its own path.

## The two files

- **`.env.example` — committed in the active branch.** Every variable the code reads appears here, blank, with a comment saying *what it is* and *where to get it*. It's a checklist, not a config: no real values ever land in it. A diff to this file shows the team that a new secret is now required.
- **`.env` — git-ignored in the primary worktree.** The real values, filled in per machine. A normal single checkout is the primary worktree. From a linked worktree, resolve the durable checkout from Git metadata rather than saving a second copy in the disposable checkout. Every WongStack script uses one shared lookup:

  ```bash
  PRIMARY_ROOT=$(node .claude/skills/memory/scripts/lib/primary-root.mjs)
  ```

  Equal git and common directories mean the current checkout is the primary. Otherwise the primary is the parent of the common directory, and Git must confirm it is a checkout. When it is not (a bare repository's worktree), the lookup exits 1 instead of guessing: a save stops, and a read may fall back to the current checkout.

  Setup writes the protection into [`.gitignore`](../../.gitignore) before this page can be acted on — `.env*` with a `!.env.example` negation, and the same pair for `.dev.vars` — so a per-environment variant full of live values can't be committed by accident. Before writing a value, verify the destination from the primary worktree with `git -C "$PRIMARY_ROOT" check-ignore -q .env`. If it is not ignored, stop before accepting the secret and fix the protection.

  If `.env` was already tracked before the rule existed, widening `.gitignore` does **not** untrack it: `git rm --cached .env`, and rotate whatever was in it, because it's in the history of every clone.

## Bootstrapping a local setup

In a normal checkout, copy the example beside itself. In a linked worktree, initialize the durable file in the primary worktree **from the active branch's example**, which may add variables `main` lacks:

```bash
cp .env.example "$PRIMARY_ROOT/.env"   # then fill in the real values
```

Work down the file, following each comment to where the value comes from. If one is unclear, improve the comment in `.env.example`: everyone else reads it next.

## Keeping the template honest

**When you add a variable in code, add it to the active branch's `.env.example` in the same change** — blank, with its comment. Put the real value only in the primary worktree's ignored `.env`. A missing entry is a bug: the next contributor's app won't run, and they won't know why.

Rotating an existing value is different: update the durable `.env`, but leave `.env.example` alone unless the variable's name, purpose, or acquisition instructions changed. Rewriting a blank declaration is noise, and documents no rotation.

## API token website steps

When a task needs a website to get, create, reveal, copy, rotate, change permissions for, or revoke an API key or token, the person does that step in their own browser, even when the agent has a saved login. The agent must not use browser automation, saved logins, screenshots, page extraction, or a private form for it.

If an ordinary browsing task reaches a token step, stop before taking a picture or extracting page content, then:

1. **Find the service link**: the direct token page from existing provider guidance. If the exact address is uncertain, use the known dashboard link and make the path a step; never invent an account-specific address or open the token page in the agent's browser.
2. **Write short steps**: what to create or change, and which permissions the task needs.
3. **Put them where the person acts, and wait.** For a new or replacement value they go on [the private key link's page](#receive-a-key-through-a-private-link), and the chat carries only that link; wait until the key is saved. For a permission edit, revocation, or other change with no new value, give them in the chat and wait for the person to confirm.

Ordinary browsing, saved website logins, use of stored credentials, and existing authorized token management through APIs continue as usual.

## Receive a key through a private link

When a task needs a key the live files lack, or the person asks for *the key link*, send a private link in the same reply, with no *Ready?* question: it waits 30 minutes. Chats are stored; the link carries the key from their device straight to the ignored file.

1. **Declare it first.** The name must be declared, blank, in exactly one example file: `.env.example` for a tool credential, `app/.dev.vars.example` for a Worker secret. A commented-out `# NAME=` is not a declaration. The first sentence of the comment above it is the hint a key with no guide shows, so say where to get the key there.
2. **Write the guide** to a file outside the repo, from the service's public help pages, read as plain pages. WongStack stores no guide.

   ```json
   { "STRIPE_SECRET_KEY": {
       "title": "Stripe key",
       "url": "https://dashboard.stripe.com/apikeys",
       "open": "Open Stripe's keys",
       "steps": ["Tap Create restricted key", "Tick Read charges", "Copy the key"],
       "check": { "url": "https://api.stripe.com/v1/balance", "auth": "bearer" } } }
   ```

   Every field is optional; [`keys.mjs`](../../.agents/skills/hand-over/scripts/keys.mjs) owns their limits. `url` and `steps` come from [the token-website steps](#api-token-website-steps). `check` is a harmless `GET` only a working key answers, sent once on save with `auth` one of `bearer`, `basic`, `header:<Name>`, or `query:<name>`: a 401 or 403 holds the key back until *Save anyway*. Leave it out for a pair, like an id and a secret.
3. **Open it**, send the `HANDOVER_LINK` it prints, and run `wait` in the background:

   ```bash
   node .claude/skills/hand-over/scripts/hand-over.mjs open --keys STRIPE_SECRET_KEY,MAPS_API_KEY --guide "$guide"
   node .claude/skills/hand-over/scripts/hand-over.mjs wait
   # HANDOVER_RESULT=done
   # HANDOVER_SAVED=STRIPE_SECRET_KEY,MAPS_API_KEY
   # HANDOVER_APP_KEYS=STRIPE_SECRET_KEY
   # HANDOVER_OPENED=yes
   ```

   `KEYS_UNDECLARED=` or `KEYS_AMBIGUOUS=` (exit 2) means step 1 isn't done, and `KEYS_GUIDE=` names the guide entry to fix. Exit 1 means a destination isn't git-ignored, so fix [the protection](#the-two-files) first, or another link holds the one slot. `HANDOVER_NEEDS=cloudflared` works as for [every private link](browsing.md#how-private-links-work).
4. **After it closes**, handle its completion identity once, as [workspace return](browsing.md#how-private-links-work) says, even when both `wait` and the workspace notification arrive. Both carry names, never values; absent or unconfirmed dispatch tells the person to return to chat and say *continue*. Name the saved keys in the chat, never a value. A non-empty `HANDOVER_APP_KEYS` means the Worker reads those keys: run `npm run secrets:push` so both Workers get them. When `app/.dev.vars.staging` exists, staging reads that file instead, so say staging still needs its own key. On `timeout`, or a `closed` nobody asked for, say what happened before offering a new link. `HANDOVER_OPENED=no`: nobody opened it, so ask whether it loaded. `yes`: ask where they got stuck.

One link is open at a time. A key link nobody has opened gives way to a newer link: its `wait` prints `closed` and `HANDOVER_REPLACED_BY=`, the folder of the workspace whose link took its place. Name that workspace and offer a new link. An opened one keeps its place.

A key over several lines is stored on one: JSON compacted, other text in double quotes with each line break as `\n`, which dotenv and wrangler read back and a shell's `source` does not. Each save writes the primary worktree's file and, in a linked worktree, its seeded branch copy, like any [add or rotation](#worktrees-and-branch-copies). Private input ends on completion, cancellation, or at 30 minutes, and has [every private link's safety](browsing.md#how-private-links-work). No value reaches a command line, a log, the link's own files, or the chat.

**A key pasted into the chat is still saved**, under the name the person gave, by the same routing. Write a value that isn't plain letters, digits, and `_ - . : / + = @` in single quotes, or in double quotes when it holds a `'`: never escape inside the quotes, because dotenv and wrangler read `\"` back as two characters, and a shell sourcing `.env` expands a bare `~`. In the same reply, say the link is safer next time, never showing the key: *Saved MAPS_API_KEY. Next time I'll send a private link, so the key stays out of the chat.*

## Worktrees and branch copies

A linked worktree works on its own **branch copy** of each live file, at the same repo-relative path as the primary's. Seed the copies when you create the worktree:

```bash
node .claude/skills/ship/scripts/worktree-secrets.mjs seed
```

Wire that command into your worktree tool's setup step; this repo's `paseo.json` does. `seed` copies each primary live file the worktree ignores, never overwrites a file the worktree has, and records a baseline of key names and value hashes in the worktree's own Git directory — never in the working tree, and never a value.

Route each edit by its kind, so `main` sees an edit only when it is safe:

| Edit on a branch | Write it to | Why |
|---|---|---|
| Add a key | the branch copy **and** the primary, now | `main` doesn't read it yet, and a deleted worktree can't lose it |
| Rotate a value (the old one no longer works) | both, now | the primary must not keep a dead value |
| Delete a key, or set a value only this branch needs | the branch copy only | `main` still reads the old one until the merge |

[`/ship`](../../.agents/skills/ship/SKILL.md) runs `worktree-secrets.mjs promote` after the merge. It applies to the primary only what this branch changed, compared three ways against the baseline, so a key another branch added to the primary is kept and a rotation made there is not reverted. A key both sides changed is skipped and named for you to resolve. Without a baseline it applies adds only and names the rest. Every command prints key names, never values; `status` shows what is still pending.

WongStack's own tools, such as the memory store, read the primary `.env` first, so keep branch-only values to the settings your app reads. Merged outside `/ship`, for example in the GitHub UI? Run `promote` from the worktree before you delete it. An abandoned branch needs nothing: delete the worktree and its deferred edits go with it.

## Unseeded linked-worktree copies

A worktree-local live file with no baseline — made by hand, or by a setup that ran before `seed` existed — is not a branch copy. If the primary and a linked worktree both have such regular files, preserve both until you reconcile them. Do not print, compare in output, overwrite, delete, or bulk-merge their values. WongStack consumers prefer the primary file and report the duplicate without exposing it.

After reconciliation, tooling that insists on finding `.env` inside the linked checkout can use an **ignored symlink** to the primary file (or the stack's equivalent configuration). Never replace an existing regular file with that link automatically: reconcile it first, then confirm the link itself remains ignored.

Other development processes live in [Development](README.md), in [the wiki](../README.md).
