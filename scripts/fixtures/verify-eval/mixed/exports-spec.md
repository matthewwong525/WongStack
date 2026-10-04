# Exports

## Requirements

### Requirement: Exports consume the notes title contract

The export view SHALL display the titles from the notes API's `title` field.

#### Scenario: The export view shows note titles

- **WHEN** a person opens `/exports`
- **THEN** each exported title matches the corresponding `title` from `GET /api/notes`
