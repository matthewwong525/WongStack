# Automatic `/save` after completed `/apply`

**Status:** ready-to-ship
**Open questions:** none

## Why

Finishing `/apply` currently leaves a fully implemented change only in the working tree and requires the user to remember a separate `/save`. Completion should produce the durable branch, PR, OpenSpec handoff, and CI result automatically, while paused or blocked work should remain under the user's control.

**Non-goals:** `/apply` will not absorb or duplicate git logic, auto-save partial work, merge changes, or archive them. `/save` remains the single owner of sync, commit, push, PR, preview, and CI behavior.

## What Changes

- Make successful completion of every `/apply` task automatically invoke the existing `/save` skill.
- Keep `/apply` itself free of git implementation: it delegates the completed change to `/save` rather than reproducing that runbook.
- Do not auto-save when implementation pauses, is blocked, is interrupted, or still has pending tasks; users may still invoke `/save` manually for an in-progress checkpoint.
- Update the shipped change-loop guidance and release metadata to describe the completion handoff.

## Capabilities

### New Capabilities

- `apply-completion-handoff`: Defines when `/apply` automatically hands a completed change to `/save` and when it must leave checkpointing explicit.

### Modified Capabilities

<!-- None. -->

## Impact

- **Skills:** `.claude/skills/apply/SKILL.md` and its agent-facing mirror.
- **Process docs:** `wiki/development/the-change-loop.md` plus concise loop references whose current wording contradicts automatic completion saving.
- **Release:** `VERSION` and `CHANGELOG.md`.
- **Runtime behavior:** A completed `/apply` now authorizes and runs the existing `/save` workflow, including its branch, commit, push, PR, preview, and CI effects.

## Decision log

- **2026-07-26** — Planned and implemented the completed-change handoff: `/apply` invokes `/save` exactly once at an all-done state, including an already-complete task list, while paused or blocked work remains unsaved unless the user explicitly checkpoints it. Kept every git, PR, preview, and CI mechanic inside `/save`; aligned the wrapper, bundled OpenSpec apply guidance, live loop docs, onboarding, and release metadata; validated the delta spec and bumped WongStack to 6.2.0.
