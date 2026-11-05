# openspec-workflow Specification

## Purpose

How WongStack keeps its plans in OpenSpec: the public verbs drive the OpenSpec CLI directly, a change stays tied to its real branch, and specs record promises rather than procedure.

## Requirements

### Requirement: The verbs drive OpenSpec with no generated layer

The WongStack verbs SHALL create, validate, and archive OpenSpec records through the CLI alone. No normal workflow SHALL need a generated `openspec-*` skill or a `/opsx:*` command, and setup and updates SHALL NOT generate them.

#### Scenario: Plan in a fresh install

- **WHEN** a person asks for a plan in a repo set up with no generated OpenSpec skills
- **THEN** the change's required artifacts and its review page are created and validated

#### Scenario: A routine update

- **WHEN** an installed repo updates its toolchain
- **THEN** no generated workflow layer appears and existing changes stay readable

### Requirement: The CLI's paths and schema are authoritative

The verbs SHALL read and write a change at the paths the CLI reports, keep a selected store for every later step, and honor the schema's artifact dependencies. A tasks file alone SHALL NOT count as proof that a change is ready.

#### Scenario: Tasks exist before a dependency

- **WHEN** a change has a tasks file but a required artifact is missing
- **THEN** planning completes the missing artifact before the change is called ready

#### Scenario: A custom store

- **WHEN** a change lives in an explicitly selected store
- **THEN** every later read, write, validation, and archive uses that store, and no copy appears in the default path

### Requirement: A change records its actual branch

`/save` SHALL record the feature branch a change is saved on in its proposal, and SHALL NOT create a second change because the branch name differs from the change name. When several changes could be meant, it SHALL ask which one.

#### Scenario: Branch and change names differ

- **WHEN** `/save` runs on branch `editor-work` with one changed active change `review-handoff`
- **THEN** it updates `review-handoff` and records `editor-work` as its branch

#### Scenario: Several candidates

- **WHEN** more than one active change is modified on the branch and nothing selects one
- **THEN** `/save` asks which change to update

### Requirement: Continue finds the branch from the change

`/continue` SHALL resume a change on the branch its proposal records, or on a pull request's head branch, and SHALL NOT assume a change name is a branch name.

#### Scenario: Resume by name from a fresh clone

- **WHEN** `/continue review-handoff` runs where the folder exists only on the remote branch `editor-work`
- **THEN** it reads the proposal from that branch and checks out `editor-work` when that is safe

#### Scenario: No recorded branch

- **WHEN** a change has no recorded branch and a branch with its name exists
- **THEN** `/continue` does not check out that branch on the name alone

### Requirement: Specs hold promises, not procedure

A spec requirement SHALL state what a person or an installed repo relies on: what they see or get, what must never happen, and what an update delivers or keeps. Each requirement SHALL carry one or two scenarios and leave the how to the skill, and installed repos SHALL receive this bar through the shipped OpenSpec rule file.

#### Scenario: Planning an ordinary change

- **WHEN** a planning agent in an installed repo writes a spec for a change
- **THEN** the shipped rule for `openspec/**` gives it the bar, and each requirement states an outcome with one or two scenarios

#### Scenario: A requirement that retells a skill

- **WHEN** a draft requirement names a script, a step order, or a message's exact wording that is not itself the promise
- **THEN** that detail stays in the skill and the requirement keeps only the outcome

### Requirement: Continue never builds on the wrong branch

When `/continue` cannot or should not check out the change's branch here, because other unpublished work holds this workspace or another worktree has the branch, it SHALL recap the change and stop with a next-step question, and SHALL NOT build or edit files.

#### Scenario: Branch open in another worktree

- **WHEN** `/continue add-auth` runs and `add-auth`'s branch is checked out in another worktree
- **THEN** it recaps the change, says where the branch is open, and asks what next, with nothing built here
