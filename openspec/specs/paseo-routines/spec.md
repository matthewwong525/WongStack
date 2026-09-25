# paseo-routines Specification

## Purpose

Lets a user put any prompt or WongStack verb on a recurring Paseo schedule from chat, with isolation and permission defaults that keep scheduled runs off the user's own checkout.

## Requirements

### Requirement: Create a routine from a plain-language request
The `/routine` skill SHALL accept a cadence and a prompt in the user's own words, convert the cadence to a five-field cron expression, and create one Paseo schedule for the prompt. It SHALL accept any prompt or verb. Before it creates the schedule, it SHALL show the name, the cron expression, the timezone, and the prompt. After creation, it SHALL report the next run time that the Paseo daemon returns.

#### Scenario: Weekday improve routine
- **WHEN** the user runs `/routine every weekday at 9am: /improve` in a repo with a running Paseo daemon
- **THEN** one schedule exists with cron `0 9 * * 1-5`, prompt `/improve`, and the stated or host timezone, and the reply states its next run time

#### Scenario: Invalid cron
- **WHEN** the resolved cadence is not a valid five-field cron expression
- **THEN** no schedule is created and the reply names the invalid field

### Requirement: Fixed run defaults
Each routine SHALL start a new agent in a Paseo worktree of the repo's primary worktree. It SHALL use the full-permission mode of the agent that ran `/routine`: `bypassPermissions` for Claude or `full-access` for Codex. The prompt SHALL be stored exactly as the user wrote it, with no added unattended wording. The run's agent SHALL NOT be archived when the run ends, so a pending question stays answerable in Paseo. The model SHALL be Paseo's default unless the user names one.

#### Scenario: Routine made from a feature worktree
- **WHEN** the user runs `/routine` from a linked worktree of the repo
- **THEN** the schedule's working directory is the primary worktree and its isolation is `worktree`

#### Scenario: Run needs an answer
- **WHEN** a scheduled run asks the user a question
- **THEN** the run's agent stays open in Paseo with the question pending

### Requirement: Never run in the primary checkout
The skill SHALL NOT create a schedule whose runs start directly in the primary checkout. If worktree isolation cannot be set, it SHALL create nothing and SHALL give the steps to create the schedule in the Paseo app.

#### Scenario: Paseo client changed
- **WHEN** the installed Paseo CLI no longer provides the daemon client that the skill uses to set isolation
- **THEN** no schedule is created, and the reply gives the Paseo app steps with the same cadence, prompt, and defaults

### Requirement: Manage this repo's routines
`/routine` with no argument SHALL list the Paseo schedules whose working directory is this repo's primary worktree, with name, cadence, status, next run, and the last run's result. The skill SHALL pause, resume, run once, show logs for, change the cadence or prompt of, and delete one routine, identified by name or id. Schedules for other directories SHALL NOT be listed or changed.

#### Scenario: List hides other repos
- **WHEN** the daemon has schedules for this repo and for another directory
- **THEN** the list shows only this repo's schedules

#### Scenario: Ambiguous name
- **WHEN** a name matches more than one of this repo's routines
- **THEN** nothing changes and the reply lists the matching ids

### Requirement: No Paseo, no change
When the `paseo` command is not installed or its daemon does not answer, the skill SHALL change nothing, SHALL say which of the two is the cause, and SHALL print the `/routine` script command that would create the routine once Paseo answers, with the Paseo app steps.

#### Scenario: Paseo not installed
- **WHEN** `/routine` runs on a host without `paseo` on PATH
- **THEN** no schedule is created and the reply says Paseo is not installed and shows the command to run later
