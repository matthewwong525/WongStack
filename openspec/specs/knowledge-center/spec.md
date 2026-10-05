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

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run whose change touches a Markdown file or removes or moves any file, docs-only runs included, and on every run with no base to compare; a run whose change touches only other files SHALL skip the check and say so. The check SHALL fail when a link to a file in the repo points nowhere, when a link's `#section` part names no heading on the page it lands on, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. Section names SHALL follow GitHub's heading anchors, and a heading inside a code block SHALL NOT count. The failure SHALL name each page and link.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

#### Scenario: A renamed heading breaks a section link

- **WHEN** a wiki save renames the heading `## Saved browser logins` while another wiki page links `browsing.md#saved-browser-logins`
- **THEN** the check fails naming the linking page, its line, and the link, and the save does not publish until the link or the heading is fixed

#### Scenario: A code-only change skips the wiki check

- **WHEN** a branch changes only `app/src/pages/home/Home.tsx`
- **THEN** the test workflow runs the code tests, skips the wiki check, and its summary says the wiki check was skipped because no page or linked file changed

### Requirement: Every wiki page stays short and opens with its title

The same wiki check SHALL fail when a page holds more than 3,000 words, counted as whitespace-separated words across the whole file, or when a page does not open with exactly one `#` title followed by a first paragraph of prose. A size failure SHALL name the page, its word count, and the cap, and say to split the page by its sections. Every page the meta-repo ships SHALL pass.

#### Scenario: A page grows past the cap

- **WHEN** a wiki save leaves `wiki/development/browsing.md` at 3,200 words
- **THEN** the check fails naming the page, 3,200 words, and the 3,000-word cap, and the save does not publish until the page is split

#### Scenario: A page opens with a list

- **WHEN** a wiki page's title is followed directly by a bulleted list, or the page has no `#` title
- **THEN** the check fails naming the page and what its opening lacks
