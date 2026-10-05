# Spec Delta

## ADDED Requirements

### Requirement: Catalogue search matches words in any order

The summary catalogue's text filter SHALL return an operation when every word of the filter appears in its identity, summary or description, whatever the order or case, for live company actions and installed memory reads alike. An empty filter SHALL keep returning every permitted operation.

#### Scenario: The words are not one phrase

- **WHEN** an agent filters with several words that an action's summary and description contain apart from each other
- **THEN** the catalogue returns that action

#### Scenario: One word matches nothing

- **WHEN** one word of the filter appears nowhere in an operation
- **THEN** the catalogue omits that operation

### Requirement: The helper reports a failed call as failed

The helper SHALL end a call whose result is an error with a failing status while still printing the safe error. When a write's outcome is uncertain and its live description names a confirming read, the helper SHALL name that read in what it reports and SHALL NOT call either action again by itself.

#### Scenario: An action returns an error

- **WHEN** a called company action or memory read returns a safe error
- **THEN** the helper prints that error and ends with a failing status

#### Scenario: A write with a confirming read times out

- **WHEN** a write that names a confirming read times out or its connection drops
- **THEN** the helper reports the uncertain outcome, names the read to check first, and repeats nothing
