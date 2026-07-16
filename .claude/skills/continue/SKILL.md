---
name: continue
description: Resume an OpenSpec change on any machine and pick the work back up. Use whenever you want to continue, resume, or rehydrate a change — by change name (which is also the branch name), PR number, or from the openspec list menu when given no argument. Checks out the branch, loads the change (proposal + tasks + the last Decision-log entries so you inherit the why), runs a counts-only drift check, then hands off to /apply to implement. Accepts an optional instruction after the reference to steer what gets done. Pairs with /save.
user-invocable: true
---

# /continue

Rehydrate a change on any machine and pick the work back up. The plan lives in `openspec/changes/<name>/` — `**Status:**` + the plan sections are *what* to do, the `## Decision log` is *why* it's shaped that way, `tasks.md` is the checklist. `/continue` loads it, checks out the branch, then hands off to `/apply` (which fronts OpenSpec's **apply** step). This is WongStack's `/continue` (resume + implement), *not* OpenSpec's spec-drafting stepper.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
```

It trusts the change as the source of truth — it does **not** reload the PR diff or review threads wholesale (`/save` keeps the change current). A cheap **counts-only drift check** (step 4) flags when reality has moved past the change.

**Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.** By convention **branch name = change name**.

> **OpenSpec never runs git — this skill owns it.** `openspec show`/`openspec list` only read `openspec/`; the `git`/`gh` checkout is here.

### 1. Parse `/continue [handle] [instruction]`

- **First token** = the handle: a **change name**, a **PR number**, or empty.
- **Anything after** = an explicit instruction that steers step 4 (e.g. `/continue add-auth rebase onto main first`), overriding the default "work the tasks". A bare handle is normal.
- **No handle** → run `openspec list` and let the user pick from active changes (use the AskUserQuestion tool). For each option, show the change's **`Status:`** line (from its `proposal.md` header) alongside the name and task progress, so "what can I pick up?" is answerable from the menu. Don't guess.

### 2. Resolve the change + branch

- **Change name** (matches `openspec/changes/<name>/` or an `openspec list` entry) → branch = that name.
- **PR number** → branch = `gh pr view <N> --json headRefName --jq .headRefName`; the change name is that branch.
- **Bare number that matches *both* a PR and an `openspec list` index** → ambiguous; ask which they mean before proceeding.

It's fine if only one side exists (a save with no PR yet) — load the change; there's just no PR link to show.

### 3. Check out the branch

```bash
git rev-parse --abbrev-ref HEAD     # where am I
git status --porcelain              # clean?
git fetch origin                    # a handed-off branch may exist only on the remote
```
- Clean → `git checkout <name>` (git creates a local branch tracking `origin/<name>` when it only exists on the remote — this is the fresh-clone handoff case), or `gh pr checkout <N>` which fetches too.
- In a worktree the same branch can't be checked out twice — if checkout fails because it's active in another worktree, say so and proceed read-only.
- Dirty tree → don't switch; surface it and ask. Branch doesn't exist anywhere (planned but never `/save`d) → stay on the current branch; `/save` will cut it.

### 4. Recap the journey, check drift, then apply

Give a tight recap so the user can confirm the loaded state — read from `openspec/changes/<name>/` (or `openspec show <name>`):

- **The change** — 2–4 lines (what the work is + where the tasks stand), plus its **`Status:`** line and any **open questions** from the proposal header.
- **The journey** — the last 1–3 entries of the proposal's `## Decision log`, so you inherit the *why* (decisions made, dead ends ruled out, blockers) — not just the plan.
- **State** — branch checked out + PR link (as clickable markdown).
- **Drift check** — the change is the spine; verify it isn't stale. Report **counts only** (don't load diffs or threads unless asked):
  ```bash
  git log origin/main..HEAD --oneline | wc -l   # commits on the branch (vs how tasks.md reads)
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Fold it into the recap as one line — e.g. *"7 commits on the branch, 3/9 tasks unchecked, 2 unresolved review comments"*. If the commit count looks ahead of what `tasks.md` says (work landed without a `/save`), or there are unresolved review comments, flag it so the user can reconcile first.

Then continue:
- **Explicit instruction given** (step 1) → do *that* (the change is the backdrop; reconcile the two, but let the instruction steer).
- **Otherwise** → **invoke the `apply` skill** (via the Skill tool) to work the tasks — it owns the implement loop (start the first unchecked `- [ ]` in `tasks.md`, check off `- [x]` as tasks land, pause on ambiguity).

To checkpoint again, `/save` (maintains the change surface + syncs specs + pushes + preview). When every task is done, `/ship` (merges + archives).

## Notes
- The change (`proposal.md` + `tasks.md`) is the plan and the source of intent. `/continue` reads it, checks out the branch, and hands to `/apply` — nothing more.
- Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.
