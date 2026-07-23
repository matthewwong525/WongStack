## ADDED Requirements

### Requirement: WongStack's own wiki lives at `wiki/`

The WongStack repo's progressive-disclosure wiki SHALL live at `wiki/` at the repo root — the same name the payload tells every target repo to use. The tree SHALL be moved with `git mv` so history follows each page, and no page's content SHALL change except for path references.

#### Scenario: The source repo uses the name it teaches

- **WHEN** someone clones WongStack
- **THEN** the wiki is at `wiki/` (hub `wiki/README.md`, rulebook `wiki/wiki-style.md`, plus `voice.md`, `ux-principles.md`, and the `development/` section)
- **AND** no `docs/` directory remains at the repo root

#### Scenario: History survives the move

- **WHEN** the rename lands
- **THEN** each page was moved with `git mv`, so `git log --follow` still reaches its earlier revisions

### Requirement: The wiki-root resolution rule is unchanged

The skills SHALL continue to resolve a repo's wiki root generically — `wiki/` if present, otherwise `docs/`. This change SHALL NOT narrow that rule to `wiki/` only. A target repo that installed WongStack before the rename and kept its wiki at `docs/` SHALL keep working with no action from its owner.

#### Scenario: An un-renamed target still works

- **WHEN** `/dream` or `/improve docs` runs in a target repo whose wiki is still at `docs/`
- **THEN** it resolves the wiki root to `docs/` and behaves exactly as before

#### Scenario: Convention pages sync to the resolved root

- **WHEN** `/wong-sync` syncs the convention pages (`wiki-style.md`, `voice.md`, `development/secrets.md`, and `ux-principles.md` in UI-bearing repos) into a target
- **THEN** it places them at that target's resolved wiki root, not at a hardcoded `wiki/`

### Requirement: No payload file hardcodes `docs/` as the wiki root

Every live payload file — the skills under `.claude/skills/`, `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the wiki pages themselves — SHALL refer to WongStack's own wiki pages by their `wiki/` paths, and SHALL refer to a *target's* wiki generically (the resolved wiki root) rather than as `docs/`. Every intra-repo link to a moved page SHALL resolve.

#### Scenario: Repo-wide link check

- **WHEN** the repo is grepped for `docs/` outside `CHANGELOG.md` and `openspec/changes/archive/`
- **THEN** the only remaining hits are generic fallback mentions (`wiki/`, falling back to `docs/`), unrelated paths (e.g. `docs/adr/` globs in `improve`), and the `docs` variant name of `/improve docs`

#### Scenario: Relative skill links resolve

- **WHEN** `plan/SKILL.md` and `dream/SKILL.md` link the rulebook and `ux-principles.md` by relative path
- **THEN** those paths point at files that exist under `wiki/`

### Requirement: The rename is a payload release

The rename SHALL follow the payload release ritual: a semver `VERSION` bump and a newest-first `CHANGELOG.md` entry explaining the move, the unchanged fallback, and that no installed repo needs to act. Historical `CHANGELOG.md` entries and archived changes under `openspec/changes/archive/` SHALL NOT be rewritten — they record what shipped at the paths that existed then.

#### Scenario: Updater can explain the change

- **WHEN** a target repo runs `/wong-sync` after this release
- **THEN** the CHANGELOG entry tells its owner the source wiki moved, that the fallback still holds, and that renaming their own `docs/` is optional

#### Scenario: History is left alone

- **WHEN** the change is implemented
- **THEN** no entry under `openspec/changes/archive/` and no pre-existing CHANGELOG section has its `docs/` paths rewritten
