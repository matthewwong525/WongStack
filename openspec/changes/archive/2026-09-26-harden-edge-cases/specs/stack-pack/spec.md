## ADDED Requirements

### Requirement: The pack reads the wrangler config with a real parser

Every pack script SHALL read the wrangler config through one shared JSONC parser. The parser SHALL ignore comments and SHALL read a key only at its real position in the structure. The Worker name of an environment SHALL come from that environment's `name` key, never from a key that contains `name`, such as `database_name`. A TOML config SHALL be refused with a message that names the supported formats.

#### Scenario: A database key sits before the Worker name

- **WHEN** `env.staging` lists `d1_databases` before its `name`
- **THEN** the staging Worker name is the value of `env.staging.name`
- **AND** the production guard refuses a deploy whose staging name equals production's

#### Scenario: A comment mentions staging

- **WHEN** a comment in the config contains `"staging":`
- **THEN** the scripts read the staging block from the config, not from the comment

#### Scenario: A TOML config

- **WHEN** the app's config is `wrangler.toml`
- **THEN** the pack script stops and says that it reads `wrangler.jsonc` or `wrangler.json`

### Requirement: A Worker without D1 builds and deploys

When the config binds no D1 database, the build wrapper SHALL skip the migration step and build the Worker. It SHALL stop with its remedy only when production binds D1 and the staging environment does not.

#### Scenario: A Worker with no database

- **WHEN** CI builds a branch for a Worker whose config has no `d1_databases`
- **THEN** the build succeeds without running a migration

### Requirement: The staging reset refuses the production database

The staging database reset SHALL stop, and drop nothing, when the database it would reset has the production database's name. It SHALL drop the staging tables in one batched command.

#### Scenario: Staging points at production

- **WHEN** the staging environment's `database_name` equals production's
- **THEN** the reset stops with an error and no table is dropped
