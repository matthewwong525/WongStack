# context-economy Specification

## Purpose

What loads into every session (CLAUDE.md, the WONG-STACK block, skill descriptions, the memory digest) is a shared budget. This bounds each always-loaded surface and lets the meta-repo measure the spend.

## Requirements

### Requirement: The WONG-STACK block carries orientation only

The WONG-STACK block SHALL carry only what an agent needs before touching a file: the knowledge surfaces, the change loop, the git-ownership boundary, and rules for every session. A fact another surface owns SHALL be linked, not restated.

#### Scenario: A fact owned elsewhere

- **WHEN** a skill, rule, or wiki page owns a fact the block needs
- **THEN** the block links that owner instead

### Requirement: Payload conventions load only when needed

The meta-repo half of `CLAUDE.md` SHALL identify the repo and point into the wiki. The conventions for working on the payload SHALL live in a meta-only rule that loads when a payload file is touched.

#### Scenario: A session that touches no payload file

- **WHEN** a session never edits a payload file
- **THEN** the release conventions never load

### Requirement: Skill descriptions are triggers, not manuals

A WongStack-authored skill's description SHALL say what it does and when to use it, in at most 600 characters; how it works SHALL live in its body or references.

#### Scenario: An over-long description

- **WHEN** a description exceeds the budget
- **THEN** it is cut to purpose and triggers

### Requirement: Vendored skills stay out of every session

A vendored skill that only a WongStack verb calls SHALL NOT be offered for automatic invocation. Its only local edit SHALL be the frontmatter key that stops it, recorded where the vendored file is documented.

#### Scenario: A browser request that is not a verify

- **WHEN** a person asks about unread Slack messages
- **THEN** the vendored browser skill is not triggered, and `/verify` still calls it by name

### Requirement: Each rule has one owner

Each workflow rule SHALL be written in one payload file; others SHALL link it and state only how they differ.

#### Scenario: A rule written twice

- **WHEN** a reviewer finds the same procedure in two skills
- **THEN** one copy is replaced by a link to the other

### Requirement: Save loads conditional procedures only when they apply

`/save` SHALL complete an ordinary checkpoint without loading its conditional procedures (named secrets, facts-only, new-plan fallback, archived handoff), and SHALL load each one that applies before acting on it.

#### Scenario: An ordinary checkpoint

- **WHEN** `/save` checkpoints an active change with no named secret
- **THEN** it loads no conditional procedure and keeps every credential and gate check

### Requirement: Instruction size is measured as source text

The meta-repo SHALL measure the words and bytes of the core workflow instructions against a recorded baseline. A reduction SHALL be reported as source text, never as runtime token savings, and text moved into a new file SHALL still count.

#### Scenario: A procedure moves to a reference

- **WHEN** text is extracted from a skill into a new reference
- **THEN** the measured total includes the new file

### Requirement: Billed usage is measurable per task

The meta-repo SHALL report billed cost per task (a main session plus its subagents) from local transcripts, by skill, model, and thread, counting each request once. A model with no known price SHALL be listed, not guessed. The report SHALL write no file and contact no service.

#### Scenario: A request recorded in parts

- **WHEN** several transcript records share one request id
- **THEN** that request is counted once

#### Scenario: An unknown model

- **WHEN** a request names a model with no price
- **THEN** the report lists the model and adds no invented cost

### Requirement: The memory digest stays bounded

The session-start memory digest SHALL stay within the `memory` capability's limits and SHALL NOT restate a fact another surface owns; consolidation, not a larger limit, keeps it there.

#### Scenario: The digest reaches its limit

- **WHEN** live facts exceed the digest limit
- **THEN** the digest is cut at the limit and says how many facts it left out
