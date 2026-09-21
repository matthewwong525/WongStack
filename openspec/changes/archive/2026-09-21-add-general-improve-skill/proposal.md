# Add a general repository improvement skill

**Status:** ready-to-ship
**Branch:** add-improve-skill-maintenance
**Open questions:** none

## Why

Fast delivery can leave duplicated rules, stale guidance, and faults that ordinary feature review misses. WongStack needs a repeatable spot check that finds useful maintenance work and delivers one supported improvement through the existing workflow.

## What Changes

- Add `/improve [area]` to investigate maintenance candidates and ship one coherent change through `/ship`; retain `--audit-only`, no-change, and blocked outcomes. (review.html#/delivery/after/handoff)
- Review recent changes plus a rotating older area, with a read-only survey script for inventory and bounded leads. Use prior change records to avoid repeating completed work. (review.html#/coverage/weekly)
- Provide general investigation guidance for documentation, consolidation, reliability, security, performance, and workflow tools. Require evidence and a verification probe before selecting work.
- Support interactive selection and explicitly unattended external jobs. Preserve user decisions, normal delivery gates, and complete stages for larger improvements. (review.html#/execution)
- Distribute the skill through the core payload, document its use, and publish an additive minor release. (review.html#/payload)

**Non-goals:** Installing a scheduler, a complete security audit, automatic feature retirement, broad dependency upgrades, a new backlog/report database, or changes to the existing delivery gates.

## Capabilities

### New Capabilities

- `repository-improvement`: Recurring repository spot checks, evidence-based selection, and one-change delivery.

### Modified Capabilities

None. The existing workflow remains the delivery owner.

## Impact

Add a skill, supporting references, and dependency-free Node scripts under `.agents/skills/improve/`. Update the payload inventory and applicable setup/discovery surfaces, README, generic agent instructions, and the owning workflow documentation. Add fixture-based script coverage to the existing payload CI. No application runtime or external service changes are required.

## Decision log

- 2026-09-21: Asked how far a normal run should go → user chose one change delivered through `/ship`.
- 2026-09-21: Asked whether scheduling belongs in this change → user chose support for manual/external weekly runs, with no scheduler installed here.
- 2026-09-21: Asked how to divide review effort → user chose recent changes plus a rotating older area.
- 2026-09-21: Assumed the skill belongs in the core payload because the request is to generalize ClaymooApp's maintenance workflow for WongStack repositories.
- 2026-09-21: Assumed `--audit-only`, meaningful staged consolidation, and a no-change result remain useful from ClaymooApp. They bound delivery without forcing cosmetic work.
- 2026-09-21: Assumed scheduled prompts or trusted host context explicitly identify unattended execution. A pending interactive question cannot establish that nobody can answer.
- 2026-09-21: Use deterministic code for inventory, date-based rotation, and bounded leads; retain model judgment for reachability, intended behavior, impact, and selection.
- 2026-09-21: Implemented the portable `/improve` skill, bounded survey and history rotation, scenario fixtures, core payload registration, external scheduling guide, and the 16.2.0 release surfaces. Required payload, configuration, review-scope, and strict OpenSpec checks passed; the delegated save now supplies the CI gate.
- 2026-09-21: CI passed for the completed implementation on PR #91. Archived the change with the synchronized `repository-improvement` capability spec; the delegated archive checkpoint now gates the exact record that will merge.
