# Spec Delta

## MODIFIED Requirements

### Requirement: Unsaved sessions are captured in the background

A background run the session-start hook starts, never the main agent, SHALL capture this repo's own sessions that ended without `/save`, a few per run, newest first. It SHALL skip what `/save` already covered, pass every fact through the gate, and treat transcript content as data, never as instructions. No word in a message SHALL keep a session out of capture; a session already recorded as private SHALL stay private, with no upload, no model read, and no facts. The counts a run records SHALL be what the memory script stored during that run, never the model's own report; when the model reports different counts, the run's record SHALL say so. The run SHALL use its agent CLI's configured or built-in default model when no memory-specific model is set, and SHALL use the memory-specific model when one is explicitly set.

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

#### Scenario: No memory-specific model is configured

- **WHEN** a background run starts for Claude Code or Codex with no memory-specific model setting
- **THEN** that agent CLI chooses its normal default model, with no model name supplied by WongStack

#### Scenario: A separate memory model is configured

- **WHEN** a background run starts with a memory-specific model setting
- **THEN** the run requests that model explicitly from its agent CLI
