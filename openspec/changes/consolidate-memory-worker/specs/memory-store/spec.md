## MODIFIED Requirements

### Requirement: Every repo has one memory store on Cloudflare

Every WongStack repo SHALL have one memory store: one D1 database named `<repo>-memory` in the repo's Cloudflare account, plus one private R2 bucket of the same name when the account has R2 enabled. The bucket SHALL be optional. Without it, the store SHALL keep no raw transcripts, and every other memory behavior SHALL work the same. The store SHALL be separate from any application database, and it SHALL have no staging twin. Only the app's production Worker SHALL bind it, for the memory route alone. The account id, database id, and bucket name (or its absence) SHALL be recorded under `components.memory` in `.claude/.wong-stack.json`. They are not secrets.

#### Scenario: A repo is provisioned

- **WHEN** provisioning completes in a repo named `billing`
- **THEN** a D1 database named `billing-memory` exists, and a private R2 bucket of the same name exists when the account has R2 enabled
- **AND** `.claude/.wong-stack.json` records the account id, database id, and bucket name or its absence under `components.memory`

#### Scenario: An account without R2

- **WHEN** the store has no bucket
- **THEN** facts, the write gate, search, the digest, capture, and consolidation all work
- **AND** no raw transcript is stored

#### Scenario: The app database is separate

- **WHEN** the repo also has the stack pack's production and staging databases
- **THEN** the memory database is a third database, bound only to the production Worker as `MEMORY_DB`
- **AND** the staging Worker has no binding to it, and CI never applies the app's migrations to it

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the app's production Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention, as `memory-worker` requires. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory, except an older store's token until its move finishes.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable and the page that owns it
- **AND** no value is printed

#### Scenario: A teammate joins

- **WHEN** a teammate needs memory access
- **THEN** the admin gives them a member key, not a Cloudflare token
