# Cloudflare provisioning

## Purpose

Stand the [stack pack](../stack-pack/spec.md)'s Cloudflare infrastructure up from a **single API token**, so the human's job is signing up and pasting one credential rather than working a dashboard.

The token the user creates carries only two permission groups and widens its own permissions on demand, which is what lets optional features — a login wall, in particular — cost nothing up front. Everything else is plain REST: account resolution, the production and staging databases, the binding, and the CI wiring. Whatever is provisioned can be torn down, so the path is repeatably testable.

This capability is gated on `components.stackPack: true`; a repo that declined the pack never sees it.

## Requirements

### Requirement: A provisioning skill stands the app up from a single API token


The payload SHALL include a provisioning skill, gated on `components.stackPack: true`, that takes a repo from "has a Cloudflare token" to "has a deployed Worker backed by two D1 databases and a CI pipeline." It SHALL be runnable at any time after `/wong-setup`, not only during onboarding, because the token typically arrives later than the install does. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and SHALL leave its repo changes uncommitted for `/save`.

#### Scenario: Provisioning runs long after setup

- **WHEN** a user runs the provisioning skill in a repo where WongStack is already installed and the stack pack was taken
- **THEN** it provisions from the current token without re-running onboarding
- **AND** it reports the production URL and the preview URL pattern on completion

#### Scenario: The skill is absent for a repo that declined the pack

- **WHEN** a repo's manifest has `components.stackPack` false or absent
- **THEN** the provisioning skill is neither installed nor offered
- **AND** no Cloudflare-specific file enters that repo

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the skill runs no git command in the repo

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

### Requirement: The token widens its own permissions rather than requiring a pre-granted set


