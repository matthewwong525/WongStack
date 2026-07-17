# install-onboarding Specification

## Purpose
How the `install-wong-stack` skill welcomes a newcomer — someone who may have never used Claude Code or a terminal. It bootstraps from zero (no repo/git/GitHub), narrates setup in plain language one thing at a time, ends by handing over a concrete first command, and is fronted by a warm one-paste README door.

## Requirements
### Requirement: Bootstrap from zero

The `install-wong-stack` skill SHALL treat "no git repository yet" (an empty or non-repo folder) as a first-class, supported starting point, and SHALL NOT assume the user is already inside a git repo. When no repo exists, it SHALL offer, in plain language and only after confirmation, to create one and continue the install — never failing or dead-ending the newcomer.

#### Scenario: Empty folder, never touched git

- **WHEN** the skill runs in a folder with no `.git` and the user has never used git
- **THEN** it explains in plain language that it will set up a repo for them, offers to run `git init` (and an initial commit), and — only on confirmation — proceeds into the rest of the install

#### Scenario: Already in a repo

- **WHEN** the skill runs inside an existing git repo
- **THEN** it skips the bootstrap-from-zero path and proceeds as before, without asking repo-creation questions

### Requirement: Plain-language, one-thing-at-a-time narration

The skill SHALL present its newcomer-facing setup (GitHub readiness and fresh-install questions) as a guided conversation that explains *why* each piece is needed and asks about one thing at a time, rather than presenting a wall of tool checks at once. It SHALL open a fresh install with a short human-facing preamble stating what it is about to set up before it begins changing anything. The underlying procedural steps and checks SHALL remain intact and precise for Claude to execute.

#### Scenario: GitHub not yet set up

- **WHEN** the newcomer lacks `gh`, auth, or a remote
- **THEN** the skill introduces each missing piece with a one-line plain-language reason, offers to handle it, and waits — rather than listing all gaps as raw tool-check output

#### Scenario: Install preamble

- **WHEN** a fresh install begins
- **THEN** before any change is made, the skill tells the user in plain language what it is about to set up and confirms readiness

#### Scenario: Checks preserved

- **WHEN** the friendlier narration is applied
- **THEN** every existing readiness check and install step still runs; only the human-facing framing changes

### Requirement: End with a real first step

On successful install, the skill SHALL end by handing the user a concrete first command to run (e.g. a suggested `/plan ...`) so a newcomer knows exactly how to get started, rather than only reporting what was installed.

#### Scenario: Install completes

- **WHEN** the install finishes successfully
- **THEN** the closing report includes an explicit, copy-pasteable first command the user can run next

### Requirement: Warm one-paste front door

The README SHALL present a short, warm, beginner-friendly paste-able install prompt that keeps the URL-read mechanism (so the README never drifts from the installer runbook), and SHALL point newcomers to Claude Code's web/desktop version at claude.ai/code as the least terminal-intensive way to run that first paste.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to Claude Code reads the install section
- **THEN** they find one short warm prompt to paste that reads+follows the installer URL, plus a pointer to claude.ai/code for running it without a heavy terminal setup
