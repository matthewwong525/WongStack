## MODIFIED Requirements

### Requirement: Review layout keeps each item's content together

New review pages SHALL use normal vertical scrolling and consistent alignment for the selected item's text, caption, visual, and reasoning. A token too wide for its column — a path, an identifier, a URL — SHALL wrap rather than be clipped or hidden, at every width, in the change list and in the selected item's text. They SHALL show no inactive visual or its caption. Visual-kind styling SHALL NOT expose an inactive section or split the section's caption away from its frame. Short content SHALL NOT require an artificial screen-height blank area. Workflow steps and comparison columns SHALL stack when necessary to remain readable. Reviewers SHALL NOT need pan, zoom, or content rearrangement controls to read the page.

#### Scenario: Inactive comparison beside a text-only item

- **WHEN** a text-only item is selected and another section carries comparison layout classes
- **THEN** only the selected item's text and fallback explanation are visible
- **AND** no caption, comparison, or reasoning from the inactive section appears

#### Scenario: Read a short comparison

- **WHEN** a reviewer selects a short before-and-after comparison
- **THEN** its caption, frame, and reasoning remain aligned and adjacent in one content group
- **AND** the layout does not reserve an empty screen-height area below it

#### Scenario: A bullet names a long path

- **WHEN** a What Changes bullet contains a path wider than the change list's column
- **THEN** the path wraps onto the next line and every character stays readable
- **AND** the list needs no horizontal scrolling at desktop or phone width
