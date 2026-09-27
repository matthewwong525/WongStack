## MODIFIED Requirements

### Requirement: A write gate decides add, supersede, or drop

Before the store accepts a fact, the memory script SHALL show the writer the live facts with the same slug and the closest keyword matches across all slugs. The writer SHALL then add the fact, supersede one named live fact, or drop the fact. The script SHALL record a supersede in the same batch as the new fact. The gate SHALL be the same for `/save`, the background capture, and consolidation.

The script's report of a write SHALL count as superseded only the facts the store actually marked superseded. A supersede that names a missing or already-superseded fact SHALL store the new fact and SHALL NOT count as a supersede.

#### Scenario: A paraphrase of a live fact

- **WHEN** a session produces a fact that says the same thing as a live fact in other words
- **THEN** the writer sees the live fact among the matches and drops the new fact

#### Scenario: A correction

- **WHEN** a new fact contradicts a live fact that the gate shows
- **THEN** the new fact is stored and supersedes the old one

#### Scenario: A supersede of a fact that is not live

- **WHEN** a write supersedes a fact id that does not exist or is already superseded
- **THEN** the report shows `superseded 0` for it
- **AND** the new fact is stored
