## ADDED Requirements

### Requirement: The builder flags a technical summary

The builder SHALL warn when Why and What Changes together hold more than 12 code spans, naming the count, and SHALL still write the page.

#### Scenario: A summary full of file names

- **WHEN** a proposal's Why and What Changes hold 38 code spans
- **THEN** the builder warns with the count and writes the page

#### Scenario: A plain summary

- **WHEN** they hold 12 or fewer
- **THEN** the builder prints no such warning
