## MODIFIED Requirements

### Requirement: The wiki-root resolution rule is unchanged

WongStack SHALL continue to resolve a target repo's wiki root generically — `wiki/` if present, otherwise `docs/`. This change SHALL NOT narrow that rule to `wiki/` only. A target repo that installed WongStack before the rename and kept its wiki at `docs/` SHALL keep working with no action from its owner.

#### Scenario: An un-renamed target still works

- **WHEN** `/wong-sync` runs in a target repo whose wiki is still at `docs/`
- **THEN** it resolves the wiki root to `docs/` and behaves exactly as before

#### Scenario: Convention pages sync to the resolved root

- **WHEN** `/wong-sync` syncs the convention pages (`wiki-style.md`, `voice.md`, `development/secrets.md`, and `ux-principles.md` in UI-bearing repos) into a target
- **THEN** it places them at that target's resolved wiki root, not at a hardcoded `wiki/`

### Requirement: No payload file hardcodes `docs/` as the wiki root

Every live payload file — the skills under `.claude/skills/`, `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the wiki pages themselves — SHALL refer to WongStack's own wiki pages by their `wiki/` paths, and SHALL refer to a *target's* wiki generically (the resolved wiki root) rather than as `docs/`. Every intra-repo link to a moved page SHALL resolve.

#### Scenario: Repo-wide link check

- **WHEN** the repo is grepped for `docs/` outside `CHANGELOG.md` and `openspec/changes/archive/`
- **THEN** the only remaining hits are generic fallback mentions (`wiki/`, falling back to `docs/`) and unrelated paths

#### Scenario: Relative skill links resolve

- **WHEN** a payload skill links the rulebook or `ux-principles.md` by relative path
- **THEN** those paths point at files that exist under `wiki/`
