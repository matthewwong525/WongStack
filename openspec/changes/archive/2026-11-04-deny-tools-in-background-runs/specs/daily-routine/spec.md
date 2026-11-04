## ADDED Requirements

### Requirement: An install can deny tools to its background jobs

An install SHALL be able to name, in its list of background jobs, tool patterns that no background job of the daily may use. Each run the daily's worker starts for a timed job or an event SHALL get that list, and the AI tool SHALL refuse those tools in that run. A morning routine opens its own chat, not a background run, and SHALL NOT be covered by the list. A list that is not a list of patterns SHALL be a bad entry, as any other. When the install's AI tool can not refuse tools by such a pattern, the worker SHALL start no background run while the list is set, and SHALL write why in the journal.

#### Scenario: A send command is denied

- **WHEN** an install's list denies `Bash(*send-approved*)` and a timed job's run starts with Claude Code
- **THEN** that run can not use a command matching `*send-approved*`, and its other tools work as before

#### Scenario: Codex with a deny list

- **WHEN** an install's list has a `deny` list and the person's runs use Codex
- **THEN** no background run starts, and the journal says the deny list works only with Claude Code
