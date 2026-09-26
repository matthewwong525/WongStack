## MODIFIED Requirements

### Requirement: A write gate decides add, supersede, or drop

Before the store accepts a fact, the memory script SHALL show the writer the live facts with the same slug and the closest keyword matches across all slugs. The writer SHALL then add the fact, supersede one named live fact, or drop the fact. The script SHALL record a supersede in the same batch as the new fact. The gate SHALL be the same for `/save`, the background capture, and consolidation.

#### Scenario: A paraphrase of a live fact

- **WHEN** a session produces a fact that says the same thing as a live fact in other words
- **THEN** the writer sees the live fact among the matches and drops the new fact

#### Scenario: A correction

- **WHEN** a new fact contradicts a live fact that the gate shows
- **THEN** the new fact is stored and supersedes the old one

## ADDED Requirements

### Requirement: Records from an earlier notes migration stay readable

The memory script SHALL NOT offer a command that imports `notes/` files. A store that already holds sessions with agent `migration`, facts with source `migration`, or R2 objects under `migration/` SHALL keep them unchanged. Search, show, and the digest SHALL return those facts like any other fact, and `source` SHALL print the stored note text behind a migrated fact.

#### Scenario: The import command is gone

- **WHEN** a user runs `memory.mjs import --file migration.json`
- **THEN** the script prints its usage and exits with a non-zero status
- **AND** the store does not change

#### Scenario: A migrated fact is traced to its note

- **WHEN** a store with a bucket holds a fact whose session is `migration:<slug>` with a stored note text
- **THEN** `memory.mjs source <fact-id>` prints that note text
