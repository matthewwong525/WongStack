# Cloudflare provisioning delta

## REMOVED Requirements

### Requirement: The login wall is opt-in and adopted whole

**Reason**: Protection is now automatic for both interactive setup and cloud-managed workspaces, rather than requiring a later separate runbook.
**Migration**: Enable protection during all new installations; existing installs receive a reviewed migration that preserves explicitly intended public surfaces.

### Requirement: Access gates only this app's own hostnames

**Reason**: Worker-scoped protection replaces the obsolete custom-domain requirement and automatic public-prefix bypass.
**Migration**: Attach protection to the app's production and staging Workers, covering their default addresses and previews, with only reviewed route exceptions.

## ADDED Requirements

### Requirement: Workspaces are private from their first deployment

Provisioning SHALL protect production and staging business content with Cloudflare Access before it becomes reachable. The owner SHALL authenticate with a reachable verified email. Missing permissions, organization onboarding, unsupported protection, or incomplete configuration SHALL stop private setup without publishing public business content. An interrupted run SHALL reuse owned resources and remain recoverable.

#### Scenario: First deployment

- **WHEN** a new workspace's first deployment completes
- **THEN** an anonymous visitor cannot read its pages, static assets, mini apps, or APIs, and its owner can authenticate by email

#### Scenario: Security setup stops

- **WHEN** provisioning cannot establish the login wall
- **THEN** business content remains unavailable and the report names what is needed to continue

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

## MODIFIED Requirements

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

### Requirement: CI deploys with its own narrow token

CI SHALL deploy with a separate `<repo>-deploy` token limited to deploying Workers and databases on the chosen account, plus storage only when the app binds a bucket and Access read permission for coverage checks. It SHALL be unable to manage tokens or change Access policies. Its value MUST go straight to the GitHub secret, never to a file or the screen; a later run SHALL reuse it and roll it only when the secret is missing or the person asks.

#### Scenario: Secrets reach GitHub

- **WHEN** CI is wired
- **THEN** the GitHub secret holds the deploy token, and no GitHub secret holds the user token

#### Scenario: Protection is missing

- **WHEN** CI cannot establish that the workspace is protected
- **THEN** it refuses to publish business content or a new reachable preview, and does not try to change Access policies
