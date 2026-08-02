## MODIFIED Requirements

### Requirement: The gate skips cleanly on a repo that has not adopted the model

The parity gate's **secret** half SHALL detect the absence of `CLOUDFLARE_API_TOKEN` and skip with an explanatory message and a success exit status, rather than failing. This matches the workflow's existing behaviour of building without deploying before provisioning, so a repo that has not yet run provisioning gets a real pull-request check instead of a permanently red one. The **binding** half needs no credential and SHALL still run, so an unprovisioned repo gets that signal.

The **binding** half SHALL likewise skip, not fail, when the wrangler config declares no `env.staging` at all. The gate's purpose is catching drift *within* the two-Worker model, not requiring a repo to adopt it: a repo partway through the adoption runbook, or one shipping a template app, would otherwise get exactly the permanently red check the pack's CI is designed to avoid. A binding missing from a *declared* `env.staging` still fails.

**Where no wrangler config exists at all, the gate SHALL skip and exit zero.** This is the state the pack ships in — its CI arrives before `/wong-cloudflare` creates the config — so it is the *first* state the gate is ever evaluated in, not an edge case. Aborting here fails the check on a new adopter's first push, before they have done anything wrong. The absence of a config SHALL be treated exactly as the absence of `env.staging` is: nothing to compare, so nothing to report.

Where the config cannot be parsed as an object at all (a `wrangler.toml`), the gate SHALL report that it cannot check and continue, rather than inferring bindings.

The three skip conditions — no credential, no config, no `env.staging` — SHALL be stated together wherever the gate's behaviour is documented, so that "the check never produces a permanently red check" is a claim the code actually satisfies.

#### Scenario: No credential means skip, not fail

- **WHEN** the workflow runs on a repo where `CLOUDFLARE_API_TOKEN` is unset
- **THEN** the parity step reports that it is skipping the secret comparison because the repo is not provisioned
- **AND** the check does not fail
- **AND** the binding comparison still runs

#### Scenario: No wrangler config means skip, not abort

- **WHEN** the gate runs in a repo that has the pack installed but no wrangler config yet
- **THEN** it reports that there is no config to check and exits zero
- **AND** the workflow step passes

#### Scenario: Provisioning turns the gate on with no further edit

- **WHEN** a repo is provisioned and the secret is set
- **THEN** the same unchanged workflow step begins enforcing parity

#### Scenario: A repo not on the two-Worker model is not failed for it

- **WHEN** the gate runs against a wrangler config with no `env.staging`
- **THEN** it reports that it is skipping the binding comparison and exits zero
