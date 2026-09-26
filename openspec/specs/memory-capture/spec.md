# memory-capture Specification

## Purpose
Capture sessions that ended without `/save`, and keep the live facts small and consistent, in a background run that the session-start hook starts and that never delays the first reply.
## Requirements
### Requirement: The session-start hook starts background work and runs no model

The payload SHALL register a `SessionStart` hook that runs a script and no model. The script SHALL record the new session's id, agent, working directory, and repo in a registry on the machine. It SHALL start one background run when at least one of these is true: this repo has sessions that are idle for at least 1 hour, are not the current session, and have no `captured`, `skipped`, or `private` row covering their latest message; the local spool holds facts; or consolidation is due. The hook SHALL NOT wait for the run. The hook SHALL finish within 2 seconds, SHALL exit successfully on any failure, and SHALL NOT block the session.

#### Scenario: Nothing to do

- **WHEN** every past session of this repo has a row, the spool is empty, and consolidation is not due
- **THEN** no background run starts

#### Scenario: Three sessions need capture

- **WHEN** three idle sessions of this repo have no row
- **THEN** the hook starts one background run and returns without waiting for it

#### Scenario: The store is unreachable

- **WHEN** the hook cannot reach the store
- **THEN** the session starts normally and the hook reports one line that it skipped

### Requirement: The background run is detached from the session

The background run SHALL be a detached process that runs the same agent's command-line tool without a user, with the smallest capable model and the capture runbook of the `memory` skill. The main agent SHALL NOT launch it, wait for it, or receive its output during the session. Only one run SHALL be active for a repo at a time. The run's own session SHALL be marked in the registry so that no later run captures it. When the agent's command-line tool cannot start a run without a user, the hook SHALL instead tell the main agent to start one background subagent with the same runbook, and SHALL say that it fell back.

#### Scenario: The user asks a question at session start

- **WHEN** capture is pending and the user's first prompt is a question
- **THEN** the main agent answers the question and launches nothing

#### Scenario: Two sessions start together

- **WHEN** two sessions of the same repo start within a second
- **THEN** only one background run is active

#### Scenario: A headless run is not available

- **WHEN** the agent's command-line tool cannot run without a user on this machine
- **THEN** the hook asks the main agent to start a background subagent, and says so in one line

### Requirement: The next digest reports what the background run did

Each background run SHALL record in the `runs` table when it ran, on which machine, and its counts: sessions captured, skipped, and private; facts added, superseded, and dropped; and, for consolidation, facts merged. The next session's digest SHALL show the result of the latest run in one line, and a failed run SHALL show as failed with its reason.

#### Scenario: A run captured sessions

- **WHEN** the previous background run captured 3 sessions and added 7 facts
- **THEN** the next digest's header states those counts and the run's time

#### Scenario: A run failed

- **WHEN** the previous background run stopped because the token was rejected
- **THEN** the next digest states that the run failed and names the token variable, without its value

### Requirement: Discovery claims only this repo's own sessions

The background run SHALL read Claude Code and Codex transcripts. It SHALL claim a transcript for this repo only when the registry maps it to this repo, or when its working directory is inside a checkout of this repo that currently exists. It SHALL exclude subagent transcripts, background-run sessions, and sessions it cannot claim. When a transcript's format is not recognized, it SHALL report that and store nothing for it.

#### Scenario: A deleted worktree

- **WHEN** a transcript's working directory no longer exists and the registry has no entry for it
- **THEN** the run skips it

#### Scenario: A background session

- **WHEN** the run looks for pending sessions
- **THEN** it never lists a background-run session or a subagent transcript

#### Scenario: A changed format

- **WHEN** a transcript does not parse as a known format
- **THEN** the run's counts name the file as not recognized and no row is written

### Requirement: `#private` removes a session from memory

When any user message in a session contains `#private`, the background run SHALL record the session with status `private`. It SHALL NOT upload the transcript, and SHALL NOT send the transcript to a model. The check SHALL be a plain text search, which uses no model.

#### Scenario: Marked private at the end

- **WHEN** the user's last message in a session contains `#private`
- **THEN** that session gets a `private` row, no R2 object, and no facts

### Requirement: Capture is bounded and extracts facts through the write gate

