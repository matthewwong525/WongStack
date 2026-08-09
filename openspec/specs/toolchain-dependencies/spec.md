# toolchain-dependencies Specification

## Purpose

The external command-line tools the WongStack payload is allowed to depend on — `git`, `gh`, and `openspec` — and the two rules that keep the set that small: JSON returned by GitHub is filtered with `gh`'s embedded `--jq` rather than a standalone `jq`, and small local JSON files are read by the agent rather than parsed by a subshell. WongStack installs into repos of every stack, so each added dependency is a repo it cannot serve.

## Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/walk` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/dream`, `/improve`, `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/walk` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

No core payload script or skill outside `/walk` SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, the browser CLI scoped to `/walk`, and `curl` as a pack-gated skill dependency. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/walk` specifically
- **AND** the rest of the core payload is still stated to need only `git`, `gh`, and `openspec`

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/walk` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/walk`
- **THEN** no browser tool or browser is installed on its behalf

### Requirement: JSON handling goes through gh's embedded filter

Where a payload script must filter or reshape JSON returned by GitHub, it SHALL use `gh`'s built-in `--jq` flag rather than piping to a standalone `jq`. Filters SHALL stay within the syntax common to jq and gojq (`gh`'s embedded implementation).

#### Scenario: Script needs a subset of a gh response

- **WHEN** a payload script needs specific fields out of a `gh` API or `gh pr` response
- **THEN** it passes a `--jq` expression to the `gh` invocation itself
- **AND** no `| jq` pipeline appears anywhere in the payload

### Requirement: Skills read local JSON directly rather than shelling out

Where a skill needs values from a small local JSON file — such as the manifest at `.claude/.wong-stack.json` — the skill SHALL instruct the agent to read the file and note the values, stating each field's default and any expansion (for example `~` → `$HOME`) in prose, rather than shelling out to a JSON parser.

#### Scenario: wong-sync resolves its manifest

- **WHEN** `/wong-sync` Step 0 needs `commit`, `upstream.repo`, `upstream.fork`, and `upstream.clone`
- **THEN** the skill directs the agent to read the manifest file and note those values, applying the documented default for `upstream.repo` and expanding `~` in `upstream.clone`
- **AND** absent fields are recognized as absent rather than silently resolving to an empty string

### Requirement: Check-waiting reports the true gate result without jq

`wait-for-checks.sh` SHALL determine and report the aggregate check result — `SUCCESS`, `FAILURE`, `NONE`, `TIMEOUT`, or `UNKNOWN`, each on a single `RESULT:` line, with failing or still-pending check names listed after `FAILURE` and `TIMEOUT` and the underlying message after `UNKNOWN` — using only `gh` and shell built-ins. It MUST NOT report `SUCCESS` on a run whose checks are pending, failed, or unreadable. Because `gh pr checks` exits non-zero when checks are merely pending or failing, the script MUST NOT treat that exit code as a "no checks" signal.

**Empty output alone SHALL NOT be read as "no checks".** `RESULT: NONE` SHALL be reported only when `gh` explicitly says the branch has no checks. Any other empty result — no pull request for the branch, an authentication or network failure, or a `gh` too old to support the flags used — SHALL be reported as `RESULT: UNKNOWN`, carrying the message `gh` produced. The script SHALL NOT discard `gh`'s error output.

The script SHALL work across `gh` versions, detecting whether `gh pr checks --json` is supported and falling back to parsing the default output when it is not. Both paths SHALL produce the same states.

Callers SHALL treat `UNKNOWN` as *unverified*, never as *no checks*: `/save` reports the gate as unverified, and `/ship` SHALL NOT merge on it.

#### Scenario: Failing checks on a machine without jq

- **WHEN** the script runs against a PR with at least one failed or cancelled check, on a machine with no standalone `jq`
- **THEN** it prints `RESULT: FAILURE` followed by the name and link of each failing check

#### Scenario: Checks are still running

- **WHEN** the script polls a PR whose checks are pending, causing `gh pr checks` to exit non-zero
- **THEN** it keeps waiting rather than reporting `RESULT: NONE`

#### Scenario: No checks configured

- **WHEN** `gh pr checks` reports that the branch has no checks
- **THEN** the script prints `RESULT: NONE` and exits, so the caller falls back to PR review as the gate

#### Scenario: An older gh that lacks the JSON flag

- **WHEN** the installed `gh` does not support `gh pr checks --json`, on a PR that has checks
- **THEN** the script parses the default output instead and reports the real aggregate result
- **AND** it does not report `RESULT: NONE`

#### Scenario: gh cannot be asked at all

- **WHEN** `gh pr checks` fails because there is no pull request for the branch, or authentication or the network is broken
- **THEN** the script prints `RESULT: UNKNOWN` with the message `gh` produced
- **AND** `/ship` does not merge on that result

### Requirement: Runtimes are installed at the point of need, never pre-emptively


No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node remains a real dependency of the planning verbs — but not of the knowledge layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what
the verbs actually do. `/save` shells out to `openspec new change`,
`openspec status --json`, and `openspec instructions` when it authors a change for a
session that skipped `/plan`, so it is **not** a no-runtime verb, and `wong-setup`
currently promises that it is. A list that is wrong here is worse than no list: it
is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs its readiness check on a machine with no Node.js
- **THEN** it does not install Node during the check
- **AND** it proceeds until a step genuinely requires the OpenSpec CLI, then explains in plain language what needs installing and why, and asks

#### Scenario: The user declines the runtime install

- **WHEN** the user declines the Node install
- **THEN** setup completes the layer that needs no runtime — `CLAUDE.md`, the wiki, `notes/`, the skills, and the verbs that touch only git and files
- **AND** it names exactly which verbs are unavailable without the CLI and how to enable them later
- **AND** it does not dead-end, fail, or leave the repo half-written

#### Scenario: Install prefers a user-local method

- **WHEN** the user consents to installing Node
- **THEN** the install targets the user's own home directory rather than requiring `sudo`, wherever the platform allows it

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** setup states which verbs work without the CLI
- **THEN** `/save`'s change-authoring path is named as needing it, alongside `/plan`, `/apply`, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI
