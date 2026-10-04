## MODIFIED Requirements

### Requirement: One secrets file loads both Workers

`app/.dev.vars` SHALL be the declared list of Worker runtime secrets, and `secrets:push` SHALL load ordinary runtime secrets into production and staging; a git-ignored `app/.dev.vars.staging` SHALL give staging its own values. A linked worktree with no copy SHALL read the primary worktree's file. Private production Access activation, sealing, login-management and rollout bindings SHALL be omitted entirely from staging sources/config, including blank declarations. Both target sources and staging config SHALL be validated before the first provider write. Unsafe fallback, explicit override or staging source SHALL load nothing into either Worker.

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
