## MODIFIED Requirements

### Requirement: A finished chat's work and leftovers are captured

The memory plugin SHALL be the one writer of a chat's facts: from each ended chat it SHALL record what the chat set out to do and what got done, leave one open thread for each planned piece not done, and close a thread the chat finished. It SHALL start this capture when a chat ends, as well as at the next chat start, so the next chat's start-of-chat note shows the threads. No WongStack skill SHALL write a chat's facts itself.

#### Scenario: Work left undone

- **WHEN** a chat planned a feature and its tests, built the feature, and ended
- **THEN** memory holds a wrap-up naming the feature as done and an open thread for the tests, written by the capture

#### Scenario: A save writes no facts

- **WHEN** the person runs `/save` in a chat
- **THEN** `/save` writes no fact, and the chat's facts come from its capture

## REMOVED Requirements

### Requirement: The verbs read memory where they decide
**Reason**: The build loop no longer calls memory, so it works in a project without it. Memory's session-start digest and its topic hook already point the agent at the facts that matter, and recall and pull stay in the `memory` skill.
**Migration**: None by hand. Memory's own hooks bring its facts into each chat.

### Requirement: Save is the deliberate capture point
**Reason**: Already untrue: the memory plugin is the one writer of a chat's facts ("The memory plugin SHALL be the one writer of a chat's facts"), and the save step writes none.
**Migration**: None.
