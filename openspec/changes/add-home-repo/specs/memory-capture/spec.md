## ADDED Requirements

### Requirement: Private-life facts go to home's store

Capture in any repo other than home, by `/save` or by the background run, SHALL write a fact about the person's private life (health, family, money, personal plans) to home's store, not to the repo's own store. The memory script SHALL offer this as a `--home` option on its read and write commands. A fact written to home's store SHALL carry no session id. When home's store can not be reached, the fact SHALL wait in home's local spool, and home's next session start SHALL send it. When the machine records no home, capture SHALL drop the fact. In both cases it SHALL NOT write the fact to the repo's own store. The raw transcript upload SHALL NOT change.

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session records that the person's daughter starts school on 2026-10-05
- **THEN** that fact is in home's store and not in the work repo's store

#### Scenario: No home recorded

- **WHEN** the same session runs on a machine with no home
- **THEN** the fact is dropped, and the run counts it as dropped
