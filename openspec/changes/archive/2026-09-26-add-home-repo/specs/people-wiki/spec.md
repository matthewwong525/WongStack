## Purpose

Give every WongStack repo one wiki format that holds repeatable knowledge about process, people, the company, and the project, grows from use, and works for a team of one or many.

## ADDED Requirements

### Requirement: The wiki holds repeatable knowledge

The wiki rules SHALL define the wiki's scope as repeatable knowledge: facts that stay true and apply again, about process, people, the company, or the project. The test SHALL be "will this help with a future task that is not this one?". A one-off fact (a single decision, a date, one change's details) SHALL stay in the memory store or the change's records. The rules SHALL be the same in every repo.

#### Scenario: A repeatable preference

- **WHEN** a session learns that a teammate wants PRs under 300 lines
- **THEN** the fact is repeatable and belongs on that teammate's page

#### Scenario: A one-off decision

- **WHEN** a session decides to ship a fix on Friday
- **THEN** the fact stays in the memory store and no wiki page changes

### Requirement: The agent writes what it learns

In every repo, when a request teaches something repeatable, the agent SHALL write it to the wiki during that request. This SHALL include "read this and remember it" requests and answers worth keeping. It SHALL cite a source by URL or path and SHALL NOT store a copy of the source in git. A wiki-only save SHALL go to the default branch through the prose allowlist. During a change, the edit SHALL ride in the change's pull request. The block's rule about editing `wiki/` mid-task SHALL say to write repeatable knowledge when it is learned, and to keep a change's specifics in its proposal.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the agent writes the repeatable points to the page that owns the topic, with the URL, and saves it straight to `main`

#### Scenario: A one-off answer

- **WHEN** the person asks for today's weather
- **THEN** no wiki page changes

### Requirement: Sections grow from use

No wiki section beyond the hubs that setup already creates SHALL be seeded. A new fact SHALL extend the page that owns its topic, or SHALL get a new page linked from its hub. A folder SHALL be added only when a topic grows into several pages. The wiki SHALL NOT gain an `index.md` or a `log.md`: hub READMEs are the index, and git history is the log.

#### Scenario: A new install

- **WHEN** setup completes
- **THEN** the wiki has only the hubs setup already creates, and no `people/` folder

#### Scenario: A new customer

- **WHEN** a session learns repeatable facts about a new customer
- **THEN** the facts go on one customer page linked from its hub, not in a new folder

### Requirement: People pages are matched by git email

Knowledge about one person SHALL go on `wiki/people/<name>.md`, linked from the hub `wiki/people/README.md`. The first such page SHALL create the hub and link it from `wiki/README.md`. A person page SHALL list every git email the person uses, and SHALL hold their preferences and how they like work done. The agent SHALL find the current person's page as the page that lists the value of `git config user.email`. When no page lists it, the agent SHALL write a short page with the name and the email in the next wiki save, and SHALL NOT ask first.

#### Scenario: The first person fact

- **WHEN** a repo with no `people/` folder learns a teammate's review preference
- **THEN** the save adds `wiki/people/README.md`, links it from `wiki/README.md`, and adds the teammate's page with their git email

#### Scenario: A person with two emails

- **WHEN** a person commits at work as `ana@corp.com` and at home as `ana@mail.com`
- **THEN** their page in home lists both emails

### Requirement: Four writing rules place each fact

Every wiki write SHALL follow four rules:

1. A fact about one person SHALL go on that person's page. A fact about everyone SHALL go on a topic page.
2. Different preferences of different people SHALL NOT be treated as a contradiction. Each SHALL stay on its own page. Newest wins SHALL apply only between facts about the same person, or about the whole team.
3. A fact about private life (health, family, money) SHALL go only to home, never to another repo. A work preference MAY go in a work repo.
4. In a shared repo, wiki edits SHALL merge through git like code.

#### Scenario: Two people disagree

- **WHEN** one teammate wants squash merges and another wants merge commits for their own PRs
- **THEN** each preference stays on its owner's page, and neither supersedes the other

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session learns that the person has a medical appointment every Tuesday
- **THEN** no page in the work repo records it
