# payload-checks Specification

## Purpose

Meta-only checks that guard WongStack's own payload on every commit: links, retired names, the OpenSpec config, the review page, and script quality.

## Requirements

### Requirement: Payload checks run once per commit and never ship

The meta-repo SHALL run its payload checks once per commit: on a push, and on a pull request only when it comes from a fork. The checks, their lists, and their test dependencies SHALL NOT be in the payload.

#### Scenario: A same-repo pull request

- **WHEN** a commit is pushed to a branch with an open pull request
- **THEN** the push run executes the checks and the pull-request run is skipped, not failed

#### Scenario: A target installs the payload

- **WHEN** `/wong-setup` or `/wong-sync` installs the payload
- **THEN** it receives no payload-check workflow, script, list, or test manifest

### Requirement: The link check catches links a target or GitHub cannot follow

This SHALL be the one requirement for payload link checks. Every internal link in a payload file SHALL resolve in a fresh install, so every page a skill cites as an owner SHALL itself ship; the check SHALL resolve links against a target's file set, not this repo, treating a path as present only when setup writes it. It SHALL fail on a live Markdown link that resolves nowhere in a target or passes through a symbolic link, naming the real path, and on a README `raw.githubusercontent.com` URL that passes through one, because GitHub returns a 404 for it. A skill that stays in the source repo SHALL have its links resolved against the source repo, heading anchors included. Code spans and commands SHALL NOT be checked.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: Setup links a renamed heading

- **WHEN** `wong-setup` links `../memory/SKILL.md#background-run` and that heading was renamed
- **THEN** the check fails and names the file and the missing anchor

#### Scenario: A link resolves only in the source

- **WHEN** a payload page links a page only WongStack's own wiki has
- **THEN** the release check fails until the example is generalized or dropped

### Requirement: A removed name stays removed

The retired-names check SHALL fail when a live file names a retired thing outside its allowed files, naming the replacement. `CHANGELOG.md` and `openspec/changes/**` SHALL be exempt. Removing or renaming a payload feature SHALL retire its old name in the same change.

#### Scenario: A live file names a retired command

- **WHEN** a skill page names a retired command
- **THEN** the check fails with the file, line, and replacement

### Requirement: A release check reads the planning config

The source repo SHALL carry a release check that fails when the OpenSpec CLI cannot read `openspec/config.yaml`.

#### Scenario: An unparseable config

- **WHEN** `openspec/config.yaml` holds a line the CLI cannot parse
- **THEN** the check fails and names the file

### Requirement: A missing test dependency fails in CI

A test that needs a dependency SHALL fail, not skip, when the dependency is missing in CI; outside CI it MAY skip and say why.

#### Scenario: A missing library in CI

- **WHEN** the page tests cannot load their DOM library in CI
- **THEN** they fail and name it

### Requirement: The review page is tested in a real browser

The payload checks SHALL drive the plan review page in a real browser: notes, drafts, drawings, touch, and phone and desktop layouts.

#### Scenario: A review-page regression

- **WHEN** a change stops a saved note from appearing in the copied request
- **THEN** the payload checks fail

### Requirement: WongStack's scripts meet a quality bar

Every JavaScript file WongStack's own tests exercise, the memory worker, the check scripts, and the mini-app router included, SHALL meet a committed coverage floor that only rises, and pass the scaffold's linter; its shell scripts SHALL pass a static shell checker at warning severity.

#### Scenario: Coverage drops

- **WHEN** a change takes script coverage below the floor
- **THEN** the checks fail and name the measured and required figures

#### Scenario: A lint error in the memory worker

- **WHEN** a change leaves an unused variable in the memory worker
- **THEN** the payload checks fail and name the file

### Requirement: Every guard is tested refusing

Each guard script, including the OpenSpec config check, SHALL have a test that asserts its refusal.

#### Scenario: A refusal is removed

- **WHEN** the CI wait's `FAILURE` branch is deleted
- **THEN** at least one payload test fails

### Requirement: Tests leave nothing behind and reach nothing live

Each payload test SHALL remove its temporary directories, pass or fail, and SHALL NOT reach a live service or depend on wall-clock time.

#### Scenario: A broken parser

- **WHEN** a script's `--help` falls through to its main path in a test
- **THEN** no command reaches Cloudflare or any other live service

### Requirement: Payload checks skip script tests on a docs-only change

When every path a branch changes is under `wiki/` or `openspec/`, the payload checks SHALL skip lint, shell checks, and the script suite, and SHALL still run the private-name scan and the release checks. Markdown anywhere else, skill text included, and a change with no base to compare SHALL run every check. The required `payload` check SHALL still report.

#### Scenario: A wiki-only branch

- **WHEN** a branch changes only a wiki page
- **THEN** the payload job skips lint, shell checks, and the script suite, and runs the private-name scan and release checks

#### Scenario: Skill text changes

- **WHEN** a branch changes only a skill's Markdown
- **THEN** the payload job runs every check

### Requirement: The release rule covers every shipped file

The meta-only release rule SHALL load for every file a target receives, as the payload file list names it, plus `VERSION` and `CHANGELOG.md`. A check SHALL fail when a listed path falls outside the rule's paths.

#### Scenario: A new payload file

- **WHEN** a change adds a path to the payload file list that no pattern in the release rule matches
- **THEN** the payload checks fail, naming the path
