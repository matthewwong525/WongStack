---
name: continue
description: Resume work from a saved GitHub issue or PR. Use whenever you want to continue, resume, pick up, or rehydrate a thread from an issue/PR number or URL — typically a handoff issue written by /save. Loads the issue body (the current plan), checks out the branch, then continues. Accepts an optional explicit instruction after the reference (/continue <number> <instruction>) to steer what gets done; without one it picks up the plan. Pairs with /save.
user-invocable: true
---

# /continue

Rehydrate a fresh session from a saved handoff issue and pick up the work. **The issue body is the plan** (written by `/save`) — that's the context. Load it, check out the branch, continue.

This skill trusts the plan as the source of truth. It deliberately does **not** reload the PR diff, commits, or review threads — `/save` keeps the issue body pinned to the latest plan, so the body alone is the spine. Keeping the body current is *its* job; `/continue` is read-only on GitHub.

## Workflow

### 1. Parse the input

```
/continue <number-or-url> [instruction]
```

- **First token** = the reference — an issue/PR **number** or **URL** (`/continue 42`, `/continue https://github.com/owner/repo/pull/57`).
- **Everything after** (if anything) = an **explicit instruction** for what to do once the plan is loaded — e.g. `/continue 42 rebase onto main and fix the failing test`. Hold it for step 4; it overrides the default "work the plan" behavior. Most calls are a bare reference — that's normal, and the plan drives the work.
- If nothing was passed at all, ask for the issue or PR number and stop.

### 2. Resolve the plan and the branch

You need two things: the **plan** (issue body) and the **branch** to check out.

- **Reference is a URL** → the path tells you the kind: `/issues/N` → issue, `/pull/N` → PR.
- **Bare number** → issues and PRs share one number space. Try PR first, fall back to issue:
  ```bash
  gh pr view <N> --json number,url,title,state 2>/dev/null && echo "→ PR" \
    || { gh issue view <N> --json number,url,title,state >/dev/null 2>&1 && echo "→ issue"; }
  ```

Then get the plan and branch:
- **It's an issue** → its body **is** the plan. The branch and PR link are in the body's `**Links**` footer.
  ```bash
  gh issue view <N> --json title,body,url,state
  ```
- **It's a PR** → find the issue it closes and load *that* body as the plan; the branch is the PR's `headRefName`.
  ```bash
  gh pr view <N> --json headRefName,body,closingIssuesReferences
  ```
  Use `closingIssuesReferences` (populated by the `Closes #M` that `/save` writes), or parse `Closes #M` / `Part of #M` from the body.

It's fine if only one side exists (a save with no PR yet) — load the plan; there's just no branch to check out.

### 3. Check out the branch

```bash
git rev-parse --abbrev-ref HEAD     # where am I now
git status --porcelain              # is the tree clean
```

- Clean tree, branch not checked out → check it out so the code matches the plan: `gh pr checkout <M>` (or `git checkout <branch>` from the footer).
- In a git worktree the branch may be checked out elsewhere — if checkout fails for that reason, tell the user and proceed read-only rather than forcing it.
- Dirty tree → **don't** switch branches; surface the dirty state and ask how to proceed.
- No PR/branch yet → stay on the current branch.

### 4. Orient and continue

Give a tight recap so the user can confirm the loaded state:
- **The plan** — 2–4 lines (what the work is + where it stands).
- **State** — which branch is checked out, the PR link, the issue link (as markdown links so they stay clickable).

Then continue:
- **If an explicit instruction was passed** (step 1), do *that* — the plan is the backdrop, the instruction is the task. Reconcile the two, but let the instruction steer.
- **Otherwise**, work the plan — start on its first unfinished step, or ask which piece to take first if it's ambiguous.

From here it's an ordinary session with the plan loaded; to checkpoint again, use `/save` (it updates the same issue, keeping the body equal to the latest plan).

## Notes
- The issue body is the plan and the source of intent. `/continue` reads it and checks out the branch — nothing more on GitHub.
- Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.
