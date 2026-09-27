# paseo-routines Specification

## Purpose

Let a person put any prompt or verb on a recurring Paseo schedule from chat, with runs kept off their own checkout.

## Requirements

### Requirement: Create a routine from a plain request

`/routine` SHALL turn a cadence in the person's words into a five-field cron schedule for any prompt, show the name, cron, timezone, and prompt before creating it, and report the next run time.

#### Scenario: A weekday routine

- **WHEN** the person runs `/routine every weekday at 9am: /improve`
- **THEN** one schedule exists with cron `0 9 * * 1-5` and prompt `/improve`, and the reply gives its next run

### Requirement: Runs start in their own worktree

Each run SHALL start a new agent in its own Paseo worktree of the primary worktree, in the full-permission mode of the agent that made it, with the prompt exactly as written. The run's agent SHALL be kept, so a pending question stays answerable. A schedule whose runs would start in the primary checkout SHALL NOT be created.

#### Scenario: A run asks a question

- **WHEN** a scheduled run asks the person something
- **THEN** its agent stays open in Paseo with the question pending

### Requirement: Manage this repo's routines

`/routine` with no argument SHALL list this repo's schedules with cadence, status, next run, and last result, and SHALL pause, resume, run, change, or delete one by name or id. Schedules for other directories SHALL NOT be listed or changed.

#### Scenario: An ambiguous name

- **WHEN** a name matches more than one routine
- **THEN** nothing changes and the reply lists the matching ids

### Requirement: No Paseo, no change

When Paseo is not installed, its daemon does not answer, or its client can no longer set isolation, `/routine` SHALL change nothing, say which, and give the steps to create the routine later.

#### Scenario: Paseo not installed

- **WHEN** `/routine` runs where `paseo` is not on PATH
- **THEN** nothing is created and the reply says so and how to create it later
