---
name: save
description: Checkpoint work: commit, push, update the PR, wait for CI, return the preview, record session facts. Never implements or merges.
user-invocable: true
---

# /save

`/save` authorizes branch creation, record upkeep, spec reconciliation, commit, push, PR updates and CI fixes; [ask](../explore/references/asking-the-user.md) for anything else. Never force push, bypass hooks, amend merged commits or merge. `/ship` owns archive/merge; [the loop](../../../wiki/development/the-change-loop.md) owns delivery. No local builds.

`/save [note]`: a [Status value](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan) sets Status; other notes seed the Decision log. Cold-resume context belongs in pushed files with repo-relative paths.

## 1. Protect credentials and select the route

**Keep every credential supplied, rotated, read or written this session out of** tracked files, changes, facts, messages, PR text and reports. Values stay in working memory and their intended ignored live file; record only names and sources.

Load each matching procedure before its actions; conditions combine:

| Condition | Procedure |
|---|---|
| User supplied or rotated an explicitly named secret | [Named-secret persistence](references/named-secrets.md), before writing records |
| Only facts, including a to-do that changed no repo file | [Facts-only save](references/facts-save.md) |
| Code or a code plan needs a new change | [New-plan fallback](references/new-plan.md) |
| The exact selected handoff is archived | [The archived handoff](#the-archived-handoff) |

Check [preconditions](references/preconditions.md), then fetch `main` before comparing; errors stop.

```bash
git fetch origin main
openspec context --json
openspec list --json
bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json
```

Keep `BRANCH`, `NAME`, `CHANGE_ROOT` separate. [Rungs](references/checkpoint-evidence.md#selection-rungs): `explicit` (ship's exact archive), `session`, `changed-active`, `changed-archive`, `recorded-branch`; never `sole-active`. Resolve ambiguity before staging; never duplicate a change for its branch name.

A save changing repo files takes the normal route. Nothing learned, decided, or changed → report and stop.

## 2. Maintain the handoff and capture context

Keep the feature branch. On default/detached HEAD, `git checkout -b "$SLUG"`: change/topic name, else worktree name for an unreadable session; append a short SHA on collision. Never rename `NAME` to match. Create required plan artifacts before checkpointing. No-change saves use [a plain PR body](references/git-gate.md#the-body-mirrors-the-change).

Maintain [the living handoff](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan):

- Proposal header: current `**Status:**`, actual `**Branch:**`, and `**Open questions:**` (`none` when empty).
- Plan sections: the current intent from the latest agreed plan and diff, self-contained, edited in place under existing headings. Tasks: true checked state and agreed additions.
- `## Decision log`: append one dated entry; never rewrite, reorder, or delete earlier ones.
- Session facts: [write them](../memory/references/writing-facts.md) through [the memory write gate](../memory/SKILL.md#write) with `"session": "current"` and `"source": "save"`. A spooled result does not block the save.

Refresh the review page:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "$CHANGE_ROOT"
```

Bad inputs keep the old page: report it stale. Stage it with the handoff.

For an active change, [reconcile its deltas](../plan/references/openspec-cli.md#reconcile-deltas). Read artifact and task progress [from the CLI](../plan/references/openspec-cli.md#create-or-read-a-change), never guessed paths or schema.

### The archived handoff

Keep exact `CHANGE_ROOT`; infer `NAME` from its dated folder only if absent. Set `ready-to-ship`, retain actual Branch and append a dated archive-checkpoint entry. Never rebuild the plan or recreate an active folder. Refresh review; archive already reconciled deltas. Stage archive, tracked removals and implementation; render in archive mode and report its path.

## 3. Stage, exclude values, and commit

Stage intended implementation, handoff and removals, never `git add .`; check for unrelated staged work. A plan-only save commits its artifacts.

Before **every commit/publication**, silently read each handled credential's nonempty live value into stdin for `git grep --cached -l -F -f -`. Print only matching paths, never values or secret arguments. Matches stop saving until removed and restaged.

Commit a one-line repo-style message via literal file/quoted heredoc, with `Co-Authored-By: Claude`. Clean and no commits ahead: report nothing to push; otherwise push unpushed commits. Non-CI failures stop with their exact error.

## 4. Publish and wait for the gate

Use [preview-url.sh](scripts/preview-url.sh), never a constructed URL. [The gate](references/git-gate.md) owns push, PR and CI wait/fixes (three attempts). Save may finish unverified; UNKNOWN never means no checks.

## 5. Report

Changed plan sections/tasks: [print the plan link](../explore/references/asking-the-user.md#print-the-plans-link) apart from the report link; offer *Review the plan* when asking.

Report outcome and one link in [plain words](../explore/references/asking-the-user.md#write-in-plain-words). Inside a verb or on request, include branch/commit, PR, change/archive Status, fact counts and stored/spooled/skipped state, CI fixes/uncertainty and preview/absence. Return `SAVE_HEAD=<exact SHA>` and [a receipt](references/git-gate.md#saved-revision-handoff). End with one actual `SAVE_GATE_RESULT=SUCCESS|NONE|UNKNOWN|TIMEOUT|FAILURE`; always print it inside a verb. Explicit errors; continue command only for active changes.

Direct invocation ends with [next steps](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): continue, publish or stop; failed/unverified gates offer repairs. Authorized chains return unasked.
