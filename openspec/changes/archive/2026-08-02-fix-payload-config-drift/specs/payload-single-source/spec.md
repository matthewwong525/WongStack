## ADDED Requirements

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
