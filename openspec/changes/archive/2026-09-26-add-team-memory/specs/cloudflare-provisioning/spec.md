## MODIFIED Requirements

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, deploy the account's memory Worker or attach the repo to it, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-worker` requires. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the Worker URL under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Deploying the memory Worker and creating the key are covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL attach it to the memory Worker; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the memory Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, attaches it to the memory Worker, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, the Worker attachment, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing

### Requirement: Everything provisioned can be torn down

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, this repo's bindings and keys in the memory Worker, the deploy token, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch. It SHALL delete the memory Worker and the keys database only when no other repo is attached.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

#### Scenario: Another repo shares the memory Worker

- **WHEN** teardown runs for `billing` and the memory Worker also serves `home`
- **THEN** teardown removes only `billing`'s bindings and keys, and the Worker keeps serving `home`
