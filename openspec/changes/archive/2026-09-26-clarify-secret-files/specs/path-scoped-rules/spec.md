## MODIFIED Requirements

### Requirement: The payload ships path-scoped rules in the core category

The payload SHALL include a `.claude/rules/` directory (real path `.agents/rules/` in this repo, reached through the `.claude` symlink) as a core, copy-if-absent category on the payload manifest. Each rule file SHALL carry YAML frontmatter with a `paths:` list of glob patterns, so an agent loads it only when reading files those patterns match. Four rules SHALL ship:

- `code.md`, scoped to the code surfaces (`app/**`, `scripts/**`, `.github/workflows/**`)
- `wiki.md`, scoped to `wiki/**`
- `openspec.md`, scoped to `openspec/**`
- `secrets.md`, scoped to the secrets surfaces (`.env*`, `**/.env.example`, `**/.dev.vars*`)

A target repo that already has any of these files SHALL keep its own copy untouched, per the sync's existing local-authorship rule.

#### Scenario: An agent edits code

- **WHEN** an agent reads or edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the `code.md` rule is in its context before the edit
- **AND** a session that touches no matching file never loads it

#### Scenario: An agent touches the wiki or notes

- **WHEN** an agent reads a file under `wiki/`
- **THEN** the matching rule imports the owning convention pages into context for that surface
- **AND** no rule loads for session context, because facts live in the memory store and not under `notes/`

#### Scenario: An agent works inside an OpenSpec change

- **WHEN** an agent reads or edits a file under `openspec/`
- **THEN** the `openspec.md` rule is in its context, stating where each kind of fact belongs across the four surfaces and that OpenSpec never runs git

#### Scenario: An agent touches an env file

- **WHEN** an agent reads or edits `.env.example`, `app/.dev.vars`, or another secrets surface
- **THEN** the `secrets.md` rule is in its context, pointing at the owning secrets convention

#### Scenario: A target repo receives the rules

- **WHEN** `/wong-sync` runs in a repo that lacks `.claude/rules/code.md`
- **THEN** the file is proposed as a missing payload file
- **AND** a locally authored rule of the same name is never overwritten

### Requirement: A rule is a thin importer, except for the fact it owns

A rule file SHALL NOT restate a convention another payload file owns — it SHALL name the owning doc, either importing it with Claude Code's `@path` syntax or linking it, keeping each rule short. `@`-imports load at launch (Claude Code expands imports eagerly); a rule SHALL therefore `@`-import only conventions worth holding in every session, and link the rest for the agent to read when the rule fires. Where a rule states a fact no other file owns, the rule file itself SHALL be that fact's single owner. Specifically:

- `code.md` SHALL own the write-less-code standard — the least code that does the job and none that doesn't; decompose branchy code into named helpers as it is written; prefer surgical edits over file rewrites; verify with the project's own checks after substantive edits; no `any`, and `unknown` only where it is narrowed before use — and SHALL state that the numeric limits are enforced by the repo's CI gates, not by the agent's memory.
- `wiki.md` SHALL import the wiki style and voice pages and restate nothing from them.
- `openspec.md` SHALL own the cross-surface routing rule in rule form — a fact about why a change is shaped its way goes to the change's Decision log, session context to facts in the memory store, reusable process to the wiki — and SHALL restate no surface's own convention.
- `secrets.md` SHALL name, in one line each, which live file holds which role — the root `.env` for the credentials that tools use to reach the platform, the stack's runtime file (`app/.dev.vars`) for the secrets the app reads — and link the page that owns the full table. It SHALL instruct the agent, at edit time, how each kind of edit reaches the primary worktree: an add or a rotation goes to both the worktree copy and the primary now; a deletion or a branch-only value stays in the worktree copy until `/ship` promotes it after the merge. It SHALL link the secrets convention page for how, and restate nothing else from those pages.

#### Scenario: A rule names an owned convention

- **WHEN** a rule needs the reader to follow a convention another file owns
- **THEN** it imports or links the owning file rather than restating its scope or exceptions

#### Scenario: The code rule states the standard

- **WHEN** an agent loads `code.md`
- **THEN** the write-less-code standard is stated there in full, because no other file owns it
- **AND** every numeric limit is attributed to the CI gate that enforces it, not restated as a number the agent must track

#### Scenario: The secrets rule routes an edit

- **WHEN** an agent in a linked worktree is about to add, rotate, or delete a value in `.env` or `app/.dev.vars`
- **THEN** the `secrets.md` rule in its context tells it which of the two files the value belongs in
- **AND** it tells the agent to write an add or a rotation to the primary as well, and to keep a deletion in the worktree copy until the merge
