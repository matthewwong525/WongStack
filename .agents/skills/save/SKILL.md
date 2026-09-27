---
name: save
description: Checkpoint work: commit, push, update the PR, wait for CI, return the preview, and record session facts. Never implements or merges.
user-invocable: true
---

# /save

Invoking `/save` authorizes, unasked, branch creation, record upkeep, spec reconciliation, commit, push, PR updates, and CI fixes; [ask](../explore/references/asking-the-user.md) before anything else. Never force push, bypass hooks, amend merged commits, or merge a PR: `/ship` owns archive and merge. Nothing builds locally; [the change loop](../../../wiki/development/the-change-loop.md) owns git and delivery.

Input: `/save [note]`. A status note sets `in-progress`, `blocked (<reason>)`, `ready-to-ship`, or `parked`; any other note seeds the Decision-log entry. Facts a cold resume needs go in pushed repo files, with repo-relative paths.

## 1. Protect credentials and select the route

**Every route keeps each real credential value this session supplied, rotated, read, or written out of** tracked files, changes, facts, messages, PR text, and reports. Values live only in working memory and the intended ignored live file; names and where to get them may be recorded.

Load each matching procedure before its actions; conditions combine:

| Condition | Procedure |
|---|---|
| User supplied or rotated an explicitly named secret | [Named-secret persistence](references/named-secrets.md), before writing records |
| Only facts, including a to-do that changed no repo file | [Facts-only save](references/facts-save.md) |
| Code or a code plan needs a new change | [New-plan fallback](references/new-plan.md) |
| The exact selected handoff is archived | [The archived handoff](#the-archived-handoff) |

Check [the preconditions](references/preconditions.md), then fetch [`main`](references/git-gate.md#the-default-branch) before comparing. A failed inspection is an error, not proof of no work.

```bash
git fetch origin main
openspec context --json
openspec list --json
bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json
```

Keep `BRANCH`, `NAME`, and `CHANGE_ROOT` separate. Select by [the rungs](references/checkpoint-evidence.md#selection-rungs) `explicit` (including the exact archive `/ship` passes), `session`, `changed-active`, `changed-archive`, then `recorded-branch`; no `sole-active`. Resolve ambiguity before staging; never duplicate a change to match the branch.

A save that changes any repo file takes the normal route, whatever the paths. Nothing learned, decided, or changed → report and stop.

## 2. Maintain the handoff and capture context

Keep an existing feature branch. On the default branch or a detached HEAD, `git checkout -b "$SLUG"` named for the change or topic (the worktree name if the session is unreadable), plus a short SHA on collision. Never rename an established `NAME` to match the branch. Create the plan and required artifacts before their checkpoint. A save with no change takes this route too, with [its own plain PR body](references/git-gate.md#the-body-mirrors-the-change).

Maintain [the living handoff](../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan):

- Proposal header: current `**Status:**`, actual `**Branch:**`, and `**Open questions:**` (`none` when empty).
- Plan sections: the current intent from the latest agreed plan and diff, self-contained, edited in place under existing headings. Tasks: true checked state and agreed additions.
- `## Decision log`: append one dated entry; never rewrite, reorder, or delete earlier ones.
- Session facts: [write them](../memory/references/writing-facts.md) through [the memory write gate](../memory/SKILL.md#write) with `"session": "current"` and `"source": "save"`. A spooled result does not block the save.

Refresh the review page:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "$CHANGE_ROOT"
```

Bad inputs keep the old page: report it stale. Stage the page with the handoff.

For an active change, [reconcile its deltas](../plan/references/openspec-cli.md#reconcile-deltas). Read artifact and task progress [from the CLI](../plan/references/openspec-cli.md#create-or-read-a-change), never guessed paths or schema.

### The archived handoff

Keep the exact `CHANGE_ROOT`; recover `NAME` from the dated folder only if not supplied. Set Status to `ready-to-ship`, keep the actual Branch, and append a dated archive-checkpoint entry. Never rebuild its plan from the conversation, author a new one, or recreate an active folder. Refresh its review; skip delta reconciliation (the archive did it). Stage the archive, its tracked removals, and implementation paths. Render the PR body in archive mode; report the archived path.

## 3. Stage, exclude values, and commit

Stage only intended implementation, handoff, and removal paths, never `git add .`; check the staged list for unrelated work. A plan-only save commits its new artifacts too.

Before **every commit and publication**, check durable content for every credential value met this session: read each explicitly handled key's nonempty value silently from its live file and feed it on stdin to `git grep --cached -l -F -f -`, which prints only matching paths; never put values in arguments. A match stops the save until removed and restaged.

Commit a one-line, repo-style message through a literal message file or quoted heredoc, with the `Co-Authored-By: Claude` trailer. Clean tree, no commits ahead → nothing to push: say so. Push unpushed commits anyway. A non-CI failure stops with its exact error.

## 4. Publish and wait for the gate

Discover the preview with [preview-url.sh](scripts/preview-url.sh); never construct a URL. Follow [the git gate](references/git-gate.md) to push, open or update the PR, and wait for CI, fixing failures up to three times. Save may finish unverified: `UNKNOWN` is never "no checks".

## 5. Report

When the save changed a plan's sections or `tasks.md`, [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) (*Click here to see the plan:*), apart from the one link below, and offer *Review the plan* in the closing question.

Run by the person, report the outcome and one link in [plain words](../explore/references/asking-the-user.md#write-in-plain-words). Inside another verb, or when asked, report branch and commit; PR link; the change or archive and its Status; facts added, superseded, and dropped (or skipped), stored or spooled; CI result with fixes or uncertainty; the preview URL or its absence. End with exactly one `SAVE_GATE_RESULT=SUCCESS|NONE|UNKNOWN|TIMEOUT|FAILURE`, the actual value; inside another verb always print it, because the caller reads it. Name the continue command only for an active change. Keep errors explicit.

Invoked directly, end with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): normally continue the tasks, *publish it*, or stop here; a failing or unverified gate offers the ways to clear it. Inside an authorized chain, return without asking.
