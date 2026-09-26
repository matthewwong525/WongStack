# secrets-convention Specification

## Purpose
TBD - created by archiving change secrets-convention. Update Purpose after archive.
## Requirements

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

### Requirement: A docs page documents the convention

The wiki SHALL include a page describing the secrets-example convention — why real secrets stay out of git, how the `.example` file stays the source-of-truth list of variables, and how a contributor bootstraps a local secrets file from it. In the WongStack repo that page is `wiki/development/secrets.md`; in a target it sits at that repo's resolved wiki root (`wiki/`, falling back to `docs/`). The page SHALL follow the progressive-disclosure rulebook (topic title, strong opener, linked up/down/sideways) and be registered in the development section README.

#### Scenario: The wiki explains the convention

- **WHEN** a contributor looks for how secrets are handled
- **THEN** a docs page explains the `.env.example`-as-source-of-truth pattern and how to bootstrap a local file
- **AND** the development section README links it

### Requirement: The installer offers the convention without forcing it

`wong-setup` SHALL offer to seed the convention into a target repo — the `secrets.md` page (at the target's resolved wiki root) plus, on confirmation, an `.env.example`. It SHALL confirm before adding the example, since the target may already handle secrets its own way.

The `.gitignore` entries are **not** part of that offer: they are written
unconditionally, because declining a convention is a choice about documentation and
leaving credentials committable is not.

#### Scenario: Installer seeds on opt-in

- **WHEN** `wong-setup` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example`; if the user declines, it leaves the example untouched

#### Scenario: Declining does not disable the ignore rule

- **WHEN** the user declines the convention entirely
- **THEN** the `.gitignore` entries are written anyway and the decline is honoured for everything else

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

### Requirement: Real values persist in one worktree-safe local store

For a repository with linked Git worktrees, WongStack SHALL treat the primary worktree's ignored live secrets files as the durable local source of real values. This SHALL cover every live secrets file, not only the root `.env`: a stack's runtime file such as `app/.dev.vars` and per-environment variants such as `.dev.vars.staging` persist in the primary worktree at the same path relative to the repo root. It SHALL resolve the primary worktree from Git metadata rather than directory naming conventions. Before writing a value it SHALL prove the destination is ignored; if safety or the primary worktree cannot be resolved, it SHALL stop without accepting or writing the secret. Repositories with only one worktree SHALL continue using their existing live files.

A linked worktree MAY hold a **seeded branch copy** of each live file — a copy made from the primary when the worktree was created, with a recorded baseline. A seeded copy is the branch's working copy, not a duplicate to reconcile; the rules for how its edits reach the primary are in the branch-copy requirement.

#### Scenario: A secret is saved from a linked worktree

- **WHEN** a workflow receives or rotates a secret while running in a linked worktree
- **THEN** it writes the value to the primary worktree's ignored live file
- **AND** deleting the linked worktree does not delete the saved credential

#### Scenario: A Worker secret is saved from a linked worktree

- **WHEN** an agent in a linked worktree adds a value to `app/.dev.vars`
- **THEN** the value also lands in the primary worktree's `app/.dev.vars`
- **AND** the root `.env` is not used for it

#### Scenario: A normal checkout retains its existing behavior

- **WHEN** the active checkout is the primary and only worktree
- **THEN** the durable live files are the existing files in that checkout
- **AND** no alternate directory or duplicate file is introduced

#### Scenario: Destination safety cannot be proven

- **WHEN** Git does not ignore the resolved durable live file or the primary worktree cannot be resolved
- **THEN** the workflow stops before requesting or writing a real value
- **AND** it identifies the local safety condition to fix without printing a credential

#### Scenario: A linked worktree already has a separate live file

- **WHEN** the durable file and a linked worktree-local regular file with no recorded baseline both exist
- **THEN** the workflow preserves both files, prefers the durable file for WongStack consumers, and reports that reconciliation is needed
- **AND** it neither compares values in output nor silently overwrites, deletes, or bulk-merges either file

#### Scenario: Checkout-local tooling needs the conventional path

- **WHEN** a stack requires the live environment file inside a linked checkout and the worktree was not seeded
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

### Requirement: The ignore rule exists before the page that promises it

The `.gitignore` entries covering the real secrets files SHALL be in place by the
end of `wong-setup`, unconditionally — before `secrets.md` (which arrives in the
same run) can be read and acted on.

`secrets.md` states that `.env` *"is listed in `.gitignore` (alongside common
variants like `.env.local` and `.dev.vars`) so it can't be committed by accident"*
and links to that file. In a fresh install neither the entries nor the file exist:
the promise is false at the exact moment it is made, and the page's own
`cp .env.example .env` instruction produces an unignored file full of credentials.

Applying the entries SHALL NOT depend on `/wong-cloudflare`, which is documented as
deferrable indefinitely (*"No rush; it works whenever"*) and which today is the
only thing that ever writes them. A guarantee that arrives with an optional later
step is not a guarantee.

#### Scenario: Fresh repo finishing setup

- **WHEN** `wong-setup` completes against a repo that had no `.gitignore`
- **THEN** a `.gitignore` exists carrying the wildcard-and-negation pair for both secrets families, and `git check-ignore .env` and `git check-ignore .dev.vars` both match

#### Scenario: The user declines the wider secrets convention

- **WHEN** the user declines the offered `.env.example` seed
- **THEN** the ignore entries are still written, because they protect against a mistake rather than impose a convention

#### Scenario: Repo already ignores its secrets files

- **WHEN** the repo's existing `.gitignore` already covers both families
- **THEN** nothing is added and nothing is asked

### Requirement: A branch's secret edits reach the primary by kind

WongStack SHALL ship a worktree-secrets helper with three operations, and SHALL route each kind of edit a branch makes to a live secrets file as follows.

- **Seed.** On a new linked worktree, the helper SHALL copy each primary live secrets file (`.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, excluding `*.example`, at the repo root and in each immediate subfolder) into the worktree when the worktree has no such file, and SHALL record a baseline of key names and value hashes. The baseline SHALL be stored in the worktree's private Git directory, never in the working tree, and SHALL hold no value.
- **Add and rotate now.** An added key, or a rotated value whose old value no longer works, SHALL be written to both the worktree copy and the primary at the time of the edit, so a deleted worktree cannot lose it.
- **Defer deletion and branch-only changes.** A removed key, or a value only this branch needs, SHALL be written to the worktree copy only, so `main` and other worktrees keep working until the branch merges.
- **Promote after merge.** After a successful merge, `/ship` SHALL run the helper's promote operation. It SHALL compare the worktree copy, the primary, and the baseline three ways, and apply to the primary only what the branch changed: remove a key the branch removed, and set a value the branch changed. It SHALL skip, and name, a key the primary also changed since the baseline. With no baseline it SHALL apply adds only and name every other difference. It SHALL prove the primary file is ignored before any write, edit only the affected lines, and never regenerate the file. A promote failure SHALL NOT fail a ship whose merge already succeeded.
- **Names only.** Every operation's output SHALL carry file paths and key names, never a value.

