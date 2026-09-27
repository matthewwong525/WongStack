## MODIFIED Requirements

### Requirement: Local installation choices survive an update

The install record `.claude/.wong-stack.json` SHALL keep the repo's renamed skills, and SHALL advance to the new source version and commit only after the update is implemented. A renamed skill SHALL be updated in place, never duplicated.

#### Scenario: Renamed skill

- **WHEN** the record maps a WongStack skill to a local name
- **THEN** the update lands in the local skill and no second copy appears

#### Scenario: Plan without implementation

- **WHEN** a sync plan is drafted but not built
- **THEN** the install record still names the old version

## REMOVED Requirements

### Requirement: Relocated wiki pages map safely
**Reason**: No installed repo keeps its wiki pages in another folder; the setting was never used.
**Migration**: A record that still sets the docs folder is ignored, and the pages sync to `wiki/`. Move any relocated pages back under `wiki/` before syncing.
