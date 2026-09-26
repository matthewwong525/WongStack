## MODIFIED Requirements

### Requirement: Ship distills the change's facts into the wiki

Before it archives a change, `/ship` SHALL read the live facts of every session on the change's recorded branch, together with the live facts on the change's slug, from the memory store. It SHALL keep only repeatable knowledge, under the `people-wiki` test and writing rules. It SHALL place each kept fact by progressive disclosure: extend the page that owns it, or add a page linked from its hub. It SHALL make these edits in the same pull request as the change, and SHALL record in the Decision log which pages changed, or that no fact was repeatable. This step SHALL catch what the session did not write when it learned it, as `people-wiki` requires. When the store is unreachable, `/ship` SHALL record that the step was skipped and continue.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention that applies to future work
- **THEN** the ship pull request edits the wiki page that owns that topic
- **AND** the Decision log names the page

#### Scenario: A preference learned on another slug

- **WHEN** a session on the change's branch recorded a teammate's review preference under a topic slug
- **THEN** the ship pull request adds it to that teammate's `people/` page

#### Scenario: Nothing reusable

- **WHEN** a change's facts hold only change-specific context
- **THEN** no wiki file changes and the Decision log states that no fact was repeatable

#### Scenario: The store is unreachable at ship time

- **WHEN** `/ship` cannot read the memory store
- **THEN** it records the skipped step in the Decision log and continues to merge
