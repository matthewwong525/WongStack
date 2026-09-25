## ADDED Requirements

### Requirement: The memory digest is a bounded always-loaded surface

The session-start memory digest SHALL count as always-loaded context. It SHALL stay within the limits that `memory-recall` sets, and SHALL carry only facts from the memory store and the one-line result of the latest background run. It SHALL NOT restate a fact that the WONG-STACK block, a skill description, a rule, or a wiki page owns. Consolidation SHALL be the means that keeps the live facts inside the limit, not a larger limit.

#### Scenario: A fact duplicates a wiki page

- **WHEN** a live fact states a convention that a wiki page now owns
- **THEN** consolidation supersedes the fact with one that links the page, or `/ship` has already moved it there

#### Scenario: The digest reaches its limit

- **WHEN** live facts would fill more than the digest limit
- **THEN** the digest is cut at the limit and states how many facts it left out
