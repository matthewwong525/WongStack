## ADDED Requirements

### Requirement: Asks name outcomes at the reader's level

Every ask, including a clarification question, a confirmation, a next-step question, and a blocked-state fork, SHALL state its question and each option's tradeoff in terms the reader can judge, at the level that `reader-level` defines. For a non-technical reader, it SHALL name what the person will see, get, lose, or risk, not the mechanism. It SHALL NOT offer a choice that needs technical judgment the person does not have. Where a skill can fix a failure within its own rules, it SHALL try the fix before it asks. The shared ask convention SHALL state this rule once.

#### Scenario: A clarification about compatibility

- **WHEN** `/explore` must ask a non-technical person about a data migration
- **THEN** the question asks what should happen to the accounts that exist today
- **AND** it does not use the words "migration" or "schema"

#### Scenario: A walk fails after its fix attempts

- **WHEN** `/verify` fails for a non-technical reader after its own fix attempts inside `/ship`
- **THEN** `/ship` says what does not work on the preview, in plain words
- **AND** asks whether to fix it first or publish anyway, with what each choice means for the person

#### Scenario: A technical reader

- **WHEN** the same walk fails for a person whose page says technical
- **THEN** the ask may name the failed scenario, the check, and the evidence link
