# Design: improve-openspec-plans

## Context

`/improve` (v2.4.0) is shadcn/improve carried nearly verbatim: audit → vet → write self-contained plans under `plans/NNN-*.md`, with `plans/README.md` as the index and the `execute`/`reconcile`/`review-plan`/`--issues` variants built around those files. v3.0.0 made OpenSpec WongStack's planning layer — a plan is `openspec/changes/<name>/`, implemented via `/continue`, recorded via archive. The two systems don't see each other. The lineage constraint (recorded in project memory): extend shadcn's skill with specialization references, don't fork it.

## Goals / Non-Goals

**Goals:**
- In an OpenSpec repo, `/improve`'s output *is* OpenSpec changes — visible to `openspec list`, implementable with `/continue`, archived by `/ship`.
- Preserve the plan-template quality bar (self-containment, verification gates, boundaries, STOP conditions) in the OpenSpec format.
- Keep the non-OpenSpec path byte-for-byte in spirit: shadcn's `plans/` flow unchanged.

**Non-Goals:**
- No changes to Recon/Audit/Vet.
- No rewrite of shadcn's references (`audit-playbook.md`, `plan-template.md`, `closing-the-loop.md`) — they stay verbatim; OpenSpec adaptations live in the new reference.
- `/improve` does not run `openspec` CLI scaffolding as a hard dependency — it writes the folders directly if the CLI is absent (the folder format is the contract).

## Decisions

- **Detection = `openspec/changes/` exists at the audited repo's root.** Simple, no CLI dependency, and matches what `/continue`/`/save`/`/ship` key off. Alternative considered: require the `openspec` CLI on PATH — rejected; the folder is the source of truth and the CLI may be missing in a clone.
- **All OpenSpec-mode instructions live in a new `references/openspec-plans.md`**, with SKILL.md carrying only short pointers (Hard Rule 1 clause, a Phase 4 paragraph, one line per affected variant). This follows the established extension pattern (`docs-audit-playbook.md`) and keeps the shadcn core diff minimal. Alternative: inline everything in SKILL.md — rejected, forks the skill text and bloats it.
- **Section mapping (defined in the new reference):** plan-template "Why this matters" → `proposal.md` Why; Scope/Current state/repo conventions/Steps with verification/STOP conditions/Done criteria → `tasks.md` (checklist with per-task verify commands) plus `design.md` when decisions or risk warrant it; delta specs written only when the finding changes spec-level behavior of a capability (a pure bugfix restoring intended behavior may need no delta). Planned-at SHA and drift check go in `tasks.md`'s preamble.
- **No persistent rejection index in OpenSpec mode.** `plans/README.md`'s "considered and rejected" section has no OpenSpec home; instead the advisor reports rejections in the session output, and dedup against prior work uses `openspec list` + the archive during Phase 4 reconciliation. Alternative: keep a `plans/README.md` just for rejections — rejected, resurrects the parallel system this change removes.
- **Ordering and dependencies** are recorded per-change (a "Depends on: `<other-slug>`" line in `proposal.md`) and summarized in the advisor's final report, replacing the index's ordering table.
- **`/continue` is the recommended executor in OpenSpec mode; `execute` stays.** `execute` inlines the change's artifacts (worktrees only contain committed files) and its verdict updates `tasks.md` checkboxes. The docs variant keeps its no-`execute` rule — docs changes go `/continue` → `/save` → `/ship`.
- **Fix stale pre-3.0 wording while touching the docs playbook.** `docs-audit-playbook.md` §"Planning & applying docs fixes" still says `/save` creates a "handoff issue" and `/ship` records a "summary issue" — removed in 3.0.0. Updating this section is in scope since the section is being rewritten for OpenSpec mode anyway.

## Risks / Trade-offs

- [Skill text drifts from shadcn upstream, complicating future re-syncs] → all OpenSpec content is additive and isolated in one reference file; SKILL.md edits are small, marked deltas like the existing `docs` variant.
- [Advisor-written change folders may not validate against the target repo's OpenSpec schema] → the reference instructs writing the four standard artifacts and running `openspec validate --change <slug>` when the CLI is available; validation failure is a fix-before-finish step, not a silent skip.
- [Weak executors relying on `plans/README.md` status rows lose the index] → `tasks.md` checkboxes are the OpenSpec-native equivalent and `/continue` already maintains them.
