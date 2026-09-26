# Simplified Technical English Specification

## Purpose

Define how WongStack agents keep messages short and plain, in everyday words, without changing text that must remain exact. The capability keeps its original path; ASD-STE100 was its first form.
## Requirements
### Requirement: Exact technical text stays exact
The doctrine MUST exempt code, commands, identifiers, quotations, and prescribed text that must keep an exact form from any rewording for brevity or plain language.

#### Scenario: Prose contains exact text
- **WHEN** user-facing prose includes code, a command, an identifier, a quotation, or prescribed wording
- **THEN** the agent keeps that text exact while it shortens and simplifies the surrounding prose

### Requirement: Chat replies are short

The `WONG-STACK` block SHALL tell the agent to answer in chat in a few lines, and to give more detail only when the person asks. This SHALL NOT shorten the content that a verb's own reply format requires, such as a closing report or a question.

#### Scenario: A simple question

- **WHEN** the person asks which branch a change is on
- **THEN** the reply is a few lines, with no extra background

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

