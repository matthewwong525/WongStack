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
