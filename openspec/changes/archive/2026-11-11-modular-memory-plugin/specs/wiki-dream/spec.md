## ADDED Requirements

### Requirement: Facts land on their topic's page

When a dream, a small tidy, or `/close` places a repeatable fact, a fact that carries a topic SHALL go on that topic's page. A lasting fact about a company subject with no topic SHALL go on the page that owns the subject, or make that page, linked from its hub, and the fact SHALL then carry the page's topic, restated with its words, date and author kept. Each page the pass changes SHALL keep a first sentence that is a true one-line summary of the page. A page SHALL NOT name a fact by its id.

#### Scenario: A fact with a topic

- **WHEN** a lasting fact tagged `people/ada` says Ada wants ad numbers each Monday, and the tidy runs
- **THEN** `knowledge/people/ada.md` gains that preference in its own words, with no fact id, and is saved

#### Scenario: A new subject

- **WHEN** two lasting facts describe how refunds are approved, carry no topic, and no page covers refunds
- **THEN** the tidy makes `knowledge/refunds.md` with a one-line first sentence, links it from the company hub, and both facts carry `refunds` afterwards

## MODIFIED Requirements

### Requirement: A small wiki tidy follows each memory consolidation

Where the daily's helper runs, after each memory consolidation for the person, the helper SHALL start one background run that places each repeatable fact saved since the last tidy or dream on the install's own page that owns it, by the same rules a dream uses, and fixes only the pages those facts touch. It SHALL save a company-knowledge edit at once and publish any other edit alone through the project's checks, with no question, and write one journal line naming the pages it changed. It SHALL NOT edit a page WongStack ships, a spec, a plan, or a saved fact's words; it MAY add a topic to a fact it places, by a restate that keeps the fact's words, date and author. A fact it has read SHALL not be read again by the next tidy or dream.

#### Scenario: A preference from an unclosed chat

- **WHEN** a person stated a lasting preference in a chat archived without `/close`, and memory then consolidates
- **THEN** the next small tidy puts the preference on that person's page and publishes it

#### Scenario: Nothing worth keeping

- **WHEN** no fact since the last tidy passes the keep test
- **THEN** the tidy publishes nothing, records how far it read, and says so in the journal
