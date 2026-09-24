# context-economy Specification

## Purpose

The instructions that load into every session — CLAUDE.md, the WONG-STACK block, and skill frontmatter descriptions — are a shared budget. This capability bounds what each always-loaded surface may carry, so context spends on the work instead of on restatements.

## Requirements

### Requirement: The WONG-STACK block carries orientation only

The WONG-STACK block in `CLAUDE.md` SHALL carry only what an agent needs before it touches any file: what the repo's knowledge surfaces are and where each kind of fact lives, the change loop named in one line, the git-ownership boundary (the WongStack skills own all git; OpenSpec never runs git), and the rules that apply to every session regardless of surface. The block SHALL NOT restate a fact that a skill frontmatter description, a path-scoped rule, or a wiki page owns — it SHALL link to the owner instead. Every fact removed from the block SHALL have a surviving owner that loads on file touch (a rule), on invocation (a skill), or by link (a wiki page).

#### Scenario: An agent plans without touching files

- **WHEN** an agent starts a session and reads only the always-loaded context
- **THEN** it knows the four knowledge surfaces, the loop verbs, and the git-ownership boundary
- **AND** it knows where to read more before acting on any of them

#### Scenario: A fact is owned elsewhere

- **WHEN** a fact in the block is also stated by a skill description that loads every session, or by a rule or wiki page
- **THEN** the block links to that owner rather than restating it

### Requirement: The meta-repo half of CLAUDE.md is orientation only

The part of `CLAUDE.md` outside the WONG-STACK block SHALL identify the repo and point into the wiki; the conventions for working on the payload (the release ritual, template-is-code, skill authoring) SHALL live in a meta-only path-scoped rule that loads when a payload file is touched.

#### Scenario: An agent edits a payload file

- **WHEN** an agent edits a file under `.claude/skills/` or another payload surface
- **THEN** the release-ritual conventions are in its context via the meta-only rule
- **AND** a session that touches no payload file never loads them

### Requirement: WongStack-authored skill descriptions are triggers, not manuals

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters. How it operates SHALL belong in its body or its linked owner reference. A shared rule SHALL have one owner; references SHALL not reproduce the generated OpenSpec workflow layer under a new name.

The vendored `agent-browser` skill SHALL remain exempt from the description budget and SHALL remain unchanged by prose cleanup. WongStack SHALL neither install nor require generated OpenSpec skills. A target's independently owned or modified integration SHALL be preserved under the migration rules.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored description exceeds the budget
- **THEN** it is reduced to purpose and invocation triggers
- **AND** required behavior remains in its owning skill or linked reference

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are shortened during migration
- **THEN** the vendored browser skill and a target's custom integration content are left intact

#### Scenario: A generated skill is hidden from the menu

- **WHEN** migration encounters known unmodified generated content with the former visibility patch
- **THEN** it recognizes the patch as part of the old integration and retires that file under the migration rules
- **AND** it does not keep a hidden generated workflow as a normal dependency

#### Scenario: A common CLI rule is needed by two verbs

- **WHEN** two verbs need the same root-resolution or artifact-path rule
- **THEN** they link to one shared contract rather than carrying separate copies

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word and byte counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction and SHALL identify shared owner documents separately. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code, executable helpers, and historical records SHALL be accounted for separately.

The report SHALL also name required-reading inventories for ordinary active save, named-secret save, prose save, new-plan fallback, archived save, cold resume, and routine visual authoring. Ordinary save and routine authoring SHALL require less source reading than the recorded baseline. Every special-route increase SHALL be reported with its reason. Completion SHALL include behavior regression evidence and an audit that required checks remain reachable.

#### Scenario: The implementation is reviewed

- **WHEN** the simplification is reported complete
- **THEN** its evidence names the counted paths, baseline revision, before-and-after totals, and the absence of normal generated-skill handoffs
- **AND** it does not claim that all inventoried text was loaded in every session

#### Scenario: Text moves into a new reference

- **WHEN** a procedure is extracted from a skill into a new file
- **THEN** the aggregate inventory includes that file and each applicable route includes its required reading
- **AND** moving the text alone cannot count as a net instruction reduction

#### Scenario: Runtime telemetry is unavailable

- **WHEN** behavior and source-load checks pass but comparable token traces are absent
- **THEN** the change reports source-load reductions and the runtime measurement limit
- **AND** it makes no numerical claim about runtime token savings

### Requirement: Save loads conditional procedures only when applicable

The save skill SHALL expose a complete main procedure and explicit entry conditions for named-secret persistence, prose-only handling, new-plan fallback, and archived handoffs. Each applicable procedure SHALL be loaded before its actions. Unconditional credential exclusion, workflow ownership, and gate-result handling SHALL remain visible in the main procedure. Extracted procedures SHALL retain all required checks.

#### Scenario: Ordinary active change checkpoint

- **WHEN** save handles an existing active change without newly named secrets or prose-only routing
- **THEN** it can complete the checkpoint without loading the unrelated conditional procedures
- **AND** it retains record maintenance, credential exclusion, PR handling, and CI result reporting

#### Scenario: More than one condition applies

- **WHEN** an archived checkpoint also includes a newly named secret
- **THEN** it loads both applicable procedures
- **AND** preserves the secret in the required durable location and does not recreate the active change

### Requirement: Routine review authors use a focused authoring contract

Routine visual authors SHALL use the author guide and relevant examples without a required full read of the fixed viewer implementation. The builder SHALL continue to produce the standalone page from that viewer. The structural check SHALL remain required; no rendered critique or revision round SHALL be required. Specific viewer inspection SHALL remain available for a concrete question the author contract does not answer.

#### Scenario: A workflow change needs a flow visual

- **WHEN** an author creates a routine flow using documented primitives
- **THEN** the guide and relevant examples provide the required authoring inputs
- **AND** the generated page receives the existing structural check and no critic pass

### Requirement: Billed usage is measurable per task

The meta-repo SHALL provide a dependency-free script that reads Claude Code transcripts and reports billed cost per task. A task SHALL be one main session plus every subagent it spawned. Each request SHALL be counted once, even when the transcript records it in several parts. Cost SHALL be computed from the recorded usage at list prices for input, 5-minute and 1-hour cache writes, cache reads, and output, and SHALL be reported by billing type, model, active skill, and main thread vs subagents. A model without a known price SHALL be listed and SHALL NOT be priced by a guess. The report SHALL classify prefix rewrites by what preceded them (a model switch, idle over one hour, idle five to sixty minutes, or other). A context-source split SHALL be labelled as an estimate. The script SHALL write no file and SHALL contact no service.

#### Scenario: A request is recorded in several parts

- **WHEN** a transcript holds several records with the same request id
- **THEN** that request's usage is counted once

#### Scenario: A session spawned subagents

- **WHEN** a main session has subagent transcripts
- **THEN** their cost counts toward that one task and is reported separately as subagent cost

#### Scenario: The prefix is rewritten after a long pause

- **WHEN** a request reads less than half of the previous context from cache, writes the rest, and follows the previous request by more than one hour on the same model
- **THEN** its cache-write cost is reported under idle over one hour

#### Scenario: A transcript uses an unknown model

- **WHEN** a request names a model with no price entry
- **THEN** the report lists that model and adds no invented cost for it

#### Scenario: The report is limited to one repository

- **WHEN** the user passes a working-directory filter
- **THEN** only tasks whose recorded working directory contains it are counted
