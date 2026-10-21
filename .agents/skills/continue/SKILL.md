---
name: continue
description: Resume saved work (a change by name, PR, or menu, or an open thread) for /apply.
user-invocable: true
---

# /continue

**Selected schedule:** [route its record](../save/references/schedule-records.md) before code or checkout.

Resume a saved OpenSpec change in a fresh session. **The change is the plan and the source of truth** ([where it lives](../../../wiki/development/the-change-loop.md#where-the-plan-and-record-live)); its memory facts hold the session context.

Check [preconditions](../save/references/preconditions.md). This skill owns checkout; `gh` resolves only GitHub; [Artifacts](../../../wiki/stack/artifacts-route.md) lists saved branches.

A handle names the work ([the rungs](../save/references/checkpoint-evidence.md#selection-rungs)): a change name is that change; a PR is the one active change its head branch carries.

## Workflow

### 1. Parse the input

```
/continue [name-or-PR] [instruction]
```

- **First token**: the handle — a change name, PR number, or PR URL.
- **The rest**: an explicit instruction that overrides "work the tasks" in step 4, e.g. `/continue add-auth fix the failing test`.
- **No handle** → run `openspec list` and `schedule.mjs list` ([records](../save/references/schedule-records.md)), and list open non-code threads with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread --state conversation --limit 10`. Offer both in [an ordinary ask](../explore/references/asking-the-user.md), recommending what the branch or latest checkpoint points at: each change's name, task progress, and `Status:` line ([its values](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan)); each thread's slug, age, and next step. Don't guess.
- **A non-code thread** (picked, or a handle naming a topic slug with open threads and no change) → no branch or change. Run `memory.mjs show <slug>`, recap what is done and next, and hand the rest to `/apply` as its to-do. Skip steps 2–4.

### 2. Resolve the change and the branch

- **Change name** (a folder under `openspec/changes/` or an `openspec list` entry) → its proposal's `**Branch:**` value, which may differ from the name, is `BRANCH`:
  ```bash
  openspec show <name>   # or read openspec/changes/<name>/proposal.md + tasks.md
  node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" show <name>
  ```
  Facts are keyed by the change name, whatever the branch; **no facts is normal.** No folder in a fresh checkout → `git fetch origin`, then test each `git for-each-ref refs/remotes/origin` ref with `git cat-file -e "$ref:openspec/changes/$NAME/proposal.md"`, checking out nothing. One match supplies the proposal (`git show` that path) and the branch; several need a choice. A proposal with no Branch line never selects a branch by name: stay here for an unsaved plan; ask for the branch or PR when it is saved elsewhere.
- **PR number or URL** → the branch is its `headRefName`; find the one active change in its diff:
  ```bash
  gh pr view <N> --json headRefName,url,title,state
  ```
  After `git fetch origin`, run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json --ref "origin/<headRefName>" --branch "<headRefName>"`. If you ask, give each candidate's status and task progress. Read the selected folder after checkout.
- **A bare number matching both a PR and an `openspec list` index** → ask which, naming the PR and the change it would load.

### 3. Check out the branch

With a branch not checked out, switch only by `node "$P" "$BRANCH"`, `P="$(git rev-parse --show-toplevel)/.claude/skills/continue/scripts/pickup.mjs"`.

- Other unpublished work here (`git status --porcelain`, or an active change on this branch other than the one asked for) → **don't** switch. Review with `--dry-run`, then ask: [open the change in a new workspace](../plan/references/new-workspace.md#pick-up-saved-work) *(Recommended when `paseo` is installed)*, `/save` the current work first, or recap it here and stop.
- Exit 3 → work new to this computer. Show its `files`, code first, and what the code does (`git show` runs nothing). [Ask](../explore/references/asking-the-user.md): *Switch to it* (then its code runs on this computer, with your keys) / *Show the code in full* / *Leave it*. *Switch* reruns with `--reviewed <tip>`; another exit 3 shows what came after.
- Exit 4 → name the worktree holding it; stop. Exit 2 → show `error`; for a missing branch, ask for the right branch or PR as a [structured free-text question](../explore/references/asking-the-user.md#the-anatomy-of-an-ask).
- Never saved (no branch anywhere) → stay on the current branch; `/save` will cut it.

### 4. Orient and continue

Recap the loaded state:

- **The change**: 2–4 lines on the work and task progress, its `Status:` line, and any open questions.
- **The journey**: the last 1–3 `## Decision log` entries: the *why*.
- **The session context**: open threads first, then live facts the change lacks, with ages. No facts → skip the line; say so when [the store is unreachable](../memory/SKILL.md#read).
- **State**: the checked-out branch, and the PR as *the change on GitHub* ([plain words](../explore/references/asking-the-user.md#write-in-plain-words)).
- **Drift check**: **counts only**; never reload the PR diff or review threads unless asked:
  ```bash
  git rev-list --count origin/main..HEAD
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Fold it into one line, flagging commits ahead of `tasks.md` or unresolved review comments. Say it as progress unless asked for counts: *"3 of 9 steps left, 2 comments from reviewers"*; commits ahead of `tasks.md` become *"some work isn't in the plan's checklist yet"*.

Then:

- **Not checked out** (declined or failed in step 3), switched with `--reviewed`, or told *ask before building* → build and edit nothing this turn, even with an instruction. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), offering step 3's three choices, or *Build it* / *Stop here*.
- **An explicit instruction** → do *that*, with the change as backdrop.
- **Otherwise** (checked out, or no branch yet) → **invoke the `/apply` skill** to work the tasks.
