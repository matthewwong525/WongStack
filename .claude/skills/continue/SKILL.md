---
name: continue
description: Resume work from a saved GitHub issue or PR. Use whenever you want to continue, resume, pick up, or rehydrate a thread from an issue/PR number or URL — typically a handoff issue written by /save. Loads the issue body (the current plan), checks out the branch, then continues. Accepts an optional explicit instruction after the reference (/continue <number> <instruction>) to steer what gets done; without one it picks up the plan. Pairs with /save.
user-invocable: true
---

# /continue

Rehydrate a fresh session from a saved handoff issue. **The issue body is the plan** (written by `/save`) — load it, check out the branch, continue. `/continue` is read-only on GitHub: it trusts the body as the spine and doesn't reload the diff/commits/reviews (keeping the body current is `/save`'s job).

### 1. Parse `/continue <number-or-url> [instruction]`

- **First token** = the reference (issue/PR **number** or **URL**).
- **Anything after** = an explicit instruction that steers step 4 (e.g. `/continue 42 rebase onto main and fix the failing test`), overriding the default "work the plan". A bare reference is normal.
- Nothing passed → ask for the issue/PR number and stop.

### 2. Resolve the plan + branch

- **URL** → `/issues/N` = issue, `/pull/N` = PR.
- **Bare number** (issues/PRs share a number space) → try PR first, fall back to issue:
  ```bash
  gh pr view <N> --json number,url,title,state 2>/dev/null && echo "→ PR" \
    || { gh issue view <N> --json number,url,title,state >/dev/null 2>&1 && echo "→ issue"; }
  ```
- **Issue** → its body is the plan; branch + PR are in the `**Links**` footer (`gh issue view <N> --json title,body,url,state`).
- **PR** → load the body of the issue it closes as the plan; branch = `headRefName` (`gh pr view <N> --json headRefName,body,closingIssuesReferences`). Use `closingIssuesReferences`, or parse `Closes #M` from the body.

Only one side existing (a save with no PR yet) is fine — load the plan, no branch to check out.

### 3. Check out the branch

```bash
git rev-parse --abbrev-ref HEAD     # where am I
git status --porcelain              # clean?
```
- Clean + branch elsewhere → `gh pr checkout <M>` (or `git checkout <branch>` from the footer).
- In a worktree the branch may be checked out elsewhere — if checkout fails for that, say so and proceed read-only.
- Dirty tree → don't switch; surface it and ask. No PR/branch yet → stay put.

### 4. Orient and continue

Tight recap: **the plan** (2–4 lines: what + where it stands) and **state** (branch + PR + issue as clickable markdown links). Then: explicit instruction → do that (plan is the backdrop); otherwise work the plan from its first unfinished step. To checkpoint again, `/save` (updates the same issue).

**Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.**
