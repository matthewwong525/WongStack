# dependency-currency Specification

## Purpose

How the WongStack meta-repo keeps its own tools, generated layers, and app dependencies at their latest versions: one on-demand verb that surveys, updates, regenerates, bumps, and hands the result to the ordinary gate — scoped to this repo alone, so no target repo inherits an update policy it did not choose.

## Requirements

### Requirement: An on-demand verb brings this repo's dependencies to latest

The repository SHALL provide a skill at `.claude/skills/update-dependencies/`, invoked as `/update-dependencies`, that performs one complete update pass over this repo's toolchain and dependencies. It SHALL run only when a user invokes it. It SHALL NOT install itself on a schedule, register a cron entry, or arrange any recurring execution.

The pass SHALL cover, in order:

1. **Survey** — report installed version against latest available for: the OpenSpec CLI, the browser automation CLI `/walk` drives, `gh`, `git`, `node`, every dependency in `app/package.json`, and the generated `openspec-*` skill layer.
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

### Requirement: Regeneration is followed by a ripple check that flags a release

After regenerating the OpenSpec-generated layer, the skill SHALL check what the regeneration changed beyond the generated files themselves: the number and names of generated skills and commands, the entries in the payload manifest, and any payload page that cites those names or counts.

When the run changes any payload file, the skill SHALL flag that the run **is a release** and SHALL carry out the release rules that apply to it — a `VERSION` bump, a newest-first `CHANGELOG.md` entry, and the payload link check — rather than leaving the payload edited without them.

When the run changes no payload file, the skill SHALL say so explicitly, so the absence of a version bump is a stated conclusion rather than an oversight.

#### Scenario: A CLI upgrade adds a generated skill

- **WHEN** regeneration produces a generated skill or command that did not exist before
- **THEN** the skill reports the new name
- **AND** it checks the payload manifest and every payload page that lists those names or counts
- **AND** it flags the run as a release and performs the release steps

#### Scenario: A regeneration changes only generated files

- **WHEN** regeneration rewrites generated files but no payload file changes
- **THEN** the skill states that the run is not a release and that no `VERSION` bump is due

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
