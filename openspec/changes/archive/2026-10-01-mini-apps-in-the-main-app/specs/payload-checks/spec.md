## MODIFIED Requirements

### Requirement: WongStack's scripts meet a quality bar

Every JavaScript file WongStack's own tests exercise, the memory worker and the check scripts included, SHALL meet a committed coverage floor that only rises, and pass the scaffold's linter; its shell scripts SHALL pass a static shell checker at warning severity.

#### Scenario: Coverage drops

- **WHEN** a change takes script coverage below the floor
- **THEN** the checks fail and name the measured and required figures

#### Scenario: A lint error in the memory worker

- **WHEN** a change leaves an unused variable in the memory worker
- **THEN** the payload checks fail and name the file
