## MODIFIED Requirements

### Requirement: A parity gate compares the two Workers to each other, and staging's bindings to production's

The pack SHALL provide a `secrets:check` operation that fails when the two Workers have drifted. Because `.dev.vars` is git-ignored and therefore absent in CI, the authoritative comparison SHALL be **Worker against Worker** — the secret names held by production against those held by staging — which requires no local file, no secret value, and no state beyond the two environments themselves.

The check SHALL additionally assert that every stateful binding declared at the top level of `wrangler.jsonc` reappears inside `env.staging`, catching the drift class the twin rule describes: an environment inherits no binding it does not redeclare, so a binding added to production alone is simply absent in staging. This half SHALL be a pure config read requiring no credential, so it runs even on an unprovisioned repo. Durable Objects SHALL be excluded, their storage being per-Worker and so already isolated. A binding whose name starts with `MEMORY_` SHALL be excluded, because the memory store is production-only by design and has no staging twin. Queue producers SHALL be compared by binding name. Queue consumers SHALL be compared by count, because the twin rule requires a staging consumer to read a different queue from its production twin; a staging consumer that reads a queue that production also consumes SHALL produce a warning, not a failure.

Failure output SHALL name the missing keys or bindings so the fix is mechanical.

#### Scenario: A secret added to only one Worker fails the check

- **WHEN** a secret exists in the production Worker but is missing from staging
- **THEN** `secrets:check` exits non-zero and names the missing key

#### Scenario: The check runs in CI without a local secrets file

- **WHEN** the gate runs in CI, where `.dev.vars` does not exist
- **THEN** it still compares the two environments' secret names
- **AND** it does not fail merely because no local secrets file is present

#### Scenario: A binding added to production alone fails the check

- **WHEN** a stateful binding is declared at the top level of `wrangler.jsonc` with no counterpart in `env.staging`
- **THEN** `secrets:check` exits non-zero and names the binding

#### Scenario: The memory bindings are production-only

- **WHEN** the top level binds `MEMORY_DB` and `MEMORY_BUCKET` and `env.staging` binds neither
- **THEN** `secrets:check` reports no binding failure for them

#### Scenario: A correctly twinned queue consumer passes

- **WHEN** production consumes `app-jobs` and `env.staging` consumes `app-jobs-staging`
- **THEN** `secrets:check` reports no queue-consumer failure

#### Scenario: A consumer missing from staging fails the check

- **WHEN** production declares more queue consumers than `env.staging`
- **THEN** `secrets:check` exits non-zero and names both counts

#### Scenario: A consumer copied but not repointed warns

- **WHEN** a staging queue consumer reads a queue that production also consumes
- **THEN** `secrets:check` prints a warning that names the queue and does not fail on it
