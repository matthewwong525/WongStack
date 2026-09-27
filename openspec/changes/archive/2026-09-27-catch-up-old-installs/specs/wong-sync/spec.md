## MODIFIED Requirements

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

## ADDED Requirements

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
