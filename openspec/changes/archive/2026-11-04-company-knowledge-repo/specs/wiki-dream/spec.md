# Spec Delta

## MODIFIED Requirements

### Requirement: A dream publishes alone, through the project's checks

A dream's edits to company knowledge SHALL be saved at once, apart from any other work, with no closing question. Its edits to pages in the code repository, and every edit on an install with no knowledge copy, SHALL be published apart from any other work through the same checks as any wiki edit, on either delivery route. A checkout holding unfinished work SHALL stop the dream before it edits anything. The report SHALL name each page changed, the fact behind each edit, and how to undo the knowledge saves.

#### Scenario: Unfinished work in the checkout

- **WHEN** `/dream-memory` is run where a change is half built
- **THEN** it edits nothing and says where to run it instead

#### Scenario: Nothing to add

- **WHEN** no new fact passes the keep test and no re-checked page needs an edit
- **THEN** the dream publishes nothing, says so, and still counts as the last dream
