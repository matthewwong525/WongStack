## ADDED Requirements

### Requirement: The walk shows its screenshots in the chat

While grading a browser journey, `/verify` SHALL show that journey's screenshots in the chat, in walk order, each with a line saying what it shows, as well as posting them with the evidence.

#### Scenario: A two-step journey

- **WHEN** `/verify` grades a journey that took screenshots of a form and its result
- **THEN** both pictures appear in the chat before the verdict, in that order
