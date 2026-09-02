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

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters; the how belongs in the skill body, which loads only on invocation. Generated skills (`openspec-*`) and vendored skills (`agent-browser`) are exempt and SHALL stay pristine.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored skill's description exceeds the budget
- **THEN** it is rewritten to its purpose and its invocation triggers
- **AND** every behavior detail it dropped remains stated in the skill body

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are trimmed
- **THEN** no `openspec-*` or `agent-browser` frontmatter changes
