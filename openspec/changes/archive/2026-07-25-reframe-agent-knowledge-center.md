<!-- openspec-archive v1 2026-07-25-reframe-agent-knowledge-center -->
<!-- file proposal.md utf8 2102 -->
## Why

WongStack's docs currently frame the product as a Claude Code workflow for building apps, with setup language that over-emphasizes fit assessment. The clearer thesis is that WongStack turns a repo into an agent-readable knowledge center: processes are centralized, agents run those processes, and reusable knowledge is captured as work happens.

## What Changes

- Reframe the README around a repo-native AI knowledge center instead of "building apps with Claude Code."
- Make the front door agent-agnostic: Claude Code is a supported runner, but the durable unit is repo files, instructions, process, and knowledge.
- Add wiki documentation for the WongStack philosophy: centralize processes, make them agent-runnable, capture knowledge during execution, and compound that knowledge over time.
- Update generic WongStack context so installed repos describe the wiki/OpenSpec/skills system as shared agent memory.
- Reduce public setup wording that feels like an admissions test while preserving guided setup, consent before file changes, and clear mismatch handling when setup genuinely cannot work.
- Keep the release ritual: changelog entry and semver patch bump.

Non-goals:

- No behavior changes to git, OpenSpec, `/save`, `/ship`, or `/wong-sync`.
- No replacement of OpenSpec or the progressive-disclosure wiki model.
- No claim that WongStack works without a repo, files, or an agent capable of reading and editing files.

## Capabilities

### New Capabilities

- `agent-knowledge-center`: Documents the philosophy and repo structure for WongStack as an AI knowledge center.

### Modified Capabilities

- `install-onboarding`: Reframes the README/setup front door as agent-agnostic guided onboarding and removes the requirement that the README foreground fit assessment.

## Impact

- Affected docs: `README.md`, `wiki/README.md`, new wiki philosophy page, `CLAUDE.md`, `CHANGELOG.md`, `VERSION`.
- Affected setup surfaces: `.claude/skills/wong-setup/SKILL.md` and `.claude/skills/wong-setup/references/fit-playbook.md`.
- No runtime dependencies, APIs, or build systems are affected.

<!-- end proposal.md -->
<!-- file design.md utf8 4317 -->
## Context

WongStack's strongest idea is already present in pieces: `wiki/` owns reusable process, OpenSpec owns change-specific plans and decisions, archived changes preserve what shipped, and skills give agents repeatable actions. The public docs do not yet name that system clearly. The README currently leads with app building and Claude Code, while `wong-setup` still foregrounds "fit verdict" language from the 6.0.0 front-door release.

The user wants the docs to present WongStack as the start of an AI-native operating model: centralize team processes first, let agents run those centralized processes, and capture knowledge through the work so future humans and agents move faster.

## Goals / Non-Goals

**Goals:**

- Make "repo-native AI knowledge center" the top-level public framing.
- Explain that agents need shared knowledge to function well, and WongStack gives that knowledge a home.
- Keep the docs approachable for non-technical readers by defining technical terms only after the core idea.
- Make the project agent-agnostic: Claude Code is a convenient starting point, not the product boundary.
- Add a wiki page that owns the philosophy so README and setup docs can link instead of restating it.
- Preserve setup safety: guided questions, consent before file changes, and hard-stop mismatch handling where the workflow cannot operate.

**Non-Goals:**

- Changing the actual command loop or how `/save`, `/ship`, `/continue`, OpenSpec, or git operate.
- Making WongStack a hosted service, SaaS knowledge base, or managed plugin.
- Removing Claude-specific paths where Claude Code is still the native skill host.

## Decisions

### Lead with the knowledge center, not app building

The README should start with what WongStack makes: a repo where team process, active work, shipped decisions, and reusable lessons are written in forms humans can review and agents can run. Internal apps and product work become examples of what the knowledge center helps teams do, not the definition of WongStack.

Alternative considered: keep "building apps" but add knowledge bullets. That still makes the code output sound primary, when the user's desired thesis is that the knowledge layer is the enduring value.

### Add one philosophy page under `wiki/`

The philosophy needs a stable owner because it will inform README, `CLAUDE.md`, setup, `/dream`, and future docs. A single `wiki/agent-knowledge-center.md` page keeps the thesis atomic and linked from `wiki/README.md`.

Alternative considered: fold the philosophy into `wiki/README.md`. That would overload the hub; the hub should route readers, while the philosophy page owns the explanation.

### Keep setup guided, but reduce admissions-test language

`wong-setup` should still research the repo, ask useful questions, and stop on hard mismatches. The public and runbook wording should frame that as guided onboarding and process alignment, not a product that keeps asking whether it is allowed to exist.

Alternative considered: remove all mismatch handling. That would make setup less honest when a repo has no git, no compatible forge, or a locked-in workflow the skills would fight.

### Preserve agent agnosticism with file-based language

Docs should say Claude Code is one way to run WongStack, while the durable interface is Markdown files, repo instructions, skills, and shell/file operations. Where `.claude/skills/` is still named, explain it as Claude Code's native location and offer agent pointers such as `AGENTS.md`.

Alternative considered: rename `.claude/skills/` or hide Claude references. That would misrepresent the current implementation.

## Risks / Trade-offs

- **"AI knowledge center" could sound vague** -> Pair the phrase with concrete repo surfaces: agent instructions, wiki, active changes, archived changes, and skills.
- **Less fit language could overpromise setup** -> Keep hard mismatch exits in `wong-setup`, but move them out of the README's core pitch.
- **Agent-agnostic copy could imply every agent has native skill support** -> State the practical minimum: an agent that can read files, edit files, and run shell commands.
- **New wiki philosophy could duplicate `wiki-style.md`** -> Keep `agent-knowledge-center.md` focused on why the system exists; link to `wiki-style.md` for how the wiki is structured.

