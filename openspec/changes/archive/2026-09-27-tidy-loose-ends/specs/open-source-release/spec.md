## MODIFIED Requirements

### Requirement: Each release is tagged

Each release SHALL be tagged `v<VERSION>` on its merge commit, and SHALL have a GitHub Release whose body is its changelog entry. A workflow on the default branch SHALL create them on every push, with no manual step. A release's commit SHALL be the first first-parent commit on the default branch whose `VERSION` file holds that version, not the version named in a commit title. The same run SHALL create every missing tag and Release for each version that has a `CHANGELOG.md` entry, so a skipped or failed run is filled in by the next one. A version that already has its Release SHALL be left unchanged. A changelog version with no matching `VERSION` commit SHALL fail the run and name the version. The workflow SHALL be meta-only and SHALL NOT ship in the payload.

#### Scenario: A user pins a version

- **WHEN** a user looks for release 19.0.0
- **THEN** the tag `v19.0.0` and its GitHub Release exist, and the release body is the 19.0.0 changelog entry

#### Scenario: A new version lands on the default branch

- **WHEN** a pull request that raises `VERSION` to 25.6.0 merges
- **THEN** the workflow tags the merge commit `v25.6.0` and publishes a Release titled with the 25.6.0 changelog heading, whose body is that entry

#### Scenario: Past versions have no Release

- **WHEN** the workflow runs and versions 19.0.1 through 25.5.0 have changelog entries but no Release
- **THEN** each gets a tag on the commit that first set `VERSION` to it and a Release with its entry
- **AND** `v19.0.0` and `v20.2.0`, which already have Releases, are not changed

#### Scenario: A commit title names the wrong version

- **WHEN** a commit titled `(v24.0.3)` sets `VERSION` to 25.2.1
- **THEN** the tag `v25.2.1` goes on that commit, and no `v24.0.3` tag is created

#### Scenario: A changelog version never reached VERSION

- **WHEN** `CHANGELOG.md` has an entry for a version that no commit on the default branch set in `VERSION`
- **THEN** the run fails and names that version, after creating the Releases it could
