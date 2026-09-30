---
name: continue
description: Resume saved work (a change by name, PR, or menu, or an open thread) for /apply.
user-invocable: true
---

# /continue

Resume a saved OpenSpec change in a fresh session. **The change is the plan and the source of truth**, kept current by `/save`: `openspec/changes/<name>/proposal.md` holds the intent, `tasks.md` the checklist, its memory facts the session context.

This skill owns the checkout; `openspec` only reads ([the change loop](../../../wiki/development/the-change-loop.md)). The repo is whatever `gh` resolves; never hardcode owner/repo. Check [the preconditions](../save/references/preconditions.md) before the first `git` or `gh` command. `main` means [the default branch](../save/references/git-gate.md#the-default-branch).

A handle selects by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs): a change name is `explicit`; a PR uses `changed-active`, then `recorded-branch`, on its head branch.

## Workflow

### 1. Parse the input

```
/continue [name-or-PR] [instruction]
```

- **First token**: the handle — a change name, PR number, or PR URL.
- **The rest**: an explicit instruction that overrides "work the tasks" in step 4, e.g. `/continue add-auth rebase onto main and fix the failing test`.
- **No handle** → run `openspec list`, and list open non-code threads with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread --state conversation --limit 10`. Offer both in [an ordinary ask](../explore/references/asking-the-user.md), recommending what the branch or latest checkpoint points at: each change's name, task progress, and `Status:` line ([its values](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan)); each thread's slug, age, and next step. Don't guess.
- **A non-code thread** (picked, or a handle naming a topic slug with open threads and no change) → no branch or change. Run `memory.mjs show <slug>`, recap what is done and next, and hand the rest to `/apply` as its to-do. Skip steps 2–4.

### 2. Resolve the change and the branch

- **Change name** (a folder under `openspec/changes/` or an `openspec list` entry) → its proposal's `**Branch:**` value, which may differ from the name, is `BRANCH`:
  ```bash
  openspec show <name>          # or read openspec/changes/<name>/proposal.md + tasks.md
  node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" show <name>
  ```
  Facts are keyed by the change name, whatever the branch, and hold session context the change lacks; **no facts is normal.** No folder in a fresh checkout → `git fetch origin` and search remote branch trees without checking them out:
  ```bash
  git for-each-ref refs/remotes/origin --format='%(refname)' | while IFS= read -r ref; do
    git cat-file -e "$ref:openspec/changes/$NAME/proposal.md" 2>/dev/null && echo "$ref"
  done
  ```
  One match supplies the proposal (`git show "$ref:openspec/changes/$NAME/proposal.md"`) and the branch; several need a choice. A proposal with no Branch line never selects a branch by name: stay here for an unsaved plan; ask for the branch or PR when it is saved elsewhere.
- **PR number or URL** → the branch is its `headRefName`; find the one active change in its diff:
  ```bash
  gh pr view <N> --json headRefName,url,title,state
  ```
  After `git fetch origin`, run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json --ref "origin/<headRefName>" --branch "<headRefName>"`. If you ask, give each candidate's status and task progress. Read the selected folder after checkout; never infer its name from the PR branch.
- **A bare number matching both a PR and an `openspec list` index** → ask which, naming the PR and the change it would load.

A change with no PR yet is fine: load it.

### 3. Check out the branch

If there's a branch and it isn't checked out:

```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain
git fetch origin   # a handed-off branch may exist only on the remote
```

- Other unpublished work here — a dirty tree, or an active change on this branch other than the one asked for → **don't** switch. Ask: [open the change in a new workspace](../plan/references/new-workspace.md#pick-up-saved-work) *(Recommended when `paseo` is installed)*, `/save` the current work first, or recap it here and stop.
- Nothing else here → `git checkout "$BRANCH"` (it tracks `origin/$BRANCH` when only remote), or `gh pr checkout <N>`. A Branch line naming a branch that exists neither locally nor remotely → never create it; ask for the right branch or PR as a [structured free-text question](../explore/references/asking-the-user.md#the-anatomy-of-an-ask).
- Checkout fails because another worktree has the branch → say where, recap, and stop; never force it.
- Never saved (no branch anywhere) → stay on the current branch; `/save` will cut it.

### 4. Orient and continue

Recap so the user can confirm the loaded state:

- **The change**: 2–4 lines on the work and task progress, its `Status:` line, and any open questions.
- **The journey**: the last 1–3 `## Decision log` entries, so the resumer inherits the *why*.
- **The session context**: open threads first, then live facts the change lacks, with ages. No facts → skip the line; say so when [the store is unreachable](../memory/SKILL.md#read).
- **State**: the checked-out branch, and the PR as a markdown link — only the link, as *the change on GitHub*, unless asked ([plain words](../explore/references/asking-the-user.md#write-in-plain-words)).
- **Drift check**: **counts only**; never reload the PR diff or review threads unless asked:
  ```bash
  git log origin/main..HEAD --oneline | wc -l   # commits on the branch (vs how tasks.md reads)
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Fold it into one line, flagging commits ahead of `tasks.md` or unresolved review comments so the user can choose to reconcile first. Unless asked for counts, say it as progress, with no branch or commit count: *"3 of 9 steps left, 2 comments from reviewers"*; commits ahead of `tasks.md` become *"some work isn't in the plan's checklist yet"*.

Then:

- **Not checked out** (declined or failed in step 3) → build and edit nothing, even with an instruction. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), offering step 3's three choices.
- **An explicit instruction** → do *that*, with the change as backdrop.
- **Otherwise** (checked out, or no branch yet) → **invoke the `/apply` skill** to work the tasks.

`/continue` resumes and implements; it drafts no specs ([`/apply` vs `/continue`](../../../wiki/development/the-change-loop.md#apply-vs-continue)).
