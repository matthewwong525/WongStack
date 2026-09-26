---
name: ship
description: Ship a completed change through archive, one /save checkpoint, CI or PR review, preview evidence, and squash merge, or merge a mini app's fallback pull request. If the change is unfinished, invoke /apply first; /apply can invoke /plan and /explore. Use when you want work shipped, merged, and archived.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes, without a prompt, the archive of a **complete** change, the delegated `/save` checkpoint, the walk, the merge, the remote-branch deletion, and the post-merge sync. It also authorizes [the pull-in](#the-pull-in-nothing-to-ship-yet): explore, plan, implement, and any save a task needs, and [a mini-app pull request](#merge-a-mini-app-pull-request). It does **not** authorize archiving a change with unchecked tasks; [Step 2](#step-2--archive-the-change) finishes the tasks instead of asking. Confirm anything outside this runbook, such as a force push, `--no-verify`, `git reset --hard`, or `checkout .`, in [the shared ask format](../explore/references/asking-the-user.md).

`/ship` is the **archive + merge** step of [the change loop](../../../wiki/development/the-change-loop.md). **The archived change is the record of what shipped**; there is no GitHub summary issue. The merge rides [the gate](../../../wiki/development/the-change-loop.md#the-gate) and nothing else: merge only on `/save`'s `SUCCESS` or `NONE`. `/ship` is the merge, not the review: cleanliness, consolidation, and downstream breakage belong in PR review.

`main` is the default branch, per [the default-branch rule](../save/references/git-gate.md#the-default-branch).

## Step 1 — preflight

Check [the preconditions](../save/references/preconditions.md) first; a failed check stops the ship with its fix.

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- On the default branch with uncommitted changes, before any pull-in → invoke ordinary `/save`. It creates the feature branch and commits the work. Re-run this preflight on that branch. After a pull-in, go straight to Step 2 in the same tree: Step 3's save cuts the branch.
- On a clean default branch, or a clean tree with 0 commits ahead → nothing to ship yet; go to [the pull-in](#the-pull-in-nothing-to-ship-yet). A dirty feature branch with 0 commits is valid: the delegated `/save` below creates its first commit.
- Default branch's CI is `failure` → **stop**; fix it first. Only `ok` proceeds: an empty answer or a failed `gh` call is `UNKNOWN`, so **stop** and report gh's message. An intent does **not** override this one.
- Record `BRANCH=$(git rev-parse --abbrev-ref HEAD)`. Do not commit, push, open a PR, or wait on branch checks here; those are `/save`'s single checkpoint after the archive move.

### The pull-in: nothing to ship yet

With nothing to ship yet, **invoke the [`apply` skill](../apply/SKILL.md)** and tell it that it runs inside `/ship`. It then returns on completion **without** `/save`, and you continue to Step 2 in the same working tree. [The change loop](../../../wiki/development/the-change-loop.md) owns why: a verb whose precondition is missing invokes the verb before it.

- **An intent was given** (`/ship <intent>`) → invoke `/apply` with the argument **verbatim**.
- **No argument** → invoke `/apply` with no argument when [`/apply`'s resolve order](../apply/SKILL.md#resolve-the-plan-first) lands on any rung before `sole-active`, or when the session states clear implementation intent with no change yet.
- **The cold stop.** When that order would land on `sole-active` or on nothing, **stop and say so**: report that there is nothing to continue and that `/ship <intent>` starts a new change. Never stop silently.

`/ship` resolves nothing itself and adds no planning, implementation, or git behavior; `/apply` does the work. A feature branch that already has work (commits ahead or a dirty tree) runs the ordinary runbook, with or without an intent.

**Never merge as a way of stopping.** If `/plan` pauses, `/apply` ends with tasks pending, or a task-driven `/save` returns a failing or unverifiable result, report the blocker and stop before Step 2. A one-go run has **one** checkpoint: Step 3's save after the archive, so CI runs once before the walk.

**Work that changes no repo file** — an errand, a message, research — finishes in `/apply`. Say so in one line and stop, with no git change.

### Merge a mini-app pull request

A mini app normally needs no `/ship`: [its save](../save/references/mini-app-save.md) pushes straight to the default branch. A save that fell back to a pull request — a migration, a change to the mini Worker, or a rejected push — ships here without an OpenSpec change. Recognize it by the session, or by a PR body in the renderer's mini-app mode, with a diff under `mini-apps/` and `schema/migrations/`. Skip Steps 2 to 4: no change selection, no archive, no walk. Invoke the `save` skill once, which updates the pull request and waits for CI. Merge on its `SUCCESS` or `NONE` through [Step 5](#step-5--merge-and-sync), and report the app's dashboard entry. [Mini apps](../../../wiki/stack/mini-apps.md) owns the layout.

## Step 2 — archive the change

Keep `BRANCH` from Step 1 and resolve a separate `CHANGE_NAME` by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, then `recorded-branch`. If none selects a change and the branch is not [a mini-app pull request](#merge-a-mini-app-pull-request), stop and report that this branch has no identifiable change record; `/save` can author one. `sole-active` never authorizes a cold merge.

If the branch diff or working tree contains **more than one active change folder**, stop before archive even when one was explicitly selected: the merge would carry the other too. Name the folders and ask the user, [as options](../explore/references/asking-the-user.md): ship the selected change alone by moving the other out of the branch *(Recommended)*, or ship both together on purpose. Require `openspec/changes/$CHANGE_NAME/` to exist, and keep `CHANGE_NAME` fixed through archive and checkpoint.

**Read its `tasks.md` before you archive anything.** Unchecked tasks (`- [ ]`) mean the change is not finished: invoke the [`apply` skill](../apply/SKILL.md) for that exact change, tell it that it runs inside `/ship` so it returns without `/save`, then re-read the file. Archive only when every task is checked. Never let this runbook's authorization answer the archive step's incomplete-task confirmation. If `/apply` ends with tasks pending, report that work and stop.

Follow the shared [CLI contract](../plan/references/openspec-cli.md). Read `openspec status --change "$CHANGE_NAME" --json` and require its schema-defined artifacts to be complete or deliberately skipped. Run `openspec validate "$CHANGE_NAME" --strict --no-interactive`; stop on failure. Read `openspec instructions archive --change "$CHANGE_NAME" --json` for any applicable context. Run `openspec archive "$CHANGE_NAME" --yes` only after the task check, validation, and the distillation below. If `/save` already synced the deltas and equality is confirmed, `--skip-specs` avoids a second main-spec edit; otherwise the CLI archives and syncs them. Capture the archive path and verify exactly one `openspec/changes/archive/*-$CHANGE_NAME/` exists. Do **not** commit the move here.

### Distill the change's facts into the wiki

This is the catch-up: sessions write [repeatable knowledge](../../../wiki/wiki-style.md#repeatable-knowledge) when they learn it, and this step takes what they missed. Before the archive, read the change's live facts and every live fact from the sessions on its branch:

```bash
M="$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"
node "$M" show "$CHANGE_NAME"
node "$M" search --branch "$BRANCH" --limit 200
```

Count a fact that both commands print once. Keep only the facts that pass the test — *will this help with a future task that is not this one?* — and place each one by [the wiki rules](../../rules/wiki.md): a fact about one person on their `people/` page, a fact about everyone on the topic page that owns it, a new page linked from its hub only when no page owns it. Never move a private-life fact into this repo's wiki. Append one Decision-log line naming the pages changed, or `no repeatable fact`. When the store does not answer, log that the step was skipped and continue. The edits ride in the archive checkpoint, so a person reviews them in this PR.

## Step 3 — delegate the checkpoint to /save

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim.** Hand it the exact `CHANGE_NAME` and archive path. `/save` owns the commit, push, PR body, and CI wait; `/ship` implements none of it. Consume its final result:

- `SUCCESS` → proceed. `NONE` → proceed; invoking `/ship` is the PR-review approval where no checks exist.
- `UNKNOWN`, `TIMEOUT`, or `FAILURE` → stop before merge and report `/save`'s reason. Do not repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**Invoke the `verify` skill once** and follow it verbatim. Never skip it, and never re-run it for a better verdict. If the repo has no `verify` skill, say so in one line and go to Step 5; never install it.

- `SUCCESS`, `NONE`, `UNKNOWN`, `TIMEOUT` → report it and continue to the merge.
- `FAILURE`, after `/verify`'s own fix attempts → **stop and ask the user** as [a two-option question](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): fix the failure first *(Recommended)*, or merge anyway and record that the walk failed.

If the walk's fix loop advanced `HEAD`, its own delegated `/save` already gated the new commit. Confirm that result is `SUCCESS` or `NONE`, and merge that commit.

## Step 5 — merge and sync

Run the merge script once. It merges exactly the gated commit, retargets every open pull request based on the branch **before** it deletes the branch, deletes the remote branch unless GitHub already did at merge, and fast-forwards the checkout that has `main` out:

```bash
bash "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/merge.sh"
```

It prints `key=value` lines for the report: `merged`, `pr`, `url`, `retargeted`, `branch`, and `synced`.

- **Exit 0** → merged. A skipped sync is one line in the report, never a failure.
- **Exit 1** → not merged, and nothing was deleted. Report the error line and stop.
- **Exit 2** → merged, but a retarget or the branch delete failed, so the branch is kept. Report it; a kept branch keeps its stacked pull requests open.

On a **merge conflict**, the script exits 1: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent**, then invoke ordinary `/save` again so the merge commit gets the same gate. Run the script again only on its `SUCCESS` or `NONE`. Never check out, switch, stash, reset, or force a branch to make the sync succeed, and never delete a local branch.

### Promote the branch's secret edits

A linked worktree keeps its own copy of each live secrets file. The branch wrote its adds and rotations to the primary already; its deletions and branch-only values waited for this merge. Apply them now, from the worktree you shipped:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/worktree-secrets.mjs" promote
```

It compares the worktree copy, the primary, and the baseline recorded at seed. It changes only the keys this branch changed, skips and names a key the primary also changed, and prints key names, never values. In the primary checkout it does nothing. The [secrets convention](../../../wiki/development/secrets.md) owns the lifecycle. The same skip rule applies: any error is one line in the report, and it cannot fail the ship.

## Step 6 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch, and `openspec/specs/` holds the synced result. For a mini-app pull request: the app's folder and its dashboard entry instead.
- **Checkpoint** — `/save` result and CI outcome, including auto-fix pushes.
- **Walk** — the verdict, the evidence comment link, and, when a `FAILURE` was merged anyway, that the user chose to. Where the skill was absent, one line saying so.
- **Retargeted** — any pull request moved to the default branch before the branch was deleted.
- **Branch** — deleted, or already deleted at merge by GitHub.
- **Synced** — the checkout whose `main` advanced to the merged commit, or the one-line reason the sync was skipped.
- **Secrets** — the promoted, skipped, and unresolved key names from the promote, never a value, or the one-line reason it was skipped.

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): normally start the next change, walk the merged app, or stop here. A ship that stopped before the merge closes with the supported ways to clear the blocker instead.
