## ADDED Requirements

### Requirement: A word search answers quickly

A word search SHALL run its full-text match once per query, however many facts the store holds, with the same privacy filter for every caller. A save of 3 facts SHALL finish its neighbour checks within the client's 15-second wait on a store the size of the live one. The memory service SHALL keep accepting the previous search fragment from a client not yet updated, with the same privacy.

#### Scenario: A long search on a large store

- **WHEN** a member searches 24 words in a store of 1,700 facts
- **THEN** the answer comes back in well under a second, without teammates' personal facts

#### Scenario: A client on the old version

- **WHEN** a client not yet updated sends a search with the previous fragment
- **THEN** the memory service answers it, still hiding teammates' personal facts
