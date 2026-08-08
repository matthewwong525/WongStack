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
