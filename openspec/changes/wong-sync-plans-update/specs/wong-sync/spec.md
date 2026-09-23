## MODIFIED Requirements

### Requirement: Sync enters the normal workflow with current source context

`/wong-sync` SHALL obtain the upstream default branch in a separate clean local checkout and run a deterministic preflight against the selected payload before it invokes `/plan`. When the preflight proves that the selected payload has no upstream delta from the recorded installed commit, sync SHALL report that the selected payload is current and SHALL NOT invoke `/plan` or `/explore`. When an update exists, `/plan` SHALL receive the target repo, source path, source commit, installed version when known, user intent, and the complete classified set of changed payload units. Sync SHALL preserve local work and component choices as planning inputs and SHALL leave target writes to the normal workflow. A retrieval or preflight failure SHALL be explicit and SHALL NOT be reported as current.

#### Scenario: Installed repo requests an update
- **WHEN** the preflight finds one or more changes in the payload selected for an installed repo
- **THEN** `/plan` receives the latest source context and the classified changed payload units for that update
- **AND** the entry skill writes no verdict record or payload files

#### Scenario: Selected payload is current
- **WHEN** the latest source has no change to any payload unit selected for the target since its recorded commit
- **THEN** sync reports that the selected payload is current
- **AND** it does not invoke `/plan` or `/explore` and creates no change folder

#### Scenario: Source cannot be refreshed
- **WHEN** the upstream checkout cannot be brought current
- **THEN** the skill reports the failure and does not describe cached content as the latest version or the target as current

#### Scenario: Source checkout contains local work
- **WHEN** an existing cache has local changes
- **THEN** retrieval preserves that work and uses a separate clean checkout for the preflight

#### Scenario: Preflight cannot prove a result
- **WHEN** the recorded base commit, manifest data, selected source path, or required target input cannot be read safely
- **THEN** sync reports the diagnostic and does not invoke `/plan` with an incomplete delta or report the target as current
