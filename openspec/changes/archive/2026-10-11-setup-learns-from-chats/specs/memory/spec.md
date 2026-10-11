# Spec Delta

## MODIFIED Requirements

### Requirement: Recent chats are read through code

Memory SHALL offer a read of the person's recent chats that needs no memory store: their own typed messages from Claude Code and Codex chats on this computer over the last 30 days by default, from every folder, newest first. On request it SHALL cover every chat instead of a number of days, and SHALL split what it covers into numbered parts of a bounded size, keeping a chat whole within a part where it fits: it SHALL report how many parts there are and the dates they span, and print any one part, so several readers can each take one without overlap or gaps. It SHALL leave out the agent's replies, tool output, injected instructions, background runs, and subagent chats; replace every non-empty `.env` value and known token pattern with a placeholder; and cap the total length of what one read prints. With no recent chats, it SHALL say so and succeed.

#### Scenario: Chats with a key in them

- **WHEN** a recent chat holds a message with a GitHub token and an agent reply
- **THEN** the read shows the person's message with a placeholder for the token, and no agent reply

#### Scenario: A computer with no chats

- **WHEN** the read runs where no Claude Code or Codex chat is newer than 30 days
- **THEN** it prints that it found no recent chats and exits successfully

#### Scenario: A long history read in parts

- **WHEN** the read covers every chat on a computer whose chats exceed one part
- **THEN** it reports the number of parts and the dates they span, and the parts together show each chat once, newest first, with a chat older than 30 days included
