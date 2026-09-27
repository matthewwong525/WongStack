# stack-pack Specification

## Purpose

The Cloudflare stack pack every install takes: the deploy and data pipeline scripts, the CI workflow, a seed template, config fragments, and the `wiki/stack/` docs. Each branch deploys to the Worker that belongs to it, migrations apply on deploy, and staging is rebuilt from a seed without ever touching production.

## Requirements

### Requirement: Every install takes the pack

The pack SHALL ship in the core payload to every install and every sync, and no install-record flag SHALL gate it.

#### Scenario: A new install

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives the pack scripts, the workflow, the seed template, and the pipeline docs

#### Scenario: A legacy opt-out flag

- **WHEN** an install record carries `components.stackPack: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again

### Requirement: Staging is its own Worker

A non-production branch SHALL deploy to a separate staging Worker with its own bindings, declared as the `staging` environment, and SHALL also get a per-commit preview URL; the production branch SHALL deploy production. No pack script SHALL rewrite the wrangler config.

#### Scenario: A branch's queue message

- **WHEN** a branch is pushed and a message is enqueued to the staging queue
- **THEN** the staging Worker handles it with that branch's code against the staging database
- **AND** neither the production Worker nor the production database is involved

### Requirement: A branch never deploys to production

The deploy SHALL refuse, before uploading anything, when a non-production branch resolves to the production Worker's name, whichever build path selected the environment. It SHALL read that name from the config's real structure, never from a comment or a key such as `database_name`.

#### Scenario: The environment failed to apply

- **WHEN** a non-production branch's resolved Worker name equals production's
- **THEN** the deploy stops before any upload and names the branch, the Worker, and the fixes

### Requirement: Every stateful binding gets a staging twin

The pipeline docs SHALL direct each stateful binding in staging at a second resource of the same kind, not a prefix on the production resource, and SHALL keep staging off production's schedule with an explicit empty cron list, because an omitted list inherits production's.

#### Scenario: An R2 binding

- **WHEN** a repo adds an R2 binding
- **THEN** the docs direct staging to a second bucket and reject a key prefix on the production bucket

#### Scenario: A cron trigger

- **WHEN** a repo declares a production cron and wants none in staging
- **THEN** the docs direct it to declare `"triggers": { "crons": [] }` inside `env.staging`

### Requirement: Pack scripts are identical in every repo

Every pack script SHALL be byte-identical across repos and SHALL read repo values from the target's own wrangler config, the CI environment, or the local credential files, under GitHub Actions and Cloudflare Workers Builds alike. Outside CI, a pack script SHALL touch no remote database and deploy nothing.

#### Scenario: A developer's machine

- **WHEN** the build runs with no CI branch set
- **THEN** it builds without migrating any remote database or deploying

### Requirement: Migrations apply on deploy

Each deploy SHALL apply pending D1 migrations to its own database: production on the production branch, staging elsewhere. Migrations SHALL be forward-only with a timestamp prefix, so two branches never collide, and a Worker that binds no D1 SHALL build without migrating.

#### Scenario: A branch migrates staging

- **WHEN** CI builds a non-production branch
- **THEN** pending migrations apply to the staging database and production is untouched

#### Scenario: Two branches add migrations

- **WHEN** two branches each add a migration
- **THEN** both apply in timestamp order with no name collision

### Requirement: Staging is seeded, never a production copy

The staging reset SHALL rebuild staging from the migrations and the checked-in `schema/seed.sql`, which ships as an empty template. It SHALL never read or copy production data, and SHALL drop nothing when the staging database has production's name.

#### Scenario: A reset

- **WHEN** the staging reset runs
- **THEN** staging holds the migrated schema and the seed rows, and no production read happened

#### Scenario: Staging points at production

- **WHEN** the staging `database_name` equals production's
- **THEN** the reset stops with an error and drops nothing

### Requirement: Config fragments merge, never overwrite

The pack's fragments for `package.json`, the wrangler config, `.env.example`, and `.gitignore` SHALL merge into the target's files with its other content kept. Setup's provisioning SHALL apply them, with the target's own resource names and ids, and an upstream change to a fragment SHALL reach an installed repo only through a `/wong-sync` plan.

#### Scenario: An existing package.json

- **WHEN** the fragment merges into a repo's `package.json`
- **THEN** the repo's other scripts and fields stay, and the migration scripts name this repo's databases

### Requirement: A created wrangler config deploys

A wrangler config made from the fragment SHALL declare a deployable Worker, with entry point, assets, and compatibility settings beside the bindings, and every config-relative path SHALL be right for both the repo-root and `app/` layouts.

#### Scenario: The app layout

- **WHEN** provisioning creates `app/wrangler.jsonc`
- **THEN** `wrangler deploy` has an entry point, and migrations are found at `../schema/migrations`

### Requirement: Local credentials cannot be committed

The `.gitignore` fragment SHALL cover `.env*` and `.dev.vars*` while keeping `.env.example` and `.dev.vars.example` committable. The token variable SHALL be `CLOUDFLARE_API_TOKEN` everywhere, stated by one payload file, and no pack script SHALL move a `.env` value into a Worker's secrets.

#### Scenario: A per-environment secrets file

- **WHEN** a repo creates `.dev.vars.staging`
- **THEN** git already ignores it, and `.dev.vars.example` stays committable

### Requirement: The pipeline docs ship with the pack

The `wiki/stack/` section SHALL cover the two-environment model, that a branch preview is a version serving only HTTP, the twin rule, timestamp migrations, seeded staging, why a Worker per pull request is declined, and runbooks for production recovery: time travel, never hand-applying schema, and reconciling drifted migrations.

#### Scenario: Which preview runs queues

- **WHEN** a reader opens the pipeline page
- **THEN** it says up front which of the two preview URLs processes queue messages

### Requirement: The pack's CI is a GitHub Actions check

The pack SHALL ship a GitHub Actions workflow that runs the pack scripts on push and reports as a pull-request check that `/save` and `/ship` wait on. The workflow SHALL hold no branch logic of its own. A repo not yet provisioned SHALL get a green check that says so and names `/wong-sync` as the next step.

#### Scenario: An unprovisioned repo

- **WHEN** the workflow runs with no wrangler config or no Cloudflare secret
- **THEN** it deploys nothing, fails no step, and names `/wong-sync`

### Requirement: CI publishes the preview URL wrangler printed

The pack's CI SHALL publish each branch commit's preview URL as a GitHub Deployment, taken from wrangler's output and never built from the URL pattern. When wrangler prints no URL, nothing SHALL be published, and a failed publish SHALL NOT fail the deploy.

#### Scenario: A branch deploy

- **WHEN** a branch deploy prints a preview URL
- **THEN** the branch head commit carries that URL, and `/save` reports the same one

#### Scenario: No URL printed

- **WHEN** wrangler prints no preview URL
- **THEN** CI warns, publishes nothing, and the deploy still succeeds

### Requirement: One commit deploys once

A branch commit SHALL deploy exactly once, even with an open pull request, and the skipped duplicate run SHALL NOT cancel the deploying run. A pull request from a fork SHALL still get a check.

#### Scenario: A branch with an open pull request

- **WHEN** a commit is pushed to a branch with an open same-repo pull request
- **THEN** one job deploys it, and the check reports success rather than cancellation

### Requirement: An untouched main app is not redeployed

When a branch leaves the main app and every mini app untouched, CI SHALL skip the main app's migration, build, and deploy and say so. A change to any mini app SHALL deploy the main app, because its Worker serves them.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/`
- **THEN** the check is green and no main-app deploy ran

