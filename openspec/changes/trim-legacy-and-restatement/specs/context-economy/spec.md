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
