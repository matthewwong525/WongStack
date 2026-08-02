## MODIFIED Requirements

### Requirement: Where the skill is present, it is the whole door to the pack

When `/wong-cloudflare` runs in a repo whose manifest lacks `components.stackPack: true` (or whose pack files never landed), it SHALL NOT stop and point elsewhere. It SHALL make the pack's outcome-phrased offer itself; on a yes it SHALL set `components.stackPack: true` in `.claude/.wong-stack.json`, land the pack's drop-in files by following the `wong-sync` skill's clone-refresh and copy-if-absent steps (the adapt step SHALL NOT run as part of this), apply the id-free config fragments, and continue into provisioning. On a no it SHALL stop having changed nothing.

Where the repo has no application of its own, the offer SHALL include the app scaffold on the same terms `wong-setup` uses: one outcome-shaped question, and on a yes `components.appScaffold: true` is set alongside `stackPack` so the copy-if-absent walk lands the scaffold too. A repo that already has an application SHALL NOT be offered it.

The skill SHALL own all config-fragment application: the id-free fragments (`package.json` scripts, `.env.example` variables, `.gitignore` entries) at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. A missing wrangler config SHALL be created from the fragment, not treated as a reason to stop. Because the fragment declares the Worker entry point as well as the bindings, the created config SHALL be deployable whether the application arrived with the scaffold or was already the repo's own.

The `db:migrate:staging` and `db:migrate:prod` scripts SHALL be written with the database names the skill derives, as part of the `package.json` fragment, since no copied payload file may carry a database name.

When no Cloudflare token is available yet, the skill SHALL stop cleanly after the adoption work with the files and fragments in place, stating that a re-run with a token completes provisioning.

#### Scenario: Late adoption through the skill

- **WHEN** `/wong-cloudflare` runs in a repo that has the skill but not `components.stackPack: true`
- **THEN** it offers the pack, and on a yes sets the flag, lands the missing drop-in files, applies the id-free fragments, and proceeds toward provisioning
- **AND** on a no it stops with the repo unchanged

#### Scenario: Late adoption in a repo with no app

- **WHEN** `/wong-cloudflare` offers the pack in a repo with no application of its own and the user says yes
- **THEN** it sets `components.appScaffold: true` alongside `components.stackPack: true`
- **AND** the copy-if-absent walk lands the scaffold, so provisioning has something to deploy

#### Scenario: A scaffolded repo needs only ids

- **WHEN** the skill reaches the binding step in a repo carrying the scaffold
- **THEN** it creates the wrangler config from the fragment, supplying the entry point and the ids it just provisioned
- **AND** it does not ask the user to author any application code

#### Scenario: Adoption without a token yet

- **WHEN** the user says yes to the pack but has no Cloudflare account or token
- **THEN** the run completes the adoption work and stops cleanly, telling the user a later re-run provisions
- **AND** nothing is half-provisioned

#### Scenario: No pointer at a refusing path

- **WHEN** any payload prose directs a repo without the pack toward adopting it
- **THEN** it names a route that works — `/wong-cloudflare` where the skill exists, or setting `components.stackPack: true` and running `/wong-sync` where it does not
- **AND** no prose claims `/wong-sync` offers the pack
