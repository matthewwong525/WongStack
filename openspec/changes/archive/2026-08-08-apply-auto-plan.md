<!-- openspec-archive v1 2026-08-08-apply-auto-plan -->
<!-- file proposal.md utf8 3038 -->
# Apply plans on demand

**Status:** ready-to-ship
**Open questions:** none

## Why

`/apply` only works after a separate `/plan`, so a user who has already clarified the work in `/explore` must remember an orchestration detail before implementation can begin. Worse, a bare apply can auto-select an unrelated active change when the current line of work has no plan, then stop on that change's missing artifacts.

## What Changes

- Make `/apply` resolve the change for the current line of work before delegating to OpenSpec apply.
- When that work has no apply-ready change, invoke `/plan` first and then apply the exact change `/plan` created or completed.
- Preserve direct application of an explicit or contextually relevant apply-ready change, and preserve the existing `/apply` → `/save` completion handoff.
- Document `/explore` → `/apply` as a supported convenience path whose implicit planning still produces the ordinary durable OpenSpec artifacts.
- Release the payload behavior as WongStack 9.6.0.

**Non-goals:** `/apply` does not absorb OpenSpec artifact authoring, git, checkpoint, or merge mechanics; standalone `/plan` remains available when the user wants to review the plan before implementation; unrelated active changes are not silently repurposed.

## Capabilities

### New Capabilities

- `apply-plan-handoff`: Defines how `/apply` resolves an applicable plan and delegates to `/plan` before implementation when needed.

### Modified Capabilities

None. The existing `apply-completion-handoff` contract remains unchanged.

## Impact

- Workflow skills: `.claude/skills/apply/SKILL.md`, with a small handoff clarification in `.claude/skills/plan/SKILL.md` if needed.
- Workflow guidance: `wiki/development/the-change-loop.md`, `README.md`, and the generic WongStack conventions in `CLAUDE.md` where the supported entry path is summarized.
- OpenSpec: one new capability spec that composes with the existing apply completion contract.
- Release surfaces: `VERSION`, `CHANGELOG.md`, and the payload-link validation required for every payload release.

## Decision log

- **2026-08-08** — Implemented all 9 tasks and released the payload as 9.6.0. `/apply` now resolves the current line of work before repository-wide active changes, invokes `/plan` for missing or incomplete apply-required artifacts, and passes the exact resulting name to OpenSpec apply. Kept standalone `/plan` as the review stop, `/continue` as the cold-session on-ramp, and `/save` as the exactly-once completed checkpoint. Updated the canonical change-loop guidance and onboarding summaries, validated all nine routing/ownership scenarios, and confirmed every payload install shape has no dead internal links.
- **2026-08-08** — `/ship` archived the completed change at `openspec/changes/archive/2026-08-08-apply-auto-plan/`. The `apply-plan-handoff` delta was already synced into `openspec/specs/apply-plan-handoff/spec.md`; the delegated archive checkpoint will push this immutable record and gate the exact commit before squash merge.

<!-- end proposal.md -->
<!-- file design.md utf8 4662 -->
## Context

The WongStack `/apply` wrapper currently delegates immediately to `openspec-apply-change`. That underlying skill resolves an explicit or inferred active change and stops when required artifacts are missing. This works after `/plan`, but it cannot distinguish a newly explored line of work from an unrelated sole active change. The checkout used during exploration demonstrates the failure: branch `apply-auto-plan` carries new intent while the only active entry, `improve-openspec-plans`, is an unrelated empty scaffold, so today's bare apply would select it and stop blocked.

`/plan`, OpenSpec apply, and `/save` already own artifact creation, task implementation, and git/checkpoint behavior respectively. The change should compose those owners rather than copy them.

## Goals / Non-Goals

**Goals:**

- Make `/explore` → `/apply` a reliable path that still creates a complete OpenSpec change before code is written.
- Prefer the current line of work over unrelated repository-global active-change state.
- Preserve explicit existing-change application and the completed `/apply` → `/save` handoff.
- Keep the behavior explainable as one preflight decision in the `/apply` wrapper.

