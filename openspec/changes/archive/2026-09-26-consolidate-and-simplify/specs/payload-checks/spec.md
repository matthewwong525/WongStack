## ADDED Requirements

### Requirement: The retired-names check fails on a removed name

The payload checks SHALL include a retired-names check. A list kept beside the check SHALL name each removed or renamed thing, its replacement, and the files allowed to keep naming it. The check SHALL fail when any tracked file names a listed thing outside its allowed files, and each failure SHALL name the file, the line, the retired name, and its replacement. `CHANGELOG.md` and `openspec/changes/**` SHALL be exempt, because they record history. The check and its list SHALL be meta-repo only and SHALL NOT be in the payload manifest. Removing or renaming a payload feature SHALL add its old name to the list in the same change.

#### Scenario: A live file names a removed thing

- **WHEN** a skill page mentions a command the list retires
- **THEN** the check fails, naming the file, the line, the retired command, and its replacement

#### Scenario: An allowed file keeps its mention

- **WHEN** a spec listed as allowed for a retired name states that the removed command must stay gone
- **THEN** the check passes for that file

#### Scenario: History is exempt

- **WHEN** `CHANGELOG.md` or an archived change names a retired thing
- **THEN** the check passes

#### Scenario: A target receives no retired-names check

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** neither the check nor its list is among the files it receives
