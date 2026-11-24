# memory-plugin Specification

## Purpose
Memory as one plugin any repo can install: the core, a store interface of named operations that a server enforces, and a profile that holds each repo's own extras. WongStack uses the same plugin it ships.

## Requirements

### Requirement: The plugin reaches a store only through named operations

The plugin SHALL read and write memory only through one fixed list of named operations, and SHALL never send a query, a table name, or an owner. It SHALL work the same with any backend that answers those operations, in the same process or over the network, and SHALL never itself hold back a fact for privacy: what a caller may see is the backend's decision.

#### Scenario: A stand-in backend

- **WHEN** the plugin's tests run against a stand-in backend that answers the operations from memory
- **THEN** the digest, search, the write gate, capture, upkeep, and the before-edit warning give the same results as against WongStack's store

#### Scenario: An operation the backend lacks

- **WHEN** the plugin calls an operation a backend does not answer
- **THEN** it reports memory as not loaded for that step, and the chat goes on

### Requirement: A fact names where it came from

Every fact the store returns SHALL carry its sources as links, and the plugin SHALL show them without reading what they point to. In WongStack a fact's source SHALL be the session it came from, as stored today, with no stored record changed, and a write SHALL NOT name another session's transcript as its source.

#### Scenario: A fact from a chat

- **WHEN** a fact saved from Claude Code chat `7f3a` is read in a brief
- **THEN** its source shows as that session, and `source <id>` opens that chat's kept transcript, as allowed today

#### Scenario: A source that is not the writer's

- **WHEN** a save names another person's session as a fact's source
- **THEN** the store refuses that fact and stores nothing from the write

### Requirement: The plugin brings its own tidy

The plugin SHALL bring the memory tidy, so any repo with memory can file facts onto their topic pages and check those pages. A repo SHALL add its own pages to check, and how edits publish, through its profile; with none, the tidy SHALL check the topic pages and leave its edits unpublished on a branch.

#### Scenario: A repo with no extra pages

- **WHEN** a person runs the tidy in a repo whose profile names topics and no extra pages
- **THEN** facts are filed onto their topic pages, the edits wait on a branch, and nothing is published

### Requirement: An installed repo moves to the plugin with no fact lost

The update that brings the plugin SHALL keep every fact, tag, session, and transcript where it is, change no stored record, and need no database migration. A branch or computer that has not taken the update SHALL keep its last saved digest and hold its new facts on the computer, and those facts SHALL pass the write gate after it updates.

#### Scenario: Counts after the update

- **WHEN** an install runs `/wong-sync` to this release and production deploys
- **THEN** memory's counts of facts, live facts, sessions, and kept transcripts are the same as before

#### Scenario: A branch not yet updated

- **WHEN** a chat on a branch without the update saves two facts after production has deployed
- **THEN** it shows its last saved digest, the two facts wait on the computer, and the first chat after the branch updates sends them through the gate

### Requirement: The plugin starts its own daily tidy

The first chat a person starts each day on a computer with memory SHALL start one tidy in the background, and the chat SHALL never wait for it. No schedule, app, or other module SHALL be needed. A person SHALL get at most one started tidy a day across all their computers, even after a failure, unless they ask for one. The tidy's own work SHALL stop within 30 minutes, and its whole run, the wait for the project's checks included, within 90. The tidy's own chat SHALL never be saved to memory and SHALL start nothing. A person SHALL be able to turn the daily tidy off and on for one computer, start one at once, and see when the last one ran and what it changed, by asking any chat. The record SHALL count what was stored and changed, never the model's own report.

#### Scenario: Two computers, one day

- **WHEN** Jo starts a first chat on a laptop at 9:00 and on a desktop at 9:05 the same day
- **THEN** the laptop's tidy runs, the desktop starts none, and both chats start with no wait

#### Scenario: Turned off on one computer

- **WHEN** Jo asks a chat to stop the daily memory tidy on the laptop
- **THEN** the laptop's chats start no tidy until Jo turns it on again, and Jo's desktop still starts one

#### Scenario: A store that is not updated yet

- **WHEN** the plugin is newer than the store it reaches
- **THEN** no daily tidy starts, the chat start says once that the store is older, and capture at chat end works as before
