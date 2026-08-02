## ADDED Requirements

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
