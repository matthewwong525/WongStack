## MODIFIED Requirements

### Requirement: The walk is throwaway and saves nothing

The walk SHALL leave the repository working tree exactly as it found it. It SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, a dependency entry, or any other artifact inside the repo — including the tool it installs, which is installed at the machine level for this reason.

Journey definitions and captured evidence SHALL be written outside the repository working tree and deleted when the run ends.

The run SHALL capture evidence after each step, matched to the probe: a screenshot for a browser step, the request and response for a request-probe step, the command and its output for a state-probe step. Full-page and annotated capture SHALL be available where they make browser evidence clearer. **No video SHALL be required or claimed**: the evidence is the captures and the written record, and the report SHALL NOT reference a recording that does not exist.

The journey definitions SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

Cleanup SHALL remove only a run directory the walk could have created: an existing directory directly inside the system temp directory, whose name starts with the walk's run prefix, after resolving `..` segments and symbolic links. It SHALL refuse any other path, remove nothing, and exit non-zero.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no journey definition, screenshot, or dependency entry remains under the repository root

#### Scenario: Installing the tool leaves the repo untouched

- **WHEN** a walk installs the browser tool because the machine lacked it
- **THEN** the working tree is still unchanged
- **AND** the install is reported as a machine change, not a repo change

#### Scenario: Evidence is captured per step

- **WHEN** a browser journey of four steps is walked
- **THEN** four screenshots exist for that journey in the run's temporary directory
- **AND** no video file is expected or reported as missing

#### Scenario: Non-browser evidence is captured

- **WHEN** a request probe of three steps runs
- **THEN** the run's temporary directory holds the request and response for each step
- **AND** nothing is written inside the repository working tree

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

#### Scenario: Cleanup refuses a path it did not make

- **WHEN** cleanup is given `$HOME/wong-verify-x`, or a temp-directory path that climbs out with `..`
- **THEN** it removes nothing and exits non-zero
