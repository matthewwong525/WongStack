## Purpose

Let a person get a working app from one request in under a minute, however large the main app is, try it on a preview, change it by chatting, and save it straight to production, where a dashboard lists every mini app.

## ADDED Requirements

### Requirement: A mini app lives apart from the main app

Each mini app SHALL live in its own folder, `mini-apps/<name>/`, beside the main app, with a manifest `app.json` that holds at least a title and a one-line description. All mini apps SHALL run on one small Worker with a staging twin, bound to the repo's database (the staging database for previews). A mini app's pages SHALL need no build step. The main app's build, lint, and tests SHALL NOT include `mini-apps/`, and a change to a mini app SHALL NOT build the main app.

#### Scenario: A large main app

- **WHEN** the repo's `app/` holds a very large codebase and the person asks for a mini app
- **THEN** the mini app is written under `mini-apps/<name>/` and its preview builds none of `app/`

#### Scenario: A mini app stores data

- **WHEN** a mini app's API writes a row on its preview
- **THEN** the row is written to the staging database, never the production one

### Requirement: A mini-app request builds without the full loop

When the person asks for a new standalone page or small tool, `/apply` SHALL build it as a mini app, with no branch, no OpenSpec change, and no review page. It SHALL ask only when it can not act without an answer. A request that changes the main app SHALL take the full change loop.

#### Scenario: A new tool

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent builds `mini-apps/apps/tips/` with no `/explore` round and no OpenSpec change

#### Scenario: A change to the main app

- **WHEN** the person asks to change the main app's login page
- **THEN** the agent runs the full change loop

### Requirement: A mini app carries its own tests

`/apply` SHALL write tests for a mini app's logic — its API handler and its scripts — in the app's own folder, runnable by Node's built-in test runner with no install. Before a direct save, `/save` SHALL run that app's tests on the agent host, and a failing test SHALL stop the save with nothing pushed. On a push that changes mini apps, CI SHALL run the tests of the changed mini apps only, in the required `test` check.

#### Scenario: Save an app with a failing test

- **WHEN** the person saves a mini app whose test fails on the host
- **THEN** the save stops, names the failing test, and pushes nothing

#### Scenario: Only the changed app is tested

- **WHEN** a push changes `mini-apps/apps/tips/` and no other mini app
- **THEN** CI runs the tests under `mini-apps/apps/tips/` and no other suite

### Requirement: The mini-app preview comes from the agent host

After each build of a mini app, `/apply` SHALL upload a preview of the mini-app Worker from the agent host and SHALL report the preview URL without waiting for CI. When the mini Worker's staging twin does not exist yet, the upload SHALL create it first. When the upload can not run — no stack pack or no credential — `/apply` SHALL state the reason in one line. `/apply` SHALL NOT save on its own: saving puts the app live on production, so the person saves when the preview is right.

#### Scenario: Change the app by chatting

- **WHEN** the person asks for a different color on a mini app that has a preview
- **THEN** `/apply` uploads again and reports the new preview URL within seconds, with no CI wait

#### Scenario: The first mini app in a repo

- **WHEN** the mini Worker's staging twin does not exist
- **THEN** the first preview upload creates it and then uploads the preview

### Requirement: A mini-app preview expires

Every non-production upload or deploy of the mini-app Worker SHALL carry an expiry time seven days after the upload. After that time, the Worker SHALL answer every request on that version with HTTP 410 and a short page that says the preview expired and how to get a new one. A new upload SHALL carry a new expiry. The production mini Worker SHALL carry no expiry.

#### Scenario: An old preview link

- **WHEN** someone opens a mini-app preview eight days after its upload
- **THEN** the response is 410 with the expired page, and the app is not served

#### Scenario: A saved app

- **WHEN** a saved mini app is opened on the production mini Worker months later
- **THEN** it is served normally

#### Scenario: A rebuild renews it

- **WHEN** the person asks to rebuild an expired mini app
- **THEN** the new upload serves the app for another seven days

### Requirement: A mini app saves straight to the default branch

When a save's whole diff is inside one app's folder, `mini-apps/apps/<name>/`, `/save` SHALL run that app's tests on the agent host, then commit and push to the default branch, with no branch, no pull request, and no CI wait. This is a direct route like the prose route, and it SHALL have the same limits: the pushed commits hold only that folder, and a rejected push is never forced. CI on the default branch SHALL run the app's tests again and deploy only the production mini Worker. The save SHALL say that the app is now live on production and uses production data. The folder on the default branch and the dashboard SHALL be the record; no memory fact is needed for the app.

#### Scenario: Save a mini app

- **WHEN** the person saves `mini-apps/apps/tips/` and its tests pass on the host
- **THEN** one commit is pushed to the default branch, and the save reports the app as live on production
- **AND** no branch or pull request is created

#### Scenario: The diff leaves the folder

- **WHEN** a mini-app save also changes a file under `schema/migrations/`, `mini-apps/worker.ts`, or `mini-apps/wrangler.jsonc`
- **THEN** the save takes the normal route with a branch and a pull request

#### Scenario: The push is rejected

- **WHEN** the push to the default branch is rejected, because the person can not bypass the rules or the branch moved
- **THEN** the save does not force it and takes the normal route with a pull request

### Requirement: A mini-app pull request merges through the short path

When a mini-app save fell back to a pull request, `/ship` SHALL merge it with no OpenSpec change, no archive, and no walk, on its CI result. The pull request body SHALL come from the app's `app.json`. Production SHALL receive a mini app only through a push or a merge to the default branch, never from the agent host.

#### Scenario: A mini app with a migration

- **WHEN** a mini app's save added a migration and fell back to a pull request
- **THEN** `/ship` merges it after CI runs the app's tests, with no OpenSpec change and no walk
- **AND** the production mini Worker deploys from the merge, not from the host

### Requirement: A dashboard lists every mini app

A script SHALL build the mini Worker's dashboard page from the `app.json` of each folder under `mini-apps/`, each time the mini Worker is uploaded or deployed, with no model step. Each entry SHALL show the title and description and link to the app. The production dashboard SHALL therefore list every saved mini app, and a preview's dashboard SHALL also list the app being previewed.

#### Scenario: A saved app appears

- **WHEN** a mini app reaches the default branch
- **THEN** the production dashboard lists it with its title, description, and link

#### Scenario: A malformed manifest

- **WHEN** a folder's `app.json` is missing a title
- **THEN** the script names the folder and fails the upload or deploy
