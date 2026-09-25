## ADDED Requirements

### Requirement: Sync plans the move of notes into the memory store

When a sync brings in the memory store to a repo that has a `notes/` directory, the planned update SHALL include tasks to provision the store, and then, for every `notes/<slug>.md`: upload the note's text to R2 when the store has a bucket, record a session with agent `migration` for it, and extract its facts through the write gate with source `migration` and the note's original dates. The plan SHALL then verify that every note has its migration session, and only then delete `notes/` and its path rule. A note with no fact worth keeping SHALL still get its migration session, recorded as `skipped`. A locally changed `notes/README.md` SHALL be reported so its local conventions can move to an owning page.

#### Scenario: An installed repo with notes

- **WHEN** `/wong-sync` plans an update to this release in a repo with 12 notes
- **THEN** the plan migrates 12 notes, verifies that 12 migration sessions exist in the store, and only then deletes `notes/`

#### Scenario: The migration fails midway

- **WHEN** the migration stops after 5 of 12 notes
- **THEN** `notes/` stays in place and the task reports the 7 notes that have no migration session

#### Scenario: A note's text is kept

- **WHEN** a note is migrated into a store with a bucket
- **THEN** its full text is in R2, and each of its facts links to its migration session
