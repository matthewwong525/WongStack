---
name: apply
description: Implement the selected OpenSpec change, planning first when needed, and hand a completed change to /save. Also builds a mini app on a fast preview, or works a non-code to-do with a confirm before each outward action. Use for new implementation; use /continue to resume a saved change cold.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of the WongStack change loop — its name for OpenSpec's **apply** step. It ensures the current line of work has an apply-ready OpenSpec change, then works that change's `tasks.md`: reads the proposal + specs + design, implements each pending task, and checks off `- [x]` as it goes.

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

## Pick the path by the work

The plan you need depends on what the work changes:

- **The repo's existing code or process** → an apply-ready OpenSpec change. [Resolve it below](#resolve-the-plan-first).
- **A new standalone page or small tool** → [the mini-app path](#the-mini-app-path). No `/plan`, no OpenSpec change.
- **No repo file at all** (research, an errand, a message, a data change in a service) → [the to-do path](#work-that-changes-no-repo-file).

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

**Inside `/ship`, return instead.** When `/ship` invoked you, report completion and return without `/save`: `/ship` archives and makes the run's one checkpoint.

## The mini-app path

A mini app lives in its own folder on a small Worker beside the main app, so its preview never builds `app/`. [Mini apps](../../../wiki/stack/mini-apps.md) owns the layout. Ask only when you can not act without an answer.

1. Pick a short kebab-case `<name>`. Write `mini-apps/apps/<name>/` like the example app beside it: `index.html` with plain JS, `app.json` with a `title` and a one-line `description`, and an optional `api.mjs` handler in plain JavaScript.
2. Write tests for the app's logic — its `api.mjs` and its scripts — in the same folder, runnable with `node --test` from that folder. `/save` runs them before the app goes live.
3. Upload the preview from this host, with the Cloudflare credential sourced from the primary worktree's `.env` as [the secrets convention](../../../wiki/development/secrets.md) says:

   ```bash
   bash "$(git rev-parse --show-toplevel)/scripts/cf-mini.sh" preview --alias "mini-<name>"
   ```

   Report the preview URL. It runs on staging data and expires after seven days; a new upload renews it. When the upload can not run, say why in one line.
4. **Do not save on your own.** A save puts the app live on production, with production data. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): save it to go live *(Recommended when the preview looks right)*, change it more, or stop. [`/save`](../save/references/mini-app-save.md) runs the app's tests here and pushes straight to the default branch.

For each change the person asks for, repeat step 3.

## Work that changes no repo file

The plan is the numbered to-do in the conversation, with each outward step marked. When there is none, write one first. Work it in order:

- **Steps that only read, search, or draft** run without a prompt.
- **Each outward step** — a sent message, a post, a created or changed record in a service, a payment, a deletion — shows exactly what it will do (recipient, full text, amount, target) and asks, in [the shared ask format](../explore/references/asking-the-user.md). One confirmation covers one action, unless the person asked for a batch. A declined step is skipped and reported.

When the steps are done, report the result. Do not invoke `/save`: there is nothing to commit. To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`.

## Boundaries

- **`/save` still owns git changes.** `/apply` may read branch evidence through the helper above, but does not implement commit, push, branch, PR, or CI mechanics itself; on complete it delegates them to `/save`. A mini-app preview upload is not git; `/apply` runs it.
- **Never checkpoint as a way of stopping.** If implementation pauses, is blocked, is interrupted, fails, or simply ends with tasks still pending, do not invoke `/save`. Report the remaining work and remind the user that they can run `/save` explicitly if they want an in-progress checkpoint.
- **But a task may need the gate, and then `/save` is how you implement it.** When a task's definition of done needs a passing CI run, a deployed preview, or pushed browser evidence, invoke `/save`, read the result, mark the task, and continue. A failing or unverifiable result leaves the task unchecked: report and stop. [Exit versus implementation](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task) owns the rule.
- **Live-session entry point.** Use it after `/plan` or `/explore`, or with a clear new implementation request. Resuming a known change cold (a fresh clone, another machine, no scrollback)? Run `/continue <name>` instead — it loads the change, checks out the branch, then hands off here.
- **Pause on ambiguity or blockers** — surface them rather than guessing; the proposal is the intent. End that report with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): the supported ways to clear the blocker, recommended first.

Completed tasks automatically flow through **`/save`** to commit + push + open the PR + get a preview URL. At any earlier checkpoint, `/save` remains independently invocable. When everything is done and verified, **`/ship`** merges + archives the change.
