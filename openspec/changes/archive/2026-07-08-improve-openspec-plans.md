<!-- openspec-archive v1 2026-07-08-improve-openspec-plans -->
<!-- file proposal.md utf8 2465 -->
# Proposal: improve-openspec-plans

## Why

`/improve` still writes its implementation plans to a standalone `plans/NNN-*.md` directory — a format that predates v3.0.0, where OpenSpec became WongStack's planning layer. In a WongStack repo this leaves two parallel planning systems: audit output in `plans/` that `/continue`, `/save`, and `/ship` can't see, and OpenSpec changes that can't be produced by the audit. The advisor's plans should land where the rest of the toolkit plans.

## What Changes

- **`/improve` Phase 4 becomes OpenSpec-aware:** when the audited repo has an initialized `openspec/` directory, each selected finding is written as an OpenSpec change folder (`openspec/changes/<slug>/` with `proposal.md`, delta specs, `tasks.md`, and `design.md` when warranted) instead of a `plans/NNN-*.md` file, preserving the same self-contained-for-a-weak-executor standards.
- **`plans/` remains the fallback** for repos without OpenSpec — shadcn's original behavior is unchanged there.
- **Hard Rule 1's write boundary widens** to include `openspec/changes/` in OpenSpec mode (still strictly no source edits).
- **Variants that reference `plans/` are updated** for OpenSpec mode: `execute`, `reconcile`, `review-plan`, `--issues`, and the `docs` variant (docs findings become OpenSpec changes implemented via `/continue` → `/save` → `/ship`).
- **New reference** `references/openspec-plans.md` maps the plan template's sections onto OpenSpec artifacts so the plan-quality bar carries over.
- **Release bookkeeping:** CHANGELOG entry + VERSION minor bump (payload edit = release).

**Non-goals:** no changes to the audit itself (Recon/Audit/Vet), no rewrite of shadcn's references, no removal of the `plans/` pathway.

## Capabilities

### New Capabilities
- `improve-plan-output`: where and in what format `/improve` writes its plans — OpenSpec change folders when the target repo uses OpenSpec, `plans/` files otherwise — and how the downstream variants (`execute`, `reconcile`, `review-plan`, `--issues`, `docs`) locate and track those plans in each mode.

### Modified Capabilities

(none — `delivery-gate` is unaffected)

## Impact

- `.claude/skills/improve/SKILL.md` — Hard Rule 1, Phase 4, invocation variants.
- `.claude/skills/improve/references/openspec-plans.md` — new file.
- `CHANGELOG.md`, `VERSION` — release entry + minor bump.
- No other skills change; `/continue`/`/save`/`/ship` already operate on OpenSpec changes.

<!-- end proposal.md -->
<!-- file design.md utf8 4606 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 2285 -->
# Tasks: improve-openspec-plans

## 1. New reference — the OpenSpec plan format

- [x] 1.1 Write `.claude/skills/improve/references/openspec-plans.md`: detection rule (`openspec/changes/` at repo root), the plan-template → OpenSpec artifact mapping (Why → proposal; steps/verification/scope/STOP/done criteria/planned-at stamp → tasks.md; decisions/risks → design.md when warranted; delta specs only for spec-level behavior change), change naming (kebab-case slug = branch name), dependency ordering via a "Depends on" line in proposal.md, no persistent rejection index (report rejections in session output; dedup via `openspec list` + archive), `openspec validate --change <slug>` when the CLI is available, and per-variant adaptations (`execute` inlines artifacts + verdicts update tasks.md checkboxes, `reconcile` reads `openspec list` + tasks.md, `review-plan` takes a slug, `--issues` publishes proposal + tasks as the body, `/continue` → `/save` → `/ship` as the recommended path)

## 2. SKILL.md deltas (keep the shadcn core minimal)

- [x] 2.1 Hard Rule 1: widen the write boundary — in OpenSpec mode the only writable location is `openspec/changes/` (excluding `archive/`); `plans/`/`advisor-plans/` otherwise
- [x] 2.2 Phase 4: add the OpenSpec-mode paragraph — detect `openspec/changes/`, read `references/openspec-plans.md` before writing the first change, write change folders instead of `plans/NNN-*.md`; reconcile against existing active + archived changes instead of `plans/README.md`
- [x] 2.3 Invocation variants: add OpenSpec-mode notes to `execute`, `reconcile`, `review-plan`, `--issues`, and the `docs` variant (docs findings become changes applied via `/continue` → `/save` → `/ship`)
- [x] 2.4 Frontmatter description: mention that plans land as OpenSpec changes when the target repo uses OpenSpec

## 3. Docs audit playbook