<!-- end design.md -->
<!-- file tasks.md utf8 1412 -->
## 1. README

- [x] 1.1 Reframe the README opener around WongStack as a repo-native AI knowledge center.
- [x] 1.2 Update the start prompt and setup copy so it is agent-agnostic and no longer Claude Code-only.
- [x] 1.3 Replace app-building benefit language with centralized process, agent-runnable workflow, knowledge capture, and compounding context.
- [x] 1.4 Keep newcomer-friendly definitions for technical terms without making them the lead story.

## 2. Wiki

- [x] 2.1 Add `wiki/agent-knowledge-center.md` as the owning philosophy page.
- [x] 2.2 Link the new philosophy page from `wiki/README.md` without overloading the hub.

## 3. Agent Context

- [x] 3.1 Update `CLAUDE.md` source-repo description to reflect the agent-agnostic knowledge-center framing.
- [x] 3.2 Update the generic `WONG-STACK` block's context section so installed repos describe wiki/OpenSpec/skills as shared agent memory.

## 4. Setup Wording

- [x] 4.1 Reframe `.claude/skills/wong-setup/SKILL.md` from fit-first language to guided onboarding with mismatch exits.
- [x] 4.2 Update the fit playbook wording so it supports process alignment without foregrounding denial.

## 5. Release And Verification

- [x] 5.1 Update `VERSION` and `CHANGELOG.md` for the payload docs change.
- [x] 5.2 Verify OpenSpec status and validate delta specs.
- [x] 5.3 Review docs links and remaining Claude-only/app-building wording for consistency.

<!-- end tasks.md -->
<!-- file specs/agent-knowledge-center/spec.md utf8 2920 -->
## ADDED Requirements

### Requirement: WongStack documents the repo as an AI knowledge center

WongStack SHALL define itself in user-facing docs as a repo-native AI knowledge center: a system where processes, active work, shipped decisions, and reusable lessons are centralized in files that humans can review and agents can run.

#### Scenario: Reader sees the top-level thesis

- **WHEN** a reader opens the README
- **THEN** the first section frames WongStack as turning a repo into an AI knowledge center
- **AND** it explains that agents need shared process knowledge to work effectively

#### Scenario: Philosophy has an owning wiki page

- **WHEN** a reader wants more than the README pitch
- **THEN** the wiki links to a page that explains the AI knowledge center philosophy and the repo surfaces that support it

### Requirement: The philosophy maps knowledge surfaces to repo files

The knowledge-center documentation SHALL name the durable surfaces WongStack uses: agent instructions, the progressive-disclosure wiki, active OpenSpec changes, archived changes, and skills. It SHALL explain what each surface owns without duplicating operational details owned by deeper docs.

#### Scenario: Reader understands where knowledge lives

- **WHEN** a reader reviews the philosophy page
- **THEN** they can identify where reusable process, active plans, shipped records, and repeatable agent actions live in the repo

#### Scenario: Details remain linked

- **WHEN** the philosophy page names a deeper process such as the change loop or wiki structure
- **THEN** it links to the owning page instead of restating the full procedure

### Requirement: The docs present WongStack as agent-agnostic

WongStack SHALL describe Claude Code as a supported starting point, not the boundary of the system. User-facing docs SHALL state that the durable interface is repo files, instructions, and process, and that another coding agent can run WongStack when it can read files, edit files, run shell commands, and follow the skill runbooks.

#### Scenario: Non-Claude agent user reads the README

- **WHEN** a user works with Codex, Cursor, or another coding agent
- **THEN** the README does not imply WongStack is only for Claude Code
- **AND** it states the practical capabilities an agent needs to follow the workflow

### Requirement: Knowledge capture is part of execution

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and `/dream` SHALL be presented as the mechanism that lets each project leave more useful context for the next person or agent.

#### Scenario: Reader understands the compounding loop

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see the sequence: centralize the process, let agents run it, capture what happens, improve the process, and make future work faster

<!-- end specs/agent-knowledge-center/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 2692 -->
## MODIFIED Requirements

### Requirement: Honest fit verdict with a first-class not-a-fit exit

After research and any discovery, `wong-setup` SHALL guide the user through onboarding and process alignment. It SHALL stop without changing the repo when a hard playbook disqualifier holds (e.g. a non-GitHub forge, no willingness to use git, a locked-in workflow the loop would fight, no ongoing changes to manage), explain the mismatch plainly, and suggest an alternative from the playbook. Public-facing wording SHALL NOT repeatedly foreground fit verdicts or make setup feel like an admissions test; mismatch handling remains a safety exit for cases where the workflow cannot operate.

#### Scenario: Hard mismatch stops setup

- **WHEN** discovery reveals the team hosts on a non-GitHub forge and won't move
- **THEN** the skill states the mismatch plainly, offers what to consider instead, and makes no changes to the repo

#### Scenario: Normal onboarding is not framed as denial

- **WHEN** the README or setup runbook introduces WongStack to a newcomer
- **THEN** it presents setup as guided onboarding into a repo-native knowledge workflow
- **AND** it does not repeatedly emphasize "not a good fit" as the main product promise

#### Scenario: Recommendation still maps user needs to verbs

- **WHEN** discovery surfaces needs the verbs address and no disqualifier holds
- **THEN** the skill summarizes how WongStack's commands and knowledge surfaces address those needs and proceeds to setup after consent

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The prompt and surrounding copy SHALL frame WongStack as an agent-agnostic, repo-native AI knowledge center that centralizes process and captures knowledge through work. The README SHALL mention Claude Code as an easy place to run the prompt while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup creates a knowledge-centered workflow in the repo

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-25

~~~
<!-- end .openspec.yaml -->
