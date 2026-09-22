---
name: save
description: Checkpoint work: maintain the change and session context, commit, push, update the PR, wait for CI, and return the preview. Use to save or share work. Notes/wiki-only saves go to the default branch. Accepts an optional status or checkpoint note. Does not implement tasks or merge.
user-invocable: true
---

# /save

The checkpoint owns branch creation, record maintenance, spec reconciliation, commit, push, PR updates, and CI recovery. Invocation authorizes these actions and they are taken without a prompt. Confirm actions outside this runbook, in [the ask format every skill uses](../explore/references/asking-the-user.md). Never force push, bypass hooks, amend merged commits, or merge a PR. OpenSpec owns planning files and never runs Git. [The change loop](../../../wiki/development/the-change-loop.md) owns delivery policy; nothing builds locally as a prerequisite.

Input: `/save [note]`. A status-like note sets `in-progress`, `blocked (<reason>)`, `ready-to-ship`, or `parked`; other notes seed the dated Decision-log entry. Save captures session understanding for cold resume. Required facts must be in pushed repo files, with repo-relative paths.

## 1. Protect credentials and select the route

**Every route excludes all real credential values supplied, rotated, read, or written in this session** from tracked files, changes, notes, messages, PR text, and reports. Keep values only in ephemeral memory and the intended ignored live file. Non-secret variable names and sourcing guidance can be recorded.

Load each matching procedure before its actions; conditions can combine:

| Condition | Required procedure |
|---|---|
| User supplied or rotated an explicitly named secret | [Named-secret persistence](references/named-secrets.md), before writing records |
| Every changed path is under `notes/` or `wiki/`, or conversation-only capture | [Prose save](references/prose-save.md), before staging or publication |
| Code or a code plan needs a new change | [New-plan fallback](references/new-plan.md), before authoring |
| Exact selected handoff is archived | [Archive maintenance](references/archived-save.md), before updating it |

Assume default branch `main`. If it exists neither locally nor remotely, resolve `defaultBranchRef.name` with `gh repo view`. Fetch that branch before comparing; failed inspection is an error, not evidence of no work.

```bash
git fetch origin main
openspec context --json
openspec list --json
bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json
```

Use the [evidence contract](references/checkpoint-evidence.md) for fields and selected-root/base/ref options. Read it before interpreting helper output. The helper never selects intent or mutates Git; errors stop selection. Refresh observations after state changes.

Keep `BRANCH`, `NAME`, and `CHANGE_ROOT` separate. Select in this order:

1. Exact user/session change, or the exact archive passed by ship.
2. Unique changed active candidate, else unique changed archive candidate.
3. Unique recorded Branch match, then legacy same-name active or archive match.
4. No applicable change: author only if the session established code or a code plan. Multiple plausible matches require clarification before staging; do not guess or create a duplicate named for the branch.

An archive always uses the normal route. Otherwise compare **every** dirty path, including rename sources, with the exact `notes/` and `wiki/` allowlist. One other path makes the whole save normal; never split a mixed diff or route by extension. Follow the prose reference when its condition holds. A pure conversation gets a note, not an empty plan. Nothing learned, decided, or changed means report and stop.

## 2. Maintain the handoff and capture context

For normal work, use the latest agreed plan and relevant diff. Keep its existing headings; make the current intent self-contained. Follow new-plan or archive procedures only when their conditions apply.

Keep an existing feature branch. On the default branch or detached HEAD, create a feature branch with `git checkout -b "$SLUG"`. Derive its name from the selected change or new topic; only if the session is unreadable use the worktree name. Append a short SHA on a name collision. Never change an established `NAME` to match the branch. Establish the plan before committing and create required artifacts before their checkpoint.

Maintain these surfaces:

- Proposal header: current `**Status:**`, actual `**Branch:**`, and `**Open questions:**` (`none` when empty).
- Plan sections: current intent, edited in place. Tasks: actual checked state and any agreed additions.
- `## Decision log`: append one dated entry with what landed, decisions and reasons, rejected options, and blockers. Never rewrite, reorder, or delete earlier entries.
- Session note: write only when the session adds context beyond the diff and Decision log. Read [notes/README.md](../../../notes/README.md) when capture is needed; update the same `notes/<name>.md`, preserve rationale and user constraints, and do not duplicate the change. A prose topic supplies its own note name.

Refresh active and archived reviews through the builder:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "$CHANGE_ROOT"
```

Unchanged output stays unchanged. Marked legacy pages receive proposal-only refresh; unsupported or missing legacy pages are reported and left alone. Missing/invalid current-format inputs leave the old page intact: report it as stale even if the checkpoint continues. Stage the visual input and generated page with the handoff.

For an active change with deltas, follow [spec reconciliation](references/spec-sync.md). Without deltas, skip reconciliation and honor the schema's permitted `skip_specs` when validating. Archived changes skip active sync. Use CLI status/list for actual artifact and task progress, not guessed paths or an assumed four-artifact schema.

## 3. Stage, exclude values, and commit

Stage only intended implementation, handoff, removal, and note paths. Never use `git add .`. Inspect the staged path list; do not include unrelated work. A plan-only save is valid: its new artifacts must be committed too.

Before **every commit and publication**, inspect the proposed durable content for all encountered credential values. For explicitly handled keys, read each nonempty value silently from its intended live file and feed it on stdin to `git grep --cached -l -F -f -`; only matching paths may be printed. Do not put values in command arguments. Any match stops the save until removed and restaged. Apply the same exclusion to the note, Decision log, summary, commit message, PR body, and report, including values encountered without a new persistence action.

Commit staged work with a one-line message in repo style (inspect recent subjects), through a literal message file or quoted heredoc, with the usual `Co-Authored-By: Claude` trailer. A clean tree with no commits ahead has nothing to push; report that outcome. Existing unpushed commits still need publication when no new commit is needed. A non-CI failure stops with its exact error; no force or hook bypass.

## 4. Publish and wait for the gate

Discover the preview with [preview-url.sh](scripts/preview-url.sh); never construct a URL from a naming convention. Follow [the git gate](references/git-gate.md) to open or update the PR, assemble its body with the renderer, push, and wait for CI. The body uses the maintained change, exact checklist, agent-written summary, and optional discovered links. An archive remains the selected source.

CI failure uses the existing three-attempt fix/commit/push/wait loop. Other outcomes retain their meaning: `UNKNOWN` is unverified, never no checks. Save can finish unverified because it does not merge. Ship may merge only on `SUCCESS` or `NONE`. No checkpoint reuse is introduced; task-driven saves and completion/archive saves keep their existing boundaries.

## 5. Report

For a normal save, report branch and commit, PR link, maintained change or archive and Status, note written/updated or skipped, CI result (including fixes or uncertainty), and the discovered preview URL or its absence. End with exactly one `SAVE_GATE_RESULT=SUCCESS|NONE|UNKNOWN|TIMEOUT|FAILURE`, using the actual single value. Name the active continue command only for an active change. Keep errors explicit and values excluded.

A successful direct prose save uses only the two-line report from its reference. Save never merges any route; ship owns archive and merge.

A save invoked directly by the user ends with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) after the gate line — normally continue the tasks, ship it, or stop here; on a failing or unverified gate, the supported ways to clear it. A save inside an authorized chain reports and returns without asking.
