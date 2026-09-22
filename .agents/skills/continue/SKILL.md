---
name: continue
description: Resume an OpenSpec change and pick up the work — by change name, a PR number/URL, or from a menu when given no argument. Loads the change and the session note, checks out its recorded branch, recaps the plan and Decision log, runs a drift check, then hands off to /apply to work the tasks. Accepts an optional instruction (/continue <name> <instruction>). Pairs with /save. Use whenever you want to continue, resume, or rehydrate a thread.
user-invocable: true
---

# /continue

Rehydrate a fresh session from a saved OpenSpec change and pick up the work. **The change is the plan** (written by `/save`): `openspec/changes/<name>/proposal.md` is the intent, `tasks.md` is the checklist. Load it, check out the branch, continue.

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

This skill trusts the change as the source of truth. It deliberately does **not** reload the PR diff or review threads wholesale — `/save` keeps the change current, so the change alone is the spine; a cheap **counts-only drift check** (step 4) flags when reality has moved past the change. `/save` records the actual feature branch in the proposal header; the change and branch may have different names.

> **OpenSpec never runs git — this skill owns it.** `openspec show`/`openspec list` only read the `openspec/` folder; the `git`/`gh` checkout is here. Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.
>
> `main` stands for the repo's default branch — **assume it**. Every repo `/wong-setup` creates is on `main`, and `git symbolic-ref refs/remotes/origin/HEAD` fails on a freshly created one. Only where `main` doesn't exist, resolve the real name with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` and substitute it.

Read the helper fields and root/base options in [the evidence contract](../save/references/checkpoint-evidence.md) only when using structured evidence. `active`, `archive`, `recorded`, and `legacy` are evidence; retain the selection order below. Inspection errors stop selection.

## Workflow

### 1. Parse the input

The input is a change reference, **optionally followed by an explicit instruction**:

```
/continue [name-or-PR] [instruction]
```

- **First token** = the handle — a **change name**, a **PR number**, or a PR **URL** (e.g. `/continue add-auth`, `/continue 57`, `/continue https://github.com/owner/repo/pull/57`).
- **Everything after** (if anything) = an **explicit instruction** for what to do once the change is loaded — e.g. `/continue add-auth rebase onto main and fix the failing test`. Hold onto it for step 4; it overrides the default "work the tasks" behavior. Most calls are a bare handle — that's the normal case, and the tasks drive the work.
- **No handle at all** → run `openspec list` and let the user pick from active changes. Use callable Codex **`request_user_input`**, callable Claude **`AskUserQuestion`**, or another host's equivalent structured question tool, in that order. If no structured tool is callable, use the numbered-chat fallback from [`/explore`](../explore/SKILL.md#question-mechanism). For each option, show the change's **`Status:`** line (read from its `proposal.md` header — `in-progress` / `blocked (<on what>)` / `ready-to-ship` / `parked`) alongside the name and task progress, so "what can I pick up?" is answerable from the menu. Don't guess.

### 2. Resolve the change and the branch

You need two things: the **change** (proposal + tasks) and the **branch** to check out.

- **Change name** (matches `openspec/changes/<name>/` or an `openspec list` entry) → read its proposal header and use the `**Branch:**` value as `BRANCH`:
  ```bash
  openspec show <name>          # or read openspec/changes/<name>/proposal.md + tasks.md
  cat notes/<name>.md 2>/dev/null   # the session note, if one exists
  ```
  The note is keyed by the change name, even when the branch differs. It holds the *session* context the change deliberately doesn't — what was tried and abandoned, what the user said the constraint really is. Read it when there; **its absence is normal**. If the folder is absent in a fresh checkout, `git fetch origin` and inspect remote branch trees without checking them out:
  ```bash
  git for-each-ref refs/remotes/origin --format='%(refname)' | while IFS= read -r ref; do
    git cat-file -e "$ref:openspec/changes/$NAME/proposal.md" 2>/dev/null && echo "$ref"
  done
  ```
  One branch carrying it supplies the proposal and branch; several require a choice. Read its proposal with `git show "$ref:openspec/changes/$NAME/proposal.md"`, then check out the branch in Step 3. If the proposal has no Branch line, use a same-named local or remote branch as the legacy fallback. If neither exists, stay in the current checkout for an unsaved plan; ask for the branch or PR when the change is saved elsewhere.
