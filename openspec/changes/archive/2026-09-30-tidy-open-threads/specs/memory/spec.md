## MODIFIED Requirements

### Requirement: A bounded digest loads at session start

When a session starts or resumes, the session-start hook SHALL add a digest built by code with no model: every open thread of the change on the current branch first, then at most 8 other open threads under 30 days old, newest first, then other live facts by type and age. When it holds back open threads, it SHALL say how many and how to search them; a thread it holds back SHALL stay live and searchable. It SHALL stay within 40 lines and 6 KB, name how many facts it left out, report the last background run, stay the same for the whole session, and never block the session: offline, it SHALL use the last cached digest with its age.

#### Scenario: A store with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest stays within its cap and its last line says how many it left out

#### Scenario: Open threads outnumber the digest

- **WHEN** the store holds 80 open threads on other changes, 5 of them over 30 days old, and 100 other live facts
- **THEN** the digest shows the 8 newest of those threads, says how many more open threads a search finds, and still shows feedback and project facts

#### Scenario: The current change's threads

- **WHEN** the current branch's change has 12 open threads, one over 30 days old
- **THEN** the digest shows all 12 first, within its line and byte caps

### Requirement: Every write passes one gate

Before a fact is stored, the writer SHALL see the live facts on the same slug, the closest matches across slugs, and the open threads on other slugs that match the fact's words, and SHALL add the fact, supersede one named live fact, or drop it. A fact that answers an open thread SHALL supersede it. The gate SHALL be the same for `/save`, the background capture, and consolidation, and a report SHALL count as superseded only facts the store actually marked.

#### Scenario: A paraphrase

- **WHEN** a new fact says what a live fact already says
- **THEN** the writer sees the live fact and drops the new one

#### Scenario: A check done under other work

- **WHEN** a session on one change writes a fact that a real setup run worked, and an open thread on another slug asks for that real setup run
- **THEN** the gate lists that thread, and the writer's fact supersedes it

### Requirement: Live facts are consolidated, never deleted

The background run SHALL periodically merge facts that say the same thing into one new fact, supersede contradicted facts, newest wins, and close an open thread that a later live fact shows was answered. It SHALL NOT delete a fact or edit its body.

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for one setting
- **THEN** the newer supersedes the older, and both bodies are unchanged

#### Scenario: A thread a later fact answered

- **WHEN** an open thread asks for a real phone test and a later live fact records that test passing
- **THEN** consolidation supersedes the thread with a fact that says so, and the thread's body is unchanged