**Non-Goals:**

- Do not merge `/plan` and `/apply` into one skill or make standalone `/plan` implement automatically.
- Do not copy artifact templates into `/apply` or git mechanics out of `/save`.
- Do not change `/continue`, which remains the cold-session branch checkout and orientation path.
- Do not edit the OpenSpec-generated `openspec-*` skills; target repositories regenerate those from their installed CLI.

## Decisions

### `/apply` owns the orchestration preflight

The WongStack wrapper will resolve whether the requested line of work has an apply-ready change before invoking `openspec-apply-change`. If not, it invokes `/plan`, then passes the resulting change name explicitly to the apply skill.

This belongs in the wrapper because the shortcut is WongStack workflow policy. Changing `openspec-apply-change` would edit a generated, non-payload file and would make a generic OpenSpec action responsible for WongStack's higher-level verb composition.

### Resolve relevance before repository-wide uniqueness

Resolution order is:

1. An explicit change reference or description supplied with `/apply`.
2. The change created or discussed in the current conversation.
3. An active change matching the current branch.
4. A sole active change only when the conversation establishes no different new work.
5. Ask when intent remains ambiguous.

This keeps the existing convenient sole-change selection for cold, context-free calls while preventing stale or unrelated work from stealing an explored request.

### Treat apply readiness as the boundary

The preflight checks OpenSpec status and its schema-defined `applyRequires`, rather than checking whether the literal `/plan` command appeared in the transcript. A ready change goes straight to implementation. Missing or incomplete required artifacts route through `/plan`; an explicitly selected existing change is completed in place rather than duplicated.

This is more durable than command-history detection because changes can be produced by `/plan`, `/improve`, `/wong-sync`, or another compliant OpenSpec author.

### Preserve a reviewable standalone plan

`/apply` itself is the user's authorization to plan and implement in one run. `/plan` invoked alone still stops once artifacts are apply-ready. The automatic path therefore removes ceremony without removing the deliberate review checkpoint for users who want it.

## Risks / Trade-offs

- **A conversation mentions multiple possible changes** → Ask rather than choosing; automatic planning only runs when the implementation intent is clear.
- **An existing incomplete change conflicts with `/plan`'s new-change guardrail** → The `/apply` handoff identifies the existing change and the user's request to continue it, so `/plan` completes the selected artifacts rather than asking whether to create a duplicate.
- **Documentation implies `/plan` is skipped** → Describe it as implicit planning and keep the canonical loop intact; the shortcut changes invocation count, not the durable stages.
- **A new payload link is valid here but absent in targets** → Run `node scripts/check-payload-links.mjs` with the required version and changelog update.

## Migration Plan

Update the skill and guidance atomically as a minor WongStack release. Existing explicit `/plan` → `/apply` and `/continue` flows remain compatible. Rollback is the prior markdown payload; no data or runtime migration is required.

## Open Questions

None.

<!-- end design.md -->
<!-- file tasks.md utf8 1813 -->
## 1. Apply and plan skills

- [x] 1.1 Update `.claude/skills/apply/SKILL.md` with the applicable-change resolution order, apply-readiness check, `/plan` fallback, exact-name handoff, and planning-pause behavior from `apply-plan-handoff`.
- [x] 1.2 Update `.claude/skills/plan/SKILL.md` so an `/apply`-initiated planning handoff can complete an explicitly selected incomplete change without duplicating it, while standalone `/plan` still stops before implementation.
- [x] 1.3 Verify the wrapper keeps OpenSpec artifact authoring in `/plan`, task execution in `openspec-apply-change`, completed checkpointing in `/save`, and cold-session branch checkout in `/continue`.

## 2. Workflow guidance

- [x] 2.1 Update `wiki/development/the-change-loop.md` to document `/explore` → `/apply` as an implicit-planning convenience path without replacing the canonical durable stages.
- [x] 2.2 Update `README.md`, the generic WongStack block in `CLAUDE.md`, and `.claude/skills/wong-setup/SKILL.md` so entry-point guidance consistently says `/apply` can plan first when the current work has no apply-ready change.
- [x] 2.3 Sweep payload guidance for claims that `/apply` only works immediately after `/plan`, and reconcile each affected owner or summary without duplicating the orchestration runbook.

