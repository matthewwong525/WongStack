# Build first, check once at the end

**Status:** ready-to-ship
**Branch:** verify-step-strategy
**Open questions:** none

## Why

Long builds keep stopping to check the whole unfinished change. In the employee-setup work, the tests took 21 seconds and the toolkit checks took 3 minutes 15 seconds per successful run; repeating those checks after separate parts multiplied the wait, and repairs added more runs.

## What Changes

- **Finish building before checking.** Write the implementation and its tests together, then run tests and verification after the complete implementation. Separate tasks no longer trigger separate full checks.
  ```text
  TODAY
  build part → check → build part → check

  AFTER
  build all parts and their tests
                │
                ▼
        final checks and preview
                │
                ▼
             publish
  ```
- **Reuse the revision already checked.** Moving from saving to the preview walkthrough will use the same saved work, instead of saving again and starting another round of checks.
- **Check repairs when needed.** A real failure still gets fixed and checked again. Repeat only checks affected by the repair where the existing checks allow it; the final required checks and preview still complete.
- **Keep the current choices.** Asking to publish, explicitly asking to save early, and checking the live app after publishing keep their existing behavior. This adds no approval stops.

**Non-goals:** Reduce coverage, relax required checks, change employee access or hosting, remove staging isolation, or reuse an old walkthrough verdict as proof of current behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply`: Finish implementation and test authoring before running verification; defer intermediate test gates to the final phase.
- `delivery-gate`: Share the checked revision between the final checkpoint and walkthrough, preserving exact-revision publication and the existing failure rules.
- `staging-walkthrough`: Save only when current work needs a checkpoint; otherwise verify the already saved revision.

## Impact

Planning and build instructions, save/ship/verify handoff, a small read-only saved-revision helper, focused script regressions, owning workflow docs, payload inventory if a script is added, and a minor release entry. Required CI jobs and branch-wide scope detection remain intact.

## Decision log

- **2026-10-04** — Asked when this happened and to plan a fix → chose a workflow plan, with no implementation yet.
- **2026-10-04** — Asked to inspect the long-running chats → chose to include their actual checkpoint history; employee setup's source-checks record confirms separate activation, authorization, discovery and connection gates, followed by several fixture, quality and instruction-budget repairs.
- **2026-10-04** — Asked through the employee-setup handoff to stop running tests at every step → chose complete implementation first, final tests and verification afterward, and affected rechecks only after a real failure, preserving final required checks and preview without new approval stops.
- **2026-10-04** — Assumed: keep early saves or checks only when the person explicitly requests them, because automatic per-task checkpoints are the behavior being removed.
- **2026-10-04** — Assumed: preserve the existing preview walkthrough and live look, because the request changes when checks run and removes repetition rather than weakening the final checks.
- **2026-10-04** — Assumed: employee-setup scope changes remain owned by its chat, because this plan owns the reusable workflow and does not change app or repository access.

- **2026-10-04** — Check: `.github/workflows/payload.yml` adds a retained revision-handoff capture and artifact; required jobs, scope conditions and coverage thresholds remain intact. The capture interprets exact earlier instructions and exercises the current read-only helper with mock side-effect counts; actual agent obedience remains a separate observation during delivery.
- **2026-10-04** — Archive checkpoint: implementation, test sources and docs are complete. Final payload links, OpenSpec configuration, context limits and strict change validation pass; tests have not yet run. Condensed touched instructions to meet unchanged size limits. Included the published drawings release and numbered this change 30.10.0. Session facts were skipped because this checkout has no registered session; decisions remain here. The final remote gate and fresh walkthrough follow this checkpoint.
