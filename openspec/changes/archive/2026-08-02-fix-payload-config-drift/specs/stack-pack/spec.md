## MODIFIED Requirements

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entries covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The token variable SHALL be `CLOUDFLARE_API_TOKEN` everywhere it appears — the shipped `.env.example`, the fragment, the skill, the pack scripts, the Actions workflow, and the wiki — because that is the name wrangler reads. **Exactly one payload file SHALL own this name**; every other surface that needs it SHALL link to that owner rather than restate it. The name has drifted in both directions across releases while each individual edit looked like a harmless documentation change, so a single owner is what makes a future rename a visible, reviewable act rather than a template typo.

The `.gitignore` fragment SHALL cover **both** local credential files, each as a wildcard plus a negation for its committed example: `.dev.vars*` with `!.dev.vars.example`, and `.env*` with `!.env.example`. The wildcards stop a per-environment variant full of live values from being committable; the negations keep the committed, values-blank example files from being swallowed by them. `.env` holds `CLOUDFLARE_API_TOKEN`, which the pack's own docs describe as effectively account-root, and `/wong-cloudflare` writes it there — so a target repo that arrives without a `.gitignore` entry for it is handed a committable account-root credential at the moment the skill asks for one. Covering only `.dev.vars` leaves the more dangerous of the two files exposed.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: The shipped template names the variable the code reads

- **WHEN** a user fills in the token in `.env` by following `.env.example`
- **THEN** the variable they filled is the one the scripts, the workflow, the skill, and wrangler read
- **AND** no step silently behaves as though no token were present

#### Scenario: The variable name has one owner

- **WHEN** any payload file needs the reader to know the token's variable name
- **THEN** exactly one file states it and the others link to that file
- **AND** renaming it requires editing the owner, not a template

#### Scenario: The credential file cannot be committed

- **WHEN** `/wong-cloudflare` writes the API token into a target repo's `.env`
- **THEN** the repo's `.gitignore` already covers `.env` and its per-environment variants
- **AND** `.env.example` remains committable despite the wildcard

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead
