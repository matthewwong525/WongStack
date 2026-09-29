# knowledge-center Specification

## Purpose

WongStack turns a repo into an AI knowledge center: process, active work, shipped decisions, and repeatable knowledge live in files that people review and agents run. It covers how the docs present the idea, what the wiki holds, and the plain voice of every message.

## Requirements

### Requirement: The docs present the repo as an AI knowledge center

The README SHALL frame WongStack as a repo-native AI knowledge center and link a philosophy page that states the six working principles plainly, as one way of working a team can adapt, without sales labels such as "AI-native" or "compounding loop".

#### Scenario: Reader follows the pitch

- **WHEN** a reader follows the README's link to the philosophy page
- **THEN** they see the six principles, each tied to the repo mechanism that applies it

### Requirement: The philosophy names where knowledge lives

The philosophy page SHALL name each durable surface (agent instructions, path-scoped rules, the wiki, active and archived changes, the memory store, and skills), say what each owns, and link each deeper process rather than restate it. It SHALL present Claude Code as one way to run WongStack: any agent that reads and edits files, runs commands, and follows the skill runbooks can do the work.

#### Scenario: Reader finds where knowledge lives

- **WHEN** a reader reviews the philosophy page
- **THEN** they can tell where process, plans, shipped records, session context, and agent actions live, each with a link

### Requirement: Capture happens during the work

The docs SHALL present capture as part of the work: the memory store is short-term memory, the wiki is long-term memory written when a session learns something, and `/close` is the catch-up that moves a session's and its change's remaining repeatable facts into the wiki for review in their own pull request.

#### Scenario: Reader sees why capture pays off

- **WHEN** a reader reviews the philosophy page
- **THEN** they see that each change starts with more context than the last

### Requirement: The wiki is a progressive-disclosure tree at `wiki/`

WongStack's wiki SHALL live at `wiki/` with its hub at `wiki/README.md`. Every page SHALL be linked from its hub and each topic SHALL be documented in exactly one place.

#### Scenario: A new page is added

- **WHEN** a session adds a wiki page
- **THEN** its hub links to it and no other page restates its procedure

### Requirement: The wiki holds repeatable knowledge only

The wiki SHALL hold facts that help with a future task that is not this one, about process, people, the company, or the project. A one-off fact (a decision, a date, one change's details) SHALL stay in the memory store or the change's records.

#### Scenario: A repeatable preference

- **WHEN** a session learns a teammate wants pull requests under 300 lines
- **THEN** the fact goes on that teammate's wiki page

### Requirement: The agent writes what it learns when it learns it

When a request teaches something repeatable, including "read this and remember it", the agent SHALL write it to the wiki in that request, citing the source by URL or path and never copying the source into git. The edit SHALL be saved like any other file edit, through a pull request; during a change, it SHALL ride in the change's pull request.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the repeatable points land on the page that owns the topic, with the URL, in a pull request for review

### Requirement: The wiki grows from use

Setup SHALL seed no wiki section beyond its own hubs. A new fact SHALL extend the page that owns its topic or start a page linked from its hub, and the wiki SHALL NOT gain an `index.md` or a `log.md`.

#### Scenario: A new install

- **WHEN** setup completes
- **THEN** the wiki has only setup's hubs and no `people/` folder

### Requirement: People pages are matched by git email

A fact about one person SHALL go on `wiki/people/<name>.md`, which lists every git email the person uses. The agent SHALL find the current person by `git config user.email`; when no page lists it, the next wiki save SHALL add a short page with the name and email, without asking.

#### Scenario: The first person fact

- **WHEN** a repo with no `people/` folder learns a teammate's review preference
- **THEN** the save adds the people hub, links it from `wiki/README.md`, and adds the teammate's page with their email

### Requirement: Facts are placed without false conflicts or leaks

Different people's preferences SHALL each stay on their own page; newest-wins SHALL apply only between facts about the same person or the whole team. Health, family, and money SHALL NOT be written to the wiki of a repo anyone else can read.

#### Scenario: Two people disagree

- **WHEN** one teammate wants squash merges and another wants merge commits
- **THEN** each preference stays on its owner's page and neither supersedes the other

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** no page in the work repo records it

### Requirement: Messages are short and plain

The agent SHALL write user-facing messages in the voice `wiki/voice.md` owns: the point first, a few lines, everyday words, and more detail only when asked. It SHALL name git, OpenSpec, or CI only when the person asks or must act, and SHALL keep code, commands, identifiers, and quotations exact.

#### Scenario: A save is reported

- **WHEN** the agent reports a save to a person who did not ask about git
- **THEN** the reply says the work is saved and gives the preview link, without naming commits or branches

#### Scenario: The person asks for the detail

- **WHEN** the person asks which branch holds the work
- **THEN** the agent names it exactly
