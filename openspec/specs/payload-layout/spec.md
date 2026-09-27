# payload-layout Specification

## Purpose

How the WongStack payload is laid out so every install gets one true copy of each fact: one owner per fact, links that resolve in the target, one shared agent folder, and rules that load a convention at the moment of the edit.

## Requirements

### Requirement: Every payload fact has exactly one owning file

Each rule, runbook, or template in the payload SHALL be stated in exactly one file, and every other surface SHALL link to that owner rather than restate it. A second copy SHALL be treated as a defect even while the two agree.

#### Scenario: A rule is needed on a second surface

- **WHEN** a payload file needs the reader to know a rule another file owns
- **THEN** it links the owner and does not restate the rule's scope, exceptions, or rationale

### Requirement: Skills keep long and shared runbooks in references

A `SKILL.md` SHALL still say what the skill does, when it refuses, and what each outcome means, while a long procedure lives in the skill's `references/`. An operation two skills perform alike SHALL be written once and read by both, with any per-caller difference stated in that one file.

#### Scenario: Two skills share a runbook

- **WHEN** `/save` and `/ship` both open or update a pull request and wait on checks
- **THEN** that runbook is written once and both skills read it

### Requirement: A generated record has one store

A record the payload's tooling generates SHALL live in exactly one file; where the person also edits it, the file they edit SHALL be the store.

#### Scenario: Update verdicts are recorded

- **WHEN** `/wong-sync` records a verdict for a capability
- **THEN** it writes one file and keeps no second copy elsewhere

### Requirement: A renamed code-read value ships as a behavioural change

A template value that code reads, such as a variable name in `.env.example`, SHALL have one owning file, and renaming it SHALL be released with a version bump and a changelog entry, never as a documentation edit.

#### Scenario: A token variable is renamed

- **WHEN** a change renames a variable a script reads
- **THEN** it ships as a release with a changelog entry, so no install is left with a template naming a variable nothing reads

### Requirement: The payload promises only what a fresh setup has

Payload prose SHALL describe files an external tool generates as that tool's supported version actually produces them, and SHALL NOT offer a command or surface a fresh setup lacks.

#### Scenario: A promised command is followed

- **WHEN** a reader in a freshly set-up repo runs a command the payload says is available
- **THEN** the command exists

### Requirement: Payload links resolve in a fresh install

Every internal link in a payload file SHALL resolve in a fresh install, so every page a skill cites as an owner SHALL itself ship. The check SHALL run against the target's file set, not this repo, and SHALL treat a path as present only when setup writes it.

#### Scenario: A skill cites a wiki page

- **WHEN** a payload skill links a wiki page that owns a fact
- **THEN** a repo that installed the payload has that page

#### Scenario: A link resolves only in the source

- **WHEN** a payload page links a page only WongStack's own wiki has
- **THEN** the release check fails until the example is generalized or dropped

### Requirement: The manifest carries one machine-readable file list

The payload manifest SHALL carry one machine-readable list of payload paths beside the prose that explains them, and install, update, and the link check SHALL all read that list.

#### Scenario: A file is added to the payload

- **WHEN** a new payload file is listed once
- **THEN** setup, `/wong-sync`, and the link check all pick it up with no second edit

### Requirement: A vendored skill is an upstream pointer

A third-party skill in the payload SHALL be a discovery pointer that loads its usage from the installed tool, keep its upstream licence, and be refreshed from upstream rather than edited in place.

#### Scenario: An agent loads the vendored skill

- **WHEN** an agent loads the vendored browser skill
- **THEN** it reads the usage guide from the installed tool, which matches the tool's version

### Requirement: One real agent folder with a link per agent

The source and every install SHALL keep skills, rules, hooks, and agent settings in one real `.agents/` folder, with `.claude` and `.codex` as links to it and no payload file at a real path under either. The source and every install SHALL keep the `WONG-STACK` block in a real `AGENTS.md`, with `CLAUDE.md` as a link to it, so Claude Code and Codex read the same rules.

#### Scenario: A new install gets the layout

- **WHEN** setup installs WongStack into an empty folder
- **THEN** `.agents/` is a directory holding the payload, and `.claude` and `.codex` link to it

#### Scenario: Both agents read the rules

- **WHEN** setup installs WongStack into an empty folder
- **THEN** `AGENTS.md` is a real file holding the `WONG-STACK` block, and `CLAUDE.md` is a link to it

### Requirement: Each agent loads the shared folder cleanly

Claude Code and Codex SHALL each load their settings, hooks, and skills through their link, each skill SHALL appear once, and neither agent SHALL fail on the other's files.

#### Scenario: Codex starts in the shared layout

- **WHEN** a trusted Codex session starts
- **THEN** the memory digest loads and each WongStack skill appears once

### Requirement: Path-scoped rules load conventions at edit time

The payload SHALL ship rules for code, the wiki, OpenSpec, and secrets files, each loading only when an agent reads or edits a matching path. A target that already has a rule of the same name SHALL keep its own copy.

#### Scenario: An agent edits code

- **WHEN** an agent edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the code rule is in its context, and a session that touches no such file never loads it

#### Scenario: A target has its own rule

- **WHEN** `/wong-sync` runs in a repo with a locally authored code rule
- **THEN** that rule is never overwritten

### Requirement: A rule is thin except for the fact it owns

A rule SHALL link or import the convention another file owns rather than restate it. The code rule SHALL own the write-less-code standard and SHALL leave every numeric limit to the CI checks that enforce it.

#### Scenario: The wiki rule loads

- **WHEN** an agent edits a wiki page
- **THEN** the wiki style and voice pages are in its context, and the rule restates neither

### Requirement: Meta-only rules never ship

WongStack MAY keep rules that guide work on WongStack itself, such as the payload release ritual, and SHALL NOT list them in the payload, so no install receives them.

#### Scenario: An update reads the manifest

- **WHEN** `/wong-sync` reads the payload list in a target
- **THEN** the payload rule is not among the files it may copy
