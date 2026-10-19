## ADDED Requirements

### Requirement: A typed closing choice is sent back to the question tool

In Claude Code, when a reply ends a turn with a question followed by a short list of options, or a list where an option is marked `(Recommended)`, and that turn called no structured question tool, an installed repo SHALL send the agent back once to ask those choices through the tool. It SHALL NOT send the same turn back twice in a row, SHALL NOT act on a background memory run, and SHALL let the turn end when it cannot read the turn.

#### Scenario: Choices typed after a report

- **WHEN** a Claude Code reply ends with `What next?` and three numbered options, and the turn made no `AskUserQuestion` call
- **THEN** the agent is sent back once and asks the same choices through `AskUserQuestion`

#### Scenario: A report with no choices

- **WHEN** a reply ends with a list of what changed and no question before it, or the turn already called `AskUserQuestion`
- **THEN** the turn ends untouched

### Requirement: The ask rule is restated after compaction

In Claude Code, when a session continues after its conversation is compacted, an installed repo SHALL add one line to the session saying that asks go through the structured question tool, never typed as a list while the tool is callable, and naming the rule's page.

#### Scenario: A long chat is shortened

- **WHEN** Claude Code compacts a session and resumes it
- **THEN** the resumed session receives the one-line ask reminder, and the memory digest is not reloaded