The documented credential SHALL be a single user-scoped Cloudflare API token carrying only `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope), with the user's account included in its resources. The skill SHALL obtain any further permission it needs by reading its own token id from `/user/tokens/verify`, reading its current policy document from `/user/tokens/{id}`, resolving permission-group ids **by name** from `/user/tokens/permission_groups`, and issuing `PUT /user/tokens/{id}` with a widened policy set. Because the `PUT` replaces policies wholesale, the widened set SHALL include the original two permission groups. The skill SHALL verify the widen took effect before proceeding, and SHALL offer to narrow the token back afterward.

The widen SHALL be **pre-authorized by the act of providing the token**: the payload SHALL state, on the page that owns the credential, that supplying a token carrying these two permission groups *is* the permission to widen it, and every payload surface that instructs an agent to widen SHALL direct it to proceed without asking and to report afterward which permissions it granted. Confirmation SHALL NOT be sought for the widen itself. This authorization SHALL NOT extend to any other rule: creating or deleting billable resources still requires asking, a failed or unverified widen still stops the run, and narrowing back is still offered rather than assumed.

#### Scenario: A two-permission token becomes sufficient

- **WHEN** the skill runs with a token holding only the two API-token permission groups
- **THEN** it widens itself to include the permissions the requested work needs
- **AND** it confirms by re-probing the target surfaces before provisioning anything

#### Scenario: The widen proceeds without asking

- **WHEN** an agent following the payload reaches the point of widening a token the user has provided
- **THEN** it performs the widen without asking the user for permission to change the token's scope
- **AND** it reports afterward which permissions it granted

#### Scenario: The authorization is stated where an agent will read it

- **WHEN** an agent reads any payload surface that instructs it to widen — the provisioning skill, the widen-protocol reference, or the credentials page
- **THEN** that surface states the standing authorization or links to the page that owns it
- **AND** the credentials page states it alongside the account-root trade-off, so the grant and its cost are read together

#### Scenario: The authorization does not widen any other rule

- **WHEN** the same run reaches a step that creates or deletes a billable resource
- **THEN** it still asks first
- **AND** a `PUT` that fails or does not verify still stops the run before anything is provisioned

#### Scenario: The ability to widen again is preserved

- **WHEN** the skill builds the widened policy set
- **THEN** the set still contains `API Tokens Write` and `Account API Tokens Write`
- **AND** a later run can widen the same token again

#### Scenario: Permission-group ids are resolved by name at runtime

- **WHEN** the skill needs a permission group
- **THEN** it looks the id up by name from the live permission-groups endpoint rather than relying on a hardcoded id
- **AND** where two groups share a name, it selects by scope (`com.cloudflare.api.account`) rather than by position

#### Scenario: Self-escalation is refused

- **WHEN** the `PUT` fails or the post-widen verification shows the permissions did not take effect
- **THEN** the skill stops before provisioning
- **AND** it reports which surfaces are unavailable and lists the permissions to grant manually

### Requirement: The widen covers the walkthrough's browser

The token widen SHALL include the **Browser Rendering Edit** permission group in the widened policy set, resolved by name at runtime like every other group, so the same `CLOUDFLARE_API_TOKEN` the pack provisions can open Browser Run sessions for the staging walkthrough. The grant SHALL be unconditional — not gated on whether the repo has adopted the walkthrough — because the permission costs nothing, the widen is already pre-authorized, and gating would couple provisioning to walkthrough detection. The narrow-back offer SHALL cover this group like any other the skill granted.

#### Scenario: A fresh provisioning run grants the browser permission

- **WHEN** `/wong-cloudflare` widens a newly provided two-permission token
- **THEN** the widened set includes Browser Rendering Edit alongside the other granted groups
- **AND** the post-widen report names it

#### Scenario: A re-run repairs an older token

- **WHEN** `/wong-cloudflare` re-runs in a repo whose token was widened before this group existed in the set
- **THEN** the widen adds Browser Rendering Edit to the existing policy set
- **AND** a subsequent `/walk` can authenticate to Browser Run without any manual grant

#### Scenario: Narrowing back removes it too

- **WHEN** the user accepts the offer to narrow the token back down
- **THEN** Browser Rendering Edit is removed along with the other granted groups
- **AND** the two original API-token groups remain

### Requirement: The token creation screen is documented as an exact click path


The payload SHALL document how to create the token as a literal, screen-by-screen path — the menu route (`My Profile → API Tokens → Create Token → Create Custom Token`), each permission row to add, and the **Account Resources** include, which SHALL be called out as the field most often missed. Instructions SHALL NOT paraphrase the screen or assume the user can infer a field from its purpose. During exploration this token was created incorrectly twice — first account-scoped rather than user-scoped, then with no account in its resources — by someone with live API access to inspect the result, so the path is treated as the highest-risk moment in the flow.

The skill SHALL verify the pasted token before doing anything else, and SHALL distinguish the failure modes rather than surfacing the raw error.

#### Scenario: The token is account-scoped instead of user-scoped

- **WHEN** verification shows the token cannot reach `/user/tokens/verify`
- **THEN** the skill explains that the token was created under the account section rather than under My Profile, and points at the correct route
- **AND** it does not report the raw API error as the user-facing message

#### Scenario: The token has no account in its resources

- **WHEN** the account list comes back empty while the token is otherwise valid
- **THEN** the skill names the Account Resources field specifically, and tells the user what to set it to
- **AND** it offers to re-verify once they have saved the change

#### Scenario: API errors are translated

- **WHEN** the Cloudflare API returns a permission or authentication error during verification or widening
- **THEN** the user-facing message names the missing permission or setting in plain language and gives the one action that fixes it
- **AND** the raw code and response are available for an agent to read but are not the primary message

### Requirement: The skill sets up the credential file for the user

The skill SHALL resolve the durable `.env` in the repository's primary worktree from Git metadata, including when invoked from a linked worktree. When the durable file does not exist, it SHALL create it from the active branch's `.env.example`, SHALL confirm that Git ignores the destination at the primary worktree, and SHALL ask the user only for the token value to paste. It SHALL read and narrowly update `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in that same durable file throughout the run. It SHALL NOT instruct the user to create a dotfile, choose a variable name, or verify their own ignore rules. It SHALL NOT overwrite or remove a pre-existing linked-worktree `.env`; when one exists separately, it SHALL report the duplicate without displaying values and continue using the durable file.

