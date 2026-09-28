## MODIFIED Requirements

### Requirement: A visual is a narrow text drawing

A visual SHALL be a fenced `text` block inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser, from the shared drawing guide's patterns. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A drawing SHALL aim for 40 columns and MAY reach 56 for options side by side, a table, or a before-and-after. The builder SHALL warn about a line wider than 60 columns and still build.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

## ADDED Requirements

### Requirement: The builder flags a crooked box

The builder SHALL warn, naming the item and drawing line, when a line inside a box drawn with line characters puts the box's right edge in a different column from its top-right corner. It SHALL still write the page, and SHALL NOT warn about boxes drawn with `+`, `-`, and `|`.

#### Scenario: One edge one column too far

- **WHEN** a drawing's box has a middle line whose `│` sits one column right of the `┐` above it
- **THEN** the builder warns with that item and line and still writes the page

#### Scenario: Lined-up and nested boxes

- **WHEN** a drawing holds a box inside a box and two boxes side by side, all edges lined up
- **THEN** the builder gives no box warning

### Requirement: Screen sketches show each state and the change

A change that restructures a screen SHALL sketch it before and after, side by side where both fit in 56 columns, else one above the other. A change that adds a screen SHALL sketch each empty, loading, or error state its flow names.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows that screen before and after the change

### Requirement: Explore draws in chat from the same guide

`/explore` SHALL draw in the chat, from the same drawing guide, when a picture clarifies the current flow, the options, or their costs, and SHALL still write no file.

#### Scenario: Comparing two options

- **WHEN** an exploration weighs two approaches
- **THEN** the chat shows them side by side in a text drawing, and no file changes
