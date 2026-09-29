# mini-apps Specification

## Purpose

Let a person get a small standalone app from one request, in its own folder served by the main app at `/apps/<name>/`, through the same change loop as any change, with the landing page listing every mini app.

## Requirements

### Requirement: A mini app lives in its own folder, served by the main app

Each mini app SHALL live in `mini-apps/apps/<name>/` with a manifest holding a title and description, and need no build step of its own. The main app's Worker SHALL serve its pages at `/apps/<name>/` and its optional handler at `/apps/<name>/api/*`; there SHALL be no separate mini-app Worker.

#### Scenario: A saved app goes live

- **WHEN** the mini app `tips` is published and production deploys
- **THEN** `https://<app>/apps/tips/` serves it from the main app's Worker

### Requirement: A mini app reaches only the app database

A handler SHALL receive the repo's app database and no other binding, and the Worker SHALL turn off every other runtime route to its bindings, such as importing them or reading them from the process environment. The docs SHALL say a handler shares the Worker with the memory store, so the limit stops mistakes, not code written to get around it. A preview SHALL use staging data, never production.

#### Scenario: Production binds memory

- **WHEN** a handler runs on the production Worker, which binds the memory store
- **THEN** the handler gets the app database and no memory binding

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory binding reaches it

### Requirement: A mini app carries its own tests

A mini app's plan SHALL include tests for its logic in its own folder, runnable by Node with no install. CI SHALL run only the changed mini apps' tests, in the required `test` check.

#### Scenario: A failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` cannot merge it

### Requirement: The landing page lists every mini app

Each build SHALL publish the list of mini apps, with title, description, and link, at `/apps/apps.json` for the landing page to show; `/apps/` SHALL redirect to `/`. A preview SHALL also list the app it previews. A manifest missing its title or description SHALL fail the build and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a folder's manifest has no title
- **THEN** the build fails and names the folder

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL open with a removable tutorial, *Learn the development loop*: a message to copy into the chat that asks the agent to remove the tutorial and explain each step. The mini-app list SHALL sit below it. `/wong-sync` SHALL update the tutorial only while the target still shows it.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's production app
- **THEN** they see the tutorial and its Copy button, with the example app listed below

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back

### Requirement: A mini app takes the same change loop as any change

A request for a new small page or tool, or a change to one, SHALL take the normal change loop: plan, preview, save, ship. Only where its files live SHALL set it apart; no skill SHALL have a separate mini-app route.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it, prints the review link, and asks whether to build it now
- **AND** after building, it reports the preview at `/apps/tips/` and asks whether to publish it

### Requirement: Every page shares one stylesheet

The main app SHALL serve one shared stylesheet at `/style.css`, holding the look every page shares: the device's font, light or dark to match the device, and a narrow column. The starter app and the example mini app SHALL link it rather than copy its rules. A page's own rules SHALL live beside it. The shared look SHALL use no UI library or CSS framework.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then `/apps/hello/`
- **THEN** both pages load `/style.css` and show the same font and light or dark colors

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page markup, page script, and API in separate files, and its API SHALL dispatch through a route list, with no build step. An unknown API route SHALL answer 404.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

### Requirement: One rule names a mini app's test files

One shared rule SHALL decide which files are tests: every name Node's test runner picks up by default, plus `.spec.` and `test_` names. CI SHALL run those files as a mini app's tests, the build SHALL leave them out of the published pages, the Worker SHALL refuse to serve them, and the loosened-check guard SHALL read them for switched-off tests.

#### Scenario: An underscore test file

- **WHEN** a mini app holds `foo_test.mjs`
- **THEN** CI runs it as a test, and `/apps/<name>/foo_test.mjs` is neither copied into the build nor served

#### Scenario: A skipped test in a mini app

- **WHEN** a branch adds `test.skip` to a mini app's `foo_test.mjs` with no recorded reason
- **THEN** the test check fails and names the file
