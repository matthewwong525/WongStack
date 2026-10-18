## ADDED Requirements

### Requirement: Every key says what it is for

Every registered key SHALL carry a one-line purpose, and a key set up for direct use SHALL also carry a link to its service's public API guide. The checks SHALL fail before publishing on a key with no purpose, or a direct-use key with no guide link or one that is not HTTPS.

#### Scenario: A key is added without a purpose

- **WHEN** a change registers a Stripe key with a title and secrets but no purpose
- **THEN** the checks fail and name the Stripe key
