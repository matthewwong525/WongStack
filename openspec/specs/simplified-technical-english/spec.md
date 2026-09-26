# Simplified Technical English Specification

## Purpose

Define how WongStack agents apply ASD-STE100 Simplified Technical English without changing text that must remain exact.

## Requirements

### Requirement: Best-effort Simplified Technical English
The generic WongStack doctrine SHALL instruct agents to always use ASD-STE100 Simplified Technical English for user-facing prose and documentation. The doctrine SHALL state that best-effort compliance is sufficient when the full standard or its controlled vocabulary is not available.

#### Scenario: Agent writes ordinary prose
- **WHEN** an agent writes or edits user-facing prose or documentation under the WongStack doctrine
- **THEN** the agent uses ASD-STE100 Simplified Technical English to the best of its ability

#### Scenario: Formal verification is not available
- **WHEN** the repository does not provide the full ASD-STE100 rules or an approved vocabulary
- **THEN** the agent applies the instruction as a best-effort writing rule and does not claim verified conformance

### Requirement: Exact technical text stays exact
The doctrine MUST exempt code, commands, identifiers, quotations, and prescribed text that must keep an exact form from Simplified Technical English rewriting.

#### Scenario: Prose contains exact text
- **WHEN** user-facing prose includes code, a command, an identifier, a quotation, or prescribed wording
- **THEN** the agent keeps that text exact while it applies Simplified Technical English to the surrounding prose

### Requirement: Chat replies are short

The `WONG-STACK` block SHALL tell the agent to answer in chat in a few lines, and to give more detail only when the person asks. This SHALL NOT shorten the content that a verb's own reply format requires, such as a closing report or a question.

#### Scenario: A simple question

- **WHEN** the person asks which branch a change is on
- **THEN** the reply is a few lines, with no extra background
