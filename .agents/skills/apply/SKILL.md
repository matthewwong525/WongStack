---
name: apply
description: Build the chosen change, planning first if needed, then preview it from this host; or work a non-code to-do.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of [the change loop](../../../wiki/development/the-change-loop.md), OpenSpec's **apply** step.

## Pick the path by the work

- **The repo's code or process**, including a [mini app](../../../wiki/stack/mini-apps.md) → an apply-ready OpenSpec change: [resolve it below](#resolve-the-plan-first).
- **No repo file** (research, an errand, a message, a data change in a service) → [the to-do path](#work-that-changes-no-repo-file).

## Resolve the plan first

Resolve the change by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, `recorded-branch`, then `sole-active`. An argument naming no existing change is intent for a new plan. An unrelated `sole-active` never overrides work this conversation explored. Unsure → ask, listing what each candidate would implement; never guess.

Check `applyRequires` in `openspec status --change "<name>" --json`:

- **All done** → apply-ready; continue.
- **The selected change is incomplete** → invoke the [`plan` skill](../plan/SKILL.md) to complete it in place.
- **No change, clear intent** → invoke `plan` with that intent.
- **Unclear intent** → ask before any plan or code.

`/apply` authorizes plan-then-implement. After `/plan` returns, verify the `applyRequires` closure; paused or blocked → report and stop. Otherwise announce the change's **exact name** and keep it; no other change may replace it. Then [build in a helper](#build-in-a-helper).

At **all-tasks-complete**, even at invocation, [finish with a preview](#finish-with-a-preview), unless a task-driven `/save` completed the final task: then report its result and CI preview, with no upload. **When `/ship` invoked you, return instead**, with no upload and no `/save`; `/ship` archives and makes the one checkpoint.

## Build in a helper

Work the tasks in a fresh helper agent, so the build skips this conversation's planning talk: the Agent tool (`general-purpose`) in Claude Code, a sub-agent in Codex, on the parent's model. The prompt is two lines: the exact change name, and *read `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/build-helper.md`, then build*. Add `store <id>` as a third line when a store was selected. [The brief](references/build-helper.md) owns what the helper does and returns.

Act on each report's stop:

- **A question** → ask the person in [the shared ask format](../explore/references/asking-the-user.md), then start a new helper for the tasks left.
- **A gate task** → run `/save` for it by [the boundaries](#boundaries), then start a new helper.
- **A blocker** → report it and stop.
- **All done** → check `tasks.md` has no unticked box, then handle **all-tasks-complete** above.

When no helper can start, or this `/apply` already runs inside one, work inline by the brief's *Build* steps and handle each stop here.

## Finish with a preview

The work stays in this working tree until the person saves or publishes.

1. **Did the app change?** CI's own check:

   ```bash
   DEFAULT_BRANCH=main bash "$(git rev-parse --show-toplevel)/.github/scripts/app-untouched.sh" --worktree
   ```

   `untouched=true` → skip the upload and say so in one line.
2. **Upload the preview** from this host, with the Cloudflare credential from the primary worktree's `.env` ([secrets](../../../wiki/development/secrets.md)). Can't run (no stack pack, no credential) → say why in one line.

   ```bash
   bash "$(git rev-parse --show-toplevel)/scripts/cf-preview.sh" --alias "<change-name>"
   ```

3. **Catch loosened checks:**

   ```bash
   DEFAULT_BRANCH=main node "$(git rev-parse --show-toplevel)/.github/scripts/loosened-checks.mjs" --worktree
   ```

   Fix each file marked *needs a reason* without asking: switch the check back on, or add [the `Check:` bullet](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason). Rerun until it exits 0.
4. **Report and ask** in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what was built, [the preview's link](../explore/references/asking-the-user.md#print-the-previews-link), each `Check:` bullet under *Checks loosened* as one plain line (what is no longer checked, and why), and any file you could not fix. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): publish it *(Recommended)* via [`/ship`](../ship/SKILL.md), change it more, or save it via [`/save`](../save/SKILL.md); plus *See the preview* after an upload.

Each further change repeats these steps under the same alias. Make a small edit here; a change that adds tasks to `tasks.md` goes to a new helper.

## Work that changes no repo file

Work the conversation's numbered to-do in order, outward steps marked; write one if missing ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)).

- **Reading, searching, and drafting** need no prompt.
- **Each outward step** (a sent message, a post, a created or changed record, a payment, a deletion) shows exactly what it will do (recipient, full text, amount, target) and asks in [the shared ask format](../explore/references/asking-the-user.md). One confirmation, one action, unless the person asked for a batch. Skip and report a declined step.

Report the result without `/save`; nothing is committed. To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`.

## Boundaries

- **Git stays with `/save`** ([the change loop](../../../wiki/development/the-change-loop.md)): no commit, push, branch, PR, or CI step here. The preview upload is not git and gates nothing.
- **Never save to stop; save to finish a gate task** ([why](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)): report unfinished work for `/save` to checkpoint. A gate task runs `/save`: tick it on a pass; otherwise leave it unchecked, report, and stop.
- **Resuming cold** → [`/continue <name>`](../continue/SKILL.md).
- **Pause on ambiguity or blockers** (the proposal is the intent), ending with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): ways to clear it, recommended first.
