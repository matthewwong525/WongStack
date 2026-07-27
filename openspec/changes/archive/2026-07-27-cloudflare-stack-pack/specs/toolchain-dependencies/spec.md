## MODIFIED Requirements

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
