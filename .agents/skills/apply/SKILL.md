---
name: apply
description: Implement the current line of work — use its apply-ready OpenSpec change when one exists, or run /plan first when it does not; work the tasks and automatically hand a completed change to /save. WongStack's name for OpenSpec's apply step and the implement stage of the change loop. Use when you want to implement, apply, or build work, including straight after /explore. Resuming a known change cold? /continue first — it checks out the branch, then hands off here.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of the WongStack change loop — its name for OpenSpec's **apply** step. It ensures the current line of work has an apply-ready OpenSpec change, then works that change's `tasks.md`: reads the proposal + specs + design, implements each pending task, and checks off `- [x]` as it goes.

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

## Resolve the plan first

Before invoking the OpenSpec apply step, resolve the change that represents what the user is asking to implement. Use this priority order:

1. An explicit existing change named by the user.
2. The change created or discussed in this conversation.
3. An active change whose name matches the current branch.
4. A sole active change, but **only when the conversation does not establish different new work**.

An argument that is a description rather than an existing change name is implementation intent for a new plan. Never let an unrelated sole `openspec list` entry override work the current conversation has just explored. If several candidates remain and the intent does not resolve one, ask the user; do not guess.

For a resolved existing change, run `openspec status --change "<name>" --json` and inspect the schema-defined `applyRequires` artifacts:

- **All required artifacts are done** → the change is apply-ready; continue directly.
- **The explicitly or contextually selected change is incomplete** → invoke the [`plan` skill](../plan/SKILL.md) to complete that same change in place.
- **No applicable change exists, but the implementation intent is clear** → invoke the `plan` skill with that intent to create one.
- **Intent is unclear** → pause for clarification before writing a plan or code.

The user's `/apply` invocation authorizes the plan-then-implement shortcut. After `/plan` returns, verify that its `applyRequires` artifacts are complete. If planning paused or remains blocked, report that and stop; do not begin implementation. Otherwise announce the planned change and pass its **exact name** into `openspec-apply-change`, so another active change cannot be selected between stages.

**Invoke the `openspec-apply-change` skill** (via the Skill tool) and follow it verbatim — that generated skill owns the actual implementation behavior (reading the artifacts, working the task list, checking off tasks). `/apply` owns only the orchestration preflight above; it never authors artifacts itself.

When it reaches an **all-tasks-complete** state — including when the selected change was already complete at invocation — immediately invoke the **`save` skill** and follow it verbatim. Invoke it exactly once — that count qualifies this completion handoff, not the task-driven saves below — then report the implementation and checkpoint results together. When the final task was itself completed by a task-driven `/save`, that checkpoint already covers this exact state: report from its result rather than firing a second, redundant save.

## Boundaries

- **`/save` still owns all git.** `/apply` does not implement commit, push, branch, PR, preview, or CI mechanics itself; on complete it delegates them to `/save`.
- **Never checkpoint as a way of stopping.** If implementation pauses, is blocked, is interrupted, fails, or simply ends with tasks still pending, do not invoke `/save`. Report the remaining work and remind the user that they can run `/save` explicitly if they want an in-progress checkpoint.
- **But a task may need the gate, and then `/save` is how you implement it.** When a task's own definition of done requires a passing CI run, a deployed preview, or pushed browser evidence, invoke `/save` to obtain it, read the result, mark the task, and continue with the remaining tasks — `/apply` owns no git and nothing builds locally. This is not a partial checkpoint, and the rule above does not apply to it. A task-driven save that comes back failing or unverifiable leaves the task unchecked and takes the ordinary blocked path: report and stop, with no exit checkpoint on top. Task-driven saves are unbounded; `tasks.md` bounds them. The whole distinction is [exit versus implementation](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task), which the change loop owns.
- **Live-session entry point.** Use it after `/plan` or `/explore`, or with a clear new implementation request. Resuming a known change cold (a fresh clone, another machine, no scrollback)? Run `/continue <name>` instead — it loads the change, checks out the branch, then hands off here.
- **Pause on ambiguity or blockers** — surface them rather than guessing; the proposal is the intent.

Completed tasks automatically flow through **`/save`** to commit + push + open the PR + get a preview URL. At any earlier checkpoint, `/save` remains independently invocable. When everything is done and verified, **`/ship`** merges + archives the change.
