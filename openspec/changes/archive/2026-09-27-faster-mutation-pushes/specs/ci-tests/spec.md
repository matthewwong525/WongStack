## MODIFIED Requirements

### Requirement: Mutation results carry between runs

When the suite uses Stryker, the test check SHALL reuse the newest saved results from its branch, else the default branch, and SHALL save them even when the suite fails. A dependency or test-config change SHALL NOT discard saved results, and a cache error SHALL NOT fail the check.

#### Scenario: A second push reuses results

- **WHEN** a branch pushes a second commit changing one source file
- **THEN** Stryker reuses the earlier results and tests only the rest

#### Scenario: A dependency update reuses results

- **WHEN** a push changes only the suite's lockfile
- **THEN** Stryker reuses the saved results instead of testing every mutant

## ADDED Requirements

### Requirement: A nightly run re-tests every mutant

When the suite uses Stryker, the test check SHALL run once a day on the default branch with no saved results, test every mutant, and save its results for later pushes. No push SHALL wait on it, and `/ship` SHALL NOT merge while the default branch's newest nightly run is red.

#### Scenario: The nightly run finds a weak test

- **WHEN** the nightly run finds a mutant no test kills
- **THEN** that run fails, and the next push that reuses its results fails until a test kills the mutant

#### Scenario: Publishing after a red nightly run

- **WHEN** `/ship` starts while the nightly run on the default branch's head commit is red
- **THEN** it stops before merging and says the nightly check found a weak test to fix first
