# cloudflare-provisioning — delta

## ADDED Requirements

### Requirement: Where the skill is present, it is the whole door to the pack

When `/wong-cloudflare` runs in a repo whose manifest lacks `components.stackPack: true` (or whose pack files never landed), it SHALL NOT stop and point elsewhere. It SHALL make the pack's outcome-phrased offer itself; on a yes it SHALL set `components.stackPack: true` in `.claude/.wong-stack.json`, land the pack's drop-in files by following the `wong-sync` skill's clone-refresh and copy-if-absent steps (the adapt step SHALL NOT run as part of this), apply the id-free config fragments, and continue into provisioning. On a no it SHALL stop having changed nothing.

The skill SHALL own all config-fragment application: the id-free fragments (`package.json` scripts, `.env.example` variables, `.gitignore` entries) at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. A missing wrangler config SHALL be created from the fragment, not treated as a reason to stop.

When no Cloudflare token is available yet, the skill SHALL stop cleanly after the adoption work with the files and fragments in place, stating that a re-run with a token completes provisioning.

#### Scenario: Late adoption through the skill

- **WHEN** `/wong-cloudflare` runs in a repo that has the skill but not `components.stackPack: true`
- **THEN** it offers the pack, and on a yes sets the flag, lands the missing drop-in files, applies the id-free fragments, and proceeds toward provisioning
- **AND** on a no it stops with the repo unchanged

#### Scenario: Adoption without a token yet

- **WHEN** the user says yes to the pack but has no Cloudflare account or token
- **THEN** the run completes the adoption work and stops cleanly, telling the user a later re-run provisions
- **AND** nothing is half-provisioned

#### Scenario: No pointer at a refusing path

- **WHEN** any payload prose directs a repo without the pack toward adopting it
- **THEN** it names a route that works — `/wong-cloudflare` where the skill exists, or setting `components.stackPack: true` and running `/wong-sync` where it does not
- **AND** no prose claims `/wong-sync` offers the pack

## MODIFIED Requirements

### Requirement: Provisioning creates the two databases and the binding

For a repo taking the stack pack, the skill SHALL create the production and staging D1 databases and write the binding on the staging-Worker model: the production id into the top-level `d1_databases` entry's `database_id`, and the staging id into the `env.staging` block's own `d1_databases` entry, merging the `wrangler.jsonc` fragment (from `stack-pack-fragments.md`) with real ids when the block is absent. There is no `preview_database_id` and no swap step. It SHALL compute the production URL and report the preview URL **pattern** in its staging-Worker form (`<branch>-<worker>-staging.<subdomain>.workers.dev`), while per-commit URLs remain harvested from wrangler output per the stack-pack capability, never constructed. It SHALL be idempotent: a resource that already exists is reused and reported, never duplicated.

The Cloudflare token SHALL live only in the repo's git-ignored `.env` and in the GitHub repository secrets the CI wiring sets — never in a committed file.

#### Scenario: A second run does not duplicate resources

- **WHEN** the skill runs again in a repo it already provisioned
- **THEN** it detects the existing databases and reuses them
- **AND** it reports each as already present rather than creating a second copy

#### Scenario: The binding follows the staging-Worker model

- **WHEN** the skill writes the database ids
- **THEN** production's id lands in the top-level binding and staging's id inside `env.staging`, each entry carrying its own `database_name` and `migrations_dir`
- **AND** `preview_database_id` is not written anywhere

#### Scenario: The credential reaches only its two stores

- **WHEN** provisioning completes
- **THEN** the token exists in the git-ignored `.env` and as a GitHub repository secret
- **AND** no credential value is written into a committed file

## REMOVED Requirements

### Requirement: A runbook documents the provisioning path for any agent

**Reason**: The page this required (`wiki/stack/provisioning.md`) duplicated the skill step-for-step, and its stated audience — an agent holding the pack but not the skill — cannot exist: the skill and the docs are gated together in the payload manifest and install together. The duplicate is where the v8.0/v8.1 model drift accumulated.

**Migration**: The skill is the runbook. The facts the page carried live with their owners — the token screen in `wiki/stack/cloudflare-credentials.md`, the widen protocol in the skill's `references/permission-groups.md`, the deploy model in `wiki/stack/d1-pipeline.md`, failures in `references/failure-map.md`, the human narrative in `wiki/stack/getting-started.md`. Steps not verified against a live account (Zero Trust org creation) remain labelled unverified where they are now stated (the skill's Access step and `cloudflare-access.md`).
