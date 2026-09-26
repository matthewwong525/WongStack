## ADDED Requirements

### Requirement: The test workflow keeps mutation results between runs

When the discovered suite has a Stryker config, `.github/workflows/test.yml` SHALL restore Stryker's incremental result file before it runs `npm test`, and SHALL save the file after it, also when `npm test` fails. A run SHALL restore the newest file saved on its own branch, else the newest file saved on the default branch.

The cache key SHALL hold a hash of the suite's lockfile, Stryker config, and Vitest config. A run whose hash matches no saved file SHALL start with no file, so a dependency or test-config change tests every mutant.

A suite with no Stryker config SHALL run as before: no restore step, no save step, and no new failure mode. The steps SHALL NOT change `npm test` or the check name, and a cache miss or a cache service error SHALL NOT fail the job.

#### Scenario: A later push on a branch reuses its own results

- **WHEN** a branch pushes a second commit that changes one source file, and its first run saved a result file
- **THEN** the second run restores that file before `npm test`
- **AND** Stryker reports reused mutants and tests only the rest

#### Scenario: A new branch starts from the default branch

- **WHEN** the first run on a new branch finds no file saved on that branch, and the default branch has one with the same key hash
- **THEN** the run restores the default branch's newest file

#### Scenario: A dependency change tests every mutant

- **WHEN** a push changes the suite's lockfile, Stryker config, or Vitest config
- **THEN** the run restores no file and Stryker tests every mutant
- **AND** the run saves a new file under the new hash

#### Scenario: A failed run still saves its results

- **WHEN** `npm test` fails after Stryker wrote the result file
- **THEN** the workflow saves the file
- **AND** the check stays red

#### Scenario: A repo without Stryker is unchanged

- **WHEN** the discovered suite has no Stryker config
- **THEN** the workflow runs no cache step, and the job runs `npm test` as before
