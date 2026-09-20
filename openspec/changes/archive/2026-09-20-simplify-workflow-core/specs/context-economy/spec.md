## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code and historical records SHALL be accounted for separately.

#### Scenario: The implementation is reviewed

- **WHEN** the simplification is reported complete
- **THEN** its evidence names the counted paths, the before-and-after totals, and the absence of normal generated-skill handoffs
- **AND** it does not claim that all inventoried text was loaded in every session
