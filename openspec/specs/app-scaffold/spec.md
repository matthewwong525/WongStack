# app-scaffold

## Purpose

TBD — created by syncing `offer-app-scaffold`.

## Requirements

### Requirement: An opt-in app scaffold ships in the payload

The payload SHALL include WongStack's own `app/` — a React-on-Workers-with-D1 application — as a copyable category gated on `components.appScaffold` (boolean) in `.claude/.wong-stack.json`. A repo whose manifest lacks the flag SHALL receive none of the scaffold's files.

The flag SHALL be **separate from `components.stackPack`**, because a repo that already has an app must be able to take the Cloudflare pack without the scaffold. Taking the scaffold SHALL imply the pack: `appScaffold: true` without `stackPack: true` is not a valid manifest state, since the scaffold's build, deploy, and migration path is the pack.

#### Scenario: A repo without the flag receives no scaffold

- **WHEN** a repo installs or syncs WongStack with `components.appScaffold` absent or false
- **THEN** no file under `app/` is written to it
- **AND** the repo's own application layout is untouched

#### Scenario: The pack is takeable without the scaffold

- **WHEN** a repo that already has an app opts into the Cloudflare stack pack
- **THEN** `components.stackPack` is true and `components.appScaffold` is absent or false
- **AND** it receives the pack's scripts, CI, schema, and docs but no `app/` files

#### Scenario: The scaffold implies the pack

- **WHEN** a manifest records `components.appScaffold: true`
- **THEN** `components.stackPack` is also true
- **AND** the repo receives both categories

### Requirement: The scaffold carries no WongStack-specific value

Every file copied by the scaffold SHALL be free of values belonging to the WongStack repo itself — no Worker name, no database name, and above all no `database_id`. Two files in upstream `app/` carry such values and SHALL therefore be handled specially:

- **`app/wrangler.jsonc` SHALL NOT be copied.** It declares `name: "wongstack"`, the `wongstack-db` and `wongstack-db-staging` database names, and two live `database_id` values. Copying it would point the installing repo's Worker at WongStack's own production and staging databases. The target's wrangler config SHALL instead be created by `/wong-cloudflare` from the `wrangler.jsonc` fragment with the ids it provisions, which is the existing path for a repo with no wrangler config.
- **The `db:migrate:staging` and `db:migrate:prod` scripts SHALL NOT ship in the copied `app/package.json`.** They embed WongStack's database names. They SHALL be supplied by the `package.json` config fragment and filled by `/wong-cloudflare` with the names it derives, so no script referencing another repo's database ever sits in the target.

Every other file in `app/` SHALL be copied verbatim, including `package-lock.json`, so the installed app builds against the exact dependency versions WongStack builds against.

#### Scenario: No live database id reaches a target repo

- **WHEN** the scaffold is installed into any repo
- **THEN** no copied file contains a `database_id`
- **AND** the repo's wrangler config is created later by `/wong-cloudflare` from the fragment

#### Scenario: No script names a foreign database

- **WHEN** the scaffold's `app/package.json` lands in a target repo
- **THEN** it contains no script referencing `wongstack-db` or `wongstack-db-staging`
- **AND** the migration scripts arrive through the `package.json` fragment with the target's own database names

#### Scenario: Dependency versions are pinned

- **WHEN** the scaffold is installed
- **THEN** `app/package-lock.json` is copied with it
- **AND** `npm ci` in the installed app resolves the versions WongStack itself builds against

### Requirement: The scaffold is copy-if-absent like every other payload file

The scaffold SHALL follow the payload's ordinary copy rule: a file that is absent is copied, a file that is present is left exactly as it is. The sync SHALL NOT overwrite, merge, or restructure an application the repo already has, and installing the scaffold SHALL NOT be a special mode.

#### Scenario: An existing app is never clobbered

- **WHEN** a repo with `components.appScaffold: true` already has a file at a scaffold path
- **THEN** that file is left byte-for-byte as it is
- **AND** only the absent files are copied

#### Scenario: A partial scaffold completes

- **WHEN** a repo has some scaffold files and not others
- **THEN** the sync copies only the missing ones

### Requirement: The scaffold ships as the stock starter, unbranded

The scaffold's landing page SHALL ship as the stock Cloudflare React starter — hero, framework logos, a counter, and a live `/api/` fetch served by the Worker. It SHALL NOT be rebranded or genericized into a placeholder shell.

The `/api/` control SHALL be documented as a **provisioning smoke test**: after `/wong-cloudflare` completes, clicking it exercises the deployed Worker and confirms the pipeline end to end, so the first thing a new user can do with their live address is prove it works.

#### Scenario: A new user confirms their site is live

- **WHEN** a user finishes `/wong-cloudflare` on a scaffolded repo and opens the returned URL
- **THEN** the starter page loads and its `/api/` control returns a response from the deployed Worker
- **AND** the user has confirmed the pipeline works without reading any documentation

### Requirement: The scaffold carries the Access verification module, inert

