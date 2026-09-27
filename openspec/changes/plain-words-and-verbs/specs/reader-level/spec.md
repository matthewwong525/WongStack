# Spec Delta

## MODIFIED Requirements

### Requirement: Reports lead with the outcome

A reply that returns control to a non-technical reader SHALL start with the outcome in plain words: what is done, what they can open, or what is not working. When the reader invoked the verb themselves, the reply SHALL give at most one link — the preview when there is one, else the pull request — and SHALL leave out branch names, commit ids, gate-result lines, and fact counts unless the reader asks for them. A verb running inside another verb SHALL still print the lines its caller reads, such as `/save`'s gate result inside `/ship`. For a technical reader, those lines MAY follow the outcome.

#### Scenario: A build finishes

- **WHEN** a build for a non-technical reader is saved and the preview is ready
- **THEN** the reply starts with what was built and the preview link
- **AND** no branch, commit, or gate line appears unless the reader asks

#### Scenario: The reader asks for the details

- **WHEN** a non-technical reader asks what branch, commit, or check result a save produced
- **THEN** the reply gives them exactly

#### Scenario: A save inside a publish

- **WHEN** `/save` runs inside `/ship` for a non-technical reader
- **THEN** it still prints its gate-result line for `/ship` to read
- **AND** `/ship`'s own closing report leads with the outcome and leaves out the merge script's lines

#### Scenario: Resuming saved work

- **WHEN** a non-technical reader continues saved work
- **THEN** the recap says what the work is, how many steps are left, and how many reviewer comments are open
- **AND** it names no branch and counts no commits

#### Scenario: A technical reader

- **WHEN** the reader's page records `**Technical level:** technical`
- **THEN** the branch, commit, and gate lines follow the outcome as before
