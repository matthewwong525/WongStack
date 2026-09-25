## ADDED Requirements

### Requirement: The provisioning skill provisions the memory store in every repo

`/wong-cloudflare` SHALL be installed in every WongStack repo. It SHALL provision the memory store whether or not the repo took the stack pack: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, apply the memory migrations, and use the provisioning token to mint a separate memory token that carries only D1 permissions, plus R2 permissions when a bucket exists. It SHALL write that token to the git-ignored `.env`, SHALL NOT set it as a CI secret, and SHALL record the resource ids under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Minting the memory token is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the skill SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the skill SHALL provision the database and the token without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL add R2 permissions to the existing memory token.

#### Scenario: A repo without the stack pack

- **WHEN** `/wong-cloudflare` runs in a repo with `components.stackPack` false and no memory store
- **THEN** it offers the memory store and the pack as separate choices
- **AND** a yes to the memory store with a no to the pack provisions the store without landing any pack file

#### Scenario: The memory token is narrow

- **WHEN** provisioning mints the memory token
- **THEN** the token carries D1 permissions, and R2 permissions only when a bucket exists, and no token-write, Worker, or Access permission
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** `/wong-cloudflare` provisions memory on an account where R2 is not enabled
- **THEN** it creates the memory database and token, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, adds R2 permissions to the memory token, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store and token already exist and verify
- **THEN** the run reports the store as current and creates nothing

## MODIFIED Requirements

### Requirement: A provisioning skill stands the app up from a single API token

The payload SHALL include a provisioning skill that takes a repo from "has a Cloudflare token" to "has a memory store" in every repo, and, where `components.stackPack: true`, to "has a deployed Worker backed by two D1 databases and a CI pipeline." It SHALL be runnable at any time after `/wong-setup`, not only during onboarding, because the token typically arrives later than the install does. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and SHALL leave its repo changes uncommitted for `/save`.

#### Scenario: Provisioning runs long after setup

- **WHEN** a user runs the provisioning skill in a repo where WongStack is already installed and the stack pack was taken
- **THEN** it provisions from the current token without re-running onboarding
- **AND** it reports the production URL and the preview URL pattern on completion

#### Scenario: The skill is absent for a repo that declined the pack

- **WHEN** a repo's manifest has `components.stackPack` false or absent
- **THEN** the skill's stack-pack part (Worker, app databases, CI pipeline) is neither run nor offered, and only the memory store is provisioned
- **AND** no stack-pack file enters that repo

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, install record, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the skill runs no git command in the repo
