## MODIFIED Requirements

### Requirement: A typed closing choice is sent back to the question tool

In Claude Code, when a reply ends a turn with a question for the person, with or without a list of options, and that turn called no structured question tool, an installed repo SHALL send the agent back once to ask it through the tool, with a few short options and the recommended one first, or to end the turn with no new words when it needs no answer. It SHALL NOT send the same turn back twice in a row, SHALL NOT act on a background memory run, and SHALL let the turn end when it cannot read the turn. A finished plan's reply, which ends on its link with no question, SHALL end untouched.

#### Scenario: Choices typed after a report

- **WHEN** a Claude Code reply ends with `What next?` and three numbered options, and the turn made no `AskUserQuestion` call
- **THEN** the agent is sent back once and asks it through `AskUserQuestion`

#### Scenario: A report with no choices

- **WHEN** a reply ends with a list of what changed and no question, or the turn already called `AskUserQuestion`
- **THEN** the turn ends untouched

#### Scenario: A lone question typed after a report

- **WHEN** a Claude Code reply ends with "Close this chat?" and no options, and the turn made no `AskUserQuestion` call
- **THEN** the agent is sent back once and asks it through `AskUserQuestion` with a few short options
