## MODIFIED Requirements

### Requirement: An on-demand verb brings this repo's dependencies to latest

The repo SHALL provide the meta-only update-dependencies skill for a complete on-demand toolchain and dependency update. It SHALL not schedule itself. The pass SHALL survey the OpenSpec CLI, browser CLI, gh, git, node, and app dependencies; update the machine tools; check the direct OpenSpec CLI contract; update app dependencies including majors with their migration notes; and hand the result to the ordinary checkpoint. It SHALL not regenerate OpenSpec agent skills or apply a visibility patch.

A stage with nothing to do SHALL be reported as current. The existing major-update policy and CI delivery gate SHALL remain unchanged.

#### Scenario: A run with nothing out of date

- **WHEN** every surveyed tool and dependency is current
- **THEN** the skill reports them as current, changes no file, and does not invoke save

#### Scenario: The user asks for a scheduled run

- **WHEN** a user asks for automatic updates on an interval
- **THEN** the skill states that it is an on-demand operation

#### Scenario: The CLI is upgraded

- **WHEN** an update installs a newer OpenSpec CLI
- **THEN** the direct CLI contract is checked without generating an agent workflow layer

## REMOVED Requirements

### Requirement: Regeneration is followed by a ripple check that flags a release

**Reason:** The generated layer is retired, so generation and skill-name ripple checks no longer apply.
**Migration:** Use the direct CLI compatibility and payload-release check below.

## ADDED Requirements

### Requirement: CLI updates check compatibility and report payload releases

After a CLI update, the skill SHALL inspect whether the commands, output fields, and schema behavior used by WongStack still satisfy the direct CLI contract. Any required payload changes SHALL follow the ordinary release rules, including version, changelog, and release checks. If no payload file changes, the skill SHALL explicitly report that no payload release is needed. The check SHALL not create a new local test gate.

#### Scenario: A CLI contract changes

- **WHEN** a CLI update changes an output field required by the workflow
- **THEN** the payload integration is adapted, the change is reported as a release, and validation follows the ordinary CI path

#### Scenario: The CLI remains compatible

- **WHEN** the CLI changes but its required contract remains compatible and no payload file changes
- **THEN** the skill reports that no payload version bump is due
