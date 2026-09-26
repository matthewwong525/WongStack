## ADDED Requirements

### Requirement: The main app is not deployed when it is untouched

The pack's deploy job SHALL use the core check that `ci-tests` defines. When the branch leaves the main app untouched, the job SHALL skip the main app's migration, build, and deploy and say so. A merge to the default branch that leaves the main app untouched SHALL NOT redeploy the production main app.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/` files
- **THEN** the deploy check is green and no main-app staging deploy or preview upload runs

#### Scenario: A mini-app push

- **WHEN** a push to the default branch changes only files under `mini-apps/`
- **THEN** the production main app is not redeployed

### Requirement: The pack ships the mini-app Worker

The pack SHALL ship a `mini-apps/` scaffold: a Worker config with a staging environment, a small Worker that serves each app's pages and routes `/<name>/api/*` to that app's optional handler, and a dashboard script. Provisioning SHALL write the mini Worker's name and database bindings with real ids, for production and staging. The mini Worker SHALL NOT serve its own source or config as static files.

#### Scenario: A fresh install

- **WHEN** setup provisions a repo
- **THEN** `mini-apps/` exists with its config bound to the repo's production and staging databases

#### Scenario: Source stays private

- **WHEN** a client requests a mini app's `api.mjs`, a test file, or the Worker config by path
- **THEN** the Worker does not return the file's contents

### Requirement: The mini-app script previews from the host and deploys in CI

The pack SHALL ship one script for the mini Worker, byte-identical across repos. In preview mode, run outside CI with a Cloudflare credential, it SHALL build the dashboard, apply pending staging migrations, create the staging twin when it does not exist, upload a preview version under an alias for the current branch, and print the preview URL. The caller MAY name the alias; without a named alias, it SHALL derive the alias from the current branch and SHALL refuse the default branch. In CI, it SHALL deploy the mini Worker's staging twin with a preview alias on a feature branch and the production mini Worker on the default branch, only when `mini-apps/` changed. It SHALL fail closed when the resolved staging name equals the production name. It SHALL never deploy the main app.

#### Scenario: Upload from the agent host

- **WHEN** the agent runs the preview mode with the alias `mini-tips` and a credential
- **THEN** a preview version is uploaded under the `mini-tips` alias and its URL is printed
- **AND** the production mini Worker and the main app are unchanged

#### Scenario: On the default branch

- **WHEN** the preview mode runs on the default branch with no named alias
- **THEN** it refuses and uploads nothing

#### Scenario: A named alias on the default branch

- **WHEN** the agent runs the preview mode with the alias `mini-tips` on the default branch
- **THEN** the preview uploads under `mini-tips`

#### Scenario: A push that saves a mini app

- **WHEN** a push to the default branch changes `mini-apps/`
- **THEN** CI deploys the production mini Worker

#### Scenario: A staging config named like production

- **WHEN** the mini Worker's staging environment resolves to the production name
- **THEN** the script stops before any upload or deploy
