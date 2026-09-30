# cloudflare-provisioning Specification

## Purpose

Stand up a repo's Cloudflare hosting and memory store from one user token as part of `/wong-setup`, keep account credentials out of git, CI, and Workers, keep the production and staging Workers in step, and document the opt-in login wall.

## Requirements

### Requirement: One user token widens itself without asking

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

### Requirement: Token mistakes are named in plain words

The token SHALL be verified before any other step, and a failure SHALL name its cause and the one fix instead of the raw API error. An early authorization failure right after a widen, `401` or `403`, SHALL be retried as propagation before it is reported.

#### Scenario: Account-scoped token

- **WHEN** the token was made under the account instead of My Profile
- **THEN** the person is told that and given the right route

#### Scenario: No account in the token's resources

- **WHEN** the token is valid but sees no account
- **THEN** the person is told to set Account Resources and nothing is provisioned

#### Scenario: A widened token is refused for a few seconds

- **WHEN** Cloudflare answers the first check after a widen with `401` or `403`, then with success
- **THEN** provisioning waits it out and carries on, and reports a failure only when the last try is still refused

### Requirement: The user token stays in the ignored .env

The user token SHALL live only in the primary worktree's `.env`, which provisioning creates from `.env.example` and confirms git ignores before it accepts a value; the person SHALL be asked only for the value. The user token SHALL NOT become a GitHub secret or appear in a committed file, and a linked worktree's own `.env` SHALL be left untouched.

#### Scenario: Run from a linked worktree

- **WHEN** provisioning runs in a linked worktree
- **THEN** it reads and writes the primary worktree's `.env`, and a later run from another worktree finds the same value

### Requirement: The account is chosen before anything is created

Provisioning SHALL NOT guess the account: with exactly one visible it SHALL name it and continue, and with more than one it SHALL ask and create nothing until the person chooses.

#### Scenario: Two accounts

- **WHEN** the token sees a personal and a work account
- **THEN** provisioning lists both and waits for a choice

### Requirement: Provisioning builds the app's hosting from the token

After asking once before creating billable resources, provisioning SHALL create, with names derived from the repo and never asked for, the memory store, a production database and a staging database that branch deploys use, the app's config with real ids, and the CI deploy token. It SHALL be idempotent, reusing and reporting what exists, and SHALL leave its repo edits uncommitted for `/save`.

#### Scenario: A second run

- **WHEN** provisioning runs again after stopping partway
- **THEN** it reuses what exists, reports it as reused, and creates only what is missing

### Requirement: CI deploys with its own narrow token

CI SHALL deploy with a separate `<repo>-deploy` token limited to deploying Workers and databases on the chosen account, plus storage only when the app binds a bucket and Access read permission for coverage checks. It SHALL be unable to manage tokens or change Access policies. Its value MUST go straight to the GitHub secret, never to a file or the screen; a later run SHALL reuse it and roll it only when the secret is missing or the person asks.

#### Scenario: Secrets reach GitHub

- **WHEN** CI is wired
- **THEN** the GitHub secret holds the deploy token, and no GitHub secret holds the user token

#### Scenario: Protection is missing

- **WHEN** CI cannot establish that the workspace is protected
- **THEN** it refuses to publish business content or a new reachable preview, and does not try to change Access policies

### Requirement: The memory store is production-only

Provisioning SHALL bind the memory store to the production Worker only, write the installer's memory key to `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, and record the store's ids under `components.memory` in the install record. The key SHALL NOT be a CI secret. On an account without R2, the store SHALL be made without a transcript bucket, the report SHALL say so with the dashboard step, and a later run SHALL add the bucket.

#### Scenario: R2 is off

- **WHEN** the account has not enabled R2
- **THEN** memory works without transcripts and the report names how to turn R2 on

#### Scenario: Staging never reads memory

- **WHEN** the app's config is written
- **THEN** only the production Worker binds the memory store

### Requirement: The closing report says only what was checked

Before reporting success, provisioning SHALL check the actual production URL and report whether protection is configured, whether real human login is verified, and whether memory is reachable. It SHALL warn when a new address is not ready and SHALL never equate successful configuration or machine authentication with proven human access. It SHALL say memory is on only when a read through the production Worker answered.

#### Scenario: Production not live yet

- **WHEN** the memory read has not answered
- **THEN** the report says memory starts once the site first goes live

#### Scenario: A mismatch

