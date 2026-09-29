## ADDED Requirements

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, one link at a time, closing on *Done*, once every asked-for key is saved, or after 10 minutes. The page SHALL offer one field for each key the agent named, and only those. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach both Workers. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page
- **THEN** it lands in `app/.dev.vars` and reaches both Workers, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

### Requirement: A pasted key is still saved

A key the person pastes into the chat under a known name SHALL be saved as before, and the agent SHALL say in the same reply that the key link is the safer way next time.

#### Scenario: A pasted key

- **WHEN** the person pastes a key and says it is the Maps key
- **THEN** it is saved to the right file, and the reply points to the key link without showing the key
