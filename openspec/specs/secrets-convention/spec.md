# secrets-convention Specification

## Purpose
TBD - created by archiving change secrets-convention. Update Purpose after archive.
## Requirements

### Requirement: A stack-neutral secrets-example convention ships in the payload

WongStack SHALL ship a stack-neutral secrets convention: a committed `.env.example` template that documents each expected variable with an inline comment (what it is, where to get it), and real secrets files that are git-ignored. The convention SHALL NOT couple to any build gate, preview URL, or platform tool (no Workers Builds, wrangler, or Cloudflare assumptions) — it is documentation of a pattern, not machinery.

#### Scenario: The example template is committed and the real files are ignored

- **WHEN** a repo adopts the convention
- **THEN** `.env.example` (documented placeholders) is committed and the real secrets files (`.env`, `.env.local`, and stack variants) are listed in `.gitignore`

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

The payload's `WONG-STACK` block SHALL tell agents that credentials and config already live in the repo's environment files, naming `.env.example` as the committed map of every variable the project reads and the git-ignored `.env` as where the filled-in values sit when a task needs to run something. The guidance SHALL be stack-neutral — naming `.env` at the repo root as the default while allowing a stack's own dotenv equivalent — since the convention is offered, not forced, and a target may have renamed the files. It SHALL link the wiki's secrets page rather than restating it, and SHALL NOT hard-link `.env.example`, which a target may have declined to seed.

#### Scenario: An agent finds the credentials without drilling through the wiki

- **WHEN** an agent reads the repo's `CLAUDE.md`/`AGENTS.md` before running a one-off script that needs an API credential
- **THEN** the `WONG-STACK` block names `.env.example` as the map of available variables and the git-ignored `.env` as the source of values
- **AND** the agent neither asks the user for a token nor stubs the call out when the value is already present

#### Scenario: The guidance survives being lifted into a target that renamed its dotenv file

- **WHEN** the block is copied verbatim into a target repo that uses `.dev.vars` or a framework's own dotenv file, or that declined the `.env.example` seed
- **THEN** the wording still reads true, because it names `.env` as the default while allowing the stack's equivalent
- **AND** it contains no link that resolves to a file the target does not have

#### Scenario: The block defers to the wiki page for detail

- **WHEN** a reader wants the full convention — why real secrets stay out of git, how the template stays the source-of-truth list, how to bootstrap a local file
- **THEN** the block links the wiki secrets page instead of duplicating its content

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
