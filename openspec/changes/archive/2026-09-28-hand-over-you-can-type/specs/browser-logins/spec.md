# Spec Delta

## ADDED Requirements

### Requirement: The person can click and type in a handed-over browser

A hand-over link SHALL open the page the task was using, never a blank tab, and SHALL let the person click any spot on it and type into the field they chose, from a phone's on-screen keyboard or a computer's keyboard. The link SHALL show only that task's browser, not other browser sessions on the computer.

#### Scenario: A card number from a phone

- **WHEN** the agent hands over a card form and the person, on a phone, taps the card box and types the number
- **THEN** the number appears in the card box on the agent's page

#### Scenario: A stray blank tab

- **WHEN** the browser has a blank tab in front of the task's page at hand-over
- **THEN** the link opens on the task's page
