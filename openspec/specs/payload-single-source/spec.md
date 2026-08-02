# payload-single-source Specification

## Purpose

Every fact in the payload has exactly one owning file; other surfaces link to it. Covers the pointer form for a command that fronts a skill, the `references/` extraction threshold for long runbooks, runbooks shared between skills, doctrine ownership, and single-store rules for generated records. The rule exists because the payload is prose with no compiler — nothing but discipline keeps two statements of one rule in agreement.

## Requirements

### Requirement: Every payload fact has exactly one owning file

Each fact in the payload — a rule, a runbook, a doctrine sentence, a template — SHALL have exactly one file that states it. Every other surface that needs the reader to know it SHALL link to the owner rather than restate it. A second statement of a fact is a defect regardless of whether the two currently agree, because prose has no mechanism that keeps them agreeing.

An owner MAY be quoted in a single short summarizing line (one sentence, naming the owner and linking to it) where a reader would otherwise have to leave the page to act. It SHALL NOT be reproduced in full, and the summary SHALL NOT introduce any qualification, exception, or scope the owner does not state.

#### Scenario: A rule is needed on a second surface

- **WHEN** a payload file needs the reader to know a rule another file owns
- **THEN** it links to the owning file
- **AND** it does not restate the rule's scope, exceptions, or rationale

#### Scenario: Two files state the same rule

- **WHEN** a review finds the same rule written in two payload files
- **THEN** that is a defect to resolve by choosing an owner and replacing the other with a link, whether or not the two statements currently agree

### Requirement: A command that fronts a skill is a pointer to it

Where the payload ships both a command file and a skill that perform the same operation, the **skill** SHALL own the behavior and the command file SHALL contain only its frontmatter plus a single line invoking that skill and directing the agent to follow it verbatim. The command file SHALL NOT contain a second copy of the runbook.

This applies to `.claude/commands/opsx/*.md`, each of which fronts the correspondingly named `.claude/skills/openspec-*` skill. Both remain vendored in the repository; nothing SHALL depend on `openspec init` regenerating either.

#### Scenario: A user invokes the raw command

- **WHEN** a user runs `/opsx:apply`
- **THEN** the command invokes the `openspec-apply-change` skill and follows it
- **AND** the resulting behavior is identical to the skill being invoked directly, including the completion handoff to `/save`

#### Scenario: The skill's runbook changes

- **WHEN** an `openspec-*` skill's runbook is edited
- **THEN** no corresponding edit to the command file is required for the two entry points to stay in agreement

#### Scenario: The vendored layer is not regenerated

- **WHEN** the repository is used without running `openspec init`
- **THEN** both the command files and the `openspec-*` skills are present and functional from the repository itself

### Requirement: A skill delegates its long runbooks to references

A `SKILL.md` SHALL state what the skill is, its boundaries, its decision points, and its consequences. A procedure long enough that it displaces those — as a guide, a stage exceeding roughly forty lines — SHALL live in `references/<name>.md` inside the skill directory, with `SKILL.md` retaining the invocation, the verdict or outcome table, and the hard rules.

Any `references/` file added this way SHALL be listed in the payload manifest's description of the skill's contents.

#### Scenario: A skill grows a long staged procedure

- **WHEN** a skill gains a multi-stage runbook whose detail exceeds what a reader of the skill's purpose needs
- **THEN** the runbook moves to `references/` and `SKILL.md` keeps the invocation, the outcomes, and the rules

#### Scenario: Reading the skill still answers what it does

- **WHEN** a reader opens a `SKILL.md` whose runbook lives in `references/`
- **THEN** they can determine what the skill does, when it refuses, and what each outcome means without opening the reference

### Requirement: A runbook two skills perform identically is written once

Where two skills perform the same operation, that operation SHALL be written once in a `references/` file and read by both. Where their behavior genuinely diverges, the divergence SHALL be recorded in that one file as a per-caller exception, and SHALL NOT be expressed by giving each caller its own copy of the runbook.

#### Scenario: Two skills share a git operation

- **WHEN** `/save` and `/ship` both open or update a pull request, wait on checks, and auto-fix failures
- **THEN** that runbook is stated once and both skills reference it

#### Scenario: The shared runbook has a per-caller difference

- **WHEN** an unverifiable check result means proceed for one caller and stop for the other
- **THEN** the shared runbook states both outcomes against their callers
- **AND** neither skill restates the surrounding procedure to accommodate its own case

### Requirement: A generated fact has exactly one store

Where the payload's tooling generates a record, that record SHALL live in exactly one file. Tooling SHALL NOT maintain the same generated fact in two stores with a rule describing which store is authoritative — the presence of such a rule is itself the defect.

Where a generated record is also an input the user edits, the file the user edits SHALL be the store.

#### Scenario: Verdicts are recorded

- **WHEN** `/wong-sync` records a verdict for a capability
- **THEN** it writes it to `.claude/wong-sync-verdicts.md` and to no other file

#### Scenario: A store is both output and input

- **WHEN** a generated record carries user edits that the tooling reads back
- **THEN** that record is the single store, rather than a view of one held elsewhere
