## MODIFIED Requirements

### Requirement: A chat's name shows the step that runs now

Every chat that runs the change loop SHALL start its name with the step that runs now, as a full capital word followed by `: ` (`EXPLORE: `, `PLAN: `, `APPLY: `, `SHIP: `, or `DONE: `), and the rest of the name SHALL name the work at that time in at most 60 characters. The name SHALL change when a step starts its own work, not when a step word is typed, in Paseo, in Claude Code without Paseo, and in Codex without Paseo. A step run inside another step SHALL move the name to itself, back as well as forward. Each step that starts SHALL give the task words for its work, and those words SHALL replace the earlier ones; once a plan is the work, its title SHALL be the task words until the work is done. `DONE` SHALL keep the words it has. The Daily chat, routines, helper chats, and a workspace shared by several chats SHALL keep their names.

#### Scenario: Publish from a plan builds first

- **WHEN** a chat named `PLAN: Fix the invoice total` is told to publish, builds first inside that publish, and its work goes live
- **THEN** its name is `APPLY: Fix the invoice total` while it builds, `SHIP: Fix the invoice total` while it publishes, and `DONE: Fix the invoice total` once the work is live

#### Scenario: Claude Code without Paseo

- **WHEN** a chat runs in Claude Code with no Paseo, and the person types `/ship`
- **THEN** the name keeps its step until a step starts its work, and the step the chat is in shows by the person's next message

#### Scenario: Words about other work give way

- **WHEN** a chat's name is `PLAN: why is it only hidden on mac?`, from a message about other work, and the chat then plans a change titled `Add an add-on, then open its sign-in`
- **THEN** the chat's name becomes `PLAN: Add an add-on, then open its sign-in`

### Requirement: A chat's name changes only when a step starts or a command is typed

A chat SHALL NOT get a step word in its name until a step starts its work or the person types a skill command. A chat whose messages start no step and type no command, such as a question or an errand, SHALL keep the name it has. A typed `/explore`, `/plan`, or `/improve-code` SHALL show its step at once; a typed `/apply`, `/continue`, or `/ship` SHALL wait for the step that starts. Any other typed command of a repo skill SHALL show the skill's name in capitals at once. A command that a step runs for the person SHALL NOT change the name. A name the host gave the chat before its first step name, copied from a message or not, SHALL give way to the task words a step gives. A name the person gives the chat after it has a step name SHALL keep its words, where the host lets the chat read its name; only the step word changes.

#### Scenario: A question starts no step

- **WHEN** a chat's first message is a question with no command, and the chat answers it without starting a step
- **THEN** the chat's name has no step word

#### Scenario: A typed command names the chat at once

- **WHEN** the person types `/verify the invoice page` in a chat
- **THEN** the chat's name becomes `VERIFY: The invoice page` before the reply, in Paseo and in Claude Code without Paseo

#### Scenario: A plan's title replaces a copied name

- **WHEN** Paseo names a chat with the first characters of its first message, and the chat then plans a change titled `Fix the invoice total`
- **THEN** the chat's name becomes `PLAN: Fix the invoice total`

#### Scenario: A name the person gave stays

- **WHEN** a Paseo chat named `PLAN: Fix the invoice total` is renamed by the person to `Invoice fixes`, and the build then starts
- **THEN** the chat's name becomes `APPLY: Invoice fixes`
