# Spec Delta

## ADDED Requirements

### Requirement: Branch code never holds the deploy token

On the GitHub route, the deploy token SHALL be in reach only of the default branch's own deploy scripts and the tools they install with install scripts off. A branch's own install, tests, build, local actions and scripts SHALL run where no Cloudflare credential exists, on a separate machine from the steps that hold it. A pull request from a fork SHALL only build, and SHALL never select production, whatever its branch is named. Only a push to the repository's default branch SHALL deploy production.

#### Scenario: A branch's package reads its environment

- **WHEN** a branch saved through the app adds an install script that prints the deploy token and runs a production deploy
- **THEN** the script finds no Cloudflare credential, and nothing it runs reaches the production Worker or database

#### Scenario: A fork's branch is named like the default branch

- **WHEN** a pull request from a fork whose branch is named `main` runs the deploy workflow
- **THEN** it builds without deploying, and no production migration or deploy runs

#### Scenario: A branch started before the split

- **WHEN** a branch whose commit carries the old workflow, which reads the old secret name `CLOUDFLARE_API_TOKEN` at job level, is pushed after the update's deploy key step ran
- **THEN** that workflow finds no deploy token and builds without deploying

### Requirement: A preview deploy lands only on staging

Before a branch's build is deployed, the default branch's copy of the deploy scripts SHALL check it. The preview SHALL stop with a plain reason, before any migration or deploy, unless the build names the staging Worker's exact name from the default branch's config. It SHALL also stop when the build claims a route or custom domain, carries a build command of its own, reads a path outside the project, or binds any D1 database, memory's included, other than the default branch's own staging databases, each matched by name and id. Its migration SHALL run only against that database, named by the default branch's config. A new binding of any other kind SHALL still preview.

#### Scenario: A branch renames staging to production

- **WHEN** a branch's build names its Worker after the production Worker or another Worker
- **THEN** the preview stops naming the expected staging Worker, and nothing is migrated or deployed

#### Scenario: A branch adds a binding

- **WHEN** a branch's build adds a new staging-only binding and keeps staging's name
- **THEN** the preview deploys with that binding

#### Scenario: A branch binds another database

- **WHEN** a branch's build binds a database other than the default branch's staging ones, that database's name with another id, or another database under the memory binding
- **THEN** the preview stops naming the expected staging database, and nothing is migrated or deployed

### Requirement: A production deploy keeps the default branch's config

A push to the default branch SHALL be checked like a preview before any wrangler call: no build command of its own, no path outside the project, a finished plugin build with no extra Workers, and the production Worker's name. The generated config's D1 databases, by name and id, and its routes and custom domains SHALL equal the default branch's own top-level config. The deploy SHALL keep the default branch's own config and migrations and take only the built files and the build's redirect.

#### Scenario: A default-branch build runs a command or reads `/proc`

- **WHEN** a build on the default branch carries `build.command`, or `assets.directory: "/proc/self"`
- **THEN** the deploy stops at taking the build, before any wrangler call

#### Scenario: A default-branch build adds a database or a web address

- **WHEN** a build on the default branch binds a database or claims a route or custom domain that the default branch's own config does not
- **THEN** the deploy stops at taking the build, before any wrangler call, and an unchanged build still deploys

## MODIFIED Requirements

### Requirement: CI deploys with its own narrow token

CI SHALL deploy with a separate `<repo>-deploy` token limited to deploying Workers and databases on the chosen account, plus storage only when the app binds a bucket and Access read permission for coverage checks. It SHALL be unable to manage tokens or change Access policies. Its value MUST go straight to the GitHub secret `CLOUDFLARE_DEPLOY_TOKEN`, never to a file or the screen; a later run SHALL reuse it and roll it only when that secret is missing or the person asks. Once it is set, provisioning SHALL delete the old `CLOUDFLARE_API_TOKEN` secret, unless a workflow in the repo still reads that name: then it SHALL keep it and report a to-do.

#### Scenario: Secrets reach GitHub

- **WHEN** CI is wired
- **THEN** the GitHub secret `CLOUDFLARE_DEPLOY_TOKEN` holds the deploy token, and no GitHub secret holds the user token

#### Scenario: An install has the old secret name

- **WHEN** provisioning runs where only the old `CLOUDFLARE_API_TOKEN` secret is set and no workflow reads it
- **THEN** it rolls the deploy token into `CLOUDFLARE_DEPLOY_TOKEN`, then deletes the old secret, and a rerun reuses the token

#### Scenario: Protection is missing

- **WHEN** CI cannot establish that the workspace is protected
- **THEN** it refuses to publish business content or a new reachable preview, and does not try to change Access policies