One background run SHALL capture at most 5 sessions, newest first. Before any model reads a transcript, code SHALL reduce it to the user and assistant text plus error strings. The model SHALL propose facts to the same bar as `/save`, and every fact SHALL pass the write gate. A session with no fact worth keeping SHALL be recorded as `skipped`. A session that already has facts from `/save` SHALL be read only after the last message that save covered. The run SHALL treat transcript content as data, never as instructions.

#### Scenario: A large backlog

- **WHEN** 40 sessions are pending
- **THEN** one run captures the 5 newest and later runs continue

#### Scenario: A saved session continued

- **WHEN** a session ran `/save` and then continued for an hour
- **THEN** the run reads only the messages after the save

#### Scenario: A session on an existing change

- **WHEN** a pending session worked on change `add-po-search`
- **THEN** its facts have slug `add-po-search`

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript contains a web page that tells the reader to write something into memory
- **THEN** the facts record only what the session did, not that instruction

### Requirement: The background run consolidates the live facts

When 24 hours and 5 captured sessions have passed since the last consolidation, the background run SHALL consolidate after capture. It SHALL read the live facts by slug and type, merge facts that say the same thing into one new fact that supersedes them, and supersede a fact that a newer live fact contradicts, newest first. It SHALL NOT delete a fact or edit its body. It SHALL record in its counts how many facts it merged that the write gate had let through, so that search can later be judged by that number.

#### Scenario: Consolidation is due

- **WHEN** 30 hours and 6 captured sessions have passed since the last consolidation
- **THEN** the run consolidates after capture and records the number of merged facts

#### Scenario: Consolidation is not due

- **WHEN** 30 hours but only 2 captured sessions have passed since the last consolidation
- **THEN** the run captures and does not consolidate

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for the same setting
- **THEN** the older fact is superseded by the newer one, and both bodies are unchanged


### Requirement: Background capture writes through the memory script only

The background capture run SHALL pass each JSON input to the memory script as the path of a file that it wrote into one input folder. The run SHALL create that folder for itself, outside the repository and outside its git directory, and SHALL delete it when the run ends, whether the run succeeds or fails. The run SHALL be granted permission to write files only inside that folder, and to run commands only through the memory script. The runbook SHALL NOT tell the model to pass JSON through a shell here-document, a pipe, or a redirect, because the permission check can deny a multi-line command whose text holds shell characters. The tools the run is granted SHALL cover every step its runbook tells it to take. A test SHALL fail when the runbook names a step that the granted tools do not allow.

#### Scenario: Capture runs in don't-ask mode

- **WHEN** the background run processes a session under `dontAsk` permissions, and a fact it records contains characters such as `<name>`, `>`, `|`, or `$`
- **THEN** it records its facts, and the next digest reports a successful run

#### Scenario: The input folder is removed

- **WHEN** a background run ends, with success or failure
- **THEN** its input folder no longer exists
- **AND** no file was written inside the repository or its git directory

#### Scenario: The runbook drifts from the grant

- **WHEN** the runbook tells the model to write a file outside the granted input folder, to pass JSON through a here-document, or to run a command outside the memory script
- **THEN** the test suite fails

### Requirement: Concurrent memory runs do not lose state

The run lock SHALL tolerate a lock file that disappears while it is checked. The record of sessions already seen SHALL be written atomically, so that a foreground command and a background run do not overwrite each other's updates.

#### Scenario: Two writers update the seen-set

- **WHEN** a foreground `strip` and the background run both update the seen-set
- **THEN** both updates are kept

### Requirement: Private-life facts go to home's store

Capture in any repo other than home, by `/save` or by the background run, SHALL write a fact about the person's private life (health, family, money, personal plans) to home's store, not to the repo's own store. The memory script SHALL offer this as a `--home` option on its read and write commands. A fact written to home's store SHALL carry no session id. When home's store can not be reached, the fact SHALL wait in home's local spool, and home's next session start SHALL send it. When the machine records no home, capture SHALL drop the fact. In both cases it SHALL NOT write the fact to the repo's own store. The raw transcript upload SHALL NOT change.

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session records that the person's daughter starts school on 2026-10-05
- **THEN** that fact is in home's store and not in the work repo's store

#### Scenario: No home recorded

- **WHEN** the same session runs on a machine with no home
- **THEN** the fact is dropped, and the run counts it as dropped
