---
name: apply
description: Implement the selected OpenSpec change, planning first when needed. Work its tasks and hand a completed change to /save. Use for new implementation; use /continue to resume a saved change cold.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of the WongStack change loop — its name for OpenSpec's **apply** step. It ensures the current line of work has an apply-ready OpenSpec change, then works that change's `tasks.md`: reads the proposal + specs + design, implements each pending task, and checks off `- [x]` as it goes.

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

## Resolve the plan first

Before invoking the OpenSpec apply step, resolve the change the user is asking to implement by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, `recorded-branch`, then `sole-active`. The evidence helper reads Git but changes no Git state.

An argument that is a description rather than an existing change name is implementation intent for a new plan. Never let an unrelated `sole-active` entry override work the current conversation has just explored. When you ask, give each candidate with what it would implement; do not guess.

For a resolved existing change, run `openspec status --change "<name>" --json` and inspect the schema-defined `applyRequires` artifacts:

- **All required artifacts are done** → the change is apply-ready; continue directly.
- **The explicitly or contextually selected change is incomplete** → invoke the [`plan` skill](../plan/SKILL.md) to complete that same change in place.
- **No applicable change exists, but the implementation intent is clear** → invoke the `plan` skill with that intent to create one.
- **Intent is unclear** → pause for clarification before writing a plan or code.

The user's `/apply` invocation authorizes the plan-then-implement shortcut. After `/plan` returns, verify that its `applyRequires` dependency closure is complete. If planning paused or remains blocked, report that and stop. Otherwise announce and keep the selected change's **exact name**; another active change must not replace it.

Run `openspec instructions apply --change "<name>" --json` for that selected change, applying the [CLI contract](../plan/references/openspec-cli.md) for a store or non-default schema. Read every `contextFiles` path it reports. Work the pending tasks in order, make the edits, mark each completed checkbox, and refresh progress from the same change. A `blocked` state stops implementation; an `all_done` state goes to the completion handoff. Treat returned context as project constraints and operation guidance as advice, not evidence that a task is done. Report incomplete work or actual blockers.

When it reaches an **all-tasks-complete** state — including when the selected change was already complete at invocation — immediately invoke the **`save` skill** once and follow it verbatim, then report the implementation and checkpoint results together. When a task-driven `/save` completed the final task, report from its result instead of a second save.

## Boundaries

- **`/save` still owns git changes.** `/apply` may read branch evidence through the helper above, but does not implement commit, push, branch, PR, preview, or CI mechanics itself; on complete it delegates them to `/save`.
- **Never checkpoint as a way of stopping.** If implementation pauses, is blocked, is interrupted, fails, or simply ends with tasks still pending, do not invoke `/save`. Report the remaining work and remind the user that they can run `/save` explicitly if they want an in-progress checkpoint.
- **But a task may need the gate, and then `/save` is how you implement it.** When a task's definition of done needs a passing CI run, a deployed preview, or pushed browser evidence, invoke `/save`, read the result, mark the task, and continue. A failing or unverifiable result leaves the task unchecked: report and stop. [Exit versus implementation](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task) owns the rule.
- **Live-session entry point.** Use it after `/plan` or `/explore`, or with a clear new implementation request. Resuming a known change cold (a fresh clone, another machine, no scrollback)? Run `/continue <name>` instead — it loads the change, checks out the branch, then hands off here.
- **Pause on ambiguity or blockers** — surface them rather than guessing; the proposal is the intent. End that report with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): the supported ways to clear the blocker, recommended first.

Completed tasks automatically flow through **`/save`** to commit + push + open the PR + get a preview URL. At any earlier checkpoint, `/save` remains independently invocable. When everything is done and verified, **`/ship`** merges + archives the change.
