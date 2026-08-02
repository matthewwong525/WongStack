---
name: ship
description: Ship the current branch — open or update a PR, wait for all GitHub checks to pass when present (auto-fixing CI failures), walk the change's own OpenSpec scenarios against the deployed staging preview when the repo opted in (Playwright, screenshots and video, evidence as a PR comment), squash-merge to the default branch, then archive the OpenSpec change (/opsx:archive) so the archived spec becomes the record of what shipped. Does NOT build locally — CI is the gate when present, else PR review, and the walkthrough exercises what CI already deployed. Stops after archive. Use when you're done iterating on a branch and want it shipped.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the push, merge, and archive in Steps 3–5 — don't re-prompt. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **merge + archive** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, then squash-merges the code. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/dream` for that).

`/ship` merges through the [gate ladder](../../../wiki/development/the-change-loop.md#the-gate): CI when the repo has checks (Step 4), then the staging walkthrough where the repo opted into it ([Step 4.5](#step-45--walk-staging-only-if-this-repo-opted-in)), then the merge. A rung a repo doesn't have is skipped, never failed. Never build/test locally.

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

**Follow [`../save/references/git-gate.md`](../save/references/git-gate.md) § 1** — the PR runbook `/save` and `/ship` share. Where a PR is already open, leave the body alone (`/save` already mirrored the change into it); where `/ship` creates the PR itself, the runbook's change-mirror body makes it a readable handoff even though `/save` was skipped.

## Step 4 — wait for CI green if present (auto-fix on failure)

**Follow [`../save/references/git-gate.md`](../save/references/git-gate.md) § 2** — wait on checks, read-fix-repush on red under a cap of 3. Its result table states `/ship`'s outcomes directly, including the two that stop this skill: **never merge on `UNKNOWN` or `TIMEOUT`** — unverified is not the same as no checks, and merging on one is exactly how a red branch reaches the default branch.

On **SUCCESS** or **NONE** (no checks — the PR review is the gate; invoking `/ship` is the approval) → Step 4.5.

## Step 4.5 — walk staging (only if this repo opted in)

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" preflight
```

**`RESULT: NONE` → go straight to Step 5.** Say nothing. This repo never opted in, and the promise the opt-in makes is that it costs nothing — not a warning, not a nudge, not a line of output. Most repos land here and the step is over in milliseconds.

On **`RESULT: READY`** (which also prints `APP_DIR`, `URL`, `RUN_DIR`, `SHA`), **follow [`references/walkthrough.md`](references/walkthrough.md)** — it owns how a walk is performed: scouting the change's scenarios, writing the journeys, running them, grading each against its written `THEN`, recovering from a failure, and posting the evidence. Come back here for what the verdict does to the merge.

### Verdicts

| Verdict | Meaning | What `/ship` does |
|---|---|---|
| **NONE** | not opted in | proceed, silently |
| **NONE** | opted in, nothing browser-observable | proceed, one line saying why |
| **SUCCESS** | every journey satisfied its `THEN` | post the evidence comment, then Step 5 |
| **FAILURE** | a journey contradicted its `THEN` | **do not merge** — recover, then re-walk |
| **UNKNOWN** | the walk could not run or could not be trusted | **do not merge.** Report and stop |
| **TIMEOUT** | the walk exceeded its budget | **do not merge.** Report and stop |

**`UNKNOWN` is not `NONE`.** Once a repo has opted in, a walk that cannot run is *unverified*, not *absent* — the same distinction this runbook already draws for an unaskable CI check. The Access challenge is the case that matters most: without the check, a walk screenshots a login form and a grader could read "a page rendered" as a pass. The script exits `UNKNOWN` on it by name.

**On FAILURE** — reset staging, fix, re-push, and re-run **Step 4** then **Step 4.5**, per the reference's recovery section. These attempts share Step 4's **cap of 3**; they are not a second budget. Never merge on a red walk.

**On SUCCESS** — post the evidence comment and clean up the run directory, per the reference. Then Step 5.

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
- **Walkthrough** — the verdict and how many journeys were walked, plus the PR comment link. Omit this line entirely when the repo never opted in; say "not walkable (no browser-observable scenarios)" when it opted in and there was nothing to walk.

## Hard rules
- Never ship onto a red default branch (when it has checks). **Never merge on an `UNKNOWN` check result** — unverified is not the same as no checks. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. Never build/test locally — CI is the gate when present, else PR review.
- **The walkthrough is opt-in and detected, never configured.** `playwright` in the app's `devDependencies` *is* the consent — there is no manifest field and no flag. Absent → Step 4.5 is silent and `/ship` behaves exactly as it did before it existed.
- **Never merge on a walkthrough `UNKNOWN` or `TIMEOUT`**, for the same reason as an unknown check: once a repo has opted in, a walk that couldn't run is unverified, not absent.
- **Never install anything** to make the walkthrough run — not playwright, not a browser, not on a prompt. A missing dependency is a statement about what the repo chose, or a condition to report. **Never write inside the repo**: journeys, screenshots and video live in the temp run directory and leave with it, so the working tree is unchanged whatever the verdict.
- **Reset staging only on a failed walk**, and always before the retry. A passing walk leaves its data where it is.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- No GitHub summary issue and no docs distillation — the archived spec is the record; `/dream` handles the wiki.
