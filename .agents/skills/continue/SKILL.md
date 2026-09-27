---
name: continue
description: Resume a saved OpenSpec change by name, PR, or menu, or an open thread of non-code work, with an optional instruction: check out its branch, recap the plan and facts, check drift, and hand off to /apply. Use to continue, resume, or pick up a thread.
user-invocable: true
---

# /continue

Rehydrate a fresh session from a saved OpenSpec change and pick up the work. **The change is the plan and the source of truth**, kept current by `/save`: `openspec/changes/<name>/proposal.md` is the intent, `tasks.md` the checklist, and its memory facts the session context around it. Load them, check out the branch, continue. Do **not** reload the PR diff or review threads wholesale; a counts-only drift check (step 4) flags when reality has moved past the change.

This skill owns the checkout; `openspec` only reads, per [the change loop](../../../wiki/development/the-change-loop.md). The repo is whatever `gh` resolves here — never hardcode owner/repo. Check [the preconditions](../save/references/preconditions.md) before the first `git` or `gh` command; a failed check stops with its fix. `main` means [the default branch](../save/references/git-gate.md#the-default-branch). The proposal's `**Branch:**` line names the branch, which may differ from the change name.

A handle selects by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs): a change name is `explicit`; a PR uses `changed-active`, then `recorded-branch`, on the PR's head branch.

## Workflow

### 1. Parse the input

The input is a change reference, **optionally followed by an explicit instruction**:

```
/continue [name-or-PR] [instruction]
```

- **First token** = the handle — a **change name**, a **PR number**, or a PR **URL** (e.g. `/continue add-auth`, `/continue 57`, `/continue https://github.com/owner/repo/pull/57`).
- **Everything after** (if anything) = an **explicit instruction** for what to do once the change is loaded — e.g. `/continue add-auth rebase onto main and fix the failing test`. Hold onto it for step 4; it overrides the default "work the tasks" behavior. Most calls are a bare handle — that's the normal case, and the tasks drive the work.
- **No handle at all** → run `openspec list`, and list open threads of non-code work with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread --state conversation --limit 10`. Let the user pick from both, as [an ordinary ask](../explore/references/asking-the-user.md) — the recommended option first, which is normally the change the branch or the most recent checkpoint points at. For each option, show the change's **`Status:`** line ([its values](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan)) alongside the name and task progress, so "what can I pick up?" is answerable from the menu. Show a thread with its slug, its age, and its next step. Don't guess.
- **A thread of non-code work** (chosen from the menu, or a handle that names a topic slug with open threads and no change) → there is no branch and no change. Run `memory.mjs show <slug>`, recap what is done and what is next, and hand the remaining steps to `/apply` as its to-do. Skip steps 2 to 4.

### 2. Resolve the change and the branch

You need two things: the **change** (proposal + tasks) and the **branch** to check out.

- **Change name** (matches `openspec/changes/<name>/` or an `openspec list` entry) → read its proposal header and use the `**Branch:**` value as `BRANCH`:
  ```bash
  openspec show <name>          # or read openspec/changes/<name>/proposal.md + tasks.md
  node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" show <name>
  ```
  The facts are keyed by the change name, even when the branch differs. They hold the *session* context the change deliberately doesn't — what was ruled out and why, what the user said the constraint really is, and the open threads. **No facts is normal.** If the folder is absent in a fresh checkout, `git fetch origin` and inspect remote branch trees without checking them out:
  ```bash
  git for-each-ref refs/remotes/origin --format='%(refname)' | while IFS= read -r ref; do
    git cat-file -e "$ref:openspec/changes/$NAME/proposal.md" 2>/dev/null && echo "$ref"
  done
  ```
  One branch carrying it supplies the proposal and branch; several require a choice. Read its proposal with `git show "$ref:openspec/changes/$NAME/proposal.md"`, then check out the branch in Step 3. A proposal with no Branch line never selects a branch by name: stay in the current checkout for an unsaved plan, and ask for the branch or PR when the change is saved elsewhere.
- **PR number/URL** → the branch is the PR's `headRefName`; fetch it, then find the unique active change in that branch's diff:
  ```bash
  gh pr view <N> --json headRefName,url,title,state
  ```
  Run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json --ref "origin/<headRefName>" --branch "<headRefName>"` after `git fetch origin`. When you ask, give each candidate with its status and task progress. Read the selected folder after checkout; do not infer its name from the PR branch.
