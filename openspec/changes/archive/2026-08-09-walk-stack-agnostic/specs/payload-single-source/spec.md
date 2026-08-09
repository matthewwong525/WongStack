## ADDED Requirements

### Requirement: A vendored third-party skill is a pointer, never a copy

The payload MAY ship a skill authored outside this repository when the capability it describes belongs to an external tool. Such a skill SHALL be vendored **as a pointer to that tool's own instructions**, not as a copy of them: it carries the description and triggers an agent needs to discover the capability, and defers the usage content to the installed tool at run time.

A vendored skill that copies its tool's documentation SHALL NOT be shipped, because the copy and the installed tool version drift independently, and the reader has no way to tell which one is true. The pointer form has nothing to drift: the tool serves content matching its own version.

The vendored file SHALL be recorded in the payload manifest like any other payload file, SHALL keep its upstream licence and attribution intact, and SHALL be refreshed from upstream rather than edited in place, so a local edit is never mistaken for upstream behavior.

#### Scenario: The vendored skill defers to the tool

- **WHEN** an agent loads a vendored third-party skill
- **THEN** the file states what the capability is and how to reach it
- **AND** the usage instructions are loaded from the installed tool rather than read out of the payload

#### Scenario: A copied manual is rejected

- **WHEN** a proposed vendored skill reproduces its tool's command reference in the payload
- **THEN** it is not shipped in that form
- **AND** the pointer form is used instead

#### Scenario: The vendored file is refreshed, not edited

- **WHEN** the upstream skill changes
- **THEN** the payload copy is replaced from upstream
- **AND** no local modification is carried forward silently
