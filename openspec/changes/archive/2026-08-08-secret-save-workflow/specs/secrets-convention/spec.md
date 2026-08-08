## MODIFIED Requirements

### Requirement: A stack-neutral secrets-example convention ships in the payload

WongStack SHALL ship a stack-neutral secrets convention: a committed `.env.example` template that documents each expected variable with an inline comment (what it is, where to get it), and real secrets files that are git-ignored. Every declaration in the committed example SHALL remain blank; real values SHALL never be written there. Adding a new secret SHALL add its blank name and guidance to the active branch's example, while rotating an existing value SHALL leave the example unchanged unless the variable contract or guidance also changes. The convention SHALL NOT couple to any build gate, preview URL, or platform tool (no Workers Builds, wrangler, or Cloudflare assumptions) — it is documentation of a pattern, not machinery.

#### Scenario: The example template is committed and the real files are ignored

- **WHEN** a repo adopts the convention
- **THEN** `.env.example` (documented, values-blank placeholders) is committed and the real secrets files (`.env`, `.env.local`, and stack variants) are listed in `.gitignore`

#### Scenario: A new secret changes both sides of the contract

- **WHEN** an agent adds a secret variable while working on a change
- **THEN** it writes the real value only to the ignored live file and adds the blank variable name with sourcing guidance to the active branch's example
- **AND** no real value enters a committed file, output, plan, or note

#### Scenario: Rotating a value does not manufacture a template diff

- **WHEN** an existing secret value rotates without changing its name, purpose, or acquisition instructions
- **THEN** only the ignored live value changes
- **AND** the committed example remains untouched

#### Scenario: The convention names no platform

- **WHEN** a reader reviews the shipped `.env.example` and its docs page
- **THEN** neither requires Cloudflare, Workers Builds, wrangler, or a preview URL to function

### Requirement: The agent instruction block points at the secrets convention

The payload's `WONG-STACK` block SHALL tell agents that credentials and config already live in the repo's environment files, naming `.env.example` as the committed, values-blank map of every variable the project reads and the git-ignored `.env` as where filled-in values sit when a task needs to run something. It SHALL distinguish the two locations under Git worktrees: real values persist in the primary worktree's ignored file, while declarations and guidance are edited in the active branch's committed example. The guidance SHALL be stack-neutral — naming `.env` at the repo root as the default while allowing a stack's own dotenv equivalent — since the convention is offered, not forced, and a target may have renamed the files. It SHALL link the wiki's secrets page rather than restating it, and SHALL NOT hard-link `.env.example`, which a target may have declined to seed.

#### Scenario: An agent finds the credentials without drilling through the wiki

- **WHEN** an agent reads the repo's `CLAUDE.md`/`AGENTS.md` before running a one-off script that needs an API credential
- **THEN** the `WONG-STACK` block names `.env.example` as the map of available variables and the primary worktree's git-ignored `.env` as the durable source of values
- **AND** the agent neither asks the user for a token nor stubs the call out when the value is already present

#### Scenario: An agent updates a secret from a linked worktree

- **WHEN** an agent receives a new or rotated value while its active checkout is a linked worktree
- **THEN** it saves the real value in the primary worktree's ignored live file
- **AND** it adds or updates only the blank declaration and guidance in the active branch's example when the variable contract changed

#### Scenario: The guidance survives being lifted into a target that renamed its dotenv file

- **WHEN** the block is copied verbatim into a target repo that uses `.dev.vars` or a framework's own dotenv file, or that declined the `.env.example` seed
- **THEN** the wording still reads true, because it names `.env` as the default while allowing the stack's equivalent
- **AND** it contains no link that resolves to a file the target does not have

#### Scenario: The block defers to the wiki page for detail

- **WHEN** a reader wants the full convention — why real secrets stay out of git, how the template stays the source-of-truth list, how to bootstrap a local file, and how linked worktrees resolve the durable copy
- **THEN** the block links the wiki secrets page instead of duplicating its content

## ADDED Requirements

### Requirement: Real values persist in one worktree-safe local store

For a repository with linked Git worktrees, WongStack SHALL treat the primary worktree's ignored live environment file as the durable local source of real values. It SHALL resolve the primary worktree from Git metadata rather than directory naming conventions. Before writing a value it SHALL prove the destination is ignored; if safety or the primary worktree cannot be resolved, it SHALL stop without accepting or writing the secret. Repositories with only one worktree SHALL continue using their existing root live file.

#### Scenario: A secret is saved from a linked worktree

- **WHEN** a workflow receives or rotates a secret while running in a linked worktree
- **THEN** it writes the value to the primary worktree's ignored live file
- **AND** deleting the linked worktree does not delete the saved credential

#### Scenario: A normal checkout retains its existing behavior

- **WHEN** the active checkout is the primary and only worktree
- **THEN** the durable live file is the existing file at that checkout's root
- **AND** no alternate directory or duplicate file is introduced

#### Scenario: Destination safety cannot be proven

- **WHEN** Git does not ignore the resolved durable live file or the primary worktree cannot be resolved
- **THEN** the workflow stops before requesting or writing a real value
- **AND** it identifies the local safety condition to fix without printing a credential

#### Scenario: A linked worktree already has a separate live file

- **WHEN** the durable file and a linked worktree-local regular file both exist
- **THEN** the workflow preserves both files, prefers the durable file for WongStack consumers, and reports that reconciliation is needed
- **AND** it neither compares values in output nor silently overwrites, deletes, or bulk-merges either file

#### Scenario: Checkout-local tooling needs the conventional path

- **WHEN** a stack requires the live environment file inside a linked checkout
- **THEN** the guidance permits an ignored link or equivalent stack configuration pointing to the durable file after any existing duplicate is reconciled
- **AND** the link itself is never committed

### Requirement: Save checkpoints explicitly supplied session secrets

Because `/save` is the sole skill that reads the conversation, it SHALL act as the universal preservation checkpoint for a secret the user explicitly supplied or rotated with a known variable name during the session. It SHALL ensure the value is in the primary worktree's ignored live file and SHALL add or update only a blank declaration and sourcing guidance in the active branch's example when the variable contract changed. Secret-aware workflows MAY perform the same durable write earlier when they require the credential before `/save`. `/save` SHALL NOT infer credentials from token-shaped strings or write a value into any tracked file, note, plan, log, commit message, PR body, or output.

#### Scenario: A session supplied a named secret

- **WHEN** `/save` runs after the user explicitly supplied or rotated `SERVICE_TOKEN` during the session
- **THEN** the current value is preserved in the primary worktree's ignored live file before checkpointing
- **AND** durable handoff surfaces mention at most that `SERVICE_TOKEN` changed, never its value

#### Scenario: The variable is newly required

- **WHEN** the explicitly supplied secret name is absent from the active branch's committed example
- **THEN** `/save` adds a blank declaration with what-it-is and where-to-get-it guidance
- **AND** the real value appears only in the ignored durable file

#### Scenario: An opaque string has no explicit secret contract

- **WHEN** the conversation contains an opaque value that was not identified as a named secret addition or rotation
- **THEN** `/save` does not guess a variable name or persist the value

#### Scenario: A handled value leaked into a tracked surface

- **WHEN** `/save` finds a secret value it handled in a tracked example, handoff artifact, or staged diff
- **THEN** it stops before commit and identifies the affected path without echoing the value
