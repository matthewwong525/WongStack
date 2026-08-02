# stack-pack — delta

## ADDED Requirements

### Requirement: The pack is adoptable after setup

Declining the pack at setup SHALL NOT be terminal. The supported late-adoption route SHALL be: set `components.stackPack: true` in `.claude/.wong-stack.json`, run `/wong-sync` to land the pack's drop-in files (the provisioning skill among them), then run `/wong-cloudflare` to configure and provision. Every payload pointer to late adoption SHALL name this route (or `/wong-cloudflare` directly, where the skill is already present) and SHALL NOT direct users at a path that refuses — in particular, no prose SHALL claim `/wong-sync` offers the pack to a repo that has not opted in.

#### Scenario: A declined repo adopts later

- **WHEN** a repo that said no at setup decides it wants the app hosted
- **THEN** setting the flag and running `/wong-sync` lands the pack files, and `/wong-cloudflare` completes configuration and provisioning
- **AND** no step of that route stops and points back at another step of it

#### Scenario: Pointers are truthful

- **WHEN** a reader follows any payload reference to adopting the pack later
- **THEN** the route it names works as described

## MODIFIED Requirements

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard
