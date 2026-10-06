# wiki-dream Specification

## Purpose
`/dream` brings an install's own wiki pages up to date from memory when a person asks: it adds the repeatable facts memory has gained since the last dream, re-checks a few old pages, and publishes the result through the project's checks.

## Requirements

### Requirement: A dream tidies memory before it updates the wiki

A dream SHALL first consolidate the memory store, whenever it was last consolidated: facts that say the same thing merge, a contradicted fact is superseded by the newer one, and an answered open thread closes. The wiki SHALL then be updated only from live facts. On a teammate's key the tidy-up SHALL change only that installation's own facts.

#### Scenario: A contradicted fact does not reach the wiki

- **WHEN** two facts added since the last dream contradict each other
- **THEN** after the dream the older is superseded in memory and only the newer is on the wiki

### Requirement: A dream adds what memory has gained since the last one

When a person runs `/dream`, the assistant SHALL place each repeatable fact added to memory since the last dream on the wiki page that owns it, by the wiki's own rules, and SHALL leave every other fact in memory. A fact on a topic with no page SHALL make that page, linked from its hub.

#### Scenario: A lasting preference lands on its page

- **WHEN** a person stated a lasting preference about how work is done in a chat that was never closed with `/close`, and then runs `/dream`
- **THEN** the preference is on that person's page after the dream

#### Scenario: A one-off decision stays in memory

- **WHEN** a new fact records one change's decision, a date, or finished work
- **THEN** no page gains it

### Requirement: A dream removes discrepancies from the install's own pages

Each dream SHALL re-check the install's own pages, longest unchecked first and up to a stated limit, against live memory, the files each page links to, and each other. It SHALL correct what they contradict, merge duplicates, move a fact to the page that owns it, and leave every hub listing its pages.

#### Scenario: A stale statement is corrected

- **WHEN** a re-checked page states something a newer live fact contradicts
- **THEN** the dream replaces the statement with the newer fact

#### Scenario: Two pages disagree

- **WHEN** two own pages state the same thing differently
- **THEN** after the dream one page owns it and the other links there

### Requirement: A claim changes only after its source is read

Before a dream replaces or removes a statement already on a page, the assistant SHALL read the source of the fact that contradicts it. A fact recorded as the assistant's interpretation SHALL NOT be written as the person's own preference.

#### Scenario: An interpretation is not promoted

- **WHEN** a fact about a person is marked as an interpretation and not their words
- **THEN** the person's page does not state it as their preference

### Requirement: Pages WongStack ships are never edited

A dream SHALL edit only pages the install owns. A fact that belongs on or contradicts a page WongStack ships SHALL be listed in the dream's report and left as a note, each naming the page and the fact.

#### Scenario: A fact contradicts a shipped page

- **WHEN** a new fact contradicts a page WongStack ships
- **THEN** the page is unchanged and the dream's report and a memory thread name the page and the fact

### Requirement: A dream publishes alone, through the project's checks

A dream's edits SHALL be published apart from any other work, through the same checks as any wiki edit, on either delivery route, with no closing question. A checkout holding unfinished work SHALL stop the dream before it edits anything. The report SHALL name each page changed and the fact behind each edit.

#### Scenario: Unfinished work in the checkout

- **WHEN** `/dream` is run where a change is half built
- **THEN** it edits nothing and says where to run it instead

#### Scenario: Nothing to add

- **WHEN** no new fact passes the keep test and no re-checked page needs an edit
- **THEN** the dream publishes nothing, says so, and still counts as the last dream

### Requirement: A dry run shows the edits and publishes nothing

`/dream --dry-run` SHALL list each edit it would make with the fact behind it, and SHALL change no file, tidy no memory, publish nothing, and not count as the last dream.

#### Scenario: Looking first

- **WHEN** a person runs `/dream --dry-run`
- **THEN** they see the pages and edits, and the repository and memory are unchanged

### Requirement: A dream runs only when asked and keeps private things out

No dream SHALL run unless a person or a schedule they made invokes `/dream`. A dream SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki.

#### Scenario: An update arrives

- **WHEN** an install updates to a WongStack version that has `/dream` and nobody runs it
- **THEN** the wiki is unchanged
