## ADDED Requirements

### Requirement: Memory and company actions share one sign-in

A memory operation called through the shared helper SHALL use the same saved employee sign-in as company actions, and SHALL keep memory's own team and private checks. Company actions and memory SHALL still report their readiness separately. The helper SHALL never fall back to owner credentials, and an origin override, staging target or remote schema SHALL NOT pick where memory calls go.

#### Scenario: One person, actions and memory

- **WHEN** a signed-in teammate lists operations and calls a company action and a memory search
- **THEN** both succeed with the one sign-in, and the search returns only what memory allows that person

## MODIFIED Requirements

### Requirement: The employee client reuses normal company login

The private helper SHALL authenticate as the employee through the company's existing Cloudflare Access login, reuse its private session while valid, and request a fresh login when needed. It SHALL expose no login token in model context, command arguments, URLs, repo files or ordinary diagnostics, and SHALL never fall back to owner or verification credentials. The employee SHALL need no Cloudflare administration account or business API key. When a call fails because the sign-in expired, the helper SHALL show the checked sign-in link with the failure, not a bare refusal.

#### Scenario: First use and a later request

- **WHEN** an allowed employee signs in for their first API request and later makes another request during that valid session
- **THEN** both requests use that employee's identity and the later request reuses private authentication automatically

#### Scenario: Expired or removed access

- **WHEN** the provider refuses the session because it expired or employee access was removed
- **THEN** the helper reports sign-in or denial without exposing credentials or widening permission, and an expired session comes with the sign-in link
