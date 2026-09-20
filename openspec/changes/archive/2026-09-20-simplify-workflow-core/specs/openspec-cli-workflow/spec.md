## Purpose

Let WongStack run its existing public workflow through the OpenSpec CLI without loading a second set of generated agent workflows, while preserving records and target customizations.

## ADDED Requirements

### Requirement: WongStack verbs work without generated OpenSpec skills

The public WongStack verbs SHALL use OpenSpec CLI context, status, artifact instructions, validation, and archive operations as needed. No normal workflow SHALL require invoking an `openspec-*` skill or `/opsx:*` command. Public verb names, standalone planning behavior, completion handoffs, and delivery outcomes SHALL remain available.

#### Scenario: Plan without a generated layer

- **WHEN** a user requests a plan in an initialized repo with no generated OpenSpec skills
- **THEN** WongStack creates and validates the schema-required artifacts and required HTML review page through the CLI
- **AND** standalone planning stops for review before implementation

#### Scenario: Apply an intent without a plan

- **WHEN** a user requests implementation of clear work that has no applicable ready change
- **THEN** apply completes planning for that work and implements that exact change
- **AND** it retains the existing completion checkpoint behavior without loading a generated skill

#### Scenario: Save and ship preserve their outcomes

- **WHEN** completed work is checkpointed and shipped without generated skills
- **THEN** its plan, delta-spec sync, note when needed, review, and archive are maintained
- **AND** incomplete tasks or a failing or unverifiable delivery gate do not become permission to merge

### Requirement: CLI paths and schema dependencies remain authoritative

WongStack SHALL use the resolved planning root and artifact paths from CLI output, retain an explicitly selected store on commands that support it, and honor schema dependencies and conditional artifact rules. A tasks file alone SHALL NOT be treated as proof that the required dependency set exists. Missing CLI capability SHALL be reported rather than replaced with a claimed successful result.

#### Scenario: Tasks exist before their dependencies

- **WHEN** status reports a tasks file but a required non-skipped dependency is missing
- **THEN** planning completes the missing dependency before the change is declared ready

#### Scenario: A custom schema or selected store is used

- **WHEN** a change uses non-default artifact paths or an explicitly selected store
- **THEN** subsequent reads, writes, validation, and archive operations use that same resolved context
- **AND** no parallel change is created in the default repo path

#### Scenario: Specs are deliberately skipped

- **WHEN** the change validly declares no spec-level behavior change and skips specs
- **THEN** planning honors that declaration and still creates its required review page

### Requirement: Setup and updates do not generate the retired workflow layer

Fresh WongStack setup SHALL initialize the OpenSpec planning home without generating agent skills. Routine WongStack dependency updates SHALL check CLI compatibility without regenerating that layer or changing a global user profile. Existing records and schemas SHALL remain usable.

#### Scenario: Fresh setup

- **WHEN** a target takes WongStack for the first time
- **THEN** it receives functioning public workflow verbs and an initialized planning home
- **AND** WongStack creates no generated `openspec-*` skills or visibility patch

#### Scenario: Routine update after migration

- **WHEN** an already migrated repo updates its toolchain
- **THEN** the generated workflow layer remains absent and existing changes remain readable

### Requirement: Migration preserves local ownership

Migration SHALL remove only identified, unmodified generated files owned by the old WongStack integration, including the accepted visibility-key difference. It SHALL preserve and report edited, unrecognized, or independently installed integration files. It SHALL preserve public command names, local skill mappings, schemas, changes, main specs, archives, and notes, and SHALL not mark an unresolved migration complete.

#### Scenario: Known generated files are present

- **WHEN** an installed file matches the known generated content for the installed version, with or without the old visibility patch
- **THEN** the reviewed migration retires it and obsolete WongStack regeneration instructions
- **AND** a second migration run makes no further change

#### Scenario: A target customized a generated skill

- **WHEN** a target's generated-looking file differs from the known installed content
- **THEN** migration leaves it intact and identifies the unresolved decision
- **AND** it does not delete other skills based on a name prefix

### Requirement: Review feedback remains an input to continuation

Continue SHALL accept the existing copied review-note format, reconcile the affected existing artifacts using CLI-provided paths, record how each note was handled, and refresh the review before resuming implementation. The generated update skill SHALL NOT be required.

#### Scenario: Feedback changes the plan

- **WHEN** a reviewer pastes a valid review-note block that changes a flow
- **THEN** the proposal, relevant design or specs, tasks, and visual input are reconciled before work resumes
- **AND** the refreshed review and Decision log show the accepted change or explain a declined note
