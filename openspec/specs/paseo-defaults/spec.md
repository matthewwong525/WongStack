# paseo-defaults Specification

## Purpose
Gives every WongStack install the owner's Paseo starting setup: a committed project file that readies each new workspace and names things WongStack's way, and agent presets added to the machine's Paseo.

## Requirements

### Requirement: Every install ships the project's Paseo file
The payload SHALL include a root `paseo.json` whose worktree setup copies the primary worktree's secrets files into each new workspace and runs nothing else. When a target already has its own `paseo.json`, install and sync SHALL merge WongStack's entries into it, keeping every command and setting the target already has, and SHALL NOT replace the file.

#### Scenario: A fresh install
- **WHEN** setup installs WongStack into an empty folder
- **THEN** the repo has `paseo.json`, and a new Paseo workspace of it opens with its own copies of `.env` and `app/.dev.vars`

#### Scenario: A repo with its own setup step
- **WHEN** a sync reaches a repo whose `paseo.json` already runs `npm ci` on worktree setup
- **THEN** the plan keeps `npm ci` and adds the secrets copy beside it

### Requirement: Paseo names work the WongStack way
The project's `paseo.json` SHALL give Paseo instructions for workspace titles, branch names, commit messages, and pull requests that match what `/save` and `/ship` produce: plain-word titles, short topic branch names with no workflow word, one-line typed commit messages with no version number, and the Claude attribution lines.

#### Scenario: Paseo writes a commit
- **WHEN** Paseo generates a commit message in an installed repo
- **THEN** it is one line like `fix: the review page scrolls on a phone`, with no version, followed by the Claude co-author trailer

### Requirement: Setup adds the owner's agent presets without overwriting
Setup SHALL add WongStack's agent presets to the machine's Paseo configuration when Paseo is installed and configured, then ask Paseo to reload it. A preset SHALL be added only when no existing preset has its id or its name, and only when its agent's command is installed. Every other setting and every existing preset SHALL stay unchanged. With Paseo absent or not yet configured, it SHALL change nothing and say so; a failure SHALL NOT stop the install.

#### Scenario: A machine with Claude only
- **WHEN** setup runs on a machine with Paseo and `claude` but no `codex`, and no presets
- **THEN** the two Claude presets are added, the two Codex presets are skipped as not installed, and the report names both

#### Scenario: A preset the person already has
- **WHEN** the person already has a preset named *[CLAUDE] Apply / Ship* using a different model
- **THEN** that preset is left exactly as it was and is reported as kept

#### Scenario: Run twice
- **WHEN** the presets step runs a second time on the same machine
- **THEN** the configuration file is unchanged and nothing is reported as added
