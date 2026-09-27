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

### Requirement: The Access module ships inert

The scaffold SHALL include a Worker module that verifies the signed Cloudflare Access assertion and returns identity: `email` for a person, `common_name` for a service token. It SHALL enforce nothing until Access is adopted, so a public app rejects nobody and adopting Access is wiring, not writing.

#### Scenario: A public app

- **WHEN** the scaffold deploys with no Access in front
- **THEN** every request reaches the app

#### Scenario: A service token once enabled

- **WHEN** verification is on and a service token calls the app
- **THEN** it is identified by the verified `common_name`

### Requirement: The scaffold tests its own code

The scaffold SHALL ship a `test` script and a suite over its own code, which the core test workflow finds in `app/`. The suite SHALL cover the Access module's deny paths, the service-token identity, and accepted tokens signed by a real generated key. It SHALL declare no browser dependency and test no WongStack skill file, and the runner SHALL stay out of the deployed bundle.

#### Scenario: Unconfigured identity

- **WHEN** the Access module runs with no team domain or audience set
- **THEN** the suite asserts no identity, and fails if the path ever allows

#### Scenario: A wrong key import

- **WHEN** the module imports the key with the wrong algorithm
- **THEN** the accepted-token cases fail

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, dead code, duplicated code, or a surviving mutant. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail
