# Spec Delta

## ADDED Requirements

### Requirement: A dream takes an outside report only after a person picked it

A dream SHALL NOT load outside reports by itself. It SHALL work on one only when a person picked it from `/improve-code`'s list, and SHALL then treat it as a place to look, proving the fix from the project's own sources.

#### Scenario: A scheduled dream

- **WHEN** a dream runs with open outside reports nobody has picked
- **THEN** it reads none of them and changes nothing because of them
