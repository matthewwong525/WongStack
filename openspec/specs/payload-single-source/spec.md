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

### Requirement: A value the code reads has its owner in the payload, not in a template

Where the payload ships a template whose content the code depends on — an environment variable name, a script name, a path the tooling resolves — the template SHALL NOT be the fact's owner. The owning file SHALL be the one that explains the value, and the template SHALL be traceable to it.

This exists because a template edit is indistinguishable from a documentation edit at review time. `.env.example`'s token variable was corrected in one release and silently reverted in a later one described as a docs rename, leaving the shipped template naming a variable nothing reads. A one-owner rule turns that class of change into an edit to the file whose job is to be correct.

A payload change that alters such a value SHALL be treated as a behavioural change — carrying its `CHANGELOG.md` entry and version bump — rather than as prose.

#### Scenario: A template value is traceable to its owner

- **WHEN** a payload template declares a value the code reads
- **THEN** the owning file is identifiable from the template or its immediate documentation
- **AND** the value is not independently restated in a third file

#### Scenario: Renaming a code-read value is a behavioural change

- **WHEN** a change renames a variable, script, or path the tooling reads
- **THEN** it is released as a behavioural change with a changelog entry
- **AND** it is not landed as a documentation-only edit

### Requirement: A generated surface is described as what the generator actually produces

Where the payload documents files produced by an external tool rather than copied from the payload, that description SHALL match what the currently supported version of the tool produces, and SHALL be re-checked when the tool's version moves. A claim that a file is generated is a claim a reader will act on — by expecting a command to exist, or by not copying something they then lack.

`.claude/commands/opsx/` is the live instance: the payload manifest describes it as produced by `openspec init`, but the OpenSpec CLI now creates the five `openspec-*` skills and no commands. Any payload prose that offers `/opsx:*` as an available command surface SHALL be consistent with that.

#### Scenario: The manifest matches the generator

- **WHEN** the payload states that a directory or file is produced by an external tool
- **THEN** running that tool at the supported version produces it
- **AND** where it does not, the payload states what is actually produced

#### Scenario: A promised command surface exists

- **WHEN** payload prose tells a reader a command is available to them
- **THEN** a repo set up by following the payload has that command
- **AND** prose does not offer an entry point that a fresh setup lacks

### Requirement: A cited owner is a shipped owner

Where a payload file directs the reader to another file for a fact — the pattern the one-owner rule requires — the file it points at SHALL itself be payload. Citing an owner the target repo does not receive converts the one-owner rule from a way of keeping facts consistent into a way of removing them: the fact is stated nowhere the reader can reach.

This SHALL be checked in the direction the target experiences. `wiki/development/the-change-loop.md` is cited fourteen times across nine skills, `ux-principles.md`, `staging-walkthrough.md`, and the `WONG-STACK` block — which names it as the one place that owns the merge gate and the prose allowlist — while being absent from the manifest, so no target repo has ever had it. `agent-knowledge-center.md` and `development/required-tools.md` are absent on the same terms.

The consequence is not merely a broken link. `CLAUDE.md` instructs an agent to find and read the owning doc rather than guess; where that doc does not exist, the instruction produces the guess it was written to prevent.

#### Scenario: A skill's cited page is present after install

- **WHEN** a payload skill directs the reader to a wiki page
- **THEN** a repo that installed the payload has that page
- **AND** the reader can follow the link

#### Scenario: Adding a citation adds a manifest entry

- **WHEN** a payload file gains a reference to a page that owns a fact
- **THEN** that page is in the payload manifest, or the reference is not added

### Requirement: No payload file ships a link it cannot resolve in a target

A file in the payload SHALL NOT contain a link to a path outside the payload. A payload file is copied verbatim into repos that have none of this repo's own content, so a link resolvable only here is broken everywhere it lands.

`wiki/wiki-style.md` is the live instance: the rulebook every target is told to follow ships with links to `../marketing/find-inspiration.md` and `weekly-cadence.md`, which exist only in WongStack. Where a payload page needs an example from this repo's wiki, it SHALL generalize the example or drop it, rather than link to it.

Because this is mechanically checkable, it SHALL be checked rather than reviewed: **releasing a payload change SHALL include resolving every internal link in a fresh install.** A payload whose links do not resolve in a target is defective regardless of whether it resolves here — this repo is not a valid test of it, since this repo has content no target does.

#### Scenario: Payload links resolve in a fresh install

- **WHEN** the payload is installed into a repo with no prior content
- **THEN** every internal link in every copied file resolves to a file that exists
- **AND** a link that does not resolve is a release defect

#### Scenario: The source repo is not accepted as the test

- **WHEN** a payload file's links are verified
- **THEN** they are verified against a fresh install, not against this repo
- **AND** a link resolving only here counts as broken

#### Scenario: A payload page needs a local example

- **WHEN** a payload page would illustrate a rule with a page only this repo has
- **THEN** the example is generalized or omitted
- **AND** no link to a non-payload path is shipped
