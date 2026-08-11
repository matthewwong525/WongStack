## MODIFIED Requirements

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies, and that model SHALL be **verification of the signed Access JWT** (`Cf-Access-Jwt-Assertion`), not trust in a plain identity header. Verification SHALL confirm the assertion came from this Access application specifically, and SHALL read identity from the verified claims: `email` for a human, `common_name` for a service token.

**A plain-header pattern SHALL NOT be given as the recommended implementation**, for two independent reasons the runbook SHALL both state:

- **It locks out every machine caller.** Access strips `CF-Access-Client-Id` and sets no email header for a service-token request, which arrives carrying only `cf-access-jwt-assertion` and the ordinary `cf-*` request headers. Code requiring the email header therefore `401`s CI, and `/verify` — WongStack's own browser-evidence verb — is one of the callers it rejects.
- **It is unsound off the proxy.** On a hostname the Access policy does not actually cover, the header is an ordinary request header any caller can set, so trusting it grants impersonation of any user. Given that a policy can silently fail to cover a hostname, the pattern's safety rests on a condition the reader cannot reliably confirm.

The runbook SHALL specify that a request whose assertion is missing or fails verification is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

Because the provisioned app is public by default, the scaffold's Worker SHALL NOT enforce identity until Access is adopted. The verification module SHALL ship inert, and enabling it SHALL be documented as part of adopting Access, in the same step.

**Verification of the wall SHALL require a browser.** A service-token `200` and an anonymous `302` SHALL be documented as *insufficient* evidence, since both hold in the known-broken `workers.dev` configuration. The runbook's verification step SHALL require a logged-in browser to load the application successfully.

#### Scenario: Both caller kinds are served by one path

- **WHEN** the documented implementation handles a request
- **THEN** a human's verified assertion yields their `email`
- **AND** a service token's verified assertion yields its `common_name`
- **AND** neither caller is rejected for lacking a header the other one gets

#### Scenario: The machine caller is not locked out

- **WHEN** CI or `/verify` calls the app with a service token
- **THEN** the request is authenticated from the verified assertion
- **AND** it is not rejected for the absence of `Cf-Access-Authenticated-User-Email`

#### Scenario: Missing or invalid identity fails closed

- **WHEN** a request arrives with no assertion, or one that fails verification
- **THEN** the documented behaviour is a `401`
- **AND** a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

#### Scenario: Terminal checks are not accepted as proof

- **WHEN** a reader verifies the wall
- **THEN** the runbook requires a logged-in browser to load the app successfully
- **AND** it states that an anonymous redirect and a service-token success are both consistent with a wall no human can pass

#### Scenario: The public template does not enforce identity

- **WHEN** the stack pack's scaffold Worker is deployed without Access in front
- **THEN** it does not treat any header or assertion as an identity
- **AND** the docs state that enabling verification is part of adopting Access
