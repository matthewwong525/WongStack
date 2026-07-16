## ADDED Requirements

### Requirement: A stack-neutral secrets-example convention ships in the payload

WongStack SHALL ship a stack-neutral secrets convention: a committed `.env.example` template that documents each expected variable with an inline comment (what it is, where to get it), and real secrets files that are git-ignored. The convention SHALL NOT couple to any build gate, preview URL, or platform tool (no Workers Builds, wrangler, or Cloudflare assumptions) — it is documentation of a pattern, not machinery.

#### Scenario: The example template is committed and the real files are ignored

- **WHEN** a repo adopts the convention
- **THEN** `.env.example` (documented placeholders) is committed and the real secrets files (`.env`, `.env.local`, and stack variants) are listed in `.gitignore`

#### Scenario: The convention names no platform

- **WHEN** a reader reviews the shipped `.env.example` and its docs page
- **THEN** neither requires Cloudflare, Workers Builds, wrangler, or a preview URL to function

### Requirement: A docs page documents the convention

The `docs/` wiki SHALL include a page describing the secrets-example convention — why real secrets stay out of git, how the `.example` file stays the source-of-truth list of variables, and how a contributor bootstraps a local secrets file from it. The page SHALL follow the progressive-disclosure rulebook (topic title, strong opener, linked up/down/sideways) and be registered in the development section README.

#### Scenario: The wiki explains the convention

- **WHEN** a contributor looks for how secrets are handled
- **THEN** a docs page explains the `.env.example`-as-source-of-truth pattern and how to bootstrap a local file
- **AND** the development section README links it

### Requirement: The installer offers the convention without forcing it

`install-wong-stack` SHALL offer to seed the convention into a target repo — the `secrets.md` page (with `docs/`) plus, on confirmation, an `.env.example` and the git-ignore entries for real secrets files. It SHALL confirm before touching `.gitignore` or adding the example, since the target may already handle secrets its own way.

#### Scenario: Installer seeds on opt-in

- **WHEN** `install-wong-stack` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example` and the `.gitignore` entries; if the user declines, it leaves them untouched