- **WHEN** the fetched URL does not answer as its configuration implies
- **THEN** the run reports a failure naming the request, not success

#### Scenario: Configuration without human evidence

- **WHEN** the API configuration and service-token probe succeed but nobody has completed a real email login
- **THEN** the report labels human login unverified and does not call the entire security rollout complete

### Requirement: Teardown removes only this repo's resources

A documented teardown SHALL list the Workers, databases, deploy token, Access resources, and GitHub secrets this repo created, confirm before deleting, and report what it removed and skipped. The memory store SHALL be removed only when the person names it, and another repo's resources SHALL NOT be touched.

#### Scenario: Shared account

- **WHEN** the account holds another repo's databases and memory store
- **THEN** teardown leaves them and names them as skipped

### Requirement: The credentials page owns the token

The `wiki/stack/` credentials page SHALL give a link that opens Cloudflare's token form pre-filled with exactly the two groups the user grants, all accounts, and the name `WongStack`. It SHALL keep the exact click path as the fallback, calling out the Account Resources field. It SHALL name the variables in `.env` as `.env.example` does, state that providing the token pre-authorizes the widen, and state plainly that a self-widening token is effectively account-root.

#### Scenario: Reading the trade-off

- **WHEN** a reader reaches the widen section
- **THEN** it states the account-root cost beside the pre-authorization and how to narrow back

#### Scenario: The link asks for only the two groups

- **WHEN** the token link on the credentials page is decoded
- **THEN** it names only the user and account API token groups, with edit access, for all accounts

### Requirement: The Worker verifies the signed Access assertion

The documented enforcement SHALL verify the signed Access assertion for this application and read the identity from it, `email` for a person and `common_name` for a service token. A missing or invalid assertion SHALL get `401`; only an explicit `SKIP_AUTH` development flag MAY substitute an identity.

#### Scenario: A machine caller

- **WHEN** CI or `/verify` calls the gated app with a service token
- **THEN** the request is authenticated from the assertion, not rejected for a missing email header

### Requirement: A browser proves the wall works

The Access runbook SHALL require a logged-in browser to load the app before the wall is called working, and SHALL say that an anonymous redirect plus a service-token success is not proof.

#### Scenario: Terminal checks pass

- **WHEN** only terminal checks have passed
- **THEN** the wall is not reported as working

### Requirement: The stack section is reachable and generic

`wiki/README.md` SHALL link the `wiki/stack/` hub, the hub SHALL link every page in it, and no page SHALL hold anything specific to one app.

#### Scenario: Opening the wiki

- **WHEN** a reader opens `wiki/README.md`
- **THEN** it leads to the stack hub, which links every stack page

### Requirement: A plain page says how to add an API key

The stack section SHALL have a page for a non-developer that says to get a key from the service and give it to the assistant through the private key link, with pasting it into the chat with what it is for as the fallback; that the assistant saves it privately and gives it to hosting when the live site needs it; what to do when a key leaks; and that website logins are kept by the browser tool instead.

#### Scenario: A key leaks

- **WHEN** a reader thinks a key was shared by mistake
- **THEN** the page says to make a new key, give it to the assistant, and delete the old one

#### Scenario: A reader has a key to give

- **WHEN** a reader has copied a key from a service
- **THEN** the page tells them to give it through the private key link, and to paste it into the chat only as a fallback

### Requirement: One secrets file loads both Workers

`app/.dev.vars` SHALL be the declared list of Worker runtime secrets, and `secrets:push` SHALL load it into both the production and staging Workers; a git-ignored `app/.dev.vars.staging` SHALL give staging its own values. A linked worktree with no copy SHALL push from the primary worktree's file.

#### Scenario: Staging diverges

- **WHEN** `app/.dev.vars.staging` exists
- **THEN** staging gets its values and production gets `app/.dev.vars`

### Requirement: Account credentials never reach a Worker

`secrets:push` MUST refuse `.env`, including through a symlink, and MUST fail when the file declares a `CLOUDFLARE_*` or `CF_ACCESS_*` key, loading nothing into either Worker.

#### Scenario: A credential pasted into .dev.vars

- **WHEN** `app/.dev.vars` holds `CLOUDFLARE_API_TOKEN`
- **THEN** the push exits non-zero, names the key, and loads nothing

### Requirement: A gate keeps the two Workers in step

