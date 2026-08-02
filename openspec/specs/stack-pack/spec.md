# stack-pack Specification

## Purpose

The opt-in Cloudflare stack pack in the WongStack payload: the zero-config pipeline scripts, a seed template, guided config fragments, and the `wiki/stack/` pipeline docs — installed and refreshed only for a repo that opted in (`components.stackPack: true`), leaving WongStack byte-for-byte stack-agnostic for every repo that declines. The scripts auto-apply migrations on deploy (production on the default branch, staging elsewhere), deploy each branch to the Worker that belongs to it, and rebuild staging from a checked-in seed without ever touching production.

## Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — that a repo installs only by opting in. A repo that does not opt in SHALL receive none of the pack's files and SHALL remain stack-agnostic. Opt-in state SHALL be recorded as `components.stackPack` (boolean) in `.claude/.wong-stack.json`; absent or false means the repo never took the pack.

#### Scenario: A repo that declines the pack is unaffected

- **WHEN** a repo installs or syncs WongStack without opting into the pack
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it
- **AND** `components.stackPack` is absent or false

#### Scenario: A repo that opts in receives the pack

- **WHEN** a repo opts into the pack
- **THEN** it receives the pack scripts, the seed template, and the pipeline docs, and is guided through the config fragments
- **AND** `components.stackPack` is true

### Requirement: The pack is adoptable after setup

Declining the pack at setup SHALL NOT be terminal. The supported late-adoption route SHALL be: set `components.stackPack: true` in `.claude/.wong-stack.json`, run `/wong-sync` to land the pack's drop-in files (the provisioning skill among them), then run `/wong-cloudflare` to configure and provision. Every payload pointer to late adoption SHALL name this route (or `/wong-cloudflare` directly, where the skill is already present) and SHALL NOT direct users at a path that refuses — in particular, no prose SHALL claim `/wong-sync` offers the pack to a repo that has not opted in.

#### Scenario: A declined repo adopts later

- **WHEN** a repo that said no at setup decides it wants the app hosted
- **THEN** setting the flag and running `/wong-sync` lands the pack files, and `/wong-cloudflare` completes configuration and provisioning
- **AND** no step of that route stops and points back at another step of it

#### Scenario: Pointers are truthful

- **WHEN** a reader follows any payload reference to adopting the pack later
- **THEN** the route it names works as described

### Requirement: Staging is a separate Worker declared as a Wrangler environment

The pack SHALL isolate staging at the Worker level, not the binding level. `wrangler.jsonc` SHALL declare a `staging` environment with its own Worker `name` and its own bindings, and a non-production branch SHALL be **deployed** to that Worker rather than uploaded as a version of the production Worker. No pack script SHALL rewrite `wrangler.jsonc` to redirect a binding.

The pack SHALL ship `scripts/cf-deploy.sh`, wired to the Workers Builds deploy command. On the production branch it SHALL run `wrangler deploy`. On any other branch it SHALL run `wrangler deploy --env staging` followed by `wrangler versions upload --env staging --preview-alias <branch>`, so the deployed staging Worker runs branch code *and* the per-commit preview URL is preserved. The deploy SHALL come first: a version cannot be uploaded against a Worker that does not yet exist, which is the state on a repo's first branch push. Both non-production commands SHALL carry `--env staging`; omitting it on the version upload binds the production Worker's resources.

#### Scenario: A queue message on a branch is handled by staging

- **WHEN** a non-production branch is pushed and a message is enqueued to the staging queue
- **THEN** the deployed staging Worker handles it, running that branch's code against the staging database
- **AND** neither the production Worker nor the production database is involved

#### Scenario: A branch push still yields a per-commit preview URL

- **WHEN** the deploy script runs on a non-production branch
- **THEN** a version alias URL for that commit is created against the staging environment
- **AND** the deployed staging Worker is updated in the same run

#### Scenario: The production branch deploys production

- **WHEN** the deploy script runs on the production branch
- **THEN** it runs `wrangler deploy` with no environment flag
- **AND** the staging Worker is not touched

#### Scenario: No script mutates the wrangler config

- **WHEN** any pack script runs, on any branch
- **THEN** `wrangler.jsonc` is left byte-for-byte unchanged

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

### Requirement: Migrations auto-apply on deploy, forward-only, by timestamp prefix

The pack SHALL apply D1 migrations automatically as part of the deploy build: on the default branch to the production database, on any other branch to the staging database bound by `env.staging`. Migrations SHALL be forward-only (no down scripts), and their filenames SHALL use a timestamp prefix (`YYYYMMDDHHMMSS_name.sql`) so that filename order matches author order and two branches cannot collide on a prefix. The pack SHALL NOT carry a duplicate-prefix guard — the timestamp scheme makes collisions structurally impossible. The build script SHALL NOT swap or otherwise rewrite any binding.

#### Scenario: Preview branch migrates staging

- **WHEN** the build runs on a non-default branch in CI
- **THEN** pending migrations apply to the staging database via the `staging` environment
- **AND** the production database is not touched and `wrangler.jsonc` is not modified

