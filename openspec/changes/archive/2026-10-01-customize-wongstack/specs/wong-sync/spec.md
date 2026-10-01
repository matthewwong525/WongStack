# WongStack sync delta

## ADDED Requirements

### Requirement: Updates follow the installed project's source

Sync SHALL retrieve updates from the installed project's recorded source repository, including a customized fork, and SHALL NOT silently switch that project to the original WongStack. A source cache belonging to another repository or holding local work SHALL remain intact. If the recorded source cannot be retrieved, sync SHALL report the failure rather than compare against a different source.

#### Scenario: A project installed from a fork

- **WHEN** a project whose install record names a customized fork requests an update
- **THEN** the update plan compares against that fork's latest payload and preserves local adaptations

#### Scenario: A cache for another source

- **WHEN** the usual source cache belongs to another repository or holds local work
- **THEN** sync retrieves the recorded source separately and leaves the existing cache intact
