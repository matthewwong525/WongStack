# Spec Delta

## MODIFIED Requirements

### Requirement: Nothing builds locally as a gate

No skill SHALL make a local compile, test run, lint, or type-check a condition of `/save` or `/ship`; the gate's test suites run in CI (`ci-tests`), and a local result SHALL NOT be reported as the gate's result. `/apply`'s preview from the agent host SHALL gate nothing and SHALL NOT deploy production.

#### Scenario: A host preview exists

- **WHEN** `/apply` uploaded a preview from the host and the person publishes the change
- **THEN** `/ship` still saves, waits on the gate, and merges on its result
- **AND** production deploys from CI on the default branch

## ADDED Requirements

### Requirement: A finished build is checked locally where the tools exist

Where the machine has the repo's tools, a finished build SHALL run, once and before the first push, the checks CI would run for the kinds of file the change touches, and SHALL repair what fails within the existing repair limits. A machine without the tools SHALL skip the run, say so in one line, and continue. Local runs on one machine SHALL take turns. The report SHALL name the run as local.

#### Scenario: A test fails before the first push

- **WHEN** a finished build's change fails one of its own tests on a machine that has the tools
- **THEN** the failure is repaired before the first push, and the report says the local checks passed, apart from the gate's result

#### Scenario: The machine has no tools

- **WHEN** the repo's tools are not installed and can not be installed
- **THEN** the build says in one line that nothing ran locally, and `/save` and `/ship` proceed on the gate alone

### Requirement: Delivery's mechanical steps run as single commands

Once the files are staged, a `/save` checkpoint's commit, push, pull-request update, check wait, and preview lookup SHALL run as one command. `/ship`'s preparation (archive, release number, sync with the default branch) and its finish (merge, secret promotion, live look) SHALL each run as one command. Each command's output SHALL state the result and the next action, and a failed gate's output SHALL name every failing check with the cause its log shows. Results, attempt caps, and refusals SHALL stay as they are.

#### Scenario: An ordinary save

- **WHEN** `/save` checkpoints staged work on a branch with an open pull request
- **THEN** one command returns the gate result, the preview, and the saved revision

#### Scenario: A check fails

- **WHEN** the pushed commit fails two checks
- **THEN** the same command's output lists both with their causes and the next action, with no separate log lookup before the diagnosis
