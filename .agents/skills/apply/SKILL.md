---
name: apply
description: Implement the selected OpenSpec change, planning first when needed, and end with a preview from this host, or work a non-code to-do with a confirm before each outward action. Use for new implementation, including a new mini app; use /continue to resume a saved change cold.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of [the change loop](../../../wiki/development/the-change-loop.md) — its name for OpenSpec's **apply** step. It ensures the current line of work has an apply-ready OpenSpec change, then works that change's `tasks.md`: reads the proposal + specs + design, implements each pending task, and checks off `- [x]` as it goes.

## Pick the path by the work

The plan you need depends on what the work changes:

- **The repo's code or process** → an apply-ready OpenSpec change. [Resolve it below](#resolve-the-plan-first). A new standalone page or small tool is code too: build it as a mini app, laid out as [mini apps](../../../wiki/stack/mini-apps.md) says.
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

Then [build in a helper](#build-in-a-helper). Report incomplete work or actual blockers.

When it reaches an **all-tasks-complete** state — including when the selected change was already complete at invocation — [finish with a preview](#finish-with-a-preview). When a task-driven `/save` completed the final task, report from its result and its CI preview instead, with no upload.

**Inside `/ship`, return instead.** When `/ship` invoked you, report completion and return with no upload and no `/save`: `/ship` archives and makes the run's one checkpoint.

## Build in a helper

Work the tasks in a fresh helper agent, so the build does not carry this conversation's planning talk. In Claude Code, start it with the Agent tool (`general-purpose`); in Codex, spawn a sub-agent. Keep the parent's model. The prompt is two lines: the exact change name, and *read `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/build-helper.md`, then build*. [The brief](references/build-helper.md) owns what the helper does and what it returns.

Read each report and act on its stop:

- **A question** → ask the person in [the shared ask format](../explore/references/asking-the-user.md), then start a new helper for the tasks left.
- **A gate task** → run `/save` for it, as [the boundaries](#boundaries) say, mark it on success, then start a new helper.
- **A blocker** → report it and stop.
- **All done** → check that `tasks.md` has no unticked box, then handle the **all-tasks-complete** state above.

When no helper can start, or this `/apply` already runs inside one, work the tasks inline: follow the brief's *Build* steps, and handle each stop here. The parent owns the preview, the loosened checks, and the report.

## Finish with a preview

Completion never saves. The work stays in this working tree until the person saves or publishes.

1. **Did the app change?** Ask the same check CI uses:

   ```bash
   DEFAULT_BRANCH=main bash "$(git rev-parse --show-toplevel)/.github/scripts/app-untouched.sh" --worktree
   ```

   `untouched=true` with `mini_changed=false` means there is nothing new to look at: skip the upload and say so in one line.
2. **Upload the preview** from this host, with the Cloudflare credential sourced from the primary worktree's `.env` as [the secrets convention](../../../wiki/development/secrets.md) says:

   ```bash
   bash "$(git rev-parse --show-toplevel)/scripts/cf-preview.sh" --alias "<change-name>"
   ```

   It builds the whole app on staging data, so the first run in a checkout also installs it. When the upload can not run — no stack pack, no credential — say why in one line.
3. **Catch loosened checks.** Run the check CI runs, on the working tree:

   ```bash
   DEFAULT_BRANCH=main node "$(git rev-parse --show-toplevel)/.github/scripts/loosened-checks.mjs" --worktree
   ```

   Fix each file it marks *needs a reason* without asking: switch the check back on, or add the `Check:` bullet [the gate](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason) describes. Run it again until it exits 0.
4. **Report and ask.** Lead with the outcome in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what was built and the preview URL, with `/apps/<name>/` added for a mini app. When the change has `Check:` bullets, list each one under *Checks loosened* in one plain line — what no longer gets checked, and why — and name any file you could not fix. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): publish it *(Recommended)*, change it more, or save it to keep the progress. Publishing runs [`/ship`](../ship/SKILL.md). Saving runs [`/save`](../save/SKILL.md), which opens the pull request.

Each further change the person asks for repeats these steps under the same alias. Make a small edit in this conversation; a change that adds tasks to `tasks.md` goes through a new helper.

## Work that changes no repo file

The plan is the numbered to-do in the conversation, with each outward step marked. When there is none, write one first. Work it in order:

- **Steps that only read, search, or draft** run without a prompt.
- **Each outward step** — a sent message, a post, a created or changed record in a service, a payment, a deletion — shows exactly what it will do (recipient, full text, amount, target) and asks, in [the shared ask format](../explore/references/asking-the-user.md). One confirmation covers one action, unless the person asked for a batch. A declined step is skipped and reported.

When the steps are done, report the result. Do not invoke `/save`: there is nothing to commit. To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`.

## Boundaries

- **Git stays with `/save`.** `/apply` reads branch evidence but runs no commit, push, branch, PR, or CI step. The preview upload is not git, and it gates nothing; `/apply` runs it.
- **Never save to stop.** Paused, blocked, failed, or ending with tasks pending → no `/save`; report the remaining work and that `/save` can checkpoint it.
- **A task that needs the gate is done through `/save`** — a passing CI run, a CI-published preview, or pushed browser evidence: invoke it, read the result, mark the task, continue. A failing or unverifiable result leaves the task unchecked; report and stop. [Exit versus implementation](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task) owns the rule.
- **Resuming cold** (a fresh clone, another machine) → [`/continue <name>`](../continue/SKILL.md), which hands off here.
- **Pause on ambiguity or blockers**; the proposal is the intent. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): the ways to clear the blocker, recommended first.

Completed tasks end with a preview from this host. **`/save`** commits, pushes, and opens the PR whenever the person wants a checkpoint. **`/ship`** saves, waits for CI, archives, and merges.
