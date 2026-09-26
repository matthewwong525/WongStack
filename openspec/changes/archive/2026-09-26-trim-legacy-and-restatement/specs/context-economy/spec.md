## MODIFIED Requirements

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

## ADDED Requirements

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
