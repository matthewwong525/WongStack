## MODIFIED Requirements

### Requirement: A docs page documents the convention

The wiki SHALL include a page describing the secrets-example convention — why real secrets stay out of git, how the `.example` file stays the source-of-truth list of variables, and how a contributor bootstraps a local secrets file from it. In the WongStack repo that page is `wiki/development/secrets.md`; in a target it sits at that repo's resolved wiki root (`wiki/`, falling back to `docs/`). The page SHALL follow the progressive-disclosure rulebook (topic title, strong opener, linked up/down/sideways) and be registered in the development section README.

#### Scenario: The wiki explains the convention

- **WHEN** a contributor looks for how secrets are handled
- **THEN** a wiki page explains the `.env.example`-as-source-of-truth pattern and how to bootstrap a local file
- **AND** the development section README links it

### Requirement: The installer offers the convention without forcing it

`wong-setup` SHALL offer to seed the convention into a target repo — the `secrets.md` page (at the target's resolved wiki root) plus, on confirmation, an `.env.example` and the git-ignore entries for real secrets files. It SHALL confirm before touching `.gitignore` or adding the example, since the target may already handle secrets its own way.

#### Scenario: Installer seeds on opt-in

- **WHEN** `wong-setup` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example` and the `.gitignore` entries; if the user declines, it leaves them untouched
