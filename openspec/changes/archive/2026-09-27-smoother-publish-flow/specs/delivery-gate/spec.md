## MODIFIED Requirements

### Requirement: Ship checkpoints once through save

After archiving, `/ship` SHALL invoke ordinary `/save` exactly once, so the commit CI tests is the commit `/ship` merges; `/save` SHALL use the archive as the change record and SHALL NOT author a new active change. Uncommitted work on the default branch SHALL move to a new branch through that same save, not an earlier one, and SHALL NOT be reported as nothing to ship.

#### Scenario: A one-go ship

- **WHEN** `/ship <intent>` runs from plan to merge
- **THEN** only the save after the archive runs, and CI runs once before the walk

#### Scenario: Publish from the default branch

- **WHEN** `/ship` runs on the default branch with a finished, uncommitted change
- **THEN** it archives in place, saves once to a new branch, and CI runs once before the merge

### Requirement: Ship merges work that needed no change

When no change record selects for the branch, `/ship` SHALL apply `/save`'s test for authoring one: for code or a plan for code, it SHALL author the change from the session and the diff, as `/save` would, then archive and merge it like any change; anything else SHALL skip the archive and merge on the gate like any change.

#### Scenario: Shipping a wiki-only pull request

- **WHEN** `/ship` runs on a branch whose only changes are wiki pages and that holds no change
- **THEN** it archives nothing and merges once the gate passes

#### Scenario: Code with no change record

- **WHEN** `/ship` runs on a branch that changes app code and holds no change
- **THEN** it writes the change from the work, archives it, and merges on the gate
