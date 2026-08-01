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

### Requirement: The token widens its own permissions rather than requiring a pre-granted set


The documented credential SHALL be a single user-scoped Cloudflare API token carrying only `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope), with the user's account included in its resources. The skill SHALL obtain any further permission it needs by reading its own token id from `/user/tokens/verify`, reading its current policy document from `/user/tokens/{id}`, resolving permission-group ids **by name** from `/user/tokens/permission_groups`, and issuing `PUT /user/tokens/{id}` with a widened policy set. Because the `PUT` replaces policies wholesale, the widened set SHALL include the original two permission groups. The skill SHALL verify the widen took effect before proceeding, and SHALL offer to narrow the token back afterward.

#### Scenario: A two-permission token becomes sufficient

- **WHEN** the skill runs with a token holding only the two API-token permission groups
- **THEN** it widens itself to include the permissions the requested work needs
- **AND** it confirms by re-probing the target surfaces before provisioning anything

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


The skill SHALL create the repo's `.env` from `.env.example` when it does not exist, SHALL confirm that `.gitignore` covers it, and SHALL ask the user only for the token value to paste. It SHALL NOT instruct the user to create a dotfile, choose a variable name, or verify their own ignore rules.

#### Scenario: Fresh repo with no .env

- **WHEN** provisioning starts in a repo that has `.env.example` but no `.env`
- **THEN** the skill creates `.env` from the example, verifies it is ignored by git, and asks for the token value alone

#### Scenario: The credential file is never committed

- **WHEN** the token value has been written to `.env`
- **THEN** the skill confirms git does not see the file as a change
- **AND** it stops and warns rather than continuing if the file would be committed

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


For a repo taking the stack pack, the skill SHALL create the production and staging D1 databases, write their ids into the repo's `wrangler.jsonc` `d1_databases` binding as `database_id` and `preview_database_id`, and compute the production and preview URLs from the account's Workers subdomain. It SHALL be idempotent: a resource that already exists is reused and reported, never duplicated.

The Cloudflare token SHALL live only in the repo's git-ignored `.env`. Provisioning SHALL NOT copy it anywhere else, because Workers Builds runs inside Cloudflare and needs no credential handed to it.

#### Scenario: A second run does not duplicate resources

- **WHEN** the skill runs again in a repo it already provisioned
- **THEN** it detects the existing databases and reuses them
- **AND** it reports each as already present rather than creating a second copy

#### Scenario: The credential is not copied out of .env

- **WHEN** provisioning completes
- **THEN** the token exists only in the git-ignored `.env`
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

### Requirement: A runbook documents the provisioning path for any agent


The payload SHALL include a `wiki/stack/` page describing the provisioning path in enough detail that an agent without the skill can execute it: the exact token the user creates, the self-widening sequence, account resolution, the resources created, the CI wiring, and teardown. It SHALL follow the progressive-disclosure rulebook and link from the `wiki/stack/` hub. Any step that was not verified against a live account SHALL be marked unverified and given a dashboard fallback.

#### Scenario: An agent follows the runbook without the skill

- **WHEN** an agent in a repo without the provisioning skill is asked to set up the Cloudflare app
- **THEN** the runbook gives it the full sequence including the exact permission names and endpoints
- **AND** it does not need to consult Cloudflare's dashboard documentation to proceed

#### Scenario: Unverified steps are labelled

- **WHEN** the runbook covers a step that could not be tested against a live account
- **THEN** it marks the step unverified and states the dashboard fallback
- **AND** it does not present the step as confirmed working

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
