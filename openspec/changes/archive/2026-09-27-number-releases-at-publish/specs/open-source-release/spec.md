## MODIFIED Requirements

### Requirement: Each release is tagged

Each version SHALL get a `v<VERSION>` tag on the first default-branch commit that set it and a GitHub Release carrying its changelog entry, created automatically, filling any missed version. A Release another run already created SHALL count as done, never as a failure. When GitHub refuses the workflow's token, the run SHALL warn and pass, and the person who merged SHALL create the missing Release with their own login. A changelog version no commit set, or an unnumbered entry on the default branch, SHALL fail the run.

#### Scenario: A new version merges

- **WHEN** a pull request raising `VERSION` to 25.7.0 merges
- **THEN** the merge commit is tagged `v25.7.0` and a Release carries the 25.7.0 entry

#### Scenario: GitHub refuses the workflow

- **WHEN** GitHub answers HTTP 403 for a release that changes a workflow file
- **THEN** the run warns and passes, and the person who merged creates it with their own login

## ADDED Requirements

### Requirement: A release is numbered when it publishes

A change to WongStack's payload SHALL describe itself in `CHANGELOG.md` under a `## Next` entry that names its bump level, and SHALL leave `VERSION` alone. `/ship` SHALL set `VERSION` and the entry's heading from the default branch's current version right before it merges, and SHALL NOT merge a release whose number another release took meanwhile; it renumbers and saves again instead. The merged commit's title SHALL name the version that shipped. A repo with no `## Next` entry SHALL publish exactly as before.

#### Scenario: Two changes are in flight

- **WHEN** a minor change and a patch change both wait on a default branch at 26.1.0, and the minor one publishes first
- **THEN** it ships as 26.2.0 with a title naming `v26.2.0`, and the patch one ships as 26.2.1, never as a second 26.1.1

#### Scenario: Another release lands during the checks

- **WHEN** a release numbered 26.2.0 is about to merge and the default branch has meanwhile reached 26.2.0
- **THEN** the merge stops, the change is renumbered from 26.2.0 and saved again, and only then merges
