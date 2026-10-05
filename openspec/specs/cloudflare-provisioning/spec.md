# cloudflare-provisioning Specification

## Purpose

Stand up a repo's Cloudflare hosting and memory store from one user token as part of `/wong-setup`, keep account credentials out of git, CI, and Workers, keep the production and staging Workers in step, and document the opt-in login wall.

## Requirements

### Requirement: One user token widens itself without asking

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. The widen SHALL include the cloud browser's permission, and an installed repo whose token lacks it SHALL widen the same way the first time a task needs the cloud browser. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered, with one exception: when the caller will finish open without login, an Access check still refused after the full propagation wait SHALL NOT stop the widen, and provisioning's Zero Trust step SHALL decide whether to open or stop.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

#### Scenario: An older install first needs the cloud browser

- **WHEN** a task needs the cloud browser and the token lacks its permission
- **THEN** the token widens itself, the agent reports the permission it granted, and the task carries on

#### Scenario: Access stays refused on the open path

- **WHEN** the caller will finish open and Cloudflare still refuses an Access check after the full wait, while the database check passes
- **THEN** the widen finishes, and the Zero Trust step opens the site only if Cloudflare refuses the organization, stopping on anything else

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

Before reporting success, provisioning SHALL check the actual production URL and report whether protection is configured, whether real human login is verified, and whether memory is reachable. It SHALL warn when a new address is not ready and SHALL never equate successful configuration or machine authentication with proven human access. It SHALL say memory is on only when a read through the production Worker answered. Interactive setup SHALL run its protection check automatically with the workspace's machine credentials and SHALL NOT ask the person to sign in on each site; the person opening the production link and seeing their app SHALL count as the human check. A site open without login SHALL be reported as open to anyone with the link, followed by the optional card steps and what the person gives up without them.

#### Scenario: Production not live yet

- **WHEN** the memory read has not answered
- **THEN** the report says memory starts once the site first goes live

#### Scenario: A mismatch

- **WHEN** the fetched URL does not answer as its configuration implies
- **THEN** the run reports a failure naming the request, not success

#### Scenario: Configuration without human evidence

- **WHEN** the API configuration and service-token probe succeed but nobody has completed a real email login
- **THEN** the report labels human login unverified and does not call the entire security rollout complete

#### Scenario: The person sees their app

- **WHEN** a private site's automatic probe passes and the person reports the app from the production link
- **THEN** setup counts human login as verified without further sign-ins on staging or previews

#### Scenario: No card yet

- **WHEN** interactive setup finishes with the site open without login
- **THEN** the report says anyone with the link can see the site and memory keeps no full transcripts, and lists the optional card steps as links

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

The documented enforcement SHALL verify the signed Access assertion for this application and read the identity from it, `email` for a person and `common_name` for a service token. A missing or invalid assertion SHALL get `401`; only an explicit `SKIP_AUTH` development flag MAY substitute an identity. A committed open-without-login setting SHALL serve business content without an assertion only while no Access application is configured; once one is, the assertion is required regardless of that setting.

#### Scenario: A machine caller

- **WHEN** CI or `/verify` calls the gated app with a service token
- **THEN** the request is authenticated from the assertion, not rejected for a missing email header

#### Scenario: A stale open setting

- **WHEN** the config still says open without login but carries Access identifiers
- **THEN** a request without a valid assertion gets `401`

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

`app/.dev.vars` SHALL be the declared list of Worker runtime secrets, and `secrets:push` SHALL load ordinary runtime secrets into production and staging; a git-ignored `app/.dev.vars.staging` SHALL give staging its own values. A linked worktree with no copy SHALL read the primary worktree's file. The private production Access login-management binding SHALL be omitted entirely from staging sources/config, including a blank declaration. Both target sources and staging config SHALL be validated before the first provider write. Unsafe fallback, explicit override or staging source SHALL load nothing into either Worker.

#### Scenario: Staging diverges

- **WHEN** `app/.dev.vars.staging` exists
- **THEN** staging gets its values and production gets `app/.dev.vars`

#### Scenario: Production holds private login authority

- **WHEN** a production runtime file contains private Access management bindings and staging would reuse it
- **THEN** push fails before either Worker changes and requires a separate staging source omitting those bindings

#### Scenario: Staging source is invalid after production source passes

- **WHEN** production's source is valid but staging declares a private Access binding or account credential
- **THEN** validation fails before any production or staging secret push

### Requirement: Account credentials never reach a Worker

`secrets:push` MUST refuse `.env`, including through a symlink, and MUST fail when the file declares a `CLOUDFLARE_*` or `CF_ACCESS_*` key, loading nothing into either Worker.

#### Scenario: A credential pasted into .dev.vars

- **WHEN** `app/.dev.vars` holds `CLOUDFLARE_API_TOKEN`
- **THEN** the push exits non-zero, names the key, and loads nothing

### Requirement: A gate keeps the two Workers in step

`secrets:check` SHALL fail when ordinary runtime secret names differ or a stateful top-level binding is absent from `env.staging`, excluding documented production-only memory and private Access management bindings. It SHALL fail if a private Access management binding is present on staging. It SHALL only warn about disagreement with `app/.dev.vars.example`, compare names only, and never read or print secret values.

#### Scenario: A secret on one Worker

