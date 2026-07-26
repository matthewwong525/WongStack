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
