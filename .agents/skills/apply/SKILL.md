---
name: apply
description: Implement the selected OpenSpec change, planning first when needed, and end with a preview from this host, or work a non-code to-do with a confirm before each outward action. Use for new implementation, including a new mini app; use /continue to resume a saved change cold.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of [the change loop](../../../wiki/development/the-change-loop.md), OpenSpec's **apply** step.

## Pick the path by the work

- **The repo's code or process**, including a new standalone page or small tool (a [mini app](../../../wiki/stack/mini-apps.md)) → an apply-ready OpenSpec change: [resolve it below](#resolve-the-plan-first).
- **No repo file** (research, an errand, a message, a data change in a service) → [the to-do path](#work-that-changes-no-repo-file).

## Resolve the plan first

Resolve the change by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, `recorded-branch`, then `sole-active`. An argument that names no existing change is intent for a new plan. Never let an unrelated `sole-active` entry override work this conversation just explored. If unsure, ask, listing what each candidate would implement; never guess.

Check `applyRequires` in `openspec status --change "<name>" --json`:

- **All done** → apply-ready; continue.
- **The selected change is incomplete** → invoke the [`plan` skill](../plan/SKILL.md) to complete it in place.
- **No change, clear intent** → invoke the `plan` skill with that intent.
- **Unclear intent** → ask before any plan or code.

`/apply` authorizes plan-then-implement. After `/plan` returns, verify the `applyRequires` closure is complete; if planning paused or is blocked, report and stop. Otherwise announce the change's **exact name** and keep it; no other change may replace it.

Then [build in a helper](#build-in-a-helper); report incomplete work or actual blockers.

At **all-tasks-complete**, even at invocation, [finish with a preview](#finish-with-a-preview), unless a task-driven `/save` completed the final task: then report its result and CI preview, with no upload. **When `/ship` invoked you, return instead**: report completion with no upload and no `/save`; `/ship` archives and makes the one checkpoint.

## Build in a helper

Work the tasks in a fresh helper agent, so the build does not carry this conversation's planning talk. In Claude Code, start it with the Agent tool (`general-purpose`); in Codex, spawn a sub-agent. Keep the parent's model. The prompt is two lines: the exact change name, and *read `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/build-helper.md`, then build*. [The brief](references/build-helper.md) owns what the helper does and what it returns.

Read each report and act on its stop:

- **A question** → ask the person in [the shared ask format](../explore/references/asking-the-user.md), then start a new helper for the tasks left.
- **A gate task** → run `/save` for it, as [the boundaries](#boundaries) say, mark it on success, then start a new helper.
- **A blocker** → report it and stop.
- **All done** → check that `tasks.md` has no unticked box, then handle the **all-tasks-complete** state above.

When no helper can start, or this `/apply` already runs inside one, work the tasks inline: follow the brief's *Build* steps, and handle each stop here. The parent owns the preview, the loosened checks, and the report.

## Finish with a preview

Completion never saves; the work stays in this working tree until the person saves or publishes.

1. **Did the app change?** CI's check:

   ```bash
   DEFAULT_BRANCH=main bash "$(git rev-parse --show-toplevel)/.github/scripts/app-untouched.sh" --worktree
   ```

   `untouched=true` with `mini_changed=false`: skip the upload and say so in one line.
2. **Upload the preview** from this host, with the Cloudflare credential from the primary worktree's `.env` ([secrets convention](../../../wiki/development/secrets.md)). If it can not run (no stack pack, no credential), say why in one line.

   ```bash
   bash "$(git rev-parse --show-toplevel)/scripts/cf-preview.sh" --alias "<change-name>"
   ```

3. **Catch loosened checks** on the working tree:

   ```bash
   DEFAULT_BRANCH=main node "$(git rev-parse --show-toplevel)/.github/scripts/loosened-checks.mjs" --worktree
   ```

   Fix each file marked *needs a reason* without asking: switch the check back on, or add [the `Check:` bullet](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason). Rerun until it exits 0.
4. **Report and ask** at [the reader's level](../explore/references/asking-the-user.md#write-at-the-readers-level): what was built and the preview URL (plus `/apps/<name>/` for a mini app); under *Checks loosened*, each `Check:` bullet in one plain line (what is no longer checked, and why); and any file you could not fix. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): publish it *(Recommended)* via [`/ship`](../ship/SKILL.md), change it more, or save it via [`/save`](../save/SKILL.md).

Each further change repeats these steps under the same alias. Make a small edit in this conversation; a change that adds tasks to `tasks.md` goes through a new helper.

## Work that changes no repo file

Work the conversation's numbered to-do in order, outward steps marked; write one if missing.

- **Steps that only read, search, or draft** run without a prompt.
- **Each outward step** (a sent message, a post, a created or changed record in a service, a payment, a deletion) shows exactly what it will do (recipient, full text, amount, target) and asks in [the shared ask format](../explore/references/asking-the-user.md). One confirmation, one action, unless the person asked for a batch. Skip and report a declined step.

Report the result without `/save`; nothing is committed. To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`.

## Boundaries

- **Git stays with `/save`** ([the change loop](../../../wiki/development/the-change-loop.md)): no commit, push, branch, PR, or CI step here. The preview upload is not git and gates nothing.
- **Never save to stop; save to finish a gate task** ([exit versus implementation](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)). Paused, blocked, failed, or tasks pending → no `/save`; report what remains and that `/save` can checkpoint it. A task whose done needs the gate (passing CI, a CI-published preview, pushed browser evidence) runs `/save`; mark it on a pass, and on a failing or unverifiable result leave it unchecked, report, and stop.
- **Resuming cold** → [`/continue <name>`](../continue/SKILL.md).
- **Pause on ambiguity or blockers** (the proposal is the intent), ending with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): ways to clear it, recommended first.
