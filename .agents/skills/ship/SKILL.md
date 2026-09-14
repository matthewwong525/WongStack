---
name: ship
description: Ship the current branch — archive the OpenSpec change, delegate the one commit/push/PR/CI checkpoint to /save, walk the deployed preview for evidence, squash-merge and delete the remote branch worktree-safely, then fast-forward the durable checkout's default branch to the merge. Given an intent (/ship <intent>), it first pulls in /apply — and through it /plan and /explore's question round — so one invocation carries a task from idea to merge. Never merges as a way of stopping. Does NOT build or test locally: CI is the gate when present, else PR review. Use when you want work shipped, merged, and archived.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the archive, the delegated `/save` checkpoint, the walk, the merge, the remote-branch deletion, and the post-merge sync below — don't re-prompt. Invoking it **with an intent** (`/ship <intent>`) also authorizes the [pulled-in stage](#the-pull-in-ship-intent): explore, plan, implement, and their saves, with no re-prompt between stages. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **archive + merge** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, invokes ordinary `/save` exactly once so the archive and code receive one pushed PR/CI checkpoint, walks the preview for evidence, then squash-merges that exact commit. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/dream` for that).

The merge rides the [gate ladder](../../../wiki/development/the-change-loop.md#the-gate) and nothing else: merge only on `/save`'s `SUCCESS` or `NONE`, and a rung the repo lacks is skipped, never failed. `/ship` is the merge, not the review — cleanliness, consolidation, and downstream breakage belong in PR review.

> `main` stands for the repo's default branch — **assume it**. Every repo `/wong-setup` creates is on `main`, and `git symbolic-ref refs/remotes/origin/HEAD` fails on a freshly created one. Only where `main` doesn't exist, resolve the real name with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` and substitute it.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- On the default branch → **stop**, unless an intent was given (`/ship` runs on a feature branch).
- Clean tree and 0 commits ahead → **stop**, unless an intent was given (there is nothing to ship). A dirty feature branch with 0 commits is valid: the delegated `/save` below will create its first commit.
- Default branch's CI is `failure` → **stop**; fix it first (`ok`/empty = proceed). An intent does **not** override this one.
- Record `BRANCH=$(git rev-parse --abbrev-ref HEAD)`. Do not commit, push, open a PR, or wait on branch checks here — those are `/save`'s single checkpoint after the archive move.

### The pull-in: `/ship <intent>`

**When an intent was given *and* either stop condition above holds** — on the default branch, or a clean tree with 0 commits ahead — there is nothing to ship *yet*, so make it: **invoke the [`apply` skill](../apply/SKILL.md) with the argument verbatim**, then **re-run this preflight** on the branch `/save` created and continue to Step 2.

Pass the argument through untouched. `/apply` resolves what it means under its own rules, invokes [`/plan`](../plan/SKILL.md) — and therefore [`/explore`](../explore/SKILL.md)'s question round — when no apply-ready change exists, works the tasks, and hands completion to `/save`. `/ship` resolves nothing itself and adds no planning, implementation, or git behavior of its own.

This is the loop's one rule, applied one verb further out: **when a verb's precondition is missing, it invokes the verb before it to produce it** — `/ship` → `/apply` → `/plan` → `/explore`. [The change loop](../../../wiki/development/the-change-loop.md) owns the rule.

- **Bare `/ship`** keeps every stop above exactly as before. A merge is never started by inference — only an explicit intent begins the chain.
- **A feature branch that already has work** (commits ahead or a dirty tree) runs the ordinary runbook; the pull-in doesn't fire, whether or not an intent was given.

**Never merge as a way of stopping.** If `/plan` pauses on unclear intent, `/apply` ends with tasks pending, or any `/save` inside the chain returns a failing or unverifiable result, **report that blocker and stop before Step 2**. Do not archive, checkpoint, or merge a partial change. The chain either reaches a complete implementation or it reports why it didn't.

## Step 2 — archive the change (/opsx:archive)

The change is named like the current branch. Require `openspec/changes/$BRANCH/` to exist; if it does not, stop and direct the user to `/save` so the missing handoff is authored before shipping. Do not ship a branch with no change record.

**Invoke the `openspec-archive-change` skill** (via the Skill tool) for `$BRANCH`. That skill is OpenSpec's `/opsx:archive`: it moves `openspec/changes/<name>/` → `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing any un-synced delta specs into `openspec/specs/` first. Capture the exact archive path it reports and verify exactly one `openspec/changes/archive/*-$BRANCH/` exists. Do **not** commit the move here.

## Step 3 — delegate the checkpoint to /save

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim.** It recognizes the single archived change matching the current branch as its handoff, redacts named session secrets, captures the note, stages the implementation plus archive move, commits, pushes, regenerates the PR body from the archive, and waits/auto-fixes CI. It never recreates an active change, and `/ship` implements none of that itself.

Consume its exact final result:

- `SUCCESS` → proceed. `NONE` → proceed; invoking `/ship` is the PR-review approval where no checks exist.
- `UNKNOWN`, `TIMEOUT`, or `FAILURE` → stop before merge and report `/save`'s reason. Do not repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**If this repo has the `verify` skill, invoke it once** and follow it verbatim. It scouts first, so a change with nothing any probe can reach costs nothing; when there are journeys it drives them against the commit `/save` just published and posts the evidence to the PR.

**No `verify` skill** (a repo that hasn't synced since the verb landed) → say so in one line and go to Step 5. A rung the repo lacks is skipped, never failed — and never installed to repair it.

- `SUCCESS`, `NONE`, `UNKNOWN`, `TIMEOUT` → report it and continue to the merge.
- `FAILURE`, after `/verify`'s own two fix attempts → **stop and ask the user**: fix, or merge anyway.

**The verdict is not a rung.** An unrunnable walk never blocks a merge — the property whose absence made the old walk-*gate* worth removing. A `FAILURE` pause is a decision surfaced to the user, not a gate applied to them: *merge anyway* is a first-class answer, and the report records that it was taken.

If the walk's fix loop advanced `HEAD`, its own delegated `/save` already re-gated the new commit — confirm that result is `SUCCESS` or `NONE`, and merge that commit.

## Step 5 — merge (worktree-safe)

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
# Retarget anything stacked on this branch BEFORE deleting it (see below):
for n in $(gh pr list --state open --base "$BRANCH" --json number --jq '.[].number'); do
  gh api -X PATCH "repos/:owner/:repo/pulls/$n" -f base=main --jq '.number'
done
git push origin --delete "$BRANCH"
```
The squash carries the archived change onto the default branch.

**Retarget before you delete, always.** Deleting a branch that an open PR still uses as its base **closes that PR**, and the loss is unrecoverable: GitHub will not reopen a PR whose base branch is gone, nor retarget a closed one. Do not rely on GitHub's own auto-retarget — the delete races it, and the race has no completion signal to wait on. Name every PR you retargeted in the report.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent**, then invoke ordinary `/save` again so the changed merge commit receives the same checkpoint and gate. Retry the merge only on its `SUCCESS` or `NONE`. Other failure (branch protection, draft) → surface the exact `gh` error.

## Step 6 — sync the durable checkout

The merge moved `main` on the remote, and the delete made `origin/$BRANCH` stale. Bring the checkout that owns `main` up to the commit you just merged:

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

Ask **which checkout has `main` out**, not whether you are in a worktree — a primary checkout parked on some other branch is neither shape. Worktrees share the object store, so the one `git fetch` above already refreshed `origin/main` for every sibling; the merge needs no network.

**Any obstacle skips, and the skip is one line.** A dirty target checkout, a diverged `main`, a `merge --ff-only` that refuses — leave that checkout alone and say why in the report. The pull request is already merged, so **nothing after Step 5 can fail the ship**. Never check out, switch, stash, reset, or force a branch to make the sync succeed, and never delete a local branch.

## Step 7 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch (`openspec list` no longer shows it; `openspec/specs/` holds the synced result).
- **Checkpoint** — `/save` result and CI outcome, including auto-fix pushes.
- **Walk** — the verdict, the evidence comment link, and — when a `FAILURE` was merged anyway — that the user chose to. Where the skill was absent, one line saying so.
- **Retargeted** — any pull request moved to the default branch before the branch was deleted.
- **Synced** — the checkout whose `main` advanced to the merged commit, or the one-line reason the sync was skipped.

## Hard rules
- Never ship onto a red default branch (when it has checks). **Never merge on an `UNKNOWN` check result** — unverified is not the same as no checks. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. **Never build or test locally** — CI is the gate when present, else PR review; the app's own suite runs there as an ordinary check.
- **Never implement checkpoint mechanics.** Archive first, then delegate once to ordinary `/save`; merge only on its `SUCCESS` or `NONE` result.
- **Never merge as a way of stopping.** A pulled-in `/plan` that pauses, an `/apply` that ends with tasks pending, or a chain `/save` that comes back failing or unverifiable stops `/ship` before the archive. A partial change is never archived, checkpointed, or merged. The two checkpoints of a one-go run — `/apply`'s completion save and this runbook's archive save — both stand; never collapse them.
- **The walk informs, never blocks.** Run it once, report every verdict, and let no verdict but a user-answered `FAILURE` change what happens next. Never skip it to save time, and never re-run it hunting a greener result.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- **Never delete a branch another open PR is based on.** Retarget dependents to the default branch first; a closed-by-deletion PR cannot be recovered.
- **The post-merge sync is fast-forward only, and never a gate.** It touches one other checkout, so it requires a clean tree there and skips with a reason on any obstacle. It deletes no local branch, and it cannot fail a ship that has already merged.
- No GitHub summary issue and no docs distillation — the archived spec is the record; `/dream` handles the wiki.
