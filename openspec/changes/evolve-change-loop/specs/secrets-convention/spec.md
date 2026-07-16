## ADDED Requirements

### Requirement: A stack-neutral secrets-example convention ships in the payload

WongStack SHALL ship a stack-neutral secrets convention: a committed `.env.example` template that documents each expected variable with an inline comment (what it is, where to get it), and a real secrets file that is git-ignored. The convention SHALL NOT couple to any build gate, preview URL, or platform tool (no Workers Builds, wrangler, or Cloudflare assumptions) — it is documentation of a pattern, not machinery.

#### Scenario: The example template is committed and the real file is ignored

- **WHEN** a repo adopts the convention
- **THEN** `.env.example` (documented placeholders) is committed and the real secrets file is listed in `.gitignore`

#### Scenario: The convention names no platform

- **WHEN** a reader reviews the shipped `.env.example` and its docs page
- **THEN** neither references Cloudflare, Workers Builds, wrangler, or a preview URL

### Requirement: A docs page documents the convention

The `docs/` wiki SHALL include a page describing the secrets-example convention — why real secrets stay out of git, how the `.example` file stays in sync as the source-of-truth list of variables, and how a contributor bootstraps a local secrets file from it. The page SHALL follow the progressive-disclosure rulebook (topic title, strong opener, linked up/down/sideways).

#### Scenario: The wiki explains the convention

- **WHEN** a contributor looks for how secrets are handled
- **THEN** a docs page explains the `.env.example`-as-source-of-truth pattern and how to bootstrap a local file
