# Spec Delta

## REMOVED Requirements

### Requirement: Asks name outcomes at the reader's level

**Reason**: It split asks by a technical level; *Asks name outcomes in plain words* replaces it for every reader.
**Migration**: None.

## ADDED Requirements

### Requirement: Asks name outcomes in plain words

Every ask, including a clarification question, a confirmation, a next-step question, and a blocked-state fork, SHALL state its question and each option's tradeoff in plain words, as `reader-level` defines, for every reader. It SHALL name what the person will see, get, lose, or risk, not the mechanism, unless the person asked for that detail. It SHALL NOT offer a choice that needs technical judgment the person does not have. Where a skill can fix a failure within its own rules, it SHALL try the fix before it asks. The shared ask convention SHALL state this rule once.

#### Scenario: A clarification about compatibility

- **WHEN** `/explore` must ask about a data migration
- **THEN** the question asks what should happen to the accounts that exist today
- **AND** it does not use the words "migration" or "schema" unless the person used them first

#### Scenario: A walk fails after its fix attempts

- **WHEN** `/verify` fails after its own fix attempts inside `/ship`
- **THEN** `/ship` says what does not work on the preview, in plain words
- **AND** asks whether to fix it first or publish anyway, with what each choice means for the person

#### Scenario: The person asks for the evidence

- **WHEN** the person asks why the walk failed
- **THEN** the reply names the failed scenario, the check, and the evidence link
