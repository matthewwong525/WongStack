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

Sync SHALL work from a freshly retrieved source, and a failed retrieval or a comparison it cannot prove SHALL be reported as an error, never as current and never as a partial plan. Retrieval SHALL NOT reset or discard local work in a cached source checkout. An installed commit older than the payload inventory SHALL compare against an empty baseline, never fail for the missing inventory.

#### Scenario: Source cannot be refreshed

- **WHEN** the latest source cannot be retrieved
- **THEN** sync reports the failure and does not call a cached copy the latest version

#### Scenario: Comparison is incomplete

- **WHEN** the recorded commit, the latest payload inventory, or a needed file cannot be read, or the change set exceeds the safety limit
- **THEN** sync reports the diagnostic and does not invoke `/plan`

#### Scenario: Install older than the inventory

- **WHEN** the recorded commit has no payload inventory
- **THEN** every current payload unit is compared as new, and each one the repo already has in another form is marked locally adapted

### Requirement: Only payload changes create update work

Sync SHALL compare only the repo's payload between the installed and latest source commits, including files the inventory adds, removes, or remaps, and SHALL classify each changed unit against the repo's copy without reading its contents into the report. For `CLAUDE.md` only the `WONG-STACK` block SHALL count; a source file stored as a symlink SHALL be compared by the file it points at, and so SHALL a repo's `CLAUDE.md` that links to `AGENTS.md`.

#### Scenario: Local text outside the block

- **WHEN** the upstream `WONG-STACK` block changes and the repo's `CLAUDE.md` has its own text outside it
- **THEN** only the block is treated as the update

#### Scenario: The repo's rules file is a link

- **WHEN** the repo's `CLAUDE.md` links to an `AGENTS.md` whose block still equals the installed source
- **THEN** the block is classified as unchanged locally, the same as a real `CLAUDE.md`

### Requirement: Local adaptations are protected

A changed unit that the repo has edited since install SHALL be marked locally adapted and SHALL NOT be overwritten; the plan SHALL keep local work unless the person agreed to change it.

#### Scenario: Upstream and local edits overlap

- **WHEN** an upstream change touches a file the repo adapted
- **THEN** the unit is marked locally adapted and the plan keeps the local work

### Requirement: The update is judged from its changed units

The exploration inside `/plan` SHALL start from the classified changed units, read other repo files only for a named dependency or impact, and ask by the shared rule for questions before planning. Earlier user decisions, including an old verdict record, SHALL inform it as context, never as approval.

#### Scenario: Small update

- **WHEN** a few payload units changed
- **THEN** exploration starts from those units instead of rereading the whole payload

### Requirement: Local installation choices survive an update

The install record `.claude/.wong-stack.json` SHALL keep the repo's renamed skills, and SHALL advance to the new source version and commit only after the update is implemented. A renamed skill SHALL be updated in place, never duplicated.

#### Scenario: Renamed skill

- **WHEN** the record maps a WongStack skill to a local name
- **THEN** the update lands in the local skill and no second copy appears

#### Scenario: Plan without implementation

- **WHEN** a sync plan is drafted but not built
- **THEN** the install record still names the old version

### Requirement: Sync runs only in an installed repo

Sync SHALL route a repo with no install record, or with a seed record whose version is empty, to `/wong-setup`, and SHALL refuse to sync the WongStack source with itself.

#### Scenario: No install record

- **WHEN** the repo has no `.claude/.wong-stack.json`
- **THEN** sync routes to `/wong-setup` and changes nothing

#### Scenario: Source repo

- **WHEN** sync runs in the WongStack source
- **THEN** it reports that the source cannot sync with itself

### Requirement: An update moves the rules where every agent reads them

When the repo has no `CLAUDE.md` link to `AGENTS.md`, sync's plan SHALL include moving the rules into a real `AGENTS.md` with `CLAUDE.md` linking to it, keeping every line of the repo's own text, and SHALL never overwrite either file without review.

#### Scenario: Only CLAUDE.md exists

- **WHEN** the repo has a real `CLAUDE.md` and no `AGENTS.md`
- **THEN** the plan renames `CLAUDE.md` to `AGENTS.md` and links `CLAUDE.md` to it, with all its text intact

#### Scenario: Both files exist

- **WHEN** the repo has a real `CLAUDE.md` and a real `AGENTS.md`
- **THEN** the plan merges both into `AGENTS.md` for review, then links `CLAUDE.md` to it