#### Scenario: A new worktree has both files

- **WHEN** a linked worktree is created and the primary has `.env` and `app/.dev.vars`
- **THEN** after `seed` the worktree has a copy of each, and a baseline exists outside the working tree
- **AND** `git status` in the worktree shows neither the copies nor the baseline

#### Scenario: A key deleted on a branch waits for the merge

- **WHEN** a branch removes `OLD_KEY` from its `app/.dev.vars` copy
- **THEN** the primary's `app/.dev.vars` still has `OLD_KEY` until the branch merges
- **AND** after `/ship` merges the branch, `promote` removes `OLD_KEY` from the primary and names it in the report

#### Scenario: A key another branch added is kept

- **WHEN** the primary gained `NEW_KEY` after this worktree was seeded, and this branch never had it
- **THEN** `promote` leaves `NEW_KEY` in the primary

#### Scenario: Both sides changed the same key

- **WHEN** the branch and the primary each changed `SHARED_KEY` after the baseline, to different values
- **THEN** `promote` leaves the primary's value, names `SHARED_KEY` as skipped, and prints no value

#### Scenario: An abandoned branch changes nothing

- **WHEN** a worktree with deferred deletions is removed without a merge
- **THEN** the primary files are unchanged

#### Scenario: Save persists an add to both copies

- **WHEN** `/save` persists a secret the user supplied during the session, in a seeded linked worktree
- **THEN** the value is written to the primary and to the worktree copy
- **AND** `/save` does not report the seeded copy as a duplicate to reconcile
