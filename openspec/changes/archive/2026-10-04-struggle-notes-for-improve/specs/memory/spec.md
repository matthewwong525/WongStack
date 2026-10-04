## MODIFIED Requirements

### Requirement: Facts keep what a cold reader needs

A fact SHALL keep what the person stated, decisions with their reason in the same fact, options ruled out and why, and concrete names, paths, numbers, and errors; an unanswered question SHALL become a `thread`. Facts SHALL omit tool mechanics, the agent's reasoning, and what the repo or the Decision log already says, except in a struggle note.

#### Scenario: A rejected option

- **WHEN** an option was considered and rejected
- **THEN** one fact records the option and why it was rejected

## ADDED Requirements

### Requirement: A session's struggles become notes for /improve

A moment where a session shows the assistant struggled SHALL become one `thread` tagged `improve` that names the moment and what it cost: a correction from the person, an offered choice the person answered in their own words, a step that failed repeatedly, or a long search. `/save` and the background capture SHALL write these notes by the same rule. A note SHALL NOT carry private detail or general advice, and a session that shows no such moment SHALL get none.

#### Scenario: A choice answered in the person's own words

- **WHEN** the assistant offered three choices and the person typed a different answer
- **THEN** one `thread` tagged `improve` records what was offered and what the person wanted instead

#### Scenario: Trouble while handling something private

- **WHEN** the assistant retried a failing step during a task about the person's health
- **THEN** the note names the failing step and its cost, and says nothing of the health matter
