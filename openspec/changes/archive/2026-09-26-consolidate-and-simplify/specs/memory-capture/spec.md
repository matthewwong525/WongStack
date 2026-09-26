## ADDED Requirements

### Requirement: Session capture excludes credential values

When `/save` or the background capture turns a session into facts, it SHALL exclude every real credential value supplied, rotated, read, or written during the session. It MAY preserve the variable name, the fact that it changed, its purpose, where it is obtained, and any non-secret operational decision. The same exclusion SHALL apply to the change's Status, Decision log, tasks, commit message, PR body, `/save` report, and background-run counts.

#### Scenario: A token was rotated during the session

- **WHEN** `/save` captures a session in which `SERVICE_TOKEN` was rotated
- **THEN** a fact may record that `SERVICE_TOKEN` rotated and its non-secret sourcing guidance
- **AND** neither the old nor new value appears in a fact or another handoff surface

#### Scenario: A pasted credential appears in surrounding conversation

- **WHEN** a credential value is present in conversation context used to write facts
- **THEN** the writer omits the value rather than treating verbatim user text as automatically durable
- **AND** the facts remain useful by retaining the non-secret decision and variable name

### Requirement: A conversation-only session does not produce an OpenSpec change

`/save` SHALL NOT author an OpenSpec change for a session that produced no code and no plan. It SHALL write the session's facts, and report that no change was created.

#### Scenario: No fake proposal

- **WHEN** `/save` runs after a session with no diff and no plan
- **THEN** no `openspec/changes/<name>/` folder is created
- **AND** no proposal describing nothing changing and no empty `tasks.md` are written

### Requirement: Session context lives as facts in the memory store

Session context SHALL live as facts in the repo's memory store, not in the repository. A fact's slug SHALL be the OpenSpec change name for change work, or a kebab-case topic slug for a conversation-only session. No session SHALL write a file under `notes/`.

#### Scenario: Facts are keyed to their line of work

- **WHEN** a session's work is tracked as change `add-po-search` on any branch
- **THEN** its facts have slug `add-po-search` in the memory store
- **AND** no file under `notes/` is written

#### Scenario: A conversation-only session still leaves facts

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** facts with a topic slug are written to the memory store
- **AND** no OpenSpec change folder is created for them

### Requirement: `/save` is the deliberate capture point

`/save` SHALL extract facts from the conversation since the session's last capture and pass each through the write gate, with the current session id and tags. It SHALL write no fact when the session produced nothing beyond the diff and the change's Decision log, and SHALL say so in its report. Its report SHALL state how many facts were added, superseded, and dropped, and whether they were stored or spooled. The background capture SHALL be the automatic capture point for sessions that end without `/save`.

#### Scenario: A second save supersedes

- **WHEN** `/save` runs again on a change and one new fact corrects an earlier one
- **THEN** the new fact supersedes the earlier one, and the earlier fact's body is unchanged

#### Scenario: A save with nothing new to capture

- **WHEN** the session produced nothing beyond the diff and the Decision log
- **THEN** `/save` writes no fact and reports that it skipped capture

### Requirement: Facts keep what a cold reader needs

A session's facts SHALL keep what the user stated (facts, constraints, preferences, corrections), decisions with their reason, options ruled out with their reason, and concrete specifics (names, repo-relative paths, numbers, versions, error strings). An unresolved question SHALL become a `thread` fact. Facts SHALL omit tool-call mechanics, file dumps, the assistant's reasoning, the path taken to a conclusion, and anything already true in the repo or in the change's Decision log. A reason SHALL stay in the same fact as its decision.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** one fact records the rejected option and why it was rejected

#### Scenario: A question stays open

- **WHEN** a session ends with a question that nobody answered
- **THEN** a `thread` fact records it, and it stays live until a later fact supersedes it
