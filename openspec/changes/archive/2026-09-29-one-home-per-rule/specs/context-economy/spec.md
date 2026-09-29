## MODIFIED Requirements

### Requirement: Payload conventions load only when needed

The meta-repo half of `AGENTS.md` SHALL identify the repo and point into the wiki. The conventions for working on the payload SHALL live in a meta-only rule that loads when a payload file is touched.

#### Scenario: A session that touches no payload file

- **WHEN** a session never edits a payload file
- **THEN** the release conventions never load

### Requirement: Instruction size is measured as source text

The meta-repo SHALL measure the words and bytes of the start-up load (the `WONG-STACK` block and the rest of `AGENTS.md`, the pages it always imports, and every skill description) and of every WongStack-authored skill's instructions, against a baseline recorded at the measuring change's own starting commit. A reduction SHALL be reported as source text, never as runtime token savings, and text moved into a new file SHALL still count.

#### Scenario: A procedure moves to a reference

- **WHEN** text is extracted from a skill into a new reference
- **THEN** the measured total includes the new file

#### Scenario: An earlier change's savings

- **WHEN** a change reports its before-and-after count
- **THEN** the before is its own starting commit, so an earlier change's savings are not counted as its own
