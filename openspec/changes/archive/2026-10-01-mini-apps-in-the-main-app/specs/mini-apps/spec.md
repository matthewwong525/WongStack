## MODIFIED Requirements

### Requirement: A mini app lives in its own folder, served by the main app

Each mini app SHALL be part of the main app: written, built, and tested the same way as the main app's own pages, with its page in its own folder and its optional server side in a matching folder, and a manifest holding a title and description. The main app SHALL serve its page at `/apps/<name>/` and its server side at `/apps/<name>/api/*`; there SHALL be no separate mini-app Worker, build step, or copy step.

#### Scenario: A saved app goes live

- **WHEN** the mini app `tips` is published and production deploys
- **THEN** `https://<app>/apps/tips/` serves it from the main app's Worker

### Requirement: A mini app carries its own tests

A mini app's plan SHALL include tests for its logic in its own folders. The main app's test suite SHALL run them, under the same checks and limits as the rest of the main app, in the required `test` check.

#### Scenario: A failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` cannot merge it

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page, its parts, and its server side in separate files, and its server side SHALL dispatch through a route list. An unknown API route SHALL answer 404.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

## REMOVED Requirements

### Requirement: A mini app reaches only the app database

**Reason**: A mini app is now main-app code and needs saved keys and the signed-in person; only the memory store stays out of reach.

**Migration**: See "A mini app reaches everything but memory".

### Requirement: The landing page lists every mini app

**Reason**: The list is compiled into the home page from the same build, so `/apps/apps.json` and the build-time manifest check go.

**Migration**: See "The home page lists every mini app".

### Requirement: One rule names a mini app's test files

**Reason**: Mini app tests run in the main app's suite, whose own configuration names its test files; no Node-only runner, copy step, or source-file guard remains to share a rule with.

**Migration**: The loosened-check guard keeps its own test-file rule for every changed file.

### Requirement: The starter app list guides first use

**Reason**: The compiled list has no loading or could-not-load state.

**Migration**: See "The home page's app list guides first use".

## ADDED Requirements

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive every binding and secret the main app's Worker has, except the memory store's bindings, and SHALL receive the verified identity of the caller: a person's email, or a service token's name. The Worker SHALL keep every other runtime route to its bindings, such as importing them, turned off. The docs SHALL say a mini app shares the Worker with the memory store, so the limit stops mistakes, not code written to get around it. A preview SHALL use staging data and staging keys, never production.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, the app's saved keys, and the signed-in person, and no memory binding

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory binding reaches it

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. A preview SHALL list the app it previews. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

### Requirement: The home page's app list guides first use

The home page SHALL present each mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example. With no apps it SHALL explain how to ask for a first tool. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with apps
- **THEN** each app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the person sees a first-tool request to copy into their chat

### Requirement: Existing mini apps move into the main app on update

When an installed repo still has mini apps in the old separate folder, its next update SHALL plan moving each one into the main app, at the same addresses and with the same data, and SHALL then remove the old folder. Each moved app SHALL appear in the update's preview before anything is published. An app the person changed SHALL keep its behavior; the plan SHALL name every app it moves.

#### Scenario: An install with two mini apps updates

- **WHEN** a repo with mini apps `hello` and `runs` in the old folder syncs to this release
- **THEN** the update plan moves both into the main app, the preview serves `/apps/hello/` and `/apps/runs/`, and the old folder is gone once it is published

#### Scenario: An app's data survives

- **WHEN** the moved `runs` app reads the table its old version wrote
- **THEN** it finds the same rows, because the move changes no database table
