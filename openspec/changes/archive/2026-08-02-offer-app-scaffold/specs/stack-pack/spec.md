## MODIFIED Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — that a repo installs only by opting in. A repo that does not opt in SHALL receive none of the pack's files and SHALL remain stack-agnostic. Opt-in state SHALL be recorded as `components.stackPack` (boolean) in `.claude/.wong-stack.json`; absent or false means the repo never took the pack.

The pack SHALL have a **second, independently gated category**: the app scaffold, recorded as `components.stackPack: true` plus `components.appScaffold` (boolean), and specified by the `app-scaffold` capability. The two flags SHALL be separate so that a repo which already has an application can take the pipeline without the app. The pack alone SHALL NOT be assumed to arrive at a repo that has a Worker: a repo with `stackPack: true` and no scaffold may legitimately have no application yet, and in that state the pack's scripts have nothing to build until one exists.

#### Scenario: A repo that declines the pack is unaffected

- **WHEN** a repo installs or syncs WongStack without opting into the pack
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it
- **AND** `components.stackPack` is absent or false

#### Scenario: A repo that opts in receives the pack

- **WHEN** a repo opts into the pack
- **THEN** it receives the pack scripts, the seed template, and the pipeline docs, and is guided through the config fragments
- **AND** `components.stackPack` is true

#### Scenario: A repo takes the pipeline without the app

- **WHEN** a repo that already has its own application opts into the pack
- **THEN** `components.stackPack` is true and `components.appScaffold` is absent or false
- **AND** no `app/` file is written to it

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The `wrangler.jsonc` fragment is the **only thing in the payload that creates a wrangler config**, so it SHALL declare a deployable Worker and not bindings alone: `main` (the Worker entry point), `assets` (with single-page-application not-found handling for an SPA), `compatibility_date`, and `compatibility_flags`, alongside the existing `name`, `d1_databases`, and `env.staging` block. A fragment that declares bindings without an entry point produces a config wrangler cannot deploy, which is indistinguishable to the user from a broken install.

The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts, and SHALL include the `db:migrate:staging` and `db:migrate:prod` scripts, whose database names are filled from the resources `/wong-cloudflare` derives. Those two scripts SHALL live in the fragment rather than in any copied file, because a hardcoded database name cannot travel between repos. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: A created wrangler config is deployable

- **WHEN** `/wong-cloudflare` creates a wrangler config from the fragment in a repo that had none
- **THEN** the result declares `main`, `assets`, `compatibility_date`, and `compatibility_flags` as well as the bindings and `env.staging`
- **AND** `wrangler deploy` has an entry point to build

#### Scenario: Migration scripts name the target's own databases

- **WHEN** the `package.json` fragment is applied
- **THEN** `db:migrate:staging` and `db:migrate:prod` reference the databases provisioned for this repo
- **AND** no copied payload file contains a migration script naming another repo's database

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard
