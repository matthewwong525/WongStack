# reader-level Specification

## Purpose
Write every plan, question, and report in plain words for everyone, with detail when the person asks.

## Requirements

### Requirement: Plans are written in plain words

A plan's Why and What Changes SHALL describe what the person will see, get, or be able to do, in plain words, for every reader. They SHALL NOT use file paths, identifiers, commands, or engineering terms unless the person used that term first or asked for that detail. Technical detail SHALL go in the design, the specs, and the tasks. The Capabilities and Impact sections MAY stay technical.

#### Scenario: A plan

- **WHEN** a person asks for a sign-up page
- **THEN** the What Changes item says that people can make an account with their email
- **AND** the file names and the database change are in the design or tasks, not in What Changes

#### Scenario: The person names the mechanism

- **WHEN** a person asks to move the app's data into a new `accounts` table
- **THEN** What Changes may name the `accounts` table, because the person used the term first

### Requirement: Reports give the outcome and one link

A reply that returns control to a person SHALL start with the outcome in plain words: what is done, what they can open, or what is not working. When the person invoked the verb themselves, the reply SHALL give at most one link — the preview when there is one, else the pull request — and SHALL leave out branch names, commit ids, gate-result lines, and fact counts unless the person asks for them, for that reply or as a standing preference on their person page. A verb running inside another verb SHALL still print the lines its caller reads, such as `/save`'s gate result inside `/ship`. The agent SHALL NOT infer a wish for detail from one message.

#### Scenario: A build finishes

- **WHEN** a build is saved and the preview is ready
- **THEN** the reply starts with what was built and the preview link
- **AND** no branch, commit, or gate line appears unless the person asks

#### Scenario: The person asks for the details

- **WHEN** a person asks what branch, commit, or check result a save produced
- **THEN** the reply gives them exactly

#### Scenario: Details from now on

- **WHEN** a person says "always show me the branch and commit"
- **THEN** the next wiki save writes that preference on their person page
- **AND** later reports for that person include those lines after the outcome

#### Scenario: A save inside a publish

- **WHEN** `/save` runs inside `/ship`
- **THEN** it still prints its gate-result line for `/ship` to read
- **AND** `/ship`'s own closing report leads with the outcome and leaves out the merge script's lines

#### Scenario: Resuming saved work

- **WHEN** a person continues saved work
- **THEN** the recap says what the work is, how many steps are left, and how many reviewer comments are open
- **AND** it names no branch and counts no commits unless the person asks