#### Scenario: Fresh repo with no durable .env

- **WHEN** provisioning starts in a repo that has `.env.example` but no `.env` in its primary worktree
- **THEN** the skill creates the primary worktree's `.env` from the active branch's example, verifies that destination is ignored by git, and asks for the token value alone

#### Scenario: Provisioning runs from a linked worktree

- **WHEN** `/wong-cloudflare` receives or updates a credential from a linked worktree
- **THEN** it writes and rereads the primary worktree's durable `.env`
- **AND** a later run from another worktree finds the same value

#### Scenario: A duplicate linked-worktree file is preserved

- **WHEN** provisioning finds both the durable `.env` and a separate regular `.env` in the active linked worktree
- **THEN** it uses the durable file and reports that the duplicate needs reconciliation
- **AND** it neither exposes values nor deletes, replaces, or bulk-merges the active file

#### Scenario: The credential file is never committed

- **WHEN** the token value has been written to the durable `.env`
- **THEN** the skill confirms git does not see the destination as a change
- **AND** it stops and warns rather than continuing if the destination would be committed

### Requirement: Resource names are derived, not requested


The skill SHALL derive the names of the databases and the Worker from the repository name, SHALL state the names it chose, and SHALL NOT ask the user to supply them. A user MAY override a name if they raise it, but no naming question SHALL be part of the default flow.

#### Scenario: Provisioning names resources without asking

- **WHEN** the skill creates the production and staging databases and the Worker
- **THEN** it derives each name from the repo name, applies it, and reports the names in its closing summary
- **AND** it asks the user no naming question

### Requirement: The account is resolved by asking, never assumed


The skill SHALL list the accounts the token can see and SHALL NOT assume a single account. Where exactly one account is visible it MAY proceed with it after stating which. Where zero or more than one is visible it SHALL ask the user which to use before creating any resource.

#### Scenario: Multiple accounts

- **WHEN** the token can see more than one Cloudflare account
- **THEN** the skill lists them by name and id and asks which to provision into
- **AND** it creates nothing until the user answers

#### Scenario: No accounts visible

- **WHEN** the token can see no accounts
- **THEN** the skill reports that the token's account resources are unset and explains how to include the account
- **AND** it does not attempt to provision

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

### Requirement: CI is wired without user involvement


The skill SHALL set the Cloudflare credentials as GitHub repository secrets via `gh`, and SHALL confirm the pack's GitHub Actions workflow is present. Neither SHALL require the user to visit a web interface: `gh secret set` works on the `repo` scope `gh auth login` already grants, and the workflow file ships with the pack.

Before relying on a push, the skill SHALL check that the stored `gh` credentials carry the `workflow` scope, since it is absent from `gh auth login`'s minimum set and its absence fails only at push time with wording a newcomer cannot act on. Where it is missing the skill SHALL offer `gh auth refresh --scopes workflow` with a plain-language reason.

#### Scenario: Secrets reach GitHub, not the repo

- **WHEN** the skill wires CI
- **THEN** the Cloudflare token and account id are set as GitHub repository secrets
- **AND** neither value is written into a committed file
- **AND** the user is not asked to open a web interface

#### Scenario: The workflow scope is checked before the push

- **WHEN** the skill reaches the CI step in a repo whose `gh` credentials lack `workflow`
- **THEN** it surfaces this before the push rather than after
- **AND** it offers the refresh command with a plain-language explanation

#### Scenario: The deploy model is unchanged by the choice of CI

- **WHEN** the workflow runs
- **THEN** it delegates the branch decision to the pack's build and deploy scripts rather than reimplementing it
- **AND** production, the staging Worker, and the per-commit preview alias behave exactly as they do under Cloudflare Workers Builds

### Requirement: Everything provisioned can be torn down


The skill SHALL provide a teardown path that removes the resources a provisioning run created — the Worker, both D1 databases, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user runs teardown after a provisioning run
- **THEN** it lists the Worker, both databases, and the secrets it will remove and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

