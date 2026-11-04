## ADDED Requirements

### Requirement: A chat's name shows its step

Every chat that runs the change loop SHALL start its name with its current step as a full capital word followed by `: ` (`EXPLORE: `, `PLAN: `, `APPLY: `, `SHIP: `, or `DONE: `), and the rest of the name SHALL name the task. The name SHALL change when the chat moves to another step, in Paseo, in Claude Code without Paseo, and in Codex without Paseo. A step run inside another step SHALL NOT move the name back; only a step the person types MAY. Each move SHALL write the whole name, keeping the task words the chat started with. The Daily chat, routines, helper chats, and a workspace shared by several chats SHALL keep their names.

#### Scenario: A chat goes from plan to live

- **WHEN** a chat named `PLAN: Fix the invoice total` is told to publish, builds first inside that publish, and its work goes live
- **THEN** its name is `SHIP: Fix the invoice total` while it publishes, never `APPLY: `, and `DONE: Fix the invoice total` once the work is live

#### Scenario: Claude Code without Paseo

- **WHEN** a chat runs in Claude Code with no Paseo, and the person types `/ship`
- **THEN** the chat's name starts with `SHIP: ` at once, and a move the chat makes by itself shows by the person's next message
