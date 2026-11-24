## ADDED Requirements

### Requirement: WongStack ships as one stack

The source and every install SHALL hold each command as one real folder in the skills folder, with no plugin folder, no folder link, and no module that can be added alone. WongStack SHALL have one version, and the project's own settings SHALL be the only list of its hooks, each hook running once. No shipped code SHALL reach another part through a profile or slot file; it SHALL call that part directly. An update SHALL move an older install to this layout, keep every file the install owns, and leave no old module file behind.

#### Scenario: A chat in a new workspace

- **WHEN** a person opens a chat in a new workspace of an install, trusted folder or not, and asks for a schedule
- **THEN** the memory digest and Daily's start check run once each, `/schedule` loads once by its bare name, and no plugin or module is listed

#### Scenario: An older install updates

- **WHEN** an install on 61.x, with its own Daily team page and an edit to a memory script, takes the update
- **THEN** each command sits in its own skills folder, no profile, module version, setup guide, or module hook file is left, the team page is unchanged, and the script edit is kept or named as a clash

## REMOVED Requirements

### Requirement: A module's docs link nothing outside the module by a relative path

**Reason**: WongStack ships as one stack; no part is added, set up, or updated alone.
**Migration**: Use WongStack whole; `/wong-sync` updates every part together.

### Requirement: Each module command loads in every chat of an install

**Reason**: Replaced by "WongStack ships as one stack": each command is its own folder in the source too.
**Migration**: None; commands keep their bare names.

### Requirement: No module loads as a plugin

**Reason**: Replaced by "WongStack ships as one stack", which keeps the no-plugin and run-once-from-settings promise without modules.
**Migration**: None.
