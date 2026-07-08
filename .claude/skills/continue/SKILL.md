---
name: continue
description: Resume an OpenSpec change and pick up the work. Use whenever you want to continue, resume, or rehydrate a thread — by change name (which is also the branch name), a PR number/URL, or from the openspec list menu when given no argument. Loads the change (proposal + tasks) from openspec/changes/<name>/, checks out the branch, recaps the plan + the tail of its Decision log, runs a counts-only drift check, then hands off to /apply to work the tasks. Accepts an optional explicit instruction after the reference (/continue <name> <instruction>) to steer what gets done. Pairs with /save.
user-invocable: true
---

# /continue

Rehydrate a fresh session from a saved OpenSpec change and pick up the work. **The change is the plan** (written by `/save`): `openspec/changes/<name>/proposal.md` is the intent, `tasks.md` is the checklist. Load it, check out the branch, continue.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
 think      draft the  implement  push +    resume →    merge +
 (no git)   change     the tasks  PR +      /apply      archive
            (no git)   (no git)   preview
```

This skill trusts the change as the source of truth. It deliberately does **not** reload the PR diff or review threads wholesale — `/save` keeps the change current, so the change alone is the spine; a cheap **counts-only drift check** (step 4) flags when reality has moved past the change. By convention **branch name = change name**.

> **OpenSpec never runs git — this skill owns it.** `openspec show`/`openspec list` only read the `openspec/` folder; the `git`/`gh` checkout is here. Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.
>
> `main` stands for the repo's default branch — substitute whatever `git symbolic-ref refs/remotes/origin/HEAD` resolves to.

## Workflow

### 1. Parse the input

The input is a change reference, **optionally followed by an explicit instruction**:

```
/continue [name-or-PR] [instruction]
```

- **First token** = the handle — a **change name** (= branch name), a **PR number**, or a PR **URL** (e.g. `/continue add-auth`, `/continue 57`, `/continue https://github.com/owner/repo/pull/57`).
- **Everything after** (if anything) = an **explicit instruction** for what to do once the change is loaded — e.g. `/continue add-auth rebase onto main and fix the failing test`. Hold onto it for step 4; it overrides the default "work the tasks" behavior. Most calls are a bare handle — that's the normal case, and the tasks drive the work.
- **No handle at all** → run `openspec list` and let the user pick from active changes (use the **AskUserQuestion** tool). For each option, show the change's **`Status:`** line (read from its `proposal.md` header — `in-progress` / `blocked (<on what>)` / `ready-to-ship` / `parked`) alongside the name and task progress, so "what can I pick up?" is answerable from the menu. Don't guess.

### 2. Resolve the change and the branch

You need two things: the **change** (proposal + tasks) and the **branch** to check out.

- **Change name** (matches `openspec/changes/<name>/` or an `openspec list` entry) → branch = that name. Read it:
  ```bash
  openspec show <name>          # or read openspec/changes/<name>/proposal.md + tasks.md
  ```
- **PR number/URL** → the branch is the PR's `headRefName`, and the change is the folder named after that branch:
  ```bash
  gh pr view <N> --json headRefName,url,title,state
  ```
  Then read `openspec/changes/<headRefName>/`.
- **Bare number that matches both a PR and an `openspec list` index** → ambiguous; ask which they mean before proceeding.

It's fine if only one side exists (a save with no PR yet) — load the change; there's just no PR link to show.

### 3. Check out the branch

If there's a branch, the tree is clean, and it isn't already checked out:

```bash
git rev-parse --abbrev-ref HEAD     # where am I now
git status --porcelain              # is the tree clean
git fetch origin                    # a handed-off branch may exist only on the remote
```

- Clean tree, branch not checked out → `git checkout <name>` (git creates a local branch tracking `origin/<name>` when it only exists on the remote — the fresh-clone handoff case), or `gh pr checkout <N>` which fetches too.
- In a git worktree the branch may be checked out elsewhere — if checkout fails for that reason, tell the user and proceed read-only rather than forcing it.
- Dirty tree → **don't** switch branches; surface the dirty state and ask how to proceed.
- Change planned but never `/save`d (no branch anywhere) → stay on the current branch; `/save` will cut it.

### 4. Orient and continue

Give the user a tight recap so they can confirm the loaded state:

- **The change** — 2–4 lines summarizing it (what the work is + where the tasks stand), read from `openspec/changes/<name>/`, plus its **`Status:`** line and any **open questions** from the proposal header.
- **The journey** — the last 1–3 entries of the proposal's `## Decision log`, so the resumer inherits the *why* (decisions made, dead ends ruled out, blockers) and not just the plan.
- **State** — which branch is checked out and the PR link (as a markdown link so it stays clickable).
- **Drift check** — the change is the spine, but verify it isn't stale. Report **counts only** (don't load diffs or threads unless asked):
  ```bash
  git log origin/main..HEAD --oneline | wc -l   # commits on the branch (vs how tasks.md reads)
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Fold the result into the recap as one line — e.g. *"7 commits on the branch, 3/9 tasks unchecked, 2 unresolved review comments"*. If the commit count looks ahead of what `tasks.md` says (work landed without a `/save`), or there are unresolved review comments, flag that so the user can decide whether to reconcile first.

Then continue:

- **If an explicit instruction was passed** (step 1), do *that* — the change is the backdrop, the instruction is the task. Reconcile the two (e.g. "fix the failing test" → the tasks tell you which and why), but let the instruction steer.
- **Otherwise**, **invoke the `/apply` skill** (via the Skill tool) to work the tasks — it owns the implement loop (start the first unchecked `- [ ]` in `tasks.md`, check off `- [x]` as tasks land, pause on ambiguity).

From here it's an ordinary session with the change loaded; to checkpoint again, use `/save` (it updates the same change, keeping it equal to the latest plan). When every task is done, `/ship` (merges + archives the change).

## Notes

- The change (`proposal.md` + `tasks.md`) is the plan and the source of intent. `/continue` reads it and checks out the branch — nothing more.
- `/continue` **resumes and implements**; it is not OpenSpec's `/opsx:*` spec-drafting stepper. When you want to build, `/continue`.
