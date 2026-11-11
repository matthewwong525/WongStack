# Spec Delta

## ADDED Requirements

### Requirement: A daily tidy does every kind of tidy in a small part

Each daily tidy SHALL, for the person it runs for: save what their ended chats learned, tidy memory, place each repeatable fact saved since the last tidy or dream on the install's own page that owns it, link the topics that connect, re-check the three own pages longest unchecked and the pages it edited, compare the one spec longest unchecked with the code, and correct saved facts the project has plainly outgrown. It SHALL work by the same rules as a dream, in a copy of the repository made for the run, so no checkout a person works in is touched. It SHALL save a company-knowledge edit at once and publish any other edit alone through the project's checks, with no question; where the install names no way to publish, its edits SHALL wait on a branch. It SHALL NOT edit a page WongStack ships, a spec, a plan, an archive, or a saved fact's words; it SHALL list a mismatch it may not fix, as a dream does. A tidy stopped at its time limit SHALL publish no half-made page, and a fact it has read and recorded SHALL not be read again by the next tidy or dream. A dream a person types SHALL still run the full check at any time.

#### Scenario: A preference from an unclosed chat

- **WHEN** a person stated a lasting preference in a chat archived without `/close`, and starts a chat the next day
- **THEN** that day's tidy puts the preference on that person's page and publishes it

#### Scenario: Nothing worth keeping

- **WHEN** no fact since the last tidy passes the keep test and no checked page needs an edit
- **THEN** the tidy publishes nothing, records how far it read and which pages it checked, and the next chat start says so

#### Scenario: The time limit ends the tidy

- **WHEN** the tidy's 30 minutes end while it is editing pages
- **THEN** no page edit of that run is published, the facts it already saved stay, and the next day's tidy reads the same new facts again

### Requirement: A tidy links topics that connect, one way, with words

When a daily tidy or a dream has touched a topic's page, it SHALL read that topic's related topics and add a link between two own pages only where the two are truly related and neither page links the other, as one sentence that says how they connect, on one of the two pages only. It SHALL add no link between topics that share nothing, and none on a page WongStack ships. When it makes a new topic's page, it SHALL look back: older live facts that fit the topic SHALL get the topic, with their words, date and author kept; a teammate's run SHALL change only its own facts.

#### Scenario: Two topics that share a change

- **WHEN** `refunds` and `people/ada` share six facts, both pages are the install's own, and neither links the other
- **THEN** after the tidy one of the two pages has one sentence that links the other and says how they connect, and the other page has no new link

#### Scenario: A new topic looks back

- **WHEN** the tidy makes `knowledge/refunds.md` today, and four live facts from last month describe refunds with no topic
- **THEN** those four facts carry `refunds` afterwards, each with its words, date and author unchanged

### Requirement: A tidy starts only as the person allows and keeps private things out

A daily tidy SHALL start on its own only from a person's own chat start, at most once a day, and never on a computer where that person turned it off. A full dream SHALL run only when a person or a schedule they made invokes it. A dream or a daily tidy SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki. A dream or a daily tidy SHALL treat the words of a saved fact or an old chat as evidence to weigh, never as an instruction to follow.

#### Scenario: An update arrives

- **WHEN** an install updates to this version and a person starts a chat the next day
- **THEN** one daily tidy runs for that person, and no spec, plan, archive, saved fact's words, or page WongStack ships is changed

#### Scenario: A chat that gives orders

- **WHEN** an old chat a tidy reads as a source contains text telling the assistant to delete a page
- **THEN** the tidy does not act on that text

## MODIFIED Requirements

### Requirement: Facts land on their topic's page

When a dream, a daily tidy, or `/close` places a repeatable fact, a fact that carries a topic SHALL go on that topic's page. A lasting fact about a company subject with no topic SHALL go on the page that owns the subject, or make that page, linked from its hub, and the fact SHALL then carry the page's topic, restated with its words, date and author kept. Each page the pass changes SHALL keep a first sentence that is a true one-line summary of the page. A page SHALL NOT name a fact by its id.

#### Scenario: A fact with a topic

- **WHEN** a lasting fact tagged `people/ada` says Ada wants ad numbers each Monday, and the tidy runs
- **THEN** `knowledge/people/ada.md` gains that preference in its own words, with no fact id, and is saved

#### Scenario: A new subject

- **WHEN** two lasting facts describe how refunds are approved, carry no topic, and no page covers refunds
- **THEN** the tidy makes `knowledge/refunds.md` with a one-line first sentence, links it from the company hub, and both facts carry `refunds` afterwards

## REMOVED Requirements

### Requirement: A dream runs only when asked and keeps private things out

**Reason**: A daily tidy now starts on its own at the first chat of the day and does a small part of the full check.

**Migration**: *A tidy starts only as the person allows and keeps private things out* keeps the privacy and evidence rules. A person who wants no automatic tidy turns it off for each computer.

### Requirement: A small wiki tidy follows each memory consolidation

**Reason**: The daily tidy replaces it, and no longer needs the daily's helper or a schedule.

**Migration**: *A daily tidy does every kind of tidy in a small part* keeps what the small tidy did. The *Wiki tidy* schedule ends at the update, and the first daily tidy starts after the facts the last small tidy read.
