## MODIFIED Requirements

### Requirement: The page is one scrolling review

`review.html` SHALL be one vertically scrolling document. In order, it SHALL show the change name and the saved-note count, the proposal's Why, the What Changes items numbered with each item's full text and its visual when it has one, and the Decisions. Decisions SHALL list each bullet of the proposal's `## Decision log`, labeled `asked` when its text after the date starts with "Asked", `assumed` when it starts with "Assumed", `check` when it starts with "Check:", and `log` otherwise. A short jump list at the top SHALL link the three sections. The page SHALL have no side panel, no stage, no Previous or Next control, and no change-list sheet.

#### Scenario: Open the page on a phone

- **WHEN** a reviewer opens `review.html` at a width of 320px
- **THEN** Why, the numbered What Changes items, and the Decisions follow in one vertical order
- **AND** nothing makes the page scroll sideways

#### Scenario: Decisions are labeled

- **WHEN** the Decision log holds an "Asked … → chose …" bullet and an "Assumed …" bullet
- **THEN** the Decisions section shows them labeled `asked` and `assumed`

#### Scenario: A loosened check is labeled

- **WHEN** the Decision log holds a "Check: `app/vitest.config.ts` …" bullet
- **THEN** the Decisions section shows it labeled `check`

#### Scenario: No Decision log yet

- **WHEN** the proposal has no `## Decision log` section
- **THEN** the Decisions section says that no decision is recorded
