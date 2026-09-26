## Purpose

Let a plan, a question, and a report fit the person who reads them: plain outcomes for a non-technical person, full detail for an engineer, from one line on the person's wiki page.

## ADDED Requirements

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

A reply that returns control to a non-technical reader SHALL start with the outcome in plain words: what is done, what they can open, or what is not working. Technical lines that a skill must print, such as a gate result, a branch, or a commit, MAY follow after it.

#### Scenario: A build finishes

- **WHEN** a build for a non-technical reader is saved and the preview is ready
- **THEN** the reply starts with what was built and the preview link
- **AND** the branch, commit, and gate lines come after that
