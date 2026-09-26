## MODIFIED Requirements

### Requirement: The main app is not deployed when it is untouched

The pack's deploy job SHALL use the core check that `ci-tests` defines. When the branch leaves the main app untouched and changes no mini app, the job SHALL skip the main app's migration, build, and deploy and say so. When the branch changes mini apps, the job SHALL build and deploy the main app, because its Worker serves them. A merge to the default branch that leaves the main app untouched and changes no mini app SHALL NOT redeploy the production main app.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/` files
- **THEN** the deploy check is green and no main-app staging deploy or preview upload runs

#### Scenario: A mini-app push

- **WHEN** a push to the default branch changes only files under `mini-apps/apps/`
- **THEN** CI builds and deploys the production main app, with the mini apps in it

## ADDED Requirements

### Requirement: The main Worker serves the mini apps

The pack's app scaffold SHALL serve every mini app from the main app's Worker. Its build SHALL copy each app's pages into the Worker's static assets under `/apps/<name>/`, and SHALL copy no handler, test, or TypeScript file. Its Worker SHALL run first for every path under `/apps/`, send `/apps/<name>/api/*` to that app's handler when it has one, and serve the static assets for every other path. The pack SHALL ship this routing as a module the scaffold's Worker imports, so `/wong-sync` keeps it current.

#### Scenario: Source stays private

- **WHEN** a client requests a mini app's `api.mjs` or a test file by path
- **THEN** the Worker does not return the file's contents

#### Scenario: An API path opened in a browser

- **WHEN** a person opens `/apps/hello/api/greeting` in a browser tab
- **THEN** the hello app's handler answers, not the main app's single-page fallback

### Requirement: The pack ships a host preview script for the main app

The pack SHALL ship one script, byte-identical across repos, that uploads a preview of the main app from the agent host. Run outside CI with a Cloudflare credential and an alias, it SHALL install the main app's dependencies when they are missing, apply pending staging migrations, build the app for staging, create the staging Worker when it does not exist, upload a preview version of the staging Worker under the alias, and print the preview URL that wrangler reports. It SHALL fail closed when the resolved staging name equals the production name. It SHALL never deploy production. The caller MAY name the alias; without a named alias, it SHALL derive the alias from the current branch and SHALL refuse the default branch.

#### Scenario: Upload from the agent host

- **WHEN** the agent runs the script with the alias `mini-tips` and a credential
- **THEN** a preview version of the staging Worker is uploaded under the `mini-tips` alias and its URL is printed
- **AND** the production Worker is unchanged

#### Scenario: On the default branch

- **WHEN** the script runs on the default branch with no named alias
- **THEN** it refuses and uploads nothing

#### Scenario: A staging config named like production

- **WHEN** the staging environment resolves to the production name
- **THEN** the script stops before any upload

### Requirement: The scaffold ships only the mini-app router and its example app

The payload manifest SHALL list the mini-app scaffold file by file: the router and route-table modules with their type declarations, and the example app folder `mini-apps/apps/hello/`. It SHALL NOT list `mini-apps/` or `mini-apps/apps/` as a whole folder. An app folder added to the source repo SHALL therefore never reach a target through setup or sync.

#### Scenario: An app made in the source repo stays there

- **WHEN** the source repo gains `mini-apps/apps/tips/` and a target syncs
- **THEN** the sync selects no path under `mini-apps/apps/tips/`
- **AND** it still selects the example app and the router module

### Requirement: Older installs retire the mini Workers

A `/wong-sync` plan for an install that has `mini-apps/wrangler.jsonc` SHALL add the `/apps/` route and its config to the main app, and SHALL delete `mini-apps/wrangler.jsonc`, `mini-apps/worker.ts`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, and `mini-apps/apps/.assetsignore`. Only after the production main Worker serves `/apps/` SHALL the plan's runbook delete the `<repo>-mini` and `<repo>-mini-staging` Workers.

#### Scenario: The sync merges

- **WHEN** the sync's pull request merges and production deploys
- **THEN** each saved mini app answers at `/apps/<name>/` on the main address
- **AND** only then are the two mini Workers deleted

#### Scenario: Production has not deployed yet

- **WHEN** the production main Worker does not answer `/apps/` yet
- **THEN** the runbook deletes no Worker

## REMOVED Requirements

### Requirement: The pack ships the mini-app Worker

**Reason**: The main app's Worker serves the mini apps; "The main Worker serves the mini apps" replaces this.

**Migration**: "Older installs retire the mini Workers" moves an existing install.

### Requirement: The mini-app script previews from the host and deploys in CI

**Reason**: There is no mini Worker to preview or deploy. "The pack ships a host preview script for the main app" replaces the preview mode, and the main app's deploy covers CI.

**Migration**: `/apply` calls the new script; `/wong-sync` removes `scripts/cf-mini.sh`.

### Requirement: The scaffold ships only the mini Worker and its example app

**Reason**: Replaced by "The scaffold ships only the mini-app router and its example app".

**Migration**: `/wong-sync` removes the mini Worker's files, as "Older installs retire the mini Workers" says.
