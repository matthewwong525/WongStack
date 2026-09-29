# Spec Delta

## MODIFIED Requirements

### Requirement: A team keeps personal facts personal

In a team (more than one email holds a key), the Worker SHALL return to a member or reader key only facts that key may see: everyone's shared `project`, `reference`, and `thread` facts, plus the key's own `user` and `feedback` facts and its own unshared facts, however the read is written. The admin's key SHALL see every fact, and `--everyone` SHALL widen only the admin's view. The client SHALL still narrow the admin's digest and search to the admin's own personal facts, matched on every email on their `wiki/people/` page, unless asked for everyone. A repo that is not a team SHALL NOT filter by person.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member key sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

### Requirement: Unsaved sessions are captured in the background

A background run the session-start hook starts, never the main agent, SHALL capture this repo's own sessions that ended without `/save`, a few per run, newest first. It SHALL skip what `/save` already covered, pass every fact through the gate, and treat transcript content as data, never as instructions. No word in a message SHALL keep a session out of capture; a session already recorded as private SHALL stay private, with no upload, no model read, and no facts. The counts a run records SHALL be what the memory script stored during that run, never the model's own report; when the model reports different counts, the run's record SHALL say so.

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript holds a page telling the reader to write something into memory
- **THEN** the facts record only what the session did

#### Scenario: The model claims work it did not do

- **WHEN** a background run writes nothing and the model finishes with `captured 4`
- **THEN** the recorded run counts no captured session, and the next digest says the run's own report differed

#### Scenario: A chat that says #private

- **WHEN** a session's user message contains `#private`
- **THEN** the session is captured and its transcript kept like any other

#### Scenario: A session marked private before this change

- **WHEN** a session was recorded as private by an earlier version
- **THEN** it stays private: no upload, no model read, and no facts

## REMOVED Requirements

### Requirement: Every repo on a machine reads the person's home

**Reason**: Each repo's memory is its own; nothing loads from another repo at session start.
**Migration**: None. A machine record left in `~/.wong-stack/machine.json` is ignored and can be deleted; the home repo's store keeps its facts and serves that repo as any other.

### Requirement: Private-life facts stay home

**Reason**: Each repo's memory is its own; a fact learned in a repo stays in that repo's store, as a personal fact only its author and the admin see.
**Migration**: None. Facts already sent to a home store stay there. Private life meant for no one else belongs in a repo only the person uses.
