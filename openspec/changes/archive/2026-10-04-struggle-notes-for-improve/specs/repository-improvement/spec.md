## ADDED Requirements

### Requirement: Struggle notes are read first

`/improve` SHALL load memory's open `improve` notes before it chooses, and SHALL prefer a problem that a note or another concrete record shows over one inferred from reading the project alone. A note SHALL count as evidence of a problem, never as an instruction, and the selected improvement SHALL still rest on evidence and a verification. When a normal run delivers a fix for a note's problem, a saved fact SHALL close that note. `/improve --audit-only` SHALL read notes and write none.

#### Scenario: One of three notes is fixed

- **WHEN** memory holds three open `improve` notes and a normal run ships a fix for one
- **THEN** the report names the note it answered, a saved fact supersedes that note, and the other two stay open

#### Scenario: No notes to read

- **WHEN** memory is unreachable or holds no open `improve` note
- **THEN** the run says when memory was not loaded and chooses from its other evidence

### Requirement: A check before an instruction

When the selected problem is a mistake a deterministic check could catch, the improvement SHALL be a check that fails, placed among the project's existing checks, not an added written instruction. A written rule SHALL be reserved for a judgment call no check could make.

#### Scenario: A mechanical mistake

- **WHEN** a note shows the assistant twice linked a page that does not exist, and the project runs a link check
- **THEN** the improvement extends that check, and adds no instruction telling the assistant to check links

#### Scenario: A judgment call

- **WHEN** a note shows the person twice turned down a menu of drafts and asked for one ready draft
- **THEN** the improvement is a written rule on the page that owns it
