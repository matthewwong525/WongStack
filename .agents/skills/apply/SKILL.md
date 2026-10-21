---
name: apply
description: Build the chosen change, planning first if needed, then preview it from this host; or work a non-code to-do.
user-invocable: true
---

# /apply

**Selected schedule:** [route its record](../save/references/schedule-records.md) before code or checkout.

Build [the chosen plan](../../../wiki/development/the-change-loop.md).

**No repo file** → [work the to-do](#work-that-changes-no-repo-file). Repo code or process, [mini apps](../../../wiki/stack/mini-apps.md) included → resolve the plan.

## Resolve the plan first

Build the change this chat is about, found by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs). An argument naming no existing change is intent for a new plan.

Attached review notes → [apply them to the existing change](../plan/SKILL.md#review-notes) first, then keep building.

Check `applyRequires` in `openspec status --change "<name>" --json`:

- **All done** → apply-ready; continue.
- **The selected change is incomplete** → invoke the [`plan` skill](../plan/SKILL.md) to complete it in place.
- **No change, clear intent** → invoke `plan` with that intent.
- **Unclear intent** → ask before any plan or code.

`/apply` authorizes planning and building. After `/plan`, verify the `applyRequires` closure; paused/blocked → report and stop. Otherwise keep its **exact name** and [build in a helper](#build-in-a-helper).

At **all-tasks-complete**, even at invocation, [finish with a preview](#finish-with-a-preview), after [a second look](#a-second-look) when this run built. Final acceptance's saved CI preview skips upload, then joins the pictures/report steps. **Invoked by `/ship`**, return after the second look, with no upload or `/save`.

## Build in a helper

Use a fresh helper on the parent's model, free of the planning talk: Agent (`general-purpose`) in Claude Code, a sub-agent in Codex. Prompt: the exact change name, then *read `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/build-helper.md`, then build*. Add `store <id>` when selected. [The brief](references/build-helper.md) owns its work, its build order, and its return.

**Let it build unwatched**, with the longest host wait (the Agent call in Claude Code, `wait_agent` in Codex), waiting again on a timeout: don't narrate waits or read its files; message it only with an answer or a stop.

Act on reports:

- **A question** → ask the person in [the shared ask format](../explore/references/asking-the-user.md), log the answer as an `Asked` [Decision-log line](../plan/SKILL.md#explore-first), then start a new helper.
- **A blocker** → report it and stop, ending with [the ways to clear it](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step).
- **Final acceptance** → once the build and its tests are written, run `/save` and the retained live acceptance. Tick only what you saw pass; a blocked or failed check stays unticked and stops.
- **All done** → confirm no unticked box, relay its `local checks:` line, then handle **all-tasks-complete** above.

No helper, or inside one → follow the brief inline.

## A second look

Start a fresh helper as above, prompted with the change name, then *read `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/review-helper.md`, then review*. Route [its findings](references/review-helper.md) by [fix it or ask](../../../wiki/development/the-change-loop.md#fix-it-or-ask): `fix` → a new build helper, which may dispute one with a reason, then the reviewer rereads; two rounds at most. The rest → one question, as above. No helper → say no review ran.

## Finish with a preview

1. **Did the app change?** CI's own check, `DEFAULT_BRANCH=main bash "$(git rev-parse --show-toplevel)/.github/scripts/app-untouched.sh" --worktree`: `untouched=true` → skip the upload and say so in one line.
2. **Upload the preview** from this host, `bash "$(git rev-parse --show-toplevel)/scripts/cf-preview.sh" --alias "<change-name>"`, with the Cloudflare credential from the primary worktree's `.env` ([secrets](../../../wiki/development/secrets.md)). Can't run (no stack pack, no credential) → say why in one line.

3. **Catch loosened checks:** `DEFAULT_BRANCH=main node "$(git rev-parse --show-toplevel)/.github/scripts/loosened-checks.mjs" --worktree`. Fix each file marked *needs a reason*: switch the check back on, or add [the `Check:` bullet](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason) when the plan settles it, else ask. Rerun until it exits 0.
4. **Show one or two changed screens** from this preview as pictures before the question, by [`/verify`'s plain checks](../verify/SKILL.md#plain-checks) with no scout, save, or PR comment. Open each with the host image tool (Claude Read, Codex image view) under a short caption: a file link shows nothing. None to show, or a capture fails → say why; keep the link and the choice.
5. **Report and ask** in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what was built, what the review found and fixed, any can't-be-undone line, [the preview link](../explore/references/asking-the-user.md#print-the-previews-link), each `Check:` bullet under *Checks loosened* (what is no longer checked, why), and unfixed files. Ask [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) with the question tool: publish it *(Recommended)* via [`/ship`](../ship/SKILL.md), change it more, or save via [`/save`](../save/SKILL.md).

Repeat under the same alias for further edits; added tasks go to a new helper.

## Work that changes no repo file

Work the conversation's numbered to-do in order, writing one if missing ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)). Reading, searching, and drafting need no prompt. Each outward step shows exactly what it will do (recipient, full text, amount, target) and asks in [the shared ask format](../explore/references/asking-the-user.md): one confirmation, one action, unless the person asked for a batch. Skip and report a declined step. Report without `/save`; nothing is committed.

## Boundaries

- **Git stays with `/save`** ([the change loop](../../../wiki/development/the-change-loop.md)), on [either route](../../../wiki/stack/artifacts-route.md); the preview upload is not git and gates nothing.
- **Never save to stop or between parts** ([why](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)); final acceptance above is the one exception.