- [x] 3.1 Rewrite `docs-audit-playbook.md` §"Planning & applying docs fixes" for both modes, and drop the stale pre-3.0 wording (no more "handoff issue" / "summary issue"; `/save` = sync + push + preview, `/ship` = merge + archive)

## 4. Release bookkeeping

- [x] 4.1 Add a newest-first `CHANGELOG.md` entry (3.2.0 — `/improve` plans are OpenSpec changes in OpenSpec repos)
- [x] 4.2 Bump `VERSION` to 3.2.0

<!-- end tasks.md -->
<!-- file specs/improve-plan-output/spec.md utf8 4143 -->
# improve-plan-output — delta spec

## ADDED Requirements

### Requirement: OpenSpec mode detection
When the audited repo has an initialized OpenSpec planning layer (an `openspec/` directory with a `changes/` subdirectory at the repo root), `/improve` Phase 4 SHALL write each selected finding as an OpenSpec change folder instead of a `plans/NNN-*.md` file. When no `openspec/` directory exists, `/improve` SHALL write `plans/` files exactly as before — the fallback behavior MUST remain shadcn's original.

#### Scenario: Audited repo uses OpenSpec
- **WHEN** `/improve` reaches Phase 4 in a repo containing `openspec/changes/`
- **THEN** each selected finding is written as `openspec/changes/<slug>/` (proposal, delta specs when spec-level behavior changes, tasks, design when warranted) and no `plans/` directory is created

#### Scenario: Audited repo has no OpenSpec
- **WHEN** `/improve` reaches Phase 4 in a repo with no `openspec/` directory
- **THEN** plans are written under `plans/NNN-*.md` with `plans/README.md` as the index, unchanged from the existing behavior

### Requirement: OpenSpec plans keep the handoff quality bar
A plan written as an OpenSpec change SHALL satisfy the same standards as the plan template: fully self-contained context (paths, current-state code excerpts from the advisor's own reads, repo conventions with an exemplar), explicit ordered steps with per-step verification commands, hard scope boundaries, machine-checkable done criteria, STOP conditions, and a planned-at commit stamp for drift detection. The mapping of plan-template sections onto OpenSpec artifacts SHALL be defined in `references/openspec-plans.md`, which Phase 4 MUST read before writing the first change in OpenSpec mode.

#### Scenario: Executor with zero context implements the change
- **WHEN** a fresh session runs `/continue <slug>` on an advisor-written change
- **THEN** the change's artifacts contain everything needed to implement, verify, and know when to stop — no knowledge from the advisor session required

#### Scenario: Change name doubles as branch name
- **WHEN** the advisor names a change in OpenSpec mode
- **THEN** the name is a kebab-case slug usable as a git branch name, per the WongStack branch-name = change-name convention

### Requirement: Write boundary in OpenSpec mode
In OpenSpec mode the advisor SHALL create or modify files only under `openspec/changes/` (excluding `openspec/changes/archive/`). It MUST NOT edit source code, MUST NOT touch `openspec/specs/` (syncing main specs is `/save`'s job), and MUST NOT run git commands that mutate state — the WongStack skills own all git.

#### Scenario: Advisor writes plans in a WongStack repo
- **WHEN** Phase 4 runs in OpenSpec mode
- **THEN** the only writes are new change folders under `openspec/changes/`, and no commit, branch, or push is made

### Requirement: Variants operate on OpenSpec changes
In OpenSpec mode the plan-consuming variants SHALL operate on change folders instead of `plans/` files: `execute <slug>` inlines the change's proposal, design, and tasks into the executor prompt and tracks completion via `tasks.md` checkboxes; `reconcile` reads `openspec list` plus each active change's `tasks.md` (archived changes are the DONE record); `review-plan <slug>` critiques a change folder's artifacts against the handoff quality bar; `--issues` publishes each change (proposal + tasks concatenated) as the issue body. The recommended implementation path for advisor-written changes is `/continue <slug>` → `/save` → `/ship`; `execute` remains available for repos where that loop isn't installed.

#### Scenario: Reconcile in a WongStack repo
- **WHEN** `reconcile` runs in OpenSpec mode
- **THEN** it enumerates changes via `openspec list`, treats archived changes as done, runs drift checks against each active change's planned-at stamp, and never looks for `plans/README.md`

#### Scenario: Docs variant in a WongStack repo
- **WHEN** `/improve docs` selects findings in a repo with OpenSpec
- **THEN** docs findings become OpenSpec changes applied via `/continue` → `/save` → `/ship`, per the docs audit playbook

<!-- end specs/improve-plan-output/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-08

~~~
<!-- end .openspec.yaml -->
