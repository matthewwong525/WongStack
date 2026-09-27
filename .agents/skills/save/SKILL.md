---
name: save
description: Checkpoint work: maintain the change and session context, commit, push, update the PR, wait for CI, and return the preview. Use to save or share work. Session facts go to the memory store. Accepts an optional status or checkpoint note. Does not implement tasks or merge.
user-invocable: true
---

# /save

Invoking `/save` authorizes, without a prompt, branch creation, record maintenance, spec reconciliation, commit, push, PR updates, and CI recovery. Confirm anything else in [the ask format](../explore/references/asking-the-user.md). Never force push, bypass hooks, amend merged commits, or merge a PR. Nothing builds locally; [the change loop](../../../wiki/development/the-change-loop.md) owns git and delivery.

Input: `/save [note]`. A status-like note sets `in-progress`, `blocked (<reason>)`, `ready-to-ship`, or `parked`; other notes seed the dated Decision-log entry. Facts a cold resume needs go in pushed repo files, with repo-relative paths.

## 1. Protect credentials and select the route

**Every route excludes all real credential values supplied, rotated, read, or written in this session** from tracked files, changes, facts, messages, PR text, and reports. Values live only in ephemeral memory and the intended ignored live file; names and sourcing guidance may be recorded.

Load each matching procedure before its actions; conditions combine:

| Condition | Required procedure |
|---|---|
| User supplied or rotated an explicitly named secret | [Named-secret persistence](references/named-secrets.md), before writing records |
| The session only produced facts, including a to-do that changed no repo file | [Facts-only save](references/facts-save.md), before writing facts |
| Code or a code plan needs a new change | [New-plan fallback](references/new-plan.md), before authoring |
| Exact selected handoff is archived | [The archived handoff](#the-archived-handoff), before updating it |

Check [the preconditions](references/preconditions.md) first. Fetch [`main`](references/git-gate.md#the-default-branch) before comparing; a failed inspection is an error, not evidence of no work.

```bash
git fetch origin main
openspec context --json
openspec list --json
bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json
```

Keep `BRANCH`, `NAME`, and `CHANGE_ROOT` separate; select by [the rungs](references/checkpoint-evidence.md#selection-rungs) `explicit` (including the exact archive `/ship` passes), `session`, `changed-active`, `changed-archive`, then `recorded-branch`; there is no `sole-active`. Resolve ambiguity before staging; never duplicate a change to match the branch.

Every save that changes a repo file takes the normal route, whatever the paths. A pure conversation gets facts, not an empty plan, and no commit. Nothing learned, decided, or changed → report and stop.

## 2. Maintain the handoff and capture context

Keep an existing feature branch. On the default branch or detached HEAD, `git checkout -b "$SLUG"`, named for the change or topic (worktree name if the session is unreadable), plus a short SHA on collision. Never rename an established `NAME` to match the branch. Create the plan and required artifacts before their checkpoint. A save with no change still takes this route: its PR body describes the edit in plain words and ends with a footer naming `/ship` to publish it; the change-body renderer does not apply.

Maintain:

- Proposal header: current `**Status:**`, actual `**Branch:**`, and `**Open questions:**` (`none` when empty).
- Plan sections: the current intent from the latest agreed plan and diff, self-contained, edited in place under existing headings. Tasks: actual checked state and agreed additions.
- `## Decision log`: append one dated entry — what landed, decisions and reasons, rejected options, blockers; never rewrite, reorder, or delete earlier ones.
- Session facts: by [writing facts](../memory/references/writing-facts.md), through [the memory write gate](../memory/SKILL.md#write) with `"session": "current"` and `"source": "save"`. A spooled result does not block the save.

Refresh the review:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "$CHANGE_ROOT"
```

Bad inputs keep the old page; report it stale. Stage the page with the handoff.

For an active change, [reconcile its deltas](../plan/references/openspec-cli.md#reconcile-deltas); without deltas, skip reconciliation and honor the schema's permitted `skip_specs` when validating. Read artifact and task progress from CLI status/list, never guessed paths or an assumed schema.

### The archived handoff

Keep the exact `CHANGE_ROOT`; recover `NAME` from the dated folder only if not supplied. Set Status to `ready-to-ship`, keep the actual Branch, and append a dated archive-checkpoint entry. Never rebuild its plan from the conversation, author a new one, or recreate an active folder. Refresh its review; skip delta reconciliation, done by the archive. Stage the archive plus its tracked removals and implementation paths. Render the PR body in archive mode and report the archived path.

## 3. Stage, exclude values, and commit

Stage only intended implementation, handoff, and removal paths — never `git add .` — and check the staged list for unrelated work. A plan-only save commits its new artifacts too.

Before **every commit and publication**, check durable content for every credential value met: feed each explicitly handled key's nonempty value, read silently from its live file, on stdin to `git grep --cached -l -F -f -`, printing only matching paths, never values in arguments. A match stops the save until removed and restaged.

Commit a one-line, repo-style message through a literal message file or quoted heredoc, with the `Co-Authored-By: Claude` trailer. A clean tree with no commits ahead has nothing to push: say so. Push unpushed commits anyway. A non-CI failure stops with its exact error.

## 4. Publish and wait for the gate

Discover the preview with [preview-url.sh](scripts/preview-url.sh); never construct a URL. Follow [the git gate](references/git-gate.md) to push, open or update the PR, and wait for CI. CI failure → the gate's three-attempt fix loop. `UNKNOWN` is unverified, never no checks; save may finish unverified.

## 5. Report

When the save changed what a plan says — its plan sections or `tasks.md` — [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) as well, with its *Review the plan* choice in the closing question; it is not the one link below. Status, Branch, Open questions, and Decision-log lines alone are record-keeping: no plan link. When the person ran `/save` themselves, report the outcome and one link in [plain words](../explore/references/asking-the-user.md#write-in-plain-words); give the lines below only when they ask. Inside another verb, or when asked, report branch and commit, PR link, the change or archive and its Status, facts added, superseded, and dropped (or skipped) and whether stored or spooled, CI result with fixes or uncertainty, and the preview URL or its absence. End with exactly one `SAVE_GATE_RESULT=SUCCESS|NONE|UNKNOWN|TIMEOUT|FAILURE`, the actual value; inside another verb, always print it, because the caller reads it. Name the continue command only for an active change. Keep errors explicit.

Save never merges; ship owns archive and merge.

Invoked directly, it ends with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) — normally continue the tasks, *publish it*, or stop here; on a failing or unverified gate, the supported ways to clear it. Inside an authorized chain, return without asking.
