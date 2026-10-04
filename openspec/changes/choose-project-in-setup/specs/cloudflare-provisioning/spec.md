## MODIFIED Requirements

### Requirement: One secrets file loads both Workers

`app/.dev.vars` SHALL be the declared list of Worker runtime secrets, and `secrets:push` SHALL load ordinary runtime secrets into production and staging; a git-ignored `app/.dev.vars.staging` SHALL give staging its own values. A linked worktree with no copy SHALL read the primary worktree's file. The private production Access login-management binding SHALL be omitted entirely from staging sources/config, including a blank declaration. Both target sources and staging config SHALL be validated before the first provider write. Unsafe fallback, explicit override or staging source SHALL load nothing into either Worker.

#### Scenario: Staging diverges

- **WHEN** `app/.dev.vars.staging` exists
- **THEN** staging gets its values and production gets `app/.dev.vars`

#### Scenario: Production holds private login authority

- **WHEN** a production runtime file contains private Access management bindings and staging would reuse it
- **THEN** push fails before either Worker changes and requires a separate staging source omitting those bindings

#### Scenario: Staging source is invalid after production source passes

- **WHEN** production's source is valid but staging declares a private Access binding or account credential
- **THEN** validation fails before any production or staging secret push

### Requirement: A gate keeps the two Workers in step

`secrets:check` SHALL fail when ordinary runtime secret names differ or a stateful top-level binding is absent from `env.staging`, excluding documented production-only memory and private Access management bindings. It SHALL fail if a private Access management binding is present on staging. It SHALL only warn about disagreement with `app/.dev.vars.example`, compare names only, and never read or print secret values.

#### Scenario: A secret on one Worker

- **WHEN** production holds an ordinary runtime secret staging lacks
- **THEN** the check fails and names the key, with no value in its output

#### Scenario: Production-only Access management

- **WHEN** private Access management names are present only in production and ordinary names match
- **THEN** the parity check passes without requiring management authority on staging

#### Scenario: Staging holds a private management binding

- **WHEN** staging config or deployed secret names include private Access management authority
- **THEN** the check fails and names the binding without disclosing its value

## ADDED Requirements

### Requirement: Setup supplies what Access needs

Setup and the unattended installer SHALL record the owner's email as committed nonsecret configuration for both Workers, and SHALL create a key limited to Access application-and-policy writes, store it with the account and human-policy identifiers as the production Worker's login-management secret, and record the key's identifier for reuse and rotation. The key SHALL NOT be the deploy key, SHALL NOT be written to staging, and a rerun SHALL reuse it. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes on an account with sign-in turned on
- **THEN** the owner email is in both Workers' committed configuration, production holds the login-management secret, staging holds none, and the owner can add a person from Access without another step

#### Scenario: An existing install updates

- **WHEN** an installation made before this change updates and its saved token can create keys
- **THEN** the update adds the owner email and the production secret and leaves existing people's access unchanged

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access still opens and names the step left
