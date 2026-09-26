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

The vendored `agent-browser` skill SHALL remain exempt from the description budget. Its only local edit SHALL be the frontmatter key that stops automatic invocation, and that edit SHALL be recorded where the vendored file is documented. WongStack SHALL neither install nor require generated OpenSpec skills.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored description exceeds the budget
- **THEN** it is reduced to purpose and invocation triggers
- **AND** required behavior remains in its owning skill or linked reference

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are shortened
- **THEN** the vendored browser skill's body and description are left intact

#### Scenario: A generated skill is hidden from the menu

- **WHEN** the vendored browser skill is listed by the host
- **THEN** its frontmatter stops automatic invocation, and `/verify` still calls it by name

#### Scenario: A common CLI rule is needed by two verbs

- **WHEN** two verbs need the same root-resolution or artifact-path rule
- **THEN** they link to one shared contract rather than carrying separate copies

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word and byte counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction and SHALL identify shared owner documents separately. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code, executable helpers, and historical records SHALL be accounted for separately.

The report SHALL also name required-reading inventories for ordinary active save, named-secret save, prose save, mini-app save, new-plan fallback, archived save, and cold resume. Ordinary save SHALL require less source reading than the recorded baseline. Every special-route increase SHALL be reported with its reason. Completion SHALL include behavior regression evidence and an audit that required checks remain reachable.

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

The save skill SHALL expose a complete main procedure and explicit entry conditions for named-secret persistence, prose-only handling, mini-app handling, new-plan fallback, and archived handoffs. Each applicable procedure SHALL be loaded before its actions. Unconditional credential exclusion, workflow ownership, and gate-result handling SHALL remain visible in the main procedure. Extracted procedures SHALL retain all required checks.

#### Scenario: Ordinary active change checkpoint

- **WHEN** save handles an existing active change without newly named secrets or prose-only routing
- **THEN** it can complete the checkpoint without loading the unrelated conditional procedures
- **AND** it retains record maintenance, credential exclusion, PR handling, and CI result reporting

#### Scenario: More than one condition applies

- **WHEN** an archived checkpoint also includes a newly named secret
- **THEN** it loads both applicable procedures
- **AND** preserves the secret in the required durable location and does not recreate the active change

#### Scenario: A mini-app save

- **WHEN** save runs for a direct mini-app save
- **THEN** it loads the mini-app procedure and does not load the pull-request and CI-wait procedure

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

### Requirement: The memory digest is a bounded always-loaded surface

The session-start memory digest SHALL count as always-loaded context. It SHALL stay within the limits that `memory-recall` sets, and SHALL carry only facts from the memory store and the one-line result of the latest background run. It SHALL NOT restate a fact that the WONG-STACK block, a skill description, a rule, or a wiki page owns. Consolidation SHALL be the means that keeps the live facts inside the limit, not a larger limit.

#### Scenario: A fact duplicates a wiki page

- **WHEN** a live fact states a convention that a wiki page now owns
- **THEN** consolidation supersedes the fact with one that links the page, or `/ship` has already moved it there

#### Scenario: The digest reaches its limit

- **WHEN** live facts would fill more than the digest limit
- **THEN** the digest is cut at the limit and states how many facts it left out

### Requirement: Each rule has one owner

Each workflow rule SHALL be written in one payload file, its owner. Other skills and pages SHALL link the owner and SHALL state only how they differ from it. The change-selection order SHALL be defined once, with named rungs, and each verb SHALL refer to rungs by name, not by number. No payload surface SHALL contradict another on the same rule.

#### Scenario: A verb needs the selection order

- **WHEN** a reader follows `/ship`'s change selection
- **THEN** it links the one definition and names the rung it starts from

#### Scenario: A rule is restated

- **WHEN** a reviewer finds the same procedure in two skills
- **THEN** one copy is replaced by a link to the other

### Requirement: Vendored skills do not load descriptions into every session

A vendored skill that only a WongStack verb calls SHALL NOT be offered for automatic invocation. Its description SHALL NOT add to the always-loaded surface.

#### Scenario: A browser request that is not a verify

- **WHEN** a user asks about unread Slack messages in a WongStack repo
- **THEN** the vendored browser skill is not triggered by its description

