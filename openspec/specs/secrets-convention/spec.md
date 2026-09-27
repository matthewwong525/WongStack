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
