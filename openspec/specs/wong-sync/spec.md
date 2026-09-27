# wong-sync Specification

## Purpose

Keep an installed repo current with WongStack: `/wong-sync` compares the latest source with what the repo installed, and turns any real update into an ordinary plan that ends at its review page.

## Requirements

### Requirement: A bare sync ends at a reviewable plan

When the latest source changes the repo's payload, `/wong-sync` SHALL hand the update to `/plan`, which makes an ordinary change with its review page, and a bare sync SHALL stop there without editing the repo's payload files. A request to implement or ship the update SHALL continue through that verb.

#### Scenario: Update found

- **WHEN** a person runs `/wong-sync` and the payload changed upstream
- **THEN** they get a normal plan with its review page
- **AND** no payload file in the repo has changed

#### Scenario: Person already asked to ship

- **WHEN** the person asked to implement or ship the update
- **THEN** the workflow continues through `/apply` or `/ship` with that authorization

### Requirement: A current repo gets a plain answer

When nothing the repo installed has changed upstream, sync SHALL report the repo current with the latest version, and SHALL NOT start a plan, create a change folder, or write a verdict file.

#### Scenario: Nothing to update

- **WHEN** every upstream change since the recorded commit is outside the repo's payload
- **THEN** sync reports the repo current and stops

### Requirement: Sync never guesses a result

Sync SHALL work from a freshly retrieved source, and a failed retrieval or a comparison it cannot prove SHALL be reported as an error, never as current and never as a partial plan. Retrieval SHALL NOT reset or discard local work in a cached source checkout.

#### Scenario: Source cannot be refreshed

- **WHEN** the latest source cannot be retrieved
- **THEN** sync reports the failure and does not call a cached copy the latest version

#### Scenario: Comparison is incomplete

- **WHEN** the recorded commit, the payload inventory, or a needed file cannot be read, or the change set exceeds the safety limit
- **THEN** sync reports the diagnostic and does not invoke `/plan`

### Requirement: Only payload changes create update work

Sync SHALL compare only the repo's payload between the installed and latest source commits, including files the inventory adds, removes, or remaps, and SHALL classify each changed unit against the repo's copy without reading its contents into the report. For `CLAUDE.md` only the `WONG-STACK` block SHALL count; a source file stored as a symlink SHALL be compared by the file it points at.

#### Scenario: Local text outside the block

- **WHEN** the upstream `WONG-STACK` block changes and the repo's `CLAUDE.md` has its own text outside it
- **THEN** only the block is treated as the update

### Requirement: Local adaptations are protected

A changed unit that the repo has edited since install SHALL be marked locally adapted and SHALL NOT be overwritten; the plan SHALL keep local work unless the person agreed to change it.

#### Scenario: Upstream and local edits overlap

- **WHEN** an upstream change touches a file the repo adapted
- **THEN** the unit is marked locally adapted and the plan keeps the local work

### Requirement: The update is judged from its changed units

The exploration inside `/plan` SHALL start from the classified changed units, read other repo files only for a named dependency or impact, and ask at most one question round. Earlier user decisions, including an old verdict record, SHALL inform it as context, never as approval.

#### Scenario: Small update

- **WHEN** a few payload units changed
- **THEN** exploration starts from those units instead of rereading the whole payload

### Requirement: Local installation choices survive an update

The install record `.claude/.wong-stack.json` SHALL keep the repo's renamed skills and relocated docs folder, and SHALL advance to the new source version and commit only after the update is implemented. A renamed skill SHALL be updated in place, never duplicated.

#### Scenario: Renamed skill

- **WHEN** the record maps a WongStack skill to a local name
- **THEN** the update lands in the local skill and no second copy appears

#### Scenario: Plan without implementation

- **WHEN** a sync plan is drafted but not built
- **THEN** the install record still names the old version

### Requirement: Relocated wiki pages map safely

When the install record names a docs folder, sync SHALL map the WongStack wiki pages into it, and two pages that land on one path, or a folder outside the repo, SHALL be an error, never an overwrite.

#### Scenario: Pages in a docs folder

- **WHEN** the record sets the docs folder to `docs/development`
- **THEN** `wiki/development/the-change-loop.md` maps to `docs/development/the-change-loop.md`

#### Scenario: Two pages collide

- **WHEN** two wiki pages map to the same file in the docs folder
- **THEN** sync reports an error naming both and changes nothing

### Requirement: Sync runs only in an installed repo

Sync SHALL route a repo with no install record, or with a seed record whose version is empty, to `/wong-setup`, and SHALL refuse to sync the WongStack source with itself.

#### Scenario: No install record

- **WHEN** the repo has no `.claude/.wong-stack.json`
- **THEN** sync routes to `/wong-setup` and changes nothing

#### Scenario: Source repo

- **WHEN** sync runs in the WongStack source
- **THEN** it reports that the source cannot sync with itself