#### Scenario: Default branch migrates production

- **WHEN** the build runs on the default branch in CI
- **THEN** pending migrations apply to the production database as part of the same deploy

#### Scenario: Two branches add migrations without colliding

- **WHEN** two branches each add a new migration file
- **THEN** each filename carries a distinct timestamp prefix and both apply in timestamp order with no prefix collision

### Requirement: Staging is a seeded fixture database, never a prod mirror

The staging reset script SHALL rebuild staging from a checked-in seed, not from production data: it SHALL drop every object, apply the migrations, then apply `schema/seed.sql` (data-only INSERTs). It SHALL target staging through the `staging` environment, SHALL NOT read, export, or copy production data, and SHALL NOT touch the production database. `schema/seed.sql` SHALL ship as a commented, empty template. A change that alters a seeded table SHALL update `schema/seed.sql` in the same change.

#### Scenario: Reset rebuilds staging from the seed

- **WHEN** the staging reset script runs
- **THEN** it drops all objects, applies migrations, and applies `schema/seed.sql` against the `staging` environment's database
- **AND** it issues no read or export against the production database

#### Scenario: The seed ships empty

- **WHEN** a repo first takes the pack
- **THEN** `schema/seed.sql` is present as a commented, data-only template with no rows assumed

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard

### Requirement: The pack ships the D1 pipeline and prod-recovery docs

The `wiki/stack/` section SHALL gain a core-stack page and pipeline documentation covering the two-**environment** model, auto-migrate-on-deploy, timestamp migrations, the seeded-staging model and reset, and the production-recovery runbooks — recovery via `wrangler d1 time-travel`, the rule never to hand-apply schema to production, and how to reconcile `d1_migrations` when production drifts.

The pipeline page SHALL open with the diagnostic that motivates the model — a preview branch produces a **version**, and a version serves only HTTP, so queue consumers, cron triggers, and other non-request handlers run on the deployed version — and SHALL also cover the twin-by-default table, the capability difference between the version-alias URL and the staging Worker URL, that staging is shared across branches, and why per-PR environments are declined. These pages SHALL follow the progressive-disclosure rulebook and link from the existing `wiki/stack/` hub. They SHALL install only with the pack.

#### Scenario: Pipeline docs are reachable from the hub

- **WHEN** a reader opens the `wiki/stack/` hub in a repo that took the pack
- **THEN** it links the core-stack page and the pipeline pages
- **AND** the pipeline page covers the two-environment model, timestamp migrations, seeded staging, and both prod-recovery runbooks

#### Scenario: The version-vs-deployment distinction is stated up front

- **WHEN** a reader opens the pipeline page
- **THEN** it explains before the mechanics that a branch preview is a version and that a version serves only HTTP
- **AND** it states which of the two preview URLs processes queue messages

#### Scenario: Per-PR environments are documented as declined

- **WHEN** a reader asks why each PR does not get its own Worker
- **THEN** the page records the decision and its cost, so it is not re-litigated

#### Scenario: Docs are absent without the pack

- **WHEN** a repo did not take the pack
- **THEN** the pack's pipeline docs are not installed

### Requirement: The pack documents its adoption path for repos on the previous model

Because `/wong-sync` never modifies a file that already exists, a repo that installed the previous staging model keeps its old scripts and config indefinitely. The pack SHALL therefore document an ordered, human-run adoption runbook covering: creating the staging twins, adding the `env.staging` block and removing `preview_database_id`, putting secrets per environment, repointing service bindings, confirming Access covers the staging hostname, taking the new and updated scripts and deleting `scripts/swap-d1-id.js`, updating the `db:*` scripts, and repointing the Workers Builds deploy command. The runbook SHALL order the steps so an interrupted upgrade leaves the repo behaving as it did before.

#### Scenario: An existing repo upgrades deliberately

- **WHEN** a repo that took the previous pack syncs WongStack
- **THEN** its existing pack files are left untouched and the gap is surfaced through the adapt step
- **AND** the runbook gives the ordered steps to adopt the staging environment by hand

#### Scenario: A partial upgrade is not broken

- **WHEN** a repo has added `env.staging` but has not yet repointed the Workers Builds deploy command
- **THEN** branch deploys continue to behave as they did before the upgrade

### Requirement: The pack ships a GitHub Actions workflow as its CI


The pack SHALL include a GitHub Actions workflow file that runs the pack's build and deploy scripts on push, supplying the branch name they need and reading the Cloudflare credentials from GitHub repository secrets. It SHALL be a drop-in payload file subject to the same copy-if-absent, never-overwrite rule as every other pack file, and SHALL surface as a pull-request check so the existing delivery gate has something to wait on.

The workflow SHALL NOT reimplement any branch logic. Deciding which database to migrate and which Worker to deploy to belongs to `scripts/cf-build.sh` and `scripts/cf-deploy.sh`, so that both CI backends run identical code and the deploy model is independent of the CI choice.

