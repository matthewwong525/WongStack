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

### Requirement: Stack-pack tools stay in the repo's build and CI

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency.

#### Scenario: Setup provisions Cloudflare

- **WHEN** setup provisions the app on a fresh computer
- **THEN** it reaches Cloudflare with `curl` and installs no app dependency

### Requirement: Nothing is installed without consent

No skill SHALL install a runtime or tool without the person's consent, and a skill other than `/wong-setup` SHALL install one only when a step needs it. WongStack SHALL NOT install Paseo on a person's machine; only the server setup script installs it, for a server.

#### Scenario: A verb finds its tool missing

- **WHEN** `/verify` needs its browser CLI and it is absent
- **THEN** it installs the tool at that step and says so

### Requirement: An on-demand verb updates this repo to latest

The source repo SHALL have an `/update-dependencies` verb that, only when asked, surveys and updates the OpenSpec CLI, the browser CLI, `gh`, `git`, `node`, the app's dependencies, and WongStack's own test tools to their latest versions, including majors with their migration notes applied, and hands a nonempty diff to `/save`. Every place that names the OpenSpec version SHALL move together, and a test SHALL fail when two of them disagree. It SHALL NOT run on a schedule, run a local test suite as the gate, or claim a green CI run proves every major safe.

#### Scenario: Nothing is out of date

- **WHEN** every surveyed tool and dependency is current
- **THEN** the verb reports them current, changes no file, and does not call `/save`

#### Scenario: A dependency has a new major

- **WHEN** a dependency's latest version is a major ahead
- **THEN** the verb bumps to it, applies the migration notes, and leaves verification to CI

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

### Requirement: A remote hand-over adds one tool

A hand-over through a private link SHALL be the one step that needs Cloudflare's tunnel tool. Setup SHALL offer it up front and the server script SHALL install it; on any other machine without it, the agent SHALL install it with the person's consent the first time a remote hand-over needs it. It SHALL add nothing to the repository, and a hand-over at the computer SHALL NOT need it.

#### Scenario: A first remote hand-over

- **WHEN** the person takes over from another device and the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** the person takes over the browser for the first time on a computer readied by setup or a server built by the server script
- **THEN** the link opens with no install step and no question
