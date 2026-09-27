## MODIFIED Requirements

### Requirement: Instruction size is measured as source text

The meta-repo SHALL measure the words and bytes of the start-up load (the `WONG-STACK` block and the rest of `CLAUDE.md`, the pages it always imports, and every skill description) and of every WongStack-authored skill's instructions, against a baseline recorded at the measuring change's own starting commit. A reduction SHALL be reported as source text, never as runtime token savings, and text moved into a new file SHALL still count.

#### Scenario: A procedure moves to a reference

- **WHEN** text is extracted from a skill into a new reference
- **THEN** the measured total includes the new file

#### Scenario: An earlier change's savings

- **WHEN** a change reports its before-and-after count
- **THEN** the before is its own starting commit, so an earlier change's savings are not counted as its own

## ADDED Requirements

### Requirement: The start-up load stays under a ceiling

The meta-repo SHALL record a word ceiling for the start-up load, and its checks SHALL fail when the load exceeds it. Raising the ceiling SHALL be a recorded decision in the change that raises it.

#### Scenario: A change grows the start-up load past the ceiling

- **WHEN** a change adds text that puts the start-up load over the ceiling
- **THEN** the checks fail and name the load and the ceiling

### Requirement: A trim shows where every rule went

A change that shortens instructions and claims to keep every rule SHALL list each rule of the old text with the place that now holds it, so a reviewer can see none was lost.

#### Scenario: A rule merged into another page

- **WHEN** a rule is removed from one skill because another page states it
- **THEN** the list names the page that now states it, and the skill links there
