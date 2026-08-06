## ADDED Requirements

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

## MODIFIED Requirements

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
