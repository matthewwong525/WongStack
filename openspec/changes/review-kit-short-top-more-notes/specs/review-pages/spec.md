## ADDED Requirements

### Requirement: A review page's top is short

A review page SHALL open with only its name, one line with its kind and note count, and one row of section links, then its first section. The section links SHALL stay on one row, scrolling sideways when the screen is too narrow. The how-to hint SHALL NOT sit at the top; it SHALL show in the notes section while it holds no notes.

#### Scenario: Opening a plan on a phone

- **WHEN** a person opens a plan's review page on a phone 390 px wide
- **THEN** the *Why* heading shows within the top third of the screen, under the name, *Review · 0 notes* and one row of links

#### Scenario: No notes yet

- **WHEN** the person scrolls to *Your notes* before adding one
- **THEN** it says there are no notes yet, with the hint on how to add one

### Requirement: A sent note never blocks a new note

A part of a review page SHALL take a new note whenever every note on it is sent. A sent note SHALL stay on its part, marked sent, and SHALL NOT be sent again unless its text changes. A part's *Note* button SHALL open the part's unsent note or draft when it has one, and SHALL NOT start a second one.

#### Scenario: Noting the same card in the next version

- **WHEN** a person sent a note on card 2, the plan comes back revised, and they tap *Note* on card 2
- **THEN** an empty note opens, saving it adds a second note on card 2, and *Send notes* sends only the new note

#### Scenario: A note not yet sent

- **WHEN** card 2 holds a saved note that is not yet sent and the person taps *Note* on it
- **THEN** that note opens to edit, and no second note is made
