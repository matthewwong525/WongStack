# App scaffold delta

## REMOVED Requirements

### Requirement: The Access module ships inert

**Reason**: An unused identity verifier does not protect the starter app or assets by default.
**Migration**: Use signed assertion verification before every protected route and asset response, with explicit development-only authentication substitution and separately reviewed public exceptions.

## ADDED Requirements

### Requirement: The starter app requires verified identity

The scaffold SHALL require a verified signed Access identity scoped to this workspace before serving its HTML, static assets, APIs, or mini apps. It SHALL recognize a human by verified email and a machine by verified service-token identity. Missing configuration SHALL fail closed; missing, forged, expired, or wrong-application assertions SHALL be denied. Plain email headers SHALL NOT authorize a request. Only explicit local-development configuration SHALL substitute an identity; deployed environments SHALL reject that development bypass. Memory SHALL remain independently authenticated by its memory keys.

#### Scenario: A caller attempts direct asset access

- **WHEN** a caller requests HTML, JavaScript, CSS, a mini-app asset, or an API with no valid assertion, including a forged email header
- **THEN** no protected content is returned

#### Scenario: Valid human and machine callers

- **WHEN** a human or service-token caller presents an assertion valid for this workspace
- **THEN** the caller reaches the intended app resource under the verified identity
