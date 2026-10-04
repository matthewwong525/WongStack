## MODIFIED Requirements

### Requirement: Ship checkpoints once through save

After archiving, `/ship` SHALL invoke ordinary `/save` exactly once, so the commit CI tests is the commit `/ship` merges; `/save` SHALL use the archive as the change record and SHALL NOT author a new active change. The walkthrough SHALL reuse that exact checkpoint without another save or rerun of unchanged settled checks. Uncommitted work on the default branch SHALL move to a new branch through that same save, not an earlier one, and SHALL NOT be reported as nothing to ship. A repair that changes source SHALL receive fresh exact-revision checks before publication; this SHALL NOT authorize bypassing or reinterpreting a failed or unreadable gate.

#### Scenario: A one-go ship

- **WHEN** `/ship <intent>` runs from plan to merge without a repair
- **THEN** only the save after the archive runs, CI runs once before the walk, and the walk uses that saved revision without a second checkpoint

#### Scenario: Publish from the default branch

- **WHEN** `/ship` runs on the default branch with a finished, uncommitted change
- **THEN** it archives in place, saves once to a new branch, and CI runs once before the merge
