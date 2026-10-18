## ADDED Requirements

### Requirement: Every private input page starts calm

A key link, a password link, and a private form SHALL share one look. Each SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. Each SHALL offer *Not now*, which closes the link as closing it does today. A key link and a private form SHALL show when they close as a time of day on the person's clock, counted in minutes only in their last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens an eight-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 1:30 PM*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a private form has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock
