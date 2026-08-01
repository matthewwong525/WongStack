# cf-secret-parity Specification

## Purpose

Keep the stack pack's two Workers — production and `env.staging` — in agreement about the secrets they hold and the bindings they declare, and keep Cloudflare account credentials out of Worker runtime environments. `.dev.vars` is the declared source of truth for Worker runtime secrets; a CI gate compares the two Workers against each other by name only.

## Requirements

### Requirement: `.dev.vars` is the declared source of truth for Worker runtime secrets

The pack SHALL treat `.dev.vars` as the single declared list of secrets the Worker reads at runtime, and both deployed Workers SHALL be loadable from it. A `secrets:push` operation SHALL load `.dev.vars` into the production Worker and `.dev.vars.staging` into the staging Worker via `wrangler secret bulk`, which accepts dotenv `KEY=VALUE` input directly, so no format conversion is performed. When `.dev.vars.staging` is absent the staging push SHALL fall back to `.dev.vars`, making identical values across both Workers the zero-configuration default and a divergent value an opt-in achieved by creating the second file.

Per-environment divergence SHALL be documented as the correct choice for any secret with third-party **write** side effects — payment keys, outbound email or SMS credentials, webhook targets — because sharing such a value re-creates at the API layer the production-contamination hole that twinning stateful bindings closes.

#### Scenario: One command loads both Workers

- **WHEN** a maintainer adds a secret to `.dev.vars` and runs `secrets:push`
- **THEN** the secret is loaded into the production Worker and into the staging Worker
- **AND** neither Worker requires a separate hand-run `wrangler secret put`

#### Scenario: Staging diverges by adding a file, not by editing a script

- **WHEN** a repo needs staging to hold a different value for a secret
- **THEN** creating `.dev.vars.staging` is sufficient and the staging push reads it instead of `.dev.vars`
- **AND** a repo with no such file gets identical values in both Workers

### Requirement: The secrets script refuses to read `.env`

The secrets script SHALL refuse, by explicit check rather than by convention, to load `.env` (or any file resolving to it) into a Worker's runtime secret store, and SHALL exit non-zero with an explanation naming the `.env` / `.dev.vars` split. `.env` holds `CLOUDFLARE_API_TOKEN` — a user-scoped credential that can widen its own permissions and create account resources — together with the Cloudflare Access service tokens. Placing any of them in a Worker's runtime environment would let a log leak or code-execution bug in the Worker escalate to the entire Cloudflare account, so the separation SHALL be enforced in code.

The push operation SHALL accept an optional explicit file argument. Without one the refusal would be unreachable — the push would only ever read its default file — and the explicit argument is precisely the route by which someone reaches for "the file with the secrets in it". The check SHALL resolve symlinks before judging a path, so a `.dev.vars` linked to `.env` is refused on the same grounds as `.env` itself.

The script SHALL additionally **fail**, not warn, when the file it is about to push declares a key matching a Cloudflare account-credential shape (`CLOUDFLARE_*`, `CF_ACCESS_*`). The file boundary cannot catch a credential pasted directly into `.dev.vars`, and a warning that then proceeds would place the credential in the Worker regardless — the outcome this requirement exists to prevent.

#### Scenario: A pointed-at `.env` is rejected

- **WHEN** someone runs the secrets script against `.env`
- **THEN** it exits non-zero without contacting Cloudflare
- **AND** the message explains that `.env` holds CI and provisioning credentials while `.dev.vars` holds Worker runtime secrets

#### Scenario: A symlink to the credential file is rejected

- **WHEN** `.dev.vars` is a symlink resolving to `.env`
- **THEN** the push exits non-zero on the same grounds, without contacting Cloudflare

#### Scenario: An account credential pasted into the source file stops the push

- **WHEN** `.dev.vars` declares a `CLOUDFLARE_*` or `CF_ACCESS_*` key
- **THEN** the push exits non-zero and names the offending key
- **AND** no secret is loaded into either Worker

#### Scenario: The account-root credential never reaches a Worker

- **WHEN** a repo has followed the pack's conventions and pushed its secrets
- **THEN** no deployed Worker holds `CLOUDFLARE_API_TOKEN` or an Access service token in its secret store