Where the Cloudflare credentials are absent, the workflow SHALL build without deploying, so a repo that took the pack but has not yet been provisioned gets a useful check rather than a permanently failing one. That path SHALL NOT route through the build wrapper, which requires a staging environment an unprovisioned repo does not yet have.

#### Scenario: A pack repo gains a PR check

- **WHEN** a repo that took the pack pushes a branch and opens a pull request
- **THEN** the workflow runs and reports as a check on that pull request
- **AND** `/save` and `/ship` wait on it through the existing check-waiting path

#### Scenario: An unprovisioned repo still gets a green check

- **WHEN** the workflow runs in a repo with no `CLOUDFLARE_API_TOKEN` secret
- **THEN** it builds the app and deploys nothing
- **AND** it reports why, naming the provisioning skill as the next step

#### Scenario: The workflow is never overwritten

- **WHEN** `/wong-sync` runs in a repo that already has the workflow file
- **THEN** the existing file is left untouched
- **AND** any upstream change to it surfaces through the adapt step as a proposal

### Requirement: The branch variable is CI-neutral


The pack's build and deploy scripts SHALL read the CI branch from `CF_BRANCH`, falling back to `WORKERS_CI_BRANCH` when it is unset. A repo running Cloudflare Workers Builds SHALL therefore continue to work with no change, and a repo may run both backends while migrating between them.

#### Scenario: A Workers Builds repo is unaffected

- **WHEN** the scripts run under Cloudflare Workers Builds, which sets only `WORKERS_CI_BRANCH`
- **THEN** they resolve the branch and behave exactly as before

#### Scenario: Neither variable is set

- **WHEN** the scripts run on a developer's machine with neither variable set
- **THEN** they take their local path: no remote database is migrated and nothing is deployed

### Requirement: A non-production branch can never deploy to the production Worker


The pack SHALL select the staging environment by the mechanism the app's build actually uses: `--env staging` at deploy time for a plain wrangler build, and `CLOUDFLARE_ENV=staging` at **build** time where the build goes through `@cloudflare/vite-plugin`, which flattens the selected environment into a generated config and redirects wrangler at it. Where that redirect exists the deploy SHALL NOT pass `--env`, which has no effect once the environment is baked in.

Independently of which mechanism applied, `cf-deploy.sh` SHALL read the Worker name the deploy will actually use and **refuse to deploy** when a non-production branch resolves to the production Worker's name. The error SHALL name the branch, the Worker, and the two things that fix it.

This exists because the failure is silent: the build is green, a preview URL is printed, and it is production's.

#### Scenario: A plugin-built branch deploys to staging

- **WHEN** a non-production branch is built through `@cloudflare/vite-plugin` and deployed
- **THEN** the generated config describes the staging environment
- **AND** the staging Worker is deployed, bound to the staging database
- **AND** the production Worker and production database are untouched

#### Scenario: The environment failed to apply

- **WHEN** a non-production branch's resolved Worker name equals the production Worker's name
- **THEN** the deploy is refused before anything is uploaded
- **AND** the message names the branch, the production Worker, and both possible fixes

#### Scenario: A plain wrangler build is unaffected

- **WHEN** the build produces no redirect config
- **THEN** the deploy passes `--env staging` as before

### Requirement: The pack's CI publishes the preview URL it produced

The pack's deploy script SHALL surface the per-commit preview URL that `wrangler versions upload` produced, and the pack's GitHub Actions workflow SHALL publish it to GitHub as a Deployment carrying an `environment_url`.

The URL SHALL be **harvested from wrangler's own output, never constructed** from the documented `<alias>-<worker>-staging.<subdomain>.workers.dev` shape. A constructed URL is a guess that can answer `200` while pointing at a different commit, or at a Worker this deploy never touched — which defeats the purpose of a per-commit URL. When wrangler prints no URL, the scripts SHALL publish nothing and callers SHALL report that no preview URL exists, rather than emitting an unverified one.

Publication SHALL be a no-op outside GitHub Actions: under Cloudflare Workers Builds, Cloudflare's own GitHub integration already attaches the URL to the commit, and the deploy script SHALL NOT duplicate it.

Failure to publish SHALL NOT fail the deploy. The deploy has already succeeded by that point, and a missing URL degrades the tooling that reads it rather than the release.

#### Scenario: Actions publishes the URL wrangler printed

- **WHEN** the workflow deploys a non-production branch and `wrangler versions upload` prints a preview URL
- **THEN** the workflow creates a GitHub Deployment for the head SHA whose status carries that URL as `environment_url`
- **AND** `.claude/skills/save/scripts/preview-url.sh` resolves that same URL for the commit

#### Scenario: No URL printed is reported, not invented

- **WHEN** `wrangler versions upload` prints no `workers.dev` URL
- **THEN** the deploy script warns and publishes nothing
- **AND** the deploy itself still succeeds

#### Scenario: Workers Builds is left alone

- **WHEN** the deploy script runs under Cloudflare Workers Builds rather than GitHub Actions
- **THEN** it emits the URL for the log but publishes no GitHub Deployment, because Cloudflare's integration already did
