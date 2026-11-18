<!-- openspec-archive v1 2026-07-26-apply-auto-save-behavior -->
<!-- file proposal.md utf8 2329 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 3799 -->
## Context

`/apply` currently fronts OpenSpec implementation and deliberately performs no git work. When all tasks are complete it only tells the user to invoke `/save`, leaving the durable change, PR, preview, and CI handoff dependent on a second remembered command. `/save` already owns that entire checkpoint workflow and must remain its single source of truth.

The behavior is defined in prose-based skills and doctrine rather than application code. The change therefore needs a clear terminal-state contract across the `/apply` wrapper, its underlying OpenSpec apply skill, and the change-loop documentation.

## Goals / Non-Goals

**Goals:**

- Treat all-tasks-complete as a deterministic handoff from `/apply` to `/save`.
- Preserve `/save` as the only implementation of sync and git behavior.
- Keep partial or blocked work from being pushed unexpectedly.
- Keep manual `/save` useful for deliberate in-progress checkpoints.

**Non-Goals:**

- Moving git commands into `/apply`.
- Saving after each task or after a paused/failed apply.
- Changing `/save`, `/ship`, or archive semantics.
- Adding hooks, configuration, or a prompt before the completion handoff.

## Decisions

### Delegate at the wrapper boundary

The WongStack `/apply` skill will invoke `/save` after the OpenSpec apply workflow reaches an all-done state. The underlying `openspec-apply-change` completion instructions will also name the handoff so direct consumers and generated guidance do not contradict the wrapper.

Alternative considered: copy `/save` steps into `/apply`. Rejected because it would create a second git runbook that could drift from the canonical checkpoint skill.

### Auto-save only at a complete terminal state

The trigger is zero remaining tasks, including when `/apply` starts against an already-complete change. Any paused, blocked, interrupted, or failed run with pending work stops without automatic saving and points to manual `/save`.

Alternative considered: save every apply session regardless of progress. Rejected because an implementation blocker should not silently turn partial work into a pushed checkpoint.

### Keep the loop vocabulary, clarify the handoff

`/apply` and `/save` remain distinct verbs and responsibilities. Diagrams may continue to show both stages, but prose will state that completing `/apply` crosses into `/save` automatically; manual `/save` remains available at any checkpoint.

Alternative considered: merge the skills into a single verb. Rejected because `/save` is still needed independently for plan-only and partial checkpoints.

## Risks / Trade-offs

- **[A completed apply now causes external git/PR effects without another command]** → The behavior is explicit in `/apply` metadata and docs, and is limited to the unambiguous all-done state requested by the user.
- **[Recursive or duplicated checkpoint execution]** → `/apply` invokes `/save` exactly once after confirming all tasks; `/save` never invokes `/apply`.
- **[Direct OpenSpec apply guidance diverges from the WongStack wrapper]** → Update the bundled `openspec-apply-change` completion behavior alongside the wrapper.
- **[Users lose partial checkpointing]** → Preserve direct `/save` invocation and mention it on any incomplete stop.

## Migration Plan

1. Update the apply skill contracts and change-loop doctrine.
2. Bump the minor version and add a newest-first changelog entry because this is an additive but user-visible workflow behavior change.
3. Verify live prose contains no claim that a completed `/apply` merely suggests a separate `/save`, while historical archived changes remain untouched.

Rollback is a prose revert: restore the no-git completion boundary and remove the automatic handoff language in a subsequent versioned release.

## Open Questions

None.

<!-- end design.md -->
<!-- file tasks.md utf8 1193 -->
## 1. Apply skill behavior

- [x] 1.1 Update `.agents/skills/apply/SKILL.md` so an all-tasks-complete state invokes `/save` exactly once, including an already-complete change
- [x] 1.2 Update `.agents/skills/openspec-apply-change/SKILL.md` completion and pause guidance to distinguish automatic completed-change saving from optional partial checkpoints

## 2. Change-loop documentation

- [x] 2.1 Update `wiki/development/the-change-loop.md` to describe the automatic completion handoff while preserving `/save` as the independent git owner
- [x] 2.2 Align live concise loop guidance in `CLAUDE.md`, `README.md`, `.agents/skills/plan/SKILL.md`, and `.agents/skills/wong-setup/SKILL.md` with the new behavior

## 3. Release

- [x] 3.1 Add a newest-first `CHANGELOG.md` entry describing the `/apply` completion handoff and its partial-work boundary
- [x] 3.2 Bump `VERSION` from `6.1.1` to `6.2.0`

## 4. Verification

- [x] 4.1 Validate the OpenSpec change and verify live prose has no remaining claim that completed `/apply` only suggests a separate `/save`
- [x] 4.2 Confirm every implementation and verification task is complete, reaching the terminal state that hands the change to `/save`

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 1863 -->
## ADDED Requirements

### Requirement: Completed apply automatically checkpoints

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete
- **THEN** it invokes `/save` for the completed change
- **AND** it reports completion using the checkpoint result from `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it invokes `/save` so any completed but uncheckpointed work receives the normal durable handoff

### Requirement: Incomplete apply does not automatically checkpoint

`/apply` MUST NOT automatically invoke `/save` while tasks remain pending or when implementation is paused, blocked, interrupted, or fails. It SHALL tell the user that `/save` remains available for an intentional partial checkpoint.

#### Scenario: Implementation pauses with pending tasks

- **WHEN** `/apply` stops because of ambiguity, a blocker, interruption, or an implementation failure while tasks remain
- **THEN** it does not invoke `/save`
- **AND** it reports the remaining work and the option to run `/save` manually

### Requirement: Save remains independently invocable

The automatic completion handoff SHALL NOT remove or narrow `/save` as an independently invocable checkpoint at any point in the change loop.

#### Scenario: User wants an in-progress checkpoint

- **WHEN** the user invokes `/save` before `/apply` has completed every task
- **THEN** `/save` performs its existing checkpoint workflow without requiring `/apply` completion

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-26

~~~
<!-- end .openspec.yaml -->
