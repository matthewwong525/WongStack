---
name: ship
description: Ship a completed change through archive, /save checkpoint, CI or PR review, preview evidence, and squash merge. If the change is unfinished, invoke /apply first; /apply can invoke /plan and /explore. Use when you want work shipped, merged, and archived.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes, without a prompt, the archive of a **complete** change, the delegated `/save` checkpoint, the walk, the merge, the remote-branch deletion, and the post-merge sync. It also authorizes [the pull-in](#the-pull-in-nothing-to-ship-yet): explore, plan, implement, and their saves. It does **not** authorize archiving a change with unchecked tasks; [Step 2](#step-2--archive-the-change) finishes the tasks instead of asking. Confirm anything outside this runbook, such as a force push, `--no-verify`, `git reset --hard`, or `checkout .`, in [the shared ask format](../explore/references/asking-the-user.md).

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
- On the default branch with uncommitted changes → invoke ordinary `/save`. It creates the feature branch and commits the work. Re-run this preflight on that branch.
- On a clean default branch, or a clean tree with 0 commits ahead → nothing to ship yet; go to [the pull-in](#the-pull-in-nothing-to-ship-yet). A dirty feature branch with 0 commits is valid: the delegated `/save` below creates its first commit.
- Default branch's CI is `failure` → **stop**; fix it first. Only `ok` proceeds: an empty answer or a failed `gh` call is `UNKNOWN`, so **stop** and report gh's message. An intent does **not** override this one.
- Record `BRANCH=$(git rev-parse --abbrev-ref HEAD)`. Do not commit, push, open a PR, or wait on branch checks here; those are `/save`'s single checkpoint after the archive move.

### The pull-in: nothing to ship yet

With nothing to ship yet, **invoke the [`apply` skill](../apply/SKILL.md)**, then **re-run this preflight** on the branch `/save` created and continue to Step 2. [The change loop](../../../wiki/development/the-change-loop.md) owns why: a verb whose precondition is missing invokes the verb before it.

- **An intent was given** (`/ship <intent>`) → invoke `/apply` with the argument **verbatim**.
- **No argument** → invoke `/apply` with no argument when [`/apply`'s resolve order](../apply/SKILL.md#resolve-the-plan-first) lands on any rung before `sole-active`, or when the session states clear implementation intent with no change yet.
- **The cold stop.** When that order would land on `sole-active` or on nothing, **stop and say so**: report that there is nothing to continue and that `/ship <intent>` starts a new change. Never stop silently.

`/ship` resolves nothing itself and adds no planning, implementation, or git behavior; `/apply` does the work. A feature branch that already has work (commits ahead or a dirty tree) runs the ordinary runbook, with or without an intent.

**Never merge as a way of stopping.** If `/plan` pauses, `/apply` ends with tasks pending, or a `/save` in the chain returns a failing or unverifiable result, report the blocker and stop before Step 2. Both checkpoints of a one-go run stand: `/apply`'s completion save and Step 3's archive save.

## Step 2 — archive the change

Keep `BRANCH` from Step 1 and resolve a separate `CHANGE_NAME` by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, then `recorded-branch`. If none selects a change, stop and report that this branch has no identifiable change record; `/save` can author one. `sole-active` never authorizes a cold merge.

If the branch diff or working tree contains **more than one active change folder**, stop before archive even when one was explicitly selected: the merge would carry the other too. Name the folders and ask the user, [as options](../explore/references/asking-the-user.md): ship the selected change alone by moving the other out of the branch *(Recommended)*, or ship both together on purpose. Require `openspec/changes/$CHANGE_NAME/` to exist, and keep `CHANGE_NAME` fixed through archive and checkpoint.

**Read its `tasks.md` before you archive anything.** Unchecked tasks (`- [ ]`) mean the change is not finished: invoke the [`apply` skill](../apply/SKILL.md) for that exact change, let it hand completion to `/save`, then re-read the file. Archive only when every task is checked. Never let this runbook's authorization answer the archive step's incomplete-task confirmation. If `/apply` ends with tasks pending, report that work and stop.

Follow the shared [CLI contract](../plan/references/openspec-cli.md). Read `openspec status --change "$CHANGE_NAME" --json` and require its schema-defined artifacts to be complete or deliberately skipped. Run `openspec validate "$CHANGE_NAME" --strict --no-interactive`; stop on failure. Read `openspec instructions archive --change "$CHANGE_NAME" --json` for any applicable context. Run `openspec archive "$CHANGE_NAME" --yes` only after the task check, validation, and the distillation below. If `/save` already synced the deltas and equality is confirmed, `--skip-specs` avoids a second main-spec edit; otherwise the CLI archives and syncs them. Capture the archive path and verify exactly one `openspec/changes/archive/*-$CHANGE_NAME/` exists. Do **not** commit the move here.

### Distill the change's facts into the wiki

Before the archive, read the change's live facts:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" show "$CHANGE_NAME"
```

Keep only **reusable process facts**: a convention or pitfall that applies to future work, not this change's specifics. Edit the wiki page that owns each one, under [the wiki rules](../../rules/wiki.md). Append one Decision-log line naming the pages changed, or `no reusable fact`. When the store does not answer, log that the step was skipped and continue. The edits ride in the archive checkpoint, so a person reviews them in this PR. No other step writes the wiki automatically.

## Step 3 — delegate the checkpoint to /save

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim.** Hand it the exact `CHANGE_NAME` and archive path. `/save` owns the commit, push, PR body, and CI wait; `/ship` implements none of it. Consume its final result:

- `SUCCESS` → proceed. `NONE` → proceed; invoking `/ship` is the PR-review approval where no checks exist.
- `UNKNOWN`, `TIMEOUT`, or `FAILURE` → stop before merge and report `/save`'s reason. Do not repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**Invoke the `verify` skill once** and follow it verbatim. Never skip it, and never re-run it for a better verdict. If the repo has no `verify` skill, say so in one line and go to Step 5; never install it.

- `SUCCESS`, `NONE`, `UNKNOWN`, `TIMEOUT` → report it and continue to the merge.
- `FAILURE`, after `/verify`'s own fix attempts → **stop and ask the user** as [a two-option question](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): fix the failure first *(Recommended)*, or merge anyway and record that the walk failed.

If the walk's fix loop advanced `HEAD`, its own delegated `/save` already gated the new commit. Confirm that result is `SUCCESS` or `NONE`, and merge that commit.

## Step 5 — merge (worktree-safe)

Merge the gated commit via the API, confirm the merge, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`**: it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
SHA=$(git rev-parse HEAD)   # the commit /save gated
DEFAULT=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name) && [ -n "$DEFAULT" ] || exit 1
gh pr merge --squash --match-head-commit "$SHA" || exit 1
[ "$(gh pr view --json state --jq .state)" = MERGED ] || exit 1
# Retarget anything stacked on this branch BEFORE deleting it (see below):
for n in $(gh pr list --state open --base "$BRANCH" --json number --jq '.[].number'); do
  gh api -X PATCH "repos/:owner/:repo/pulls/$n" -f base="$DEFAULT" --jq '.number' || exit 1
done
# GitHub may have deleted the branch at merge: exit 2 means already gone; any other failure stops.
git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; rc=$?
case $rc in
  0) git push origin --delete "$BRANCH" || exit 1 ;;
  2) echo "$BRANCH was already deleted at merge" ;;
  *) exit 1 ;;
