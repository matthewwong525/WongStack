## REMOVED Requirements

### Requirement: Best-effort Simplified Technical English
**Reason**: STE100 made messages stiff and long for the non-technical people WongStack now serves first.
**Migration**: Follow the new "Messages are short and plain" requirement and `wiki/voice.md`. Existing prose stays until it is next edited.

## ADDED Requirements

### Requirement: Messages are short and plain

The `WONG-STACK` block SHALL tell the agent to keep user-facing messages and prose short and plain: the point first, a few lines in chat, and everyday words. The rule SHALL link `wiki/voice.md`, which owns how the rule reads in practice. The agent SHALL name git, OpenSpec, CI, or a verb only when the person asks or must act on it. The block SHALL NOT tell the agent to use ASD-STE100 Simplified Technical English.

#### Scenario: A change is saved

- **WHEN** the agent reports a save to a person who did not ask about git
- **THEN** the reply says the work is saved and gives the preview link, in a few lines, without naming commits, pushes, or branches

#### Scenario: The person asks for the detail

- **WHEN** the person asks which branch or pull request holds the work
- **THEN** the agent names it exactly

#### Scenario: No STE100 rule remains

- **WHEN** a reader searches the `WONG-STACK` block and the shipped skill references for "Simplified Technical English" or "STE100"
- **THEN** there is no match

## MODIFIED Requirements

### Requirement: Exact technical text stays exact
The doctrine MUST exempt code, commands, identifiers, quotations, and prescribed text that must keep an exact form from any rewording for brevity or plain language.

#### Scenario: Prose contains exact text
- **WHEN** user-facing prose includes code, a command, an identifier, a quotation, or prescribed wording
- **THEN** the agent keeps that text exact while it shortens and simplifies the surrounding prose
