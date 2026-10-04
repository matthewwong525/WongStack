# Employee onboarding

## Purpose

Let employees connect an assistant from an existing business app using their app identity, with employer-managed app/API permissions. Repository access and authentication remain manual and independent.

## Requirements

### Requirement: The business app is the employee setup entry point

A current employee SHALL receive a copyable assistant setup prompt and their own connection status after signing into the existing protected business app. The prompt SHALL contain nonsecret routing and instructions only, SHALL remain manually copyable after clipboard failure, and SHALL perform no work or grant access when copied. Employees SHALL require no Cloudflare administration account or repository identity for the supported company API connection. Repository access SHALL be granted and authenticated separately through its provider. Expired or new-device sessions SHALL use the same employee app identity for renewed approval.

#### Scenario: Employee copies setup instructions

- **WHEN** a current employee copies the setup prompt from the app
- **THEN** the page confirms copying and the prompt identifies this business and its published setup instructions without including any credential

#### Scenario: A new computer needs approval

- **WHEN** the assistant has no valid employee session on that computer
- **THEN** setup requests approval through the same business login rather than asking for a provider token or separate employee GitHub account

### Requirement: The employer manages employee grants through Access

Only the installation's trusted verified employer SHALL add, edit or remove employees, manage app-login connections, or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive no repository authority from app login. New apps SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service setup/status. Public routing, service identity and first visitation SHALL establish no employer authority.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only and the owner receives the ordinary app link to share and the actual admission status

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: App admission follows current desired employee membership

The installation SHALL durably reconcile its current exact-email roster to its recorded app login policy, preserving the employer, other employees, unrelated policies and machine access. Failed admission/removal and session-revocation work SHALL remain observable and retryable. Stale work SHALL not restore a removed member. Login-management credentials SHALL remain private in the customer installation, separate from broader provisioning authority; their actual provider scope SHALL be disclosed. An open or unverified installation SHALL report onboarding unavailable rather than silently granting access.

#### Scenario: Login policy update fails

- **WHEN** the roster is saved but the provider refuses its email-policy update
- **THEN** admission remains pending and retryable without claiming the person can log in or asking them for a management token

#### Scenario: A removed person's earlier add is retried

- **WHEN** stale add work runs after the person has been removed
- **THEN** reconciliation converges to current membership and reports any provider removal still pending

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a verified reviewed bootstrap artifact. An employee SHALL obtain a usable company API client without cloning a private project. Setup SHALL NOT issue repository credentials, register a repository integration or change repository authentication. Interrupted setup SHALL preserve dirty work, conflicting local folders and unpushed commits and resume against the same target. API readiness SHALL require actual authorized connection evidence; repository access SHALL be labeled separate manual setup.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps pastes the setup prompt into their assistant
- **THEN** the assistant can bootstrap and call their approved company actions without needing access to the private project source

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

### Requirement: Connections remain private and destination bound

Employee sessions SHALL remain in private OS-user state outside checkouts and SHALL not appear in prompt text, model output, token-bearing arguments, URLs, git remotes, tracked files or ordinary diagnostics. App credentials SHALL go only to the verified business origin. Company API setup SHALL not receive or manage repository credentials. Owner, deployment, business-service, memory and verification credentials SHALL never substitute for employee connection. Employee sessions SHALL not be inherited by builds or unrelated commands.

#### Scenario: A redirect requests credential forwarding

- **WHEN** a setup response redirects a credential-bearing request to another destination
- **THEN** the helper refuses forwarding without exposing the credential

#### Scenario: Project command execution begins

- **WHEN** the connected assistant executes a build or unrelated business command
- **THEN** the command does not inherit the employee session used by selected company API operations

### Requirement: Current app grants govern business access everywhere

Current employee grants SHALL govern app lists, direct app visits, associated described and bare API routes, and assistant discovery/calls. Server authorization SHALL apply before business work, preserve stricter existing action and record checks, and deny unavailable or unmapped policy. Client state, existing login, cached descriptions and repository access SHALL grant no extra permission. Acknowledged grant removal SHALL deny subsequent requests; work already admitted SHALL not be claimed undone.

#### Scenario: An employee calls a hidden app API

- **WHEN** an employee assigned Orders but not Payroll calls Payroll directly with a valid session
- **THEN** the server denies Payroll before business work while Orders remains available

#### Scenario: An assigned app is removed during a session

- **WHEN** app deselection is acknowledged and the employee sends their next request with the same valid session
- **THEN** that app's request is denied without needing logout or changing other app grants

### Requirement: Existing memory authority is preserved

Setup SHALL preserve the installed memory target, machine authority and private history. Fresh memory enrollment SHALL remain outside this employee connection; app login and repository access SHALL not create memory authority. Missing trusted operator setup SHALL be reported as not connected without affecting otherwise ready API access.

#### Scenario: A fresh computer has no memory grant

- **WHEN** the employee connects their API on a computer lacking trusted memory setup
- **THEN** API access reports its own readiness while memory remains not connected with trusted-owner setup guidance

### Requirement: App access removal reports actual login outcomes

Full removal SHALL deny company work immediately, withdraw managed app admission and revoke existing app sessions. Policy and session outcomes SHALL be reported separately, remain retryable and follow current desired membership. App removal SHALL NOT claim to revoke manually granted repository access, downloaded data or independently installed memory.

#### Scenario: Repository access was granted manually

- **WHEN** the employer removes a person's app access
- **THEN** company work is blocked and the app explains that repository access must be removed separately through its provider

#### Scenario: Full removal partly fails

- **WHEN** local removal commits but a provider policy or session revocation fails
- **THEN** new company work is denied and Access reports and retries unresolved provider outcomes without claiming full completion
