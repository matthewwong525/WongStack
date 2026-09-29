## MODIFIED Requirements

### Requirement: An on-demand verb updates this repo to latest

The source repo SHALL have an `/update-dependencies` verb that, only when asked, surveys and updates the OpenSpec CLI, the browser CLI, `gh`, `git`, `node`, the app's dependencies, and WongStack's own test tools to their latest versions, including majors with their migration notes applied, and hands a nonempty diff to `/save`. One script SHALL do the survey and every mechanical update, the same way each run; the agent SHALL watch its output and do only the migration, contract, and CI work. A failed step SHALL stop the script and name what broke, and running it again SHALL skip what is already current. Every place that names the OpenSpec version SHALL move together, and a test SHALL fail when two of them disagree. It SHALL NOT run on a schedule, run a local test suite as the gate, or claim a green CI run proves every major safe.

#### Scenario: Nothing is out of date

- **WHEN** every surveyed tool and dependency is current
- **THEN** the verb reports them current, changes no file, and does not call `/save`

#### Scenario: A dependency has a new major

- **WHEN** a dependency's latest version is a major ahead
- **THEN** the script bumps to it and names it as a major, the agent applies the migration notes, and CI verifies

#### Scenario: A step fails

- **WHEN** a package install fails partway through the update
- **THEN** the script stops at that step and names it, and after the agent's fix a second run finishes without redoing the finished steps

#### Scenario: One OpenSpec pin is missed

- **WHEN** an update moves the OpenSpec version in CI but not in the contributing guide
- **THEN** the checks fail and name the file that still holds the old version
