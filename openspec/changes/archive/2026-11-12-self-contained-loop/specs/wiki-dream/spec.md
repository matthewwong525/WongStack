## MODIFIED Requirements

### Requirement: Facts land on their topic's page

When a dream or a daily tidy places a repeatable fact, a fact that carries a topic SHALL go on that topic's page. A lasting fact about a company subject with no topic SHALL go on the page that owns the subject, or make that page, linked from its hub, and the fact SHALL then carry the page's topic, restated with its words, date and author kept. Each page the pass changes SHALL keep a first sentence that is a true one-line summary of the page. A page SHALL NOT name a fact by its id.

#### Scenario: A fact with a topic

- **WHEN** a lasting fact tagged `people/ada` says Ada wants ad numbers each Monday, and the tidy runs
- **THEN** `knowledge/people/ada.md` gains that preference in its own words, with no fact id, and is saved

#### Scenario: A new subject

- **WHEN** two lasting facts describe how refunds are approved, carry no topic, and no page covers refunds
- **THEN** the tidy makes `knowledge/refunds.md` with a one-line first sentence, links it from the company hub, and both facts carry `refunds` afterwards
