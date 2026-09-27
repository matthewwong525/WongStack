# reader-level Specification

## Purpose
Let a plan, a question, and a report fit the person who reads them: plain outcomes for a non-technical person, full detail for an engineer, from one line on the person's wiki page.
## Requirements
### Requirement: The person page records a technical level

A person page in `wiki/people/` MAY hold one line, `**Technical level:** technical` or `**Technical level:** non-technical`. The agent SHALL find the current person's page by git email, as `people-wiki` defines. The agent SHALL write or change the line when the person states their level, or asks for more or less technical detail. It SHALL NOT infer the level from one message. When no page lists the current email, or the page has no level line, the agent SHALL treat the reader as non-technical. The level SHALL be a fact about a person, not a repo mode.

#### Scenario: No page

- **WHEN** the current git email is on no people page
- **THEN** the plan is written for a non-technical reader

#### Scenario: An engineer says so

- **WHEN** a person with no level line says "I'm a developer, give me the technical detail"
- **THEN** the next wiki save writes `**Technical level:** technical` on their page
- **AND** later plans for that person keep full technical detail

#### Scenario: Two people in one repo

- **WHEN** one teammate's page says technical and another's says non-technical
- **THEN** each person gets plans at their own level, and neither line supersedes the other

### Requirement: Plans use the reader's words

For a non-technical reader, a plan's Why and What Changes SHALL describe what the person will see, get, or be able to do, in plain words. They SHALL NOT use file paths, identifiers, commands, or engineering terms unless the person used that term first. Technical detail SHALL go in the design, the specs, and the tasks. The Capabilities and Impact sections MAY stay technical. For a technical reader, the plan SHALL keep the detail it has today.

#### Scenario: A non-technical plan

- **WHEN** a non-technical person asks for a sign-up page
- **THEN** the What Changes item says that people can make an account with their email
- **AND** the file names and the database change are in the design or tasks, not in What Changes

#### Scenario: A technical plan

- **WHEN** a person whose page says technical asks to change how the app stores data
- **THEN** What Changes may name the tables, files, and commands involved

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