- **WHEN** production holds an ordinary runtime secret staging lacks
- **THEN** the check fails and names the key, with no value in its output

#### Scenario: Production-only Access management

- **WHEN** private Access management names are present only in production and ordinary names match
- **THEN** the parity check passes without requiring management authority on staging

#### Scenario: Staging holds a private management binding

- **WHEN** staging config or deployed secret names include private Access management authority
- **THEN** the check fails and names the binding without disclosing its value

### Requirement: The gate is never permanently red

`secrets:check` SHALL skip with a reason and pass when the repo has no wrangler config, no `CLOUDFLARE_API_TOKEN`, or no `env.staging`, still running the binding comparison when only the token is missing.

#### Scenario: A fresh install before provisioning

- **WHEN** CI runs before any wrangler config exists
- **THEN** the check reports nothing to compare and passes

### Requirement: Workspaces are private from their first deployment

Provisioning SHALL protect production and staging business content with Cloudflare Access before it becomes reachable. The owner SHALL authenticate with a reachable verified email. Missing permissions, unsupported protection, or incomplete configuration SHALL stop private setup without publishing public business content. Organization onboarding that Cloudflare withholds until the account has a payment method SHALL also stop it, except when interactive setup explicitly opts into opening without login: then provisioning SHALL record an open-without-login state in committed configuration, create no Access resources, and continue. The deployment check SHALL accept only that recorded state or complete protection. Rerunning provisioning after onboarding succeeds SHALL add the protection and replace the open state for review. An interrupted run SHALL reuse owned resources and remain recoverable.

#### Scenario: First deployment

- **WHEN** a new workspace's first deployment completes with protection provisioned
- **THEN** an anonymous visitor cannot read its pages, static assets, mini apps, or APIs, and its owner can authenticate by email

#### Scenario: Security setup stops

- **WHEN** provisioning cannot establish the login wall for any reason other than a payment-gated onboarding under the explicit opt-in
- **THEN** business content remains unavailable and the report names what is needed to continue

#### Scenario: Payment-gated onboarding under the opt-in

- **WHEN** interactive setup opts in and Zero Trust onboarding needs a payment method
- **THEN** the site deploys open without login, memory still requires its own key, and the report says so

#### Scenario: The card is added later

- **WHEN** provisioning reruns after onboarding succeeds on an open site
- **THEN** it creates the protection, fills the Access identifiers, and removes the open setting, ready to publish

#### Scenario: Preview login before production content

- **WHEN** native protection and both owned exact human and machine policies are confirmed for newly created bootstrap Workers before production business content is uploaded
- **THEN** the protected unavailable production login anchor permits the native email callback, its previews remain disabled, and incomplete protection remains unavailable and recoverable

### Requirement: Protection covers every address of this workspace

The workspace's Access protection SHALL cover its production and staging Workers across default addresses, custom domains, routes, branch aliases, and unique version URLs, including addresses added later and previews created before adoption. Provisioning SHALL NOT gate unrelated Workers or create account-wide protection. More-specific conflicting policies SHALL prevent a successful coverage report until resolved.

#### Scenario: A new preview or custom domain

- **WHEN** a new version, alias, or custom domain reaches a protected workspace Worker
- **THEN** the same allowed emails control access without a manual hostname-policy update

#### Scenario: A shared Cloudflare account

- **WHEN** the account also contains unrelated Workers and a conflicting preview policy
- **THEN** unrelated Workers keep their access settings, and this workspace is not reported fully protected until its conflicting policy is resolved

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification. Membership updates SHALL preserve that machine policy. The production memory route SHALL remain authenticated by its memory keys and SHALL be the only automatic route exception; other public routes require explicit reviewed configuration. Staging and CI branch previews SHALL carry no memory bindings.

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

### Requirement: Setup provisions through one shared script

`/wong-setup` SHALL create its Cloudflare resources, names, app config, memory store, and deploy token through one shared script, so every install is provisioned the same way and a fix reaches all of them. Setup SHALL keep its questions: which account when there are several, and one ask before anything billable.

#### Scenario: Setup provisions

- **WHEN** a person approves provisioning during `/wong-setup`
- **THEN** setup runs the shared script and reports what it created and what it reused

### Requirement: Setup supplies what Access needs

Setup SHALL record the owner's email as committed nonsecret configuration for both Workers, and SHALL create a key limited to Access application-and-policy writes, store it with the account and human-policy identifiers as the production Worker's login-management secret, and record the key's identifier for reuse and rotation. The key SHALL NOT be the deploy key, SHALL NOT be written to staging, and a rerun SHALL reuse it. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes on an account with sign-in turned on
- **THEN** the owner email is in both Workers' committed configuration, production holds the login-management secret, staging holds none, and the owner can add a person from Access without another step

#### Scenario: An existing install updates

- **WHEN** an installation made before this change updates and its saved token can create keys
- **THEN** the update adds the owner email and the production secret and leaves existing people's access unchanged

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access still opens and names the step left

### Requirement: Setup supplies the read-only Cloudflare key

Setup SHALL create a Cloudflare key limited to reading settings, logs and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory, and SHALL store it for the production and staging Workers and record its identifier for reuse and rotation. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** both Workers hold the read-only key, the user token is in neither, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left
