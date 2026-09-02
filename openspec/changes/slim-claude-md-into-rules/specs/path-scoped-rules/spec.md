# path-scoped-rules Delta

## MODIFIED Requirements

### Requirement: The payload ships path-scoped rules in the core category

The payload SHALL include a `.claude/rules/` directory (real path `.agents/rules/` in this repo, reached through the `.claude` symlink) as a core, copy-if-absent category on the payload manifest. Each rule file SHALL carry YAML frontmatter with a `paths:` list of glob patterns, so an agent loads it only when reading files those patterns match. Five rules SHALL ship:

- `code.md`, scoped to the code surfaces (`app/**`, `scripts/**`, `.github/workflows/**`)
- `wiki.md`, scoped to `wiki/**`
- `notes.md`, scoped to `notes/**`
- `openspec.md`, scoped to `openspec/**`
- `secrets.md`, scoped to the env surfaces (`.env*`, `**/.env.example`)

A target repo that already has any of these files SHALL keep its own copy untouched, per the sync's existing local-authorship rule.

#### Scenario: An agent edits code

- **WHEN** an agent reads or edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the `code.md` rule is in its context before the edit
- **AND** a session that touches no matching file never loads it

#### Scenario: An agent touches the wiki or notes

- **WHEN** an agent reads a file under `wiki/` or `notes/`
- **THEN** the matching rule imports the owning convention pages into context for that surface

#### Scenario: An agent works inside an OpenSpec change

- **WHEN** an agent reads or edits a file under `openspec/`
- **THEN** the `openspec.md` rule is in its context, stating where each kind of fact belongs across the four surfaces and that OpenSpec never runs git

#### Scenario: An agent touches an env file

- **WHEN** an agent reads or edits `.env.example` or another env surface
- **THEN** the `secrets.md` rule is in its context, pointing at the owning secrets convention

#### Scenario: A target repo receives the rules

- **WHEN** `/wong-sync` runs in a repo that lacks `.claude/rules/code.md`
- **THEN** the file is proposed as a missing payload file
- **AND** a locally authored rule of the same name is never overwritten

### Requirement: A rule is a thin importer, except for the fact it owns

A rule file SHALL NOT restate a convention another payload file owns — it SHALL name the owning doc, either importing it with Claude Code's `@path` syntax or linking it, keeping each rule short. `@`-imports load at launch (Claude Code expands imports eagerly); a rule SHALL therefore `@`-import only conventions worth holding in every session, and link the rest for the agent to read when the rule fires. Where a rule states a fact no other file owns, the rule file itself SHALL be that fact's single owner. Specifically:

- `code.md` SHALL own the write-less-code standard — the least code that does the job and none that doesn't; decompose branchy code into named helpers as it is written; prefer surgical edits over file rewrites; verify with the project's own checks after substantive edits; no `any`, and `unknown` only where it is narrowed before use — and SHALL state that the numeric limits are enforced by the repo's CI gates, not by the agent's memory.
- `wiki.md` SHALL import the wiki style and voice pages and restate nothing from them.
- `notes.md` SHALL import the notes convention and restate nothing from it.
- `openspec.md` SHALL own the cross-surface routing rule in rule form — a fact about why a change is shaped its way goes to the change's Decision log, session context to the note, reusable process to the wiki — and SHALL restate no surface's own convention.
- `secrets.md` SHALL link the secrets convention page and restate nothing from it beyond the one-line reason to read it.

#### Scenario: A rule names an owned convention

- **WHEN** a rule needs the reader to follow a convention another file owns
- **THEN** it imports or links the owning file rather than restating its scope or exceptions

#### Scenario: The code rule states the standard

- **WHEN** an agent loads `code.md`
- **THEN** the write-less-code standard is stated there in full, because no other file owns it
- **AND** every numeric limit is attributed to the CI gate that enforces it, not restated as a number the agent must track

## ADDED Requirements

### Requirement: Meta-only rules stay out of the manifest

The meta-repo MAY keep rules in `.claude/rules/` that guide work on WongStack itself and are not payload. `payload.md` SHALL be such a rule: scoped to the payload surfaces, it SHALL own the working-on-WongStack conventions that CLAUDE.md's meta half previously carried — editing the payload is a release (VERSION bump, newest-first CHANGELOG entry, `node scripts/check-payload-links.mjs` passes), a template or fragment is code and never a `docs(...)` commit, skills reference files by repo-relative path, and a git-fronting skill keeps its OpenSpec step intact. A meta-only rule SHALL NOT be listed in `payload-files.json`, so `/wong-sync` never proposes it to a target.

#### Scenario: A target repo never receives a meta-only rule

- **WHEN** `/wong-sync` reads the manifest in a target repo
- **THEN** `payload.md` is not among the files it may copy

#### Scenario: The release ritual surfaces at edit time

- **WHEN** an agent in this repo edits a payload file
- **THEN** `payload.md` is in its context, carrying the release ritual and the template-is-code rule
