# mini-apps Specification

## Purpose
Let a person get a small standalone app from one request, in its own folder served by the main app at `/apps/<name>/`, through the same change loop as any change, where a dashboard lists every mini app.

## Requirements

### Requirement: A mini app lives apart from the main app

Each mini app SHALL live in its own folder, `mini-apps/apps/<name>/`, beside the main app, with a manifest `app.json` that holds at least a title and a one-line description. The main app's Worker SHALL serve every mini app: its pages under `/apps/<name>/`, and its optional handler under `/apps/<name>/api/*`. A handler SHALL receive the repo's app database and no other binding, so a mini app can never read the memory store. A mini app's pages SHALL need no build step of their own. The main app's lint and tests SHALL NOT include `mini-apps/apps/`. There SHALL be no separate mini-app Worker.

#### Scenario: A large main app

- **WHEN** the repo's `app/` holds a very large codebase and the person asks for a mini app
- **THEN** the mini app is written under `mini-apps/apps/<name>/`, and its preview builds the whole main app with the mini app in it

#### Scenario: A mini app is served at the main address

- **WHEN** the mini app `tips` is saved and production deploys
- **THEN** `https://<app>/apps/tips/` serves its page from the main app's Worker

#### Scenario: A mini app stores data

- **WHEN** a mini app's API writes a row on its preview
- **THEN** the row is written to the staging database, never the production one

#### Scenario: A handler can not reach memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** the handler's environment holds the app database and no memory binding

### Requirement: A mini app carries its own tests

A mini app's plan SHALL carry a task to write tests for its logic — its API handler and its scripts — in the app's own folder, runnable by Node's built-in test runner with no install. On a change that touches mini apps, CI SHALL run the tests of the changed mini apps only, in the required `test` check. No skill SHALL run a mini app's tests on the agent host as a condition of saving.

#### Scenario: Save an app with a failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` can not merge it

#### Scenario: Only the changed app is tested

- **WHEN** a push changes `mini-apps/apps/tips/` and no other mini app
- **THEN** CI runs the tests under `mini-apps/apps/tips/` and no other suite

### Requirement: A dashboard lists every mini app

A script SHALL build the mini-app list from the `app.json` of each folder under `mini-apps/apps/`, each time the main app is built, with no model step. It SHALL write the list twice: as a page at `/apps/` and as data at `/apps/apps.json`. Each entry SHALL show the title and description and link to the app. The production list SHALL therefore hold every saved mini app, and a preview's list SHALL also hold the app being previewed.

#### Scenario: A saved app appears

- **WHEN** a mini app reaches the default branch
- **THEN** the production `/apps/` page and `/apps/apps.json` list it with its title, description, and link

#### Scenario: A malformed manifest

- **WHEN** a folder's `app.json` is missing a title
- **THEN** the script names the folder and fails the build

### Requirement: The starter landing page lists the mini apps and teaches the loop

The starter app's landing page SHALL open with a tutorial message whose one task is to remove itself: it SHALL tell the person to ask the agent to remove the tutorial message, and walk them through the steps that follow — read the plan, build it, try the preview, publish it. Removing it is the person's first change, so it teaches the loop by doing. The tutorial SHALL be one part of the page that can be removed with no other change. Below it, the page SHALL list the mini apps from `/apps/apps.json`, each with its title, description, and a link to it. With no mini apps, it SHALL say how to ask for one.

#### Scenario: A fresh install

- **WHEN** a person opens the production app of a new install
- **THEN** the landing page opens with the tutorial message, and lists the example app below it

#### Scenario: The list can not load

- **WHEN** `/apps/apps.json` fails to load
- **THEN** the landing page still shows the tutorial and a link to `/apps/`

#### Scenario: The tutorial is done

- **WHEN** the person asks the agent to remove the tutorial message and publishes the change
- **THEN** the landing page shows only the app list, and nothing else on it changes

### Requirement: A mini app takes the same change loop as any change

A request for a new standalone page or small tool, or a change to one, SHALL take the full change loop, like any change to the repo's code: `/explore`'s question round when a decision is open, an OpenSpec change with a review page, `/apply` with its preview from the agent host, `/save` for a branch and a pull request, and `/ship` to archive and merge. The only thing that SHALL set a mini app apart is where its files live. No skill SHALL have a separate mini-app route, preview, save, or merge.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it, ends with the review link, and asks whether to build it now
- **AND** on yes it builds `mini-apps/apps/tips/`, reports the preview from the agent host at `/apps/tips/`, and asks whether to publish it

#### Scenario: Publishing a mini app

- **WHEN** the person says to publish a mini app
- **THEN** `/ship` archives its change and merges its pull request on the gate, like any change
- **AND** production serves the app at `/apps/<name>/` after the merge deploys

#### Scenario: Saving a mini app

- **WHEN** the person saves a mini app mid-work
- **THEN** the save commits to the feature branch and updates the pull request
- **AND** nothing reaches the default branch or production