#### Scenario: A mini-app change

- **WHEN** a push to the default branch changes only `mini-apps/apps/`
- **THEN** CI deploys the production main app with the mini apps in it

### Requirement: The main Worker answers its own routes

The main Worker SHALL handle `/api/`, `/_memory/`, and `/apps/<name>/api/` itself, never the single-page fallback, and SHALL never serve a mini app's handler, test, or TypeScript source. The routing SHALL ship as a pack module, so `/wong-sync` keeps it current.

#### Scenario: An API path in a browser tab

- **WHEN** a person opens `/apps/hello/api/greeting`
- **THEN** the hello app's handler answers

#### Scenario: A source file by path

- **WHEN** a client requests a mini app's `api.mjs` or test file
- **THEN** the Worker does not return its contents

### Requirement: A preview can upload from the agent host

The pack SHALL ship a script that uploads a staging preview of the main app from the agent host and prints the URL wrangler reports. It SHALL never deploy production, SHALL refuse the default branch without a named alias, and SHALL stop when staging resolves to production's name.

#### Scenario: On the default branch

- **WHEN** the script runs on the default branch with no named alias
- **THEN** it refuses and uploads nothing

### Requirement: A sync ships only the example mini app

The payload SHALL carry the mini-app router and the example app `mini-apps/apps/hello/`, and no other app folder, so an app made in the source repo never reaches a target.

#### Scenario: An app in the source repo

- **WHEN** the source gains `mini-apps/apps/tips/` and a target syncs
- **THEN** no path under `mini-apps/apps/tips/` is selected

### Requirement: Older installs retire the mini Workers

A `/wong-sync` plan for an install with its own mini-app Worker SHALL move the mini apps onto the main Worker and delete the old mini-app config. It SHALL delete the `<repo>-mini` and `<repo>-mini-staging` Workers only after production serves every saved app at `/apps/<name>/`.

#### Scenario: Production has not deployed yet

- **WHEN** the production main Worker does not answer `/apps/` yet
- **THEN** no Worker is deleted