### Requirement: The account is chosen before anything is created

Where the token resolves more than one Cloudflare account, the skill SHALL enumerate the accounts it can see and stop for an explicit choice **before creating any resource**. It SHALL NOT infer the account from ordering, from a single-match heuristic applied to a multi-match result, or from the repository's name.

Provisioning into the wrong account is expensive to undo — resources must be created again elsewhere and deleted here, and anything already bound to them re-bound — and the mistake is invisible at the moment it is made, since every call succeeds. An adopter with access to more than one account came within one step of provisioning a personal project into a business account.

#### Scenario: A multi-account token stops for a choice

- **WHEN** the token can see more than one account
- **THEN** the skill lists them and asks which to use
- **AND** it creates nothing until the answer arrives

#### Scenario: A single-account token does not ask

- **WHEN** the token resolves exactly one account
- **THEN** the skill proceeds, naming the account it resolved

### Requirement: Permission propagation is waited out, not treated as failure

After the token widens its own permissions, the skill SHALL treat an early authorization failure as **propagation rather than refusal**, retrying with backoff before concluding anything. A widen can take up to roughly a minute to take effect, and the Access endpoints in particular were observed returning `403` for about that long immediately after a successful widen.

The retry window and the reason SHALL be documented wherever the probe protocol is stated, so that a first `403` is not read as a wrong token, a wrong account, or a missing permission group — each of which sends the reader down a diagnosis that cannot succeed.

#### Scenario: An early 403 after widening is retried

- **WHEN** an API call fails authorization within the propagation window of a successful widen
- **THEN** the skill retries with backoff before reporting a failure
- **AND** it says it is waiting for propagation rather than reporting a permission problem

#### Scenario: A genuine permission failure is still reported

- **WHEN** the calls continue to fail after the documented window
- **THEN** the skill reports the failure with the permission group involved

### Requirement: A fresh hostname's placeholder is set as an expectation

The skill SHALL tell the user, at the point it hands over a newly created `workers.dev` URL, that a hostname can serve a placeholder or `404` for a minute or two after its first deploy. Without that sentence the first thing a new user sees at their new address is a page that reads as a failed deploy — observed twice in one adoption.

#### Scenario: The handover sets the expectation

- **WHEN** the skill reports a URL for a hostname deployed for the first time
- **THEN** it states that the address may briefly 404 or show a placeholder before it resolves

### Requirement: A run finishes with a smoke test against the deployed URL

Before reporting success, the skill SHALL make two requests against the deployed URL and assert the results: one **anonymous**, and one **authenticated** by the means the repo actually uses — a service token where Access is on, an ordinary request where it is not. It SHALL assert that each gets the response its configuration implies: the application for the authenticated caller, and the application or an Access challenge, per configuration, for the anonymous one.

A mismatch SHALL be reported as a failure of the run rather than a note, and SHALL name which of the two requests disagreed with the configuration.

This check exists because the two most damaging findings in this area were both invisible to every other step: an Access wall that admitted service tokens and challenged anonymous callers while serving a browser a placeholder, and an auth implementation that `401`d every machine caller. Both would have surfaced here immediately.

Where Access is in front, the skill SHALL additionally state that the smoke test does not prove a human can log in, and point at the runbook's browser verification — the terminal cannot establish that.

#### Scenario: A public app answers both requests

- **WHEN** the run finishes on a repo with no Access in front
- **THEN** both the anonymous and the authenticated request receive the application
- **AND** the run reports the check passed

#### Scenario: A gated app challenges the anonymous caller

- **WHEN** the run finishes on a repo with Access configured
- **THEN** the anonymous request receives a challenge and the service-token request receives the application
- **AND** the report states that browser verification is still required to confirm a human can pass

#### Scenario: A locked-out machine caller fails the run

- **WHEN** the service-token request is rejected by the app's own auth code
- **THEN** the run reports a failure naming that request
- **AND** it does not report provisioning as successful