- **PR number/URL** → the branch is the PR's `headRefName`; fetch it, then find the unique active change in that branch's diff:
  ```bash
  gh pr view <N> --json headRefName,url,title,state
  ```
  Run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json --ref "origin/<headRefName>" --branch "<headRefName>"` after `git fetch origin`. Use its unique `active` candidate; if absent, use a unique `recorded` match, then `legacy.active`. If several remain, ask which change to resume. Read the selected folder after checkout; do not infer its name from the PR branch.
- **Bare number that matches both a PR and an `openspec list` index** → ambiguous; ask which they mean before proceeding.

It's fine if only one side exists (a save with no PR yet) — load the change; there's just no PR link to show.

### 3. Check out the branch

If there's a branch, the tree is clean, and it isn't already checked out:

```bash
git rev-parse --abbrev-ref HEAD     # where am I now
git status --porcelain              # is the tree clean
git fetch origin                    # a handed-off branch may exist only on the remote
```

- Clean tree, branch not checked out → `git checkout "$BRANCH"` (git creates a local branch tracking `origin/$BRANCH` when it only exists on the remote — the fresh-clone handoff case), or `gh pr checkout <N>` which fetches too. If the proposal's Branch line names a branch absent locally and remotely, ask for the correct branch or PR rather than creating it.
- In a git worktree the branch may be checked out elsewhere — if checkout fails for that reason, tell the user and proceed read-only rather than forcing it.
- Dirty tree → **don't** switch branches; surface the dirty state and ask how to proceed.
- Change planned but never `/save`d (no branch anywhere) → stay on the current branch; `/save` will cut it.

### 4. Orient and continue

Give the user a tight recap so they can confirm the loaded state:

- **The change** — 2–4 lines summarizing it (what the work is + where the tasks stand), read from `openspec/changes/<name>/`, plus its **`Status:`** line and any **open questions** from the proposal header.
- **The journey** — the last 1–3 entries of the proposal's `## Decision log`, so the resumer inherits the *why* (decisions made, dead ends ruled out, blockers) and not just the plan.
- **The session context** — if `notes/<name>.md` exists, fold in what the change doesn't carry: the constraints the user stated, options weighed and dropped, open threads. This is what closes the gap between resuming the *plan* and resuming the *understanding*. Skip the line entirely when there's no note — don't report it as missing.
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

  - **If the instruction is a pasted review block** — it begins `Review notes from review.html` — read the change's existing artifact paths from `openspec status --change "<name>" --json`, following the [CLI contract](../plan/references/openspec-cli.md). Apply each note to the existing proposal, design, delta specs, tasks, and `review-visuals.html` where relevant; keep them coherent. Append one Decision-log line naming what each note changed or why it was declined. Use `openspec instructions <artifact-id> --change "<name>" --json` for a substantial artifact rewrite, then validate the change. Refresh `review.html` with `plan/scripts/build-review.mjs` before implementing. Do not create an unrequested new artifact while updating feedback.
- **If any other explicit instruction was passed** (step 1), do *that* — the change is the backdrop, the instruction is the task. Reconcile the two (e.g. "fix the failing test" → the tasks tell you which and why), but let the instruction steer.
- **Otherwise**, **invoke the `/apply` skill** (via the Skill tool) to work the tasks — it owns the implement loop (start the first unchecked `- [ ]` in `tasks.md`, check off `- [x]` as tasks land, pause on ambiguity).

From here it's an ordinary session with the change loaded; to checkpoint again, use `/save` (it updates the same change, keeping it equal to the latest plan). When every task is done, `/ship` (merges + archives the change).

## Notes

- The change (`proposal.md` + `tasks.md`) is the plan and the source of intent; `notes/<name>.md`, when present, is the session context around it. `/continue` reads both and checks out the branch — nothing more.
- `/continue` **resumes and implements**; it is not OpenSpec's `/opsx:*` spec-drafting stepper. When you want to build, `/continue`.
