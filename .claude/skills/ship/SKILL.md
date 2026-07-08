---
name: ship
description: Ship the current branch — open or update a PR, wait for all GitHub checks to pass when present (auto-fixing CI failures), squash-merge to the default branch, then archive the OpenSpec change (/opsx:archive) so the archived spec becomes the record of what shipped. Does NOT build locally — CI is the gate when present, else PR review. Stops after archive. Use when you're done iterating on a branch and want it shipped.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the push, merge, and archive in Steps 3–5 — don't re-prompt. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **merge + archive** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, then squash-merges the code. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/document` for that). CI is the gate when the repo has checks: we push, wait, and on red read-fix-repush until green, then merge. No checks configured → the PR review is the gate; merge once approved. Never build/test locally.

Deeper code review (cleanliness, broad consolidation, downstream breakage) happens **out-of-band** — PR review, or a dedicated code-review pass — not as a `/ship` gate; `/ship` is the merge, not the review.

> `main` stands for the repo's default branch — substitute whatever `git symbolic-ref refs/remotes/origin/HEAD` resolves to.

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

```bash
gh pr view --json number,state,url 2>/dev/null
```
- OPEN → `git push` (leave the body — `/save` already mirrored the change into it). None → `git push -u origin HEAD` + `gh pr create`; use the same **change-mirror body** `/save` writes (Summary + **Status** + Tasks + Preview + a `/continue` handoff footer) so the PR is a readable handoff even when `/save` was skipped. MERGED/CLOSED → stop and ask.

## Step 4 — wait for CI green if present (auto-fix on failure)

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
- **SUCCESS** / **NONE** (no checks — the PR review is the gate; invoking `/ship` is the approval) → Step 5.
- **FAILURE** → read the log, fix, re-push, re-wait (**cap 3; never ship red**):
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```
- **TIMEOUT** → don't merge; report checks still running and stop.

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
- Never ship onto a red default branch (when it has checks). Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. Never build/test locally — CI is the gate when present, else PR review.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- No GitHub summary issue and no docs distillation — the archived spec is the record; `/document` handles docs.
