## MODIFIED Requirements

### Requirement: The scaffold carries the Access verification module, inert

The app scaffold SHALL include a Worker-side Access verification module (`worker/access.ts`) that verifies the signed `Cf-Access-Jwt-Assertion` against the repo's own Access application and returns identity from the verified claims — `email` for a human caller, `common_name` for a service token.

It SHALL ship **inert**: present in the scaffold, enforcing nothing, and not wired into the request path until Access is adopted. The provisioned app is public by default, and a scaffold that enforced identity out of the box would reject every caller of an app with no Access in front.

Shipping the module rather than a documented snippet is deliberate. The correct implementation is not obvious — the header-based version reads as simpler and is what an adopter writes when left to it, and it silently locks out every machine caller including `/verify`. An adopter who followed the documented snippet had to write this module from scratch after diagnosing the lockout.

#### Scenario: A scaffolded public app rejects nobody

- **WHEN** the scaffold is deployed with no Access in front
- **THEN** the verification module enforces nothing and every request reaches the app
- **AND** no request is rejected for lacking an assertion

#### Scenario: Adopting Access is wiring, not writing

- **WHEN** a repo adopts Access on a scaffolded app
- **THEN** the verification module is already present and the step is enabling it
- **AND** the adopter does not implement JWT verification themselves

#### Scenario: Both caller kinds authenticate once enabled

- **WHEN** verification is enabled and a service token calls the app
- **THEN** it is authenticated from the verified assertion's `common_name`
- **AND** a human caller is authenticated from the verified assertion's `email`
