## MODIFIED Requirements

### Requirement: Agents find credentials without asking

The `WONG-STACK` block SHALL tell agents that `.env.example` is the map of variables and the primary worktree's git-ignored `.env` (or the stack's equivalent) holds the values for this computer's own tools, and that a business service is reached through the app, starting from the services list. It SHALL link the wiki's secrets page rather than restate it. The wording SHALL stay true in a target that renamed its dotenv file, and SHALL NOT link a file the target may not have.

#### Scenario: A task needs a token

- **WHEN** an agent runs a script that needs a credential already present in `.env`
- **THEN** it uses that value and neither asks the person for it nor stubs the call

#### Scenario: A task needs a business service

- **WHEN** an agent needs to look something up in a business service the app holds a key for
- **THEN** it lists services and calls through the app instead of reading the key from a file
