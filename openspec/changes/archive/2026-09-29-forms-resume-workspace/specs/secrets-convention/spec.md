# Spec Delta

## MODIFIED Requirements

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, one link at a time, ending private input once every asked-for key is saved, on explicit closure, or after 10 minutes. The page SHALL offer one field for each key the agent named, and only those, and a primary action that saves entries and returns to the requesting task in one tap. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach both Workers. Only successful persistence of every requested key SHALL declare readiness and notify the originating workspace, with no value in that notification. Failed or partial saves SHALL preserve successes, keep missing or failed entries editable, and SHALL NOT declare readiness. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page and taps its save-and-continue action
- **THEN** it lands in `app/.dev.vars`, the originating workspace is notified and pushes it to both Workers, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

## ADDED Requirements

### Requirement: Partial key input does not resume the task as ready

When a private key link requests several keys, it SHALL remain usable until all requested names have been successfully saved or the input is explicitly closed or expires. Retrying an unsuccessful completion SHALL keep earlier successful saves and SHALL send no readiness notification before every requested key is present. An explicit cancellation SHALL NOT claim that missing keys were supplied.

#### Scenario: One of two keys fails to save

- **WHEN** the person submits two requested keys and only one is saved
- **THEN** the successful row stays saved, the unsuccessful row remains editable with an error, and the chat receives no readiness notification

#### Scenario: The person corrects the remaining key

- **WHEN** the person fixes the failed row and completes the form successfully
- **THEN** the two saved keys are reported by name and one automatic completion notification is attempted for the requesting workspace