## 3. Release and verification

- [x] 3.1 Add a newest-first `CHANGELOG.md` entry and bump `VERSION` from 9.5.0 to 9.6.0.
- [x] 3.2 Validate the `apply-auto-plan` OpenSpec change and confirm its scenarios cover explored new work, unrelated active changes, ready changes, incomplete explicit changes, ambiguity, planning failure, standalone plan, and completed auto-save.
- [x] 3.3 Run `node scripts/check-payload-links.mjs` and focused consistency searches for the `/apply` planning and `/save` completion boundaries.

<!-- end tasks.md -->
<!-- file specs/apply-plan-handoff/spec.md utf8 3627 -->
## ADDED Requirements

### Requirement: Apply ensures an applicable plan exists

`/apply` SHALL resolve the line of work the user intends to implement before delegating to the OpenSpec apply step. An explicit change reference SHALL take precedence, followed by the change established in the current conversation or matching the current branch. A sole active change MAY be selected only when the conversation does not establish different new work.

#### Scenario: Apply follows exploration without a plan

- **WHEN** the current conversation has established implementation intent through `/explore`
- **AND** no apply-ready OpenSpec change represents that intent
- **THEN** `/apply` invokes `/plan` with the established intent
- **AND** it applies the exact change produced by that planning run

#### Scenario: Unrelated active change exists

- **WHEN** the current conversation establishes new implementation intent with no plan
- **AND** `openspec list` contains an active change for a different line of work
- **THEN** `/apply` plans the current work instead of auto-selecting the unrelated change

#### Scenario: Existing applicable plan is ready

- **WHEN** an explicit reference, current conversation, or matching branch resolves an apply-ready change
- **THEN** `/apply` delegates that change directly to the OpenSpec apply step
- **AND** it does not invoke `/plan` again

#### Scenario: Explicit change has incomplete planning artifacts

- **WHEN** the user explicitly invokes `/apply` for an existing change that is not apply-ready
- **THEN** `/apply` invokes `/plan` to complete that same change's required artifacts
- **AND** it applies that change after the required artifacts are complete

#### Scenario: No intent can be resolved safely

- **WHEN** `/apply` has neither clear implementation intent nor an unambiguous applicable change
- **THEN** it asks the user to identify the work or change
- **AND** it does not plan or implement an inferred unrelated change

### Requirement: Planning and implementation remain delegated

The shortcut SHALL invoke the existing `/plan` workflow for artifact authoring and the existing OpenSpec apply workflow for implementation. It SHALL pass the planned change name explicitly into the apply workflow so another active change cannot be selected between the two stages.

#### Scenario: Automatic planning completes

- **WHEN** `/apply` invokes `/plan` and the change becomes apply-ready
- **THEN** `/apply` announces the planned change
- **AND** it invokes the OpenSpec apply workflow with that exact change name

#### Scenario: Automatic planning pauses

- **WHEN** `/plan` pauses because required intent is unclear or artifact creation is blocked
- **THEN** `/apply` does not begin implementation
- **AND** it reports the planning blocker

### Requirement: The shortcut preserves workflow ownership

Automatic planning SHALL NOT move artifact-authoring behavior into `/apply`, move git behavior out of `/save`, or make standalone `/plan` automatically implement its output. A completed implementation SHALL continue to invoke `/save` exactly once under the existing `apply-completion-handoff` contract.

#### Scenario: User invokes plan by itself

- **WHEN** the user invokes `/plan` without asking to apply
- **THEN** the workflow creates the apply-ready artifacts and stops before implementation

#### Scenario: Auto-planned apply completes all tasks

- **WHEN** `/apply` planned the work automatically and completes every task
- **THEN** it invokes `/save` exactly once
- **AND** `/save` remains the owner of branch, commit, push, pull-request, preview, and CI mechanics

<!-- end specs/apply-plan-handoff/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-08

~~~
<!-- end .openspec.yaml -->
