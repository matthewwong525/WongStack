## MODIFIED Requirements

### Requirement: Every stateful binding gets a staging twin, not a namespace prefix

The pack SHALL state, and its docs SHALL follow, a twin-by-default rule: each stateful binding in `env.staging` SHALL point at a second resource of the same kind rather than share the production resource behind a namespace prefix. A twin requires no application code; a prefix requires every call site to cooperate and lets one omission write into production data. A prefix SHALL be used only where a twin is genuinely unavailable.

The rule SHALL be documented as a table covering at least D1, Queues, R2, KV, Durable Objects, cron triggers, secrets, and service bindings, and SHALL call out that secrets are per-environment (`wrangler secret put --env staging`) and that a service binding left pointing at production is a silent cross-environment call.

The docs SHALL distinguish **non-inheritable** configuration — `vars` and the bindings, where an environment starts empty and drift means a binding is simply *absent* in staging — from **inheritable** configuration, where an environment starts from production's value and drift means staging silently *acquires* production's behaviour. The twin rule's "an environment inherits nothing it doesn't redeclare" SHALL be scoped to the non-inheritable set rather than stated of the config as a whole.

Cron triggers SHALL be documented as inheritable, and the guidance for keeping staging free of scheduled runs SHALL be the explicit override `"triggers": { "crons": [] }` inside `env.staging`. The docs SHALL NOT advise omitting the key, which leaves staging inheriting production's schedule and firing against the staging database — the opposite of the stated intent, with no error.

#### Scenario: R2 in staging is a second bucket

- **WHEN** a repo adds an R2 binding to a Worker that took the pack
- **THEN** the docs direct it to a second bucket inside `env.staging`
- **AND** a staging key prefix on the production bucket is explicitly rejected

#### Scenario: A newly added binding has a documented answer

- **WHEN** a repo adds a stateful binding the pack does not itself ship
- **THEN** the twin-by-default rule and its table answer what staging binds to without a new decision

#### Scenario: Keeping staging off a schedule

- **WHEN** a repo declares a cron trigger for production and wants staging exercised only by manual trigger
- **THEN** the docs direct it to declare an explicit empty `triggers.crons` inside `env.staging`
- **AND** omitting the key is documented as inheriting production's schedule rather than disabling it

### Requirement: The pack scripts are zero-config and byte-identical across repos

Every pack script SHALL be identical in every repo that installs it — no per-repo value SHALL be baked into a pack file. A script that needs the database name, an environment name, or the branch SHALL read it from the target-owned `wrangler.jsonc` or the CI environment. `scripts/cf-deploy.sh` SHALL hardcode no Worker name, environment id, or database id: it SHALL take the branch from `WORKERS_CI_BRANCH`, the production branch from `CF_PRODUCTION_BRANCH` (default `main`), and locate the wrangler config by the same root-then-subdirectory rule the other pack scripts share. `scripts/cf-secrets.mjs` SHALL follow the same rule, resolving the wrangler config and its environments through the shared config library and naming no secret key of its own.

The two credential files SHALL be kept distinct by role, and pack scripts SHALL read the one matching their purpose: `.env` holds the credentials **CI and the scripts themselves** use, chiefly `CLOUDFLARE_API_TOKEN`; `.dev.vars` holds the secrets **the Worker** reads at runtime. No pack script SHALL move a value from the former into a Worker's secret store.

#### Scenario: Two repos install the identical script

- **WHEN** two different repos both take the pack
- **THEN** their copies of each pack script are byte-for-byte identical
- **AND** each script resolves repo-specific values from `wrangler.jsonc`, the CI environment, `.env`, or `.dev.vars`, not from a constant in the script

#### Scenario: The deploy script picks the environment from the branch

- **WHEN** `cf-deploy.sh` runs in CI
- **THEN** it compares `WORKERS_CI_BRANCH` against `CF_PRODUCTION_BRANCH` to choose between a production deploy and a staging deploy
- **AND** it contains no hardcoded Worker name or database id

#### Scenario: The two credential files do not mix

- **WHEN** a pack script needs a credential
- **THEN** a script authenticating to Cloudflare reads `.env` and a script populating a Worker's secret store reads `.dev.vars`
- **AND** no script writes a `.env` value into a Worker

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. The pack SHALL also document the one setting it cannot merge — the Workers Builds **deploy command**, which a human sets to `bash scripts/cf-deploy.sh` in the dashboard.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: The deploy command is called out as a manual step

- **WHEN** a repo installs or adopts the pack
- **THEN** setting the Workers Builds deploy command is presented as an explicit human step, not a merged fragment

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard
