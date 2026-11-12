# Secrets and environment variables

Real secrets stay outside git. Committed, values-blank **`.env.example`** lists every variable the project reads, what it does, and where to get it. [API keys](../stack/api-keys.md) explains the private-link route.

This convention supports any credential-file format; it requires no dotenv library or application `.env` reader. Each live file has one role: Cloudflare tools use root `.env`, Worker runtime uses `app/.dev.vars` ([routing](../stack/staging-bindings.md#env-and-devvars-are-not-interchangeable), [each Worker's file](../stack/staging-bindings.md#one-declared-list-of-secrets-two-workers)). Apply these rules to each.

## Tool keys and business services

`.env` holds keys for the tools this computer runs, such as Cloudflare's. A business service's key lives in the app. A chat reaches it through [the services list](../stack/service-catalogue.md), never by reading a key from a file: the app decides what each person may do, and a teammate's computer holds no business key. Such a key reaches the app [sealed, through the app itself](../stack/connect-your-tools.md#how-a-key-reaches-the-app); the private link below is for keys this computer's tools use.

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

The person handles website steps to obtain, reveal, copy, rotate, change permissions for, or revoke API keys/tokens in their own browser. The agent uses no automation, screenshot, extraction, or live view for those steps. Except: [connecting tools](../stack/connect-your-tools.md#pick-the-browser) makes keys in the assistant's own browser.

If an ordinary browsing task reaches a token step, stop before taking a picture or extracting page content, then:

1. **Find the service link**: the direct token page from existing provider guidance. If the exact address is uncertain, use the known dashboard link and make the path a step; never invent an account-specific address or open the token page in the agent's browser.
2. **Write short steps**: what to create or change, and which permissions the task needs.
3. **Put them where the person acts, and wait.** For a new or replacement value they go on [the private key link's page](#receive-a-key-through-a-private-link), and the chat carries only that link; wait until the key is saved. For a permission edit, revocation, or other change with no new value, give them in the chat and wait for the person to confirm.

Other browsing, sign-ins, stored credentials, and token management through APIs are unchanged.

**Scheduled credentials.** [Host schedules](../stack/host-schedules.md) use existing host connections. Verify future-session tool/memory scope; keep credentials out of prompts and schedule instructions. Preserve legacy keys until [explicit migration/teardown](../stack/legacy-cloud-schedules.md).

## Receive a key through a private link

When a task lacks a key, or the person asks for *the key link*, send a private link in the same reply: [the key link](../../.agents/plugins/browser/hand-over/references/key-link.md) owns the steps. It writes the primary worktree's file and any seeded [branch copy](#worktrees-and-branch-copies).

## Worktrees and branch copies

A linked worktree works on its own **branch copy** of each live file, at the same repo-relative path as the primary's. Seed the copies when you create the worktree:

```bash
node .claude/loop/worktree-secrets.mjs seed
```

Wire that command into your worktree tool's setup step. `seed` copies each primary live file the worktree ignores, never overwrites a file the worktree has, and records a baseline of key names and value hashes in the worktree's own Git directory — never in the working tree, and never a value. It also copies your local chat settings, `.claude/settings.local.json`, once; `status` and `promote` skip them.

Route each edit by its kind, so `main` sees an edit only when it is safe:

| Edit on a branch | Write it to | Why |
|---|---|---|
| Add a key | the branch copy **and** the primary, now | `main` doesn't read it yet, and a deleted worktree can't lose it |
| Rotate a value (the old one no longer works) | both, now | the primary must not keep a dead value |
| Delete a key, or set a value only this branch needs | the branch copy only | `main` still reads the old one until the merge |

[`/ship`](../../.agents/plugins/loop/skills/ship/SKILL.md) runs `worktree-secrets.mjs promote` after the merge. It applies to the primary only what this branch changed, compared three ways against the baseline, so a key another branch added to the primary is kept and a rotation made there is not reverted. A key both sides changed is skipped and named for you to resolve. Without a baseline it applies adds only and names the rest. Every command prints key names, never values; `status` shows what is still pending.

WongStack tools read primary `.env` first; branch-only settings belong to the app. After merging outside `/ship`, run `promote` before deleting the worktree. Abandoned worktrees need no promotion.

## Unseeded linked-worktree copies

A worktree-local live file with no baseline — made by hand, or by a setup that ran before `seed` existed — is not a branch copy. If the primary and a linked worktree both have such regular files, preserve both until you reconcile them. Do not print, compare in output, overwrite, delete, or bulk-merge their values. WongStack consumers prefer the primary file and report the duplicate without exposing it.

After reconciliation, tooling that insists on finding `.env` inside the linked checkout can use an **ignored symlink** to the primary file (or the stack's equivalent configuration). Never replace an existing regular file with that link automatically: reconcile it first, then confirm the link itself remains ignored.

Other development processes live in [Development](README.md), in [the wiki](../README.md).
