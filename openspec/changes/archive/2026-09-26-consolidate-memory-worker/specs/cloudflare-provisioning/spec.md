## MODIFIED Requirements

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, bind them in the production part of the app's wrangler config as `MEMORY_DB` and `MEMORY_BUCKET`, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-worker` requires. It SHALL NOT bind them in `env.staging`. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the production Worker's memory URL under `components.memory` in `.claude/.wong-stack.json`. It SHALL NOT deploy a separate memory Worker. It SHALL check the digest through the Worker once production has deployed, as part of the smoke test. A run that finds the store already provisioned SHALL change nothing. Creating the key is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket, bind it in the production config, and give the `<repo>-deploy` token `Workers R2 Storage Write`; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the app's production Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: The memory store is bound in production only

- **WHEN** provisioning writes the app's wrangler config
- **THEN** the top level binds `MEMORY_DB`, and `MEMORY_BUCKET` when R2 is enabled
- **AND** `env.staging` binds neither, and no `wong-memory` Worker is created

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, binds it in the production config, gives the deploy token R2 access, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, its bindings, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing

## ADDED Requirements

### Requirement: Teardown removes what provisioning created

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, the deploy token, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch. The memory keys SHALL go with the memory store, because they live in its database. Teardown SHALL NOT touch another repo's memory store.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

#### Scenario: Another repo's memory is untouched

- **WHEN** teardown runs for `billing` in an account that also holds `home`'s memory store
- **THEN** teardown removes nothing of `home`'s, and `home`'s production Worker keeps serving its memory

## REMOVED Requirements

### Requirement: Everything provisioned can be torn down

**Reason**: It named a shared memory Worker and a keys database that no longer exist.

**Migration**: "Teardown removes what provisioning created" keeps every other rule; the memory keys go with the memory store.