esac
```
**Any failure stops here**, and the branch and the PR stay as they are: no default branch name, a refused merge, a state other than `MERGED`, a failed retarget, or a failed `ls-remote`. Report the exact `gh` error. A failed merge deletes nothing.

**Retarget before you delete, always.** Deleting a branch that an open PR uses as its base **closes that PR**, and GitHub will not reopen it or retarget it. Do not rely on GitHub's auto-retarget: the delete races it, with no completion signal. Name every PR you retargeted in the report.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent**, then invoke ordinary `/save` again so the merge commit gets the same gate. Retry the merge only on its `SUCCESS` or `NONE`. Other failure (branch protection, draft, a head that moved after the gate) → surface the exact `gh` error.

## Step 6 — sync the durable checkout

Bring the checkout that has `main` out up to the merged commit:

```bash
git fetch origin --prune                  # refresh origin/main; drop the deleted branch's ref
MAIN_WT=$(git worktree list --porcelain \
  | awk '/^worktree /{p=$2} /^branch refs\/heads\/main$/{print p}')

if [ -n "$MAIN_WT" ]; then
  # some checkout has main out — fast-forward it there, but only if it is clean
  [ -z "$(git -C "$MAIN_WT" status --porcelain)" ] && git -C "$MAIN_WT" merge --ff-only origin/main
else
  # nothing has main out — advance the ref in place, without switching branches
  git fetch origin main:main
fi
```

Ask **which checkout has `main` out**, not whether you are in a worktree. **Any obstacle skips, in one line**: a dirty target checkout, a diverged `main`, or a refused `merge --ff-only` leaves that checkout alone, with the reason in the report. The PR is already merged, so **nothing after Step 5 can fail the ship**. Never check out, switch, stash, reset, or force a branch to make the sync succeed, and never delete a local branch.

## Step 7 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch, and `openspec/specs/` holds the synced result.
- **Checkpoint** — `/save` result and CI outcome, including auto-fix pushes.
- **Walk** — the verdict, the evidence comment link, and, when a `FAILURE` was merged anyway, that the user chose to. Where the skill was absent, one line saying so.
- **Retargeted** — any pull request moved to the default branch before the branch was deleted.
- **Branch** — deleted, or already deleted at merge by GitHub.
- **Synced** — the checkout whose `main` advanced to the merged commit, or the one-line reason the sync was skipped.

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): normally start the next change, walk the merged app, or stop here. A ship that stopped before the merge closes with the supported ways to clear the blocker instead.
