## Purpose

Let each standalone WongStack installation own its people's identities and memory membership without a hosted account or Git provider authority.

## ADDED Requirements

### Requirement: Verified logins bind to installation-owned principals

The installation SHALL assign internal principal IDs independent of email, Git authorship and hosting. Human authentication SHALL validate this installation's configured provider, audience, signature and lifetime and bind a provider-scoped subject to a principal. Email SHALL identify a login or route a request, never grant historic ownership. Service tokens, synthetic production identities and anonymous visitors SHALL NOT become human principals with memory authority.

#### Scenario: An existing member signs in
- **WHEN** a valid human login matches an active binding and membership in this installation
- **THEN** its existing internal principal and current permissions are used without a GitHub or hosted-service lookup

#### Scenario: An automation token carries a person's email
- **WHEN** a service assertion or forged email header is presented to a human management endpoint
- **THEN** it grants no approval, membership or administrator authority

### Requirement: Membership is explicitly granted within the installation

Owners SHALL control invitations, membership removal and role changes. Invitations SHALL require matching verified human login and grant prospective access only. Memory admins SHALL manage memory and revoke devices but SHALL NOT grant membership or approve for others. A removed membership SHALL immediately deny memory and renewal through every credential. At least one owner SHALL remain after ordinary membership changes.

#### Scenario: An owner invites a reader
- **WHEN** the invited person verifies the intended login before the invitation expires
- **THEN** a principal with reader membership is admitted without repository access checks or automatic ownership of email-attributed historic facts

#### Scenario: A member leaves
- **WHEN** an owner removes a member who has pending approvals and connected machines
- **THEN** those approvals and all device access and renewal stop, including while an Access-policy update remains pending

### Requirement: Initial ownership requires verified human and operator authority

Initial ownership SHALL require an installation-operator-authorized owner intent and confirmation of a matching verified app-login candidate. First visitor status, typed email, GitHub admin records and installer host identity SHALL NOT suffice. Setup SHALL remain pending without working human login and SHALL make no memory credential on the person's behalf.

#### Scenario: The initial owner completes setup
- **WHEN** the intended owner signs into the installation and its operator confirms the matching short-lived candidate
- **THEN** exactly one initial-owner transition succeeds and the owner's machine still requires device approval

#### Scenario: The app is open without login
- **WHEN** an anonymous person or verification service token attempts setup or approval
- **THEN** memory authority remains unavailable and the app explains that human login must be enabled

### Requirement: Identity changes never silently transfer a principal

A changed login subject, issuer or email SHALL require explicit reviewed recovery before acquiring existing authority. Removed bindings SHALL remain tombstoned. Owner recovery SHALL require proven identity continuity or create a new principal with no inherited private history; sole-owner recovery SHALL additionally require installation-operator authority and a newly verified human login. Successful relinking SHALL retire old bindings and devices and record the actor and evidence.

#### Scenario: An email is reused
- **WHEN** a new or re-added login has the same email as a former member
- **THEN** it cannot claim that principal, devices, admin role or historic private memory automatically

#### Scenario: The sole owner loses their login
- **WHEN** the installation operator confirms an evidenced recovery to a newly verified login
- **THEN** the recovered owner uses the installation's app login, old owner access is revoked, and the recovery is auditable without a hosted account