### Requirement: An old install catches up in place

Sync SHALL plan the update of an install from before 19.0.0 in place, keeping every local edit, and SHALL NOT route it to a fresh setup. The comparison SHALL report, from the repo's layout and install record alone, each move the install missed: the agent folder, the rules file in either link direction, WongStack pages kept outside `wiki/`, leftover generated OpenSpec skills, parts the record opted out of, and the CI deploy token. The plan SHALL include each reported move and list opted-out parts as left out until the person asks for them.

#### Scenario: A months-old, edited install

- **WHEN** a person runs `/wong-sync` in a 16.x install with a real `.claude/` folder and edited skills
- **THEN** the plan moves the folder, keeps every edited file's local text, and brings the payload up to date

#### Scenario: A part the person turned down

- **WHEN** the install record says the repo declined the starter app
- **THEN** the plan lists the starter app as left out, with that reason, and adds none of its files

### Requirement: Skipped releases' hand steps reach the plan

The comparison SHALL report every release note's by-hand steps for each version after the installed one, and the plan SHALL carry each step that applies as a task, in the person's words in What Changes.

#### Scenario: Forty releases behind

- **WHEN** a repo skipped releases whose notes ask the admin to run the memory upgrade after publishing
- **THEN** the plan includes that step once, as a task after the update publishes

### Requirement: A merge never drops upstream text silently

Before the install record advances, sync's plan SHALL check each locally adapted file it changed for upstream additions missing from the result, and the plan SHALL either take each one or name it as left out with a reason.

#### Scenario: A section lost in a merge

- **WHEN** a merged file lacks a section upstream added since the installed commit
- **THEN** the check names the file and the missing text, and the install record does not advance until the plan takes it or says why not

### Requirement: An update plan reads in the person's terms

A sync plan's Why and What Changes SHALL say what the person gets, what changes in how they work, what of theirs stays, what is left out and why, and what they must do themselves; unit counts, file names, and commands SHALL stay in the design and tasks.

#### Scenario: A large update

- **WHEN** an update changes over a hundred payload units
- **THEN** the review page names the few things the person will notice and do, not the files

### Requirement: An update goes straight into planning

When the preflight reports an update, sync SHALL invoke `/plan` directly, and SHALL NOT stop at a standalone `/explore` or its *Plan it?* question, including in an install whose own sync skill hands the report to `/explore`.

#### Scenario: An older install's skill names explore

- **WHEN** an install's own sync skill says to hand the report to `/explore`
- **THEN** the exploration runs as `/plan`'s bounded pass and the sync ends at the plan's review link, never at *Plan it?*

### Requirement: Existing installs receive a reviewed privacy migration

An update to private defaults SHALL plan protection for the existing production and staging Workers, their default addresses and previews, the owner, and the current team. It SHALL preserve locally adapted app code and explicitly intended public routes. Earlier recorded public choices SHALL inform the reviewed migration rather than silently excluding the install from the new defaults. It SHALL identify unavailable owner identities, management connections, conflicting Access rules, and unsupported protocols instead of silently weakening coverage. The update SHALL distinguish public or pending installs from verified private installs, and SHALL NOT mark migration complete from configuration alone.

#### Scenario: An existing public workspace

- **WHEN** an install updates from a public-default release
- **THEN** its plan includes a checked privacy migration for existing and new previews with the owner's current team, rather than only copying new guidance

#### Scenario: A locally adapted public app

- **WHEN** the installed app has custom routes or WebSocket traffic
- **THEN** the plan preserves its code, identifies necessary reviewed exceptions or compatible coverage, and leaves the migration explicitly pending until its access behavior works

### Requirement: Updates follow the installed project's source

Sync SHALL retrieve updates from the installed project's recorded source repository, including a customized fork, and SHALL NOT silently switch that project to the original WongStack. A source cache belonging to another repository or holding local work SHALL remain intact. If the recorded source cannot be retrieved, sync SHALL report the failure rather than compare against a different source.

#### Scenario: A project installed from a fork

- **WHEN** a project whose install record names a customized fork requests an update
- **THEN** the update plan compares against that fork's latest payload and preserves local adaptations

#### Scenario: A cache for another source

- **WHEN** the usual source cache belongs to another repository or holds local work
- **THEN** sync retrieves the recorded source separately and leaves the existing cache intact
