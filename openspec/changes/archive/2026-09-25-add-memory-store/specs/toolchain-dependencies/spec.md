## ADDED Requirements

### Requirement: Core setup requires a Cloudflare account

Every WongStack repo SHALL require a Cloudflare account for its memory store. R2 SHALL be optional: it needs a payment method on file, and without it the store keeps no raw transcripts. That account need not host the application, and the Cloudflare stack pack SHALL stay opt-in. The required-tools page SHALL list the account, the provisioning token, and the memory token beside the command-line tools, and SHALL link the credentials page for how to obtain them.

#### Scenario: A reader checks what setup needs

- **WHEN** a reader opens the required-tools page
- **THEN** a Cloudflare account is listed as required for the memory store, and R2 is listed as optional with the payment-method step
- **AND** the stack pack is still described as opt-in

## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/verify` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, and `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/verify` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

Core payload scripts MAY run on Node.js, which the OpenSpec CLI already requires, only when they use Node's built-in modules and need no package manifest, dependency entry, or install step. The memory scripts, the review builder, and the improvement survey are such scripts. No core payload script or skill SHALL invoke a standalone `jq`, `python`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, the browser CLI scoped to `/verify`, `curl` as a provisioning dependency, and dependency-free Node scripts on the runtime OpenSpec brings. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: A memory script uses only built-in modules

- **WHEN** a reviewer inspects the memory skill's scripts
- **THEN** they import only Node built-in modules
- **AND** the repository gains no package manifest or lockfile for them

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/verify` specifically
- **AND** the rest of the core payload is still stated to need only `git`, `gh`, and `openspec`

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/verify` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/verify`
- **THEN** no browser tool or browser is installed on its behalf

### Requirement: Runtimes are installed at the point of need, never pre-emptively

No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node is a real dependency of the planning verbs and of the memory layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what
the verbs actually do. `/save` shells out to `openspec new change`,
`openspec status --json`, and `openspec instructions` when it authors a change for a
session that skipped `/plan`, and it writes facts through the memory script, so it is
**not** a no-runtime verb. A list that is wrong here is worse than no list: it
is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs its readiness check on a machine with no Node.js
- **THEN** it does not install Node during the check
- **AND** it proceeds until a step genuinely requires the OpenSpec CLI or the memory script, then explains in plain language what needs installing and why, and asks

#### Scenario: The user declines the runtime install

- **WHEN** the user declines the Node install
- **THEN** setup completes the layer that needs no runtime — `CLAUDE.md`, the wiki, the skills, and the verbs that touch only git and files
- **AND** it names exactly which verbs are unavailable without Node, including session memory, and how to enable them later
- **AND** it does not dead-end, fail, or leave the repo half-written

#### Scenario: Install prefers a user-local method

- **WHEN** the user consents to installing Node
- **THEN** the install targets the user's own home directory rather than requiring `sudo`, wherever the platform allows it

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** setup states which verbs work without Node
- **THEN** `/save`'s change-authoring and fact paths are named as needing it, alongside `/plan`, `/apply`, `/continue`'s fact recap, `/explore`'s memory search,, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI or the memory script