### Requirement: A parity gate compares the two Workers to each other, and staging's bindings to production's

The pack SHALL provide a `secrets:check` operation that fails when the two Workers have drifted. Because `.dev.vars` is git-ignored and therefore absent in CI, the authoritative comparison SHALL be **Worker against Worker** — the secret names held by production against those held by staging — which requires no local file, no secret value, and no state beyond the two environments themselves.

The check SHALL additionally assert that every stateful binding declared at the top level of `wrangler.jsonc` reappears inside `env.staging`, catching the drift class the twin rule describes: an environment inherits no binding it does not redeclare, so a binding added to production alone is simply absent in staging. This half SHALL be a pure config read requiring no credential, so it runs even on an unprovisioned repo. Durable Objects SHALL be excluded, their storage being per-Worker and so already isolated.

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

### Requirement: A committed example file declares the expected secret names

The pack SHALL ship a committed `.dev.vars.example` carrying the **names** of the Worker's runtime secrets with blank values, mirroring the `.env.example` convention so a new contributor learns what to fill in and the expected key set has a reviewable home in git.

Where this declared set is available the gate SHALL report keys that are declared but absent from a Worker, and keys held by a Worker but undeclared, as **warnings** rather than failures — a repo may legitimately set a secret out of band, and the example file is uncorroborated. Only Worker-against-Worker divergence SHALL fail the build.

#### Scenario: An undeclared secret warns without breaking the build

- **WHEN** a Worker holds a secret that `.dev.vars.example` does not list
- **THEN** the gate reports it as a warning
- **AND** the check still passes if the two Workers otherwise agree

#### Scenario: A secret missing from both Workers is surfaced

- **WHEN** a key is declared in `.dev.vars.example` but held by neither Worker
- **THEN** the gate warns, since Worker-against-Worker parity cannot detect this case

### Requirement: The gate never discloses a secret value

The parity gate SHALL compare secret **names** only. It SHALL NOT read, print, log, diff, or transmit a secret value anywhere — including in success output, failure output, and error paths — so that the check is safe to run in CI where its output is retained in build logs.

#### Scenario: Failure output carries no value

- **WHEN** the check fails because a key is missing from one environment
- **THEN** the output names the key and no value appears in it

#### Scenario: CI logs stay safe to read

- **WHEN** the gate has run in CI
- **THEN** its retained log contains no secret value from any environment

### Requirement: The gate skips cleanly on a repo that has not adopted the model

The parity gate's **secret** half SHALL detect the absence of `CLOUDFLARE_API_TOKEN` and skip with an explanatory message and a success exit status, rather than failing. This matches the workflow's existing behaviour of building without deploying before provisioning, so a repo that has not yet run provisioning gets a real pull-request check instead of a permanently red one. The **binding** half needs no credential and SHALL still run, so an unprovisioned repo gets that signal.

The **binding** half SHALL likewise skip, not fail, when the wrangler config declares no `env.staging` at all. The gate's purpose is catching drift *within* the two-Worker model, not requiring a repo to adopt it: a repo partway through the adoption runbook, or one shipping a template app, would otherwise get exactly the permanently red check the pack's CI is designed to avoid. A binding missing from a *declared* `env.staging` still fails.

Where the config cannot be parsed as an object at all (a `wrangler.toml`), the gate SHALL report that it cannot check and continue, rather than inferring bindings.

#### Scenario: No credential means skip, not fail

- **WHEN** the workflow runs on a repo where `CLOUDFLARE_API_TOKEN` is unset
- **THEN** the parity step reports that it is skipping the secret comparison because the repo is not provisioned
- **AND** the check does not fail
- **AND** the binding comparison still runs

#### Scenario: Provisioning turns the gate on with no further edit

- **WHEN** a repo is provisioned and the secret is set
- **THEN** the same unchanged workflow step begins enforcing parity

#### Scenario: A repo not on the two-Worker model is not failed for it

- **WHEN** the gate runs against a wrangler config with no `env.staging`
- **THEN** it reports that it is skipping the binding comparison and exits zero
