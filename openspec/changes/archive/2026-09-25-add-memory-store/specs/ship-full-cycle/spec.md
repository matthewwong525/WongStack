## ADDED Requirements

### Requirement: Ship distills the change's facts into the wiki

Before it archives a change, `/ship` SHALL read that change's live facts from the memory store and extract only reusable process facts. It SHALL edit the owning wiki pages under the wiki rules, in the same pull request as the change, and SHALL record in the Decision log which pages changed, or that no fact was reusable. No other skill or hook SHALL write the wiki automatically. When the store is unreachable, `/ship` SHALL record that the step was skipped and continue.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention that applies to future work
- **THEN** the ship pull request edits the wiki page that owns that topic
- **AND** the Decision log names the page

#### Scenario: Nothing reusable

- **WHEN** a change's facts hold only change-specific context
- **THEN** no wiki file changes and the Decision log states that no fact was reusable

#### Scenario: The store is unreachable at ship time

- **WHEN** `/ship` cannot read the memory store
- **THEN** it records the skipped step in the Decision log and continues to merge
