## REMOVED Requirements

### Requirement: A chat's name shows its step

**Reason**: A step run inside another step now moves the name, back as well as forward, and a typed step word no longer moves it by itself, so both scenarios change.
**Migration**: Replaced by "A chat's name shows the step that runs now".

## ADDED Requirements

### Requirement: A chat's name shows the step that runs now

Every chat that runs the change loop SHALL start its name with the step that runs now, as a full capital word followed by `: ` (`EXPLORE: `, `PLAN: `, `APPLY: `, `SHIP: `, or `DONE: `), and the rest of the name SHALL name the task. The name SHALL change when a step starts its own work, not when a step word is typed, in Paseo, in Claude Code without Paseo, and in Codex without Paseo. A step run inside another step SHALL move the name to itself, back as well as forward. Each move SHALL write the whole name, keeping the task words the chat started with. The Daily chat, routines, helper chats, and a workspace shared by several chats SHALL keep their names.

#### Scenario: Publish from a plan builds first

- **WHEN** a chat named `PLAN: Fix the invoice total` is told to publish, builds first inside that publish, and its work goes live
- **THEN** its name is `APPLY: Fix the invoice total` while it builds, `SHIP: Fix the invoice total` while it publishes, and `DONE: Fix the invoice total` once the work is live

#### Scenario: Claude Code without Paseo

- **WHEN** a chat runs in Claude Code with no Paseo, and the person types `/ship`
- **THEN** the name keeps its step until a step starts its work, and the step the chat is in shows by the person's next message
