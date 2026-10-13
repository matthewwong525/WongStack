## MODIFIED Requirements

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, changes a check's settings, or changes the steps or expectations of a kept check or removes one, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file and every file of a shared workflow action SHALL count as a check's settings. A kept check SHALL NOT be flagged when the branch adds it, moves it unchanged, changes only its recording details, or rewrites or removes the promise it points at. Its failure SHALL name each unexplained file and how to pass.

#### Scenario: A skip with no reason

- **WHEN** a branch adds a mutation-testing skip comment to a source file with no `Check:` bullet naming it
- **THEN** the check fails and names the file

#### Scenario: A recorded reason passes

- **WHEN** the Decision log adds a `Check:` bullet naming that file
- **THEN** the check passes and lists the file as explained

#### Scenario: A workflow other than the test workflow

- **WHEN** a branch removes a lint step from the payload workflow with no `Check:` bullet naming it
- **THEN** the check fails and names that workflow file

#### Scenario: A kept check loses an expectation

- **WHEN** a branch removes one expectation from a kept check whose promise it leaves alone, with no `Check:` bullet naming the file
- **THEN** the check fails and names the kept check's file

#### Scenario: A kept check is deleted

- **WHEN** a branch deletes a kept check whose promise still stands in the specs, with no `Check:` bullet naming the file
- **THEN** the check fails and names the kept check's file

#### Scenario: A kept check follows its rewritten promise

- **WHEN** a branch rewrites a scenario's `THEN` and re-records that scenario's kept check
- **THEN** the check does not flag the kept check's file

#### Scenario: A new kept check

- **WHEN** a branch adds a kept check, or re-keeps one with the same steps and expectations
- **THEN** the check does not flag the file

#### Scenario: A shared workflow action

- **WHEN** a branch edits a file of a shared workflow action with no `Check:` bullet naming it
- **THEN** the check fails and names that file

## ADDED Requirements

### Requirement: A pull request is judged by the guard it can not edit

On a GitHub pull request, a check SHALL run the loosened-check guard from the default branch's copy against the pull request's changes, executing no file from the pull request. It SHALL fail and pass by the same rule as the test check's guard, and SHALL report its result on the pull request under its own name.

#### Scenario: A change weakens the guard

- **WHEN** a pull request edits the guard so that it flags nothing, and adds a skip comment to a source file, with no `Check:` bullet
- **THEN** the default-branch guard's check fails and names both the guard's file and the source file

#### Scenario: A change removes the guard's workflow

- **WHEN** a pull request deletes the workflow that runs the default-branch guard
- **THEN** that check still runs on the pull request, and fails naming the deleted workflow file unless a `Check:` bullet explains it

#### Scenario: A change that loosens nothing

- **WHEN** a pull request changes no check, no kept check and no check's settings
- **THEN** the default-branch guard's check passes
