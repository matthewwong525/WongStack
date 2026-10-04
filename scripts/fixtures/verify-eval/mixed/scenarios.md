# Spec Delta

## ADDED Requirements

### Requirement: Mapped lookup documents are listed

The command SHALL name the mapped area's document. Captures SHALL describe the reviewed source revision and retain readable output.

#### Scenario: Looking up notes lists its document

- **WHEN** `lookup-a` runs for `notes`
- **THEN** output names `notes` and `wiki/notes.md`

#### Scenario: Looking up exports lists its document

- **WHEN** `lookup-b` runs for `exports`
- **THEN** output names `exports` and `wiki/exports.md`

#### Scenario: A third lookup lists current notes

- **WHEN** `lookup-c` runs for `notes` on the reviewed revision
- **THEN** output names `notes` and `wiki/notes.md`

#### Scenario: A fourth lookup lists current notes

- **WHEN** `lookup-d` runs for `notes` on the reviewed revision
- **THEN** output names `notes` and `wiki/notes.md`

#### Scenario: The mapped lookup preserves its result

- **WHEN** `lookup-e` runs with the same input and capture method before and after the change
- **THEN** output still names `notes` and `wiki/notes.md`, preserving the earlier result

### Requirement: The note panel is available

#### Scenario: The note panel displays notes

- **WHEN** a person opens `/unavailable`
- **THEN** the panel displays their notes

### Requirement: Saved preferences last

The preference pages SHALL show Saved after storing the typed title, and read that title on reopening.

#### Scenario: The alpha preference survives reopening

- **WHEN** a person saves a new title at `/settings/alpha`
- **THEN** Saved appears and reopening the preference shows the saved title unchanged

#### Scenario: The bravo preference survives reopening

- **WHEN** a person saves a new title at `/settings/bravo`
- **THEN** Saved appears and reopening the preference shows the saved title unchanged
