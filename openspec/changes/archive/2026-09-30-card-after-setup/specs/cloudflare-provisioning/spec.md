## MODIFIED Requirements

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

### Requirement: The Worker verifies the signed Access assertion

The documented enforcement SHALL verify the signed Access assertion for this application and read the identity from it, `email` for a person and `common_name` for a service token. A missing or invalid assertion SHALL get `401`; only an explicit `SKIP_AUTH` development flag MAY substitute an identity. A committed open-without-login setting SHALL serve business content without an assertion only while no Access application is configured; once one is, the assertion is required regardless of that setting.

#### Scenario: A machine caller

- **WHEN** CI or `/verify` calls the gated app with a service token
- **THEN** the request is authenticated from the assertion, not rejected for a missing email header

#### Scenario: A stale open setting

- **WHEN** the config still says open without login but carries Access identifiers
- **THEN** a request without a valid assertion gets `401`

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