- **Bare number that matches both a PR and an `openspec list` index** → ambiguous; ask which they mean before proceeding, as a two-option question naming the PR and the change it would load.

It's fine if only one side exists (a save with no PR yet) — load the change; there's just no PR link to show.

### 3. Check out the branch

If there's a branch, the tree is clean, and it isn't already checked out:

```bash
git rev-parse --abbrev-ref HEAD     # where am I now
git status --porcelain              # is the tree clean
git fetch origin                    # a handed-off branch may exist only on the remote
```

- Clean tree, branch not checked out → `git checkout "$BRANCH"` (git creates a local branch tracking `origin/$BRANCH` when it only exists on the remote — the fresh-clone handoff case), or `gh pr checkout <N>` which fetches too. If the proposal's Branch line names a branch absent locally and remotely, ask for the correct branch or PR rather than creating it — a [structured free-text question](../explore/references/asking-the-user.md#the-anatomy-of-an-ask), because only the user knows the name.
- In a git worktree the branch may be checked out elsewhere — if checkout fails for that reason, tell the user and proceed read-only rather than forcing it.
- Dirty tree → **don't** switch branches; surface the dirty state and ask how to proceed, offering the supported ways out — checkpoint the current work with `/save` first *(Recommended)*, or resume read-only on this branch.
- Change planned but never `/save`d (no branch anywhere) → stay on the current branch; `/save` will cut it.

### 4. Orient and continue

Give the user a tight recap so they can confirm the loaded state:

- **The change** — 2–4 lines summarizing it (what the work is + where the tasks stand), read from `openspec/changes/<name>/`, plus its **`Status:`** line and any **open questions** from the proposal header.
- **The journey** — the last 1–3 entries of the proposal's `## Decision log`, so the resumer inherits the *why* (decisions made, dead ends ruled out, blockers) and not just the plan.
- **The session context** — fold in the open threads first, then the live facts the change doesn't carry, with their ages: the constraints the user stated, options weighed and dropped. This is what closes the gap between resuming the *plan* and resuming the *understanding*. Skip the line when there are no facts; when [the store is unreachable](../memory/SKILL.md#read), say so here.
- **State** — which branch is checked out and the PR link (as a markdown link so it stays clickable). Unless the person asks for more, give only the link, as *the review page on GitHub* ([plain words](../explore/references/asking-the-user.md#write-in-plain-words)).
- **Drift check** — verify the change isn't stale. Report **counts only** (don't load diffs or threads unless asked):
  ```bash
  git log origin/main..HEAD --oneline | wc -l   # commits on the branch (vs how tasks.md reads)
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Fold the result into the recap as one line — e.g. *"7 commits on the branch, 3/9 tasks unchecked, 2 unresolved review comments"*. If the commit count looks ahead of what `tasks.md` says (work landed without a `/save`), or there are unresolved review comments, flag that so the user can decide whether to reconcile first. Unless the person asks for the counts, say it as progress — *"3 of 9 steps left, 2 comments from reviewers"* — with no branch or commit count, and say a commit count ahead of `tasks.md` as *"some work isn't in the plan's checklist yet"*.

Then continue:

- **If an explicit instruction was passed** (step 1), do *that* — the change is the backdrop, the instruction is the task. Reconcile the two (e.g. "fix the failing test" → the tasks tell you which and why), but let the instruction steer.
- **Otherwise**, **invoke the `/apply` skill** (via the Skill tool) to work the tasks — it owns the implement loop (start the first unchecked `- [ ]` in `tasks.md`, check off `- [x]` as tasks land, pause on ambiguity).

From here it's an ordinary session with the change loaded: `/save` checkpoints the same change again, and `/ship` merges and archives it when every task is done. `/continue` resumes and implements; it drafts no specs — see [`/apply` vs `/continue`](../../../wiki/development/the-change-loop.md#apply-vs-continue).
