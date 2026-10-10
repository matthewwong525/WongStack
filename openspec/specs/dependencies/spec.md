# dependencies Specification

## Purpose

What WongStack needs on a person's machine, and how the source repo keeps its own tools and app dependencies current. The toolchain stays small because WongStack installs into repos of every stack, and each added dependency is a repo it cannot serve.

## Requirements

### Requirement: The core needs only git, gh, node, and openspec

Every core verb SHALL run on `git`, `gh`, Node.js, and the OpenSpec CLI alone, and no core script or skill SHALL call `jq`, `python`, or another runtime, or add a package manifest or lockfile to the repo. Core scripts MAY use Node's built-in modules, because the OpenSpec CLI already requires Node.

#### Scenario: A reader checks what WongStack needs

- **WHEN** a reader opens the required-tools page
- **THEN** it lists the four tools with why each is needed, and the Cloudflare account setup requires

#### Scenario: A script filters GitHub output

- **WHEN** a payload script needs fields from a `gh` response
- **THEN** it filters with `gh`'s built-in `--jq`, and no `| jq` pipeline appears in the payload

### Requirement: `/verify` adds one tool, not a toolchain

`/verify` SHALL be the one core verb that adds a tool: the browser CLI, which setup offers up front and which is otherwise installed on the machine the first time a browser journey needs it. It SHALL add nothing to the repository.

#### Scenario: A Go repo walks its app

- **WHEN** `/verify` runs a browser journey in a repo that is not JavaScript
- **THEN** the browser tool is on the machine and no package manifest, dependency entry, or runtime is added to the repo

#### Scenario: Setup already installed it

- **WHEN** `/verify` runs its first browser journey after a setup that installed the browser tool
- **THEN** it asks nothing and installs nothing

### Requirement: Nothing is installed without consent

No skill SHALL install a runtime or tool without the person's consent, and a skill other than `/wong-setup` SHALL install one only when a step needs it. WongStack SHALL NOT install Paseo on a person's machine.

#### Scenario: A verb finds its tool missing

- **WHEN** `/verify` needs its browser CLI and it is absent
- **THEN** it installs the tool at that step and says so

### Requirement: An on-demand verb updates this repo to latest

The source repo SHALL have an `/update-dependencies` verb that, only when asked, surveys and updates the OpenSpec CLI, the browser CLI, `gh`, `git`, `node`, the app's dependencies, and WongStack's own test tools to their latest versions, including majors with their migration notes applied, and hands a nonempty diff to `/save`. One script SHALL do the survey and every mechanical update, the same way each run; the agent SHALL watch its output and do only the migration, contract, and CI work. A failed step SHALL stop the script and name what broke, and running it again SHALL skip what is already current. Every place that names the OpenSpec version SHALL move together, and a test SHALL fail when two of them disagree. It SHALL NOT run on a schedule, run a local test suite as the gate, or claim a green CI run proves every major safe.

#### Scenario: Nothing is out of date

- **WHEN** every surveyed tool and dependency is current
- **THEN** the verb reports them current, changes no file, and does not call `/save`

#### Scenario: A dependency has a new major

- **WHEN** a dependency's latest version is a major ahead
- **THEN** the script bumps to it and names it as a major, the agent applies the migration notes, and CI verifies

#### Scenario: A step fails

- **WHEN** a package install fails partway through the update
- **THEN** the script stops at that step and names it, and after the agent's fix a second run finishes without redoing the finished steps

#### Scenario: One OpenSpec pin is missed

- **WHEN** an update moves the OpenSpec version in CI but not in the contributing guide
- **THEN** the checks fail and name the file that still holds the old version

### Requirement: CLI updates check the OpenSpec contract

After an OpenSpec CLI update, the verb SHALL check that the commands and output fields WongStack uses still hold, adapt the owning skill before saving when one changed, and report whether a payload release is due. It SHALL NOT regenerate or patch generated OpenSpec agent skills.

#### Scenario: The CLI stays compatible

- **WHEN** the CLI changes but its contract holds and no payload file changes
- **THEN** the verb reports that no payload version bump is due

### Requirement: The update verb never reaches an install

`/update-dependencies` SHALL be left out of the payload, so no installed repo receives it, and editing only that skill SHALL NOT be a payload release.

#### Scenario: A target repo updates

- **WHEN** `/wong-sync` runs in an installed repo
- **THEN** the repo gains no `/update-dependencies` verb

### Requirement: A private link adds one tool

A private link (the password link, the key link, or a private form) SHALL be the one step that needs Cloudflare's tunnel tool, including at the computer the agent runs on. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a private link needs it. It SHALL add nothing to the repository.

#### Scenario: A first private link

- **WHEN** a task needs a password link on a machine where the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** a task needs its first private link on a computer readied by setup
- **THEN** the link opens with no install step and no question

### Requirement: Personal browsing adds one browser on first use

Browsing as the person SHALL need one tool beyond `/verify`'s: the personal browser, installed into the person's home folder the first time a browsing task needs it, with the versions WongStack has tried and no others. Before installing, the agent SHALL ask once, naming the disk and memory it needs. It SHALL add nothing to the repository and SHALL need no admin password.

#### Scenario: A first errand

- **WHEN** a task first needs to browse as the person on a machine without the personal browser
- **THEN** the agent says what the install needs, asks, installs it into the home folder, and carries on with the task

#### Scenario: A later errand

- **WHEN** a later task browses as the person
- **THEN** it asks nothing and installs nothing

### Requirement: A live view adds its tools on first use

A live view SHALL be the one step that needs a screen viewer and the tools that show and place the personal browser's window. The agent SHALL install them the first time a live view needs them, after asking once and saying which need admin rights on the computer. The screen viewer SHALL be the one version WongStack has tried, in the person's home folder. They SHALL add nothing to the repository. On a machine that cannot have them, the agent SHALL install nothing and SHALL give the person steps instead.

#### Scenario: A first live view

- **WHEN** a task first needs a live view on a machine without its tools
- **THEN** the agent says what the install needs, admin rights included, asks, installs them, and opens the view

#### Scenario: The person says no

- **WHEN** the person declines the install
- **THEN** nothing is installed and the agent gives the person steps to pass the check on their own device

### Requirement: Stack-pack tools retain only the check-runner exception

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency. The exception is the check runner of an Artifacts install: it is installed from the pack's own pinned and locked tools, outside the app, needs no container software on the computer, and adds nothing to the app's dependencies. Assistant scheduling SHALL use an available host's tools and SHALL not install a separate routine runner; deterministic scheduled app jobs SHALL use the app's ordinary build and delivery path.

#### Scenario: Setup provisions Cloudflare and the check runner

- **WHEN** setup provisions an Artifacts install and its check runner on a fresh computer
- **THEN** provisioning uses the Cloudflare API, the runner uses only the pack's pinned and locked tools, and no app dependency or container software is added to the computer

#### Scenario: First host schedule after updating

- **WHEN** a person requests their first schedule after updating from the cloud routine skill
- **THEN** no routine runner is installed and the available host's verified scheduler is used
