# Spec Delta

## ADDED Requirements

### Requirement: Runtimes are installed with consent, and only setup checks ahead

No WongStack skill SHALL install a language runtime or tool without the person's consent, and none SHALL install one "while we're here". A skill other than `/wong-setup` SHALL install a runtime or tool only at the moment a step requires it.

`/wong-setup` is the one exception, because nothing works until its tools exist. Before it writes any file or clones the source, it SHALL check for `git`, `gh`, Node.js at least at the major version in `.nvmrc`, and the OpenSpec CLI. It SHALL name each missing tool in plain language, and install each one only after the person agrees. It SHALL install through the system package manager (Homebrew when it is already present, `winget`, or `apt`) only when that install needs no password prompt. Otherwise it SHALL install into the person's own home folder. It SHALL NOT install a package manager itself. When a tool is declined or its install fails, setup SHALL stop before it writes anything, say what is missing and what to try, and say that running setup again continues from the check.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node is a real dependency of the planning verbs and of the memory layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what the verbs actually do. `/save` shells out to `openspec new change`, `openspec status --json`, and `openspec instructions` when it authors a change for a session that skipped `/plan`, and it writes facts through the memory script, so it is **not** a no-runtime verb. A list that is wrong here is worse than no list: it is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs in an empty folder on a machine with no Node.js
- **THEN** it says, before it writes anything, that it needs Node.js and why, and asks to install it
- **AND** it installs Node only after the person agrees

#### Scenario: The user declines the runtime install

- **WHEN** the person declines a tool setup needs
- **THEN** setup writes no file and creates nothing on GitHub or Cloudflare
- **AND** it names what is missing, what it is for, and that running setup again continues from the check

#### Scenario: The package manager would ask for a password

- **WHEN** a missing tool's package-manager install would prompt for an admin password, or no supported package manager is present
- **THEN** setup installs the tool into the person's home folder instead
- **AND** it does not install a package manager

#### Scenario: Every tool is present

- **WHEN** setup finds `git`, `gh`, the required Node.js version, and the OpenSpec CLI
- **THEN** it installs nothing and asks nothing about tools

#### Scenario: Other skills install at the point of need

- **WHEN** a verb other than `/wong-setup` finds a tool missing, such as `/verify` without its browser CLI
- **THEN** it installs the tool only when a step needs it, and says so

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** a skill states which verbs work without Node
- **THEN** `/save`'s change-authoring and fact paths are named as needing it, alongside `/plan`, `/apply`, `/continue`'s fact recap, `/explore`'s memory search, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI or the memory script

## REMOVED Requirements

### Requirement: Runtimes are installed at the point of need, never pre-emptively

**Reason**: Setup's point-of-need installs left a person stranded partway, with a terminal command to type. Setup now checks every tool before it writes anything, and asks before each install.
**Migration**: Replaced by *Runtimes are installed with consent, and only setup checks ahead*, which keeps point-of-need installs for every other skill.
