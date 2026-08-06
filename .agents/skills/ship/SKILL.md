---
name: ship
description: Ship the current branch — open or update a PR, wait for all GitHub checks to pass when present (auto-fixing CI failures), squash-merge to the default branch, then archive the OpenSpec change (/opsx:archive) so the archived spec becomes the record of what shipped. Does NOT build locally and does NOT test — CI is the gate when present, else PR review. Want to see the change driven in a browser first? That's /walk, which gates nothing and is invoked separately. Stops after archive. Use when you're done iterating on a branch and want it shipped, merged, and archived.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the push, merge, and archive in Steps 3–5 — don't re-prompt. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **merge + archive** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, then squash-merges the code. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/dream` for that).

`/ship` merges through the [gate ladder](../../../wiki/development/the-change-loop.md#the-gate): CI when the repo has checks (Step 4), then the merge. A rung a repo doesn't have is skipped, never failed. Never build/test locally.

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
- On the default branch, or 0 commits ahead → **stop** (`/ship` runs on a feature branch with commits).
- Default branch's CI is `failure` → **stop**; fix it first (`ok`/empty = proceed).
- Dirty tree → auto-commit, don't prompt (stage code + `openspec/` by path, never `git add .`; repo-style message + `Co-Authored-By: Claude`).

## Step 2 — archive the change (/opsx:archive)

The change is named like the current branch. **Invoke the `openspec-archive-change` skill** (via the Skill tool) for `<branch>`. That skill is OpenSpec's `/opsx:archive`: it moves `openspec/changes/<name>/` → `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing any un-synced delta specs into `openspec/specs/` first. (`/save` normally synced already, so this is usually a no-op check.)

Commit the archive move on the branch so it ships with the code:
```bash
git add openspec/ && git commit -m "$(printf 'chore(openspec): archive <name>\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```
No active change on this branch → skip Step 2 with a note (nothing to archive).

## Step 3 — open or update the PR

**Follow [`../save/references/git-gate.md`](../save/references/git-gate.md) § 1** — the PR runbook `/save` and `/ship` share. Where a PR is already open, leave the body alone (`/save` already mirrored the change into it); where `/ship` creates the PR itself, the runbook's change-mirror body makes it a readable handoff even though `/save` was skipped.

## Step 4 — wait for CI green if present (auto-fix on failure)

**Follow [`../save/references/git-gate.md`](../save/references/git-gate.md) § 2** — wait on checks, read-fix-repush on red under a cap of 3. Its result table states `/ship`'s outcomes directly, including the two that stop this skill: **never merge on `UNKNOWN` or `TIMEOUT`** — unverified is not the same as no checks, and merging on one is exactly how a red branch reaches the default branch.

On **SUCCESS** or **NONE** (no checks — the PR review is the gate; invoking `/ship` is the approval) → Step 5.

## Step 5 — merge (worktree-safe)

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
git push origin --delete "$BRANCH"
```
The squash carries the archived change onto the default branch.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent** from both sides; `git add` → `git commit` → `git push` → re-run Step 4 → retry once green. Other failure (branch protection, draft) → surface the exact `gh` error.

## Step 6 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch (`openspec list` no longer shows it; `openspec/specs/` holds the synced result).
- **CI** — green (note N auto-fix pushes if any), and any follow-ups (a flag, a manual step, a secret).

## Hard rules
- Never ship onto a red default branch (when it has checks). **Never merge on an `UNKNOWN` check result** — unverified is not the same as no checks. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. Never build/test locally — CI is the gate when present, else PR review.
- **Never walk, and never require a walk.** Driving the app in a browser is [`/walk`](../walk/SKILL.md)'s job, it gates nothing, and `/ship` neither runs it nor checks whether it ran. Don't nudge about a missing walk.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- No GitHub summary issue and no docs distillation — the archived spec is the record; `/dream` handles the wiki.
