# toolchain-dependencies Specification

## Purpose

The external command-line tools the WongStack payload is allowed to depend on — `git`, `gh`, and `openspec` — and the two rules that keep the set that small: JSON returned by GitHub is filtered with `gh`'s embedded `--jq` rather than a standalone `jq`, and small local JSON files are read by the agent rather than parsed by a subshell. WongStack installs into repos of every stack, so each added dependency is a repo it cannot serve.

## Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`. No core payload script or skill SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do. The **opt-in Cloudflare stack pack** MAY require additional tools (`node`/`npm`, `wrangler`, and a Cloudflare account) — but only in a repo that explicitly took the pack, and only in that repo's own build/CI, never in a WongStack skill. A repo that did not take the pack SHALL still run the entire toolkit on `git`, `gh`, and `openspec` alone. The required-tools page SHALL state this split so the core three-tool guarantee stays true.

#### Scenario: Target repo has gh but not jq

- **WHEN** any core WongStack skill or script runs in a repo on a machine where `git`, `gh`, and `openspec` are installed but `jq` is not
- **THEN** every skill and script completes with correct results, invoking no command outside that set

#### Scenario: Onboarding preflight

- **WHEN** `/wong-setup` runs its readiness check
- **THEN** it checks for `git`, `gh` (installed and authenticated), a resolving `origin` remote, and `openspec`
- **AND** it does not check for or require `jq`

#### Scenario: Pack's extra tools are opt-in and repo-local

- **WHEN** a repo takes the stack pack
- **THEN** the pack's scripts run `node`/`wrangler` in that repo's own build/CI, and the required-tools page documents these as pack-only additions
- **AND** a repo that declined the pack still runs every WongStack skill on `git`, `gh`, and `openspec` alone

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

`wait-for-checks.sh` SHALL determine and report the aggregate check result — `SUCCESS`, `FAILURE`, `NONE`, or `TIMEOUT`, each on a single `RESULT:` line, with failing or still-pending check names listed after `FAILURE` and `TIMEOUT` — using only `gh` and shell built-ins. It MUST NOT report `SUCCESS` on a run whose checks are pending, failed, or unreadable. Because `gh pr checks` exits non-zero when checks are merely pending or failing, the script MUST NOT treat that exit code as a "no checks" signal; emptiness of the filtered output is the only such signal.

#### Scenario: Failing checks on a machine without jq

- **WHEN** the script runs against a PR with at least one failed or cancelled check, on a machine with no standalone `jq`
- **THEN** it prints `RESULT: FAILURE` followed by the name and link of each failing check

#### Scenario: Checks are still running

- **WHEN** the script polls a PR whose checks are pending, causing `gh pr checks` to exit non-zero
- **THEN** it keeps waiting rather than reporting `RESULT: NONE`

#### Scenario: No checks configured

- **WHEN** `gh pr checks` reports no checks for the branch
- **THEN** the script prints `RESULT: NONE` and exits, so the caller falls back to PR review as the gate
