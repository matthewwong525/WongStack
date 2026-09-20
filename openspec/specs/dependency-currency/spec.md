# dependency-currency Specification

## Purpose

How the WongStack meta-repo keeps its own tools, generated layers, and app dependencies at their latest versions: one on-demand verb that surveys, updates, regenerates, bumps, and hands the result to the ordinary gate — scoped to this repo alone, so no target repo inherits an update policy it did not choose.

## Requirements

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

### Requirement: Updates go to latest, including majors, with CI as the only gate

The skill SHALL take dependencies to their **latest** published versions, including **major** versions. It SHALL NOT pin to the newest minor, skip a major to avoid breakage, or ask the user to approve each bump individually.

For every major-version bump it makes, the skill SHALL read that dependency's changelog, release notes, or migration guide, and SHALL apply the migration to this repo's code before handing off.

The skill SHALL define **no test harness of its own**. It SHALL NOT run a build or a suite locally as a prerequisite for handing off, and it SHALL NOT report an update as verified on its own authority. Verification SHALL be the ordinary gate: the skill hands the diff to `/save`, CI runs, and failures are fixed through the same auto-fix loop `/save` already performs. Where CI is absent, PR review is the gate, exactly as for any other change.

The skill SHALL state plainly that CI coverage is the real ceiling on what breakage gets caught, and SHALL NOT imply that a green run proves the majors are safe.

#### Scenario: A dependency has a new major

- **WHEN** the survey finds a dependency whose latest version is a major ahead of the installed one
- **THEN** the skill bumps to that latest major
- **AND** it reads that release's migration notes and applies the required changes to this repo
- **AND** it does not ask whether to skip the major

#### Scenario: CI goes red after the bump

- **WHEN** `/save` reports a failing check on the update branch
- **THEN** the skill fixes the failure through `/save`'s auto-fix loop and re-checkpoints
- **AND** it does not fall back to running the suite locally as the gate

#### Scenario: The reported confidence matches the coverage

- **WHEN** the run finishes and reports its result
- **THEN** it names CI's coverage as the limit of what was verified
- **AND** it does not claim the majors are proven safe

### Requirement: The verb is scoped to this repo and stays out of the payload

The skill SHALL be **meta-repo-only**. It SHALL NOT appear in the payload manifest, so `/wong-sync` — which copies only manifest files — SHALL never deliver it to a target repo. Its own text SHALL state this scope and the mechanism that enforces it, so a later reader does not "fix" the missing manifest entry.

Because the skill is not payload, adding or editing it SHALL NOT by itself require a `VERSION` bump or a `CHANGELOG.md` entry. This exemption applies to the skill's own files only, and never to a payload file the skill's *runs* touch.

The skill SHALL be free to reference payload doctrine that other files own — the gate, the release rules, the manifest — by link rather than by restating it.

#### Scenario: A target repo syncs

- **WHEN** `/wong-sync` runs in a repo that has WongStack installed
- **THEN** `.claude/skills/update-dependencies/` is not among the files it proposes to copy
- **AND** the target repo gains no `/update-dependencies` verb

#### Scenario: The skill's own text is edited

- **WHEN** a change edits only files under `.claude/skills/update-dependencies/`
- **THEN** no `VERSION` bump and no `CHANGELOG.md` entry are required for that edit
- **AND** the change still takes the full gate, because the files sit under `.claude/` and outside the prose allowlist

#### Scenario: A reader wonders why the manifest omits it

- **WHEN** someone reads the skill and looks for its manifest entry
- **THEN** the skill's own text explains that the omission is deliberate and is what scopes the verb to this repo

### Requirement: CLI updates check compatibility and report payload releases

After a CLI update, the skill SHALL inspect whether the commands, output fields, and schema behavior used by WongStack still satisfy the direct CLI contract. Any required payload changes SHALL follow the ordinary release rules, including version, changelog, and release checks. If no payload file changes, the skill SHALL explicitly report that no payload release is needed. The check SHALL not create a new local test gate.

#### Scenario: A CLI contract changes

- **WHEN** a CLI update changes an output field required by the workflow
- **THEN** the payload integration is adapted, the change is reported as a release, and validation follows the ordinary CI path

#### Scenario: The CLI remains compatible

- **WHEN** the CLI changes but its required contract remains compatible and no payload file changes
- **THEN** the skill reports that no payload version bump is due
