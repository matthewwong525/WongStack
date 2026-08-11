## MODIFIED Requirements

### Requirement: An on-demand verb brings this repo's dependencies to latest

The repository SHALL provide a skill at `.claude/skills/update-dependencies/`, invoked as `/update-dependencies`, that performs one complete update pass over this repo's toolchain and dependencies. It SHALL run only when a user invokes it. It SHALL NOT install itself on a schedule, register a cron entry, or arrange any recurring execution.

The pass SHALL cover, in order:

1. **Survey** — report installed version against latest available for: the OpenSpec CLI, the browser automation CLI `/verify` drives, `gh`, `git`, `node`, every dependency in `app/package.json`, and the generated `openspec-*` skill layer.
2. **Machine** — update the machine's tools to latest and report each as `old → new`.
3. **Regen** — regenerate the OpenSpec-generated layer, then check what rippled.
4. **Deps** — bump `app/` to latest, majors included, reading each major's changelog and fixing what breaks.
5. **Hand off** — hand the diff to `/save` and let the gate decide.

A stage with nothing to do SHALL be reported as up to date rather than silently omitted, so the run's output is a complete picture of currency whether or not anything changed.

#### Scenario: A run with nothing out of date

- **WHEN** `/update-dependencies` runs and every surveyed tool and dependency is already at latest
- **THEN** it reports each one as current
- **AND** it changes no file and does not invoke `/save`

#### Scenario: The user asks for a scheduled run

- **WHEN** a user asks for this verb to run automatically on an interval
- **THEN** the skill states that scheduling is not part of it and the verb is invoked on demand
