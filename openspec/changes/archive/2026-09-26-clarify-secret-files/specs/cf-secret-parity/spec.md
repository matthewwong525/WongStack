## MODIFIED Requirements

### Requirement: `.dev.vars` is the declared source of truth for Worker runtime secrets

The pack SHALL treat `.dev.vars` as the single declared list of secrets the Worker reads at runtime, and both deployed Workers SHALL be loadable from it. The file SHALL live in the folder that holds the wrangler config — `app/.dev.vars` in the shipped layout — and never at the repo root beside `.env`, so each live secrets file has one role and one location. A `secrets:push` operation SHALL load `.dev.vars` into the production Worker and `.dev.vars.staging` into the staging Worker via `wrangler secret bulk`, which accepts dotenv `KEY=VALUE` input directly, so no format conversion is performed. When `.dev.vars.staging` is absent the staging push SHALL fall back to `.dev.vars`, making identical values across both Workers the zero-configuration default and a divergent value an opt-in achieved by creating the second file.

When `secrets:push` runs in a linked Git worktree whose config folder has no `.dev.vars`, it SHALL read `.dev.vars` (and `.dev.vars.staging`) from the primary worktree at the same path relative to the repo root, resolving the primary worktree from Git metadata. A `.dev.vars` present in the active checkout SHALL take precedence. The `.env` refusal and the account-credential key check SHALL apply to the resolved file unchanged.

Per-environment divergence SHALL be documented as the correct choice for any secret with third-party **write** side effects — payment keys, outbound email or SMS credentials, webhook targets — because sharing such a value re-creates at the API layer the production-contamination hole that twinning stateful bindings closes.

#### Scenario: One command loads both Workers

- **WHEN** a maintainer adds a secret to `app/.dev.vars` and runs `secrets:push`
- **THEN** the secret is loaded into the production Worker and into the staging Worker
- **AND** neither Worker requires a separate hand-run `wrangler secret put`

#### Scenario: Staging diverges by adding a file, not by editing a script

- **WHEN** a repo needs staging to hold a different value for a secret
- **THEN** creating `app/.dev.vars.staging` is sufficient and the staging push reads it instead of `app/.dev.vars`
- **AND** a repo with no such file gets identical values in both Workers

#### Scenario: A push from a linked worktree reads the durable file

- **WHEN** `secrets:push` runs in a linked worktree that has no `app/.dev.vars`, and the primary worktree has one
- **THEN** the push loads both Workers from the primary worktree's `app/.dev.vars`
- **AND** it names the file it read without printing any value

#### Scenario: A local file in the linked worktree wins

- **WHEN** both the linked worktree and the primary worktree have `app/.dev.vars`
- **THEN** the push reads the linked worktree's file

#### Scenario: No file anywhere

- **WHEN** neither the active checkout nor the primary worktree has `app/.dev.vars`
- **THEN** the push exits non-zero without contacting Cloudflare
- **AND** the message names `app/.dev.vars` and points at `app/.dev.vars.example`

### Requirement: A committed example file declares the expected secret names

The pack SHALL ship a committed `.dev.vars.example` carrying the **names** of the Worker's runtime secrets with blank values, mirroring the `.env.example` convention so a new contributor learns what to fill in and the expected key set has a reviewable home in git. The example SHALL sit beside the wrangler config — `app/.dev.vars.example` in the shipped layout — which is where the gate reads it; the pack SHALL NOT ship a `.dev.vars.example` at the repo root.

Where this declared set is available the gate SHALL report keys that are declared but absent from a Worker, and keys held by a Worker but undeclared, as **warnings** rather than failures — a repo may legitimately set a secret out of band, and the example file is uncorroborated. Only Worker-against-Worker divergence SHALL fail the build.

#### Scenario: The example is where the gate looks

- **WHEN** a fresh install has the shipped `app/wrangler.jsonc`
- **THEN** `app/.dev.vars.example` exists and is committed
- **AND** no `.dev.vars.example` exists at the repo root

#### Scenario: An undeclared secret warns without breaking the build

- **WHEN** a Worker holds a secret that `.dev.vars.example` does not list
- **THEN** the gate reports it as a warning
- **AND** the check still passes if the two Workers otherwise agree

#### Scenario: A secret missing from both Workers is surfaced

- **WHEN** a key is declared in `.dev.vars.example` but held by neither Worker
- **THEN** the gate warns, since Worker-against-Worker parity cannot detect this case
