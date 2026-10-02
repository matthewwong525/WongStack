## MODIFIED Requirements

### Requirement: The server installer installs WongStack unattended

The source SHALL ship a server installer that, run as the workspace user from a clone of the source, installs that clone's WongStack into an empty GitHub repo with no question: the full payload, the install record naming the clone's version and commit, the app's Cloudflare hosting, a memory store served by the production Worker with owner and device approval explicitly pending, and the CI deploy token as a GitHub secret. It SHALL return a safe action URL and structured memory-readiness status without assuming its host is the human owner or minting an admin device credential. It SHALL commit the install on `main` and push it. A second run SHALL finish a first run that stopped, and SHALL leave a repo it already pushed untouched. It SHALL refuse a repo that already holds other work.

#### Scenario: A fresh repo

- **WHEN** a host runs the installer for an empty repo with a valid Cloudflare token and account
- **THEN** the repo's `main` holds the install, its record names the source's version, commit, and memory Worker, and the last output line is `done`

#### Scenario: A repo with other work

- **WHEN** the repo already has commits the installer did not make
- **THEN** it changes nothing and its last output line is `repo`

#### Scenario: Infrastructure is ready before the owner signs in
- **WHEN** the unattended installer has completed infrastructure setup but no human has completed ownership and device approval
- **THEN** its existing final outcome remains compatible, memory is reported pending rather than ready, and no hosted-service identity is required to finish in the installed app


## ADDED Requirements

### Requirement: Setup exposes nonsecret installation memory readiness

Setup SHALL return a version-1 `memory` result containing `protocolVersion`, `installationId`, `repositoryId`, `appUrl`, `memoryOrigin`, `status`, `reason` and `action`. Status SHALL be `pending-owner`, `pending-device` or `ready`, scoped to the calling machine. Action SHALL be null or contain `kind` (`confirm-owner` or `connect-device`), the canonical protected app's `/apps/devices/` URL and `operatorConfirmationRequired`. Origins SHALL come from trusted installation configuration. The result SHALL contain no credentials or personal identity. Cloud roles, repository grants and Access policy membership SHALL NOT seed memory principals or roles.

#### Scenario: Another machine is already connected
- **WHEN** setup reports for a machine without a currently validated device grant and the installation has a confirmed owner
- **THEN** it returns `pending-device` and `connect-device`, even if another machine is connected

#### Scenario: The calling machine is ready
- **WHEN** current credential introspection verifies the calling machine's installation, membership and active grant
- **THEN** status is `ready`, reason and action are null, and no credential is included in the result

#### Scenario: Hosted operator confirmation is unfinished
- **WHEN** a platform has provisioned protected infrastructure but the verified human and installation operator have not completed owner confirmation
- **THEN** setup returns `pending-owner` with a safe action URL and operator confirmation required, without minting a memory key or requesting the platform credential from the customer

#### Scenario: Protection is unavailable
- **WHEN** login is disabled or required Access protection cannot be verified
- **THEN** setup remains pending with a safe `login-required` or `access-unverified` reason and cannot approve an owner or device
