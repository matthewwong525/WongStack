## MODIFIED Requirements

### Requirement: A bounded digest loads at session start

When a session starts or resumes, the session-start hook SHALL add a digest built by code with no model: every open thread of the change on the current branch first, then the current person's page, then other live facts by type and age. It SHALL NOT list open threads of other changes; when there are any, it SHALL say how many carry each verb's tag and how many carry none, and they SHALL stay live and searchable. It SHALL stay within 40 lines and 6 KB, name how many facts it left out, report the last background run, stay the same for the whole session, and never block the session: offline, it SHALL use the last cached digest with its age.

#### Scenario: A store with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest stays within its cap and its last line says how many it left out

#### Scenario: Open threads outnumber the digest

- **WHEN** the store holds 80 open threads on other changes and 100 other live facts
- **THEN** the digest lists none of those threads, gives their count per verb tag and untagged, and shows feedback and project facts

#### Scenario: The current change's threads

- **WHEN** the current branch's change has 12 open threads, one over 30 days old
- **THEN** the digest shows all 12 first, within its line and byte caps

## ADDED Requirements

### Requirement: The digest holds what always applies and asks for a search

The digest SHALL include the `wiki/people/` page that lists the current git email, after the current change's threads, within at most 1.5 KB; a page cut short SHALL end with a line naming its path. The digest's opening lines SHALL tell the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question.

#### Scenario: A person with a people page

- **WHEN** the current git email is listed on `wiki/people/ana.md`, a 3 KB page
- **THEN** the digest shows the first part of that page within 1.5 KB, a line naming `wiki/people/ana.md` for the rest, and then feedback facts

#### Scenario: No people page

- **WHEN** no `wiki/people/` page lists the current git email
- **THEN** the digest shows no person section, and its opening lines still ask for a search once the task is known

### Requirement: An open thread waits for its verb

A `thread` SHALL carry the tag of the verb or skill whose next run should check it (`plan`, `save`, `ship`, `sync`, `setup`, and the like) when it names one. The digest SHALL tell the agent to load a verb's open threads when that verb starts, by a tag search on `thread` facts. Consolidation SHALL restate an open thread that names such a run but carries no tag, superseding it with the same text and the tag.

#### Scenario: A verb starts

- **WHEN** 87 open threads exist, 3 of them tagged `plan`, and `/plan` starts
- **THEN** the agent loads those 3 threads with their ages, and none of the other 84

#### Scenario: An untagged thread at consolidation

- **WHEN** consolidation finds an open thread that says "check the next real /plan" and carries no tag
- **THEN** it supersedes the thread with the same text tagged `plan`, and the old thread stays searchable with `--all`