The app scaffold SHALL include a Worker-side Access verification module (`worker/access.ts`) that verifies the signed `Cf-Access-Jwt-Assertion` against the repo's own Access application and returns identity from the verified claims — `email` for a human caller, `common_name` for a service token.

It SHALL ship **inert**: present in the scaffold, enforcing nothing, and not wired into the request path until Access is adopted. The provisioned app is public by default, and a scaffold that enforced identity out of the box would reject every caller of an app with no Access in front.

Shipping the module rather than a documented snippet is deliberate. The correct implementation is not obvious — the header-based version reads as simpler and is what an adopter writes when left to it, and it silently locks out every machine caller including `/verify`. An adopter who followed the documented snippet had to write this module from scratch after diagnosing the lockout.

#### Scenario: A scaffolded public app rejects nobody

- **WHEN** the scaffold is deployed with no Access in front
- **THEN** the verification module enforces nothing and every request reaches the app
- **AND** no request is rejected for lacking an assertion

#### Scenario: Adopting Access is wiring, not writing

- **WHEN** a repo adopts Access on a scaffolded app
- **THEN** the verification module is already present and the step is enabling it
- **AND** the adopter does not implement JWT verification themselves

#### Scenario: Both caller kinds authenticate once enabled

- **WHEN** verification is enabled and a service token calls the app
- **THEN** it is authenticated from the verified assertion's `common_name`
- **AND** a human caller is authenticated from the verified assertion's `email`

### Requirement: The scaffold ships a test runner and a starting suite

The app scaffold SHALL declare a test runner in its own `package.json` with a `test` script, so a repo that takes the scaffold can run `npm test` immediately and the payload's test workflow discovers it without any repo-root file.

The scaffold SHALL ship a starting suite over the code it hands the adopter, rather than an empty example. Coverage SHALL be chosen by what a silent failure costs: the **Access identity module** first, because it ships inert, is the file an adopter is most likely to reimplement by hand, and the incorrect reimplementation fails silently for machine callers while appearing to work in a browser.

That suite SHALL cover at minimum the module's rejection paths that require no network and no cryptography — an unset configuration resolving to *deny* rather than *allow*, a missing or malformed assertion, and an unacceptable signing algorithm — plus the service-token identity, which carries no email and is the case the incorrect implementation breaks.

The runner SHALL be a development dependency only, changing no runtime output and adding nothing to the deployed bundle.

#### Scenario: A scaffolded repo can test immediately

- **WHEN** a repo takes the app scaffold and installs its dependencies
- **THEN** `npm test` runs the shipped suite from the app directory
- **AND** the test workflow finds and runs it with no repo-root manifest present

#### Scenario: Unconfigured identity denies rather than allows

- **WHEN** the Access identity module runs with no team domain or audience configured
- **THEN** the shipped suite asserts it resolves to no identity
- **AND** the test fails if that path is ever changed to allow the request

#### Scenario: The service-token identity is covered

- **WHEN** a verified assertion carries a service-token subject and no email claim
- **THEN** the shipped suite asserts a service identity is returned rather than a rejection
- **AND** the case is present because the header-trust reimplementation rejects it

#### Scenario: The runner does not reach the bundle

- **WHEN** the scaffolded app is built for deployment
- **THEN** the test runner is absent from the built output

### Requirement: The scaffold's test script is a quality-gate chain

The scaffold's `npm test` SHALL run, in one chain behind the single script `test.yml` already calls, deterministic quality gates alongside the unit suite — no new workflow, no local build prerequisite, and no gate that requires a model call:

- **Coverage**: the unit suite SHALL enforce 100% coverage over the scaffold's source via coverage thresholds, failing the run when any threshold is missed.
- **Lint limits**: cyclomatic complexity SHALL be capped below 22 per function, files SHALL be capped at 500 lines, and an explicit `any` SHALL be an error. `unknown` SHALL remain legal. A cognitive-complexity cap below 22 SHALL be enforced only if the scaffold's existing linter provides the rule; a second linter SHALL NOT be added for it.
- **Dead code**: unused files, exports, and dependencies SHALL fail the run.
- **Duplication**: duplicated code blocks SHALL fail the run.
- **Mutation**: the run SHALL fail while any mutant of the scaffold's source survives the unit suite.

The gates SHALL be absolute, not baselined: the scaffold as shipped SHALL pass every gate, so a repo that takes the scaffold starts compliant and CI holds it there.

#### Scenario: A violation fails CI through the existing contract

- **WHEN** a commit introduces an explicit `any`, an uncovered line, an unused export, or a surviving mutant in the scaffold's source
- **THEN** `npm test` exits non-zero
- **AND** the existing `test.yml` check goes red with no workflow change

#### Scenario: The shipped scaffold passes

- **WHEN** `npm test` runs on the scaffold exactly as the payload ships it
- **THEN** every gate passes
- **AND** no gate is skipped, baselined, or marked allowed-to-fail

#### Scenario: The contract stays one script

- **WHEN** CI runs in a repo that took the scaffold
- **THEN** `npm test` remains the entire interface between the repo and `test.yml`
- **AND** no additional workflow or CI configuration is required for the gates to run
