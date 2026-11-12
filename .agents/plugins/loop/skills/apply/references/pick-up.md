# Pick up saved work

`/apply` follows this page when it names a saved change or pull request this chat has not loaded yet. **The change is the plan and the source of truth** ([where it lives](../../../references/rules.md#where-the-plan-and-record-live)).

Check [preconditions](../../save/references/preconditions.md). `gh` resolves only GitHub; [Artifacts](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/artifacts-route.md) lists saved branches.

## 1. Resolve the change and the branch

- **Change name** (a folder under `openspec/changes/` or an `openspec list` entry) → its proposal's `**Branch:**` value, which may differ from the name, is `BRANCH`. No folder here, as in a fresh checkout → `git fetch origin`, then test each `git for-each-ref refs/remotes/origin` ref with `git cat-file -e "$ref:openspec/changes/$NAME/proposal.md"`, checking out nothing. One match supplies the proposal (`git show` that path) and the branch; several need a choice. A proposal with no Branch line never selects a branch by name: stay here for an unsaved plan; ask for the branch or PR when it is saved elsewhere.
- **PR number or URL** → the branch is its `headRefName` (`gh pr view <N> --json headRefName,url,title,state`). After `git fetch origin`, find the one active change in its diff with `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json --ref "origin/<headRefName>" --branch "<headRefName>"`. If you ask, give each candidate's status and task progress.
- **A bare number matching both a PR and an `openspec list` index** → ask which, naming the PR and the change it would load.

## 2. Check out the branch

Already on `BRANCH` here → skip to the recap. Else switch only by `node "$P" "$BRANCH"`, `P="$(git rev-parse --show-toplevel)/.claude/skills/apply/scripts/pickup.mjs"`.

- Other unpublished work here (`git status --porcelain`, or an active change on this branch other than the one asked for) → **don't** switch. Review with `--dry-run`, then ask: [open the change in a new workspace](../../plan/references/new-workspace.md#pick-up-saved-work) *(Recommended when `paseo` is installed)*, `/save` the current work first, or recap it here and stop.
- Exit 3 → work new to this computer. Show its `files`, code first, and what the code does (`git show` runs nothing). [Ask](../../explore/references/asking-the-user.md): *Switch to it* (then its code runs on this computer, with your keys) / *Show the code in full* / *Leave it*. *Switch* reruns with `--reviewed <tip>`; another exit 3 shows what came after.
- Exit 4 → name the worktree holding it; stop. Exit 2 → show `error`; for a missing branch, ask for the right branch or PR as a [structured free-text question](../../explore/references/asking-the-user.md#the-anatomy-of-an-ask).
- Never saved (no branch anywhere) → stay on the current branch; a save cuts it.

## 3. Recap

- **The change**: 2–4 lines on the work and task progress, its `Status:` line, and any open questions.
- **The journey**: the last 1–3 `## Decision log` entries.
- **State**: the checked-out branch, and the PR as *the change on GitHub* ([plain words](../../explore/references/asking-the-user.md#write-in-plain-words)).
- **Drift**: **counts only**; never reload the PR diff or review threads unless asked:
  ```bash
  git rev-list --count origin/main..HEAD
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
  if [ -n "$PR" ]; then
    NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
    gh api graphql -f query="query{repository(owner:\"${NWO%/*}\",name:\"${NWO#*/}\"){pullRequest(number:$PR){reviewThreads(first:100){nodes{isResolved}}}}}" \
      --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved|not)]|length'
  fi
  ```
  Say it as progress in one line: *"3 of 9 steps left, 2 comments from reviewers"*; commits ahead of `tasks.md` become *"some work isn't in the plan's checklist yet"*.

## 4. Then

- **Not checked out** (declined or failed in step 2), switched with `--reviewed`, or told *ask before building* → build and edit nothing this turn, even with an instruction. End with [the next step](../../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): step 2's three choices, or *Build it* / *Stop here*.
- **An explicit instruction** (`/apply add-auth fix the failing test`) → do *that*, with the change as backdrop.
- **Otherwise** → go back to [resolve the plan](../SKILL.md#resolve-the-plan-first) and build.
