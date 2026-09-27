---
name: ship
description: Ship a completed change through archive, one /save checkpoint, CI or PR review, preview evidence, and squash merge. If the change is unfinished, invoke /apply first; /apply can invoke /plan and /explore. Use when you want work shipped, merged, and archived.
user-invocable: true
---

# /ship

Invoking `/ship` authorizes, without a prompt, archiving a **complete** change, the `/save` checkpoint, the walk, the merge, remote-branch deletion, the post-merge sync, and [the pull-in](#the-pull-in-nothing-to-ship-yet) with any save a task needs — **not** archiving unchecked tasks, which [Step 2](#step-2--archive-the-change) finishes instead of asking. Confirm anything else (a force push, `--no-verify`, `git reset --hard`, `checkout .`) in [the shared ask format](../explore/references/asking-the-user.md).

[The change loop](../../../wiki/development/the-change-loop.md) owns the record, the pull-in, and [the gate](../../../wiki/development/the-change-loop.md#the-gate). Leave cleanliness, consolidation, and downstream breakage to PR review. `main` means [the default branch](../save/references/git-gate.md#the-default-branch).

## Step 1 — preflight

Check [the preconditions](../save/references/preconditions.md) first.

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- Default branch with uncommitted changes, before any pull-in → ordinary `/save` cuts the feature branch and commits; re-run this preflight there. (After a pull-in, Step 3's save cuts it.)
- Clean default branch, or clean tree with 0 commits ahead → [the pull-in](#the-pull-in-nothing-to-ship-yet). A dirty feature branch with 0 commits is valid.
- Only `ok` default-branch CI proceeds, even with an intent. **Stop** on `failure` (fix it first) or `UNKNOWN` (an empty answer or failed `gh` call; report gh's message).
- Record `BRANCH=$(git rev-parse --abbrev-ref HEAD)`; commit, push, PR, and checks wait for `/save` after the archive.

### The pull-in: nothing to ship yet

**Invoke the [`apply` skill](../apply/SKILL.md)** and say it runs inside `/ship`: it returns with **no** preview upload or `/save`, and you continue to Step 2 in the same tree.

- **Intent given** (`/ship <intent>`) → pass it **verbatim**.
- **No argument** → invoke `/apply` bare when [its resolve order](../apply/SKILL.md#resolve-the-plan-first) lands before `sole-active`, or the session states clear implementation intent with no change yet.
- **The cold stop.** Landing on `sole-active` or nothing → **stop and say** there is nothing to continue and `/ship <intent>` starts a new change; never silently.

A feature branch with work runs the ordinary runbook, intent or not; `/ship` resolves nothing itself.

If the pulled-in stage stops short, report the blocker and stop before Step 2: [no verb merges to stop](../../../wiki/development/the-change-loop.md). A one-go run has **one** checkpoint, Step 3's.

**Work that changes no repo file** finishes in `/apply`: say so in one line and stop; no git change.

## Step 2 — archive the change

Resolve `CHANGE_NAME`, separate from `BRANCH`, by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, then `recorded-branch`; `sole-active` never authorizes a cold merge. None selects → stop: no identifiable change record; `/save` can author one.

**Several active change folders** in the branch diff or working tree → stop before archive, even with an explicit selection: the merge would carry them all. Ask [as options](../explore/references/asking-the-user.md), naming them: move the others off the branch *(Recommended)*, or ship all on purpose. Require `openspec/changes/$CHANGE_NAME/`; keep `CHANGE_NAME` fixed through archive and checkpoint.

**Read `tasks.md` before archiving.** Unchecked tasks (`- [ ]`) → invoke [`apply`](../apply/SKILL.md) for that exact change, inside `/ship`, then re-read; archive only when every task is checked. Never let this runbook's authorization answer the archive step's incomplete-task confirmation. Still pending → report that work and stop.

By [the CLI contract](../plan/references/openspec-cli.md#validate-and-archive), which owns `--skip-specs`, stop unless `openspec status --change "$CHANGE_NAME" --json` shows every schema artifact complete or deliberately skipped and `openspec validate "$CHANGE_NAME" --strict --no-interactive` passes. After the task check, validation, and the distillation below, run `openspec archive "$CHANGE_NAME" --yes`, verify exactly one `openspec/changes/archive/*-$CHANGE_NAME/` exists, and keep its path.

### Distill the change's facts into the wiki

Before the archive, catch the [repeatable knowledge](../../../wiki/wiki-style.md#repeatable-knowledge) sessions missed in the live facts of the change and branch:

```bash
M="$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"
node "$M" show "$CHANGE_NAME"
node "$M" search --branch "$BRANCH" --limit 200
```

Deduplicate the two outputs. Place each repeatable one by [the wiki rules](../../rules/wiki.md): extend its owning page, or add a page linked from its hub; never move a private-life fact into this repo's wiki. Append one Decision-log line naming the pages changed, or `no repeatable fact`. [Store unreachable](../memory/SKILL.md#read) → log the step skipped and continue. The edits ride in this PR's archive checkpoint.

## Step 3 — delegate the checkpoint to /save

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim**, with the exact `CHANGE_NAME` and archive path. Proceed only on `SUCCESS` or `NONE` (invoking `/ship` is the approval where no checks exist). On `UNKNOWN`, `TIMEOUT`, or `FAILURE`, stop before merge and report `/save`'s reason; never repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**Invoke the `verify` skill once**, verbatim; never skip or re-run it for a better verdict. No `verify` skill → say so in one line and go on; never install it.

- `SUCCESS`, `NONE`, `UNKNOWN`, `TIMEOUT` → report it and continue.
- `FAILURE` after `/verify`'s own fix attempts → **stop and ask the user** [two options](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): fix it first *(Recommended)*, or merge anyway and record that the walk failed. For a [non-technical reader](../explore/references/asking-the-user.md#write-at-the-readers-level), say what they would see on the preview, and *publish anyway*.

If the walk's fixes advanced `HEAD`, confirm their `/save` result is `SUCCESS` or `NONE` and merge that commit.

## Step 5 — merge and sync

Run the merge script once. It merges exactly the gated commit, retargets stacked PRs **before** deleting the branch, and fast-forwards the checkout that has `main` out:

```bash
bash "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/merge.sh"
```

- **Exit 0** → merged; a skipped sync is one report line, never a failure.
- **Exit 1** → not merged, nothing deleted: report the error and stop.
- **Exit 2** → merged, but a retarget or delete failed; the branch and its stacked PRs stay. Report it.

A **merge conflict** exits 1: `git fetch origin main` → `git merge origin/main` (not rebase, unless asked), resolve each file as the **union of intent**, and invoke ordinary `/save` again; re-run the script only on `SUCCESS` or `NONE`. Never check out, switch, stash, reset, or force a branch to make the sync succeed, or delete a local branch.

### Promote the branch's secret edits

From the shipped worktree, promote its deferred secret edits (deletions, branch-only values) to the primary:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/worktree-secrets.mjs" promote
```

It prints key names, never values, and skips and names a key the primary also changed; [the secrets convention](../../../wiki/development/secrets.md) owns the rest. Any error is one report line and cannot fail the ship.

## Step 6 — report

Lead with the outcome at [the reader's level](../explore/references/asking-the-user.md#write-at-the-readers-level): for a non-technical reader, *it is live* and what changed. Then print `merge.sh`'s `key=value` lines (`merged`, `pr`, `url`, `retargeted`, `branch`, `synced`), plus:

- **Archived** — the archive path.
- **Checkpoint** — `/save`'s result and CI outcome, auto-fix pushes included.
- **Walk** — verdict and evidence link; a merged-anyway `FAILURE` says the user chose it.
- **Secrets** — promoted, skipped, and unresolved key names, or why it was skipped.
- **Checks loosened** — each `Check:` bullet in the archived Decision log, one plain line; omit when none ([the gate](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason)).

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): normally the next change, walking the merged app, or stopping; after a stop, the ways to clear the blocker.
