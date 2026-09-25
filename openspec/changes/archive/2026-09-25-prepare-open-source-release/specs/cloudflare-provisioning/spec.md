## MODIFIED Requirements

### Requirement: CI is wired without user involvement

The provisioning step SHALL mint a separate account-owned deploy token named `<repo>-deploy`, scoped to the chosen account only, and SHALL set it as the GitHub repository secret `CLOUDFLARE_API_TOKEN`, with `CLOUDFLARE_ACCOUNT_ID` beside it. The deploy token SHALL carry only `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`, plus `Workers R2 Storage Write` only when the app's wrangler config binds an R2 bucket. It SHALL NOT carry any token-write, Access, or user permission. The deploy token's value SHALL go directly to `gh secret set` and SHALL NOT be written to any file or printed. The user token SHALL NOT be set as a GitHub secret, and SHALL stay only in the primary worktree's durable `.env`. Minting the deploy token SHALL be covered by the same standing authorization as the widen. Neither step SHALL require the user to visit a web interface.

On a later run, the step SHALL reuse an existing `<repo>-deploy` token. It SHALL roll the token's value and set the secret again only when the secret is missing or the user asks to rotate it.

Before relying on a push, the step SHALL check that the stored `gh` credentials carry the `workflow` scope, since it is absent from `gh auth login`'s minimum set and its absence fails only at push time with wording a newcomer cannot act on. Where it is missing the step SHALL offer `gh auth refresh --scopes workflow` with a plain-language reason.

#### Scenario: Secrets reach GitHub, not the repo

- **WHEN** the provisioning step wires CI
- **THEN** the GitHub secret `CLOUDFLARE_API_TOKEN` holds the minted `<repo>-deploy` token
- **AND** the user token is in no GitHub secret and no committed file
- **AND** the user is not asked to open a web interface

#### Scenario: The deploy token is narrow

- **WHEN** the deploy token is minted
- **THEN** its policy has `Workers Scripts Write`, `D1 Write`, and `Account Settings Read` on the chosen account, and R2 only when the app binds a bucket
- **AND** it cannot create, edit, or read API tokens

#### Scenario: The deploy token value never reaches disk

- **WHEN** the deploy token is minted or rolled
- **THEN** its value is piped to `gh secret set` and is in no file, log, or report

#### Scenario: The workflow scope is checked before the push

- **WHEN** the step reaches CI wiring in a repo whose `gh` credentials lack `workflow`
- **THEN** it surfaces this before the push rather than after
- **AND** it offers the refresh command with a plain-language explanation

#### Scenario: The deploy model is unchanged by the choice of CI

- **WHEN** the workflow runs
- **THEN** it delegates the branch decision to the pack's build and deploy scripts rather than reimplementing it
- **AND** production, the staging Worker, and the per-commit preview alias behave exactly as they do under Cloudflare Workers Builds

### Requirement: Everything provisioned can be torn down

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, the deploy and memory tokens, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

## REMOVED Requirements

### Requirement: A provisioning skill stands the app up from a single API token

**Reason**: `/wong-cloudflare` is removed. Provisioning is a step of `/wong-setup`, which starts from an empty folder and always provisions the pack.
**Migration**: See "Setup provisions the app from a single API token". A repo installed before 18.0.0 runs `/wong-sync`, which plans the removal of the skill.

### Requirement: The provisioning skill provisions the memory store in every repo

**Reason**: The memory store is provisioned by setup's provisioning step, not by a separate skill.
**Migration**: See "Setup provisions the memory store in every install". An installed repo that lacks a store follows setup's provisioning runbook from the source checkout through `/wong-sync`.

### Requirement: Where the skill is present, it is the whole door to the pack

**Reason**: `/wong-cloudflare` is removed. Setup starts from an empty folder and always provisions the pack, so no repo needs a late-adoption door.
**Migration**: A repo installed before 18.0.0 runs `/wong-sync`, which plans the removal of the skill. A repo that never took the pack keeps its flags, and `/wong-sync` continues to honor them.

## ADDED Requirements

### Requirement: Setup provisions the app from a single API token

`/wong-setup` SHALL include a provisioning step that takes an empty folder from "has a Cloudflare token" to "has a memory store, a deployed Worker backed by two D1 databases, and a CI pipeline." The runbook SHALL live in `wong-setup/references/` and SHALL NOT be a separate skill. It SHALL provision the stack pack in every new install, with no `components.stackPack` gate. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and the host's durable `.env`, and SHALL leave its repo changes uncommitted for `/save`. Every step SHALL be idempotent, so that a failed run can run again and reuse what already exists.

#### Scenario: Provisioning runs as part of setup

- **WHEN** setup runs in an empty folder with a Cloudflare user token
- **THEN** it provisions the memory store, both app databases, the binding, the deploy token, and the GitHub secrets in one step
- **AND** it reports the production URL and the preview URL pattern after the first deploy

#### Scenario: A run is repeated after a failure

- **WHEN** the provisioning step runs again after it stopped partway
- **THEN** it reuses every resource that already exists and reports it as reused
- **AND** it creates only what is missing

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, install record, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the provisioning step runs no git command in the repo

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, apply the memory migrations, and use the user token to mint a separate memory token that carries only D1 permissions, plus R2 permissions when a bucket exists. It SHALL write that token to the git-ignored `.env`, SHALL NOT set it as a CI secret, and SHALL record the resource ids under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Minting the memory token is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the token without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL add R2 permissions to the existing memory token.

#### Scenario: The memory token is narrow

- **WHEN** provisioning mints the memory token
- **THEN** the token carries D1 permissions, and R2 permissions only when a bucket exists, and no token-write, Worker, or Access permission
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and token, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, adds R2 permissions to the memory token, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store and token already exist and verify
- **THEN** the run reports the store as current and creates nothing
