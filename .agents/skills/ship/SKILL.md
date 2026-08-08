---
name: ship
description: Ship the current branch — verify the default branch, archive the OpenSpec change (/opsx:archive), delegate the one commit/push/PR/CI checkpoint to /save, then squash-merge and delete the remote branch worktree-safely. Does NOT build locally and does NOT test — CI is the gate when present, else PR review. Want to see the change driven in a browser first? That's /walk, which gates nothing and is invoked separately. Use when you're done iterating on a branch and want it shipped, merged, and archived.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the archive, delegated `/save` checkpoint, merge, and remote-branch deletion below — don't re-prompt. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **archive + merge** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, invokes `/save --shipping <name>` so the archive and code receive one pushed PR/CI checkpoint, then squash-merges that exact commit. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/dream` for that).

`/ship` merges through the [gate ladder](../../../wiki/development/the-change-loop.md#the-gate): its delegated `/save` call returns the branch gate result, then `/ship` merges only on `SUCCESS` or `NONE`. A rung a repo doesn't have is skipped, never failed. Never build/test locally.

Deeper code review (cleanliness, broad consolidation, downstream breakage) happens **out-of-band** — PR review, or a dedicated code-review pass — not as a `/ship` gate; `/ship` is the merge, not the review. Likewise seeing the change work in a browser: that's [`/walk`](../walk/SKILL.md), invoked when you want it, gating nothing here.

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
- On the default branch → **stop** (`/ship` runs on a feature branch).
- Clean tree and 0 commits ahead → **stop** (there is nothing to ship). A dirty feature branch with 0 commits is valid: the delegated `/save` checkpoint below will create its first commit.
- Default branch's CI is `failure` → **stop**; fix it first (`ok`/empty = proceed).
- Record `BRANCH=$(git rev-parse --abbrev-ref HEAD)`. Do not commit, push, open a PR, or wait on branch checks here; those are `/save`'s single checkpoint after the archive move.

## Step 2 — archive the change (/opsx:archive)

The change is named like the current branch. Require `openspec/changes/$BRANCH/` to exist; if it does not, stop and direct the user to `/save` so the missing handoff is authored before shipping. Do not ship a branch with no change record.

**Invoke the `openspec-archive-change` skill** (via the Skill tool) for `$BRANCH`. That skill is OpenSpec's `/opsx:archive`: it moves `openspec/changes/<name>/` → `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing any un-synced delta specs into `openspec/specs/` first. Capture the exact archive path it reports and verify exactly one `openspec/changes/archive/*-$BRANCH/` exists. Do **not** commit the move here.

## Step 3 — delegate the checkpoint to /save

**Invoke the `save` skill exactly once as `/save --shipping "$BRANCH"` and follow it verbatim.** Shipping context uses the explicit archive as the handoff, preserves and redacts named session secrets, captures the note, stages the implementation plus archive move, commits, pushes, creates or updates the PR body from the archive, and waits/auto-fixes CI. It never recreates an active change.

Consume its exact final result:

- `SHIP_GATE_RESULT=SUCCESS` → proceed.
- `SHIP_GATE_RESULT=NONE` → proceed; invoking `/ship` is the PR-review approval where no checks exist.
- `SHIP_GATE_RESULT=UNKNOWN`, `TIMEOUT`, or `FAILURE` → stop before merge and report `/save`'s reason. Do not repeat, bypass, or reinterpret the gate.

`/ship` contains no separate dirty-tree commit, push, PR, preview, branch-CI wait, or auto-fix implementation. `/save` owns that logic for both ordinary and shipping checkpoints.

## Step 4 — merge (worktree-safe)

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
git push origin --delete "$BRANCH"
```
The squash carries the archived change onto the default branch.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent**, then invoke `/save --shipping "$BRANCH"` again so the changed merge commit receives the same checkpoint and gate. Retry the merge only on its `SUCCESS` or `NONE`. Other failure (branch protection, draft) → surface the exact `gh` error.

## Step 5 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch (`openspec list` no longer shows it; `openspec/specs/` holds the synced result).
- **Checkpoint** — `/save` result, CI outcome (including auto-fix pushes), and any non-secret follow-ups.

## Hard rules
- Never ship onto a red default branch (when it has checks). **Never merge on an `UNKNOWN` check result** — unverified is not the same as no checks. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. Never build/test locally — CI is the gate when present, else PR review.
- **Never implement checkpoint mechanics.** Archive first, then delegate once to `/save --shipping`; merge only on its `SUCCESS` or `NONE` result.
- **Never walk, and never require a walk.** Driving the app in a browser is [`/walk`](../walk/SKILL.md)'s job, it gates nothing, and `/ship` neither runs it nor checks whether it ran. Don't nudge about a missing walk.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- No GitHub summary issue and no docs distillation — the archived spec is the record; `/dream` handles the wiki.
