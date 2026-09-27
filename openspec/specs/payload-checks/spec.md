# payload-checks Specification

## Purpose
The meta-only workflow that checks WongStack's own payload on every commit: the OpenSpec CLI contract, review assembly, migration fixtures, payload links, and OpenSpec config. It stays outside the payload manifest.

## Requirements

### Requirement: Payload checks run once per commit

The meta-repo SHALL run its payload checks in a workflow outside the payload manifest, so no target receives it. The workflow SHALL carry the same event condition and event-keyed concurrency group the test workflow uses, so one commit produces one run: the `push` event runs the job, a same-repo `pull_request` event skips it, and a fork `pull_request` event runs it. A run for one event SHALL NOT cancel a run for the other.

#### Scenario: A same-repo pull-request commit runs the checks once

- **WHEN** a commit is pushed to a branch of this repo that has an open pull request
- **THEN** the `push` run executes the checks
- **AND** the `pull_request` run is skipped, not cancelled and not failed

#### Scenario: A fork pull request still runs the checks

- **WHEN** a pull request from a fork updates
- **THEN** the `pull_request` run executes the checks

#### Scenario: A target receives no payload workflow

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** the payload checks workflow is not among the files it receives

### Requirement: The link check rejects links through a symlink

The payload link check SHALL fail when a live Markdown link's path passes through a symbolic link in the git tree. The failure SHALL name the file, the link, and the real path to use. Code spans and shell commands SHALL NOT be checked by this rule.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the link check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: A command names `.claude/`

- **WHEN** a skill's shell command runs `.claude/skills/memory/scripts/memory.mjs`
- **THEN** the link check does not report it

### Requirement: The retired-names check fails on a removed name

The payload checks SHALL include a retired-names check. A list kept beside the check SHALL name each removed or renamed thing, its replacement, and the files allowed to keep naming it. The check SHALL fail when any tracked file names a listed thing outside its allowed files, and each failure SHALL name the file, the line, the retired name, and its replacement. `CHANGELOG.md` and `openspec/changes/**` SHALL be exempt, because they record history. The check and its list SHALL be meta-repo only and SHALL NOT be in the payload manifest. Removing or renaming a payload feature SHALL add its old name to the list in the same change.

#### Scenario: A live file names a removed thing

- **WHEN** a skill page mentions a command the list retires
- **THEN** the check fails, naming the file, the line, the retired command, and its replacement

#### Scenario: An allowed file keeps its mention

- **WHEN** a spec listed as allowed for a retired name states that the removed command must stay gone
- **THEN** the check passes for that file

#### Scenario: History is exempt

- **WHEN** `CHANGELOG.md` or an archived change names a retired thing
- **THEN** the check passes

#### Scenario: A target receives no retired-names check

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** neither the check nor its list is among the files it receives
