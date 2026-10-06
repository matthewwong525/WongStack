## MODIFIED Requirements

### Requirement: A finished build is checked locally where the tools exist

Where the machine has the repo's tools, a finished build SHALL run, once and before the first push, the checks CI would run for the kinds of file the change touches, and SHALL repair what fails within the existing repair limits. When `/ship`'s preparation merges the default branch into the branch, it SHALL run the same checks once more before the checkpoint and SHALL state their result and the next action; a failure SHALL be repaired before the checkpoint within the same limits. A preparation that merges nothing SHALL run no local check. A local result SHALL NOT stop a save or a publish. A machine without the tools SHALL skip the run, say so in one line, and continue. Local runs on one machine SHALL take turns. The report SHALL name the run as local.

#### Scenario: A test fails before the first push

- **WHEN** a finished build's change fails one of its own tests on a machine that has the tools
- **THEN** the failure is repaired before the first push, and the report says the local checks passed, apart from the gate's result

#### Scenario: The machine has no tools

- **WHEN** the repo's tools are not installed and can not be installed
- **THEN** the build says in one line that nothing ran locally, and `/save` and `/ship` proceed on the gate alone

#### Scenario: The default branch brings a failure in

- **WHEN** `/ship`'s preparation merges the default branch in and a check then fails on this machine
- **THEN** the preparation's output names the failed checks and a repair as the next action, and the checkpoint follows the repair

#### Scenario: Nothing is merged in

- **WHEN** `/ship`'s preparation finds the branch already holds the default branch
- **THEN** it runs no local check and its output is as before
