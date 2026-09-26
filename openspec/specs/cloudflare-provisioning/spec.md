# Cloudflare provisioning

## Purpose

Stand the memory store and the [stack pack](../stack-pack/spec.md)'s Cloudflare infrastructure up from a **single user token**, as a step of `/wong-setup` in an empty folder, so the human's job is signing up and pasting one credential rather than working a dashboard.

The token the user creates carries only two permission groups and widens its own permissions on demand, which is what lets optional features — a login wall, in particular — cost nothing up front. It stays on the host; CI gets a separately minted deploy token that cannot mint tokens. Everything else is plain REST: account resolution, the memory store, the production and staging databases, the binding, and the CI wiring. Whatever is provisioned can be torn down, so the path is repeatably testable.
## Requirements
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

The provisioning step SHALL mint a separate account-owned deploy token named `<repo>-deploy`, scoped to the chosen account only, and SHALL set it as the GitHub repository secret `CLOUDFLARE_API_TOKEN`, with `CLOUDFLARE_ACCOUNT_ID` beside it. The deploy token SHALL carry only `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`, plus `Workers R2 Storage Write` only when the app's wrangler config binds an R2 bucket. It SHALL NOT carry any token-write, Access, or user permission. The deploy token's value SHALL go directly to `gh secret set` and SHALL NOT be written to any file or printed. The user token SHALL NOT be set as a GitHub secret, and SHALL stay only in the primary worktree's durable `.env`. Minting the deploy token SHALL be covered by the same standing authorization as the widen. Neither step SHALL require the user to visit a web interface.

On a later run, the step SHALL reuse an existing `<repo>-deploy` token. It SHALL roll the token's value and set the secret again only when the secret is missing or the user asks to rotate it.

Before relying on a push, the step SHALL check that the stored `gh` credentials carry the `workflow` scope, since it is absent from `gh auth login`'s minimum set and its absence fails only at push time with wording a newcomer cannot act on. Where it is missing the step SHALL offer `gh auth refresh --scopes workflow` with a plain-language reason.

#### Scenario: Secrets reach GitHub, not the repo

- **WHEN** the provisioning step wires CI
- **THEN** the GitHub secret `CLOUDFLARE_API_TOKEN` holds the minted `<repo>-deploy` token
- **AND** the user token is in no GitHub secret and no committed file
- **AND** the user is not asked to open a web interface

#### Scenario: The deploy token is narrow

- **WHEN** the deploy token is minted
- **THEN** its policy has `Workers Scripts Write`, `D1 Write`, and `Account Settings Read` on the chosen account, and R2 only when the app binds a bucket
- **AND** it cannot create, edit, or read API tokens

#### Scenario: The deploy token value never reaches disk

- **WHEN** the deploy token is minted or rolled
- **THEN** its value is piped to `gh secret set` and is in no file, log, or report

#### Scenario: The workflow scope is checked before the push

- **WHEN** the step reaches CI wiring in a repo whose `gh` credentials lack `workflow`
- **THEN** it surfaces this before the push rather than after
- **AND** it offers the refresh command with a plain-language explanation

#### Scenario: The deploy model is unchanged by the choice of CI

- **WHEN** the workflow runs
- **THEN** it delegates the branch decision to the pack's build and deploy scripts rather than reimplementing it
- **AND** production, the staging Worker, and the per-commit preview alias behave exactly as they do under Cloudflare Workers Builds

### Requirement: Everything provisioned can be torn down

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, this repo's bindings and keys in the memory Worker, the deploy token, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch. It SHALL delete the memory Worker and the keys database only when no other repo is attached.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

#### Scenario: Another repo shares the memory Worker

- **WHEN** teardown runs for `billing` and the memory Worker also serves `home`
- **THEN** teardown removes only `billing`'s bindings and keys, and the Worker keeps serving `home`

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

### Requirement: Setup provisions the app from a single API token

`/wong-setup` SHALL include a provisioning step that takes an empty folder from "has a Cloudflare token" to "has a memory store, a deployed Worker backed by two D1 databases, and a CI pipeline." The runbook SHALL live in `wong-setup/references/` and SHALL NOT be a separate skill. It SHALL provision the stack pack in every new install, with no `components.stackPack` gate. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and the host's durable `.env`, and SHALL leave its repo changes uncommitted for `/save`. Every step SHALL be idempotent, so that a failed run can run again and reuse what already exists.

#### Scenario: Provisioning runs as part of setup

- **WHEN** setup runs in an empty folder with a Cloudflare user token
- **THEN** it provisions the memory store, both app databases, the binding, the deploy token, and the GitHub secrets in one step
- **AND** it reports the production URL and the preview URL pattern after the first deploy

#### Scenario: A run is repeated after a failure

- **WHEN** the provisioning step runs again after it stopped partway
- **THEN** it reuses every resource that already exists and reports it as reused
- **AND** it creates only what is missing

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, install record, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the provisioning step runs no git command in the repo

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, deploy the account's memory Worker or attach the repo to it, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-worker` requires. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the Worker URL under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Deploying the memory Worker and creating the key are covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL attach it to the memory Worker; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the memory Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, attaches it to the memory Worker, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, the Worker attachment, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing
