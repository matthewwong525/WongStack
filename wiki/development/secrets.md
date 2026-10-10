# Secrets and environment variables

Real secrets stay outside git. Committed, values-blank **`.env.example`** lists every variable the project reads, what it does, and where to get it. [API keys](../stack/api-keys.md) explains the private-link route.

This convention supports any credential-file format; it requires no dotenv library or application `.env` reader. Each live file has one role: Cloudflare tools use root `.env`, Worker runtime uses `app/.dev.vars` ([routing](../stack/staging-bindings.md#env-and-devvars-are-not-interchangeable), [both Workers](../stack/staging-bindings.md#one-declared-list-of-secrets-two-workers)). Apply these rules to each.

## The two files

- **`.env.example` — committed on the active branch.** Declare every consumed variable blank, with its purpose and source. Never put real values here.
- **`.env` — ignored in the primary worktree.** Values belong to each machine. A single checkout is primary; linked worktrees resolve it from Git metadata through the shared lookup:

  ```bash
  PRIMARY_ROOT=$(node .claude/skills/memory/scripts/lib/primary-root.mjs)
  ```

  Equal Git/common directories mean this checkout is primary. Otherwise Git must verify the common directory's parent is a checkout. A bare repository's worktree fails with exit 1: saves stop; reads may fall back to this checkout.

  Setup first protects `.env*`/`.dev.vars*`, except their `.example` files, in [`.gitignore`](../../.gitignore). Before accepting a value, verify its destination with `git -C "$PRIMARY_ROOT" check-ignore -q .env`; fix missing protection first.

  Previously tracked `.env` needs `git rm --cached .env` and credential rotation: ignoring it leaves values in history.

## Bootstrapping a local setup

In a normal checkout, copy the example beside itself. In a linked worktree, initialize the durable file in the primary worktree **from the active branch's example**, which may add variables `main` lacks:

```bash
cp .env.example "$PRIMARY_ROOT/.env"   # then fill in the real values
```

Work down the file, following each comment to where the value comes from. If one is unclear, improve the comment in `.env.example`: everyone else reads it next.

## Keeping the template honest

**Declare each new code variable in the active branch's `.env.example`, in the same change**, blank with its comment. Put its value in the ignored primary file. Missing declarations break new contributors' setup.

Rotate values in durable `.env`. Change `.env.example` only when the name, purpose, or acquisition instructions change.

## API token website steps

The person handles website steps to obtain, reveal, copy, rotate, change permissions for, or revoke API keys/tokens in their own browser. The agent uses no automation, saved login, screenshot, extraction, or private form for those steps.

If an ordinary browsing task reaches a token step, stop before taking a picture or extracting page content, then:

1. **Find the service link**: the direct token page from existing provider guidance. If the exact address is uncertain, use the known dashboard link and make the path a step; never invent an account-specific address or open the token page in the agent's browser.
2. **Write short steps**: what to create or change, and which permissions the task needs.
3. **Put them where the person acts, and wait.** For a new or replacement value they go on [the private key link's page](#receive-a-key-through-a-private-link), and the chat carries only that link; wait until the key is saved. For a permission edit, revocation, or other change with no new value, give them in the chat and wait for the person to confirm.

Ordinary browsing, saved website logins, use of stored credentials, and existing authorized token management through APIs continue as usual.

**Scheduled credentials.** [Host schedules](../stack/host-schedules.md) use existing host connections. Verify future-session tool/memory scope; keep credentials out of prompts/records. Preserve legacy keys until [explicit migration/teardown](../stack/legacy-cloud-schedules.md).

## Receive a key through a private link

When a task lacks a key, or the person asks for *the key link*, send a private link in the same reply, with no *Ready?* question: it waits eight hours by default. Chats are stored; the link takes the key straight to the ignored file.

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

A key over several lines is stored on one: JSON compacted, other text in double quotes with each line break as `\n`, which dotenv and wrangler read back and a shell's `source` does not. Each save writes the primary worktree's file and, in a linked worktree, its seeded branch copy, like any [add or rotation](#worktrees-and-branch-copies). Private input ends on completion, cancellation, or after eight hours by default, and has [every private link's safety](browsing.md#how-private-links-work). No value reaches a command line, a log, the link's own files, or the chat.

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

WongStack tools read primary `.env` first; branch-only settings belong to the app. After merging outside `/ship`, run `promote` before deleting the worktree. Abandoned worktrees need no promotion; their deferred edits disappear with them.

## Unseeded linked-worktree copies

A worktree-local live file with no baseline — made by hand, or by a setup that ran before `seed` existed — is not a branch copy. If the primary and a linked worktree both have such regular files, preserve both until you reconcile them. Do not print, compare in output, overwrite, delete, or bulk-merge their values. WongStack consumers prefer the primary file and report the duplicate without exposing it.

After reconciliation, tooling that insists on finding `.env` inside the linked checkout can use an **ignored symlink** to the primary file (or the stack's equivalent configuration). Never replace an existing regular file with that link automatically: reconcile it first, then confirm the link itself remains ignored.

Other development processes live in [Development](README.md), in [the wiki](../README.md).
