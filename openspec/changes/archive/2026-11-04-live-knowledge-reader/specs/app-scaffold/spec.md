## MODIFIED Requirements

### Requirement: The starter app requires verified identity

The scaffold SHALL require a verified signed Access identity scoped to this workspace before serving its HTML, static assets, APIs, or mini apps. It SHALL recognize a human by verified email and a machine by verified service-token identity. Missing configuration SHALL fail closed; missing, forged, expired, or wrong-application assertions SHALL be denied. Plain email headers SHALL NOT authorize a request. Only explicit local-development configuration SHALL substitute an identity; deployed environments SHALL reject that development bypass. Memory SHALL remain independently authenticated by its memory keys. The one exception SHALL be the public knowledge address, which serves only knowledge pages marked `public: true`, as a page of its own with none of the app's HTML, scripts or APIs.

#### Scenario: A caller attempts direct asset access

- **WHEN** a caller requests HTML, JavaScript, CSS, a mini-app asset, or an API with no valid assertion, including a forged email header
- **THEN** no protected content is returned

#### Scenario: Valid human and machine callers

- **WHEN** a human or service-token caller presents an assertion valid for this workspace
- **THEN** the caller reaches the intended app resource under the verified identity

#### Scenario: A visitor opens a public knowledge page

- **WHEN** a caller with no assertion opens the public knowledge address of a page marked `public: true`
- **THEN** that page is returned, and nothing else of the app's is