`secrets:check` SHALL fail when the two Workers' secret names differ or a stateful binding at the top level of the config is missing from `env.staging`, excluding the production-only memory bindings, and SHALL only warn about keys that disagree with `app/.dev.vars.example`. It SHALL compare names only and never read or print a value.

#### Scenario: A secret on one Worker

- **WHEN** production holds a secret staging lacks
- **THEN** the check fails and names the key, with no value in its output

### Requirement: The gate is never permanently red

`secrets:check` SHALL skip with a reason and pass when the repo has no wrangler config, no `CLOUDFLARE_API_TOKEN`, or no `env.staging`, still running the binding comparison when only the token is missing.

#### Scenario: A fresh install before provisioning

- **WHEN** CI runs before any wrangler config exists
- **THEN** the check reports nothing to compare and passes

### Requirement: Setup and the server installer provision the same way

`/wong-setup` and the server installer SHALL create the same Cloudflare resources, names, app config, memory store, and deploy token through one shared script, so a fix to provisioning reaches both. Setup SHALL keep its questions: which account when there are several, and one ask before anything billable. The installer SHALL take those choices from its job, and SHALL pick the first free name suffix instead of asking when a derived name is taken.

#### Scenario: Setup provisions

- **WHEN** a person approves provisioning during `/wong-setup`
- **THEN** setup runs the shared script and reports what it created and what it reused

#### Scenario: A taken name on a server

- **WHEN** the server installer finds a derived name held by another project
- **THEN** it uses the next free suffix for every name and touches nothing it did not create
### Requirement: Workspaces are private from their first deployment

Provisioning SHALL protect production and staging business content with Cloudflare Access before it becomes reachable. The owner SHALL authenticate with a reachable verified email. Missing permissions, organization onboarding, unsupported protection, or incomplete configuration SHALL stop private setup without publishing public business content. An interrupted run SHALL reuse owned resources and remain recoverable.

#### Scenario: First deployment

- **WHEN** a new workspace's first deployment completes
- **THEN** an anonymous visitor cannot read its pages, static assets, mini apps, or APIs, and its owner can authenticate by email

#### Scenario: Security setup stops

- **WHEN** provisioning cannot establish the login wall
- **THEN** business content remains unavailable and the report names what is needed to continue

### Requirement: Protection covers every address of this workspace

The workspace's Access protection SHALL cover its production and staging Workers across default addresses, custom domains, routes, branch aliases, and unique version URLs, including addresses added later and previews created before adoption. Provisioning SHALL NOT gate unrelated Workers or create account-wide protection. More-specific conflicting policies SHALL prevent a successful coverage report until resolved.

#### Scenario: A new preview or custom domain

- **WHEN** a new version, alias, or custom domain reaches a protected workspace Worker
- **THEN** the same allowed emails control access without a manual hostname-policy update

#### Scenario: A shared Cloudflare account

- **WHEN** the account also contains unrelated Workers and a conflicting preview policy
- **THEN** unrelated Workers keep their access settings, and this workspace is not reported fully protected until its conflicting policy is resolved

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification. Membership updates SHALL preserve that machine policy. The production memory route SHALL remain authenticated by its memory keys and SHALL be the only automatic route exception; other public routes require explicit reviewed configuration. Staging and previews SHALL carry no memory bindings.

#### Scenario: Automated checks and memory

- **WHEN** automated checks use the dedicated service token and a memory caller uses a valid memory key
- **THEN** each reaches its intended protected service, while an anonymous memory caller is denied

#### Scenario: Team membership changes

- **WHEN** a person is added or removed
- **THEN** machine permissions and exact memory-route authentication remain intact, and no broad public prefix becomes exempt

### Requirement: Login sessions last thirty days by default

Newly provisioned workspace Access applications and human policies SHALL issue login/session tokens valid for 30 days by default, across production, staging, and previews. Membership reconciliation SHALL retain that configured duration. The lifetime SHALL NOT defer removal or session revocation, or change service credential and API-token expiry. Expired assertions SHALL be denied and require reauthentication.

#### Scenario: A normal session expires

- **WHEN** an allowed person's default login/session token reaches 30 days after issue
- **THEN** it no longer authorizes workspace requests and the person must authenticate again

#### Scenario: Removal before thirty days

- **WHEN** a person is removed while their login/session token has not expired
- **THEN** the normal removal and revocation flow denies that session after provider propagation without waiting for the thirty-day expiry
