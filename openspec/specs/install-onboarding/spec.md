# install-onboarding Specification

## Purpose

Adopt WongStack through the normal workflow skills, using current source skills when a new target has no installed workflow yet.
## Requirements
### Requirement: install-wong-stack is removed outright

The `install-wong-stack` skill SHALL be deleted — directory and all live references (README, payload manifest, wong-sync, docs, legacy-trace lists) — with no tombstone or migration machinery, since no installed base exists. Historical CHANGELOG entries SHALL keep the old name as the release record.

#### Scenario: No trace in the tree

- **WHEN** the payload ships at 6.0.0
- **THEN** `.claude/skills/install-wong-stack/` does not exist and the only remaining mentions of the name are historical CHANGELOG entries and archived changes

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The URL SHALL name the file's real path in the git tree, `.agents/skills/wong-setup/SKILL.md`, not a path through the `.claude` link. The prompt and surrounding copy SHALL frame WongStack as an agent-agnostic, repo-native AI knowledge center that centralizes process and captures knowledge through work. The README SHALL tell the user to start in an empty folder, and SHALL name a Cloudflare account and one user token as requirements. The README SHALL mention Claude Code as an easy place to run the prompt while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup creates a knowledge-centered workflow in an empty folder and needs a Cloudflare account

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions

### Requirement: The paste-to-running-app path is documented for the person walking it

The payload SHALL carry a short, human-facing account of the whole path — what the user does, in order, and what they get at each stage — distinct from the agent-facing provisioning runbook. It SHALL be written for someone non-technical: numbered actions, plain language, no assumed vocabulary. It SHALL state honestly which steps are irreducibly manual (Cloudflare signup, creating the first token, and the `gh` browser login) and SHALL NOT imply that steps requiring a human are automated.

This document SHALL be the reference the end-to-end fresh-repo test is run against, so that a step which reads clearly but plays badly is caught.

#### Scenario: A newcomer reads before starting

- **WHEN** someone who has never used the toolkit reads the walkthrough
- **THEN** they can tell how many things they personally have to do, what each one is, and roughly how long it takes
- **AND** every step that requires leaving the agent for a browser is called out as such

#### Scenario: The walkthrough matches the tested reality

- **WHEN** the end-to-end fresh-repo test runs
- **THEN** it follows this walkthrough as written
- **AND** any divergence found is corrected in the walkthrough rather than left as tribal knowledge

### Requirement: The default branch is main unless the repo says otherwise

The skills SHALL treat `main` as the default branch, and SHALL determine it another
way only where `main` does not exist.

`/save` and `/ship` currently instruct the agent to substitute *"whatever
`git symbolic-ref refs/remotes/origin/HEAD` resolves to"*. That command fails with
`not a symbolic ref` on a freshly created repo — `gh repo create --push` does not
record the head — so the documented setup path produces a repo where the documented
first command errors.

Detection also solves a problem this toolkit doesn't have: setup runs
`git init -b main`, and `gh repo create` adopts the local branch, so every repo it
creates is on `main`. The fallback exists for a pre-existing repo on `master` or
another name, which is the only case where the question is real.

#### Scenario: Repo created by the setup

- **WHEN** any verb needs the default branch in a repo setup created
- **THEN** it uses `main` without running a detection command

#### Scenario: Pre-existing repo on another default

- **WHEN** `main` does not exist in the repo
- **THEN** the actual default is resolved and used, and the resolution is not assumed to succeed silently

### Requirement: Setup enters the normal workflow

`/wong-setup` SHALL obtain current WongStack source and invoke `/explore` with the intent to adopt WongStack in the target repo. It SHALL use local workflow skills where present and source skills where absent, resolving source references in the source checkout while keeping all planned work scoped to the target. It SHALL delegate later stages to the normal skills according to user intent.

#### Scenario: New repo without installed skills
- **WHEN** the user asks to evaluate WongStack in a target without workflow skills
- **THEN** setup invokes the source `/explore` skill against the target
- **AND** no payload or seed record is written during exploration

#### Scenario: User requests installation
- **WHEN** the user has asked to install WongStack
- **THEN** setup carries that intent through `/explore`, `/plan`, `/apply`, and `/save`
- **AND** required planning tools are prepared at the point of need before the target plan is drafted

#### Scenario: Existing installation
- **WHEN** a real install record exists
- **THEN** setup invokes `/wong-sync` with the existing context

### Requirement: Installation preserves the target and records the result

The normal installation plan SHALL use the payload inventory, preserve existing repo content, include required wiki hubs and environment ignore rules, and record the completed install version and commit. Git and GitHub work SHALL remain with `/save`, `/continue`, or `/ship`. Optional Cloudflare work SHALL use `/wong-cloudflare` when requested. Setup itself SHALL remain source-only.

#### Scenario: Empty folder
- **WHEN** the target has no repo or planning layer
- **THEN** setup prepares planning prerequisites when needed and includes target initialization in the workflow
- **AND** `/save` owns repo initialization, identity, commits, and remote setup

#### Scenario: Existing project
- **WHEN** the target already has instructions, docs, or skills
- **THEN** the plan adapts the payload to those files and preserves local content outside the agreed change
- **AND** optional hosting or scaffold components stay disabled unless selected

#### Scenario: Completed install
- **WHEN** `/apply` completes the installation tasks
- **THEN** the target has its required wiki hubs, environment ignore rules, and an install record for the implemented source
- **AND** the normal `/save` checkpoint follows

### Requirement: Setup supports the active coding agent

Setup SHALL work with any coding agent that can read skills, edit files, and run shell commands. Missing host skill invocation tools SHALL fall back to reading and following the relevant SKILL.md. The target planning home SHALL be initialized for the active agent.

#### Scenario: Non-Claude setup
- **WHEN** the user runs setup in another capable coding agent
- **THEN** source skill files provide a usable workflow and planning is configured for that agent

### Requirement: Setup provisions the memory store

The installation plan SHALL include setup's provisioning step, and SHALL install the session-start hooks and the `memory` skill. Setup SHALL ask for the Cloudflare user token before the install is planned. When no token is available, setup SHALL stop before it writes any file, and SHALL say what the token is for and where to create it. It SHALL NOT report the install as complete with memory or hosting working when no store or Worker exists.

#### Scenario: A token is available

- **WHEN** the installation tasks run with a Cloudflare user token in `.env`
- **THEN** the memory store and the app are provisioned, and the install record lists the store under `components.memory`

#### Scenario: No token yet

- **WHEN** a user starts setup without a Cloudflare token
- **THEN** setup writes nothing, and it gives the click path for the token and says that pasting it continues setup

### Requirement: Setup starts from an empty folder

`/wong-setup` SHALL install WongStack only into an empty folder, or a folder whose only entries are `.git` with no commits. For any other folder it SHALL stop before planning, write nothing, and say that setup starts from an empty folder. A folder that already has an install record SHALL still go to `/wong-sync`. The install SHALL always include the core payload, the Cloudflare pipeline, the starter app, and the UI pages, with no component question.

#### Scenario: An empty folder installs

- **WHEN** a user runs setup in an empty folder with a Cloudflare token
- **THEN** setup plans and applies the full install without asking which components to take

#### Scenario: A folder with files stops

- **WHEN** a user runs setup in a folder that has files and no install record
- **THEN** setup writes nothing and says that it starts from an empty folder

#### Scenario: An installed repo syncs

- **WHEN** a user runs setup in a repo with `.claude/.wong-stack.json`
- **THEN** setup goes to `/wong-sync`
