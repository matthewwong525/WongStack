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
