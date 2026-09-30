# Managed workspace access

## Purpose

Keep each cloud-managed WongStack workspace private and synchronize its email permissions with the team's membership, even when workspace servers are unavailable.

## ADDED Requirements

### Requirement: Managed installation receives the owner's verified email

The server installation contract SHALL accept the cloud owner's verified, reachable email independently of git authorship. It SHALL allow that owner on the installed workspace and return non-secret protection metadata sufficient for app-scoped management. Missing or invalid owner identity SHALL fail private installation without publishing public content. Team emails SHALL NOT imply Cloudflare administrative membership.

#### Scenario: GitHub uses a private author address

- **WHEN** the cloud owner signs in with a reachable email but git uses a noreply address
- **THEN** workspace login uses the verified cloud email and preserves git authorship

#### Scenario: An old installation job lacks owner identity

- **WHEN** a job has no reachable verified owner email
- **THEN** private installation stops with a recoverable compatibility reason rather than guessing an identity

### Requirement: Cloud team emails determine human permissions

For a managed workspace, human access SHALL comprise its verified owner and current real-person team emails, normalized and deduplicated. A person added through the hosted control plane SHALL receive permission to authenticate to the workspace and all its previews. Removal or invitation cancellation SHALL withdraw that email while preserving the owner and remaining team. Synthetic extra-workspace identities SHALL NOT receive permissions. All managed add, legacy join, and removal paths SHALL converge on this behavior.

#### Scenario: Add and remove a teammate

- **WHEN** the owner adds a person's email and later removes that person
- **THEN** the email is first allowed and subsequently denied on production, staging, and previews, while remaining teammates retain permission

#### Scenario: Another workspace for the owner

- **WHEN** the owner adds or removes their own extra workspace
- **THEN** no synthetic email is allowed and the owner's human access is preserved

### Requirement: Removal invalidates existing workspace sessions

Removing an email SHALL invalidate existing sessions for the managed workspace's Access application in addition to changing its policy. The remaining team SHALL be able to authenticate again. Completion SHALL require both the policy change and revocation to be acknowledged; effective denial SHALL be verified against an existing session within Cloudflare's actual propagation behavior. Unrelated Access applications SHALL NOT have their policies or sessions modified.

#### Scenario: A removed person has a valid session

- **WHEN** removal completes while that person holds a previously valid workspace login
- **THEN** that login ceases to authorize workspace requests after provider propagation, and the removed email cannot establish a new authorized login

#### Scenario: Revocation fails

- **WHEN** the allowlist update succeeds but session revocation fails
- **THEN** revocation remains pending for retry and the system does not claim the person's access is fully revoked

### Requirement: Membership synchronization survives failures and races

Team changes SHALL persist desired access durably and synchronize independently of workspace VM availability. Failed provider calls SHALL retain retryable work with an observable pending or failed status. Concurrent updates and retries SHALL converge on the latest team rather than restoring a removed email from an older job. Successful updates SHALL be idempotent and isolated to the owner's recorded workspace resources.

#### Scenario: The owner server is offline

- **WHEN** membership changes while all owner servers are offline or removed
- **THEN** the control plane can still apply the access change using its managed connection

#### Scenario: An old add retries after removal

- **WHEN** a failed add retries after the same email was removed
- **THEN** the latest membership controls the result and the retry does not restore permission

### Requirement: The cloud management connection is restricted and private

Automatic membership management SHALL use a separate encrypted credential scoped to the selected account and Access policy management and application-session revocation, without deployment, database, storage, administrative membership, or API-token-management permissions. The connection SHALL bind to its owner and recorded application. Credential values SHALL NOT appear in public installer output, logs, arguments, repository files, or user-facing API responses. The broad installation token SHALL retain its existing transient control-plane handling. Invalid management credentials SHALL request secure reconnection while leaving workspace protection in place.

#### Scenario: The management connection is established

- **WHEN** installation supplies the cloud management connection through its authenticated private channel
- **THEN** the control plane stores only the restricted credential encrypted, and ordinary responses expose safe metadata alone

#### Scenario: Another owner names this application

- **WHEN** an authenticated owner attempts to manage another owner's recorded resources
- **THEN** the request is denied without making provider changes or revealing a credential
