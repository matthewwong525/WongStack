## ADDED Requirements

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
