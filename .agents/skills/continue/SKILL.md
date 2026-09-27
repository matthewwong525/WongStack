---
name: continue
description: Resume a saved OpenSpec change by name, PR, or menu, or an open thread of non-code work, with an optional instruction: check out its branch, recap the plan and facts, check drift, and hand off to /apply. Use to continue, resume, or pick up a thread.
user-invocable: true
---

# /continue

Resume a saved OpenSpec change in a fresh session. **The change is the plan and the source of truth**, kept current by `/save`: `openspec/changes/<name>/proposal.md` is the intent, `tasks.md` the checklist, and its memory facts the session context. Do **not** reload the PR diff or review threads wholesale.

This skill owns the checkout; `openspec` only reads ([the change loop](../../../wiki/development/the-change-loop.md)). The repo is whatever `gh` resolves here; never hardcode owner/repo. Check [the preconditions](../save/references/preconditions.md) before the first `git` or `gh` command. `main` means [the default branch](../save/references/git-gate.md#the-default-branch). The proposal's `**Branch:**` line names the branch, which may differ from the change name.

A handle selects by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs): a change name is `explicit`; a PR uses `changed-active`, then `recorded-branch`, on its head branch.

## Workflow

### 1. Parse the input

```
/continue [name-or-PR] [instruction]
```

- **First token** = the handle: a **change name**, a **PR number**, or a PR **URL**.
- **Everything after** = an **explicit instruction**, e.g. `/continue add-auth rebase onto main and fix the failing test`. Hold it for step 4; it overrides the default "work the tasks".
- **No handle** → run `openspec list`, and list open threads of non-code work with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread --state conversation --limit 10`. The user picks from both as [an ordinary ask](../explore/references/asking-the-user.md), recommending what the branch or latest checkpoint points at. Show each change's name, task progress, and **`Status:`** line ([its values](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan)), and each thread's slug, age, and next step. Don't guess.
- **A thread of non-code work** (chosen from the menu, or a handle naming a topic slug with open threads and no change) → no branch, no change. Run `memory.mjs show <slug>`, recap what is done and next, and hand the remaining steps to `/apply` as its to-do. Skip steps 2 to 4.

### 2. Resolve the change and the branch

- **Change name** (matches `openspec/changes/<name>/` or an `openspec list` entry) → read its proposal header and use the `**Branch:**` value as `BRANCH`:
  ```bash
  openspec show <name>          # or read openspec/changes/<name>/proposal.md + tasks.md
  node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" show <name>
  ```
  Facts are keyed by the change name, even when the branch differs, and hold *session* context the change doesn't. **No facts is normal.** Folder absent in a fresh checkout → `git fetch origin` and inspect remote branch trees without checking them out:
  ```bash
  git for-each-ref refs/remotes/origin --format='%(refname)' | while IFS= read -r ref; do
    git cat-file -e "$ref:openspec/changes/$NAME/proposal.md" 2>/dev/null && echo "$ref"
  done
  ```
  One branch carrying it supplies the proposal and branch; several require a choice. Read the proposal with `git show "$ref:openspec/changes/$NAME/proposal.md"`. A proposal with no Branch line never selects a branch by name: stay in the current checkout for an unsaved plan, and ask for the branch or PR when it is saved elsewhere.
- **PR number/URL** → the branch is the PR's `headRefName`; find the unique active change in its diff:
  ```bash
  gh pr view <N> --json headRefName,url,title,state
  ```
  After `git fetch origin`, run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json --ref "origin/<headRefName>" --branch "<headRefName>"`. When you ask, give each candidate's status and task progress. Read the selected folder after checkout; never infer its name from the PR branch.
- **Bare number matching both a PR and an `openspec list` index** → ask which, as a two-option question naming the PR and the change it would load.

A change with no PR yet is fine: load it.

### 3. Check out the branch

If there's a branch, the tree is clean, and it isn't already checked out:

```bash
git rev-parse --abbrev-ref HEAD     # where am I now
git status --porcelain              # is the tree clean
git fetch origin                    # a handed-off branch may exist only on the remote
```

- Clean tree → `git checkout "$BRANCH"` (it tracks `origin/$BRANCH` when only remote), or `gh pr checkout <N>`. A Branch line naming a branch absent locally and remotely → never create it; ask for the correct branch or PR as a [structured free-text question](../explore/references/asking-the-user.md#the-anatomy-of-an-ask).
- Checkout fails because another worktree has the branch → tell the user and proceed read-only; never force it.
- Dirty tree → **don't** switch; say so and ask: checkpoint with `/save` first *(Recommended)*, or resume read-only here.
- Never `/save`d (no branch anywhere) → stay on the current branch; `/save` will cut it.

### 4. Orient and continue

Recap so the user can confirm the loaded state:

- **The change** — 2–4 lines on the work and task progress, plus its **`Status:`** line and any **open questions**.
- **The journey** — the last 1–3 `## Decision log` entries, so the resumer inherits the *why*.
- **The session context** — open threads first, then live facts the change doesn't carry, with ages. Skip the line with no facts; say so when [the store is unreachable](../memory/SKILL.md#read).
- **State** — the checked-out branch and the PR as a markdown link.
- **Drift check** — **counts only**; load no diffs or threads unless asked:
  ```bash
  git log origin/main..HEAD --oneline | wc -l   # commits on the branch (vs how tasks.md reads)
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Fold it into one line, e.g. *"7 commits on the branch, 3/9 tasks unchecked, 2 unresolved review comments"*. Flag commits ahead of what `tasks.md` says, or unresolved review comments, so the user can decide whether to reconcile first.

Then continue:

- **An explicit instruction** (step 1) → do *that*, with the change as backdrop; the instruction steers.
- **Otherwise** → **invoke the `/apply` skill** to work the tasks.

`/continue` resumes and implements; it drafts no specs ([`/apply` vs `/continue`](../../../wiki/development/the-change-loop.md#apply-vs-continue)).
