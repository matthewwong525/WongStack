---
name: apply
description: Build the chosen change, planning first if needed, then preview it from this host; or work a non-code to-do.
user-invocable: true
---

# /apply

**Selected schedule:** [route its record](../save/references/schedule-records.md) before code or checkout; preserve its store and pending question.

`/apply` implements [the change loop](../../../wiki/development/the-change-loop.md)'s chosen plan.

## Pick the path by the work

- **Repo code or process**, including [mini apps](../../../wiki/stack/mini-apps.md) → [resolve the plan](#resolve-the-plan-first).
- **No repo file** → [work the to-do](#work-that-changes-no-repo-file).

## Resolve the plan first

Resolve the change by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, `recorded-branch`, then `sole-active`. An argument naming no existing change is intent for a new plan. An unrelated `sole-active` never overrides work this conversation explored. Unsure → ask, listing what each candidate would implement.

Check `applyRequires` in `openspec status --change "<name>" --json`:

- **All done** → apply-ready; continue.
- **The selected change is incomplete** → invoke the [`plan` skill](../plan/SKILL.md) to complete it in place.
- **No change, clear intent** → invoke `plan` with that intent.
- **Unclear intent** → ask before any plan or code.

`/apply` authorizes planning and building. After `/plan`, verify the `applyRequires` closure; paused/blocked → report and stop. Otherwise announce and keep the change's **exact name**, then [build in a helper](#build-in-a-helper).

At **all-tasks-complete**, even at invocation, [finish with a preview](#finish-with-a-preview). Final acceptance's saved CI preview skips upload, then joins the pictures/report steps. **When `/ship` invoked you, return instead**, with no upload and no `/save`; `/ship` archives and makes the one checkpoint.

## Build in a helper

Use a fresh helper on the parent's model: Agent (`general-purpose`) in Claude Code, a sub-agent in Codex. Prompt: the exact change name, then *read `$(git rev-parse --show-toplevel)/.claude/skills/apply/references/build-helper.md`, then build*. Add `store <id>` when selected. [The brief](references/build-helper.md) owns its work and return.

**Wait quietly** with the longest host wait: the Agent call in Claude Code, `wait_agent` in Codex. Timeouts → wait again; at most one short line per wait. Read none of its edited files; message only the person's answer or a stop.

Move intermediate test gates to the final phase; preserve acceptance and log the timing change, unasked. Finish all source/tests before automatic checks; source completion never claims test passes. Then run local checks once: a pre-check. Explicit early requests stand; unavailable substantive prerequisites block.

Act on reports:

- **A question** → ask the person in [the shared ask format](../explore/references/asking-the-user.md), log the answer as an `Asked` [Decision-log line](../plan/SKILL.md#explore-first), then start a new helper.
- **A blocker** → report it and stop.
- **Final acceptance** → only after all source/tests are authored, run `/save` and retained live acceptance. Tick observed passes; blocked/failed remains unchecked and stops.
- **All done** → confirm no unticked box, relay its `local checks:` line, then handle **all-tasks-complete** above.

No helper, or already inside one → work inline by the brief's *Build* steps; handle stops here.

## Finish with a preview

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
4. **Show the changed screens** before the question. Use [`/verify`'s plain checks](../verify/SKILL.md#plain-checks) on the exact current preview URL: agent-browser, temporary files, existing privacy safeguards and cleanup; no scout, save or PR comment. Prefer two distinct changed screens; a useful state or phone view can supply the second. One meaningful view → one picture. Open each image with the host image tool (Claude Read, Codex image view), with a short plain caption above it; a file link alone is insufficient. No preview, no changed UI, or capture/access failure → say why, keep any preview link and the choice; never substitute a live page or login screen.
5. **Report and ask** in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what was built, any can't-be-undone line, [the preview link](../explore/references/asking-the-user.md#print-the-previews-link), each `Check:` bullet under *Checks loosened* (what is no longer checked, why), and unfixed files. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): publish it *(Recommended)* via [`/ship`](../ship/SKILL.md), change it more, or save via [`/save`](../save/SKILL.md); plus *See the preview* when available.

Repeat under the same alias for further edits; added tasks go to a new helper.

## Work that changes no repo file

Work the conversation's numbered to-do in order, outward steps marked; write one if missing ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)).

- **Reading, searching, and drafting** need no prompt.
- **Each outward step** (a sent message, a post, a created or changed record, a payment, a deletion) shows exactly what it will do (recipient, full text, amount, target) and asks in [the shared ask format](../explore/references/asking-the-user.md). One confirmation, one action, unless the person asked for a batch. Skip and report a declined step.

Report the result without `/save`; nothing is committed. To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`.

## Boundaries

- **Git stays with `/save`** ([the change loop](../../../wiki/development/the-change-loop.md)): no commit, push, branch, PR, or CI step here, on [either route](../../../wiki/stack/artifacts-route.md). The preview upload is not git and gates nothing.
- **Never save to stop or between parts.** After source/tests are prepared, substantive live acceptance may use `/save`; tick only observed acceptance. Routine final gates belong to delivery, not implementation boxes ([why](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)).
- **Resuming cold** → [`/continue <name>`](../continue/SKILL.md).
- **Pause on ambiguity or blockers** (the proposal is the intent), ending with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): ways to clear it, recommended first.
