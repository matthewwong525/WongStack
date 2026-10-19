## MODIFIED Requirements

### Requirement: The philosophy names where knowledge lives

The philosophy page SHALL name each durable surface (agent instructions, path-scoped rules, the wiki, active and archived changes, the memory store, and skills), say what each owns, and link each deeper process rather than restate it. It SHALL present Claude Code as one way to run WongStack: any agent that reads and edits files, runs commands, and follows the skill runbooks can do the work. It SHALL order where new guidance goes by what it costs each chat, with always-loaded text last and paid for by a cut, and SHALL reserve a hook for a repeated mechanical mistake a script can spot in the moment, leaving judgment calls to written rules.

#### Scenario: Reader finds where knowledge lives

- **WHEN** a reader reviews the philosophy page
- **THEN** they can tell where process, plans, shipped records, session context, and agent actions live, each with a link

#### Scenario: A new rule looks for its home

- **WHEN** a maintainer wants to add a rule that applies only when a skill runs
- **THEN** the page sends it to that skill or a page it opens, not to the always-loaded instructions
