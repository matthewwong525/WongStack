## MODIFIED Requirements

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping.

**The boundary is building versus exercising.** Driving a browser against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`ship-walkthrough`) is therefore permitted as a `/ship` gate, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only after CI has published the build it walks, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it.

The gate ladder is: **CI when present → the walkthrough when adopted → merge.** Each rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo's `/ship` runs the staging walkthrough
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI but has not adopted the walkthrough
- **THEN** `/ship` merges on green CI alone, reporting no gap
