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
