# secrets-convention Specification

## Purpose

Keep credentials out of git while every clone knows what it needs: a committed, values-blank `.env.example` names each variable, and real values live in git-ignored files at the primary worktree that every linked worktree and skill reads.

## Requirements

### Requirement: The example names every variable and holds no value

A repo SHALL commit a `.env.example` that lists every variable the project reads, blank, with what it is and where to get it, and SHALL git-ignore the real secrets files. Adding a secret SHALL add its blank declaration to the active branch's example; rotating a value SHALL leave the example alone unless the variable's name, purpose, or sourcing changed.

#### Scenario: A new secret

- **WHEN** an agent adds a secret while working on a change
- **THEN** the real value goes only to the ignored live file, and the active branch's example gains the blank name with its guidance

#### Scenario: A rotated value

- **WHEN** an existing secret's value rotates and nothing else about it changes
- **THEN** only the ignored live value changes and the committed example stays untouched

### Requirement: The ignore rules exist before any secret is accepted

Setup SHALL write ignore rules for the `.env*` and `.dev.vars*` families, with their `.example` exceptions, unconditionally and before it accepts any secret. No optional later step SHALL be needed for that protection.

#### Scenario: A fresh folder

- **WHEN** setup is about to accept a Cloudflare token in a folder with no `.gitignore`
- **THEN** Git already ignores `.env` and `.dev.vars` there, and setup stops without the token if it cannot prove that

#### Scenario: Rules already present

- **WHEN** the repo's `.gitignore` already covers both families
- **THEN** nothing is added and nothing is asked

### Requirement: Agents find credentials without asking

The `WONG-STACK` block SHALL tell agents that `.env.example` is the map of variables and the primary worktree's git-ignored `.env` (or the stack's equivalent) holds the values, and SHALL link the wiki's secrets page rather than restate it. The wording SHALL stay true in a target that renamed its dotenv file, and SHALL NOT link a file the target may not have.

#### Scenario: A task needs a token

- **WHEN** an agent runs a script that needs a credential already present in `.env`
- **THEN** it uses that value and neither asks the person for it nor stubs the call

### Requirement: Real values persist in the primary worktree

WongStack SHALL treat the primary worktree's ignored live files (`.env`, `app/.dev.vars`, and their per-environment variants, each at its own path) as the durable store, found from Git metadata, never guessed. Before writing a value it SHALL prove the destination is ignored; when it cannot, it SHALL stop without accepting the secret.

#### Scenario: Saved from a linked worktree

- **WHEN** a value is saved while working in a linked worktree
- **THEN** it lands in the primary worktree's file, and deleting the linked worktree does not lose it

#### Scenario: Safety cannot be proven

- **WHEN** the destination is not ignored or the primary worktree cannot be resolved
- **THEN** the workflow stops before writing, names the condition to fix, and prints no credential

### Requirement: Branch edits reach the primary by kind

A new linked worktree SHALL get a branch copy of each primary live file, with a baseline of key names and value hashes kept outside the working tree. An added key or a rotated value SHALL reach the primary at once; a deleted key or a branch-only value SHALL reach it only after `/ship` merges, applying only what the branch changed. A failed promotion SHALL NOT fail a ship whose merge succeeded.

#### Scenario: A deletion waits for the merge

- **WHEN** a branch removes `OLD_KEY` from its copy
- **THEN** the primary keeps `OLD_KEY` until the branch merges, and an abandoned branch changes nothing

#### Scenario: Both sides changed a key

- **WHEN** the branch and the primary each changed `SHARED_KEY` after the baseline
- **THEN** the primary keeps its value, and the key is named as skipped without printing either value

### Requirement: Save preserves the secrets a person named

`/save` SHALL preserve a secret the person explicitly supplied or rotated under a known name during the session, writing it to the durable store and adding a blank declaration when the name is new. It SHALL NOT guess a name for an opaque string or persist it.

#### Scenario: A named secret

- **WHEN** `/save` runs after the person gave a new `SERVICE_TOKEN`
- **THEN** the value is in the primary worktree's ignored file and the example declares `SERVICE_TOKEN` blank

#### Scenario: An unnamed string

- **WHEN** the conversation holds a token-shaped value nobody named as a secret
- **THEN** `/save` does not guess a name or store it

### Requirement: No secret value leaves the ignored files

No secret value SHALL appear in a tracked file, plan, note, log, commit message, pull request, or output; reports SHALL name paths and keys only. Duplicate unseeded live files SHALL be preserved and reported, never compared in output, overwritten, or merged.

#### Scenario: A value leaked into a tracked file

- **WHEN** `/save` finds a handled secret value in a staged diff or handoff artifact
- **THEN** it stops before commit and names the path without echoing the value

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, one link at a time, ending private input once every asked-for key is saved, on explicit closure, or after 10 minutes. The page SHALL offer one field for each key the agent named, and only those, and a primary action that saves entries and returns to the requesting task in one tap. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach both Workers. Only successful persistence of every requested key SHALL declare readiness and notify the originating workspace, with no value in that notification. Failed or partial saves SHALL preserve successes, keep missing or failed entries editable, and SHALL NOT declare readiness. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page and taps its save-and-continue action
- **THEN** it lands in `app/.dev.vars`, the originating workspace is notified and pushes it to both Workers, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

### Requirement: A pasted key is still saved

A key the person pastes into the chat under a known name SHALL be saved as before, and the agent SHALL say in the same reply that the key link is the safer way next time.

#### Scenario: A pasted key

- **WHEN** the person pastes a key and says it is the Maps key
- **THEN** it is saved to the right file, and the reply points to the key link without showing the key

### Requirement: Partial key input does not resume the task as ready

When a private key link requests several keys, it SHALL remain usable until all requested names have been successfully saved or the input is explicitly closed or expires. Retrying an unsuccessful completion SHALL keep earlier successful saves and SHALL send no readiness notification before every requested key is present. An explicit cancellation SHALL NOT claim that missing keys were supplied.

#### Scenario: One of two keys fails to save

- **WHEN** the person submits two requested keys and only one is saved
- **THEN** the successful row stays saved, the unsuccessful row remains editable with an error, and the chat receives no readiness notification

#### Scenario: The person corrects the remaining key

- **WHEN** the person fixes the failed row and completes the form successfully
- **THEN** the two saved keys are reported by name and one automatic completion notification is attempted for the requesting workspace
