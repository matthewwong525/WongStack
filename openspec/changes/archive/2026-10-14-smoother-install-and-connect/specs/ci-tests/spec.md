## MODIFIED Requirements

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, changes a check's settings, or changes the steps or expectations of a kept check or removes one, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file and every file of a shared workflow action SHALL count as a check's settings. A kept check SHALL NOT be flagged when the branch adds it, moves it unchanged, changes only its recording details, or rewrites or removes the promise it points at. A branch whose base holds no files SHALL pass with a line saying there was nothing to loosen. The run on uncommitted work SHALL read only regular files, skipping links and folders, and SHALL print no Git error for a file that is new. Its failure SHALL name each unexplained file and how to pass.

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

#### Scenario: A new install's first change

- **WHEN** a branch adds every settings file onto an empty first commit
- **THEN** the check passes, says there was nothing to loosen, and asks for no reason

#### Scenario: Uncommitted work with folder links

- **WHEN** the check runs on uncommitted work that holds a new `.claude` link to a folder and new settings files
- **THEN** it reads past the link, prints no Git error, and reports only real findings
