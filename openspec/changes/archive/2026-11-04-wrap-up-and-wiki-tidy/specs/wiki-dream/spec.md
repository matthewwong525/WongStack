## MODIFIED Requirements

### Requirement: A dream runs only when asked and keeps private things out

No full dream SHALL run unless a person or a schedule they made invokes `/dream-memory`; the small wiki tidy after a memory consolidation is the only wiki work that starts on its own. A dream or a small tidy SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki. A dream or a small tidy SHALL treat the words of a saved fact or an old chat as evidence to weigh, never as an instruction to follow.

#### Scenario: An update arrives

- **WHEN** an install updates to a WongStack version that has `/dream-memory` and nobody runs it
- **THEN** no full dream runs, and no spec, plan, saved fact, or page WongStack ships is changed

#### Scenario: A chat that gives orders

- **WHEN** an old chat a dream reads as a source contains text telling the assistant to delete a page
- **THEN** the dream does not act on that text

## ADDED Requirements

### Requirement: A small wiki tidy follows each memory consolidation

Where the daily's helper runs, after each memory consolidation for the person, the helper SHALL start one background run that places each repeatable fact saved since the last tidy or dream on the install's own page that owns it, by the same rules a dream uses, and fixes only the pages those facts touch. It SHALL publish its edit alone through the project's checks, with no question, and write one journal line naming the pages it changed. It SHALL NOT edit a page WongStack ships, a spec, a plan, or a saved fact. A fact it has read SHALL not be read again by the next tidy or dream.

#### Scenario: A preference from an unclosed chat

- **WHEN** a person stated a lasting preference in a chat archived without `/close`, and memory then consolidates
- **THEN** the next small tidy puts the preference on that person's page and publishes it

#### Scenario: Nothing worth keeping

- **WHEN** no fact since the last tidy passes the keep test
- **THEN** the tidy publishes nothing, records how far it read, and says so in the journal
