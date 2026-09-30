# app-scaffold Specification

## Purpose

Ship WongStack's own React-on-Workers app as a starter, so a new install has a real app at a real address from its first deploy, with tests and quality gates that pass as shipped.

## Requirements

### Requirement: Every install gets the scaffold

The core payload SHALL carry WongStack's `app/` to every new install, and no install-record flag SHALL gate it for a new install. After provisioning and the first deploy, the app's address SHALL serve the starter page. A sync SHALL treat an earlier release's opt-out flag as the person's choice: the plan names the starter app as left out until the person asks for it.

#### Scenario: A new install

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives `app/`, and provisioning creates its wrangler config

#### Scenario: A legacy opt-out flag

- **WHEN** an install record carries `components.appScaffold: false` from an earlier release
- **THEN** the sync plan lists the starter app as left out, with that reason, and the repo still updates in place

### Requirement: No source-repo value reaches a target

No copied scaffold file SHALL carry a WongStack Worker name, database name, or `database_id`, so `app/wrangler.jsonc` SHALL NOT be copied. The target's config and its migration scripts SHALL come from the pack's fragments, filled with the target's own names. `app/package-lock.json` SHALL be copied, so the target builds against the same versions.

#### Scenario: An install

- **WHEN** the scaffold lands in a target
- **THEN** no copied file names `wongstack-db` or holds a `database_id`

### Requirement: An existing app is never overwritten

A missing scaffold file SHALL be copied, and a present one SHALL change only through a reviewed plan, never by an overwrite.

#### Scenario: A repo with its own app

- **WHEN** a target already has a file at a scaffold path
- **THEN** the sync leaves it as it is unless a reviewed plan adapts it

### Requirement: The scaffold tests its own code

The scaffold SHALL ship a `test` script and a suite over its own code, which the core test workflow finds in `app/`. The suite SHALL cover the Access module's deny paths, the service-token identity, and accepted tokens signed by a real generated key. It SHALL declare no browser dependency and test no WongStack skill file, and the runner SHALL stay out of the deployed bundle.

#### Scenario: Unconfigured identity

- **WHEN** the Access module runs with no team domain or audience set
- **THEN** the suite asserts no identity, and fails if the path ever allows

#### Scenario: A wrong key import

- **WHEN** the module imports the key with the wrong algorithm
- **THEN** the accepted-token cases fail

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a lint warning, dead code, or duplicated code. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero

### Requirement: The starter app is set up to grow

The starter app SHALL route its pages through a route list, with the home page as its only page and a not-found page for every other address. Each page SHALL live in its own folder with its parts, styles, and tests; a part used by one page SHALL live in that page's folder. The Worker SHALL route `/api/` requests through a route list of handlers, one per file, starting with `GET /api/health`. An unknown API route SHALL answer 404. The scaffold SHALL ship no empty folders.

#### Scenario: An unknown address

- **WHEN** a person opens `/nothing-here` on the app
- **THEN** they see a "page not found" message with a link home, not the home page

#### Scenario: The health route

- **WHEN** a caller sends `GET /api/health`
- **THEN** the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404

### Requirement: The code rule says where things go

The code rule SHALL load when an agent edits the main app or a mini app, and SHALL say where a new page, API route, shared part, helper, and style go, pointing at the files that already follow it.

#### Scenario: A second page

- **WHEN** the agent adds a page to the main app
- **THEN** it adds a folder under the pages folder and one entry in the route list, following the home page
### Requirement: The starter app requires verified identity

The scaffold SHALL require a verified signed Access identity scoped to this workspace before serving its HTML, static assets, APIs, or mini apps. It SHALL recognize a human by verified email and a machine by verified service-token identity. Missing configuration SHALL fail closed; missing, forged, expired, or wrong-application assertions SHALL be denied. Plain email headers SHALL NOT authorize a request. Only explicit local-development configuration SHALL substitute an identity; deployed environments SHALL reject that development bypass. Memory SHALL remain independently authenticated by its memory keys.

#### Scenario: A caller attempts direct asset access

- **WHEN** a caller requests HTML, JavaScript, CSS, a mini-app asset, or an API with no valid assertion, including a forged email header
- **THEN** no protected content is returned

#### Scenario: Valid human and machine callers

- **WHEN** a human or service-token caller presents an assertion valid for this workspace
- **THEN** the caller reaches the intended app resource under the verified identity
