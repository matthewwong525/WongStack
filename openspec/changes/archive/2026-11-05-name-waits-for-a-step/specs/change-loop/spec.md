## ADDED Requirements

### Requirement: A chat's name changes only when a step starts or a command is typed

A chat SHALL NOT get a step word in its name until a step starts its work or the person types a skill command. A chat whose messages start no step and type no command, such as a question or an errand, SHALL keep the name it has. A typed `/explore`, `/plan`, or `/improve-code` SHALL show its step at once; a typed `/apply`, `/continue`, or `/ship` SHALL wait for the step that starts. Any other typed command of a repo skill SHALL show the skill's name in capitals at once. A command that a step runs for the person SHALL NOT change the name. A name the host copied from the start of the chat's first message SHALL count as that message's words, so task words that a step gives, such as a plan's title, replace it. A name the person gave the chat SHALL stay.

#### Scenario: A question starts no step

- **WHEN** a chat's first message is a question with no command, and the chat answers it without starting a step
- **THEN** the chat's name has no step word

#### Scenario: A typed command names the chat at once

- **WHEN** the person types `/verify the invoice page` in a chat
- **THEN** the chat's name becomes `VERIFY: The invoice page` before the reply, in Paseo and in Claude Code without Paseo

#### Scenario: A plan's title replaces a copied name

- **WHEN** Paseo names a chat with the first characters of its first message, and the chat then plans a change titled `Fix the invoice total`
- **THEN** the chat's name becomes `PLAN: Fix the invoice total`
