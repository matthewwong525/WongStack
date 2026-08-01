## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`. No core payload script or skill SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do. The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. A repo that did not take the pack SHALL still run the entire toolkit on `git`, `gh`, and `openspec` alone. The required-tools page SHALL state this split, and SHALL name `curl` explicitly as a pack-gated skill dependency rather than leaving the earlier "never in a WongStack skill" wording to be quietly contradicted.

Pack-gated skills and scripts MAY use `node` where it is the better tool, since a pack repo already requires it at its build boundary. Provisioning SHALL nonetheless use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine. The governing rule SHALL be stated on the required-tools page: use `node` where it is already required; never let a WongStack skill be the reason a runtime gets installed.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: Target repo has gh but not jq

- **WHEN** any core WongStack skill or script runs in a repo on a machine where `git`, `gh`, and `openspec` are installed but `jq` is not
- **THEN** every skill and script completes with correct results, invoking no command outside that set

#### Scenario: Onboarding preflight

- **WHEN** `/wong-setup` runs its readiness check
- **THEN** it checks for `git`, `gh` (installed and authenticated), a resolving `origin` remote, and `openspec`
- **AND** it does not check for or require `jq`

#### Scenario: Pack's extra tools are opt-in and repo-local

- **WHEN** a repo takes the stack pack
- **THEN** the pack's scripts run `node`/`wrangler` in that repo's own build/CI, its provisioning skill runs `curl`, and the required-tools page documents all of these as pack-only additions
- **AND** a repo that declined the pack still runs every WongStack skill on `git`, `gh`, and `openspec` alone

#### Scenario: Provisioning needs no local runtime

- **WHEN** a user provisions the Cloudflare app on a machine with no Node.js installed
- **THEN** provisioning completes using `curl` and `gh` only
- **AND** no step instructs the user to install a language runtime

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

## ADDED Requirements

### Requirement: Runtimes are installed at the point of need, never pre-emptively

No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node remains a real dependency of the planning verbs — but not of the knowledge layer.

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
