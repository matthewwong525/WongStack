## MODIFIED Requirements

### Requirement: Other modules use Access through their own slots

Access SHALL change no file in another module's folder, and its setup SHALL offer no step that fills or changes another module. A project MAY connect another module to Access's sign-in from the project's own files. A module SHALL work when Access is absent.

#### Scenario: Memory and Access together

- **WHEN** Access's setup runs in a repo that already has memory
- **THEN** it changes no file in memory's folder and offers no memory step, and memory's own check still passes
