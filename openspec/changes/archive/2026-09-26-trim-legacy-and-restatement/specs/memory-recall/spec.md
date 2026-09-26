## MODIFIED Requirements

### Requirement: A bounded digest loads at session start

The session-start hook SHALL add a digest of the memory store to the agent's context when a session starts or resumes, and SHALL NOT add it again after the context is cleared or compacted. Code SHALL build the digest with no model. The digest SHALL list the live `thread` facts of the change whose recorded branch is the current branch first, then other open threads, then the other live facts by type and recency. It SHALL NOT exceed 40 lines or 6 KB. When facts are left out, its last line SHALL state how many and how to search them. Each line SHALL show the fact's type, body, slug, age in days, author, and id. When the store has no live facts and no run to report, the hook SHALL add nothing.

#### Scenario: A repo with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest holds at most 40 lines and 6 KB, and its last line states how many facts it left out and names the search command

#### Scenario: Work continues on a change branch

- **WHEN** a session starts on the branch that change `add-po-search` records, and that slug has two open threads
- **THEN** the digest lists those two threads before any other fact

#### Scenario: The context is cleared

- **WHEN** the user runs `/clear` in a Claude Code session
- **THEN** the hook does not add the digest again

#### Scenario: An empty store

- **WHEN** the store has no live facts and no background run
- **THEN** the hook adds nothing to the context
